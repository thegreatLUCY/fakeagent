"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ChaosLevel } from "@/lib/types";

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

const AUTO_REC: Record<ChaosLevel, string[]> = {
  realistic: ["Next.js", "Postgres", "Vercel"],
  startup: ["Next.js", "Supabase", "OpenAI", "Vercel", "Clerk"],
  enterprise: [
    "Next.js",
    "TypeScript",
    "Tailwind",
    "Postgres",
    "Redis",
    "Docker",
    "Kubernetes",
    "AWS",
    "tRPC",
    "OpenAI",
    "LangChain",
    "Vector DB",
    "Kafka"
  ]
};

const DEPRECATED = new Set(["Vue"]);

const CHAOS_OPTIONS: Array<{
  value: ChaosLevel;
  label: string;
  desc: string;
  warn: string | null;
}> = [
  {
    value: "realistic",
    label: "Realistic",
    desc: "Believable build. Smaller stack. Calmer collapse.",
    warn: null
  },
  {
    value: "startup",
    label: "Startup Mode",
    desc: "Seed-stage overconfidence. Unnecessary agents. Cost warnings.",
    warn: "⚠ expect 1 cofounder argument"
  },
  {
    value: "enterprise",
    label: "Enterprise Nightmare",
    desc: "Kubernetes, GPUs, vector DB, SOC2, cloud bill explosion.",
    warn: "⚠ your CFO will be paged"
  }
];

interface ForecastPercentages {
  cascading: number;
  oom: number;
  forgottenEnv: number;
  happyPath: number;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

export default function GenerateForm() {
  const router = useRouter();
  const [appIdea, setAppIdea] = useState("");
  const [chaos, setChaos] = useState<ChaosLevel>("enterprise");
  const [selectedStack, setSelectedStack] = useState<string[]>([]);
  const [customStack, setCustomStack] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forecast, setForecast] = useState<ForecastPercentages>({
    cascading: 87,
    oom: 71,
    forgottenEnv: 94,
    happyPath: 3
  });

  // jitter the "Will probably break" percentages every ~2s
  useEffect(() => {
    const id = window.setInterval(() => {
      setForecast((p) => ({
        cascading: clamp(p.cascading + (Math.random() < 0.5 ? -1 : 1), 80, 92),
        oom: clamp(p.oom + (Math.random() < 0.5 ? -1 : 1), 65, 77),
        forgottenEnv: clamp(p.forgottenEnv + (Math.random() < 0.5 ? -1 : 1), 90, 98),
        happyPath: clamp(p.happyPath + (Math.random() < 0.5 ? -1 : 1), 1, 7)
      }));
    }, 2000);
    return () => window.clearInterval(id);
  }, []);

  const autoStack = AUTO_REC[chaos];

  const effectiveStack = useMemo(() => {
    const customs = customStack
      .split(/[,;]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    return Array.from(new Set([...autoStack, ...selectedStack, ...customs]));
  }, [autoStack, selectedStack, customStack]);

  const fakeMetrics = useMemo(() => {
    const base = effectiveStack.length;
    const agentsByChaos: Record<ChaosLevel, number> = {
      realistic: 1,
      startup: 3,
      enterprise: 7
    };
    const costByChaos: Record<ChaosLevel, number> = {
      realistic: 42,
      startup: 487,
      enterprise: 14820
    };
    const etaByChaos: Record<ChaosLevel, number> = {
      realistic: 8,
      startup: 14,
      enterprise: 23
    };
    return {
      agents: agentsByChaos[chaos] + Math.floor(base / 5),
      services: base + (chaos === "enterprise" ? 4 : 0),
      cost: costByChaos[chaos] + base * 19,
      eta: etaByChaos[chaos],
      postmortems: chaos === "enterprise" ? Math.max(1, Math.floor(base / 3)) : 0,
      confidence:
        chaos === "enterprise"
          ? "99.7%"
          : chaos === "startup"
            ? "94.0%"
            : "82.1%"
    };
  }, [effectiveStack.length, chaos]);

  function toggleChip(item: string) {
    if (autoStack.includes(item)) return; // locked
    if (DEPRECATED.has(item)) return;
    setSelectedStack((prev) =>
      prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item]
    );
  }

  const disabled = submitting || appIdea.trim().length < 2;

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
          suggestedStack: effectiveStack.join(", ").slice(0, 400),
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

  const costThousands = (fakeMetrics.cost / 1000).toFixed(2);

