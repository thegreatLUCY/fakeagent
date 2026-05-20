const terminalOutput = document.getElementById("terminalOutput");
const terminalShell = document.getElementById("terminalShell");
const phaseText = document.getElementById("phaseText");
const phaseMeter = document.getElementById("phaseMeter");
const timelineFill = document.getElementById("timelineFill");
const timelineLabel = document.getElementById("timelineLabel");
const statusText = document.getElementById("statusText");
const runStatus = document.querySelector(".run-status");
const commandText = document.getElementById("commandText");
const subtitle = document.getElementById("subtitle");
const stackList = document.getElementById("stackList");
const podsMetric = document.getElementById("podsMetric");
const usersMetric = document.getElementById("usersMetric");
const costMetric = document.getElementById("costMetric");
const latencyMetric = document.getElementById("latencyMetric");
const appPreview = document.getElementById("appPreview");
const appStatus = document.getElementById("appStatus");
const noteInput = document.getElementById("noteInput");
const saveButton = document.getElementById("saveButton");
const replayButton = document.getElementById("replayButton");
const requestInput = document.getElementById("requestInput");
const runButton = document.getElementById("runButton");

const ANIMATION_SPEED = 1.75;

if ("scrollRestoration" in history) {
  history.scrollRestoration = "manual";
}

const phases = [
  "scope detection",
  "npm dependency acquisition",
  "container assembly",
  "kubernetes provisioning",
  "data platform expansion",
  "agent orchestration",
  "gpu inference activation",
  "ci/cd deployment",
  "observability and billing",
  "tiny app reveal",
  "catastrophic save path"
];

const state = {
  events: [],
  index: 0,
  timer: 0,
  clockMs: Date.UTC(2026, 4, 20, 10, 37, 4, 0),
  seed: 7,
  cost: 0,
  pods: 0,
  users: 0,
  latency: 0,
  stack: new Set(),
  running: false,
  requestText: "",
  questionIndex: 0,
  answers: []
};

const preflightQuestions = [
  {
    prompt: "Initialize git repository and conventional commit history?",
    choices: ["yes", "no"]
  },
  {
    prompt: "Generate Dockerfile and compose stack for local parity?",
    choices: ["yes", "use host runtime"]
  },
  {
    prompt: "Provision PostgreSQL and Redis for note persistence?",
    choices: ["yes", "not needed"]
  },
  {
    prompt: "Enable AI agent orchestration for architecture review?",
    choices: ["yes", "disable agents"]
  },
  {
    prompt: "Continue with production-ready cloud-native defaults?",
    choices: ["confirm", "minimal mode"]
  }
];

function random() {
  state.seed = (state.seed * 1664525 + 1013904223) >>> 0;
  return state.seed / 4294967296;
}

function pad(value, width = 2) {
  return String(value).padStart(width, "0");
}

function timestamp() {
  state.clockMs += 24 + Math.floor(random() * 260);
  const d = new Date(state.clockMs);
  return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}.${pad(d.getUTCMilliseconds(), 3)}`;
}

function money(value) {
  return `$${Math.round(value).toLocaleString("en-US")}`;
}

function latency(value) {
  if (typeof value === "string") {
    return value;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)} s`;
  }
  return `${value} ms`;
}

function addStack(items) {
  const list = Array.isArray(items) ? items : [items];
  for (const item of list) {
    if (!state.stack.has(item)) {
      state.stack.add(item);
      const li = document.createElement("li");
      li.textContent = item;
      stackList.appendChild(li);
    }
  }
}

function setMetrics(next) {
  if (next.pods !== undefined) state.pods = next.pods;
  if (next.users !== undefined) state.users = next.users;
  if (next.cost !== undefined) state.cost = next.cost;
  if (next.latency !== undefined) state.latency = next.latency;

  podsMetric.textContent = state.pods.toLocaleString("en-US");
  usersMetric.textContent = state.users.toLocaleString("en-US");
  costMetric.textContent = money(state.cost);
  latencyMetric.textContent = latency(state.latency);
}

