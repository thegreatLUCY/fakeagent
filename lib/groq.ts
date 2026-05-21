import "server-only";
import Groq from "groq-sdk";
import { GeneratedConfigSchema } from "./schema";
import { fallbackConfig, deriveAppTitle } from "./fallback";
import { ENDING_TEMPLATES, type ChaosLevel, type GeneratedConfig } from "./types";

const SYSTEM_PROMPT = `You are the configuration backend for a satirical "fake AI dev agent" terminal animation. The terminal pretends to build a tiny app and then catastrophically over-engineers it.

You receive: an app idea, an optional suggested stack, and a chaos level. You return STRICT JSON ONLY (no prose, no markdown, no code fences) matching this exact shape:

{
  "appTitle": string,            // a punchy startup-parody product name. 2-3 syllables, 8-22 chars. Examples: "WalkPilot", "HabitFlow", "LeadForge", "SyncNest", "PrepPilot". CamelCase, no spaces, no emoji.
  "endingTemplate": one of [${ENDING_TEMPLATES.map((t) => `"${t}"`).join(", ")}],
  "finalUILabel": string,        // verb-noun action label, 2-28 chars. Example: "Book Walk", "Add Lead", "Mark Complete", "Create Event".
  "sampleInput": string,         // a realistic short input the user would type, 1-60 chars. Example: "Tuesday 4pm", "drink water", "Bob from Acme".
  "failureTrigger": string,      // the user action that triggers cascade. Example: "walk booking event".
  "failureLine": string,         // ONE serious-sounding fatal line that secretly says nothing got saved/done. 12-180 chars.
  "services": [string, ...],     // 5-7 plausible kebab-case microservice names rooted in the domain. Example: "walker-matching-worker".
  "preflightQuestions": [
    { "prompt": string, "choices": [string, string] }, ...  // 4-5 yes/no-style setup questions, each prompt ends with "?", each with two short choices like ["yes","no"] or ["yes","minimal mode"].
  ]
}

Rules:
- Tone is COMPLETELY SERIOUS, professional, technically convincing. Humor comes from absurd overengineering, not jokes.
- Pick endingTemplate that best matches the app's core verb (saving a form, checking a box, logging in, uploading, searching, sending a message, checking out, generating a report, viewing a dashboard, creating a calendar event, booking, updating a profile, recommending, mapping/routing, AI assistant). If none fit cleanly, use "save_form_crash".
- Names like "WalkPilot" are great. Avoid generic names like "App" or "ProjectX".
- failureLine should sound like a real fatal log a senior engineer would page on. NEVER admit the cause is "the system was over-engineered". Blame a specific subsystem (CRDT merge, KMS rotation, circuit breaker, replication lag) for a trivial action.
- services names should sound real (e.g. "walker-matching-worker", "lead-scoring-projector", "habit-completion-sidecar"). NOT generic ("api", "worker"). NOT cute ("vibe-engine").
- Each preflight question must end with "?". Two short choices each. One choice is usually "yes" or "confirm".
- Output JSON only, no explanation.`;

