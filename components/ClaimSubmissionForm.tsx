"use client";

import { useRef, useState } from "react";
import ClaimStatusBadge from "@/components/ClaimStatusBadge";
import {
  CLAIM_CATEGORIES,
  apiErrorMessage,
  claimStatusLabel,
  isClaimRecord,
  readApiJson,
  type Claim,
  type ClaimCategory,
} from "@/lib/claims-ui";

type FormValues = {
  category: ClaimCategory | "";
  amount: string;
  expense_date: string;
  description: string;
  has_receipt: boolean;
};

type ClaimFormField = keyof FormValues;
type FieldErrors = Partial<Record<ClaimFormField, string>>;
type ClaimNavigationTarget = "overview" | "claims";
const FIELD_IDS: Record<ClaimFormField, string> = {
  category: "claim-category",
  amount: "claim-amount",
  expense_date: "claim-date",
  description: "claim-description",
  has_receipt: "claim-receipt",
};

function getTodayInIndia(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
}

function daysBefore(date: string, days: number): string {
  const [year, month, day] = date.split("-").map(Number);
  const result = new Date(Date.UTC(year, month - 1, day - days));
  return result.toISOString().slice(0, 10);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getFieldErrors(payload: unknown): FieldErrors {
  if (!isRecord(payload) || !Array.isArray(payload.details)) return {};

  const fieldNames: ClaimFormField[] = ["category", "amount", "expense_date", "description", "has_receipt"];
  const errors: FieldErrors = {};
  for (const issue of payload.details) {
    if (!isRecord(issue) || !Array.isArray(issue.path) || typeof issue.message !== "string") continue;
    const field = issue.path[0];
    if (typeof field === "string" && fieldNames.includes(field as ClaimFormField)) {
      const typedField = field as ClaimFormField;
      errors[typedField] ??= issue.message;
    }
  }
  return errors;
}

function getBusinessField(message: string): ClaimFormField | undefined {
  const normalized = message.toLowerCase();
  if (normalized.includes("expense date") || normalized.includes("expenses older than 60 days")) {
    return "expense_date";
  }
  if (normalized.includes("receipt is required")) return "has_receipt";
  return undefined;
}

function validateForm(values: FormValues): FieldErrors {
  const errors: FieldErrors = {};
  if (!values.category) errors.category = "Choose an expense category.";
  if (!values.amount.trim()) {
    errors.amount = "Enter the expense amount.";
  } else if (!Number.isFinite(Number(values.amount)) || Number(values.amount) <= 0) {
    errors.amount = "Enter an amount greater than zero.";
  }
  if (!values.expense_date) errors.expense_date = "Choose the date of the expense.";
  if (!values.description.trim()) errors.description = "Add a short description.";
  return errors;
}

function focusFirstFieldError(errors: FieldErrors) {
  const firstInvalidField = (Object.keys(FIELD_IDS) as ClaimFormField[]).find((field) => errors[field]);
  if (firstInvalidField) document.getElementById(FIELD_IDS[firstInvalidField])?.focus();
}

export default function ClaimSubmissionForm({
  onCancel,
  onNavigate,
  onSubmitted,
}: {
  onCancel: () => void;
  onNavigate: (target: ClaimNavigationTarget) => void;
  onSubmitted: (claim: Claim) => Promise<void>;
}) {
  const today = getTodayInIndia();
  const [values, setValues] = useState<FormValues>({
    category: "",
    amount: "",
    expense_date: today,
    description: "",
    has_receipt: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [success, setSuccess] = useState<Claim | null>(null);
  const [refreshWarning, setRefreshWarning] = useState("");
  const submissionInProgress = useRef(false);

  function updateField<Field extends ClaimFormField>(field: Field, value: FormValues[Field]) {
    setValues((current) => ({ ...current, [field]: value }));
    setSuccess(null);
    setFieldErrors((current) => {
      const next = { ...current };
      delete next[field];
      return next;
    });
    setError("");
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submissionInProgress.current) return;
    setSuccess(null);
    setRefreshWarning("");

    const validationErrors = validateForm(values);
    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors);
      setError("Please correct the highlighted fields.");
      focusFirstFieldError(validationErrors);
      return;
    }

    submissionInProgress.current = true;
    setSubmitting(true);
    setError("");
    setFieldErrors({});
    setRefreshWarning("");
    setSuccess(null);
    try {
      const response = await fetch("/api/claims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: values.category,
          amount: Number(values.amount),
          expense_date: values.expense_date,
          description: values.description,
          has_receipt: values.has_receipt,
        }),
      });
      const payload = await readApiJson(response);
      if (!response.ok) {
        const message = apiErrorMessage(payload, "Could not submit this expense. Check your connection and try again.");
        const responseFieldErrors = getFieldErrors(payload);
        const businessField = getBusinessField(message);
        if (businessField && !responseFieldErrors[businessField]) {
          responseFieldErrors[businessField] = message;
        }
        setFieldErrors(responseFieldErrors);
        setError(message);
        focusFirstFieldError(responseFieldErrors);
        return;
      }

      if (!isRecord(payload) || !isClaimRecord(payload.claim)) {
        setError("The server response did not contain a valid claim. Your form has been kept; please check your claims before retrying.");
        return;
      }

      const claim = payload.claim;
      setSuccess(claim);
      setValues({ category: "", amount: "", expense_date: today, description: "", has_receipt: false });
      try {
        await onSubmitted(claim);
      } catch {
        setRefreshWarning("Your claim was submitted, but the latest claims could not be refreshed. You can retry from Overview or Claims History.");
      }
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? `Could not submit this expense: ${submitError.message}`
          : "Could not submit this expense. Check your connection and try again."
      );
    } finally {
      submissionInProgress.current = false;
      setSubmitting(false);
    }
  }

  const inputClass = (invalid = false) =>
    `mt-2 min-h-12 w-full rounded-xl border bg-white px-3.5 text-sm text-[#23372e] outline-none transition placeholder:text-[#9aa69e] focus:ring-4 ${
      invalid
        ? "border-[#bd594c] focus:border-[#bd594c] focus:ring-[#bd594c]/10"
        : "border-[#dce5dd] hover:border-[#b8c9bc] focus:border-[#3b8061] focus:ring-[#3b8061]/10"
    }`;
  const labelClass = "text-sm font-semibold text-[#33463b]";

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(260px,0.75fr)]">
      <section className="rounded-2xl border border-[#e5ebe5] bg-white p-5 shadow-[0_2px_8px_rgba(20,46,34,0.035)] sm:p-7">
        <div className="mb-6">
          <h2 className="text-base font-semibold">Expense details</h2>
          <p className="mt-1 text-sm leading-6 text-[#748178]">
            Add the details as they appear on your receipt or bill.
          </p>
        </div>

        {error && (
          <div role="alert" className="mb-5 rounded-xl border border-[#f1c8c0] bg-[#fff7f5] px-4 py-3 text-sm leading-6 text-[#8b3d31]">
            {error}
          </div>
        )}
        {refreshWarning && (
          <div role="status" className="mb-5 rounded-xl border border-[#ecdcb9] bg-[#fcf7e9] px-4 py-3 text-sm leading-6 text-[#765519]">
            {refreshWarning}
          </div>
        )}
        {success && (
          <div role="status" className="mb-5 rounded-xl border border-[#cce5d2] bg-[#f1f9f2] px-4 py-4 text-sm leading-6 text-[#285c3e]">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold">
                {success.status === "flagged"
                  ? "Claim submitted for review."
                  : success.status === "submitted"
                    ? "Expense submitted successfully."
                    : `Claim status: ${claimStatusLabel(success.status)}.`}
              </p>
              <ClaimStatusBadge status={success.status} />
            </div>
            <p className="mt-1">Claim #{success.id}</p>
            <p className="mt-1">
              Policy check: {success.policy_check ?? "No policy check was returned."}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onNavigate("overview")}
                className="min-h-10 rounded-lg bg-[#23664d] px-3.5 text-sm font-semibold text-white transition hover:bg-[#1d573f] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#23664d]"
              >
                Go to Overview
              </button>
              <button
                type="button"
                onClick={() => onNavigate("claims")}
                className="min-h-10 rounded-lg border border-[#b8d5c0] bg-white px-3.5 text-sm font-semibold text-[#27624e] transition hover:bg-[#f5faf5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#27624e]"
              >
                View Claims History
              </button>
            </div>
          </div>
        )}

        <form noValidate onSubmit={submit} className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="claim-category" className={labelClass}>Expense category</label>
              <select
                id="claim-category"
                required
                value={values.category}
                aria-invalid={Boolean(fieldErrors.category)}
                aria-describedby={fieldErrors.category ? "claim-category-error" : undefined}
                onChange={(event) => updateField("category", event.target.value as ClaimCategory | "")}
                className={inputClass(Boolean(fieldErrors.category))}
              >
                <option value="" disabled>Select a category</option>
                {CLAIM_CATEGORIES.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
              <FieldError id="claim-category-error" message={fieldErrors.category} />
            </div>
            <div>
              <label htmlFor="claim-amount" className={labelClass}>Amount</label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3.5 top-[26px] text-sm text-[#718078]">₹</span>
                <input
                  id="claim-amount"
                  required
                  type="number"
                  min="0.01"
                  step="0.01"
                  inputMode="decimal"
                  value={values.amount}
                  aria-invalid={Boolean(fieldErrors.amount)}
                  aria-describedby={fieldErrors.amount ? "claim-amount-error" : "claim-amount-help"}
                  onChange={(event) => updateField("amount", event.target.value)}
                  placeholder="0.00"
                  className={`${inputClass(Boolean(fieldErrors.amount))} pl-8`}
                />
              </div>
              <FieldError id="claim-amount-error" message={fieldErrors.amount} />
              {!fieldErrors.amount && <p id="claim-amount-help" className="mt-1.5 text-xs text-[#849088]">Enter the amount in Indian rupees.</p>}
            </div>
            <div>
              <label htmlFor="claim-date" className={labelClass}>Expense date</label>
              <input
                id="claim-date"
                required
                type="date"
                min={daysBefore(today, 60)}
                max={today}
                value={values.expense_date}
                aria-invalid={Boolean(fieldErrors.expense_date)}
                aria-describedby={fieldErrors.expense_date ? "claim-date-error" : "claim-date-help"}
                onChange={(event) => updateField("expense_date", event.target.value)}
                className={inputClass(Boolean(fieldErrors.expense_date))}
              />
              <FieldError id="claim-date-error" message={fieldErrors.expense_date} />
              {!fieldErrors.expense_date && <p id="claim-date-help" className="mt-1.5 text-xs text-[#849088]">Submit expenses within 60 days.</p>}
            </div>
            <div className="flex flex-col justify-end">
              <label className={`flex min-h-12 w-full cursor-pointer items-center gap-3 rounded-xl border px-3.5 transition hover:bg-[#fbfcfb] focus-within:ring-4 focus-within:ring-[#3b8061]/10 ${
                fieldErrors.has_receipt ? "border-[#bd594c]" : "border-[#dce5dd] hover:border-[#b8c9bc]"
              }`}>
                <input
                  id="claim-receipt"
                  type="checkbox"
                  checked={values.has_receipt}
                  aria-invalid={Boolean(fieldErrors.has_receipt)}
                  aria-describedby={fieldErrors.has_receipt ? "claim-receipt-error" : undefined}
                  onChange={(event) => updateField("has_receipt", event.target.checked)}
                  className="h-4 w-4 rounded border-[#b7c5ba] accent-[#23664d] focus:ring-[#3b8061]"
                />
                <span>
                  <span className="block text-sm font-semibold text-[#33463b]">I have a receipt</span>
                  <span className="block text-xs text-[#849088]">Required for some expense types</span>
                </span>
              </label>
              <FieldError id="claim-receipt-error" message={fieldErrors.has_receipt} />
            </div>
          </div>

          <div>
            <label htmlFor="claim-description" className={labelClass}>Description</label>
            <textarea
              id="claim-description"
              required
              rows={4}
              value={values.description}
              aria-invalid={Boolean(fieldErrors.description)}
              aria-describedby={fieldErrors.description ? "claim-description-error" : "claim-description-help"}
              onChange={(event) => updateField("description", event.target.value)}
              placeholder="What was this expense for?"
              className={`mt-2 w-full resize-y rounded-xl border bg-white px-3.5 py-3 text-sm text-[#23372e] outline-none transition placeholder:text-[#9aa69e] focus:ring-4 ${
                fieldErrors.description
                  ? "border-[#bd594c] focus:border-[#bd594c] focus:ring-[#bd594c]/10"
                  : "border-[#dce5dd] hover:border-[#b8c9bc] focus:border-[#3b8061] focus:ring-[#3b8061]/10"
              }`}
            />
            <FieldError id="claim-description-error" message={fieldErrors.description} />
            {!fieldErrors.description && <p id="claim-description-help" className="mt-1.5 text-xs text-[#849088]">A short description helps your reviewer understand the expense.</p>}
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-[#edf0ed] pt-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onCancel}
              disabled={submitting}
              className="min-h-12 rounded-xl border border-[#dce5dd] px-5 text-sm font-semibold text-[#536259] transition hover:bg-[#f7f9f7] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#27624e] disabled:opacity-60"
            >
              {success ? "Back to overview" : "Cancel"}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="min-h-12 rounded-xl bg-[#23664d] px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1d573f] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#23664d] disabled:cursor-wait disabled:opacity-60"
            >
              {submitting ? "Submitting…" : "Submit expense"}
            </button>
          </div>
        </form>
      </section>

      <aside className="h-fit rounded-2xl border border-[#dfe9df] bg-[#edf5ee] p-5 sm:p-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[#367454] shadow-sm">
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3 4.5 6v5.5c0 4.6 3.2 7.7 7.5 9.5 4.3-1.8 7.5-4.9 7.5-9.5V6z" />
            <path d="m9 12 2 2 4-4" />
          </svg>
        </div>
        <h3 className="mt-4 text-sm font-semibold text-[#294334]">Before you submit</h3>
        <ul className="mt-3 space-y-3 text-sm leading-5 text-[#5b7061]">
          <li className="flex gap-2.5"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#4b8a63]" />Expenses must be from the last 60 days.</li>
          <li className="flex gap-2.5"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#4b8a63]" />A claim above your category limit may be flagged for review.</li>
          <li className="flex gap-2.5"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#4b8a63]" />Some categories require a receipt above a set amount.</li>
        </ul>
        <p className="mt-5 border-t border-[#d9e6d9] pt-4 text-xs leading-5 text-[#718575]">
          Policy checks are applied automatically when you submit. A flagged claim is saved for review, not rejected.
        </p>
      </aside>
    </div>
  );
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="mt-1.5 text-xs font-medium leading-5 text-[#a33f33]">
      {message}
    </p>
  );
}