function setPhase(label, progress) {
  phaseText.textContent = label;
  phaseMeter.style.width = `${Math.max(0, Math.min(progress, 100))}%`;
  timelineLabel.textContent = phases[Math.min(phases.length - 1, Math.floor((progress / 100) * phases.length))];
}

function e(level, text, opts = {}) {
  state.events.push({ level, text, ...opts });
}

function phase(label, progress, opts = {}) {
  e("info", `[SYSTEM] entering phase: ${label}`, {
    phase: label,
    progress,
    flash: true,
    pause: 360,
    ...opts
  });
}

function command(text, opts = {}) {
  e("cmd", `$ ${text}`, { pause: 420, command: text, ...opts });
}

function npmFetch(pkg, ms, extra = "") {
  const encoded = pkg.replace("/", "%2f");
  e("npm", `npm http fetch GET 200 https://registry.npmjs.org/${encoded} ${ms}ms ${extra}`.trim());
}

function buildEvents(requestText) {
  state.events = [];

  phase("scope detection", 2, { metrics: { pods: 0, users: 0, cost: 0, latency: 0 } });
  command(`ai-dev-agent scaffold --profile resolved --target notes-app --confidence production`);
  e("info", "[INFO] Parsing user intent: single-user CRUD notes app.");
  e("info", "[INFO] Requested surface area: Add Note.");
  e("info", "[INFO] Detected persistence requirement: maybe localStorage.");
  e("success", "[PLAN] Minimal path available: HTML input, Save button, array.");
  e("info", "[INFO] Upgrading implementation strategy for enterprise-grade maintainability.");
  e("ai", "[AI-ARCHITECT] A simple notes app deserves production-ready foundations.");
  e("warn", "[WARN] Single-user workload exceeds recommended orchestration threshold.");

  phase("npm dependency acquisition", 8, { stack: "React", metrics: { cost: 0, latency: 15 } });
  command("npm create vite@latest notes-app -- --template react-ts");
  e("npm", "Need to install the following packages: create-vite@7.0.4");
  npmFetch("create-vite", 91, "(cache miss)");
  npmFetch("@vitejs%2fplugin-react", 118, "(cache miss)");
  e("success", "Scaffolding project in ./notes-app");
  command("cd notes-app && npm install");
  for (const [pkg, ms] of [
    ["react", 82],
    ["react-dom", 88],
    ["vite", 114],
    ["typescript", 126],
    ["eslint", 173],
    ["@types%2freact", 97],
    ["@types%2freact-dom", 103],
    ["lucide-react", 86],
    ["zustand", 77]
  ]) {
    npmFetch(pkg, ms, "(cache miss)");
  }
  e("success", "added 191 packages, audited 192 packages in 7s");
  e("metrics", "[METRICS] Bundle size: 42.8 kB gzip. Active users: 0.");
  e("optimizer", "[OPTIMIZER] Optimization pass 1: added enterprise boundaries before code exists.");

  command("npm install express fastify koa hapi @nestjs/core @nestjs/common prisma @prisma/client pg redis ioredis bullmq zod superjson dotenv helmet cors pino openai langchain @qdrant/js-client prom-client opentelemetry-api");
  const enterprisePackages = [
    "express",
    "fastify",
    "koa",
    "@hapi%2fhapi",
    "@nestjs%2fcore",
    "@nestjs%2fcommon",
    "reflect-metadata",
    "rxjs",
    "prisma",
    "@prisma%2fclient",
    "pg",
    "redis",
    "ioredis",
    "bullmq",
    "zod",
    "superjson",
    "dotenv",
    "helmet",
    "cors",
    "pino",
    "openai",
    "langchain",
    "@qdrant%2fjs-client",
    "prom-client",
    "@opentelemetry%2fapi",
    "@opentelemetry%2fsdk-node",
    "@opentelemetry%2fexporter-trace-otlp-http",
    "graphql",
    "@apollo%2fserver",
    "kafkajs",
    "commander",
    "yaml",
    "bcrypt",
    "uuid",
    "nanoid",
    "date-fns"
  ];
  enterprisePackages.forEach((pkg, index) => npmFetch(pkg, 54 + Math.floor(random() * 360), index % 5 === 0 ? "(stale)" : "(cache miss)"));
  e("warn", "npm WARN ERESOLVE overriding peer dependency: react@19.0.0 requested by notes-ui-hydration-bridge@0.0.9");
  e("warn", "npm WARN deprecated left-pad-enterprise@4.2.0: replaced by @org/value-alignment-padding.");
  e("warn", "npm WARN deprecated request@2.88.2: request has been deprecated; installing anyway for legacy pipeline confidence.");
  e("success", "added 8,912 packages, audited 8,913 packages in 41s");
  e("info", "2,184 packages are looking for funding");
  e("warn", "147 vulnerabilities (12 low, 84 moderate, 38 high, 13 critical)");
  e("info", "[INFO] Vulnerabilities deferred to security microservice backlog.");

  phase("container assembly", 18, { stack: ["Node API", "PostgreSQL", "Redis", "Docker"], metrics: { pods: 0, users: 0, cost: 29, latency: 420 } });
  command("docker compose up -d postgres redis api web worker scheduler telemetry-gateway");
  for (const image of [
    "postgres:16-alpine",
    "redis:7-alpine",
    "node:22-alpine",
    "grafana/grafana:latest",
    "prom/prometheus:latest",
    "otel/opentelemetry-collector:latest",
    "qdrant/qdrant:v1.13.4"
  ]) {
    e("docker", `[+] Pulling ${image}`);
    e("docker", `[+] Downloaded ${image} sha256:${Math.floor(random() * 1e16).toString(16).padStart(16, "0")}`);
  }
  for (const container of [
    "notes-postgres-1",
    "notes-redis-1",
    "notes-api-1",
    "notes-web-1",
    "notes-worker-1",
    "notes-scheduler-1",
    "notes-telemetry-gateway-1"
  ]) {
    e("docker", `[+] Container ${container} Started`);
  }
  e("success", "[HEALTH] web: healthy, api: healthy, redis: healthy, postgres: healthy");
  e("optimizer", "[OPTIMIZER] Added 14 containers to improve startup speed.", { metrics: { cost: 380, latency: 47200 } });
  e("metrics", "[METRICS] Cold start estimate increased from 0.8s to 47.2s after optimization.");
  e("info", "[INFO] Marking optimization successful: startup now has measurable enterprise surface area.");

  phase("kubernetes provisioning", 30, { stack: "Kubernetes", metrics: { pods: 12, cost: 1760, latency: 1130 } });
  command("kind create cluster --name notes-prod-simulation --config infra/kind-ha.yaml");
  e("k8s", "Creating cluster notes-prod-simulation...");
  e("k8s", "Ensuring node image (kindest/node:v1.32.1)");
  for (let i = 1; i <= 6; i += 1) {
    e("k8s", `Preparing nodes: notes-control-plane-${i} Ready`);
  }
  e("success", "Kubernetes control plane is running at https://127.0.0.1:6443");
  command("kubectl create namespace notes-enterprise-prod");
  e("k8s", "namespace/notes-enterprise-prod created");
  command("kubectl apply -f k8s/base -f k8s/overlays/production-ready");
  const deployments = [
    "notes-web",
    "notes-api",
    "note-command-service",
    "note-query-service",
    "note-audit-service",
    "note-schema-registry",
    "note-migration-runner",
    "note-email-worker",
    "note-ontology-service",
    "note-compliance-gateway",
    "note-feature-flag-daemon",
    "note-session-affinity-proxy"
  ];
  deployments.forEach((name) => {
    e("k8s", `deployment.apps/${name} configured`);
    e("k8s", `service/${name} created`);
  });
  e("k8s", "horizontalpodautoscaler.autoscaling/notes-api configured min=12 max=400 targetCPU=3%");
  e("warn", "[WARN] current requests/sec: 0, desired replicas: 12.");
  e("ai", "[AI-ARCHITECT] Migrating note storage to distributed microservice mesh.");

  phase("data platform expansion", 44, { stack: ["Vector DB", "Event Bus"], metrics: { pods: 24, cost: 7210, latency: 2700 } });
  command("kubectl apply -f infra/postgres-ha.yaml -f infra/redis-cluster.yaml -f infra/vector-db.yaml");
  e("k8s", "statefulset.apps/postgres-primary created");
  e("k8s", "statefulset.apps/postgres-replica created");
  e("k8s", "statefulset.apps/redis-cluster created");
  for (let shard = 0; shard < 6; shard += 1) {
    e("docker", `[REDIS] shard=${shard} role=${shard % 2 === 0 ? "primary" : "replica"} status=syncing slots=${shard * 2731}-${(shard + 1) * 2731 - 1}`);
  }
  e("success", "[REDIS] cluster initialized: 6 shards, 18 sentinel processes, 0 keys.");
  e("info", "[POSTGRES] applying migration 001_create_notes_table.sql");
  e("info", "[POSTGRES] applying migration 002_add_tenant_id_for_future_enterprise.sql");
  e("info", "[POSTGRES] applying migration 047_note_event_cqrs_projection.sql");
  e("warn", "[POSTGRES] table notes contains 0 rows; vacuum strategy promoted to board discussion.");
  e("info", "[VECTOR] collection grocery_notes created size=1536 distance=Cosine");
  for (const note of ["buy milk", "buy oat milk maybe", "remember milk exists"]) {
    e("info", `[VECTOR] embedding grocery note seed "${note}" dims=1536 tokens=${4 + note.length}`);
  }
  e("success", "[VECTOR] indexed 3 grocery notes into high-availability semantic memory.");
  e("metrics", "[METRICS] Search recall: 100.00% on corpus of 3 grocery thoughts.");

  phase("agent orchestration", 57, { stack: "Agent Mesh", metrics: { pods: 38, cost: 13880, latency: 6100 } });
  command("node scripts/spawn-agents.mjs --squad architecture,sre,security,growth,monetization");
  const agentLines = [
    ["AI-PM", "Converting Add Note into a roadmap with six strategic pillars."],
    ["AI-ARCHITECT", "Question: should Note entity be event sourced?"],
    ["AI-SRE", "Recommendation: yes. Append-only CQRS enables rollback for accidental grocery intent."],
    ["AI-SECURITY", "Threat model includes malicious dairy payloads."],
    ["AI-GROWTH", "Notes can become a retention loop if every note triggers a lifecycle journey."],
    ["AI-MONETIZATION", "Free tier supports 1 note per month with enterprise SSO add-on."],
    ["AI-ARCHITECT", "Consensus reached: microservice mesh with note ontology sidecar."],
    ["AI-PM", "Updating success metric from 'save a note' to 'prove cloud-native maturity'."],
    ["AI-SRE", "High availability target set to 99.999% for 0 active users."],
    ["AI-SECURITY", "Generating SOC2 evidence for button click."],
    ["AI-ARCHITECT", "Delegating title casing to distributed normalization worker."],
    ["AI-SRE", "Adding chaos test that deletes the database during note save."]
  ];
  agentLines.forEach(([agent, message]) => e("ai", `[${agent}] ${message}`));
  e("warn", "[WARN] Agent quorum changed request scope from 1 component to 47 services.");
  e("info", "[INFO] Creating agent orchestration DAG: note.intent -> note.embeddings -> note.billing -> note.save -> note.audit -> note.thankyou");

  phase("gpu inference activation", 68, { stack: "GPU Inference", metrics: { pods: 47, cost: 48229, latency: 11300 } });
  command("kubectl apply -f infra/gpu-note-categorizer.yaml");
  e("k8s", "nodepool/gpu-notes-a100 provisioning requested region=us-east-1");
  e("cloud", "[CLOUD] capacity reservation approved: 8 x p5.48xlarge for multi-modal inference.");
  e("info", "[GPU] pulling image registry.local/notes/multimodal-categorizer:14.8GB");
  e("info", "[GPU] loading model note-intent-foundation-70b-grocery-adapter");
  e("success", "[GPU] CUDA context initialized on 8 devices.");
  e("optimizer", "[OPTIMIZER] Enabled multi-modal inference to reduce cognitive load.", { metrics: { pods: 55, cost: 64240, latency: 18900 } });
  e("metrics", "[METRICS] GPU memory increased by 312 GiB; throughput unchanged at 0 notes/sec.");
  e("warn", "[WARN] note categorization p95 latency increased from 11.3s to 18.9s after optimization.");
  e("info", "[INFO] Optimization accepted because the architecture diagram is now clearer.");

  phase("ci/cd deployment", 78, { stack: "CI/CD", metrics: { pods: 55, cost: 64240, latency: 18900 } });
  command('git add . && git commit -m "feat: production-ready notes platform"');
  e("success", "[main a13f00d] feat: production-ready notes platform");
  e("info", "384 files changed, 92418 insertions(+), 6 deletions(-)");
  command("gh workflow run release.yml --ref main");
  for (const job of [
    "lint-web",
    "lint-api",
    "unit-web",
    "unit-api",
    "contract-tests",
    "container-scan",
    "sbom",
    "terraform-plan",
    "helm-template",
    "canary-deploy",
    "chaos-readiness",
    "brand-sentiment-check"
  ]) {
    e("info", `[CI] ${job} queued`);
  }
  e("success", "[CI] 47/48 jobs passed");
  e("warn", "[CI] brand-sentiment-check warning: app contains no brand, only input.");
  command("helm upgrade --install notes-prod ./charts/notes --namespace notes-enterprise-prod --wait");
  e("k8s", "release notes-prod upgraded. STATUS: deployed");
  e("k8s", "canary rollout set to 1% traffic");
  e("metrics", "[METRICS] Canary traffic: 0 req/min. Confidence: mathematically undefined.");

  phase("observability and billing", 88, { stack: ["Monitoring", "Cloud"], metrics: { pods: 63, users: 0, cost: 64240, latency: 18900 } });
  command("terraform apply -auto-approve infra/cloud");
  const resources = [
    "aws_eks_cluster.notes",
    "aws_nat_gateway.notes[64]",
    "aws_db_instance.notes_writer",
    "aws_elasticache_replication_group.notes",
    "aws_opensearch_domain.note_semantics",
    "aws_prometheus_workspace.notes",
    "aws_grafana_workspace.notes",
    "aws_s3_bucket.note_audit_log_immutable",
    "aws_sagemaker_endpoint.note_categorizer_gpu"
  ];
  resources.forEach((resource) => e("cloud", `${resource}: Creation complete after ${2 + Math.floor(random() * 18)}s`));
  e("cloud", "[BILLING] Monthly infrastructure cost projected: $48,229");
  e("cloud", "[BILLING] Updated monthly infrastructure cost projected: $64,240");
  e("warn", "[WARN] Cost anomaly: 64 managed NAT gateways provisioned for note save redundancy.");
  e("metrics", "[GRAFANA] dashboard notes-overview imported uid=notes-ha-0-users");
  e("metrics", "[PROMETHEUS] scrape targets: 914. Active users: 0.");
  e("metrics", "[SLO] 99.999% availability objective initialized before first request.");
  e("warn", "[ALERT] Error budget consumed by readiness probes.");
  e("success", "[INFO] Deployment complete: enterprise-grade, scalable, cloud-native, high availability.");

  phase("tiny app reveal", 94, { metrics: { pods: 63, users: 1, cost: 64240, latency: 18900 } });
  command("open https://notes.local");
  e("info", "[INFO] Rendering final user interface.");
  e("success", "[UI] Mounted React root. Components rendered: AddNoteForm.");
  e("metrics", "[RUM] active sessions: 1. Active paying customers: 0.");
  e("info", "[INFO] The production-ready notes platform is ready for input.", { action: "showApp", pause: 850 });
  e("info", "[USER] types: buy milk", { action: "typeNote", pause: 1350 });
  e("info", "[USER] clicks Save", { action: "saveNote", pause: 560 });

  phase("catastrophic save path", 98, { metrics: { pods: 64, users: 1, cost: 64240, latency: 24000 } });
  e("info", "[API] POST /api/notes 202 Accepted correlation_id=note_req_00000001");
  e("ai", "[AI-CATEGORIZER] Classifying note \"buy milk\" with multi-modal grocery intent model.");
  e("info", "[VECTOR] upsert collection=grocery_notes id=note_0001 vector_dims=1536");
  e("docker", "[REDIS] MOVED 3999 10.43.2.18:6379");
  e("warn", "[REDIS] OOM command not allowed when used memory > maxmemory.");
  e("warn", "[POSTGRES] connection pool exhausted: max=800 idle=800 active=0 waiting=1.");
  e("error", "[POSTGRES] FATAL: remaining connection slots are reserved for non-replication superuser connections.");
  e("error", "[GPU] CUDA_ERROR_OUT_OF_MEMORY while evaluating dairy ontology.");
  e("k8s", "horizontalpodautoscaler.autoscaling/notes-api desiredReplicas=384 currentReplicas=64 reason=single note write spike");
  e("cloud", "[BILLING] Spend spike detected: +$8,913 in projected monthly burn over 11 seconds.");
  e("error", "UnhandledPromiseRejection: Cannot read properties of undefined (reading 'milk')");
  e("k8s", "pod/notes-api-6f9445cc7c-x2n8q CrashLoopBackOff");
  e("k8s", "pod/note-command-service-78d4cd8859-v9nzn CrashLoopBackOff");
  e("k8s", "pod/note-ontology-service-5cbb9b9954-r4bfg CrashLoopBackOff");
  e("k8s", "pod/gpu-categorizer-a100-0 Evicted: node had condition DiskPressure");
  e("warn", "[CI/CD] automatic rollback blocked: previous release also depends on note ontology sidecar.");
  e("error", "[SERVICE-MESH] circuit open: notes-api -> note-intent -> vector-db -> redis -> postgres -> notes-api.");
  e("fatal", "[FATAL] Application unavailable after saving one note.", { action: "crashApp", metrics: { pods: 384, cost: 73153, latency: "timeout" }, pause: 420 });
  e("fatal", "[FATAL] Final result: Add Note rendered. Notes saved: 0.");
  e("ai", "[AI-ARCHITECT] Incident follow-up: propose replacing notes with blockchain-backed eventually consistent sticky notes.");
  e("fatal", "[SYSTEM] run failed with exit code 137. Confidence remains high.", { action: "finish", progress: 100, pause: 900 });
}

