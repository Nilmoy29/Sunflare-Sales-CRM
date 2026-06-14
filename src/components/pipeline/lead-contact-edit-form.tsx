"use client";

import { useEffect, useState } from "react";
import { LostReasonDialog } from "@/components/pipeline/lost-reason-dialog";
import { updateContact, updateLeadStage } from "@/features/pipeline/api";
import {
  LEAD_SOURCE_BADGE_CLASS,
  LEAD_SOURCE_LABELS,
} from "@/features/pipeline/pipeline-source-labels";
import {
  LEAD_STAGE_LABELS,
  PIPELINE_STAGE_ORDER,
} from "@/features/pipeline/pipeline-stage-labels";
import { formatContactDisplayName } from "@/lib/validators/contacts";
import { formatPipelineDate } from "@/features/pipeline/format-pipeline-dates";
import { LEAD_STAGES, type LeadStage, type LostReason } from "@/lib/validators/enums";
import type { LeadDetailHeader } from "@/lib/validators/lead-detail";

type LeadContactEditFormProps = {
  lead: LeadDetailHeader;
  disabled?: boolean;
  onSaved: () => void;
};

function splitCustomerName(firstName: string | null, lastName: string | null) {
  if (firstName?.trim()) {
    return firstName.trim();
  }
  if (lastName?.trim()) {
    return lastName.trim();
  }
  return "";
}

