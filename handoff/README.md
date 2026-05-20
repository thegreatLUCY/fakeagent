# Handoff: fakeagent UI improvements

## Overview

A design pass on the **fakeagent** parody web app — the "confident AI agent that overengineers a tiny app idea into a cloud-native incident." The current UI is structurally solid but feels timid for what is supposed to be an over-the-top satire. This bundle pushes both the setup screen and the running/crisis terminal screen to commit harder to the joke: bigger type, louder Run CTA, color-coded log badges, ticking telemetry counters, an "agent confidence" meter that collapses with the build, a glitchy crisis state, and a pop-in "real" app that visibly crashes.

## About the design files

The files in this bundle are **design references created in HTML** — a static React prototype showing intended look and behavior. They are **not production code to copy directly**.

The target codebase is the existing **Next.js + TypeScript + React** project (`fakeagent/`) with:

- `app/page.tsx` → renders `<GenerateForm />` (the setup screen)
- `components/GenerateForm.tsx` → setup screen source of truth
- `components/Terminal.tsx` → terminal/watch screen source of truth (handles real animation timing, `runState`, `shellMode`, `appPhase`, etc.)
- `app/globals.css` → all styling, CSS-variable-driven dark theme
- `lib/templates/build.ts` → event timeline (controls what logs appear when)
- `lib/templates/endings.ts` → crisis/ending profiles

**Task: re-create these design changes in the existing Next.js components and `globals.css` while preserving the existing animation engine and event-driven log machinery.** Do not introduce a new framework, runtime, or styling system — port the visual/UX changes into what is already there.

## Fidelity

**High-fidelity.** Final colors, type sizes, spacing, log badge styling, metric tiles, glitch overlay, app-reveal placement, and copy are all locked. Animations described below (shimmer, blink, glitch flicker, crash shake, app rise, OOM-killed badge color, etc.) should be implemented as specified.

Exact hex values, font sizes, and DOM structure can all be lifted from `styles.css` and the two JSX prototype files.

## What changed at a glance

| Surface | Before | After |
| --- | --- | --- |
| **Setup hero** | 32px-ish title, tasteful card | 56–96px clamp title with green blinking-block cursor, version sticker, "trained on 1.2T tokens of Stack Overflow regret" |
| **Top strip** | none | `build a3f7c2 · region us-east-1 · SOC2 in progress · uptime 99.97%` faux-status bar |
| **Stack chips** | flat toggles | three states — neutral, `selected`, `auto-rec` (glowing, locked, with "auto" badge), `deprecated` (strikethrough) |
| **Chaos cards** | green border on select | adds a `warn` line per card ("⚠ your CFO will be paged"), brighter selected state with outer glow |
| **Forecast panels** | none | two live "Pre-flight forecast" / "Will probably break" panels reacting to chaos level + selected stack |
| **Run button** | small ghost button bottom-right | full-color filled green CTA with play icon, label, and a faux ETA/cost chip (`~23s · $14.82k/mo`) |
| **Terminal timestamps** | wrapped onto 2 lines | fixed-width 92px column, `white-space: nowrap`, tabular-nums |
| **Log lines** | level color on text only | colored **badges** (`INFO`/`NPM`/`DOCKER`/`K8S`/`WARN`/`ERROR`/`FATAL`/`ASK`) + colored message text |
| **Progress bars** | none in log | inline ASCII bars `[████████░░░░░░░] 47%` rendered as a `<span>` per log line |
| **Sidebar metrics** | 4 tiles (Pods/Users/Cost/p95) all 0 at start | **8 tiles** (adds Agents, Tokens, Incidents, p99) + ghost "scanning…" placeholders while empty + color codes (red `up`, green `ok`, orange `warn`) |
| **Stack panel** | empty for first ~5s | shows ghost dashed "scanning…" chip when empty; new entries animate in with `stackAppear` keyframe + green border for 1s |
| **Phase meter** | 1px green bar | 4px gradient bar (green→cyan), shimmer sweep when active |
| **Agent confidence** | none | dedicated panel with multi-stop gradient bar + readout. Stable=high/green, recalibrating=low/red |
| **Top-bar chrome** | title + subtitle only | adds breadcrumb chips: `build a3f7c2 / us-east-1 / ● prod` (turns `● degraded` + red in crisis) |
| **Crisis state** | status pill changes color, save button turns red | full-screen red flicker animation, glitch scanline overlay, ticked-up metrics in red, confidence drops to 12%, **pop-in real app** bottom-right with shake-on-crash |
| **Timeline footer** | progress + label only | adds right-side metadata (`kafka lag 0.2s · interactive setup` / `kafka lag 42s · PAGER · oncall`) |

