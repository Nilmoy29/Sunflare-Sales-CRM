"use client";

import Link from "next/link";
import { useState } from "react";
import { CallLogForm } from "@/components/calls/call-log-form";
import { CallScriptPanel } from "@/components/calls/call-script-panel";
import { ContactCallHistory } from "@/components/calls/contact-call-history";
import { ContactQuickAddSheet } from "@/components/calls/contact-quick-add-sheet";
import { PhoneDialLink } from "@/components/calls/phone-dial-link";
import { promoteCall } from "@/features/calls/api";
import { useCallScript } from "@/features/calls/use-call-script";
import { useContactCallHistory } from "@/features/calls/use-contact-call-history";
import { useContactSearch } from "@/features/calls/use-contact-search";
import { useRepDailyCallCount } from "@/features/calls/use-rep-daily-call-count";
import type { CallLogSummary } from "@/lib/validators/call-logs";
import { isPromotableCallOutcome } from "@/lib/validators/leads";
import {
  CONTACT_SEARCH_MIN_LENGTH,
  formatContactAddressLine,
  formatContactDisplayName,
  type ContactSearchResult,
  type ContactSummary,
} from "@/lib/validators/contacts";

function toSelectedFromCreated(contact: ContactSummary): ContactSearchResult {
  return { ...contact, is_linked: true };
}

function toSelectedFromDuplicate(contact: ContactSummary): ContactSearchResult {
  return { ...contact, is_linked: false };
}

function formatDailyCallCountLabel(value: number): string {
  return value === 1 ? "1 call today" : `${value} calls today`;
}

