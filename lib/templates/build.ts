import type {
  AnimationEvent,
  ChaosLevel,
  GeneratedConfig,
  EventLevel
} from "../types";
import { getEndingProfile } from "./endings";

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

interface ChaosProfile {
  includeKubernetes: boolean;
  includeDataPlatform: boolean;
  includeAgents: boolean;
  includeGpu: boolean;
  includeCicdCloud: boolean;
  npmPackageCount: number;
  containerCount: number;
  microserviceCount: number;
  baselineCost: number;
  peakCost: number;
  peakPods: number;
  finalLatency: number;
  costSpike: number;
  agentLineCount: number;
}

const CHAOS_PROFILES: Record<ChaosLevel, ChaosProfile> = {
  realistic: {
    includeKubernetes: false,
    includeDataPlatform: false,
    includeAgents: true,
    includeGpu: false,
    includeCicdCloud: true,
    npmPackageCount: 14,
    containerCount: 4,
    microserviceCount: 3,
    baselineCost: 42,
    peakCost: 218,
    peakPods: 3,
    finalLatency: 4200,
    costSpike: 38,
    agentLineCount: 4
  },
  startup: {
    includeKubernetes: true,
    includeDataPlatform: true,
    includeAgents: true,
    includeGpu: false,
    includeCicdCloud: true,
    npmPackageCount: 26,
    containerCount: 8,
    microserviceCount: 7,
    baselineCost: 380,
    peakCost: 13880,
    peakPods: 38,
    finalLatency: 11800,
    costSpike: 3120,
    agentLineCount: 8
  },
  enterprise: {
    includeKubernetes: true,
    includeDataPlatform: true,
    includeAgents: true,
    includeGpu: true,
    includeCicdCloud: true,
    npmPackageCount: 36,
    containerCount: 14,
    microserviceCount: 12,
    baselineCost: 1760,
    peakCost: 73153,
    peakPods: 384,
    finalLatency: 24000,
    costSpike: 8913,
    agentLineCount: 12
  }
};

const PHASE_LABELS = {
  scope: "scope detection",
  npm: "npm dependency acquisition",
  container: "container assembly",
  kubernetes: "kubernetes provisioning",
  data: "data platform expansion",
  agents: "agent orchestration",
  gpu: "gpu inference activation",
  cicd: "ci/cd deployment",
  observability: "observability and billing",
  reveal: "final UI reveal",
  crash: "catastrophic action path"
};

const COMMON_FRAMEWORK_PACKAGES = [
  "react",
  "react-dom",
  "vite",
  "typescript",
  "eslint",
  "@types/react",
  "@types/react-dom",
  "lucide-react",
  "zustand"
];

const ENTERPRISE_PACKAGES = [
  "express",
  "fastify",
  "koa",
  "@hapi/hapi",
  "@nestjs/core",
  "@nestjs/common",
  "reflect-metadata",
  "rxjs",
  "prisma",
  "@prisma/client",
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
  "@qdrant/js-client",
  "prom-client",
  "@opentelemetry/api",
  "@opentelemetry/sdk-node",
  "@opentelemetry/exporter-trace-otlp-http",
  "graphql",
  "@apollo/server",
  "kafkajs",
  "commander",
  "yaml",
  "bcrypt",
  "uuid",
  "nanoid",
  "date-fns"
];

const DOCKER_IMAGES = [
  "postgres:16-alpine",
  "redis:7-alpine",
  "node:22-alpine",
  "grafana/grafana:latest",
  "prom/prometheus:latest",
  "otel/opentelemetry-collector:latest",
  "qdrant/qdrant:v1.13.4",
  "minio/minio:latest",
  "elastic/elasticsearch:8.13.0",
  "jaegertracing/all-in-one:latest"
];

function moneyDelta(profile: ChaosProfile, fraction: number): number {
  return Math.round(profile.baselineCost + (profile.peakCost - profile.baselineCost) * fraction);
}

function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 32) || "app";
}

