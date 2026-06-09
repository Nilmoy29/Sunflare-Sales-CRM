import type { ExpressionSpecification } from "mapbox-gl";
import type { DoorOutcome } from "@/lib/validators/enums";
import { DOOR_OUTCOMES } from "@/lib/validators/enums";

export const DOOR_OUTCOME_COLORS = {
  interested: "#22c55e",
  not_home: "#eab308",
  not_interested: "#ef4444",
  do_not_knock: "#374151",
  callback_requested: "#3b82f6",
  already_has_solar: "#a855f7",
  decision_maker_missing: "#f97316",
  selling_the_house: "#14b8a6",
  rental: "#ec4899",
} as const satisfies Record<DoorOutcome, string>;

/** Darker shades for buttons — white label text meets contrast outdoors. */
export const DOOR_OUTCOME_BUTTON_COLORS = {
  interested: "#15803d",
  not_home: "#a16207",
  not_interested: "#b91c1c",
  do_not_knock: "#1f2937",
  callback_requested: "#1d4ed8",
  already_has_solar: "#7e22ce",
  decision_maker_missing: "#c2410c",
  selling_the_house: "#0f766e",
  rental: "#be185d",
} as const satisfies Record<DoorOutcome, string>;

export const DOOR_OUTCOME_LABELS = {
  interested: "Interested",
  not_home: "Not home",
  not_interested: "Not interested",
  do_not_knock: "Do not knock",
  callback_requested: "Callback",
  already_has_solar: "Has solar",
  decision_maker_missing: "Decision maker missing",
  selling_the_house: "Selling the house",
  rental: "Rental",
} as const satisfies Record<DoorOutcome, string>;

const DEFAULT_PIN_COLOR = "#64748b";

/** Mapbox `circle-color` expression keyed on GeoJSON `outcome` property. */
export function doorOutcomeMapboxColorExpression(): ExpressionSpecification {
  const pairs: (string | ExpressionSpecification)[] = [];
  for (const outcome of DOOR_OUTCOMES) {
    pairs.push(outcome, DOOR_OUTCOME_COLORS[outcome]);
  }
  return ["match", ["get", "outcome"], ...pairs, DEFAULT_PIN_COLOR];
}
