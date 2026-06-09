import { z } from "zod";

/** PostgreSQL `user_role` — frozen PRD v1 */
export const USER_ROLES = ["admin", "rep"] as const;
export const userRoleSchema = z.enum(USER_ROLES);
export type UserRole = z.infer<typeof userRoleSchema>;

/** PostgreSQL `door_outcome` */
export const DOOR_OUTCOMES = [
  "interested",
  "not_home",
  "not_interested",
  "do_not_knock",
  "callback_requested",
  "already_has_solar",
  "decision_maker_missing",
  "selling_the_house",
  "rental",
] as const;
export const doorOutcomeSchema = z.enum(DOOR_OUTCOMES);
export type DoorOutcome = z.infer<typeof doorOutcomeSchema>;

/** PostgreSQL `call_outcome` */
export const CALL_OUTCOMES = [
  "answered_interested",
  "answered_not_interested",
  "voicemail",
  "no_answer",
  "wrong_number",
  "callback_scheduled",
] as const;
export const callOutcomeSchema = z.enum(CALL_OUTCOMES);
export type CallOutcome = z.infer<typeof callOutcomeSchema>;

/** PostgreSQL `lead_source` */
export const LEAD_SOURCES = ["d2d", "call"] as const;
export const leadSourceSchema = z.enum(LEAD_SOURCES);
export type LeadSource = z.infer<typeof leadSourceSchema>;

/** PostgreSQL `lead_stage` */
export const LEAD_STAGES = [
  "knocked_called",
  "interested",
  "appointment_set",
  "pitched",
  "proposal_sent",
  "signed",
  "lost",
] as const;
export const leadStageSchema = z.enum(LEAD_STAGES);
export type LeadStage = z.infer<typeof leadStageSchema>;

/** PostgreSQL `lead_activity_type` */
export const LEAD_ACTIVITY_TYPES = [
  "note",
  "stage_change",
  "call",
  "knock",
] as const;
export const leadActivityTypeSchema = z.enum(LEAD_ACTIVITY_TYPES);
export type LeadActivityType = z.infer<typeof leadActivityTypeSchema>;

/** PostgreSQL `lost_reason` */
export const LOST_REASONS = [
  "price",
  "not_interested",
  "competitor",
  "no_response",
] as const;
export const lostReasonSchema = z.enum(LOST_REASONS);
export type LostReason = z.infer<typeof lostReasonSchema>;