function appendTerminalLine(level, text, opts = {}) {
  const row = document.createElement("div");
  row.className = `line ${level}${opts.flash ? " flash" : ""}${opts.extraClass ? ` ${opts.extraClass}` : ""}`;

  const time = document.createElement("span");
  time.className = "timestamp";
  time.textContent = timestamp();

  const message = document.createElement("span");
  message.className = "message";
  message.textContent = text;

  row.append(time, message);
  terminalOutput.appendChild(row);

  while (terminalOutput.children.length > 220) {
    terminalOutput.removeChild(terminalOutput.firstElementChild);
  }
  terminalOutput.scrollTop = terminalOutput.scrollHeight;
  return row;
}

function applyEvent(event) {
  if (event.phase) {
    setPhase(event.phase, event.progress ?? 0);
  }
  if (event.progress !== undefined) {
    timelineFill.style.width = `${Math.max(0, Math.min(event.progress, 100))}%`;
  }
  if (event.stack) {
    addStack(event.stack);
  }
  if (event.metrics) {
    setMetrics(event.metrics);
  }
  if (event.command) {
    commandText.textContent = event.command;
  }
  if (event.action) {
    actions[event.action]?.();
  }
  if (!event.text) {
    return;
  }

  appendTerminalLine(event.level, event.text, {
    flash: event.flash
  });
}