## Screens / views

### 1) Setup screen — `app/page.tsx` / `components/GenerateForm.tsx`

**Purpose:** entry point where the user types an app idea, picks chaos level, and hits Run.

**Layout:**
- Page padding: `56px clamp(28px, 5vw, 80px)`. No card containment — content flows on the dark background with grid + scanline overlay.
- Top status bar: flex row, `space-between`. Left = green `▮ ai-dev-agent` brand mini. Right = stats group with `gap: 22px`.
- Hero: flex row, `align-items: flex-end`, `gap: 18px`. Title left, version block right (column with version tag + trained-on line).
- Tagline: max-width 64ch, color `var(--muted)`, with bold accents on "overengineer it" and "Share the recording."
- Below tagline a 2-col grid: `1.4fr 1fr`. Left column: idea input → stack chips → custom-stack input → chaos cards. Right column: two stacked forecast panels.
- Submit row at bottom: grid `1fr auto`. Left = `or watch a prebuilt demo →` link, right = Run button.
- Footer strip: 10px caps, three pieces of fake metadata.

**Components:**

- **Hero title:**
  - `font-size: clamp(56px, 8vw, 96px)`, `font-weight: 800`, `letter-spacing: -0.04em`, `line-height: 0.92`
  - Blinking cursor: `0.55ch` wide, `var(--green)` background, animation `blinkBlock 1s steps(2) infinite`
- **Version sticker:**
  - 11px text, bordered tag `1px solid rgba(82, 224, 127, 0.18)`, green text, `padding: 3px 8px`
  - Below it a 28ch-max line of fake training data text in `var(--muted)`
- **Idea input:**
  - Background `var(--terminal-2)` `#0d1116`, border `1px solid var(--line-bright)`, radius 8px, padding `16px 18px`, font-size 17px
  - Focus: border-color `var(--cyan)`, box-shadow `0 0 0 3px rgba(86, 200, 255, 0.12)`
- **Stack chips** (`STACK_OPTIONS` array in setup-screen.jsx):
  - Base: pill, `1px solid var(--line-bright)`, transparent bg, 13px font, `padding: 7px 12px`
  - `.selected`: green bg `var(--green-soft)` + green border + green text
  - `.auto-rec`: same green color **plus** `autoRecPulse` keyframe animation (box-shadow pulse) + small "auto" pill in top-right corner
  - `.deprecated`: text-decoration line-through, dimmed text
  - **Auto-rec set by chaos level** — see `AUTO_REC` map in setup-screen.jsx (realistic=3 items, startup=5, enterprise=13). Clicking an auto chip is a no-op (joke).
  - "Vue" is in `DEPRECATED` (one item, strikethrough).
- **Chaos cards:** 3-col grid, each card is a column-flex card with strong title, description, and (for startup/enterprise) an orange `warn` line in 10px caps
  - Selected: green border + `box-shadow: 0 0 0 1px var(--green), 0 0 24px -8px var(--green)`
- **Forecast panels** (right column):
  - Background `var(--panel)`, border `1px solid var(--line-bright)`, radius 10px, padding 18px
  - Header has live-dot indicator (pulsing green circle, `pulseDot` keyframe)
  - 6 rows in panel 1 (Agents/Services/Cost/Postmortems/ETA/Confidence), 4 rows in panel 2 (failure probabilities)
  - Dashed bottom border between rows (`border-bottom: 1px dashed var(--line)`)
  - Values right-aligned, tabular-nums, color-coded: `.up` = red, `.ok` = green, default = white
  - **All values recompute from selected chaos + stack length** — see `fakeMetrics` useMemo in setup-screen.jsx
