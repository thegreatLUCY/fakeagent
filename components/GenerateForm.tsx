"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ChaosLevel } from "@/lib/types";

const CHAOS_OPTIONS: Array<{
  value: ChaosLevel;
  label: string;
  description: string;
}> = [
  {
    value: "realistic",
    label: "Realistic",
    description: "Believable build. Smaller stack. Calmer collapse."
  },
  {
    value: "startup",
    label: "Startup Mode",
    description: "Seed-stage overconfidence. Unnecessary agents. Cost warnings."
  },
  {
    value: "enterprise",
    label: "Enterprise Nightmare",
    description: "Kubernetes, GPUs, vector DB, SOC2, cloud bill explosion."
  }
];

const STACK_OPTIONS = [
  "React",
  "Next.js",
  "Vue",
  "Svelte",
  "TypeScript",
  "Tailwind",
  "Supabase",
  "Postgres",
  "Prisma",
  "Redis",
  "MongoDB",
  "Docker",
  "Kubernetes",
  "Vercel",
  "AWS",
  "tRPC",
  "GraphQL",
  "Stripe",
  "Clerk",
  "OpenAI",
  "Groq",
  "LangChain",
  "Vector DB",
  "Kafka"
];

export default function GenerateForm() {
  const router = useRouter();
  const [appIdea, setAppIdea] = useState("");
  const [selectedStack, setSelectedStack] = useState<string[]>([]);
  const [customStack, setCustomStack] = useState("");
  const [chaos, setChaos] = useState<ChaosLevel>("enterprise");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const disabled = submitting || appIdea.trim().length < 2;

  const combinedStack = useMemo(() => {
    const extras = customStack
      .split(/[,;]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    return [...selectedStack, ...extras].join(", ");
  }, [selectedStack, customStack]);

  function toggleStack(item: string) {
    setSelectedStack((prev) =>
      prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item]
    );
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (disabled) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          appIdea: appIdea.trim(),
          suggestedStack: combinedStack,
          chaosLevel: chaos
        })
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Request failed" }));
        throw new Error(body.error ?? `Request failed (${res.status})`);
      }
      const body = await res.json();
      if (typeof body.id !== "string") throw new Error("Malformed response");
      router.push(`/watch/${body.id}`);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Generation failed");
      setSubmitting(false);
    }
  }

  return (
    <main className="generate-shell">
      <div className="generate-card">
        <h1>AI-dev-agent</h1>
        <p className="tagline">
          Type a tiny app idea. Watch a confident AI agent overengineer it into a
          cloud-native incident. Share the recording.
        </p>

        <form className="generate-form" onSubmit={onSubmit}>
          <label>
            App idea
            <span className="hint">Example: a dog walking scheduler</span>
            <input
              type="text"
              value={appIdea}
              onChange={(e) => setAppIdea(e.target.value)}
              maxLength={200}
              autoFocus
              required
            />
          </label>

          <div>
            <span className="section-label">
              Suggested stack <span className="section-hint">(pick any)</span>
            </span>
            <div className="stack-chip-row" role="group" aria-label="Suggested stack">
              {STACK_OPTIONS.map((item) => (
                <button
                  key={item}
                  type="button"
                  className={`stack-chip${selectedStack.includes(item) ? " selected" : ""}`}
                  aria-pressed={selectedStack.includes(item)}
                  onClick={() => toggleStack(item)}
                >
                  {item}
                </button>
              ))}
            </div>
            <input
              type="text"
              className="stack-custom"
              value={customStack}
              onChange={(e) => setCustomStack(e.target.value)}
              placeholder="or type your own, comma-separated"
              maxLength={200}
            />
          </div>

          <div>
            <span className="section-label">Chaos level</span>
            <div className="chaos-row" role="radiogroup" aria-label="Chaos level">
              {CHAOS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  role="radio"
                  aria-checked={chaos === opt.value}
                  className={chaos === opt.value ? "selected" : ""}
                  onClick={() => setChaos(opt.value)}
                >
                  <strong>{opt.label}</strong>
                  <span className="chaos-desc">{opt.description}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="submit-row">
            <a className="demo-link" href="/demo">
              or watch a prebuilt demo →
            </a>
            <button type="submit" className="primary-button" disabled={disabled}>
              {submitting ? "Generating…" : "Run"}
            </button>
          </div>

          {error && <div className="error-banner">{error}</div>}
        </form>
      </div>
    </main>
  );
}