function appendQuestion(question) {
  appendTerminalLine("info", `? ${question.prompt}`, {
    extraClass: "question-line",
    flash: true
  });

  const row = document.createElement("div");
  row.className = "line info question-line";

  const time = document.createElement("span");
  time.className = "timestamp";
  time.textContent = timestamp();

  const choices = document.createElement("span");
  choices.className = "message choice-group";

  question.choices.forEach((choice) => {
    const button = document.createElement("button");
    button.className = "choice-button";
    button.type = "button";
    button.textContent = `> ${choice}`;
    button.addEventListener("click", () => selectQuestionChoice(choice, row));
    choices.appendChild(button);
  });

  row.append(time, choices);
  terminalOutput.appendChild(row);
  terminalOutput.scrollTop = terminalOutput.scrollHeight;
}

function selectQuestionChoice(choice, row) {
  if (!state.running) {
    return;
  }

  row.querySelectorAll("button").forEach((button) => {
    button.disabled = true;
  });
  row.querySelector(".message").textContent = `> ${choice}`;
  state.answers.push({
    prompt: preflightQuestions[state.questionIndex]?.prompt ?? "",
    choice
  });
  state.questionIndex += 1;

  window.setTimeout(() => {
    showNextQuestion();
  }, Math.round(360 * ANIMATION_SPEED));
}