- **Run button:**
  - Filled green (`var(--green)`), dark text `#02110a`, padding `18px 32px`, weight 800
  - Outer glow: `box-shadow: 0 0 0 1px var(--green), 0 0 32px -6px var(--green)`
  - Contains: triangle play arrow (CSS borders, dark color) + "Run agent" label + tiny dark chip with ETA/cost
  - Hover: `transform: translateY(-1px)`

**Copy (exact strings):**

```
AI-dev-agent
v4.2.0-alpha.experimental.k8s
trained on 1.2T tokens of Stack Overflow regret

Type a tiny app idea. Watch a confident AI agent overengineer it into a
cloud-native incident. Share the recording.

App idea   // 200 char max, dreams unlimited
   placeholder: a dog walking scheduler
   tip: the smaller the idea, the bigger the incident.

Suggested stack   // pick any · auto-recs locked   [auto · N]

Chaos level   // affects blast radius
   Realistic           Believable build. Smaller stack. Calmer collapse.
   Startup Mode        Seed-stage overconfidence. Unnecessary agents. Cost warnings.
                       ⚠ expect 1 cofounder argument
   Enterprise Nightmare Kubernetes, GPUs, vector DB, SOC2, cloud bill explosion.
                       ⚠ your CFO will be paged

Pre-flight forecast   [LIVE]
   Agents to spawn          {fakeMetrics.agents}
   Services provisioned     {fakeMetrics.services}
   Est. cloud bill / mo     ${fakeMetrics.cost}
   Postmortems queued       {fakeMetrics.postmortems}
   Build ETA                ~{fakeMetrics.eta}s
   Agent confidence         {fakeMetrics.confidence}

Will probably break   [FORECAST]
   cascading failure        87%
   OOMKilled pod            71%
   forgotten env var        94%
   happy path completes     3%

[▷ Run agent  ~23s · $14.82k/mo]

or watch a prebuilt demo →

(footer) streaming · us-east-1 → your browser
         last incident: 2 minutes ago
         by clicking Run you accept eventual consistency
```

**State (mirrors current `GenerateForm.tsx` state, plus chaos-driven derived values):**

```ts
const [appIdea, setAppIdea] = useState("");
const [selectedStack, setSelectedStack] = useState<string[]>([]);
const [customStack, setCustomStack] = useState("");
const [chaos, setChaos] = useState<ChaosLevel>("enterprise");
const [submitting, setSubmitting] = useState(false);

// new: auto-rec stack derived from chaos
const autoStack = AUTO_REC[chaos];
// effective stack passed downstream is union of auto + selected + custom
const stack = useMemo(() => unique([...autoStack, ...selectedStack, ...customSplit]), [...]);
// derived faux metrics for forecast panels
const fakeMetrics = useMemo(() => deriveMetrics(stack.length, chaos), [stack.length, chaos]);
```

Toggling an `auto-rec` chip should be a no-op (the joke). Selecting non-auto chips works normally.

---

### 2) Terminal screen — running — `components/Terminal.tsx` (state: `shellMode === "normal"`)

**Purpose:** Live build log streaming with sidebar telemetry as the fake agent provisions a stack.

**Layout** (unchanged from current Terminal.tsx, just visually amped):
- Grid rows: `topbar / workspace (sidebar + terminal) / timeline`
- Sidebar: 280px fixed, scrolls. 5 panels stacked with `gap: 14px`.
- Terminal panel: command banner / scrolling output / prompt row at bottom.

**Components:**

- **Topbar** (`.topbar`):
  - 3-col grid: window controls / title+subtitle / RUN-status pill
  - Title now contains 3 small **breadcrumb chips** after the project name: `build a3f7c2`, `us-east-1`, `● prod` (the dot is green text)
  - Background: gradient from `var(--panel-soft)` to `var(--terminal)`
- **Run status pill** (`.run-status.running`):
  - Green border + green-soft bg + green text, pulsing dot, "RUNNING"