  return (
    <form className="setup-shell" onSubmit={onSubmit}>
      <div className="setup-bar">
        <span className="brand-mini">▮ ai-dev-agent</span>
        <div className="stats">
          <span>
            build <b>a3f7c2</b>
          </span>
          <span>
            region <b>us-east-1</b>
          </span>
          <span>
            SOC2 <b style={{ color: "var(--orange)" }}>in progress</b>
          </span>
          <span>
            uptime <b style={{ color: "var(--green)" }}>99.97%</b>
          </span>
        </div>
      </div>

      <div className="setup-hero">
        <h1>
          AI-dev-agent<span className="blink-cursor">&nbsp;</span>
        </h1>
        <div className="ver">
          <span className="ver-tag">v4.2.0-alpha.experimental.k8s</span>
          <span className="ver-trained">
            trained on 1.2T tokens of Stack Overflow regret
          </span>
        </div>
      </div>

      <p className="setup-tagline">
        Type a tiny app idea. Watch a confident AI agent{" "}
        <b>overengineer it</b> into a cloud-native incident.{" "}
        <b>Share the recording.</b>
      </p>

      <div className="setup-grid">
        <div className="setup-col">
          <h3>
            App idea
            <span className="hint">// 200 char max, dreams unlimited</span>
          </h3>
          <input
            className="idea-input"
            value={appIdea}
            onChange={(e) => setAppIdea(e.target.value)}
            placeholder="a dog walking scheduler"
            maxLength={200}
            autoFocus
            required
          />
          <div className="idea-example">
            <b>tip:</b> the smaller the idea, the bigger the incident.
          </div>

          <div style={{ height: 24 }} />

          <h3>
            Suggested stack
            <span className="hint">// pick any · auto-recs locked</span>
            <span className="badge-auto">auto · {autoStack.length}</span>
          </h3>
          <div className="stack-chip-row" role="group" aria-label="Suggested stack">
            {STACK_OPTIONS.map((item) => {
              const isAuto = autoStack.includes(item);
              const isDep = DEPRECATED.has(item);
              const isSel = isAuto || selectedStack.includes(item);
              const cls = [
                "stack-chip",
                isAuto ? "auto-rec" : isSel ? "selected" : "",
                isDep ? "deprecated" : ""
              ]
                .filter(Boolean)
                .join(" ");
              return (
                <button
                  key={item}
                  type="button"
                  className={cls}
                  aria-pressed={isSel}
                  onClick={() => toggleChip(item)}
                  disabled={isAuto || isDep}
                >
                  {item}
                </button>
              );
            })}
          </div>
          <input
            type="text"
            className="stack-custom"
            value={customStack}
            onChange={(e) => setCustomStack(e.target.value)}
            placeholder="// or type your own, comma-separated"
            maxLength={200}
          />

          <div style={{ height: 24 }} />

          <h3>
            Chaos level<span className="hint">// affects blast radius</span>
          </h3>
          <div className="chaos-row" role="radiogroup" aria-label="Chaos level">
            {CHAOS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={chaos === opt.value}
                className={`chaos-card${chaos === opt.value ? " selected" : ""}`}
                onClick={() => setChaos(opt.value)}
              >
                <strong>{opt.label}</strong>
                <span className="desc">{opt.desc}</span>
                {opt.warn && <span className="warn">{opt.warn}</span>}
              </button>
            ))}
          </div>
        </div>

        <div className="setup-col">
          <div className="preview-panel">
            <h4>
              Pre-flight forecast
              <span className="live-dot">LIVE</span>
            </h4>
            <div className="preview-row">
              <span className="k">Agents to spawn</span>
              <span className="v up">{fakeMetrics.agents}</span>
            </div>
            <div className="preview-row">
              <span className="k">Services provisioned</span>
              <span className="v">{fakeMetrics.services}</span>
            </div>
            <div className="preview-row">
              <span className="k">Est. cloud bill / mo</span>
              <span className="v up">${fakeMetrics.cost.toLocaleString()}</span>
            </div>
            <div className="preview-row">
              <span className="k">Postmortems queued</span>
              <span className="v up">{fakeMetrics.postmortems}</span>
            </div>
            <div className="preview-row">
              <span className="k">Build ETA</span>
              <span className="v ok">~{fakeMetrics.eta}s</span>
            </div>
            <div className="preview-row">
              <span className="k">Agent confidence</span>
              <span className="v ok">{fakeMetrics.confidence}</span>
            </div>
          </div>

          <div style={{ height: 16 }} />

          <div className="preview-panel">
            <h4>
              Will probably break
              <span className="forecast-tag">FORECAST</span>
            </h4>
            <div className="preview-row">
              <span className="k">cascading failure</span>
              <span className="v up">{forecast.cascading}%</span>
            </div>
            <div className="preview-row">
              <span className="k">OOMKilled pod</span>
              <span className="v up">{forecast.oom}%</span>
            </div>
            <div className="preview-row">
              <span className="k">forgotten env var</span>
              <span className="v up">{forecast.forgottenEnv}%</span>
            </div>
            <div className="preview-row">
              <span className="k">happy path completes</span>
              <span className="v ok">{forecast.happyPath}%</span>
            </div>
          </div>
        </div>
      </div>

      <div className="submit-row">
        <a className="demo-link" href="/demo">
          or watch a prebuilt demo →
        </a>
        <button type="submit" className="run-button" disabled={disabled}>
          {submitting ? (
            <span className="spinner" aria-hidden="true" />
          ) : (
            <span className="play-arrow" aria-hidden="true" />
          )}
          {submitting ? "Spawning agents…" : "Run agent"}
          <span className="eta">
            ~{fakeMetrics.eta}s · ${costThousands}k/mo
          </span>
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="footer-strip">
        <span>streaming · us-east-1 → your browser</span>
        <span>last incident: 2 minutes ago</span>
        <span>by clicking Run you accept eventual consistency</span>
      </div>
    </form>
  );
}
