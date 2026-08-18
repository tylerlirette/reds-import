const REQUIRED_FIELDS = ["VIN", "DealerID", "Status"];

const AUTOFIND_DETAIL_BASE = "https://www.autofind.com/dealer/details";

export function buildDetailUrl(dealerId, vin) {
  if (dealerId == null || dealerId === "" || !vin) {
    return null;
  }
  return `${AUTOFIND_DETAIL_BASE}/${encodeURIComponent(String(dealerId))}/${encodeURIComponent(String(vin))}`;
}

export function toInt(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const n = Number.parseInt(String(value).replace(/,/g, ""), 10);
  return Number.isFinite(n) ? n : null;
}

export function toNumber(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const n = Number(String(value).replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : null;
}

export function splitPipeList(value) {
  if (!value || typeof value !== "string") {
    return [];
  }
  return value
    .split("|")
    .map((part) => part.trim())
    .filter(Boolean);
}

export function toIsoDate(value) {
  if (!value || value === "1900-01-01 00:00:00") {
    return null;
  }
  const raw = String(value).trim();
  const hasZone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(raw);
  const normalized = raw.replace(" ", "T");
  const date = new Date(hasZone ? normalized : `${normalized}Z`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function assertRequiredColumns(rows) {
  if (!rows.length) {
    throw new Error("Inventory file contained no rows.");
  }
  const sample = rows[0];
  const missing = REQUIRED_FIELDS.filter((field) => !(field in sample));
  if (missing.length) {
    throw new Error(
      `Inventory file is missing required columns: ${missing.join(", ")}. Found: ${Object.keys(sample).join(", ")}`
    );
  }
}

export function transformRow(row) {
  const status = String(row.Status ?? "").trim().toUpperCase();
  if (status !== "A") {
    return null;
  }

  const vin = String(row.VIN ?? "").trim();
  const dealerId = row.DealerID;
  if (!vin) {
    return null;
  }

  const photos = splitPipeList(row.PhotoUrls);
  const price = toNumber(row.InternetPrice);

  return {
    id: vin,
    vin,
    stockNumber: String(row.StockNumber ?? "").trim() || null,
    dealerId: toInt(dealerId) ?? dealerId,
    year: toInt(row.Year),
    make: String(row.Make ?? "").trim() || null,
    model: String(row.Model ?? "").trim() || null,
    trim: String(row.Trim ?? "").trim() || null,
    bodySegment: String(row.BodySegment ?? "").trim() || null,
    body: String(row.Body ?? "").trim() || null,
    price: price && price > 0 ? price : null,
    mileage: toInt(row.Mileage),
    exteriorColor: String(row.OEMColorNameExterior ?? "").trim() || null,
    interiorColor: String(row.GenericColorInterior ?? "").trim() || null,
    photos,
    photoCount: toInt(row.Photos) ?? photos.length,
    transmission: String(row.Transmission ?? "").trim() || null,
    engine: String(row.EngineSize ?? "").trim() || null,
    driveTrain: String(row.DriveTrain ?? "").trim() || null,
    fuelType: String(row.FuelType ?? "").trim() || null,
    description: String(row.VehicleComments ?? "").trim() || null,
    detailUrl: buildDetailUrl(dealerId, vin),
    updatedAt: toIsoDate(row.DateUpdated),
  };
}

export function transformInventory(rows) {
  assertRequiredColumns(rows);
  const vehicles = rows.map(transformRow).filter(Boolean);
  const timestamps = vehicles
    .map((v) => v.updatedAt)
    .filter(Boolean)
    .sort();

  return {
    updatedAt: timestamps.at(-1) ?? new Date().toISOString(),
    count: vehicles.length,
    vehicles,
  };
}
