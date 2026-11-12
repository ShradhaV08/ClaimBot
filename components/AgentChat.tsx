"use client";

import { useEffect, useRef, useState } from "react";
import type { AgentResult, AgentStep } from "@/lib/agent/types";
import { apiErrorMessage } from "@/lib/claims-ui";

type Message = { role: "user" | "model"; text: string; steps?: AgentStep[] };

const SAMPLE_PROMPTS = [
  "Show me my expense claims.",
  "What is my remaining expense policy limit?",
  "What is the receipt requirement for travel expenses?",
  "Help me submit a new expense claim.",
];

export default function AgentChat({ onDataChanged }: { onDataChanged?: () => void }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    const next: Message[] = [...messages, { role: "user", text: trimmed }];
    setMessages(next);
    setInput("");
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Only the last 20 messages are sent, to keep requests small.
        body: JSON.stringify({ messages: next.slice(-20).map(({ role, text }) => ({ role, text })) }),
      });
      const data: unknown = await res.json().catch(() => null);
      if (!res.ok) throw new Error(apiErrorMessage(data, "Could not reach the expense assistant."));
      if (!isAgentResult(data)) {
        throw new Error("The expense assistant returned an unexpected response. Please try again.");
      }
      const result = data;
      setMessages([...next, { role: "model", text: result.reply, steps: result.steps }]);
      if (result.steps.some((s) => s.writes && s.ok)) onDataChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-[70vh] flex-col rounded-2xl border border-[#e5ebe5] bg-white shadow-[0_2px_8px_rgba(20,46,34,0.035)]">
      <div className="border-b border-[#edf0ed] px-4 py-3">
        <h2 className="font-semibold text-[#1d3028]">ClaimEase AI</h2>
        <p className="text-xs text-[#748178]">Your expense assistant for claims, policy questions, and submissions.</p>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="space-y-2">
            <p className="text-sm text-[#748178]">How can I help with your expenses?</p>
            {SAMPLE_PROMPTS.map((p) => (
              <button
                key={p}
                onClick={() => send(p)}
                className="block min-h-11 w-full rounded-xl border border-[#e5ebe5] px-3 py-2 text-left text-sm text-[#405349] transition hover:border-[#c5d8ca] hover:bg-[#f7faf7] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3b8061]"
              >
                {p}
              </button>
            ))}
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <div
              className={
                m.role === "user"
                  ? "max-w-[85%] rounded-2xl bg-[#23664d] px-3 py-2 text-sm text-white"
                  : "max-w-[85%] space-y-2"
              }
            >
              {m.steps && m.steps.length > 0 && <ToolSteps steps={m.steps} />}
              {m.role === "model" ? (
                <div className="whitespace-pre-wrap rounded-2xl bg-[#f2f6f2] px-3 py-2 text-sm text-[#34473c]">
                  {m.text}
                </div>
              ) : (
                m.text
              )}
            </div>
          </div>
        ))}

        {loading && <p role="status" className="text-sm text-[#748178]">ClaimEase is reviewing your request…</p>}
        {error && <p role="alert" className="text-sm text-[#a33f33]">{error}</p>}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex gap-2 border-t border-[#edf0ed] p-3"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about an expense claim or policy..."
          aria-label="Message ClaimEase AI"
          className="min-w-0 flex-1 rounded-xl border border-[#dce5dd] px-3 py-2 text-sm text-[#23372e] outline-none transition placeholder:text-[#929e96] hover:border-[#b8c9bc] focus:border-[#3b8061] focus:ring-4 focus:ring-[#3b8061]/10"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="min-h-10 rounded-xl bg-[#23664d] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1d573f] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#23664d] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  );
}

function isAgentResult(value: unknown): value is AgentResult {
  if (typeof value !== "object" || value === null || !("reply" in value) || !("steps" in value)) {
    return false;
  }
  const result = value as { reply: unknown; steps: unknown };
  return (
    typeof result.reply === "string" &&
    Array.isArray(result.steps) &&
    result.steps.every(
      (step) =>
        typeof step === "object" &&
        step !== null &&
        "tool" in step &&
        typeof step.tool === "string" &&
        "ok" in step &&
        typeof step.ok === "boolean" &&
        "writes" in step &&
        typeof step.writes === "boolean"
    )
  );
}

/** Shows each tool call so users (and judges) can see what the agent did. */
function ToolSteps({ steps }: { steps: AgentStep[] }) {
  return (
    <div className="space-y-1">
      {steps.map((s, i) => (
        <details key={i} className="rounded-lg border border-[#e5ebe5] bg-[#f7f9f7] px-3 py-1.5 text-xs">
          <summary className="cursor-pointer select-none rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3b8061]">
            <span className={s.ok ? "text-[#2f6d46]" : "text-[#a33f33]"}>{s.ok ? "Done" : "Failed"}</span>
            {" · "}
            <span className="font-mono font-medium text-[#405349]">{s.tool}</span>
            {s.writes && <span className="ml-2 rounded bg-[#fbf2df] px-1.5 py-0.5 text-[#896116]">writes data</span>}
          </summary>
          <pre className="mt-1 overflow-x-auto whitespace-pre-wrap text-[#64736a]">
            {JSON.stringify({ args: s.args, ...(s.ok ? { result: s.result } : { error: s.error }) }, null, 2)}
          </pre>
        </details>
      ))}
    </div>
  );
}
