import { z } from "zod";
import { ENDING_TEMPLATES } from "./types";

export const PreflightQuestionSchema = z.object({
  prompt: z.string().min(4).max(160),
  choices: z.array(z.string().min(1).max(40)).min(2).max(3)
});

export const GeneratedConfigSchema = z.object({
  appTitle: z.string().min(2).max(40),
  endingTemplate: z.enum(ENDING_TEMPLATES),
  finalUILabel: z.string().min(2).max(28),
  sampleInput: z.string().min(1).max(60),
  failureTrigger: z.string().min(2).max(80),
  failureLine: z.string().min(8).max(200),
  services: z.array(z.string().min(2).max(60)).min(3).max(8),
  preflightQuestions: z.array(PreflightQuestionSchema).min(3).max(5),
  appIdea: z.string().min(2).max(400),
  suggestedStack: z.string().min(0).max(400),
  chaosLevel: z.enum(["realistic", "startup", "enterprise"])
});

export const GenerateRequestSchema = z.object({
  appIdea: z.string().min(2).max(400),
  suggestedStack: z.string().min(0).max(400).optional().default(""),
  chaosLevel: z.enum(["realistic", "startup", "enterprise"])
});

export type GenerateRequest = z.infer<typeof GenerateRequestSchema>;
