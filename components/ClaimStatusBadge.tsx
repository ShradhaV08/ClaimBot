import { claimStatusLabel, type ClaimStatus } from "@/lib/claims-ui";

const styles: Record<ClaimStatus, string> = {
  submitted: "border-[#d7e5f1] bg-[#f1f6fb] text-[#41678d]",
  flagged: "border-[#ecdcb9] bg-[#fcf7e9] text-[#896116]",
  approved: "border-[#cfe4d4] bg-[#eff8f0] text-[#2f6d46]",
  rejected: "border-[#edcfca] bg-[#fff4f1] text-[#9a483b]",
  paid: "border-[#d9d2ec] bg-[#f4f1fa] text-[#6b5790]",
};

export default function ClaimStatusBadge({ status }: { status: ClaimStatus }) {
  return (
    <span
      aria-label={`Claim status: ${claimStatusLabel(status)}`}
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold ${styles[status]}`}
    >
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" />
      {claimStatusLabel(status)}
    </span>
  );
}
