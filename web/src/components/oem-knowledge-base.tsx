"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";

type MachineResult = {
  id: string;
  brand: string;
  model: string | null;
  displayName: string;
  sourcePage: number | null;
  references: Array<{ id: string; application: string; oemPartNumber: string; sourcePage: number | null }>;
};

// Enquiry list is kept apart from the Duraforge basket (duraforge_cart): OEM references have no SKU or price yet.
type EnquiryItem = {
  referenceId: string;
  machine: string;
  brand: string;
  application: string;
  oemPartNumber: string;
  quantity: number;
};

const ENQUIRY_STORAGE_KEY = "duraforge_oem_enquiry";
const EMPTY_ENQUIRY = "[]";
const enquiryListeners = new Set<() => void>();

function subscribeEnquiry(listener: () => void) {
  enquiryListeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    enquiryListeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function readEnquiryRaw() {
  return window.localStorage.getItem(ENQUIRY_STORAGE_KEY) ?? EMPTY_ENQUIRY;
}

function parseEnquiry(raw: string): EnquiryItem[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as EnquiryItem[]) : [];
  } catch {
    return [];
  }
}

function writeEnquiry(items: EnquiryItem[]) {
  window.localStorage.setItem(ENQUIRY_STORAGE_KEY, JSON.stringify(items));
  enquiryListeners.forEach((listener) => listener());
}

type EnquiryLine = {
  id: string;
  brand: string;
  machineName: string;
  application: string;
  oemPartNumber: string;
  quantity: number;
};

type EnquirySubmission = {
  id: string;
  status: "SUBMITTED" | "REVIEWED";
  note: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  items: EnquiryLine[];
};

type EnquiryView = { draft: { id: string; items: EnquiryLine[] }; submissions: EnquirySubmission[] };

// Signed-in lists live in the database. Guest lists stay in localStorage and move to the account on sign-in.
const ENQUIRY_URL = "/api/oem-knowledge-base/enquiry";
const ENQUIRY_ITEMS_URL = `${ENQUIRY_URL}/items`;
const JSON_HEADERS = { "Content-Type": "application/json" };

function guestLine(item: EnquiryItem): EnquiryLine {
  return {
    id: item.referenceId,
    brand: item.brand,
    machineName: item.machine,
    application: item.application,
    oemPartNumber: item.oemPartNumber,
    quantity: item.quantity,
  };
}

function addItemRequest(item: Omit<EnquiryLine, "id">) {
  return fetch(ENQUIRY_ITEMS_URL, { method: "POST", headers: JSON_HEADERS, body: JSON.stringify(item) });
}

async function readEnquiryResponse(response: Response): Promise<{ view: EnquiryView | null; error: string }> {
  const data = (await response.json().catch(() => null)) as (Partial<EnquiryView> & { error?: string }) | null;
  if (!response.ok || !data?.draft || !data.submissions) {
    return { view: null, error: data?.error ?? "Your OEM enquiry could not be updated. Please try again." };
  }
  return { view: data as EnquiryView, error: "" };
}