export function CallsPanelShell() {
  const [query, setQuery] = useState("");
  const [selectedContact, setSelectedContact] =
    useState<ContactSearchResult | null>(null);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [duplicateNotice, setDuplicateNotice] = useState<string | null>(null);
  const [callLoggedNotice, setCallLoggedNotice] = useState<string | null>(null);
  const [lastLoggedCall, setLastLoggedCall] = useState<CallLogSummary | null>(
    null,
  );
  const [promotedCallIds, setPromotedCallIds] = useState<string[]>([]);
  const [promoting, setPromoting] = useState(false);
  const [promoteError, setPromoteError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const { contacts, loading, error } = useContactSearch(query);
  const {
    count: dailyCallCount,
    loading: dailyCallCountLoading,
    error: dailyCallCountError,
  } = useRepDailyCallCount(refreshKey);
  const {
    body: callScriptBody,
    loading: callScriptLoading,
    error: callScriptError,
  } = useCallScript();
  const {
    calls: callHistory,
    loading: callHistoryLoading,
    reloading: callHistoryReloading,
    error: callHistoryError,
  } = useContactCallHistory(selectedContact?.id ?? null, refreshKey);
  const trimmedQuery = query.trim();
  const showHint = trimmedQuery.length < CONTACT_SEARCH_MIN_LENGTH;

  function handleSelectContact(contact: ContactSearchResult) {
    setSelectedContact(contact);
    setDuplicateNotice(null);
    setCallLoggedNotice(null);
    setLastLoggedCall(null);
    setPromoteError(null);
  }

  function handleCallLogged(call: CallLogSummary) {
    setLastLoggedCall(call);
    setCallLoggedNotice("Call logged.");
    setPromoteError(null);
    setRefreshKey((key) => key + 1);
  }

  async function handlePromote() {
    if (!lastLoggedCall || promoting) {
      return;
    }

    setPromoting(true);
    setPromoteError(null);

    const result = await promoteCall(lastLoggedCall.id);

    setPromoting(false);

    if (result.status === "error") {
      setPromoteError(result.message);
      return;
    }

    setPromotedCallIds((ids) =>
      ids.includes(lastLoggedCall.id) ? ids : [...ids, lastLoggedCall.id],
    );
    setCallLoggedNotice("Call logged · Added to pipeline");
  }

  const showPromoteButton =
    lastLoggedCall !== null &&
    isPromotableCallOutcome(lastLoggedCall.outcome) &&
    !promotedCallIds.includes(lastLoggedCall.id);

  function handleCreated(contact: ContactSummary) {
    setSelectedContact(toSelectedFromCreated(contact));
    setDuplicateNotice(null);
  }

  function handleDuplicate(contact: ContactSummary) {
    setSelectedContact(toSelectedFromDuplicate(contact));
    setDuplicateNotice(
      "A contact with this phone already exists. We selected the existing record.",
    );
  }

  return (
    <main className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto bg-white p-4 md:p-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900 sm:text-2xl">Calls</h1>
        {dailyCallCountError ? (
          <p className="mt-2 text-sm text-red-600" role="alert">
            {dailyCallCountError}
          </p>
        ) : dailyCallCountLoading ? (
          <p className="mt-2 text-sm font-medium text-zinc-500">
            Loading today&apos;s call count…
          </p>
        ) : (
          <p className="mt-2 text-sm font-medium text-zinc-700">
            {formatDailyCallCountLabel(dailyCallCount ?? 0)}
          </p>
        )}
        <p className="mt-1 text-sm text-zinc-600">
          Search for a contact or quick-add a new one before logging a call.
        </p>
      </div>

      <div className="sticky top-0 z-10 space-y-3 bg-white pb-2">
        <label className="block text-sm font-medium text-zinc-700">
          Search contacts
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Name, phone, or address"
            className="mt-1 min-h-11 w-full rounded-lg border border-zinc-300 px-3 text-base"
          />
        </label>

        <button
          type="button"
          onClick={() => setQuickAddOpen(true)}
          className="min-h-11 rounded-lg border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
        >
          Quick add contact
        </button>
      </div>

      {duplicateNotice ? (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 ring-1 ring-amber-200">
          {duplicateNotice}
        </p>
      ) : null}

      {showHint ? (
        <p className="text-sm text-zinc-500">
          Type at least {CONTACT_SEARCH_MIN_LENGTH} characters to search.
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-zinc-500">Searching…</p>
      ) : null}

      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      {!showHint && !loading && !error && contacts.length === 0 ? (
        <p className="text-sm text-zinc-500">
          No contacts found. Try another search or quick-add a new contact.
        </p>
      ) : null}

      <ul className="space-y-2">
        {contacts.map((contact) => {
          const selected = selectedContact?.id === contact.id;
          const addressLine = formatContactAddressLine(contact);

          return (
            <li key={contact.id}>
              <div
                role="button"
                tabIndex={0}
                onClick={() => handleSelectContact(contact)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    handleSelectContact(contact);
                  }
                }}
                className={`min-h-11 w-full cursor-pointer rounded-lg border px-3 py-3 text-left transition ${
                  selected
                    ? "border-zinc-900 bg-zinc-50 ring-1 ring-zinc-900"
                    : "border-zinc-200 bg-white hover:bg-zinc-50"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-zinc-900">
                      {formatContactDisplayName(contact)}
                    </p>
                    {contact.phone ? (
                      <p className="mt-1 text-sm text-zinc-600">
                        <PhoneDialLink phone={contact.phone}>
                          {contact.phone}
                        </PhoneDialLink>
                      </p>
                    ) : null}
                    {addressLine ? (
                      <p className="mt-1 text-sm text-zinc-500">{addressLine}</p>
                    ) : null}
                  </div>
                  {contact.is_linked ? (
                    <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
                      Linked
                    </span>
                  ) : null}
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {selectedContact ? (
        <section className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Selected contact
          </h2>
          <p className="mt-2 text-lg font-medium text-zinc-900">
            {formatContactDisplayName(selectedContact)}
          </p>
          {selectedContact.phone ? (
            <p className="mt-1 text-sm text-zinc-600">
              <PhoneDialLink phone={selectedContact.phone}>
                {selectedContact.phone}
              </PhoneDialLink>
            </p>
          ) : null}
          {formatContactAddressLine(selectedContact) ? (
            <p className="mt-1 text-sm text-zinc-600">
              {formatContactAddressLine(selectedContact)}
            </p>
          ) : null}
          {callScriptError ? (
            <p className="mt-3 text-sm text-red-600" role="alert">
              {callScriptError}
            </p>
          ) : null}
          {!callScriptLoading ? (
            <CallScriptPanel body={callScriptBody ?? ""} />
          ) : null}
          <CallLogForm
            key={selectedContact.id}
            contactId={selectedContact.id}
            onLogged={handleCallLogged}
          />
          {callLoggedNotice ? (
            <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-900 ring-1 ring-emerald-200">
              {callLoggedNotice}{" "}
              {promotedCallIds.includes(lastLoggedCall?.id ?? "") ? (
                <Link
                  href="/rep/pipeline"
                  className="font-medium underline hover:text-emerald-950"
                >
                  View pipeline
                </Link>
              ) : null}
            </p>
          ) : null}
          {showPromoteButton ? (
            <button
              type="button"
              onClick={() => {
                void handlePromote();
              }}
              disabled={promoting}
              className="mt-3 min-h-11 w-full rounded-lg border border-emerald-700 bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {promoting ? "Promoting…" : "Promote to pipeline"}
            </button>
          ) : null}
          {promoteError ? (
            <p className="mt-3 text-sm text-red-600" role="alert">
              {promoteError}
            </p>
          ) : null}
          <ContactCallHistory
            calls={callHistory}
            loading={callHistoryLoading || callHistoryReloading}
            error={callHistoryError}
          />
        </section>
      ) : null}

      <ContactQuickAddSheet
        open={quickAddOpen}
        onClose={() => setQuickAddOpen(false)}
        onCreated={handleCreated}
        onDuplicate={handleDuplicate}
      />
    </main>
  );
}