const EXAMPLES: Array<{ in: string; out: string }> = [
  {
    in: `App idea: a dog walking scheduler
Suggested stack: React, Supabase, Redis, Docker, AI agents
Chaos level: enterprise

Return the JSON config now.`,
    out: JSON.stringify({
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
        { prompt: "Initialize Git repository and release workflow?", choices: ["yes", "no"] },
        { prompt: "Generate Dockerized local development environment?", choices: ["yes", "use host runtime"] },
        { prompt: "Enable route optimization and walker-matching agents?", choices: ["yes", "defer agents"] },
        { prompt: "Provision Redis cache for booking availability?", choices: ["yes", "not needed"] }
      ]
    })
  },
  {
    in: `App idea: a habit tracker
Suggested stack: Next.js, Postgres, Vercel
Chaos level: realistic

Return the JSON config now.`,
    out: JSON.stringify({
      appTitle: "HabitFlow",
      endingTemplate: "checkbox_crash",
      finalUILabel: "Mark Complete",
      sampleInput: "drink water",
      failureTrigger: "habit completion event",
      failureLine:
        "Append-only habit ledger refused write: habit already exists in terminal state graph.",
      services: [
        "habit-command-service",
        "streak-projector",
        "habit-audit-log",
        "completion-webhook-relay",
        "habit-ontology-service"
      ],
      preflightQuestions: [
        { prompt: "Initialize Git repository and release workflow?", choices: ["yes", "no"] },
        { prompt: "Generate event-sourced habit ledger?", choices: ["yes", "use single table"] },
        { prompt: "Enable streak prediction model on each completion?", choices: ["yes", "defer model"] },
        { prompt: "Continue with production-ready cloud-native defaults?", choices: ["confirm", "minimal mode"] }
      ]
    })
  },
  {
    in: `App idea: a recipe app
Suggested stack: React, Stripe, OpenAI
Chaos level: startup

Return the JSON config now.`,
    out: JSON.stringify({
      appTitle: "PrepPilot",
      endingTemplate: "save_form_crash",
      finalUILabel: "Add Ingredient",
      sampleInput: "salt",
      failureTrigger: "ingredient save event",
      failureLine:
        "Ingredient ontology service returned 409 Conflict: 'salt' already exists in canonical food graph.",
      services: [
        "recipe-command-service",
        "ingredient-ontology-service",
        "pantry-projector",
        "shopping-list-saga",
        "nutrition-llm-router",
        "checkout-webhook-relay"
      ],
      preflightQuestions: [
        { prompt: "Initialize Git repository and release workflow?", choices: ["yes", "no"] },
        { prompt: "Generate Dockerized local development environment?", choices: ["yes", "use host runtime"] },
        { prompt: "Enable AI-powered nutrition narration on each recipe?", choices: ["yes", "defer agents"] },
        { prompt: "Set up Stripe for ingredient marketplace?", choices: ["yes", "not yet"] }
      ]
    })
  }
];

function buildUserPrompt(
  appIdea: string,
  suggestedStack: string,
  chaosLevel: ChaosLevel
): string {
  return `App idea: ${appIdea}
Suggested stack: ${suggestedStack || "(none — pick something reasonable)"}
Chaos level: ${chaosLevel}

Return the JSON config now.`;
}

function safeJsonParse(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    // try extracting from code fence or first {...}
    const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fence) {
      try {
        return JSON.parse(fence[1]);
      } catch {}
    }
    const first = s.indexOf("{");
    const last = s.lastIndexOf("}");
    if (first !== -1 && last > first) {
      try {
        return JSON.parse(s.slice(first, last + 1));
      } catch {}
    }
    return null;
  }
}

export async function generateConfig(
  appIdea: string,
  suggestedStack: string,
  chaosLevel: ChaosLevel
): Promise<GeneratedConfig> {
  const fallback = fallbackConfig(appIdea, suggestedStack, chaosLevel);
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return fallback;
  }

  const groq = new Groq({ apiKey });
  let raw = "";
  try {
    const fewShot = EXAMPLES.flatMap((ex) => [
      { role: "user" as const, content: ex.in },
      { role: "assistant" as const, content: ex.out }
    ]);
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      temperature: 0.85,
      max_tokens: 900,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...fewShot,
        {
          role: "user",
          content: buildUserPrompt(appIdea, suggestedStack, chaosLevel)
        }
      ]
    });
    raw = completion.choices[0]?.message?.content ?? "";
  } catch (err) {
    console.error("[groq] request failed", err);
    return fallback;
  }

  const parsed = safeJsonParse(raw);
  if (!parsed || typeof parsed !== "object") {
    return fallback;
  }

  const enriched: Record<string, unknown> = {
    ...(parsed as Record<string, unknown>),
    appIdea,
    suggestedStack,
    chaosLevel
  };

  const result = GeneratedConfigSchema.safeParse(enriched);
  if (!result.success) {
    console.warn("[groq] schema validation failed", result.error.flatten());
    if (typeof enriched.appTitle !== "string" || (enriched.appTitle as string).length < 2) {
      enriched.appTitle = deriveAppTitle(appIdea);
    }
    const retry = GeneratedConfigSchema.safeParse(enriched);
    if (retry.success) return retry.data;
    return fallback;
  }
  return result.data;
}
