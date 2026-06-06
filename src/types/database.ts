import type { Tables, TablesInsert, TablesUpdate } from "@/types/supabase.generated";

export type {
  CallOutcome,
  DoorOutcome,
  LeadActivityType,
  LeadSource,
  LeadStage,
  LostReason,
  UserRole,
} from "@/lib/validators/enums";

/** Row shape for `public.profiles` (aligned with Supabase MCP-generated types) */
export type Profile = Tables<"profiles">;
export type ProfileInsert = TablesInsert<"profiles">;
export type ProfileUpdate = TablesUpdate<"profiles">;

/** Row shape for `public.contacts` */
export type Contact = Tables<"contacts">;
export type ContactInsert = TablesInsert<"contacts">;
export type ContactUpdate = TablesUpdate<"contacts">;

/** Row shape for `public.door_knocks` */
export type DoorKnock = Tables<"door_knocks">;
export type DoorKnockInsert = TablesInsert<"door_knocks">;
export type DoorKnockUpdate = TablesUpdate<"door_knocks">;

/** Row shape for `public.shifts` */
export type Shift = Tables<"shifts">;
export type ShiftInsert = TablesInsert<"shifts">;
export type ShiftUpdate = TablesUpdate<"shifts">;

/** Row shape for `public.gps_pings` */
export type GpsPing = Tables<"gps_pings">;
export type GpsPingInsert = TablesInsert<"gps_pings">;
export type GpsPingUpdate = TablesUpdate<"gps_pings">;

/** Row shape for `public.leads` */
export type Lead = Tables<"leads">;
export type LeadInsert = TablesInsert<"leads">;
export type LeadUpdate = TablesUpdate<"leads">;

/** Row shape for `public.lead_activity` */
export type LeadActivity = Tables<"lead_activity">;
export type LeadActivityInsert = TablesInsert<"lead_activity">;
export type LeadActivityUpdate = TablesUpdate<"lead_activity">;

/** Row shape for `public.follow_ups` */
export type FollowUp = Tables<"follow_ups">;
export type FollowUpInsert = TablesInsert<"follow_ups">;
export type FollowUpUpdate = TablesUpdate<"follow_ups">;
