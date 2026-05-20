"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  AnimationEvent,
  EventLevel,
  GeneratedConfig
} from "@/lib/types";
import { buildEvents } from "@/lib/templates/build";
import { getEndingProfile } from "@/lib/templates/endings";

const ANIMATION_SPEED = 1.4;

interface DisplayLine {
  key: number;
  level: EventLevel;
  timestamp: string;
  text: string;
  flash: boolean;
  question?: {
    choices: string[];
    selected?: string;
  };
}

type Metrics = { pods: number; users: number; cost: number; latency: number | string };

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
  const ending = useMemo(() => getEndingProfile(config.endingTemplate), [config.endingTemplate]);

  const [lines, setLines] = useState<DisplayLine[]>([]);
  const [stack, setStack] = useState<string[]>([]);
  const [metrics, setMetrics] = useState<Metrics>({
    pods: 0,
    users: 0,
    cost: 0,
    latency: 0
  });
  const [phaseLabel, setPhaseLabel] = useState<string>("Awaiting request");
  const [phaseProgress, setPhaseProgress] = useState(0);
  const [timelineProgress, setTimelineProgress] = useState(0);
  const [timelineLabel, setTimelineLabel] = useState("interactive setup");
  const [runState, setRunState] = useState<RunState>("running");
  const [statusText, setStatusText] = useState("RUNNING");
  const [commandText, setCommandText] = useState(
    `ai-dev-agent run --request "${config.appIdea}" --interactive`
  );
  const [subtitle, setSubtitle] = useState(`request: ${config.appIdea}`);
  const [shellMode, setShellMode] = useState<"normal" | "appFocus" | "crisis">("normal");
  const [appPhase, setAppPhase] = useState<AppPhase>("hidden");
  const [appStatus, setAppStatus] = useState("200 OK");
  const [actionInput, setActionInput] = useState("");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [shareCopied, setShareCopied] = useState(false);

  const outputRef = useRef<HTMLDivElement | null>(null);
  const lineKeyRef = useRef(0);
  const clockRef = useRef(Date.UTC(2026, 4, 20, 10, 37, 4, 0));
  const rngRef = useRef(makeRng(seedFromString(`${config.appTitle}|${config.appIdea}`)));
  const timerRef = useRef<number | null>(null);
  const indexRef = useRef(0);
  const stackSetRef = useRef<Set<string>>(new Set());
  const preflightStateRef = useRef<{ index: number; answered: number }>({
    index: 0,
    answered: 0
  });
  const mainEventsStartedRef = useRef(false);

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
      opts: { flash?: boolean; question?: DisplayLine["question"] } = {}
    ) => {
      const key = lineKeyRef.current++;
      const ts = stamp();
      setLines((prev) => {
        const next = [...prev, {
          key,
          level,
          timestamp: ts,
          text,
          flash: !!opts.flash,
          question: opts.question
        }];
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

  const addStack = useCallback((items: string | string[]) => {
    const list = Array.isArray(items) ? items : [items];
    const added: string[] = [];
    for (const item of list) {
      if (!stackSetRef.current.has(item)) {
        stackSetRef.current.add(item);
        added.push(item);
      }
    }
    if (added.length) setStack((prev) => [...prev, ...added]);
  }, []);

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
          setShellMode("appFocus");
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
          break;
        case "finish":
          setRunState("failed");
          setStatusText("FAILED");
          setTimelineProgress(100);
          setTimelineLabel("crashed after one action");
          break;
      }
    },
    [config.finalUILabel, config.sampleInput]
  );

  const applyEvent = useCallback(
    (event: AnimationEvent) => {
      if (event.phase) setPhase(event.phase, event.progress ?? 0);
      if (event.progress !== undefined) {
        setTimelineProgress(Math.max(0, Math.min(event.progress, 100)));
      }
      if (event.stack) addStack(event.stack);
      if (event.metrics) {
        setMetrics((prev) => ({
          pods: event.metrics?.pods ?? prev.pods,
          users: event.metrics?.users ?? prev.users,
          cost: event.metrics?.cost ?? prev.cost,
          latency: event.metrics?.latency ?? prev.latency
        }));
      }
      if (event.command) setCommandText(event.command);
      if (event.action) applyAction(event.action);
      if (event.text) {
        appendLine(event.level, event.text, { flash: event.flash });
      }
    },
    [addStack, appendLine, applyAction, setPhase]
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
      // finish preflight, kick off main animation
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
    setLines((prev) => [
      ...prev,
      {
        key,
        level: "info",
        timestamp: stamp(),
        text: `? ${q.prompt}`,
        flash: true,
        question: { choices: q.choices }
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

  // bootstrap
  useEffect(() => {
    setRunState("running");
    setStatusText("RUNNING");
    appendLine("cmd", `$ ai-dev-agent run --request "${config.appIdea}" --interactive`);
    appendLine("info", `[INFO] Launching ${config.appTitle} scaffold wizard.`);
    appendLine(
      "info",
      "[INFO] User selections will be mapped to production-ready implementation defaults."
    );
    const id = window.setTimeout(askNextPreflight, Math.round(480 * ANIMATION_SPEED));
    return () => {
      window.clearTimeout(id);
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
    // intentionally only on config id — full lifecycle
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

  const shellClass = useMemo(() => {
    const cls = ["terminal-shell"];
    if (shellMode === "appFocus") cls.push("app-focus");
    if (shellMode === "crisis") cls.push("crisis");
    return cls.join(" ");
  }, [shellMode]);

  const appPreviewClass = useMemo(() => {
    const cls = ["app-preview"];
    if (appPhase === "active" || appPhase === "crashed") cls.push("active");
    if (appPhase === "crashed") cls.push("crashed");
    return cls.join(" ");
  }, [appPhase]);

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

  return (
    <main className="watch-shell" aria-label="ai-dev-agent terminal simulation">
      <section className={shellClass}>
        <header className="topbar">
          <div className="window-controls" aria-hidden="true">
            <span className="dot red" />
            <span className="dot yellow" />
            <span className="dot green" />
          </div>
          <div className="title-stack">
            <span className="title">ai-dev-agent / {config.appTitle.toLowerCase()}</span>
            <span className="subtitle">{subtitle}</span>
          </div>
          <div className={`run-status ${runState === "failed" ? "failed" : "running"}`}>
            <span className="pulse" aria-hidden="true" />
            <span>{statusText}</span>
          </div>
        </header>

        <div className="workspace">
          <aside className="sidebar" aria-label="Build telemetry">
            <div className="panel">
              <span className="panel-label">User Request</span>
              <div className="request-display">{config.appIdea}</div>
            </div>

            <div className="panel">
              <span className="panel-label">Current Phase</span>
              <strong>{phaseLabel}</strong>
              <div className="phase-meter" aria-hidden="true">
                <span style={{ width: `${phaseProgress}%` }} />
              </div>
            </div>

            <div className="panel stack-panel">
              <span className="panel-label">Provisioned Stack</span>
              <ul>
                {stack.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>

            <div className="panel metrics-panel">
              <span className="panel-label">Runtime Metrics</span>
              <dl>
                <div>
                  <dt>Pods</dt>
                  <dd>{metrics.pods.toLocaleString("en-US")}</dd>
                </div>
                <div>
                  <dt>Users</dt>
                  <dd>{metrics.users.toLocaleString("en-US")}</dd>
                </div>
                <div>
                  <dt>Cost/mo</dt>
                  <dd>{money(metrics.cost)}</dd>
                </div>
                <div>
                  <dt>p95 action</dt>
                  <dd>{latencyLabel(metrics.latency)}</dd>
                </div>
              </dl>
            </div>
          </aside>

          <section className="terminal-panel" aria-label="Terminal output">
            <div className="command-banner">
              <span className="prompt">$</span>
              <span>{commandText}</span>
            </div>
            <div className="terminal-output" ref={outputRef} role="log" aria-live="polite">
              {lines.map((line) => (
                <div
                  key={line.key}
                  className={`line ${line.level}${line.flash ? " flash" : ""}${line.question ? " question-line" : ""}`}
                >
                  <span className="timestamp">{line.timestamp}</span>
                  {line.question ? (
                    <span className="message choice-group">
                      <span style={{ marginRight: 8 }}>{line.text}</span>
                      {line.question.selected ? (
                        <span style={{ color: "var(--green)", fontWeight: 700 }}>
                          {`> ${line.question.selected}`}
                        </span>
                      ) : (
                        line.question.choices.map((choice) => (
                          <button
                            key={choice}
                            type="button"
                            className="choice-button"
                            onClick={() => handleChoice(line.key, choice)}
                          >
                            {`> ${choice}`}
                          </button>
                        ))
                      )}
                    </span>
                  ) : (
                    <span className="message">{line.text}</span>
                  )}
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
        </footer>

        <div className={appPreviewClass} aria-label="Final tiny app preview">
          <div className="app-chrome">
            <span>{config.appTitle.toLowerCase()}.local</span>
            <span>{appStatus}</span>
          </div>
          <div className="app-body">
            <h1>{config.finalUILabel}</h1>
            <label className="visually-hidden" htmlFor="actionInput">
              {config.finalUILabel}
            </label>
            <input
              id="actionInput"
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
            <p className="app-error">{config.failureLine}</p>
          </div>
        </div>
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