function firstWord(s: string): string {
  const w = s.trim().split(/\s+/)[0] ?? s.trim();
  return w.replace(/[^A-Za-z0-9_]/g, "").toLowerCase() || "value";
}

function fillTemplate(
  template: string,
  vars: Record<string, string>
): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? `{${key}}`);
}

export function buildEvents(config: GeneratedConfig): AnimationEvent[] {
  const profile = CHAOS_PROFILES[config.chaosLevel] ?? CHAOS_PROFILES.startup;
  const rng = makeRng(seedFromString(`${config.appTitle}|${config.appIdea}`));
  const events: AnimationEvent[] = [];
  const appSlug = slug(config.appTitle);
  const ending = getEndingProfile(config.endingTemplate);

  const cascadeVars: Record<string, string> = {
    domain: ending.domainNoun,
    entity: ending.domainEntity,
    input: config.sampleInput,
    input_first_word: firstWord(config.sampleInput),
    title: config.appTitle,
    api: ending.apiPath,
    method: ending.apiVerb
  };

  const e = (level: EventLevel, text: string, opts: Partial<AnimationEvent> = {}) => {
    events.push({ level, text, ...opts });
  };

  const command = (text: string, opts: Partial<AnimationEvent> = {}) => {
    e("cmd", `$ ${text}`, { pause: 420, command: text, ...opts });
  };

  const npmFetch = (pkg: string, baseMs: number, extra = "") => {
    const ms = baseMs + Math.floor(rng() * 220);
    const encoded = pkg.replace("/", "%2f");
    e(
      "npm",
      `npm http fetch GET 200 https://registry.npmjs.org/${encoded} ${ms}ms ${extra}`.trim()
    );
  };

  const phase = (
    label: string,
    progress: number,
    opts: Partial<AnimationEvent> = {}
  ) => {
    e("info", `[SYSTEM] entering phase: ${label}`, {
      phase: label,
      progress,
      flash: true,
      pause: 360,
      ...opts
    });
  };

  // --- phase 1: scope ---
  phase(PHASE_LABELS.scope, 2, { metrics: { pods: 0, users: 0, cost: 0, latency: 0 } });
  command(
    `ai-dev-agent scaffold --profile resolved --target ${appSlug} --confidence production`
  );
  e("info", `[INFO] Parsing user intent: ${config.appIdea}.`);
  e("info", `[INFO] Requested surface area: ${config.finalUILabel}.`);
  e("info", "[INFO] Detected persistence requirement: maybe localStorage.");
  e(
    "success",
    `[PLAN] Minimal path available: HTML input, ${config.finalUILabel} button, array.`
  );
  e(
    "info",
    "[INFO] Upgrading implementation strategy for enterprise-grade maintainability."
  );
  e(
    "ai",
    `[AI-ARCHITECT] A simple ${ending.domainNoun} flow deserves production-ready foundations.`
  );
  e(
    "warn",
    "[WARN] Single-user workload exceeds recommended orchestration threshold."
  );

  // --- phase 2: npm ---
  phase(PHASE_LABELS.npm, 8, {
    stack: stackFromHint(config.suggestedStack, "framework"),
    metrics: { cost: 0, latency: 14 }
  });
  command(`npm create vite@latest ${appSlug} -- --template react-ts`);
  e("npm", "Need to install the following packages: create-vite@7.0.4");
  npmFetch("create-vite", 91, "(cache miss)");
  npmFetch("@vitejs/plugin-react", 118, "(cache miss)");
  e("success", `Scaffolding project in ./${appSlug}`);
  command(`cd ${appSlug} && npm install`);
  COMMON_FRAMEWORK_PACKAGES.forEach((pkg, idx) =>
    npmFetch(pkg, 70 + idx * 6, "(cache miss)")
  );
  e("success", "added 191 packages, audited 192 packages in 7s");
  e(
    "metrics",
    "[METRICS] Bundle size: 42.8 kB gzip. Active users: 0."
  );
  e(
    "optimizer",
    "[OPTIMIZER] Optimization pass 1: added enterprise boundaries before code exists."
  );

  if (profile.npmPackageCount > 10) {
    const enterprisePicks = ENTERPRISE_PACKAGES.slice(
      0,
      profile.npmPackageCount
    );
    command(`npm install ${enterprisePicks.join(" ")}`);
    enterprisePicks.forEach((pkg, idx) => {
      npmFetch(pkg, 64 + (idx % 6) * 18, idx % 5 === 0 ? "(stale)" : "(cache miss)");
    });
    e(
      "warn",
      "npm WARN ERESOLVE overriding peer dependency: react@19.0.0 requested by hydration-bridge@0.0.9"
    );
    e(
      "warn",
      "npm WARN deprecated left-pad-enterprise@4.2.0: replaced by @org/value-alignment-padding."
    );
    e(
      "success",
      `added ${(profile.npmPackageCount * 247).toLocaleString("en-US")} packages, audited ${(profile.npmPackageCount * 247 + 1).toLocaleString("en-US")} packages in 41s`
    );
    e("info", `${profile.npmPackageCount * 78} packages are looking for funding`);
    const vulns = config.chaosLevel === "enterprise" ? 147 : 38;
    e(
      "warn",
      `${vulns} vulnerabilities (${Math.floor(vulns * 0.12)} low, ${Math.floor(vulns * 0.5)} moderate, ${Math.floor(vulns * 0.28)} high, ${Math.floor(vulns * 0.1)} critical)`
    );
    e(
      "info",
      "[INFO] Vulnerabilities deferred to security microservice backlog."
    );
  }

  // --- phase 3: containers ---
  phase(PHASE_LABELS.container, 18, {
    stack: ["Node API", "PostgreSQL", "Redis", "Docker"],
    metrics: { pods: 0, users: 0, cost: profile.baselineCost, latency: 420 }
  });
  const containers = [
    "postgres",
    "redis",
    "api",
    "web",
    "worker",
    "scheduler",
    "telemetry-gateway",
    "auth-broker",
    "audit-sink",
    "feature-flag-daemon",
    "event-bus",
    "cron-runner",
    "config-server",
    "secrets-rotator"
  ].slice(0, profile.containerCount);
  command(`docker compose up -d ${containers.join(" ")}`);
  const imageCount = Math.min(profile.containerCount, DOCKER_IMAGES.length);
  for (let i = 0; i < imageCount; i += 1) {
    const image = DOCKER_IMAGES[i];
    e("docker", `[+] Pulling ${image}`);
    e(
      "docker",
      `[+] Downloaded ${image} sha256:${Math.floor(rng() * 1e16).toString(16).padStart(16, "0")}`
    );
  }
  containers.forEach((c) =>
    e("docker", `[+] Container ${appSlug}-${c}-1 Started`)
  );
  e(
    "success",
    `[HEALTH] ${containers.slice(0, 4).map((c) => `${c}: healthy`).join(", ")}`
  );
  e(
    "optimizer",
    `[OPTIMIZER] Added ${profile.containerCount} containers to improve startup speed.`,
    {
      metrics: {
        cost: moneyDelta(profile, 0.05),
        latency: 47200
      }
    }
  );
  e(
    "metrics",
    "[METRICS] Cold start estimate increased from 0.8s to 47.2s after optimization."
  );
  e(
    "info",
    "[INFO] Marking optimization successful: startup now has measurable enterprise surface area."
  );

  // --- phase 4: kubernetes (optional) ---
  if (profile.includeKubernetes) {
    phase(PHASE_LABELS.kubernetes, 30, {
      stack: "Kubernetes",
      metrics: {
        pods: Math.max(8, Math.floor(profile.peakPods * 0.04)),
        cost: moneyDelta(profile, 0.18),
        latency: 1130
      }
    });
    command(
      `kind create cluster --name ${appSlug}-prod-simulation --config infra/kind-ha.yaml`
    );
    e("k8s", `Creating cluster ${appSlug}-prod-simulation...`);
    e("k8s", "Ensuring node image (kindest/node:v1.32.1)");
    const cpCount = config.chaosLevel === "enterprise" ? 6 : 3;
    for (let i = 1; i <= cpCount; i += 1) {
      e("k8s", `Preparing nodes: ${appSlug}-control-plane-${i} Ready`);
    }
    e("success", "Kubernetes control plane is running at https://127.0.0.1:6443");
    command(`kubectl create namespace ${appSlug}-enterprise-prod`);
    e("k8s", `namespace/${appSlug}-enterprise-prod created`);
    command("kubectl apply -f k8s/base -f k8s/overlays/production-ready");
    const deployments = config.services.slice(0, profile.microserviceCount);
    deployments.forEach((name) => {
      e("k8s", `deployment.apps/${name} configured`);
      e("k8s", `service/${name} created`);
    });
    const hpaMin = config.chaosLevel === "enterprise" ? 12 : 4;
    const hpaMax = config.chaosLevel === "enterprise" ? 400 : 80;
    e(
      "k8s",
      `horizontalpodautoscaler.autoscaling/${appSlug}-api configured min=${hpaMin} max=${hpaMax} targetCPU=3%`
    );
    e(
      "warn",
      `[WARN] current requests/sec: 0, desired replicas: ${hpaMin}.`
    );
    e(
      "ai",
      `[AI-ARCHITECT] Migrating ${ending.domainNoun} storage to distributed microservice mesh.`
    );
  }

  // --- phase 5: data platform ---
  if (profile.includeDataPlatform) {
    phase(PHASE_LABELS.data, 44, {
      stack: ["Vector DB", "Event Bus"],
      metrics: {
        pods: Math.floor(profile.peakPods * 0.07),
        cost: moneyDelta(profile, 0.32),
        latency: 2700
      }
    });
    command(
      "kubectl apply -f infra/postgres-ha.yaml -f infra/redis-cluster.yaml -f infra/vector-db.yaml"
    );
    e("k8s", "statefulset.apps/postgres-primary created");
    e("k8s", "statefulset.apps/postgres-replica created");
    e("k8s", "statefulset.apps/redis-cluster created");
    const shardCount = config.chaosLevel === "enterprise" ? 6 : 3;
    for (let shard = 0; shard < shardCount; shard += 1) {
      e(
        "docker",
        `[REDIS] shard=${shard} role=${shard % 2 === 0 ? "primary" : "replica"} status=syncing slots=${shard * 2731}-${(shard + 1) * 2731 - 1}`
      );
    }
    e(
      "success",
      `[REDIS] cluster initialized: ${shardCount} shards, ${shardCount * 3} sentinel processes, 0 keys.`
    );
    e(
      "info",
      `[POSTGRES] applying migration 001_create_${ending.domainNoun}_table.sql`
    );
    e(
      "info",
      `[POSTGRES] applying migration 002_add_tenant_id_for_future_enterprise.sql`
    );
    if (config.chaosLevel === "enterprise") {
      e(
        "info",
        `[POSTGRES] applying migration 047_${ending.domainNoun}_event_cqrs_projection.sql`
      );
    }
    e(
      "warn",
      `[POSTGRES] table ${ending.domainNoun}s contains 0 rows; vacuum strategy promoted to board discussion.`
    );
    e(
      "info",
      `[VECTOR] collection ${ending.domainNoun}_index created size=1536 distance=Cosine`
    );
    e(
      "success",
      `[VECTOR] indexed 0 ${ending.domainNoun}s into high-availability semantic memory.`
    );
    e(
      "metrics",
      `[METRICS] Search recall: 100.00% on corpus of 0 ${ending.domainNoun}s.`
    );
  }

  // --- phase 6: agents ---
  if (profile.includeAgents) {
    phase(PHASE_LABELS.agents, 57, {
      stack: "Agent Mesh",
      metrics: {
        pods: Math.floor(profile.peakPods * 0.1),
        cost: moneyDelta(profile, 0.45),
        latency: 6100
      }
    });
    command(
      "node scripts/spawn-agents.mjs --squad architecture,sre,security,growth,monetization"
    );
    const agentPool: Array<[string, string]> = [
      ["AI-PM", `Converting ${config.finalUILabel} into a roadmap with six strategic pillars.`],
      ["AI-ARCHITECT", `Question: should the ${ending.domainEntity} entity be event sourced?`],
      ["AI-SRE", "Recommendation: yes. Append-only CQRS enables rollback for accidental user intent."],
      ["AI-SECURITY", `Threat model includes malicious ${ending.domainNoun} payloads.`],
      ["AI-GROWTH", `${ending.domainEntity}s can become a retention loop if every action triggers a lifecycle journey.`],
      ["AI-MONETIZATION", `Free tier supports 1 ${ending.domainNoun} per month with enterprise SSO add-on.`],
      ["AI-ARCHITECT", `Consensus reached: microservice mesh with ${ending.domainNoun} ontology sidecar.`],
      ["AI-PM", `Updating success metric from "${config.finalUILabel.toLowerCase()}" to "prove cloud-native maturity".`],
      ["AI-SRE", "High availability target set to 99.999% for 0 active users."],
      ["AI-SECURITY", `Generating SOC2 evidence for button click.`],
      ["AI-ARCHITECT", `Delegating ${ending.domainNoun} title casing to distributed normalization worker.`],
      ["AI-SRE", `Adding chaos test that deletes the database during ${ending.domainNoun} ${ending.apiVerb.toLowerCase()}.`]
    ];
    const agentLines = agentPool.slice(0, profile.agentLineCount);
    agentLines.forEach(([agent, message]) => e("ai", `[${agent}] ${message}`));
    const services = config.services.slice(0, profile.microserviceCount);
    e(
      "warn",
      `[WARN] Agent quorum changed request scope from 1 component to ${Math.max(services.length * 4, 12)} services.`
    );
    e(
      "info",
      `[INFO] Creating agent orchestration DAG: ${ending.domainNoun}.intent -> ${ending.domainNoun}.embeddings -> ${ending.domainNoun}.billing -> ${ending.domainNoun}.${ending.apiVerb.toLowerCase()} -> ${ending.domainNoun}.audit -> ${ending.domainNoun}.thankyou`
    );
  }

  // --- phase 7: gpu inference ---
  if (profile.includeGpu) {
    phase(PHASE_LABELS.gpu, 68, {
      stack: "GPU Inference",
      metrics: {
        pods: Math.floor(profile.peakPods * 0.12),
        cost: moneyDelta(profile, 0.66),
        latency: 11300
      }
    });
    command(`kubectl apply -f infra/gpu-${ending.domainNoun}-categorizer.yaml`);
    e(
      "k8s",
      "nodepool/gpu-a100 provisioning requested region=us-east-1"
    );
    e(
      "cloud",
      "[CLOUD] capacity reservation approved: 8 x p5.48xlarge for multi-modal inference."
    );
    e(
      "info",
      `[GPU] pulling image registry.local/${ending.domainNoun}/multimodal-categorizer:14.8GB`
    );
    e(
      "info",
      `[GPU] loading model ${ending.domainNoun}-intent-foundation-70b-adapter`
    );
    e("success", "[GPU] CUDA context initialized on 8 devices.");
    e(
      "optimizer",
      "[OPTIMIZER] Enabled multi-modal inference to reduce cognitive load.",
      {
        metrics: {
          pods: Math.floor(profile.peakPods * 0.14),
          cost: moneyDelta(profile, 0.88),
          latency: 18900
        }
      }
    );
    e(
      "metrics",
      `[METRICS] GPU memory increased by 312 GiB; throughput unchanged at 0 ${ending.domainNoun}s/sec.`
    );
    e(
      "warn",
      "[WARN] categorization p95 latency increased from 11.3s to 18.9s after optimization."
    );
    e(
      "info",
      "[INFO] Optimization accepted because the architecture diagram is now clearer."
    );
  }

  // --- phase 8: CI/CD ---
  if (profile.includeCicdCloud) {
    phase(PHASE_LABELS.cicd, 78, {
      stack: "CI/CD",
      metrics: {
        pods: Math.floor(profile.peakPods * 0.14),
        cost: profile.peakCost,
        latency: profile.finalLatency
      }
    });
    command(
      `git add . && git commit -m "feat: production-ready ${ending.domainNoun} platform"`
    );
    e(
      "success",
      `[main a13f00d] feat: production-ready ${ending.domainNoun} platform`
    );
    const changedFiles = config.chaosLevel === "enterprise" ? 384 : 96;
    const insertions = changedFiles * 240;
    e("info", `${changedFiles} files changed, ${insertions.toLocaleString("en-US")} insertions(+), 6 deletions(-)`);
    command("gh workflow run release.yml --ref main");
    const jobs = [
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
    ].slice(0, config.chaosLevel === "realistic" ? 6 : 12);
    jobs.forEach((job) => e("info", `[CI] ${job} queued`));
    e("success", `[CI] ${jobs.length - 1}/${jobs.length} jobs passed`);
    if (config.chaosLevel !== "realistic") {
      e(
        "warn",
        "[CI] brand-sentiment-check warning: app contains no brand, only input."
      );
      command(
        `helm upgrade --install ${appSlug}-prod ./charts/${appSlug} --namespace ${appSlug}-enterprise-prod --wait`
      );
      e("k8s", `release ${appSlug}-prod upgraded. STATUS: deployed`);
      e("k8s", "canary rollout set to 1% traffic");
      e(
        "metrics",
        "[METRICS] Canary traffic: 0 req/min. Confidence: mathematically undefined."
      );
    }

    // observability + cloud billing
    phase(PHASE_LABELS.observability, 88, {
      stack: ["Monitoring", "Cloud"],
      metrics: {
        pods: Math.floor(profile.peakPods * 0.16),
        users: 0,
        cost: profile.peakCost,
        latency: profile.finalLatency
      }
    });
    if (config.chaosLevel !== "realistic") {
      command("terraform apply -auto-approve infra/cloud");
      const resources = [
        `aws_eks_cluster.${ending.domainNoun}`,
        `aws_nat_gateway.${ending.domainNoun}[64]`,
        `aws_db_instance.${ending.domainNoun}_writer`,
        `aws_elasticache_replication_group.${ending.domainNoun}`,
        `aws_opensearch_domain.${ending.domainNoun}_semantics`,
        `aws_prometheus_workspace.${ending.domainNoun}`,
        `aws_grafana_workspace.${ending.domainNoun}`,
        `aws_s3_bucket.${ending.domainNoun}_audit_log_immutable`,
        `aws_sagemaker_endpoint.${ending.domainNoun}_categorizer_gpu`
      ].slice(0, config.chaosLevel === "enterprise" ? 9 : 5);
      resources.forEach((r) =>
        e(
          "cloud",
          `${r}: Creation complete after ${2 + Math.floor(rng() * 18)}s`
        )
      );
      e(
        "cloud",
        `[BILLING] Monthly infrastructure cost projected: $${moneyDelta(profile, 0.66).toLocaleString("en-US")}`
      );
      e(
        "cloud",
        `[BILLING] Updated monthly infrastructure cost projected: $${profile.peakCost.toLocaleString("en-US")}`
      );
      if (config.chaosLevel === "enterprise") {
        e(
          "warn",
          `[WARN] Cost anomaly: 64 managed NAT gateways provisioned for ${ending.domainNoun} redundancy.`
        );
      }
    } else {
      e(
        "cloud",
        `[BILLING] Monthly infrastructure cost projected: $${profile.peakCost.toLocaleString("en-US")}`
      );
    }
    e(
      "metrics",
      `[GRAFANA] dashboard ${ending.domainNoun}-overview imported uid=${ending.domainNoun}-ha-0-users`
    );
    e(
      "metrics",
      `[PROMETHEUS] scrape targets: ${config.chaosLevel === "enterprise" ? 914 : 142}. Active users: 0.`
    );
    e(
      "metrics",
      "[SLO] 99.999% availability objective initialized before first request."
    );
    e("warn", "[ALERT] Error budget consumed by readiness probes.");
    e(
      "success",
      "[INFO] Deployment complete: enterprise-grade, scalable, cloud-native, high availability."
    );
  }

  // --- phase 9: reveal ---
  phase(PHASE_LABELS.reveal, 94, {
    metrics: {
      pods: Math.floor(profile.peakPods * 0.16) || 1,
      users: 1,
      cost: profile.peakCost,
      latency: profile.finalLatency
    }
  });
  command(`open https://${appSlug}.local`);
  e("info", "[INFO] Rendering final user interface.");
  e(
    "success",
    `[UI] Mounted React root. Components rendered: ${ending.domainEntity}Form.`
  );
  e(
    "metrics",
    "[RUM] active sessions: 1. Active paying customers: 0."
  );
  e("info", `[INFO] The production-ready ${ending.domainNoun} platform is ready for input.`, {
    action: "showApp",
    pause: 850
  });
  e("info", `[USER] types: ${config.sampleInput}`, {
    action: "typeInput",
    pause: 1350
  });
  e("info", `[USER] clicks ${config.finalUILabel}`, {
    action: "triggerAction",
    pause: 560
  });

  // --- phase 10: crash ---
  phase(PHASE_LABELS.crash, 98, {
    metrics: {
      pods: Math.max(1, Math.floor(profile.peakPods * 0.17)),
      users: 1,
      cost: profile.peakCost,
      latency: profile.finalLatency + 5000
    }
  });
  e(
    "info",
    `[API] ${ending.apiVerb} ${ending.apiPath} 202 Accepted correlation_id=${ending.domainNoun}_req_00000001`
  );
  ending.crashEvents.forEach((evt) =>
    e(evt.level, fillTemplate(evt.template, cascadeVars))
  );
  if (profile.includeKubernetes) {
    const desired = profile.peakPods;
    const current = Math.max(1, Math.floor(profile.peakPods * 0.17));
    e(
      "k8s",
      `horizontalpodautoscaler.autoscaling/${appSlug}-api desiredReplicas=${desired} currentReplicas=${current} reason=single ${ending.domainNoun} ${ending.apiVerb.toLowerCase()} spike`
    );
  }
  if (profile.includeCicdCloud && config.chaosLevel !== "realistic") {
    e(
      "cloud",
      `[BILLING] Spend spike detected: +$${profile.costSpike.toLocaleString("en-US")} in projected monthly burn over 11 seconds.`
    );
  }
  e(
    "warn",
    `[CI/CD] automatic rollback blocked: previous release also depends on ${ending.domainNoun} ontology sidecar.`
  );
  e(
    "error",
    `[SERVICE-MESH] circuit open: ${appSlug}-api -> ${ending.domainNoun}-intent -> vector-db -> redis -> postgres -> ${appSlug}-api.`
  );
  e("fatal", `[FATAL] ${config.failureLine}`, {
    action: "crashApp",
    metrics: {
      pods: profile.peakPods,
      cost: profile.peakCost + profile.costSpike,
      latency: "timeout"
    },
    pause: 420
  });
  e(
    "fatal",
    `[FATAL] Final result: ${config.finalUILabel} rendered. ${ending.domainEntity}s saved: 0.`
  );
  e(
    "ai",
    `[AI-ARCHITECT] Incident follow-up: propose replacing ${ending.domainNoun}s with blockchain-backed eventually consistent stickies.`
  );
  e(
    "fatal",
    "[SYSTEM] run failed with exit code 137. Confidence remains high.",
    { action: "finish", progress: 100, pause: 900 }
  );

  return events;
}

function stackFromHint(hint: string, fallback: string): string {
  if (!hint) return fallback;
  const first = hint.split(/[,;]+/)[0]?.trim();
  return first || fallback;
}
