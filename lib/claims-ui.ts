export const CLAIM_STATUSES = ["submitted", "flagged", "approved", "rejected", "paid"] as const;

export type ClaimStatus = (typeof CLAIM_STATUSES)[number];

export const CLAIM_CATEGORIES = [
  ["local_travel", "Local travel"],
  ["outstation_travel", "Outstation travel"],
  ["hotel_metro", "Hotel · metro"],
  ["hotel_non_metro", "Hotel · non-metro"],
  ["meals", "Meals"],
  ["client_entertainment", "Client entertainment"],
  ["internet", "Internet"],
  ["mobile", "Mobile"],
  ["training", "Training"],
] as const;

export type ClaimCategory = (typeof CLAIM_CATEGORIES)[number][0];

export type Claim = {
  id: number;
  employee_id: string;
  category: string;
  amount: number | string;
  expense_date: string;
  description: string;
  has_receipt: boolean;
  status: ClaimStatus;
  policy_check: string | null;
  created_at: string;
};

const claimStatusSet = new Set<string>(CLAIM_STATUSES);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function isClaimRecord(value: unknown): value is Claim {
  if (!isRecord(value)) return false;
  const amount = value.amount;
  return (
    typeof value.id === "number" &&
    Number.isInteger(value.id) &&
    typeof value.employee_id === "string" &&
    typeof value.category === "string" &&
    (typeof amount === "number" || typeof amount === "string") &&
    Number.isFinite(Number(amount)) &&
    Number(amount) > 0 &&
    typeof value.expense_date === "string" &&
    typeof value.description === "string" &&
    typeof value.has_receipt === "boolean" &&
    typeof value.status === "string" &&
    claimStatusSet.has(value.status) &&
    (typeof value.policy_check === "string" || value.policy_check === null) &&
    typeof value.created_at === "string"
  );
}

export function isClaimsResponse(value: unknown): value is { claims: Claim[] } {
  return isRecord(value) && Array.isArray(value.claims) && value.claims.every(isClaimRecord);
}

export async function readApiJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export function apiErrorMessage(value: unknown, fallback: string): string {
  return isRecord(value) && typeof value.error === "string" && value.error.trim()
    ? value.error
    : fallback;
}

export function claimCategoryLabel(category: string): string {
  if (!category) return "Uncategorized";
  return CLAIM_CATEGORIES.find(([key]) => key === category)?.[1] ?? category.replaceAll("_", " ");
}

export function claimStatusLabel(status: ClaimStatus): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export function formatClaimAmount(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  const amount = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(amount) || amount <= 0) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatClaimDate(value: string | null | undefined): string {
  if (!value) return "—";
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (dateOnly) {
    const [, year, month, day] = dateOnly;
    const parsedDate = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
    if (parsedDate.toISOString().slice(0, 10) !== value) return "—";
  }
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(date);
}
