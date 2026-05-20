/* global React */
const { useState, useEffect, useRef, useMemo } = React;

// ascii progress bar component
function AsciiBar({ percent, width = 18, label = "" }) {
  const filled = Math.round((percent / 100) * width);
  const empty = width - filled;
  return (
    <span className="ascii-bar">
      [<span className="filled">{"█".repeat(filled)}</span>
      <span className="empty">{"░".repeat(empty)}</span>]
      {" "}{percent}%{label && ` ${label}`}
    </span>
  );
}

// log line renderer
function LogLine({ ts, level, badge, message, ascii, choices, selected }) {
  return (
    <div className={`line ${level}`}>
      <span className="timestamp">{ts}</span>
      <span className="badge">{badge}</span>
      <span className="message">
        {message}
        {ascii && <> &nbsp;<AsciiBar {...ascii} /></>}
        {choices && (
          <span className="choice-row">
            {selected ? (
              <span style={{color: "var(--green)", fontWeight: 700}}>{`> ${selected}`}</span>
            ) : choices.map((c, i) => (
              <button key={c} className={`choice-button${i === 2 ? " weird" : ""}`}>{`> ${c}`}</button>
            ))}
          </span>
        )}
      </span>
    </div>
  );
}

// === RUNNING STATE LOG ===
const RUNNING_LOGS = [
  { ts: "10:37:04.117", level: "cmd",    badge: "$",       message: 'ai-dev-agent run --request "a dog walking scheduler" --interactive' },
  { ts: "10:37:04.351", level: "info",   badge: "INFO",    message: "Launching WalkPilot scaffold wizard." },
  { ts: "10:37:04.580", level: "info",   badge: "INFO",    message: "User selections will be mapped to production-ready implementation defaults." },
  { ts: "10:37:04.736", level: "info",   badge: "ASK",     message: "? Initialize Git repository and release workflow?",
    choices: ["yes", "no", "what is git"], selected: "yes" },
  { ts: "10:37:05.012", level: "info",   badge: "ASK",     message: "? Add SOC2 compliance scaffolding now or later?",
    choices: ["now", "later", "i'm scared"], selected: "now" },
  { ts: "10:37:05.388", level: "success",badge: "CONFIG",  message: "Interactive profile resolved: enterprise-ready scaffold with production safeguards." },
  { ts: "10:37:05.612", level: "warn",   badge: "WARN",    message: "Minimal selections acknowledged; production defaults retained by policy." },
  { ts: "10:37:05.890", level: "npm",    badge: "NPM",     message: "installing 1,847 packages...",
    ascii: { percent: 64, width: 16, label: "" } },
  { ts: "10:37:06.234", level: "npm",    badge: "NPM",     message: "WARN deprecated left-pad@1.3.0: please use String.prototype.padStart" },
  { ts: "10:37:06.501", level: "docker", badge: "DOCKER",  message: "pulling postgres:15-alpine",
    ascii: { percent: 47, width: 16 } },
  { ts: "10:37:06.812", level: "docker", badge: "DOCKER",  message: "pulling redis:7.2 · 14 of 17 layers" },
  { ts: "10:37:07.103", level: "k8s",    badge: "K8S",     message: "kubectl apply -f manifests/ — 23 resources" },
  { ts: "10:37:07.402", level: "k8s",    badge: "K8S",     message: "Pod dog-walker-scheduler-0 → Pending → ContainerCreating" },
  { ts: "10:37:07.711", level: "info",   badge: "AGENT",   message: "Spawning sub-agent: walker-matcher-agent (gpt-4o, t=0.2)" },
  { ts: "10:37:07.998", level: "info",   badge: "AGENT",   message: "Spawning sub-agent: leash-knot-resolver (claude-3.5-haiku)" },
  { ts: "10:37:08.301", level: "warn",   badge: "WARN",    message: "Vector index for walker bios growing rapidly (1.4M embeddings)" },
  { ts: "10:37:08.612", level: "info",   badge: "INFO",    message: "Provisioning GPU pool: g5.xlarge ×3 for embedding refresh" },
  { ts: "10:37:08.920", level: "k8s",    badge: "K8S",     message: "HorizontalPodAutoscaler scaled walker-matcher → 12 replicas" },
  { ts: "10:37:09.214", level: "info",   badge: "STRIPE",  message: "Webhook endpoint registered: /api/webhooks/stripe/dog-walked" },
];