function showNextQuestion() {
  if (!state.running) {
    return;
  }

  const question = preflightQuestions[state.questionIndex];
  if (question) {
    appendQuestion(question);
    return;
  }

  appendTerminalLine("success", "[CONFIG] Interactive profile resolved: enterprise-ready scaffold with production safeguards.");
  appendTerminalLine("warn", "[WARN] Minimal selections acknowledged; production-ready defaults retained by policy.");
  appendTerminalLine("info", "[INFO] Continuing with deterministic build plan.");
  buildEvents(state.requestText);
  state.timer = window.setTimeout(play, Math.round(700 * ANIMATION_SPEED));
}

function startPreflight() {
  commandText.textContent = `ai-dev-agent run --request ${JSON.stringify(state.requestText)} --interactive`;
  appendTerminalLine("cmd", `$ ai-dev-agent run --request ${JSON.stringify(state.requestText)} --interactive`);
  appendTerminalLine("info", "[INFO] Launching notes-app scaffold wizard.");
  appendTerminalLine("info", "[INFO] User selections will be mapped to production-ready implementation defaults.");
  window.setTimeout(showNextQuestion, Math.round(480 * ANIMATION_SPEED));
}

const actions = {
  showApp() {
    terminalShell.classList.add("app-focus");
    appPreview.classList.add("active");
    appStatus.textContent = "200 OK";
    subtitle.textContent = "final UI surface: Add Note";
  },
  typeNote() {
    noteInput.value = "";
    noteInput.focus();
    const text = "buy milk";
    [...text].forEach((char, index) => {
      window.setTimeout(() => {
        noteInput.value += char;
      }, index * 135);
    });
  },
  saveNote() {
    saveButton.classList.add("saving");
    saveButton.textContent = "Saving";
    window.setTimeout(() => {
      saveButton.textContent = "Saving...";
    }, 420);
  },
  crashApp() {
    terminalShell.classList.remove("app-focus");
    terminalShell.classList.add("crisis");
    appPreview.classList.add("crashed");
    appStatus.textContent = "503 CASCADE";
    saveButton.classList.remove("saving");
    saveButton.classList.add("failed");
    saveButton.textContent = "Failed";
    noteInput.setAttribute("disabled", "true");
    runStatus.classList.remove("ready");
    runStatus.classList.add("failed");
    statusText.textContent = "FAILING";
  },
  finish() {
    state.running = false;
    runStatus.classList.remove("ready");
    runStatus.classList.add("failed");
    statusText.textContent = "FAILED";
    timelineFill.style.width = "100%";
    timelineLabel.textContent = "crashed after buy milk";
  }
};

