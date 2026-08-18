(() => {
  function money(value) {
    if (value == null || value === "") {
      return "Call for price";
    }
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(value);
  }

  function miles(value) {
    if (value == null || value === "") {
      return "Mileage n/a";
    }
    return `${new Intl.NumberFormat("en-US").format(value)} miles`;
  }

  function unique(list) {
    return [...new Set(list.filter(Boolean))].sort((a, b) =>
      String(a).localeCompare(String(b), undefined, { numeric: true })
    );
  }

  function fillSelect(select, values, placeholder) {
    const current = select.value;
    select.innerHTML = "";
    const all = document.createElement("option");
    all.value = "";
    all.textContent = placeholder;
    select.append(all);
    values.forEach((value) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = value;
      select.append(option);
    });
    if (values.includes(current)) {
      select.value = current;
    }
  }

  function vehicleMatchesPrice(vehicle, minPrice, maxPrice) {
    const price = vehicle.price;
    if (price == null || price === "") {
      return minPrice == null;
    }
    if (minPrice != null && price < minPrice) {
      return false;
    }
    if (maxPrice != null && price > maxPrice) {
      return false;
    }
    return true;
  }

  function initInventory(root) {
    const dataNode = root.querySelector(".reds-inventory-data");
    const grid = root.querySelector("[data-grid]");
    const count = root.querySelector("[data-count]");
    const empty = root.querySelector("[data-empty]");
    const error = root.querySelector("[data-error]");
    const form = root.querySelector("[data-filters]");
    const makeSelect = root.querySelector('[data-filter="make"]');
    const modelSelect = root.querySelector('[data-filter="model"]');
    const bodySelect = root.querySelector('[data-filter="body"]');
    const driveSelect = root.querySelector('[data-filter="drivetrain"]');
    const minPriceInput = root.querySelector('[data-filter="minPrice"]');
    const maxPriceInput = root.querySelector('[data-filter="maxPrice"]');

    let vehicles = [];
    let pageDefaults = { minPrice: null, maxPrice: null, tier: "" };

    function applyPageDefaults() {
      if (minPriceInput && pageDefaults.minPrice != null) {
        minPriceInput.value = String(pageDefaults.minPrice);
      }
      if (maxPriceInput && pageDefaults.maxPrice != null) {
        maxPriceInput.value = String(pageDefaults.maxPrice);
      }
    }

    function readFilters() {
      return {
        make: form.make.value,
        model: form.model.value,
        body: form.body.value,
        drivetrain: form.drivetrain.value,
        minPrice: minPriceInput?.value ? Number(minPriceInput.value) : pageDefaults.minPrice,
        maxPrice: maxPriceInput?.value ? Number(maxPriceInput.value) : pageDefaults.maxPrice,
        sort: form.sort.value,
      };
    }

    function applyFilters() {
      const filters = readFilters();
      let list = vehicles.filter((vehicle) => {
        if (filters.make && vehicle.make !== filters.make) {
          return false;
        }
        if (filters.model && vehicle.model !== filters.model) {
          return false;
        }
        if (filters.body && vehicle.bodySegment !== filters.body) {
          return false;
        }
        if (filters.drivetrain && vehicle.driveTrain !== filters.drivetrain) {
          return false;
        }
        if (!vehicleMatchesPrice(vehicle, filters.minPrice, filters.maxPrice)) {
          return false;
        }
        return true;
      });

      const sorters = {
        "price-asc": (a, b) => (a.price ?? Infinity) - (b.price ?? Infinity),
        "price-desc": (a, b) => (b.price ?? -1) - (a.price ?? -1),
        "year-desc": (a, b) => (b.year ?? 0) - (a.year ?? 0),
        "mileage-asc": (a, b) => (a.mileage ?? Infinity) - (b.mileage ?? Infinity),
      };
      list.sort(sorters[filters.sort] || sorters["price-asc"]);
      return list;
    }

    function title(vehicle) {
      return [vehicle.year, vehicle.make, vehicle.model, vehicle.trim].filter(Boolean).join(" ");
    }

    function render() {
      const list = applyFilters();
      grid.innerHTML = "";
      count.textContent = list.length
        ? `Showing ${list.length} of ${vehicles.length} vehicles`
        : "";
      empty.hidden = list.length > 0 || vehicles.length === 0;
      error.hidden = vehicles.length > 0;

      list.forEach((vehicle) => {
        const card = document.createElement("a");
        card.className = "reds-inv__card";
        card.href = vehicle.detailUrl || "#";
        card.target = "_blank";
        card.rel = "noopener noreferrer";

        const photo = document.createElement("div");
        photo.className = "reds-inv__photo";
        if (vehicle.photo) {
          photo.style.backgroundImage = `url("${vehicle.photo}")`;
        } else {
          photo.classList.add("reds-inv__photo--empty");
          photo.textContent = "No photo";
        }

        const body = document.createElement("div");
        body.className = "reds-inv__body";

        const heading = document.createElement("h3");
        heading.className = "reds-inv__title";
        heading.textContent = title(vehicle);

        const price = document.createElement("p");
        price.className = "reds-inv__price";
        price.textContent = money(vehicle.price);

        const meta = document.createElement("p");
        meta.className = "reds-inv__meta";
        meta.textContent = [
          miles(vehicle.mileage),
          vehicle.exteriorColor,
          vehicle.driveTrain,
          vehicle.stockNumber ? `Stock ${vehicle.stockNumber}` : "",
        ]
          .filter(Boolean)
          .join(" · ");

        const cta = document.createElement("span");
        cta.className = "reds-inv__cta";
        cta.textContent = "View details";

        body.append(heading, price, meta, cta);
        card.append(photo, body);
        grid.append(card);
      });
    }

    function refreshModels() {
      const make = makeSelect.value;
      const models = unique(
        vehicles.filter((v) => !make || v.make === make).map((v) => v.model)
      );
      fillSelect(modelSelect, models, "All models");
    }

    function setupFilters() {
      fillSelect(makeSelect, unique(vehicles.map((v) => v.make)), "All makes");
      fillSelect(bodySelect, unique(vehicles.map((v) => v.bodySegment)), "All body types");
      fillSelect(driveSelect, unique(vehicles.map((v) => v.driveTrain)), "All drivetrains");
      refreshModels();
      applyPageDefaults();
    }

    function boot(payload) {
      pageDefaults = payload?.pageDefaults || { minPrice: null, maxPrice: null, tier: "" };
      vehicles = Array.isArray(payload?.vehicles) ? payload.vehicles : [];
      if (!vehicles.length) {
        error.hidden = false;
        count.textContent = "";
        return;
      }
      setupFilters();
      render();
    }

    form.addEventListener("change", () => {
      if (document.activeElement === makeSelect) {
        refreshModels();
      }
      render();
    });
    form.addEventListener("input", render);
    form.querySelector("[data-reset]").addEventListener("click", () => {
      form.reset();
      applyPageDefaults();
      refreshModels();
      render();
    });

    let payload = null;
    try {
      payload = JSON.parse(dataNode?.textContent || "null");
    } catch (err) {
      payload = null;
    }

    if (payload?.vehicles?.length) {
      boot(payload);
      return;
    }

    const feedUrl = payload?.feedUrl || "https://tylerlirette.github.io/reds-import/inventory.json";
    fetch(feedUrl)
      .then((res) => res.json())
      .then((data) => {
        const limits = payload?.pageDefaults || { minPrice: null, maxPrice: null };
        const filtered = (data.vehicles || [])
          .map((vehicle) => ({
            ...vehicle,
            photo: vehicle.photos?.[0] || "",
          }))
          .filter((vehicle) => vehicleMatchesPrice(vehicle, limits.minPrice, limits.maxPrice));

        boot({
          pageDefaults: limits,
          vehicles: filtered,
        });
      })
      .catch(() => {
        error.hidden = false;
      });
  }

  document.querySelectorAll("[data-inventory-root]").forEach(initInventory);
})();
