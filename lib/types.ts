export type ChaosLevel = "realistic" | "startup" | "enterprise";

export const ENDING_TEMPLATES = [
  "save_form_crash",
  "checkbox_crash",
  "login_crash",
  "upload_crash",
  "search_crash",
  "send_message_crash",
  "checkout_crash",
  "report_crash",
  "dashboard_crash",
  "calendar_crash",
  "booking_crash",
  "profile_update_crash",
  "recommendation_crash",
  "map_crash",
  "ai_assistant_crash"
] as const;

export type EndingTemplate = (typeof ENDING_TEMPLATES)[number];

export interface PreflightQuestion {
  prompt: string;
  choices: string[];
}

export interface GeneratedConfig {
  appTitle: string;
  endingTemplate: EndingTemplate;
  finalUILabel: string;
  sampleInput: string;
  failureTrigger: string;
  failureLine: string;
  services: string[];
  preflightQuestions: PreflightQuestion[];
  appIdea: string;
  suggestedStack: string;
  chaosLevel: ChaosLevel;
}

export type EventLevel =
  | "info"
  | "cmd"
  | "success"
  | "warn"
  | "error"
  | "fatal"
  | "ai"
  | "docker"
  | "k8s"
  | "npm"
  | "cloud"
  | "metrics"
  | "optimizer";

export type EventAction =
  | "showApp"
  | "typeInput"
  | "triggerAction"
  | "crashApp"
  | "finish";

export interface AnimationEvent {
  level: EventLevel;
  text?: string;
  pause?: number;
  flash?: boolean;
  phase?: string;
  progress?: number;
  command?: string;
  stack?: string | string[];
  metrics?: {
    pods?: number;
    users?: number;
    cost?: number;
    latency?: number | string;
  };
  action?: EventAction;
}

export interface StoredAnimation {
  id: string;
  config: GeneratedConfig;
  events: AnimationEvent[];
  createdAt: number;
}