function delayFor(event) {
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
  } else if (event.level === "k8s" || event.level === "docker" || event.level === "npm") {
    delay = 46;
  }
  return Math.round(delay * ANIMATION_SPEED);
}

function play() {
  if (state.index >= state.events.length) {
    return;
  }
  const event = state.events[state.index];
  state.index += 1;
  applyEvent(event);
  if (event.progress === undefined) {
    const progress = (state.index / state.events.length) * 100;
    timelineFill.style.width = `${progress.toFixed(2)}%`;
  }
  state.timer = window.setTimeout(play, delayFor(event));
}

function resetRuntime() {
  window.clearTimeout(state.timer);
  const resetScroll = () => {
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  };
  resetScroll();
  window.setTimeout(resetScroll, 0);
  window.setTimeout(resetScroll, 250);
  state.index = 0;
  state.clockMs = Date.UTC(2026, 4, 20, 10, 37, 4, 0);
  state.seed = 7;
  state.cost = 0;
  state.pods = 0;
  state.users = 0;
  state.latency = 0;
  state.stack = new Set();
  state.requestText = "";
  state.questionIndex = 0;
  state.answers = [];
  terminalOutput.textContent = "";
  stackList.textContent = "";
  timelineFill.style.width = "0";
  setPhase("Scope detection", 0);
  setMetrics({ pods: 0, users: 0, cost: 0, latency: 0 });
  statusText.textContent = "RUNNING";
  runStatus.classList.remove("failed");
  terminalShell.classList.remove("app-focus", "crisis");
  appPreview.classList.remove("active", "crashed");
  appStatus.textContent = "200 OK";
  noteInput.removeAttribute("disabled");
  noteInput.value = "";
  saveButton.classList.remove("saving", "failed");
  saveButton.textContent = "Save";
}

