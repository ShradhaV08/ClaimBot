"use client";

import { useMemo, useState } from "react";
import ClaimStatusBadge from "@/components/ClaimStatusBadge";
import {
  CLAIM_CATEGORIES,
  claimCategoryLabel,
  formatClaimAmount,
  formatClaimDate,
  type Claim,
} from "@/lib/claims-ui";

export default function ClaimsList({
  claims,
  loading,
  error,
  compact = false,
}: {
  claims: Claim[];
  loading: boolean;
  error: string;
  compact?: boolean;
}) {
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const visibleClaims = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase();
    return claims.filter((claim) => {
      const matchesStatus = statusFilter === "all" || claim.status === statusFilter;
      const matchesCategory = categoryFilter === "all" || claim.category === categoryFilter;
      const searchableText = `${claim.description} ${claimCategoryLabel(claim.category)} ${claim.category}`.toLocaleLowerCase();
      return matchesStatus && matchesCategory && (!query || searchableText.includes(query));
    });
  }, [claims, statusFilter, categoryFilter, searchQuery]);

  const selectClass =
    "min-h-10 w-full rounded-lg border border-[#dce5dd] bg-white px-3 text-sm text-[#43544a] outline-none transition hover:border-[#b8c9bc] focus:border-[#3b8061] focus:ring-4 focus:ring-[#3b8061]/10 sm:w-auto";
  const hasActiveFilters = statusFilter !== "all" || categoryFilter !== "all" || searchQuery.trim() !== "";

  if (loading && claims.length === 0) {
    return (
      <div aria-live="polite" className="space-y-3 p-5">
        <p className="text-sm text-[#748178]">Loading your claims…</p>
        <div className="h-12 animate-pulse rounded-xl bg-[#f2f5f2]" />
        <div className="h-12 animate-pulse rounded-xl bg-[#f2f5f2]" />
      </div>
    );
  }

  if (error && claims.length === 0) {
    return <p className="p-6 text-sm text-[#8b3d31]">Your claims could not be loaded. Use “Try again” above to retry.</p>;
  }

  if (claims.length === 0) {
    return (
      <div className="px-5 py-12 text-center sm:px-8">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#edf5ee] text-[#367454]">
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 3h14v18l-3-2-4 2-4-2-3 2z" /><path d="M9 8h6M9 12h6" />
          </svg>
        </div>
        <h3 className="mt-4 text-sm font-semibold">No claims yet</h3>
        <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-[#748178]">
          Submitted expenses will appear here, along with their status and policy check.
        </p>
      </div>
    );
  }

  return (
    <>
      {!compact && (
        <div className="flex flex-col gap-3 border-b border-[#edf0ed] p-4 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p aria-live="polite" className="text-sm text-[#748178]">
              Showing <span className="font-semibold text-[#35473f]">{visibleClaims.length}</span> of {claims.length} {claims.length === 1 ? "claim" : "claims"}
            </p>
            <div className="grid grid-cols-2 gap-2 sm:flex">
              <label className="sr-only" htmlFor="claims-search">Search descriptions and categories</label>
              <div className="relative col-span-2 sm:col-span-1">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#829087]"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                >
                  <circle cx="11" cy="11" r="7" />
                  <path d="m16 16 4 4" />
                </svg>
                <input
                  id="claims-search"
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search claims"
                  className="min-h-10 w-full rounded-lg border border-[#dce5dd] bg-white pl-9 pr-3 text-sm text-[#43544a] outline-none transition placeholder:text-[#929e96] hover:border-[#b8c9bc] focus:border-[#3b8061] focus:ring-4 focus:ring-[#3b8061]/10 sm:w-48"
                />
              </div>
              <label className="sr-only" htmlFor="claims-status-filter">Filter by status</label>
              <select id="claims-status-filter" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className={selectClass}>
                <option value="all">All statuses</option>
                <option value="submitted">Submitted</option>
                <option value="flagged">Flagged</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="paid">Paid</option>
              </select>
              <label className="sr-only" htmlFor="claims-category-filter">Filter by category</label>
              <select id="claims-category-filter" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className={selectClass}>
                <option value="all">All categories</option>
                {CLAIM_CATEGORIES.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
              </select>
            </div>
          </div>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={() => {
                setStatusFilter("all");
                setCategoryFilter("all");
                setSearchQuery("");
              }}
              className="min-h-9 self-start rounded-lg px-2 text-sm font-semibold text-[#27624e] transition hover:bg-[#f1f7f2] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#27624e]"
            >
              Reset filters
            </button>
          )}
        </div>
      )}

      {visibleClaims.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-[#748178]">
          No claims match your search and filters. Try adjusting them or reset the filters.
        </p>
      ) : (
        <>
          <div className="hidden overflow-x-auto xl:block">
            <table className="w-full min-w-[740px] border-collapse text-left">
              <thead>
                <tr className="border-b border-[#edf0ed] bg-[#fafbfa] text-xs font-semibold uppercase tracking-wide text-[#7b8980]">
                  <th scope="col" className="px-6 py-3.5">Expense</th>
                  <th scope="col" className="px-4 py-3.5">Expense date</th>
                  {!compact && <th scope="col" className="px-4 py-3.5">Submitted</th>}
                  <th scope="col" className="px-4 py-3.5">Amount</th>
                  <th scope="col" className="px-6 py-3.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#edf0ed]">
                {visibleClaims.map((claim) => (
                  <tr key={claim.id} className="transition hover:bg-[#fbfcfb]">
                    <td className="max-w-[360px] px-6 py-4">
                      <p className="text-sm font-semibold text-[#2a3d32]">{claimCategoryLabel(claim.category)}</p>
                      <p className="mt-1 truncate text-sm text-[#748178]">{claim.description.trim() || "No description provided"}</p>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-sm text-[#56665c]">{formatClaimDate(claim.expense_date)}</td>
                    {!compact && <td className="whitespace-nowrap px-4 py-4 text-sm text-[#56665c]">{formatClaimDate(claim.created_at)}</td>}
                    <td className="whitespace-nowrap px-4 py-4 text-sm font-semibold tabular-nums text-[#293d32]">{formatClaimAmount(claim.amount)}</td>
                    <td className="whitespace-nowrap px-6 py-4"><ClaimStatusBadge status={claim.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="divide-y divide-[#edf0ed] xl:hidden">
            {visibleClaims.map((claim) => (
              <li key={claim.id} className="p-4 sm:px-6">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[#2a3d32]">{claimCategoryLabel(claim.category)}</p>
                    <p className="mt-1 break-words text-sm leading-5 text-[#748178]">{claim.description.trim() || "No description provided"}</p>
                  </div>
                  <p className="shrink-0 text-sm font-semibold tabular-nums text-[#293d32]">{formatClaimAmount(claim.amount)}</p>
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-[#7b8980]">
                    <span>Expense: {formatClaimDate(claim.expense_date)}</span>
                    {!compact && <span>Submitted: {formatClaimDate(claim.created_at)}</span>}
                    {claim.has_receipt && <span>Receipt present</span>}
                  </div>
                  <ClaimStatusBadge status={claim.status} />
                </div>
                {claim.policy_check && claim.status === "flagged" && (
                  <p className="mt-2 text-xs leading-5 text-[#896116]">Policy review: {claim.policy_check}</p>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}
