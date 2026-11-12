import "server-only";

type ClaimPolicy = {
  max_amount: number;
  receipt_required_above: number;
};

type ClaimPolicyResult =
  | { error: string }
  | { status: "submitted" | "flagged"; policy_check: string };

export function getExpenseDateError(expenseDate: string, today: string): string | null {
  if (expenseDate > today) return "Expense date cannot be in the future.";

  const [year, month, day] = today.split("-").map(Number);
  const oldestAllowedDate = new Date(Date.UTC(year, month - 1, day - 60))
    .toISOString()
    .slice(0, 10);
  if (expenseDate < oldestAllowedDate) return "Expenses older than 60 days cannot be submitted.";

  return null;
}

export function evaluateClaimPolicy(input: {
  amount: number;
  category: string;
  grade: string;
  has_receipt: boolean;
  policy: ClaimPolicy;
}): ClaimPolicyResult {
  const { amount, category, grade, has_receipt, policy } = input;

  if (amount > policy.receipt_required_above && !has_receipt) {
    return {
      error: `A receipt is required for ${category} claims above ${policy.receipt_required_above}.`,
    };
  }

  const overLimit = amount > policy.max_amount;
  return {
    status: overLimit ? "flagged" : "submitted",
    policy_check: overLimit
      ? `Above ${grade} limit of ${policy.max_amount} for ${category}`
      : "Within policy",
  };
}