export function OemKnowledgeBase({ signedIn = false }: { signedIn?: boolean }) {
  const [query, setQuery] = useState("");
  const enquiryRaw = useSyncExternalStore(subscribeEnquiry, readEnquiryRaw, () => EMPTY_ENQUIRY);
  const enquiry = useMemo(() => parseEnquiry(enquiryRaw), [enquiryRaw]);
  const [view, setView] = useState<EnquiryView | null>(null);
  const [enquiryError, setEnquiryError] = useState("");
  const [enquiryBusy, setEnquiryBusy] = useState(false);
  const [note, setNote] = useState("");
  const syncStarted = useRef(false);

  function addToEnquiry(machine: MachineResult, referenceId: string, quantity: number) {
    const reference = machine.references.find((item) => item.id === referenceId);
    if (!reference) return;
    const existing = enquiry.find((item) => item.referenceId === referenceId);
    if (existing) {
      writeEnquiry(enquiry.map((item) => (item.referenceId === referenceId ? { ...item, quantity: item.quantity + quantity } : item)));
      return;
    }
    writeEnquiry([
      ...enquiry,
      {
        referenceId,
        machine: machine.displayName,
        brand: machine.brand,
        application: reference.application,
        oemPartNumber: reference.oemPartNumber,
        quantity,
      },
    ]);
  }

  function updateQuantity(referenceId: string, quantity: number) {
    writeEnquiry(enquiry.map((item) => (item.referenceId === referenceId ? { ...item, quantity } : item)));
  }

  function removeFromEnquiry(referenceId: string) {
    writeEnquiry(enquiry.filter((item) => item.referenceId !== referenceId));
  }

  useEffect(() => {
    if (!signedIn || syncStarted.current) return;
    syncStarted.current = true;
    void (async () => {
      try {
        const pending = parseEnquiry(readEnquiryRaw());
        const failed: EnquiryItem[] = [];
        for (const item of pending) {
          const response = await addItemRequest(guestLine(item));
          if (!response.ok) failed.push(item);
        }
        if (pending.length > 0) writeEnquiry(failed);
        const result = await readEnquiryResponse(await fetch(ENQUIRY_URL));
        if (result.view) setView(result.view);
        setEnquiryError(
          failed.length > 0
            ? `${failed.length} line(s) from this browser could not be saved to your account. They remain in this browser.`
            : result.error,
        );
      } catch {
        setEnquiryError("Could not load your OEM enquiry list. Check your connection and refresh.");
      }
    })();
  }, [signedIn]);

  async function sendEnquiryChange(request: Promise<Response>) {
    setEnquiryBusy(true);
    try {
      const result = await readEnquiryResponse(await request);
      if (result.view) setView(result.view);
      setEnquiryError(result.error);
      return result.view !== null;
    } catch {
      setEnquiryError("Network error. Your enquiry was not changed.");
      return false;
    } finally {
      setEnquiryBusy(false);
    }
  }

  function addLine(machine: MachineResult, referenceId: string, quantity: number) {
    if (!signedIn) {
      addToEnquiry(machine, referenceId, quantity);
      return;
    }
    const reference = machine.references.find((item) => item.id === referenceId);
    if (!reference) return;
    void sendEnquiryChange(
      addItemRequest({
        brand: machine.brand,
        machineName: machine.displayName,
        application: reference.application,
        oemPartNumber: reference.oemPartNumber,
        quantity,
      }),
    );
  }

  function changeLineQuantity(line: EnquiryLine, quantity: number) {
    if (!signedIn) {
      updateQuantity(line.id, quantity);
      return;
    }
    void sendEnquiryChange(
      fetch(`${ENQUIRY_ITEMS_URL}/${line.id}`, { method: "PATCH", headers: JSON_HEADERS, body: JSON.stringify({ quantity }) }),
    );
  }

  function removeLine(line: EnquiryLine) {
    if (!signedIn) {
      removeFromEnquiry(line.id);
      return;
    }
    void sendEnquiryChange(fetch(`${ENQUIRY_ITEMS_URL}/${line.id}`, { method: "DELETE" }));
  }

  function clearLines() {
    if (!signedIn) {
      writeEnquiry([]);
      return;
    }
    void sendEnquiryChange(fetch(ENQUIRY_URL, { method: "DELETE" }));
  }

  async function submitEnquiry() {
    const submitted = await sendEnquiryChange(
      fetch(`${ENQUIRY_URL}/submit`, { method: "POST", headers: JSON_HEADERS, body: JSON.stringify({ note }) }),
    );
    if (submitted) setNote("");
  }

  const [brand, setBrand] = useState("");
  const [brands, setBrands] = useState<string[]>([]);
  const [machines, setMachines] = useState<MachineResult[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState("");

  async function load(term: string, selectedBrand: string, nextPage: number, append: boolean) {
    setLoading(true);
    try {
      const params = new URLSearchParams({ q: term, page: String(nextPage) });
      if (selectedBrand) params.set("brand", selectedBrand);
      const response = await fetch(`/api/oem-knowledge-base?${params}`);
      const data = (await response.json()) as { machines?: MachineResult[]; brands?: string[]; hasMore?: boolean; error?: string };
      if (!response.ok) {
        setError(data.error ?? "The OEM Knowledge Base is unavailable.");
        setMachines([]);
        setHasMore(false);
        return;
      }
      setError("");
      const found = data.machines ?? [];
      setMachines((prev) => (append ? [...prev, ...found] : found));
      setBrands(data.brands ?? []);
      setPage(nextPage);
      setHasMore(Boolean(data.hasMore));
      setSearched(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={(event) => { event.preventDefault(); void load(query, brand, 1, false); }} className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex flex-col gap-3 sm:flex-row">
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search machine, application or OEM part number…" className="flex-1 rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-orange focus:ring-2 focus:ring-orange/20" />
          <select value={brand} onChange={(event) => { setBrand(event.target.value); void load(query, event.target.value, 1, false); }} className="rounded-lg border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-orange">
            <option value="">All OEMs</option>
            {brands.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <button type="submit" className="rounded-lg bg-navy px-6 py-3 text-sm font-semibold text-white hover:bg-navy-800">{loading ? "Searching…" : "Search"}</button>
        </div>
        <p className="mt-3 text-xs text-slate-brand">Exact OEM references are preserved as printed in the source catalogue.</p>
      </form>

      {error && <div role="alert" className="rounded-xl border border-orange/30 bg-orange/5 p-4 text-sm text-orange">{error}</div>}

      <EnquiryPanel
        signedIn={signedIn}
        lines={signedIn ? (view?.draft.items ?? []) : enquiry.map(guestLine)}
        submissions={signedIn ? (view?.submissions ?? []) : []}
        note={note}
        onNoteChange={setNote}
        busy={enquiryBusy}
        error={enquiryError}
        onQuantity={changeLineQuantity}
        onRemove={removeLine}
        onClear={clearLines}
        onSubmit={() => void submitEnquiry()}
      />

      <div className="space-y-6">
        {machines.map((machine) => <MachineTable key={machine.id} machine={machine} onAdd={addLine} />)}
        {searched && !loading && machines.length === 0 && <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-brand">No catalogue matches yet. Try a machine name, application, or part number.</div>}
        {hasMore && <button type="button" disabled={loading} onClick={() => void load(query, brand, page + 1, true)} className="w-full rounded-xl border border-slate-200 bg-white p-4 text-sm font-semibold text-navy hover:border-orange/50 disabled:opacity-50">{loading ? "Loading…" : "Show more machines"}</button>}
      </div>
    </div>
  );
}

function MachineTable({ machine, onAdd }: { machine: MachineResult; onAdd: (machine: MachineResult, referenceId: string, quantity: number) => void }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-orange">{machine.brand}</p>
          <h2 className="mt-1 font-display text-xl font-extrabold text-navy">{machine.displayName}</h2>
        </div>
        {machine.sourcePage && <span className="text-xs text-slate-400">p. {machine.sourcePage}</span>}
      </div>
      <h3 className="mt-5 font-display font-bold text-navy">OEM references ({machine.references.length})</h3>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs uppercase text-slate-400">
              <th className="py-2 pr-4">Application</th>
              <th className="py-2 pr-4">Reference</th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody>
            {machine.references.map((reference) => (
              <ReferenceRow key={reference.id} reference={reference} onAdd={(quantity) => onAdd(machine, reference.id, quantity)} />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ReferenceRow({ reference, onAdd }: { reference: MachineResult["references"][number]; onAdd: (quantity: number) => void }) {
  const [quantity, setQuantity] = useState(1);
  return (
    <tr className="border-b border-slate-100">
      <td className="py-2 pr-4">{reference.application}</td>
      <td className="py-2 pr-4 font-mono text-xs">{reference.oemPartNumber}</td>
      <td className="py-2 text-right">
        <div className="flex items-center justify-end gap-2">
          <input
            type="number"
            min={1}
            value={quantity}
            onChange={(event) => setQuantity(Math.max(1, Math.floor(Number(event.target.value) || 1)))}
            aria-label={`Quantity for ${reference.oemPartNumber}`}
            className="w-16 rounded-md border border-slate-300 px-2 py-1 text-sm outline-none focus:border-orange"
          />
          <button type="button" onClick={() => { onAdd(quantity); setQuantity(1); }} className="rounded-md bg-navy px-3 py-1 text-xs font-semibold text-white hover:bg-navy-800">Add</button>
        </div>
      </td>
    </tr>
  );
}

function EnquiryPanel({
  signedIn,
  lines,
  submissions,
  note,
  onNoteChange,
  busy,
  error,
  onQuantity,
  onRemove,
  onClear,
  onSubmit,
}: {
  signedIn: boolean;
  lines: EnquiryLine[];
  submissions: EnquirySubmission[];
  note: string;
  onNoteChange: (value: string) => void;
  busy: boolean;
  error: string;
  onQuantity: (line: EnquiryLine, quantity: number) => void;
  onRemove: (line: EnquiryLine) => void;
  onClear: () => void;
  onSubmit: () => void;
}) {
  if (!signedIn && lines.length === 0 && !error) return null;
  return (
    <section className="rounded-2xl border border-navy/20 bg-white p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-lg font-extrabold text-navy">OEM enquiry list ({lines.length})</h2>
        {lines.length > 0 && (
          <button type="button" onClick={onClear} disabled={busy} className="text-xs font-semibold text-orange hover:underline disabled:opacity-50">Clear list</button>
        )}
      </div>
      <p className="mt-1 text-xs text-slate-brand">
        {signedIn
          ? "Saved to your account. Duraforge sales check each part before any order is created. No prices shown."
          : "Enquiry only. No prices, no order. Saved in this browser."}
      </p>
      {error && <p role="alert" className="mt-3 text-sm text-orange">{error}</p>}
      {!signedIn && (
        <p className="mt-3 text-sm text-navy">
          <Link href="/account/login?next=/oem-knowledge-base" className="font-semibold text-orange hover:underline">Sign in</Link> to save this list to your account and submit it to Duraforge sales.
        </p>
      )}
      {lines.length > 0 && <EnquiryTable lines={lines} busy={busy} onQuantity={onQuantity} onRemove={onRemove} />}
      {signedIn && lines.length > 0 && (
        <div className="mt-4 space-y-2">
          <textarea
            value={note}
            onChange={(event) => onNoteChange(event.target.value)}
            maxLength={1000}
            rows={2}
            placeholder="Optional note for sales, e.g. needed by Friday"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-orange"
          />
          <button type="button" onClick={onSubmit} disabled={busy} className="rounded-lg bg-orange px-5 py-2.5 text-sm font-semibold text-white hover:bg-orange/90 disabled:opacity-50">
            {busy ? "Working…" : "Submit to sales"}
          </button>
        </div>
      )}
      {signedIn && submissions.length > 0 && <SubmissionList submissions={submissions} />}
    </section>
  );
}

function EnquiryTable({
  lines,
  busy,
  onQuantity,
  onRemove,
}: {
  lines: EnquiryLine[];
  busy: boolean;
  onQuantity: (line: EnquiryLine, quantity: number) => void;
  onRemove: (line: EnquiryLine) => void;
}) {
  return (
    <div className="mt-3 overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-xs uppercase text-slate-400">
            <th className="py-2 pr-4">Machine</th>
            <th className="py-2 pr-4">Application</th>
            <th className="py-2 pr-4">Reference</th>
            <th className="py-2 pr-4">Qty</th>
            <th className="py-2" />
          </tr>
        </thead>
        <tbody>
          {lines.map((line) => (
            <tr key={line.id} className="border-b border-slate-100">
              <td className="py-2 pr-4">{line.machineName}</td>
              <td className="py-2 pr-4">{line.application}</td>
              <td className="py-2 pr-4 font-mono text-xs">{line.oemPartNumber}</td>
              <td className="py-2 pr-4">
                <QuantityInput
                  key={line.quantity}
                  value={line.quantity}
                  label={`Quantity for ${line.oemPartNumber}`}
                  disabled={busy}
                  onCommit={(quantity) => onQuantity(line, quantity)}
                />
              </td>
              <td className="py-2 text-right">
                <button type="button" disabled={busy} onClick={() => onRemove(line)} className="text-xs font-semibold text-slate-brand hover:text-orange disabled:opacity-50">Remove</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Commits on blur or Enter. The parent re-keys this input when the stored quantity changes.
function QuantityInput({ value, label, disabled, onCommit }: { value: number; label: string; disabled: boolean; onCommit: (quantity: number) => void }) {
  return (
    <input
      type="number"
      min={1}
      max={999}
      defaultValue={value}
      disabled={disabled}
      aria-label={label}
      onBlur={(event) => {
        const next = Math.min(999, Math.max(1, Math.floor(Number(event.target.value) || 1)));
        if (next !== value) onCommit(next);
        else event.target.value = String(value);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") event.currentTarget.blur();
      }}
      className="w-20 rounded-md border border-slate-300 px-2 py-1 text-sm outline-none focus:border-orange disabled:opacity-50"
    />
  );
}

function SubmissionList({ submissions }: { submissions: EnquirySubmission[] }) {
  return (
    <div className="mt-6 border-t border-slate-200 pt-4">
      <h3 className="font-display text-sm font-bold text-navy">Previous submissions</h3>
      <ul className="mt-3 space-y-3">
        {submissions.map((submission) => (
          <li key={submission.id} className="rounded-xl border border-slate-200 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="text-slate-brand">
                Submitted {submission.submittedAt && new Date(submission.submittedAt).toLocaleString("en-GB")} · {submission.items.length} line{submission.items.length === 1 ? "" : "s"}
              </span>
              <span className={`rounded-full px-2.5 py-0.5 font-bold ${submission.status === "REVIEWED" ? "bg-emerald-50 text-emerald-700" : "bg-orange/10 text-orange"}`}>
                {submission.status === "REVIEWED" ? "Checked by sales" : "Awaiting sales"}
              </span>
            </div>
            {submission.note && <p className="mt-2 text-xs text-slate-brand">Note: {submission.note}</p>}
            <ul className="mt-2 space-y-1 text-xs">
              {submission.items.map((item) => (
                <li key={item.id}>
                  <span className="font-mono">{item.oemPartNumber}</span> × {item.quantity}{" "}
                  <span className="text-slate-brand">({item.machineName})</span>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
}
