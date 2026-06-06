import Dexie, { type EntityTable } from "dexie";
import type { DoorOutcome } from "@/lib/validators/enums";

export type PendingKnockStatus = "pending" | "syncing";

export type PendingKnockRow = {
  client_id: string;
  idempotency_key: string;
  lat: number;
  lng: number;
  outcome: DoorOutcome;
  follow_up_at: string | null;
  notes_enc: string | null;
  address_enc: string | null;
  suburb_enc: string | null;
  postcode_enc: string | null;
  status: PendingKnockStatus;
  created_at: string;
};

class SunflareOfflineDB extends Dexie {
  pending_knocks!: EntityTable<PendingKnockRow, "client_id">;

  constructor() {
    super("sunflare_offline");
    this.version(1).stores({
      pending_knocks: "client_id, status, created_at, idempotency_key",
    });
  }
}

export const pendingKnocksDb = new SunflareOfflineDB();