- **Sidebar panels:**
  - **User request** — unchanged, plain text
  - **Current phase** — strong label + 4px gradient progress meter with optional `.shimmer` overlay (1.4s linear infinite) while building
  - **Provisioned stack** — list of chips. New entries animate via `stackAppear` keyframe (slide-down + fade, green-tint background that fades out). Empty state shows a dashed "+ scanning..." ghost chip.
  - **Runtime metrics** — **2-col grid of 8 metrics**: Pods / Users / Cost/mo / p95 action / Agents / Tokens / Incidents / p99 action. Tabular-nums, 15px bold values. Color classes: `.up` (red, increasing-cost), `.warn` (orange), `.ok` (green).
  - **Agent confidence** — new panel. 8px gradient bar (red→orange→green), readout below with label + percent. Three states: `high` (full width, green text), `mid` (47% wide, orange), `low` (12% wide, red).
- **Command banner** (`.command-banner`):
  - 13px, 600 weight, green `$` prompt, full command echo
  - Bottom border `1px solid var(--line)`
- **Log lines** (`.line`):
  - Grid: `92px auto 1fr` (timestamp / badge / message)
  - Timestamp 11px, dim, **tabular-nums, nowrap** — fixes the wrapping bug
  - **Badge** is the key change: 10px caps, bold, padded `2px 7px`, color-coded:
    - `cmd` — neutral white on dark
    - `info` — cyan
    - `success` — green
    - `warn` — yellow
    - `npm` — red
    - `k8s` — blue
    - `docker` — cyan
    - `error` — red
    - `fatal` — solid red background, white text
  - Message text inherits a softer version of the badge color (full color only on warn/error/fatal/success)
  - **ASCII progress bar** — when an event includes a `bar` payload, render inline: `[████████░░░░░░░] 47% pulling postgres:15-alpine`. Filled chars green, empty chars dim. Use `█` (U+2588) and `░` (U+2591).
  - **Choice line** (existing interactive prompt) — adds a third weird option per question (e.g. `> what is git`, `> i'm scared`) styled in purple
- **Terminal cursor row:** unchanged green `$` + blinking block cursor
- **Timeline footer:** progress track + label, **plus a new right-side metadata row** (`kafka lag X · interactive setup` etc.)

**Sample log sequence** (see `RUNNING_LOGS` in terminal-screen.jsx for the full list). Note the diverse badge mix and ASCII bars on `NPM`/`DOCKER` lines.

**Implementation hint:**
The existing event system in `lib/templates/build.ts` returns `AnimationEvent` objects with a `level` field. Extend that type with:

```ts
type AnimationEvent = {
  level: EventLevel;
  text: string;
  bar?: { percent: number; width?: number; label?: string }; // NEW — renders ASCII bar
  // ...existing fields
};

type EventLevel = "cmd" | "info" | "success" | "warn" | "error" | "fatal"
                 | "npm" | "k8s" | "docker" | "agent" | "user" | "stripe"; // expanded
```

Map levels → badge text and badge color in CSS. The existing line renderer in `Terminal.tsx` becomes:
```tsx
<div className={`line ${line.level}`}>
  <span className="timestamp">{line.timestamp}</span>
  <span className="badge">{badgeFor(line.level)}</span>
  <span className="message">
    {line.text}
    {line.bar && <AsciiBar {...line.bar} />}
    {line.question && <ChoiceGroup ... />}
  </span>
</div>
```

---

### 3) Terminal screen — crisis + app reveal — `components/Terminal.tsx` (states: `shellMode === "crisis"`, `appPhase === "active" | "crashed"`)

**Purpose:** The cascading failure climax. The previously-confident agent breaks, the "real" app pops in, the user clicks once, everything goes red.

**Visual treatment:**