function updateRunAvailability() {
  if (!state.running) {
    runButton.disabled = requestInput.value.trim().length === 0;
  }
}

function reset() {
  resetRuntime();
  state.running = false;
  state.events = [];
  requestInput.disabled = false;
  requestInput.value = "";
  updateRunAvailability();
  runStatus.classList.remove("failed");
  runStatus.classList.add("ready");
  statusText.textContent = "READY";
  setPhase("Awaiting request", 0);
  timelineLabel.textContent = "waiting for user input";
  subtitle.textContent = "awaiting prompt";
  commandText.textContent = "ai-dev-agent idle --await-request";
  requestInput.focus({ preventScroll: true });
}

function startSimulation() {
  const requestText = requestInput.value.trim();
  if (!requestText) {
    requestInput.focus();
    return;
  }

  resetRuntime();
  state.running = true;
  state.requestText = requestText;
  state.questionIndex = 0;
  state.answers = [];
  state.events = [];
  requestInput.value = requestText;
  requestInput.disabled = true;
  runButton.disabled = true;
  runStatus.classList.remove("ready", "failed");
  statusText.textContent = "RUNNING";
  setPhase("Preflight questions", 1);
  timelineLabel.textContent = "interactive setup";
  subtitle.textContent = `request: ${requestText}`;
  startPreflight();
}

runButton.addEventListener("click", startSimulation);
requestInput.addEventListener("input", updateRunAvailability);
requestInput.addEventListener("keydown", (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
    startSimulation();
  }
});
replayButton.addEventListener("click", reset);

reset();
