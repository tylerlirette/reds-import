<?php
/**
 * Plugin Name: Red's Inventory
 * Description: Styled, filterable vehicle grid from the GitHub-hosted inventory JSON feed. Use shortcode [dealership_inventory].
 * Version: 1.0.0
 * Author: Red's Auto
 */

defined('ABSPATH') || exit;

define('REDS_INV_VERSION', '1.0.0');
define('REDS_INV_DIR', plugin_dir_path(__FILE__));
define('REDS_INV_URL', plugin_dir_url(__FILE__));
define('REDS_INV_FEED', 'https://tylerlirette.github.io/reds-import/inventory.json');
define('REDS_INV_CACHE_KEY', 'reds_inventory_json_v1');
define('REDS_INV_CACHE_TTL', 2 * HOUR_IN_SECONDS);

function reds_inv_fetch() {
    $cached = get_transient(REDS_INV_CACHE_KEY);
    if (is_array($cached) && isset($cached['vehicles'])) {
        return $cached;
    }

    $response = wp_remote_get(
        apply_filters('reds_inventory_feed_url', REDS_INV_FEED),
        [
            'timeout' => 20,
            'headers' => [
                'Accept' => 'application/json',
            ],
        ]
    );

    if (is_wp_error($response) || wp_remote_retrieve_response_code($response) !== 200) {
        return null;
    }

    $data = json_decode(wp_remote_retrieve_body($response), true);
    if (!is_array($data) || !isset($data['vehicles']) || !is_array($data['vehicles'])) {
        return null;
    }

    set_transient(REDS_INV_CACHE_KEY, $data, REDS_INV_CACHE_TTL);
    return $data;
}

function reds_inv_payload($data) {
    $vehicles = [];
    foreach ($data['vehicles'] as $vehicle) {
        $photos = isset($vehicle['photos']) && is_array($vehicle['photos']) ? $vehicle['photos'] : [];
        $vehicles[] = [
            'vin' => $vehicle['vin'] ?? '',
            'stockNumber' => $vehicle['stockNumber'] ?? '',
            'year' => $vehicle['year'] ?? null,
            'make' => $vehicle['make'] ?? '',
            'model' => $vehicle['model'] ?? '',
            'trim' => $vehicle['trim'] ?? '',
            'bodySegment' => $vehicle['bodySegment'] ?? '',
            'price' => $vehicle['price'] ?? null,
            'mileage' => $vehicle['mileage'] ?? null,
            'exteriorColor' => $vehicle['exteriorColor'] ?? '',
            'driveTrain' => $vehicle['driveTrain'] ?? '',
            'photo' => $photos[0] ?? '',
            'detailUrl' => $vehicle['detailUrl'] ?? '',
        ];
    }

    return [
        'updatedAt' => $data['updatedAt'] ?? null,
        'count' => count($vehicles),
        'vehicles' => $vehicles,
        'feedUrl' => apply_filters('reds_inventory_feed_url', REDS_INV_FEED),
    ];
}

function reds_inv_enqueue() {
    wp_enqueue_style(
        'reds-inventory',
        REDS_INV_URL . 'assets/inventory.css',
        [],
        REDS_INV_VERSION
    );
    wp_enqueue_script(
        'reds-inventory',
        REDS_INV_URL . 'assets/inventory.js',
        [],
        REDS_INV_VERSION,
        true
    );
}

function reds_inv_shortcode() {
    reds_inv_enqueue();
    $data = reds_inv_fetch();
    $payload = $data ? reds_inv_payload($data) : [
        'updatedAt' => null,
        'count' => 0,
        'vehicles' => [],
        'feedUrl' => apply_filters('reds_inventory_feed_url', REDS_INV_FEED),
        'error' => true,
    ];
    $json = str_replace(
        ['<', '>'],
        ['\u003c', '\u003e'],
        wp_json_encode($payload)
    );

    ob_start();
    ?>
    <div class="reds-inv" id="reds-inv">
        <script type="application/json" id="reds-inventory-data"><?php echo $json; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?></script>

        <form class="reds-inv__filters" data-filters>
            <label class="reds-inv__field">
                <span>Make</span>
                <select name="make" data-filter="make">
                    <option value="">All makes</option>
                </select>
            </label>
            <label class="reds-inv__field">
                <span>Model</span>
                <select name="model" data-filter="model">
                    <option value="">All models</option>
                </select>
            </label>
            <label class="reds-inv__field">
                <span>Body</span>
                <select name="body" data-filter="body">
                    <option value="">All body types</option>
                </select>
            </label>
            <label class="reds-inv__field">
                <span>Drivetrain</span>
                <select name="drivetrain" data-filter="drivetrain">
                    <option value="">All drivetrains</option>
                </select>
            </label>
            <label class="reds-inv__field">
                <span>Min price</span>
                <input type="number" name="minPrice" data-filter="minPrice" min="0" step="500" placeholder="Any">
            </label>
            <label class="reds-inv__field">
                <span>Max price</span>
                <input type="number" name="maxPrice" data-filter="maxPrice" min="0" step="500" placeholder="Any">
            </label>
            <label class="reds-inv__field">
                <span>Sort</span>
                <select name="sort" data-filter="sort">
                    <option value="price-asc">Price: low to high</option>
                    <option value="price-desc">Price: high to low</option>
                    <option value="year-desc">Year: newest</option>
                    <option value="mileage-asc">Mileage: lowest</option>
                </select>
            </label>
            <button type="button" class="reds-inv__reset" data-reset>Reset</button>
        </form>

        <p class="reds-inv__count" data-count></p>
        <div class="reds-inv__grid" data-grid></div>
        <p class="reds-inv__empty" data-empty hidden>No vehicles match those filters.</p>
        <p class="reds-inv__error" data-error hidden>Inventory is updating. Please try again shortly.</p>
    </div>
    <?php
    return ob_get_clean();
}

add_shortcode('dealership_inventory', 'reds_inv_shortcode');