// === CRISIS LOGS — what plays once the cascade starts ===
const CRISIS_LOGS = [
  { ts: "10:38:01.044", level: "info",   badge: "INFO",   message: "Final UI surface bound to /ui/walkpilot — exposing route to ingress." },
  { ts: "10:38:01.288", level: "success",badge: "READY",  message: "Build ready. 23 services healthy. Awaiting first user action." },
  { ts: "10:38:01.612", level: "info",   badge: "USER",   message: 'Action received: input="walk Mr. Biscuit at 5pm"' },
  { ts: "10:38:01.890", level: "info",   badge: "AGENT",  message: "walker-matcher-agent: searching 1.4M embeddings..." },
  { ts: "10:38:02.144", level: "warn",   badge: "WARN",   message: "Redis connection pool exhausted (50/50). Queueing requests." },
  { ts: "10:38:02.398", level: "error",  badge: "ERROR",  message: "leash-knot-resolver: timeout after 30s — escalating to oncall-agent." },
  { ts: "10:38:02.612", level: "error",  badge: "ERROR",  message: "Pod walker-matcher-7 OOMKilled (3.4 GiB / 2 GiB limit)" },
  { ts: "10:38:02.890", level: "error",  badge: "ERROR",  message: "kafka: replication lag 42s on topic dog-events" },
  { ts: "10:38:03.144", level: "fatal",  badge: "FATAL",  message: "Cascading failure: 17/23 services unhealthy. Circuit breaker tripped." },
  { ts: "10:38:03.412", level: "fatal",  badge: "FATAL",  message: "Cloud cost projection updated: $14,820/mo → $487,201/mo" },
  { ts: "10:38:03.701", level: "muted",  badge: "INFO",   message: "// (the agent is filing its own postmortem)" },
];

// === SIDEBAR PROVISIONED STACK BY STATE ===
const STACK_RUNNING = [
  "Next.js", "TypeScript", "Tailwind", "Postgres", "Redis",
  "Docker", "Kubernetes", "AWS", "tRPC", "OpenAI", "LangChain",
  "Vector DB", "Kafka", "Stripe"
];

