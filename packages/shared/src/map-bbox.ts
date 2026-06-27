import { z } from "zod";

export const MAX_BBOX_SPAN_DEGREES = 5;

export const mapBboxSchema = z
  .object({
    west: z.number().min(-180).max(180),
    south: z.number().min(-90).max(90),
    east: z.number().min(-180).max(180),
    north: z.number().min(-90).max(90),
  })
  .refine((bbox) => bbox.west < bbox.east, {
    message: "west must be less than east",
  })
  .refine((bbox) => bbox.south < bbox.north, {
    message: "south must be less than north",
  })
  .refine(
    (bbox) =>
      bbox.east - bbox.west <= MAX_BBOX_SPAN_DEGREES &&
      bbox.north - bbox.south <= MAX_BBOX_SPAN_DEGREES,
    { message: "bbox span exceeds allowed limit" },
  );

export type MapBbox = z.infer<typeof mapBboxSchema>;

/** Expands to the maximum server-allowed span centered on a point. */
export function maxSpanBboxAround(lng: number, lat: number): MapBbox {
  const half = MAX_BBOX_SPAN_DEGREES / 2;
  return clampMapBbox({
    west: lng - half,
    south: lat - half,
    east: lng + half,
    north: lat + half,
  });
}

/** Shrinks viewport bbox to the server-allowed span (centered). */
export function clampMapBbox(bbox: MapBbox): MapBbox {
  let { west, south, east, north } = bbox;
  const lngSpan = east - west;
  const latSpan = north - south;

  if (lngSpan > MAX_BBOX_SPAN_DEGREES) {
    const midLng = (west + east) / 2;
    west = midLng - MAX_BBOX_SPAN_DEGREES / 2;
    east = midLng + MAX_BBOX_SPAN_DEGREES / 2;
  }

  if (latSpan > MAX_BBOX_SPAN_DEGREES) {
    const midLat = (south + north) / 2;
    south = midLat - MAX_BBOX_SPAN_DEGREES / 2;
    north = midLat + MAX_BBOX_SPAN_DEGREES / 2;
  }

  return { west, south, east, north };
}

export function parseBboxParam(value: string | null) {
  if (!value) {
    return {
      success: false as const,
      error: "bbox query param is required (west,south,east,north)",
    };
  }

  const parts = value.split(",").map((part) => Number(part.trim()));
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) {
    return {
      success: false as const,
      error: "bbox must be four comma-separated numbers: west,south,east,north",
    };
  }

  const parsed = mapBboxSchema.safeParse({
    west: parts[0],
    south: parts[1],
    east: parts[2],
    north: parts[3],
  });

  if (!parsed.success) {
    return {
      success: false as const,
      error: parsed.error.issues[0]?.message ?? "Invalid bbox",
    };
  }

  return { success: true as const, data: parsed.data };
}
