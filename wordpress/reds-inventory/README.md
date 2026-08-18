# Red's Inventory (WordPress plugin)

Upload this folder as a WordPress plugin, activate it, then add a shortcode to a Divi Shortcode module.

It loads https://tylerlirette.github.io/reds-import/inventory.json and styles a filterable vehicle grid.

## Shortcodes

**Main lot** ($10,000 and over):

```
[dealership_inventory tier="main"]
```

**Budget Center** (under $10,000):

```
[dealership_inventory tier="budget"]
```

**All vehicles** (no price split):

```
[dealership_inventory]
```

You can also set custom price limits:

```
[dealership_inventory min_price="15000"]
[dealership_inventory max_price="8000"]
```

Price split defaults: main lot uses `min_price="10000"`, budget uses `max_price="9999"`. Vehicles without a listed price appear on the main lot only.