function TerminalScreen({ mode = "running" }) {
  const isCrisis = mode === "crisis";
  const logs = isCrisis ? [...RUNNING_LOGS, ...CRISIS_LOGS] : RUNNING_LOGS;

  // metrics differ by state — for crisis show ticked-up + red
  const m = isCrisis ? {
    pods: 87, users: 1, cost: 487201, latency: "TIMEOUT",
    agents: 14, tokens: "12.4M", incidents: 7,
    confidence: 12, confidenceLabel: "12.0%", confidenceClass: "low"
  } : {
    pods: 23, users: 0, cost: 14820, latency: "412 ms",
    agents: 7, tokens: "1.8M", incidents: 0,
    confidence: 94, confidenceLabel: "94.0%", confidenceClass: "mid"
  };

  const phaseLabel = isCrisis ? "Cascade in progress" : "Provisioning GPU pool";
  const phaseProgress = isCrisis ? 100 : 78;
  const timelineLabel = isCrisis ? "incident response" : "gpu inference";
  const timelineProgress = isCrisis ? 100 : 78;
  const statusText = isCrisis ? "FAILING" : "RUNNING";

  return (
    <div className={`fa-artboard${isCrisis ? " crisis-bg" : ""}`}>
      {isCrisis && <div className="glitch-overlay" />}
      <section className={`terminal-shell${isCrisis ? " crisis" : ""}`}>
        <header className="topbar">
          <div className="window-controls" aria-hidden="true">
            <span className="dot red" />
            <span className="dot yellow" />
            <span className="dot green" />
          </div>
          <div className="title-stack">
            <span className="title">
              ai-dev-agent / walkpilot
              <span className="crumb">build a3f7c2</span>
              <span className="crumb">us-east-1</span>
              <span className="crumb" style={{color: isCrisis ? "var(--red)" : "var(--green)"}}>
                {isCrisis ? "● degraded" : "● prod"}
              </span>
            </span>
            <span className="subtitle">
              {isCrisis
                ? "final UI surface: walkpilot.local — 503 CASCADE"
                : "request: a dog walking scheduler"}
            </span>
          </div>
          <div className={`run-status ${isCrisis ? "failed" : "running"}`}>
            <span className="pulse" aria-hidden="true" />
            <span>{statusText}</span>
          </div>
        </header>

        <div className="workspace">
          <aside className="sidebar" aria-label="Build telemetry">
            <div className="panel">
              <span className="panel-label">User request</span>
              <div className="request-display">a dog walking scheduler</div>
            </div>

            <div className="panel">
              <span className="panel-label">Current phase</span>
              <strong className="phase">{phaseLabel}</strong>
              <div className="phase-meter" aria-hidden="true">
                <span className={isCrisis ? "" : "shimmer"} style={{ width: `${phaseProgress}%` }} />
              </div>
            </div>

            <div className="panel stack-panel">
              <span className="panel-label">Provisioned stack · {STACK_RUNNING.length}</span>
              <ul>
                {STACK_RUNNING.map((item, i) => (
                  <li key={item} className={i >= 11 ? "new" : ""}>{item}</li>
                ))}
                {isCrisis && <li className="new" style={{borderColor: "var(--red)", color: "var(--red)"}}>+ oncall-agent</li>}
                {!isCrisis && <span className="ghost">+ scanning...</span>}
              </ul>
            </div>

            <div className="panel metrics-panel">
              <span className="panel-label">Runtime metrics</span>
              <dl>
                <div><dt>Pods</dt><dd className={isCrisis ? "up" : ""}>{m.pods.toLocaleString()}</dd></div>
                <div><dt>Users</dt><dd>{m.users}</dd></div>
                <div><dt>Cost/mo</dt><dd className={isCrisis ? "up" : "warn"}>${m.cost.toLocaleString()}</dd></div>
                <div><dt>p95 action</dt><dd className={isCrisis ? "up" : "ok"}>{m.latency}</dd></div>
                <div><dt>Agents</dt><dd className={isCrisis ? "up" : ""}>{m.agents}</dd></div>
                <div><dt>Tokens</dt><dd>{m.tokens}</dd></div>
                <div><dt>Incidents</dt><dd className={isCrisis ? "up" : "ok"}>{m.incidents}</dd></div>
                <div><dt>p99 action</dt><dd className={isCrisis ? "up" : "warn"}>{isCrisis ? "∞" : "1.2 s"}</dd></div>
              </dl>
            </div>

            <div className="panel">
              <span className="panel-label">Agent confidence</span>
              <div className={`confidence-bar ${m.confidenceClass}`}>
                <span></span>
              </div>
              <div className="confidence-readout">
                <span style={{color: "var(--muted)"}}>{isCrisis ? "recalibrating…" : "stable"}</span>
                <span className={`val ${isCrisis ? "low" : "high"}`}>{m.confidenceLabel}</span>
              </div>
            </div>
          </aside>

          <section className="terminal-panel" aria-label="Terminal output">
            <div className="command-banner">
              <span className="prompt">$</span>
              <span>ai-dev-agent run --request "a dog walking scheduler" --interactive</span>
            </div>
            <div className="terminal-output" role="log" aria-live="polite">
              {logs.map((line, i) => <LogLine key={i} {...line} />)}
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
            <span>kafka lag {isCrisis ? "42s" : "0.2s"}</span>
            <span>{isCrisis ? "PAGER · oncall" : "interactive setup"}</span>
          </div>
        </footer>

        {isCrisis && (
          <div className="app-reveal crashed">
            <div className="app-chrome">
              <span>walkpilot.local</span>
              <span className="status-fail">503 CASCADE</span>
            </div>
            <div className="app-body">
              <h1>Schedule a walk</h1>
              <input value="walk Mr. Biscuit at 5pm" readOnly />
              <button className="failed">Failed</button>
              <p className="app-error">leash-knot-resolver: timeout after 30s</p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

window.TerminalScreen = TerminalScreen;
