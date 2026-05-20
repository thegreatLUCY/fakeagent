import type { ChaosLevel, GeneratedConfig } from "./types";

const NAME_PARTS_LEFT = [
  "Walk",
  "Habit",
  "Lead",
  "Sync",
  "Prep",
  "Task",
  "Ops",
  "Fit",
  "Spend",
  "Route",
  "Brew",
  "Note",
  "Loop",
  "Pulse",
  "Spark",
  "Quill"
];

const NAME_PARTS_RIGHT = [
  "Pilot",
  "Flow",
  "Forge",
  "Nest",
  "Stack",
  "IQ",
  "Hub",
  "Loop",
  "Lab",
  "Deck",
  "Yard"
];

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function deriveAppTitle(idea: string): string {
  const seed = hash(idea);
  const left = NAME_PARTS_LEFT[seed % NAME_PARTS_LEFT.length];
  const right = NAME_PARTS_RIGHT[(seed >>> 8) % NAME_PARTS_RIGHT.length];
  return `${left}${right}`;
}

export function fallbackConfig(
  appIdea: string,
  suggestedStack: string,
  chaosLevel: ChaosLevel
): GeneratedConfig {
  const title = deriveAppTitle(appIdea);
  return {
    appTitle: title,
    endingTemplate: "save_form_crash",
    finalUILabel: "Save",
    sampleInput: "hello",
    failureTrigger: "save event",
    failureLine:
      "Application unavailable after one save. Distributed state consistency check failed under single-user load.",
    services: [
      "item-command-service",
      "item-query-service",
      "item-audit-service",
      "item-ontology-service",
      "item-compliance-gateway"
    ],
    preflightQuestions: [
      {
        prompt: "Initialize Git repository and release workflow?",
        choices: ["yes", "no"]
      },
      {
        prompt: "Generate Dockerized local development environment?",
        choices: ["yes", "use host runtime"]
      },
      {
        prompt: "Provision PostgreSQL and Redis for persistence?",
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
    ],
    appIdea,
    suggestedStack,
    chaosLevel
  };
}

export const DEMO_CONFIG: GeneratedConfig = {
  appTitle: "WalkPilot",
  endingTemplate: "booking_crash",
  finalUILabel: "Book Walk",
  sampleInput: "Tuesday 4pm",
  failureTrigger: "walk booking event",
  failureLine:
    "Distributed scheduling consistency check failed after one booking request.",
  services: [
    "walk-command-service",
    "walker-matching-worker",
    "calendar-sync-sidecar",
    "pet-profile-cache",
    "route-optimization-vector-index",
    "walker-payouts-ledger",
    "booking-saga-orchestrator"
  ],
  preflightQuestions: [
    {
      prompt: "Initialize Git repository and release workflow?",
      choices: ["yes", "no"]
    },
    {
      prompt: "Generate Dockerized local development environment?",
      choices: ["yes", "use host runtime"]
    },
    {
      prompt: "Enable route optimization and walker-matching agents?",
      choices: ["yes", "defer agents"]
    },
    {
      prompt: "Provision Redis cache for booking availability?",
      choices: ["yes", "not needed"]
    }
  ],
  appIdea: "a dog walking scheduler",
  suggestedStack: "React, Supabase, Redis, Docker, AI agents",
  chaosLevel: "enterprise"
};
