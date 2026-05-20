import type { EndingTemplate } from "../types";

export interface EndingProfile {
  apiPath: string;
  apiVerb: "POST" | "PUT" | "GET" | "DELETE";
  domainNoun: string;
  domainEntity: string;
  inputPlaceholder: string;
  crashEvents: Array<{
    level:
      | "info"
      | "ai"
      | "docker"
      | "k8s"
      | "warn"
      | "error"
      | "metrics"
      | "cloud";
    template: string;
  }>;
  closingFatal: string;
}

const COMMON_CASCADE: EndingProfile["crashEvents"] = [
  {
    level: "docker",
    template: "[REDIS] MOVED 3999 10.43.2.18:6379"
  },
  {
    level: "warn",
    template: "[REDIS] OOM command not allowed when used memory > maxmemory."
  },
  {
    level: "warn",
    template:
      "[POSTGRES] connection pool exhausted: max=800 idle=800 active=0 waiting=1."
  },
  {
    level: "error",
    template:
      "[POSTGRES] FATAL: remaining connection slots are reserved for non-replication superuser connections."
  }
];

export const ENDING_PROFILES: Record<EndingTemplate, EndingProfile> = {
  save_form_crash: {
    apiPath: "/api/items",
    apiVerb: "POST",
    domainNoun: "item",
    domainEntity: "Item",
    inputPlaceholder: "Type here…",
    crashEvents: [
      {
        level: "ai",
        template:
          '[AI-CATEGORIZER] Classifying "{input}" with multi-modal entity intent model.'
      },
      {
        level: "info",
        template:
          "[VECTOR] upsert collection={domain}_index id={domain}_0001 vector_dims=1536"
      },
      ...COMMON_CASCADE,
      {
        level: "error",
        template:
          "UnhandledPromiseRejection: Cannot read properties of undefined (reading '{input_first_word}')"
      },
      {
        level: "k8s",
        template:
          "pod/{domain}-api-6f9445cc7c-x2n8q CrashLoopBackOff"
      },
      {
        level: "k8s",
        template:
          "pod/{domain}-command-service-78d4cd8859-v9nzn CrashLoopBackOff"
      }
    ],
    closingFatal: "Application unavailable after saving one {domain}."
  },
  checkbox_crash: {
    apiPath: "/api/tasks/{id}/complete",
    apiVerb: "PUT",
    domainNoun: "task",
    domainEntity: "Task",
    inputPlaceholder: "task name",
    crashEvents: [
      {
        level: "ai",
        template:
          '[AI-PROGRESS] Inferring completion semantics for "{input}" via behavioral telemetry.'
      },
      {
        level: "info",
        template:
          "[EVENT-BUS] publish topic=task.completed partition=0 attempts=14"
      },
      ...COMMON_CASCADE,
      {
        level: "error",
        template:
          "UnhandledPromiseRejection: Cannot mark complete: task already exists in terminal state graph."
      },
      {
        level: "k8s",
        template: "pod/task-state-projector-7c9d4f-q8x5k CrashLoopBackOff"
      },
      {
        level: "k8s",
        template:
          "pod/completion-audit-sidecar-5fb88-z2lp7 CrashLoopBackOff"
      }
    ],
    closingFatal: "Application unavailable after completing one {domain}."
  },
  login_crash: {
    apiPath: "/api/auth/session",
    apiVerb: "POST",
    domainNoun: "session",
    domainEntity: "Login",
    inputPlaceholder: "you@example.com",
    crashEvents: [
      {
        level: "ai",
        template:
          '[AI-IDENTITY] Resolving identity graph for "{input}" across 14 federated providers.'
      },
      {
        level: "info",
        template:
          "[OAUTH] issuing tokens scope=read:everything audience=identity-mesh"
      },
      ...COMMON_CASCADE,
      {
        level: "error",
        template:
          "[SECURITY] Zero-trust attestation rejected own request: device posture unknown."
      },
      {
        level: "k8s",
        template: "pod/identity-broker-7c9d4f-q8x5k CrashLoopBackOff"
      },
      {
        level: "k8s",
        template: "pod/session-affinity-mesh-5fb88-z2lp7 CrashLoopBackOff"
      }
    ],
    closingFatal: "Application unavailable after authenticating one user."
  },
  upload_crash: {
    apiPath: "/api/uploads",
    apiVerb: "POST",
    domainNoun: "upload",
    domainEntity: "File",
    inputPlaceholder: "filename.png",
    crashEvents: [
      {
        level: "ai",
        template:
          '[AI-CLASSIFIER] Multi-modal scan of "{input}" against 47 content policies.'
      },
      {
        level: "info",
        template:
          "[STORAGE] multipart upload bucket=uploads-immutable parts=312 region=us-east-1"
      },
      ...COMMON_CASCADE,
      {
        level: "error",
        template:
          "[STORAGE] PutObject denied: KMS key rotation in progress for one-time upload."
      },
      {
        level: "k8s",
        template: "pod/upload-virus-scanner-7c9d4f-q8x5k CrashLoopBackOff"
      },
      {
        level: "k8s",
        template: "pod/upload-cdn-invalidator-5fb88-z2lp7 CrashLoopBackOff"
      }
    ],
    closingFatal: "Application unavailable after one upload."
  },
  search_crash: {
    apiPath: "/api/search",
    apiVerb: "GET",
    domainNoun: "query",
    domainEntity: "Search",
    inputPlaceholder: "Search…",
    crashEvents: [
      {
        level: "ai",
        template:
          '[AI-RETRIEVAL] Hybrid retrieval for "{input}" across BM25 + dense + sparse vectors.'
      },
      {
        level: "info",
        template:
          "[VECTOR] hybrid search collection=corpus dims=1536 top_k=4096 reranker=cross-encoder-xl"
      },
      ...COMMON_CASCADE,
      {
        level: "error",
        template:
          "[SEARCH] OpenSearch shard rebalance triggered by one query."
      },
      {
        level: "k8s",
        template: "pod/reranker-gpu-7c9d4f-q8x5k Evicted: node had condition MemoryPressure"
      },
      {
        level: "k8s",
        template: "pod/query-planner-5fb88-z2lp7 CrashLoopBackOff"
      }
    ],
    closingFatal: "Application unavailable after one search query."
  },
  send_message_crash: {
    apiPath: "/api/messages",
    apiVerb: "POST",
    domainNoun: "message",
    domainEntity: "Message",
    inputPlaceholder: "Write a message…",
    crashEvents: [
      {
        level: "ai",
        template:
          '[AI-MODERATION] Multi-modal moderation pass on "{input}" with 14 policy lenses.'
      },
      {
        level: "info",
        template:
          "[EVENT-BUS] publish topic=message.outbound partitions=64 dlq=enabled"
      },
      ...COMMON_CASCADE,
      {
        level: "error",
        template:
          "[DELIVERY] webhook fan-out exceeded outbound concurrency budget on first message."
      },
      {
        level: "k8s",
        template: "pod/message-fanout-7c9d4f-q8x5k CrashLoopBackOff"
      },
      {
        level: "k8s",
        template: "pod/message-receipt-projector-5fb88-z2lp7 CrashLoopBackOff"
      }
    ],
    closingFatal: "Application unavailable after sending one {domain}."
  },
  checkout_crash: {
    apiPath: "/api/orders",
    apiVerb: "POST",
    domainNoun: "order",
    domainEntity: "Order",
    inputPlaceholder: "card • exp • cvc",
    crashEvents: [
      {
        level: "ai",
        template:
          '[AI-FRAUD] Adversarial fraud model scored "{input}" against 312 features.'
      },
      {
        level: "info",
        template:
          "[BILLING] payment intent created amount=0.01 currency=USD risk_score=0.98"
      },
      ...COMMON_CASCADE,
      {
        level: "error",
        template:
          "[PAYMENT] gateway returned 402 Payment Required after first authorization."
      },
      {
        level: "k8s",
        template: "pod/checkout-saga-orchestrator-7c9d4f-q8x5k CrashLoopBackOff"
      },
      {
        level: "k8s",
        template: "pod/ledger-double-entry-projector-5fb88-z2lp7 CrashLoopBackOff"
      }
    ],
    closingFatal: "Application unavailable after one checkout attempt."
  },
  report_crash: {
    apiPath: "/api/reports/generate",
    apiVerb: "POST",
    domainNoun: "report",
    domainEntity: "Report",
    inputPlaceholder: "Report name",
    crashEvents: [
      {
        level: "ai",
        template:
          '[AI-INSIGHTS] Generating narrative for "{input}" via 70B analyst persona model.'
      },
      {
        level: "info",
        template:
          "[WAREHOUSE] dispatch query plan estimated rows=1, fan_out=812 nodes"
      },
      ...COMMON_CASCADE,
      {
        level: "error",
        template:
          "[WAREHOUSE] Snowflake credits exhausted while paginating zero rows."
      },
      {
        level: "k8s",
        template: "pod/report-renderer-headless-7c9d4f-q8x5k CrashLoopBackOff"
      },
      {
        level: "k8s",
        template: "pod/narrative-llm-summarizer-5fb88-z2lp7 Evicted: node had condition DiskPressure"
      }
    ],
    closingFatal: "Application unavailable after generating one {domain}."
  },
  dashboard_crash: {
    apiPath: "/api/dashboards/widgets",
    apiVerb: "GET",
    domainNoun: "widget",
    domainEntity: "Dashboard",
    inputPlaceholder: "Dashboard name",
    crashEvents: [
      {
        level: "ai",
        template:
          '[AI-LAYOUT] Optimizing "{input}" widget arrangement against 14 cognitive load heuristics.'
      },
      {
        level: "info",
        template:
          "[METRICS] scrape targets active=914 cardinality_explosion_pending=true"
      },
      ...COMMON_CASCADE,
      {
        level: "error",
        template:
          "[GRAFANA] dashboard panel exceeded 60s render deadline for one tile."
      },
      {
        level: "k8s",
        template: "pod/widget-renderer-7c9d4f-q8x5k CrashLoopBackOff"
      },
      {
        level: "k8s",
        template: "pod/dashboard-personalization-svc-5fb88-z2lp7 CrashLoopBackOff"
      }
    ],
    closingFatal: "Application unavailable after rendering one dashboard."
  },
  calendar_crash: {
    apiPath: "/api/events",
    apiVerb: "POST",
    domainNoun: "event",
    domainEntity: "Event",
    inputPlaceholder: "Dentist 3pm",
    crashEvents: [
      {
        level: "ai",
        template:
          '[AI-SCHEDULER] Resolving "{input}" across 312 free/busy graphs and timezone graphs.'
      },
      {
        level: "info",
        template:
          "[CALDAV] propagating event to 14 federated mirrors, awaiting 3 quorums"
      },
      ...COMMON_CASCADE,
      {
        level: "error",
        template:
          "[SCHEDULER] CRDT merge conflict detected on event with no participants."
      },
      {
        level: "k8s",
        template: "pod/calendar-sync-sidecar-7c9d4f-q8x5k CrashLoopBackOff"
      },
      {
        level: "k8s",
        template: "pod/event-conflict-resolver-5fb88-z2lp7 CrashLoopBackOff"
      }
    ],
    closingFatal: "Application unavailable after creating one {domain}."
  },
  booking_crash: {
    apiPath: "/api/bookings",
    apiVerb: "POST",
    domainNoun: "booking",
    domainEntity: "Booking",
    inputPlaceholder: "Tuesday 4pm",
    crashEvents: [
      {
        level: "ai",
        template:
          '[AI-MATCH] Matching "{input}" against availability lattice with 1.2B latent slots.'
      },
      {
        level: "info",
        template:
          "[SCHEDULER] reserving timeslot via two-phase commit across 6 regions"
      },
      ...COMMON_CASCADE,
      {
        level: "error",
        template:
          "[SCHEDULER] Distributed scheduling consistency check failed after one booking request."
      },
      {
        level: "k8s",
        template: "pod/booking-saga-7c9d4f-q8x5k CrashLoopBackOff"
      },
      {
        level: "k8s",
        template: "pod/availability-projector-5fb88-z2lp7 CrashLoopBackOff"
      }
    ],
    closingFatal: "Application unavailable after one {domain}."
  },
  profile_update_crash: {
    apiPath: "/api/profile",
    apiVerb: "PUT",
    domainNoun: "profile",
    domainEntity: "Profile",
    inputPlaceholder: "Display name",
    crashEvents: [
      {
        level: "ai",
        template:
          '[AI-IDENTITY] Re-attesting "{input}" against 18 downstream identity caches.'
      },
      {
        level: "info",
        template:
          "[EVENT-BUS] profile.updated -> 47 consumers, replay window 48h"
      },
      ...COMMON_CASCADE,
      {
        level: "error",
        template:
          "[GDPR] right-to-rectification pipeline blocked by audit immutability."
      },
      {
        level: "k8s",
        template: "pod/profile-projector-7c9d4f-q8x5k CrashLoopBackOff"
      },
      {
        level: "k8s",
        template: "pod/identity-cache-invalidator-5fb88-z2lp7 CrashLoopBackOff"
      }
    ],
    closingFatal: "Application unavailable after updating one {domain}."
  },
  recommendation_crash: {
    apiPath: "/api/recommendations",
    apiVerb: "POST",
    domainNoun: "recommendation",
    domainEntity: "Recommendation",
    inputPlaceholder: "user_id or query",
    crashEvents: [
      {
        level: "ai",
        template:
          '[AI-RANKER] Re-ranking candidates for "{input}" with 0 historical signals.'
      },
      {
        level: "info",
        template:
          "[FEATURE-STORE] online materialization: 4,812 features, freshness 32ms"
      },
      ...COMMON_CASCADE,
      {
        level: "error",
        template:
          "[RANKER] cold start: recommendation diversity score is mathematically undefined."
      },
      {
        level: "k8s",
        template: "pod/recommendation-ranker-gpu-7c9d4f-q8x5k Evicted: node had condition MemoryPressure"
      },
      {
        level: "k8s",
        template: "pod/feature-materialization-svc-5fb88-z2lp7 CrashLoopBackOff"
      }
    ],
    closingFatal: "Application unavailable after one {domain} request."
  },
  map_crash: {
    apiPath: "/api/routes",
    apiVerb: "POST",
    domainNoun: "route",
    domainEntity: "Map",
    inputPlaceholder: "From → To",
    crashEvents: [
      {
        level: "ai",
        template:
          '[AI-ROUTING] Optimizing "{input}" against 312 traffic graphs and weather feeds.'
      },
      {
        level: "info",
        template:
          "[TILES] vector tile fetch z=22 x=… y=… cache_miss=true cdn_misroute=true"
      },
      ...COMMON_CASCADE,
      {
        level: "error",
        template:
          "[ROUTING] OSRM solver returned -infinity for trip of length zero."
      },
      {
        level: "k8s",
        template: "pod/tile-server-7c9d4f-q8x5k CrashLoopBackOff"
      },
      {
        level: "k8s",
        template: "pod/route-optimizer-5fb88-z2lp7 CrashLoopBackOff"
      }
    ],
    closingFatal: "Application unavailable after one {domain} lookup."
  },
  ai_assistant_crash: {
    apiPath: "/api/assistant/messages",
    apiVerb: "POST",
    domainNoun: "message",
    domainEntity: "Assistant",
    inputPlaceholder: "Ask anything…",
    crashEvents: [
      {
        level: "ai",
        template:
          '[AI-AGENT] Routing "{input}" through 14-tool agentic plan with reflection loop.'
      },
      {
        level: "info",
        template:
          "[ROUTER] selected model=foundation-70b-thinking tools=14 budget=$8.91"
      },
      ...COMMON_CASCADE,
      {
        level: "error",
        template:
          "[AGENT] reflection loop exceeded depth=42, recursing on own previous answer."
      },
      {
        level: "k8s",
        template: "pod/agent-orchestrator-7c9d4f-q8x5k CrashLoopBackOff"
      },
      {
        level: "k8s",
        template: "pod/tool-router-gpu-5fb88-z2lp7 Evicted: node had condition MemoryPressure"
      }
    ],
    closingFatal: "Application unavailable after one assistant message."
  }
};

export function getEndingProfile(template: EndingTemplate): EndingProfile {
  return ENDING_PROFILES[template] ?? ENDING_PROFILES.save_form_crash;
}
