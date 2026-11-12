"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import ClaimSubmissionForm from "@/components/ClaimSubmissionForm";
import ClaimsList from "@/components/ClaimsList";
import AgentChat from "@/components/AgentChat";
import { apiErrorMessage, isClaimsResponse, readApiJson, type Claim } from "@/lib/claims-ui";

type View = "overview" | "claims" | "submit" | "assistant";

export default function HomePage() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [view, setView] = useState<View>("overview");
  const [loggingOut, setLoggingOut] = useState(false);

  const loadClaims = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const response = await fetch("/api/claims");
      const payload = await readApiJson(response);
      if (!response.ok) throw new Error(apiErrorMessage(payload, "Could not load claims."));
      if (!isClaimsResponse(payload)) throw new Error("The claims response was not in the expected format.");
      setClaims(payload.claims);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Could not load claims.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadClaims();
  }, [loadClaims]);

  const totals = useMemo(
    () => ({
      total: claims.length,
      submitted: claims.filter((claim) => claim.status === "submitted").length,
      flagged: claims.filter((claim) => claim.status === "flagged").length,
      approved: claims.filter((claim) => claim.status === "approved").length,
    }),
    [claims]
  );

  async function logout() {
    setLoggingOut(true);
    try {
      await fetch("/api/logout", { method: "POST" });
      window.location.href = "/login";
    } finally {
      setLoggingOut(false);
    }
  }

  const pageCopy = {
    overview: { title: "Overview", subtitle: "A clear view of your expense activity." },
    claims: { title: "Claims history", subtitle: "Review and track your submitted expenses." },
    submit: { title: "Submit an expense", subtitle: "Add an expense and we’ll check it against your policy." },
    assistant: { title: "Expense assistant", subtitle: "Get help with claims, policies, and submissions." },
  }[view];

  const summaryCards = [
    { label: "Total claims", value: totals.total, note: "Latest 50 claims", tone: "green", icon: "receipt" },
    { label: "Submitted", value: totals.submitted, note: "Awaiting review", tone: "blue", icon: "clock" },
    { label: "Flagged", value: totals.flagged, note: "Needs attention", tone: "amber", icon: "flag" },
    { label: "Approved", value: totals.approved, note: "Ready for processing", tone: "violet", icon: "check" },
  ] as const;

  return (
    <div className="min-h-screen bg-[#f5f7f4] text-[#182b25]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[252px] flex-col bg-[#173b32] px-5 py-6 text-white md:flex">
        <div className="flex items-center gap-3 px-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#d7f0df] text-sm font-bold tracking-tight text-[#173b32]">
            CE
          </div>
          <div>
            <p className="text-[17px] font-semibold tracking-tight">ClaimEase</p>
            <p className="text-xs text-[#b8cec4]">Expense management</p>
          </div>
        </div>

        <nav aria-label="Main navigation" className="mt-12 space-y-2">
          <NavButton active={view === "overview"} onClick={() => setView("overview")} icon="home">
            Overview
          </NavButton>
          <NavButton active={view === "claims"} onClick={() => setView("claims")} icon="receipt">
            Claims history
          </NavButton>
          <NavButton active={view === "assistant"} onClick={() => setView("assistant")} icon="spark">
            AI assistant
          </NavButton>
        </nav>

        <div className="mt-auto">
          <div className="mb-5 rounded-2xl border border-white/10 bg-white/[0.06] p-4">
            <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-[#d7f0df] text-[#173b32]">
              <SmallIcon type="spark" />
            </div>
            <p className="text-sm font-medium">Your expenses, simplified</p>
            <p className="mt-1 text-xs leading-5 text-[#b8cec4]">
              Submit a claim and track its progress in one place.
            </p>
          </div>
          <button
            type="button"
            onClick={logout}
            disabled={loggingOut}
            className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm text-[#d3e1da] transition hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-60"
          >
            <SmallIcon type="logout" />
            {loggingOut ? "Logging out…" : "Log out"}
          </button>
        </div>
      </aside>

      <div className="min-h-screen md:pl-[252px]">
        <header className="sticky top-0 z-20 border-b border-[#e7ece7] bg-[#f5f7f4]/95 backdrop-blur">
          <div className="mx-auto flex min-h-[72px] max-w-[1440px] items-center justify-between gap-4 px-4 sm:px-7 lg:px-10">
            <div className="flex items-center gap-3 md:hidden">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#173b32] text-xs font-bold text-white">
                CE
              </div>
              <span className="font-semibold tracking-tight">ClaimEase</span>
            </div>
            <div className="hidden md:block">
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-[#718078]">Employee workspace</p>
              <p className="mt-0.5 text-sm font-medium text-[#35473f]">Your account · E001</p>
            </div>
            <div className="ml-auto flex items-center gap-3">
              <span className="hidden text-right sm:block">
                <span className="block text-sm font-semibold">Employee</span>
                <span className="block text-xs text-[#718078]">Demo account · E001</span>
              </span>
              <span
                aria-label="Demo employee E001"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-[#dce6df] bg-white text-xs font-semibold text-[#27624e]"
              >
                E1
              </span>
              <button
                type="button"
                onClick={logout}
                disabled={loggingOut}
                className="min-h-10 rounded-lg px-3 text-sm font-medium text-[#59675f] transition hover:bg-white hover:text-[#173b32] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#27624e] md:hidden"
              >
                {loggingOut ? "…" : "Log out"}
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-[1440px] px-4 pb-28 pt-7 sm:px-7 sm:pt-9 md:pb-10 lg:px-10">
          <div className="mb-7 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="mb-2 text-sm font-medium text-[#478064]">Good to see you</p>
              <h1 className="text-[28px] font-semibold tracking-[-0.035em] text-[#182b25] sm:text-[32px]">
                {pageCopy.title}
              </h1>
              <p className="mt-1.5 text-sm leading-6 text-[#6c7a72]">{pageCopy.subtitle}</p>
            </div>
            {view !== "submit" && (
              <button
                type="button"
                onClick={() => setView("submit")}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#23664d] px-5 text-sm font-semibold text-white shadow-[0_3px_8px_rgba(27,82,60,0.12)] transition hover:bg-[#1d573f] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#23664d]"
              >
                <SmallIcon type="plus" />
                Submit expense
              </button>
            )}
          </div>

          {loading && claims.length > 0 && (
            <p role="status" className="mb-5 text-sm text-[#748178]">
              Refreshing your latest claims…
            </p>
          )}

          {loadError && (
            <div
              role="alert"
              className="mb-6 flex flex-col gap-3 rounded-xl border border-[#f1c8c0] bg-[#fff7f5] p-4 text-sm text-[#8b3d31] sm:flex-row sm:items-center sm:justify-between"
            >
              <span>{loadError}</span>
              <button
                type="button"
                onClick={() => void loadClaims()}
                className="min-h-9 self-start rounded-lg px-3 font-semibold underline underline-offset-2 hover:text-[#6f2d24] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8b3d31] sm:self-auto"
              >
                Try again
              </button>
            </div>
          )}

          {view === "overview" && (
            <>
              <section aria-label="Claim summary" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {summaryCards.map((card) => (
                  <SummaryCard
                    key={card.label}
                    label={card.label}
                    value={loading || loadError ? "—" : card.value}
                    note={card.note}
                    tone={card.tone}
                    icon={card.icon}
                  />
                ))}
              </section>

              <section className="mt-7 overflow-hidden rounded-2xl border border-[#e5ebe5] bg-white shadow-[0_2px_8px_rgba(20,46,34,0.035)]">
                <div className="flex flex-col gap-3 border-b border-[#edf0ed] px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                  <div>
                    <h2 className="text-base font-semibold">Recent claims</h2>
                    <p className="mt-1 text-sm text-[#748178]">Your latest expense activity</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setView("claims")}
                    className="min-h-10 self-start rounded-lg px-2 text-sm font-semibold text-[#27624e] transition hover:bg-[#f1f7f2] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#27624e]"
                  >
                    View all claims
                  </button>
                </div>
                <ClaimsList claims={claims.slice(0, 5)} loading={loading} error={loadError} compact />
              </section>
              <p className="mt-3 text-right text-xs text-[#839087]">Summary is based on the latest 50 claims returned by the service.</p>
            </>
          )}

          {view === "claims" && (
            <section className="overflow-hidden rounded-2xl border border-[#e5ebe5] bg-white shadow-[0_2px_8px_rgba(20,46,34,0.035)]">
              <div className="border-b border-[#edf0ed] px-5 py-5 sm:px-6">
                <h2 className="text-base font-semibold">All claims</h2>
                <p className="mt-1 text-sm text-[#748178]">Filter and review your recent submissions.</p>
              </div>
              <ClaimsList claims={claims} loading={loading} error={loadError} />
            </section>
          )}

          {view === "submit" && (
            <ClaimSubmissionForm
              onCancel={() => setView("overview")}
              onNavigate={setView}
              onSubmitted={loadClaims}
            />
          )}

          {view === "assistant" && (
            <section aria-label="ClaimEase AI expense assistant" className="mx-auto max-w-3xl">
              <AgentChat onDataChanged={() => void loadClaims()} />
            </section>
          )}
        </main>
      </div>

      <nav
        aria-label="Mobile navigation"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-[#e2e9e3] bg-white/95 px-3 pb-2 pt-2 shadow-[0_-4px_18px_rgba(20,46,34,0.06)] backdrop-blur md:hidden"
      >
        <div className="mx-auto grid max-w-lg grid-cols-4 gap-1">
          <MobileNavButton active={view === "overview"} onClick={() => setView("overview")} icon="home">
            Overview
          </MobileNavButton>
          <MobileNavButton active={view === "claims"} onClick={() => setView("claims")} icon="receipt">
            Claims
          </MobileNavButton>
          <MobileNavButton active={view === "assistant"} onClick={() => setView("assistant")} icon="spark">
            Assistant
          </MobileNavButton>
          <MobileNavButton active={view === "submit"} onClick={() => setView("submit")} icon="plus">
            Submit
          </MobileNavButton>
        </div>
      </nav>
    </div>
  );
}

function NavButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: IconType;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-current={active ? "page" : undefined}
      onClick={onClick}
      className={`flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
        active ? "bg-white text-[#173b32] shadow-sm" : "text-[#d1e0d8] hover:bg-white/10 hover:text-white"
      }`}
    >
      <SmallIcon type={icon} />
      {children}
    </button>
  );
}

function MobileNavButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: IconType;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-current={active ? "page" : undefined}
      onClick={onClick}
      className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#27624e] ${
        active ? "text-[#23664d]" : "text-[#758179] hover:bg-[#f5f8f5]"
      }`}
    >
      <SmallIcon type={icon} />
      {children}
    </button>
  );
}

function SummaryCard({
  label,
  value,
  note,
  tone,
  icon,
}: {
  label: string;
  value: number | string;
  note: string;
  tone: "green" | "blue" | "amber" | "violet";
  icon: IconType;
}) {
  const colors = {
    green: "bg-[#eaf5ee] text-[#2f7657]",
    blue: "bg-[#edf3fa] text-[#4c6f98]",
    amber: "bg-[#fbf2df] text-[#9a6a20]",
    violet: "bg-[#f1eef8] text-[#715b99]",
  }[tone];

  return (
    <div className="rounded-2xl border border-[#e5ebe5] bg-white p-5 shadow-[0_2px_8px_rgba(20,46,34,0.035)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-[#65736a]">{label}</p>
          <p className="mt-3 text-[30px] font-semibold leading-none tracking-[-0.04em] tabular-nums text-[#1c3028]">
            {value}
          </p>
        </div>
        <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${colors}`}>
          <SmallIcon type={icon} />
        </span>
      </div>
      <p className="mt-3 text-xs text-[#829087]">{note}</p>
    </div>
  );
}

type IconType = "home" | "receipt" | "clock" | "flag" | "check" | "spark" | "logout" | "plus";

function SmallIcon({ type }: { type: IconType }) {
  const paths: Record<IconType, React.ReactNode> = {
    home: <><path d="m3 10 9-7 9 7" /><path d="M5 9v11h14V9M9 20v-6h6v6" /></>,
    receipt: <><path d="M5 3h14v18l-3-2-4 2-4-2-3 2z" /><path d="M9 8h6M9 12h6M9 16h2" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    flag: <><path d="M5 21V4" /><path d="M5 4c5-4 9 4 14 0v11c-5 4-9-4-14 0" /></>,
    check: <><path d="m5 12 4 4L19 6" /><circle cx="12" cy="12" r="9" /></>,
    spark: <><path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" /><path d="m19 16 .8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z" /></>,
    logout: <><path d="M10 17l5-5-5-5M15 12H3" /><path d="M12 3h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-7" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
  };

  return (
    <svg
      aria-hidden="true"
      className="h-[18px] w-[18px] shrink-0"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[type]}
    </svg>
  );
}
