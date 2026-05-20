"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  AnimationEvent,
  AsciiBarPayload,
  ConfidencePatch,
  EventLevel,
  GeneratedConfig
} from "@/lib/types";
import { buildEvents } from "@/lib/templates/build";
import { getEndingProfile } from "@/lib/templates/endings";

const ANIMATION_SPEED = 1.4;

interface DisplayLine {
  key: number;
  level: EventLevel;
  badge: string;
  timestamp: string;
  text: string;
  bar?: AsciiBarPayload;
  newStack?: boolean;
  question?: {
    choices: string[];
    selected?: string;
  };
}

type Metrics = {
  pods: number;
  users: number;
  cost: number;
  latency: number | string;
  agents: number;
  tokens: number | string;
  incidents: number;
  p99: number | string;
};

interface StackEntry {
  label: string;
  isNew: boolean;
  crisis: boolean;
}

type AppPhase = "hidden" | "active" | "crashed";
type SaveState = "idle" | "saving" | "failed";
type RunState = "idle" | "running" | "failed";

function pad(value: number, width = 2): string {
  return String(value).padStart(width, "0");
}

function seedFromString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function makeRng(seed: number) {
  let state = seed || 1;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function money(value: number): string {
  return `$${Math.round(value).toLocaleString("en-US")}`;
}

function latencyLabel(value: number | string): string {
  if (typeof value === "string") return value;
  if (value >= 1000) return `${(value / 1000).toFixed(1)} s`;
  return `${value} ms`;
}

function badgeFor(level: EventLevel, text: string): string {
  if (level === "cmd") return "$";
  if (level === "fatal") return "FATAL";
  if (level === "error") return "ERROR";
  if (level === "warn") return "WARN";
  if (level === "success") return text.startsWith("[CONFIG]") ? "CONFIG" : "OK";
  if (level === "info") {
    if (text.startsWith("?")) return "ASK";
    if (text.startsWith("[USER]")) return "USER";
    if (text.startsWith("[VECTOR]")) return "VECTOR";
    if (text.startsWith("[POSTGRES]")) return "PG";
    if (text.startsWith("[GPU]")) return "GPU";
    if (text.startsWith("[CI]")) return "CI";
    if (text.startsWith("[API]")) return "API";
    if (text.startsWith("[INFO]")) return "INFO";
    if (text.startsWith("[SYSTEM]")) return "PHASE";
    if (text.startsWith("[PLAN]")) return "PLAN";
    return "INFO";
  }
  if (level === "ai") return "AGENT";
  if (level === "docker") return "DOCKER";
  if (level === "k8s") return "K8S";
  if (level === "npm") return "NPM";
  if (level === "cloud") return "CLOUD";
  if (level === "metrics") return "METRIC";
  if (level === "optimizer") return "OPT";
  return "LOG";
}

function AsciiBar({ percent, width = 18, label }: AsciiBarPayload) {
  const filled = Math.max(0, Math.min(width, Math.round((percent / 100) * width)));
  const empty = width - filled;
  return (
    <span className="ascii-bar">
      [<span className="filled">{"█".repeat(filled)}</span>
      <span className="empty">{"░".repeat(empty)}</span>] {percent}%
      {label ? ` ${label}` : ""}
    </span>
  );
}

function delayFor(event: AnimationEvent): number {
  let delay = 72;
  if (event.pause !== undefined) {
    delay = event.pause;
  } else if (event.level === "cmd") {
    delay = 420;
  } else if (event.level === "fatal") {
    delay = 250;
  } else if (event.level === "error") {
    delay = 150;
  } else if (event.level === "warn") {
    delay = 120;
  } else if (
    event.level === "k8s" ||
    event.level === "docker" ||
    event.level === "npm"
  ) {
    delay = 46;
  }
  return Math.round(delay * ANIMATION_SPEED);
}

interface TerminalProps {
  config: GeneratedConfig;
  shareUrl?: string;
}

export default function Terminal({ config, shareUrl }: TerminalProps) {
  const events = useMemo(() => buildEvents(config), [config]);
  const ending = useMemo(
    () => getEndingProfile(config.endingTemplate),
    [config.endingTemplate]
  );

  const [lines, setLines] = useState<DisplayLine[]>([]);
  const [stack, setStack] = useState<StackEntry[]>([]);
  const [metrics, setMetrics] = useState<Metrics>({
    pods: 0,
    users: 0,
    cost: 0,
    latency: 0,
    agents: 0,
    tokens: 0,
    incidents: 0,
    p99: 0
  });
  const [confidence, setConfidence] = useState<ConfidencePatch>({
    value: 99.7,
    label: "99.7%",
    tone: "high"
  });
  const [phaseLabel, setPhaseLabel] = useState<string>("Awaiting request");
  const [phaseProgress, setPhaseProgress] = useState(0);
  const [phaseShimmer, setPhaseShimmer] = useState(true);
  const [timelineProgress, setTimelineProgress] = useState(0);
  const [timelineLabel, setTimelineLabel] = useState("interactive setup");
  const [runState, setRunState] = useState<RunState>("running");
  const [statusText, setStatusText] = useState("RUNNING");
  const [commandText, setCommandText] = useState(
    `ai-dev-agent run --request "${config.appIdea}" --interactive`
  );
  const [subtitle, setSubtitle] = useState(`request: ${config.appIdea}`);
  const [shellMode, setShellMode] = useState<"normal" | "crisis">("normal");
  const [appPhase, setAppPhase] = useState<AppPhase>("hidden");
  const [appStatus, setAppStatus] = useState("200 OK");
  const [actionInput, setActionInput] = useState("");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [shareCopied, setShareCopied] = useState(false);

  const outputRef = useRef<HTMLDivElement | null>(null);
  const lineKeyRef = useRef(0);
  const clockRef = useRef(Date.UTC(2026, 4, 20, 10, 37, 4, 0));
  const rngRef = useRef(
    makeRng(seedFromString(`${config.appTitle}|${config.appIdea}`))
  );
  const timerRef = useRef<number | null>(null);
  const indexRef = useRef(0);
  const stackSetRef = useRef<Set<string>>(new Set());
  const newStackTimersRef = useRef<Map<string, number>>(new Map());
  const preflightStateRef = useRef<{ index: number; answered: number }>({
    index: 0,
    answered: 0
  });
  const mainEventsStartedRef = useRef(false);
  const redDotClickedRef = useRef(false);

  const stableConfigId = `${config.appTitle}-${config.appIdea}`;

  const stamp = useCallback(() => {
    clockRef.current += 24 + Math.floor(rngRef.current() * 260);
    const d = new Date(clockRef.current);
    return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}.${pad(d.getUTCMilliseconds(), 3)}`;
  }, []);

  const appendLine = useCallback(
    (
      level: EventLevel,
      text: string,
      opts: {
        flash?: boolean;
        bar?: AsciiBarPayload;
        question?: DisplayLine["question"];
        badge?: string;
      } = {}
    ) => {
      const key = lineKeyRef.current++;
      const ts = stamp();
      const badge = opts.badge ?? badgeFor(level, text);
      setLines((prev) => {
        const next = [
          ...prev,
          {
            key,
            level,
            badge,
            timestamp: ts,
            text,
            bar: opts.bar,
            question: opts.question
          }
        ];
        return next.length > 260 ? next.slice(next.length - 260) : next;
      });
      return key;
    },
    [stamp]
  );

  const scrollToBottom = useCallback(() => {
    const el = outputRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [lines, scrollToBottom]);

  const addStack = useCallback(
    (items: string | string[], crisis = false) => {
      const list = Array.isArray(items) ? items : [items];
      const added: StackEntry[] = [];
      for (const item of list) {
        if (!stackSetRef.current.has(item)) {
          stackSetRef.current.add(item);
          added.push({ label: item, isNew: true, crisis });
        }
      }
      if (added.length === 0) return;
      setStack((prev) => [...prev, ...added]);
      for (const a of added) {
        const t = window.setTimeout(() => {
          setStack((prev) =>
            prev.map((s) =>
              s.label === a.label ? { ...s, isNew: false } : s
            )
          );
          newStackTimersRef.current.delete(a.label);
        }, 700);
        newStackTimersRef.current.set(a.label, t);
      }
    },
    []
  );

  const setPhase = useCallback((label: string, progress: number) => {
    setPhaseLabel(label);
    setPhaseProgress(Math.max(0, Math.min(progress, 100)));
    const buckets = [
      { p: 5, l: "scope detection" },
      { p: 18, l: "npm install" },
      { p: 30, l: "containers" },
      { p: 44, l: "kubernetes" },
      { p: 57, l: "data platform" },
      { p: 68, l: "agent mesh" },
      { p: 78, l: "gpu inference" },
      { p: 88, l: "ci/cd + cloud" },
      { p: 94, l: "ui reveal" },
      { p: 100, l: "incident response" }
    ];
    for (const b of buckets) {
      if (progress <= b.p) {
        setTimelineLabel(b.l);
        return;
      }
    }
    setTimelineLabel("incident response");
  }, []);

  const applyAction = useCallback(
    (action: NonNullable<AnimationEvent["action"]>) => {
      switch (action) {
        case "showApp":
          setAppPhase("active");
          setAppStatus("200 OK");
          setSubtitle(`final UI surface: ${config.finalUILabel}`);
          break;
        case "typeInput": {
          setActionInput("");
          const text = config.sampleInput;
          [...text].forEach((char, idx) => {
            window.setTimeout(() => {
              setActionInput((cur) => cur + char);
            }, idx * 110);
          });
          break;
        }
        case "triggerAction":
          setSaveState("saving");
          break;
        case "crashApp":
          setShellMode("crisis");
          setAppPhase("crashed");
          setAppStatus("503 CASCADE");
          setSaveState("failed");
          setRunState("failed");
          setStatusText("FAILING");
          setPhaseShimmer(false);
          setSubtitle(
            `final UI surface: ${config.appTitle.toLowerCase()}.local — 503 CASCADE`
          );
          break;
        case "finish":
          setRunState("failed");
          setStatusText("FAILED");
          setTimelineProgress(100);
          setTimelineLabel("incident response");
          setPhaseShimmer(false);
          break;
      }
    },
    [config.appTitle, config.finalUILabel, config.sampleInput]
  );

  const applyEvent = useCallback(
    (event: AnimationEvent) => {
      if (event.phase) setPhase(event.phase, event.progress ?? 0);
      if (event.progress !== undefined) {
        setTimelineProgress(Math.max(0, Math.min(event.progress, 100)));
      }
      if (event.stack) {
        const crisisAdd =
          shellMode === "crisis" || event.action === "crashApp" || event.level === "warn";
        addStack(event.stack, crisisAdd && event.text?.includes("oncall") === true);
      }
      if (event.metrics) {
        setMetrics((prev) => ({
          pods: event.metrics?.pods ?? prev.pods,
          users: event.metrics?.users ?? prev.users,
          cost: event.metrics?.cost ?? prev.cost,
          latency: event.metrics?.latency ?? prev.latency,
          agents: event.metrics?.agents ?? prev.agents,
          tokens: event.metrics?.tokens ?? prev.tokens,
          incidents: event.metrics?.incidents ?? prev.incidents,
          p99: event.metrics?.p99 ?? prev.p99
        }));
      }
      if (event.confidence) setConfidence(event.confidence);
      if (event.command) setCommandText(event.command);
      if (event.action) applyAction(event.action);
      if (event.text) {
        appendLine(event.level, event.text, {
          flash: event.flash,
          bar: event.bar,
          badge: event.badge
        });
      }
    },
    [addStack, appendLine, applyAction, setPhase, shellMode]
  );

  const play = useCallback(() => {
    const i = indexRef.current;
    if (i >= events.length) return;
    const event = events[i];
    indexRef.current = i + 1;
    applyEvent(event);
    if (event.progress === undefined) {
      const progress = ((i + 1) / events.length) * 100;
      setTimelineProgress(Math.min(progress, 100));
    }
    timerRef.current = window.setTimeout(play, delayFor(event));
  }, [applyEvent, events]);

  const askNextPreflight = useCallback(() => {
    const idx = preflightStateRef.current.index;
    const q = config.preflightQuestions[idx];
    if (!q) {
      appendLine(
        "success",
        "[CONFIG] Interactive profile resolved: enterprise-ready scaffold with production safeguards."
      );
      appendLine(
        "warn",
        "[WARN] Minimal selections acknowledged; production-ready defaults retained by policy."
      );
      appendLine("info", "[INFO] Continuing with deterministic build plan.");
      if (!mainEventsStartedRef.current) {
        mainEventsStartedRef.current = true;
        timerRef.current = window.setTimeout(play, Math.round(700 * ANIMATION_SPEED));
      }
      return;
    }
    const key = lineKeyRef.current++;
    const weirdThird = ["what is git", "i'm scared", "skip", "do it twice"];
    const augmented = [...q.choices];
    if (augmented.length === 2) {
      augmented.push(weirdThird[idx % weirdThird.length]);
    }
    setLines((prev) => [
      ...prev,
      {
        key,
        level: "info",
        badge: "ASK",
        timestamp: stamp(),
        text: `? ${q.prompt}`,
        question: { choices: augmented }
      }
    ]);
  }, [appendLine, config.preflightQuestions, play, stamp]);

  const handleChoice = useCallback(
    (lineKey: number, choice: string) => {
      setLines((prev) =>
        prev.map((ln) =>
          ln.key === lineKey && ln.question
            ? { ...ln, question: { ...ln.question, selected: choice } }
            : ln
        )
      );
      preflightStateRef.current.answered += 1;
      preflightStateRef.current.index += 1;
      window.setTimeout(askNextPreflight, Math.round(380 * ANIMATION_SPEED));
    },
    [askNextPreflight]
  );

  useEffect(() => {
    setRunState("running");
    setStatusText("RUNNING");
    appendLine(
      "cmd",
      `$ ai-dev-agent run --request "${config.appIdea}" --interactive`
    );
    appendLine("info", `[INFO] Launching ${config.appTitle} scaffold wizard.`);
    appendLine(
      "info",
      "[INFO] User selections will be mapped to production-ready implementation defaults."
    );
    const id = window.setTimeout(
      askNextPreflight,
      Math.round(480 * ANIMATION_SPEED)
    );
    return () => {
      window.clearTimeout(id);
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      for (const t of newStackTimersRef.current.values()) window.clearTimeout(t);
      newStackTimersRef.current.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stableConfigId]);

  const onShare = useCallback(async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareCopied(true);
      window.setTimeout(() => setShareCopied(false), 1800);
    } catch {
      // ignore
    }
  }, [shareUrl]);

  const onRedDot = useCallback(() => {
    if (redDotClickedRef.current) return;
    redDotClickedRef.current = true;
    appendLine(
      "info",
      "[INFO] Close requested. Your team will be paged. Cancelling…"
    );
    window.setTimeout(() => {
      appendLine("fatal", "[FATAL] PagerDuty acknowledged.");
    }, 700);
  }, [appendLine]);

  const shellClass = useMemo(() => {
    const cls = ["terminal-shell"];
    if (shellMode === "crisis") cls.push("crisis");
    return cls.join(" ");
  }, [shellMode]);

  const confidenceBarClass = useMemo(() => {
    return `confidence-bar ${confidence.tone === "low" ? "low" : confidence.tone === "mid" ? "mid" : ""}`;
  }, [confidence.tone]);

  const saveButtonClass = useMemo(() => {
    if (saveState === "saving") return "saving";
    if (saveState === "failed") return "failed";
    return "";
  }, [saveState]);

  const saveButtonLabel = useMemo(() => {
    if (saveState === "saving") return "Saving…";
    if (saveState === "failed") return "Failed";
    return config.finalUILabel;
  }, [config.finalUILabel, saveState]);

  const phaseMeterSpanClass = useMemo(() => {
    return runState === "running" && phaseShimmer ? "shimmer" : "";
  }, [runState, phaseShimmer]);

  const showAppReveal = appPhase !== "hidden";
  const appCrashed = appPhase === "crashed";

  return (
    <main className="watch-shell" aria-label="ai-dev-agent terminal simulation">
      <section className={shellClass}>
        {shellMode === "crisis" && <div className="glitch-overlay" />}

        <header className="topbar">
          <div className="window-controls" aria-hidden="true">
            <button
              type="button"
              className="dot red"
              onClick={onRedDot}
              aria-label="close (do not click)"
            />
            <span className="dot yellow" />
            <span className="dot green" />
          </div>
          <div className="title-stack">
            <span className="title">
              ai-dev-agent / {config.appTitle.toLowerCase()}
              <span className="crumb">build a3f7c2</span>
              <span className="crumb">us-east-1</span>
              <span
                className="crumb"
                style={{
                  color:
                    shellMode === "crisis" ? "var(--red)" : "var(--green)"
                }}
              >
                {shellMode === "crisis" ? "● degraded" : "● prod"}
              </span>
            </span>
            <span className="subtitle">{subtitle}</span>
          </div>
          <div
            className={`run-status ${runState === "failed" ? "failed" : ""}`}
          >
            <span className="pulse" aria-hidden="true" />
            <span>{statusText}</span>
          </div>
        </header>

        <div className="workspace">
          <aside className="sidebar" aria-label="Build telemetry">
            <div className="panel">
              <span className="panel-label">User request</span>
              <div className="request-display">{config.appIdea}</div>
            </div>

            <div className="panel">
              <span className="panel-label">Current phase</span>
              <strong className="phase">{phaseLabel}</strong>
              <div className="phase-meter" aria-hidden="true">
                <span
                  className={phaseMeterSpanClass}
                  style={{ width: `${phaseProgress}%` }}
                />
              </div>
            </div>

            <div className="panel stack-panel">
              <span className="panel-label">
                Provisioned stack · {stack.length}
              </span>
              <ul>
                {stack.map((item) => (
                  <li
                    key={item.label}
                    className={`${item.isNew ? "new" : ""} ${item.crisis ? "crisis-entry" : ""}`.trim()}
                  >
                    {item.crisis ? `+ ${item.label}` : item.label}
                  </li>
                ))}
                {stack.length === 0 && (
                  <span className="ghost">+ scanning…</span>
                )}
              </ul>
            </div>

            <div className="panel metrics-panel">
              <span className="panel-label">Runtime metrics</span>
              <dl>
                <div>
                  <dt>Pods</dt>
                  <dd className={shellMode === "crisis" ? "up" : ""}>
                    {metrics.pods.toLocaleString("en-US")}
                  </dd>
                </div>
                <div>
                  <dt>Users</dt>
                  <dd>{metrics.users}</dd>
                </div>
                <div>
                  <dt>Cost/mo</dt>
                  <dd className={shellMode === "crisis" ? "up" : "warn"}>
                    {money(metrics.cost)}
                  </dd>
                </div>
                <div>
                  <dt>p95 action</dt>
                  <dd
                    className={
                      shellMode === "crisis"
                        ? "up"
                        : typeof metrics.latency === "number" && metrics.latency < 1000
                          ? "ok"
                          : ""
                    }
                  >
                    {latencyLabel(metrics.latency)}
                  </dd>
                </div>
                <div>
                  <dt>Agents</dt>
                  <dd className={shellMode === "crisis" ? "up" : ""}>
                    {metrics.agents}
                  </dd>
                </div>
                <div>
                  <dt>Tokens</dt>
                  <dd>{typeof metrics.tokens === "number" ? metrics.tokens.toLocaleString("en-US") : metrics.tokens}</dd>
                </div>
                <div>
                  <dt>Incidents</dt>
                  <dd className={shellMode === "crisis" ? "up" : "ok"}>
                    {metrics.incidents}
                  </dd>
                </div>
                <div>
                  <dt>p99 action</dt>
                  <dd className={shellMode === "crisis" ? "up" : "warn"}>
                    {typeof metrics.p99 === "number"
                      ? metrics.p99 === 0
                        ? "—"
                        : latencyLabel(metrics.p99)
                      : metrics.p99}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="panel">
              <span className="panel-label">Agent confidence</span>
              <div className={confidenceBarClass} aria-hidden="true">
                <span />
              </div>
              <div className="confidence-readout">
                <span style={{ color: "var(--muted)" }}>
                  {confidence.tone === "low"
                    ? "recalibrating…"
                    : confidence.tone === "mid"
                      ? "drifting"
                      : "stable"}
                </span>
                <span className={`val ${confidence.tone}`}>
                  {confidence.label}
                </span>
              </div>
            </div>
          </aside>

          <section className="terminal-panel" aria-label="Terminal output">
            <div className="command-banner">
              <span className="prompt">$</span>
              <span>{commandText}</span>
            </div>
            <div
              className="terminal-output"
              ref={outputRef}
              role="log"
              aria-live="polite"
            >
              {lines.map((line) => (
                <div key={line.key} className={`line ${line.level}`}>
                  <span className="timestamp">{line.timestamp}</span>
                  <span className="badge">{line.badge}</span>
                  <span className="message">
                    {line.text}
                    {line.bar && <AsciiBar {...line.bar} />}
                    {line.question && (
                      <span className="choice-row">
                        {line.question.selected ? (
                          <span className="choice-selected">{`> ${line.question.selected}`}</span>
                        ) : (
                          line.question.choices.map((choice, i) => (
                            <button
                              key={choice}
                              type="button"
                              className={`choice-button${i === 2 ? " weird" : ""}`}
                              onClick={() => handleChoice(line.key, choice)}
                            >
                              {`> ${choice}`}
                            </button>
                          ))
                        )}
                      </span>
                    )}
                  </span>
                </div>
              ))}
            </div>
            <div className="terminal-cursor" aria-hidden="true">
              <span className="prompt">$</span>
              <span className="cursor-block" />
            </div>
          </section>
        </div>

        <footer className="timeline" aria-label="Simulation progress">
          <div className="timeline-track">
            <span style={{ width: `${timelineProgress}%` }} />
          </div>
          <span className="timeline-label">{timelineLabel}</span>
          <div className="timeline-side">
            <span>
              kafka lag {shellMode === "crisis" ? "42s" : "0.2s"}
            </span>
            <span>
              {shellMode === "crisis" ? "PAGER · oncall" : "interactive setup"}
            </span>
          </div>
        </footer>

        {showAppReveal && (
          <div className={`app-reveal${appCrashed ? " crashed" : ""}`}>
            <div className="app-chrome">
              <span>{config.appTitle.toLowerCase()}.local</span>
              <span className={appCrashed ? "status-fail" : "status-ok"}>
                {appStatus}
              </span>
            </div>
            <div className="app-body">
              <h1>{config.finalUILabel}</h1>
              <input
                type="text"
                value={actionInput}
                readOnly
                autoComplete="off"
                spellCheck={false}
                placeholder={ending.inputPlaceholder}
              />
              <button type="button" className={saveButtonClass}>
                {saveButtonLabel}
              </button>
              {appCrashed && (
                <p className="app-error">{config.failureLine}</p>
              )}
            </div>
          </div>
        )}
      </section>

      <div className="external-controls">
        {shareCopied && <span className="share-toast">Link copied.</span>}
        {shareUrl && (
          <button type="button" className="control-button" onClick={onShare}>
            Share
          </button>
        )}
        <a className="control-button" href="/">
          New
        </a>
      </div>
    </main>
  );
}