export function LeadContactEditForm({
  lead,
  disabled = false,
  onSaved,
}: LeadContactEditFormProps) {
  const [customerName, setCustomerName] = useState(
    splitCustomerName(lead.first_name, lead.last_name),
  );
  const [phone, setPhone] = useState(lead.phone ?? "");
  const [address, setAddress] = useState(lead.address ?? "");
  const [suburb, setSuburb] = useState(lead.suburb ?? "");
  const [postcode, setPostcode] = useState(lead.postcode ?? "");
  const [stage, setStage] = useState<LeadStage>(lead.stage);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pendingLost, setPendingLost] = useState(false);

  useEffect(() => {
    setCustomerName(splitCustomerName(lead.first_name, lead.last_name));
    setPhone(lead.phone ?? "");
    setAddress(lead.address ?? "");
    setSuburb(lead.suburb ?? "");
    setPostcode(lead.postcode ?? "");
    setStage(lead.stage);
  }, [lead]);

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    if (disabled || saving) {
      return;
    }

    const trimmedName = customerName.trim();
    if (!trimmedName) {
      setError("Customer name is required.");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await updateContact(lead.contact_id, {
        first_name: trimmedName,
        last_name: null,
        phone: phone.trim() || null,
        address: address.trim() || null,
        suburb: suburb.trim() || null,
        postcode: postcode.trim() || null,
      });

      if (stage !== lead.stage) {
        if (stage === "lost") {
          setPendingLost(true);
          setSaving(false);
          return;
        }
        await updateLeadStage(lead.id, stage);
      }

      setSuccess("Customer details saved.");
      onSaved();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not save changes");
    } finally {
      setSaving(false);
    }
  }

  async function handleLostConfirm(lostReason: LostReason) {
    setSaving(true);
    setError(null);
    try {
      await updateContact(lead.contact_id, {
        first_name: customerName.trim(),
        last_name: null,
        phone: phone.trim() || null,
        address: address.trim() || null,
        suburb: suburb.trim() || null,
        postcode: postcode.trim() || null,
      });
      await updateLeadStage(lead.id, "lost", lostReason);
      setPendingLost(false);
      setSuccess("Customer details saved.");
      onSaved();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not save changes");
      setStage(lead.stage);
    } finally {
      setSaving(false);
    }
  }

  const displayName = formatContactDisplayName({
    first_name: customerName.trim() || lead.first_name,
    last_name: lead.last_name,
  });

  return (
    <>
      <form
        onSubmit={(event) => {
          void handleSave(event);
        }}
        className="rounded-xl border border-border bg-card p-4 shadow-sm"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-foreground">{displayName}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Edit customer details below and save changes.
            </p>
          </div>
          <span
            className={`rounded px-2 py-1 text-xs font-medium ${LEAD_SOURCE_BADGE_CLASS[lead.source]}`}
          >
            {LEAD_SOURCE_LABELS[lead.source]}
          </span>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="space-y-1 sm:col-span-2">
            <label htmlFor="lead-customer-name" className="text-sm font-medium text-foreground">
              Customer name
            </label>
            <input
              id="lead-customer-name"
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              disabled={disabled || saving}
              required
              className="min-h-11 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="lead-phone" className="text-sm font-medium text-foreground">
              Phone
            </label>
            <input
              id="lead-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={disabled || saving}
              placeholder="Optional"
              className="min-h-11 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="lead-stage" className="text-sm font-medium text-foreground">
              Status
            </label>
            <select
              id="lead-stage"
              value={stage}
              onChange={(e) => {
                const value = e.target.value;
                if ((LEAD_STAGES as readonly string[]).includes(value)) {
                  setStage(value as LeadStage);
                }
              }}
              disabled={disabled || saving}
              className="min-h-11 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
            >
              {PIPELINE_STAGE_ORDER.map((item) => (
                <option key={item} value={item}>
                  {LEAD_STAGE_LABELS[item]}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1 sm:col-span-2">
            <label htmlFor="lead-address" className="text-sm font-medium text-foreground">
              Address
            </label>
            <input
              id="lead-address"
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              disabled={disabled || saving}
              className="min-h-11 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="lead-suburb" className="text-sm font-medium text-foreground">
              Suburb
            </label>
            <input
              id="lead-suburb"
              type="text"
              value={suburb}
              onChange={(e) => setSuburb(e.target.value)}
              disabled={disabled || saving}
              className="min-h-11 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="lead-postcode" className="text-sm font-medium text-foreground">
              Postcode
            </label>
            <input
              id="lead-postcode"
              type="text"
              value={postcode}
              onChange={(e) => setPostcode(e.target.value)}
              disabled={disabled || saving}
              className="min-h-11 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
            />
          </div>

          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">Owner</p>
            <p className="min-h-11 rounded-lg border border-border bg-secondary/40 px-3 py-2 text-sm text-muted-foreground">
              {lead.rep_name}
            </p>
          </div>

          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">Appointment</p>
            <p className="min-h-11 rounded-lg border border-border bg-secondary/40 px-3 py-2 text-sm text-muted-foreground">
              {formatPipelineDate(lead.booked_at)}
            </p>
          </div>

          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">Closer</p>
            <p className="min-h-11 rounded-lg border border-border bg-secondary/40 px-3 py-2 text-sm text-muted-foreground">
              {lead.closer_name ?? "—"}
            </p>
          </div>

          {lead.booking_notes ? (
            <div className="space-y-1 sm:col-span-2">
              <p className="text-sm font-medium text-foreground">Booking notes</p>
              <p className="rounded-lg border border-border bg-secondary/40 px-3 py-2 text-sm text-muted-foreground">
                {lead.booking_notes}
              </p>
            </div>
          ) : null}

          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">Created</p>
            <p className="min-h-11 rounded-lg border border-border bg-secondary/40 px-3 py-2 text-sm text-muted-foreground">
              {new Date(lead.created_at).toLocaleString("en-AU", {
                timeZone: "Australia/Sydney",
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </p>
          </div>
        </div>

        {error ? (
          <p className="mt-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        {success ? (
          <p className="mt-4 rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            {success}
          </p>
        ) : null}

        <div className="mt-4 flex justify-end">
          <button
            type="submit"
            disabled={disabled || saving}
            className="min-h-11 rounded-lg bg-foreground px-4 py-2 text-sm font-semibold text-background hover:opacity-90 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>

      {pendingLost ? (
        <LostReasonDialog
          contactName={customerName.trim() || displayName}
          submitting={saving}
          onCancel={() => {
            if (!saving) {
              setPendingLost(false);
              setStage(lead.stage);
            }
          }}
          onConfirm={(lostReason) => {
            void handleLostConfirm(lostReason);
          }}
        />
      ) : null}
    </>
  );
}
