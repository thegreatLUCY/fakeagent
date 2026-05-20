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
- Output JSON only, no explanation.`;

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
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      temperature: 0.85,
      max_tokens: 900,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
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