- **Page background** swaps the green radial-gradient halo for a red one (`.fa-artboard.crisis-bg` in styles.css).
- **Terminal shell flickers** — `crisisFlicker` keyframe at 0.35s steps(2) infinite cycles a slight hue-rotate + brightness pulse on the shell.
- **Glitch overlay** — absolute, full-viewport, pointer-events:none, `mix-blend-mode: screen`. Repeating red horizontal lines + a 0.3s `glitchShift` keyframe that translates ±1px Y on each step. Read as TV-scanline interference.
- **Topbar** — gradient swap to red-tinted top, breadcrumb dot turns red and reads `● degraded`. Subtitle becomes `final UI surface: walkpilot.local — 503 CASCADE`.
- **Status pill** flips to `.run-status.failed`: red border/bg/text, "FAILING", with `failBlink` 0.7s `steps(2)` opacity blink.
- **Sidebar metrics** all ticked up: Pods 23→87, Cost $14,820→$487,201, p95 `412 ms`→`TIMEOUT`, p99 → `∞`, Agents → 14, Incidents → 7. Cost/Pods/Agents/Incidents/p95/p99 all colored red via `.up`.
- **Confidence bar** drops to `.low` (12% width, solid red), readout shows `recalibrating… 12.0%`.
- **Stack panel** appends a new red `+ oncall-agent` chip with the `.new` entry animation, red border + red text.
- **Log feed appends `CRISIS_LOGS`** — 11 new lines climbing from `READY` → cascading `ERROR`s → 2× `FATAL` → a muted `// (the agent is filing its own postmortem)` last word.
- **Timeline footer right-side metadata** swaps to `kafka lag 42s · PAGER · oncall`.

**App reveal (the popped-in "real" app):**

- Absolute, positioned `right: 32px; bottom: 64px`, width 360px, z-index 3 (above glitch overlay).
- Light card on dark terminal: `background: #fafafa`, dark text, sans-serif font (`ui-sans-serif, -apple-system, "Segoe UI"`).
- Chrome strip top: `walkpilot.local` left, status right. Status `200 OK` green when active, `503 CASCADE` red bold when crashed.
- Body: H1 "Schedule a walk" / readonly input prefilled `"walk Mr. Biscuit at 5pm"` / dark CTA button.
- **Entry animation** — `appRise` 0.5s `cubic-bezier(.2,.7,.2,1)`: translateY(20px) + opacity 0 → settled.
- **Crash animation** — `appCrash` 0.6s keyframe: shake ±6px X with tiny ±0.3° rotation.
- **Failed button** — red bg, plus `btnShake` shudder.
- **Error line** below button — 11px monospace, red: `"leash-knot-resolver: timeout after 30s"` (use `config.failureLine` from existing endings.ts).

---

## Interactions & behavior

### Setup screen

