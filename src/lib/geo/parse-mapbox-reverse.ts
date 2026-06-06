export type ParsedReverseGeocode = {
  address: string | null;
  suburb: string | null;
  postcode: string | null;
};

function readContextName(context: unknown, key: string): string | null {
  if (!context || typeof context !== "object") {
    return null;
  }
  const entry = (context as Record<string, unknown>)[key];
  if (!entry || typeof entry !== "object") {
    return null;
  }
  const name = (entry as { name?: unknown }).name;
  if (typeof name !== "string") {
    return null;
  }
  const trimmed = name.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function readStreetLineFromContext(context: unknown): string | null {
  if (!context || typeof context !== "object") {
    return null;
  }

  const addressCtx = (context as Record<string, unknown>).address;
  if (!addressCtx || typeof addressCtx !== "object") {
    return readContextName(context, "address");
  }

  const addressRecord = addressCtx as Record<string, unknown>;
  const number =
    typeof addressRecord.address_number === "string"
      ? addressRecord.address_number.trim()
      : "";
  const street =
    typeof addressRecord.street_name === "string"
      ? addressRecord.street_name.trim()
      : "";
  const streetLine = [number, street].filter(Boolean).join(" ").trim();
  if (streetLine) {
    return streetLine;
  }

  return readContextName(context, "address");
}

function readAddressLine(properties: Record<string, unknown>): string | null {
  const line1 = properties.address_line1;
  const line2 = properties.address_line2;
  const parts = [line1, line2]
    .filter((part): part is string => typeof part === "string" && part.trim().length > 0)
    .map((part) => part.trim());

  if (parts.length > 0) {
    return parts.join(", ");
  }

  const streetFromContext = readStreetLineFromContext(properties.context);
  if (streetFromContext) {
    return streetFromContext;
  }

  const full = properties.full_address;
  if (typeof full === "string" && full.trim()) {
    return full.trim();
  }

  return null;
}

export function parseMapboxReverseResponse(
  payload: unknown,
): ParsedReverseGeocode | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const features = (payload as { features?: unknown }).features;
  if (!Array.isArray(features) || features.length === 0) {
    return null;
  }

  const first = features[0];
  if (!first || typeof first !== "object") {
    return null;
  }

  const properties = (first as { properties?: unknown }).properties;
  if (!properties || typeof properties !== "object") {
    return null;
  }

  const props = properties as Record<string, unknown>;
  const context = props.context;

  const suburb =
    readContextName(context, "place") ??
    readContextName(context, "locality") ??
    readContextName(context, "neighborhood");

  return {
    address: readAddressLine(props),
    suburb,
    postcode: readContextName(context, "postcode"),
  };
}
