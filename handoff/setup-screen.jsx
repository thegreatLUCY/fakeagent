/* global React */
const { useState, useMemo, useEffect } = React;

const STACK_OPTIONS = [
  "React", "Next.js", "Vue", "Svelte", "TypeScript", "Tailwind",
  "Supabase", "Postgres", "Prisma", "Redis", "MongoDB", "Docker",
  "Kubernetes", "Vercel", "AWS", "tRPC", "GraphQL", "Stripe",
  "Clerk", "OpenAI", "Groq", "LangChain", "Vector DB", "Kafka"
];

// Auto-recommended stack per chaos level — pre-selected with glow
const AUTO_REC = {
  realistic:  ["Next.js", "Postgres", "Vercel"],
  startup:    ["Next.js", "Supabase", "OpenAI", "Vercel", "Clerk"],
  enterprise: ["Next.js", "TypeScript", "Tailwind", "Postgres", "Redis", "Docker", "Kubernetes", "AWS", "tRPC", "OpenAI", "LangChain", "Vector DB", "Kafka"]
};

// Deprecated for the joke
const DEPRECATED = ["Vue"];

const CHAOS_OPTIONS = [
  {
    value: "realistic",
    label: "Realistic",
    desc: "Believable build. Smaller stack. Calmer collapse.",
    warn: null,
  },
  {
    value: "startup",
    label: "Startup Mode",
    desc: "Seed-stage overconfidence. Unnecessary agents. Cost warnings.",
    warn: "expect 1 cofounder argument",
  },
  {
    value: "enterprise",
    label: "Enterprise Nightmare",
    desc: "Kubernetes, GPUs, vector DB, SOC2, cloud bill explosion.",
    warn: "⚠ your CFO will be paged",
  }
];

function SetupScreen({ idea: ideaProp = "", chaos: chaosProp = "enterprise" }) {
  const [idea, setIdea] = useState(ideaProp);
  const [chaos, setChaos] = useState(chaosProp);
  const [selectedStack, setSelectedStack] = useState([]);
  const [customStack, setCustomStack] = useState("");

  // live "telemetry" counters that respond to chaos level
  const stack = useMemo(() => {
    const auto = AUTO_REC[chaos];
    const set = new Set([...auto, ...selectedStack]);
    return Array.from(set);
  }, [chaos, selectedStack]);

  const fakeMetrics = useMemo(() => {
    const base = stack.length;
    const agentsByChaos = { realistic: 1, startup: 3, enterprise: 7 };
    const costByChaos = { realistic: 42, startup: 487, enterprise: 14820 };
    const etaByChaos = { realistic: 8, startup: 14, enterprise: 23 };
    return {
      agents: agentsByChaos[chaos] + Math.floor(base / 5),
      services: base + (chaos === "enterprise" ? 4 : 0),
      cost: costByChaos[chaos] + base * 19,
      eta: etaByChaos[chaos],
      postmortems: chaos === "enterprise" ? Math.max(1, Math.floor(base / 3)) : 0,
      confidence: chaos === "enterprise" ? "99.7%" : chaos === "startup" ? "94.0%" : "82.1%",
    };
  }, [stack.length, chaos]);

  function toggleChip(item) {
    if (AUTO_REC[chaos].includes(item)) return; // can't deselect auto picks (joke)
    setSelectedStack(prev =>
      prev.includes(item) ? prev.filter(x => x !== item) : [...prev, item]
    );
  }

  return (
    <div className="fa-artboard">
      <div className="setup-shell">
        <div className="setup-bar">
          <span className="brand-mini">▮ ai-dev-agent</span>
          <div className="stats">
            <span>build <b>a3f7c2</b></span>
            <span>region <b>us-east-1</b></span>
            <span>SOC2 <b style={{color: "var(--orange)"}}>in progress</b></span>
            <span>uptime <b style={{color: "var(--green)"}}>99.97%</b></span>
          </div>
        </div>

        <div className="setup-hero">
          <h1>
            AI-dev-agent<span className="blink-cursor">&nbsp;</span>
          </h1>
          <div className="ver">
            <span className="ver-tag">v4.2.0-alpha.experimental.k8s</span>
            <span className="ver-trained">trained on 1.2T tokens of Stack Overflow regret</span>
          </div>
        </div>

        <p className="setup-tagline">
          Type a tiny app idea. Watch a confident AI agent <b>overengineer it</b> into a
          cloud-native incident. <b>Share the recording.</b>
        </p>

        <div className="setup-grid">
          <div className="setup-col">
            <h3>App idea <span className="hint">// 200 char max, dreams unlimited</span></h3>
            <input
              className="idea-input"
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
              placeholder="a dog walking scheduler"
              maxLength={200}
            />
            <div className="idea-example">
              <b>tip:</b> the smaller the idea, the bigger the incident.
            </div>

            <div style={{ height: 24 }}></div>

            <h3>
              Suggested stack
              <span className="hint">// pick any · auto-recs locked</span>
              <span className="badge-auto">auto · {AUTO_REC[chaos].length}</span>
            </h3>
            <div className="stack-chip-row">
              {STACK_OPTIONS.map(item => {
                const isAuto = AUTO_REC[chaos].includes(item);
                const isSel = isAuto || selectedStack.includes(item);
                const isDep = DEPRECATED.includes(item);
                let cls = "stack-chip";
                if (isAuto) cls += " auto-rec";
                else if (isSel) cls += " selected";
                if (isDep) cls += " deprecated";
                return (
                  <button
                    key={item}
                    type="button"
                    className={cls}
                    onClick={() => toggleChip(item)}
                  >
                    {item}
                  </button>
                );
              })}
            </div>
            <input
              className="stack-custom"
              value={customStack}
              onChange={(e) => setCustomStack(e.target.value)}
              placeholder="// or type your own, comma-separated"
            />

            <div style={{ height: 24 }}></div>

            <h3>Chaos level <span className="hint">// affects blast radius</span></h3>
            <div className="chaos-row">
              {CHAOS_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
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

            <div style={{ height: 16 }}></div>

            <div className="preview-panel">
              <h4>
                Will probably break
                <span style={{fontSize: 10, color: "var(--orange)"}}>FORECAST</span>
              </h4>
              <div className="preview-row">
                <span className="k">cascading failure</span>
                <span className="v up">87%</span>
              </div>
              <div className="preview-row">
                <span className="k">OOMKilled pod</span>
                <span className="v up">71%</span>
              </div>
              <div className="preview-row">
                <span className="k">forgotten env var</span>
                <span className="v up">94%</span>
              </div>
              <div className="preview-row">
                <span className="k">happy path completes</span>
                <span className="v ok">3%</span>
              </div>
            </div>
          </div>
        </div>

        <div className="submit-row">
          <a className="demo-link" href="#">or watch a prebuilt demo →</a>
          <button type="button" className="run-button">
            <span className="play-arrow"></span>
            Run agent
            <span className="eta">~{fakeMetrics.eta}s · ${(fakeMetrics.cost / 1000).toFixed(2)}k/mo</span>
          </button>
        </div>

        <div className="footer-strip">
          <span>streaming · us-east-1 → your browser</span>
          <span>last incident: 2 minutes ago</span>
          <span>by clicking Run you accept eventual consistency</span>
        </div>
      </div>
    </div>
  );
}

window.SetupScreen = SetupScreen;