- **Auto-rec chips**: clicking an auto-rec chip does nothing (it's locked — joke). Clicking a non-auto chip toggles it in `selectedStack`.
- **Switching chaos level**: the auto-rec set changes, the forecast panel values recompute, the Run button's ETA/cost chip updates. All synchronous on state change.
- **Run button**: posts to `/api/generate` as before, then `router.push('/watch/<id>')`. While submitting, label can swap to "Spawning agents…" with the play arrow → tiny CSS spinner (4 dots rotating).

### Terminal — running

The existing event-driven `play()` loop in `Terminal.tsx` continues to drive everything. The only behavioral changes are:

- Stack chips animate in with the `.new` class for 700ms (use a `useEffect` that strips `.new` after timeout, or a `Set<string>` of recently-added items).
- The phase meter gets a `.shimmer` overlay whenever progress is < 100 and the run isn't `failed`.
- The ASCII bar in log lines is a one-time render at append time — it does not animate after the line is laid down.
- Confidence panel state: `runState === "running"` → mid/orange ("stable" → "94.0%"). When transitioning to failed it animates to `.low` (12% / red).

### Terminal — crisis

Triggered when an event has `action: "crashApp"` (existing in `endings.ts`). Today this flips `shellMode = "crisis"`. After this PR:

1. The shell receives the `.crisis` class → `crisisFlicker` keyframe starts.
2. The `.glitch-overlay` div is mounted as a sibling.
3. `runState = "failed"` → status pill turns red + `failBlink` starts.
4. **Metrics drift over 800ms** to their crisis values (instead of snapping). Use a small interpolator — pods/cost/agents ramp up, latency snaps to `TIMEOUT`, confidence bar transitions width via CSS.
5. Crisis log lines stream in as normal events.

### Window controls (red/yellow/green dots) — optional gag

Make the red dot clickable. On click, append one log line:
`[INFO] Close requested. Your team will be paged. Cancelling...` followed by `[FATAL] PagerDuty acknowledged.`

## State management

Use the existing state in `Terminal.tsx`. Additions:

```ts
// new sidebar metrics
type Metrics = {
  pods: number; users: number; cost: number; latency: number | string;
  agents: number; tokens: number | string; incidents: number; p99: number | string;
};

// new confidence panel state
type Confidence = { value: number; label: string; tone: "high" | "mid" | "low" };

const [confidence, setConfidence] = useState<Confidence>({ value: 94, label: "94.0%", tone: "mid" });

// new visual mode flag for glitch overlay (could derive from existing shellMode)
const showGlitch = shellMode === "crisis";

// new: recently-added stack items so we can apply .new class for 700ms
const [recentStack, setRecentStack] = useState<Set<string>>(new Set());
```

The event payloads in `lib/templates/build.ts` need new optional fields:
```ts
type AnimationEvent = {
  // existing...
  bar?: { percent: number; width?: number; label?: string };  // NEW
  metrics?: Partial<Metrics>;  // existing — extend to cover new metric keys
  confidence?: { value: number; label: string; tone: "high"|"mid"|"low" };  // NEW
};
```

## Design tokens

All exist in `globals.css` already; this PR adds two and clarifies usage. Add/keep:

```css
:root {
  --bg: #060708;
  --terminal: #080b0e;
  --terminal-2: #0d1116;
  --panel: #0f1419;
  --panel-soft: #121820;
  --line: #1b242d;
  --line-bright: #2b3945;
  --text: #d8e0e6;
  --muted: #7d8b96;
  --dim: #56636e;
  --green: #52e07f;
  --green-soft: rgba(82, 224, 127, 0.18);   /* NEW token */
  --cyan: #56c8ff;
  --yellow: #ffd166;
  --orange: #ff9f43;
  --red: #ff5b6e;
  --red-soft: rgba(255, 91, 110, 0.18);     /* NEW token */
  --purple: #b48cff;
  --blue: #72a7ff;
}
```

**Type stack:** keep the existing mono-everywhere: `ui-monospace, "JetBrains Mono", SFMono-Regular, Menlo, Monaco, Consolas, monospace`. The app-reveal card is the only sans-serif surface (`ui-sans-serif, -apple-system, "Segoe UI"`).

**Spacing scale:** 4 / 6 / 8 / 10 / 14 / 18 / 22 / 28 / 56 (px). No new spacing values.

**Border radius:** 3 (badges) / 4 (small chips) / 6 (custom-stack input, app buttons) / 8 (cards, idea input) / 10 (forecast panels, app-reveal) / 999 (pill chips, status pill, meters).

**Keyframes (all in styles.css):**

| name | use | duration |
| --- | --- | --- |
| `blinkBlock` | title cursor, terminal block cursor | 1s steps(2) infinite |
| `pulseDot` | run-status dot, "LIVE" indicator | 1.2–1.6s ease-in-out infinite |
| `autoRecPulse` | auto-rec stack chips | 2.2s ease-in-out infinite |
| `shimmer` | phase meter sweep | 1.4s linear infinite |
| `stackAppear` | new stack chip entrance | 0.5s ease |
| `failBlink` | failing status pill | 0.7s steps(2) infinite |
| `crisisFlicker` | terminal shell during crisis | 0.35s steps(2) infinite |
| `glitchShift` | red scanline overlay | 0.3s steps(3) infinite |
| `appRise` | app-reveal entrance | 0.5s cubic-bezier(.2,.7,.2,1) |
| `appCrash` | app shake on failure | 0.6s ease |
| `btnShake` | failed CTA shake | 0.4s |

## Assets

No images, no icons. Everything is CSS — including:
- The play-arrow on the Run button (CSS borders triangle)
- All badge backgrounds
- The grid + scanline overlays on `.fa-artboard` (SVG-free, `linear-gradient` + `repeating-linear-gradient` + `mask-image`)

The window controls (traffic lights) keep the existing red/yellow/green dot solids (`#ff5f57 / #ffbd2e / #28c940`).

## Files in this bundle

```
design_handoff_ui_improvements/
├── README.md                  ← this file
├── UI improvements.html       ← entry point. Open this to view the three artboards.
├── styles.css                 ← all visual changes. Lift selectors directly into globals.css.
├── setup-screen.jsx           ← amped-up GenerateForm equivalent (static React, no API call)
├── terminal-screen.jsx        ← amped-up Terminal equivalent. Both `mode="running"` and `mode="crisis"` rendered side-by-side via the canvas.
├── design-canvas.jsx          ← presentation shell only — not needed in production
└── tweaks-panel.jsx           ← presentation shell only — not needed in production
```

## Porting checklist

1. **`app/globals.css`:**
   - Add `--green-soft` and `--red-soft` to `:root`.
   - Replace `.line .timestamp` rules to use the 92px fixed-width column and `nowrap`.
   - Add the `.line .badge` ruleset and the per-level badge color overrides (`info`/`npm`/`docker`/`k8s`/`warn`/`error`/`fatal` etc.).
   - Add `.ascii-bar` styles.
   - Add the new sidebar panel styles (`.confidence-bar`, `.confidence-readout`, new metrics layout).
   - Replace `.phase-meter` styles with the gradient + shimmer version.
   - Add `.glitch-overlay`, `.crisis-bg`, `.terminal-shell.crisis` keyframe rules.
   - Add `.app-reveal` light-card styles + `appRise`/`appCrash` keyframes.
   - Rewrite the `.generate-*` setup styles with the new hero typography, forecast panels, and Run-button CTA.
2. **`components/GenerateForm.tsx`:**
   - Add the top status bar + hero + version-sticker block above the form.
   - Add `AUTO_REC` map and `DEPRECATED` list; render chips with the new state-derived classes.
   - Add `fakeMetrics` useMemo and the two forecast panels (right column).
   - Replace the submit row with the full-color Run button.
3. **`components/Terminal.tsx`:**
   - Extend `Metrics` type with `agents`, `tokens`, `incidents`, `p99`.
   - Add `confidence` state.
   - Render the new metrics grid + confidence panel in the sidebar.
   - Update log-line render to include a `<span className="badge">` between timestamp and message; add `badgeFor(level)` helper.
   - Add `AsciiBar` subcomponent and render it when `event.bar` is set.
   - Add the breadcrumb chips to the topbar title.
   - When `shellMode === "crisis"`, render the `.glitch-overlay` and the `.app-reveal` card (existing `appPhase` / `appStatus` / `saveState` already track the app states — just restyle).
   - Add red-dot click handler as the optional gag.
4. **`lib/templates/build.ts`:**
   - Extend `AnimationEvent` with `bar`, expanded `metrics`, and `confidence`.
   - Sprinkle `bar` fields into a few npm/docker/k8s events so the ASCII bars appear at natural moments.
   - Add events that bump the new metrics (Agents, Tokens, Incidents) as services come online.
5. **`lib/templates/endings.ts`:**
   - Add new crisis events that touch `confidence` (drop to 12%) and add the `+ oncall-agent` stack entry.

## Open questions for the developer

- Do we want the auto-rec stack to truly be uncheckable (current design), or just visually distinct? The joke lands harder if it's locked.
- The red-traffic-light gag — ship it or cut it?
- "Will probably break" panel — keep the percentages static (current) or have them slightly shimmer/jitter to feel live?
- Performance: the glitch overlay is cheap (one absolute div), but `crisisFlicker` on the shell uses `filter: hue-rotate(...)` which can be expensive on low-end laptops. Consider an opt-out via `prefers-reduced-motion`.
- Consider gating all keyframe animations behind `prefers-reduced-motion: no-preference` — the joke survives without the shake/glitch.
