# Qubic SEO Autopilot Design System

## Product Intent

Qubic SEO Autopilot is a single-site SEO command center for `qubic.org` and `docs.qubic.org`.
The product should feel like a high-trust operations console that helps a small team monitor search performance, identify the next best SEO action, draft evidence-backed content, and manage imports without feeling noisy or over-automated.

The interface should communicate these ideas at all times:

- signal over noise
- evidence before action
- review before publish
- operator control over automation
- modern technical confidence without looking cold or enterprise-heavy

## Design Personality

The visual language should combine:

- crypto-native sharpness
- AI operations clarity
- editorial rigor
- premium dark-mode depth
- soft neon accents instead of loud gradients

The experience should feel closer to a mission-control workspace than a marketing website.
The user should feel like they are running an intelligent system, not filling out forms in an admin panel.

## Core UX Principles

- Important information should be visible in one scan.
- Every recommendation should visibly connect to evidence, score, and action.
- Complex systems should be grouped into digestible blocks.
- Automation should always expose its confidence and source grounding.
- Content generation should look reviewable and traceable, never magical.
- Dense screens are acceptable, but hierarchy must stay clear.
- The UI should encourage weekly workflow discipline, not endless clicking.

## Color System

### Base Surfaces

- page background: near-black blue with subtle depth
- primary panel: deep midnight blue
- secondary panel: slightly brighter navy
- tertiary panel: translucent dark slate for overlays and chips
- borders: low-contrast cool gray with soft alpha

### Accents

- primary accent: violet
- secondary accent: cyan
- success accent: lime-green
- warning accent: amber
- danger accent: rose-red

### Usage Rules

- Violet is the main product accent for primary actions and emphasis.
- Cyan is used for live system signals, automation, and active states.
- Lime signals healthy connectors, approved items, or successful runs.
- Amber signals review-needed or quota-sensitive states.
- Rose signals regressions, broken pages, blocked actions, or critical warnings.
- Avoid full rainbow dashboards.
- Keep most surfaces dark and calm so signal colors feel meaningful.

## Typography

- primary font style: clean sans serif
- headings: bold, compact, high contrast
- body: medium-weight, readable, slightly tight line height
- metadata: smaller, muted, all caps or mono-like treatment when needed
- score and metric values: large, punchy, tightly tracked

Typography should prioritize operator scanning.
Long paragraphs should be rare.
Most content should be chunked into cards, labels, chips, and evidence lists.

## Spacing and Density

- generous outer layout spacing
- compact inner card spacing
- dense tables with clear row separation
- use grouped card stacks rather than oversized empty whitespace
- section rhythm should alternate between summary panels and detailed working areas

The application should feel information-rich, not cramped.

## Layout System

### App Shell

Use a persistent desktop-first shell with:

- left sidebar navigation
- top command/status bar
- main content canvas with wide card grid
- optional right-hand detail rail on dense screens

### Sidebar

Sidebar should be narrow but premium.
Use icon + label items with a subtle active glow.
Main sections:

- Dashboard
- Suggestions
- Content Studio
- Imports
- Connectors

A small system health block should live near the bottom of the sidebar.

### Top Bar

The top bar should contain:

- page title and context subtitle
- current site scope
- system status pulse
- quick actions such as run audit or generate brief

## Component Language

### Panels

Panels are the main structural unit.
They should have:

- dark layered backgrounds
- soft borders
- medium-large radius
- subtle shadow glow
- slight separation from background through blur or tonal contrast

### KPI Cards

KPI cards should emphasize:

- one metric
- one short interpretation label
- one trend or delta
- optional mini-bar visualization

### Opportunity Cards

Opportunity cards should show:

- title
- recommended action
- impact score
- confidence score
- evidence tags
- affected URLs
- current status

The call to action should be explicit.
Examples:

- approve refresh
- create brief
- snooze
- dismiss

### Tables

Tables should be readable in dark mode and use:

- generous row height
- muted separators
- sticky headers when possible
- score badges instead of plain numbers where useful
- expandable evidence rows or nearby detail cards

### Badges and Chips

Use chips heavily for:

- action type
- connector status
- source type
- review state
- job cadence
- page type

Chips should feel tactile and compact.

### Evidence Blocks

Evidence should be shown as structured mini-panels with:

- source label
- short reason text
- freshness or timestamp
- optional confidence marker

### Draft Blocks

Generated content blocks should visually separate:

- approved facts
- source references
- human-review flags
- draft copy

Human-required markers should always be visually prominent.

## Data Visualization

Use lightweight visualizations that work inside cards:

- mini trend bars
- stacked status bars
- score meters
- simple column sparklines
- ranked lists with inline bars

Avoid heavy enterprise charting styles.
Keep visualizations simple, elegant, and informative.

## Motion and Interaction

- use soft hover elevation
- use short transitions
- use subtle glow for active focus states
- avoid bouncy or playful motion
- modals and drawers should feel precise and calm
- important actions should confirm state changes immediately

The product should feel fast and deliberate.

## Page Blueprint: Dashboard

The dashboard is the command center.
It should include:

- hero summary with system health and current weekly focus
- KPI row for opportunities, connector coverage, draft queue, import success rate
- high-priority opportunities panel
- connector health grid
- automation cadence / job timeline
- pages needing attention list
- content pipeline summary

The first screenful should answer:

- what changed
- what matters now
- what should be done next

## Page Blueprint: Suggestions Inbox

This page is the operational workbench for SEO actions.
It should include:

- filters for action, score band, source, and status
- dense sortable recommendation list
- ability to inspect evidence quickly
- clear approve, snooze, and dismiss actions
- side detail view or expanded card pattern

The page should feel like triage for a smart queue.

## Page Blueprint: Content Studio

This page should support turning signals into drafts.
Sections:

- topic ideas
- approved briefs
- draft previews
- source packs
- human review flags

The layout should emphasize traceability.
Every draft should visibly connect to the signals and sources that justify it.

## Page Blueprint: Imports Center

This page should make CSV work feel safe and controlled.
Sections:

- template cards
- upload zone
- mapping preview
- validation results
- import history
- downstream triggers

Validation should be clear and visual.
Errors should feel actionable, not technical.

## Page Blueprint: Connectors

This page should make the system feel systematic and modular.
Show each connector as a status card with:

- connector name
- purpose
- health state
- cadence
- auth requirements
- primary data outputs

Group connectors into:

- site intelligence
- Google signals
- Qubic official sources
- community and market signals
- local AI and enrichment

## States

### Empty States

Empty states should feel intentional and motivational.
Use short operator-language prompts such as:

- No approved opportunities yet.
- Upload a keyword or URL CSV to seed the queue.
- Connect Search Console to unlock query-based suggestions.

### Loading States

Loading states should use skeleton panels and shimmer bars.
Avoid spinners as the primary pattern.

### Error States

Errors should be concise, calm, and fix-oriented.
Always tell the user:

- what failed
- why it matters
- what they can do next

## Writing Style

UI copy should be:

- concise
- direct
- operator-oriented
- evidence-aware
- slightly technical

Prefer phrases like:

- Review required
- Grounded in official Qubic docs
- Confidence is low due to limited source depth
- This action supports the ecosystem cluster

Avoid hype-heavy marketing language.

## Accessibility

- maintain strong contrast in dark mode
- never rely on color alone for status
- keep touch targets and buttons large enough
- ensure tables stay keyboard-navigable
- make badges readable and not overly small
- keep dense information sections screen-reader friendly

## Implementation Guidance

- Build desktop-first, but keep layouts responsive.
- Use a left-navigation application shell.
- Prefer card-based sections over full-width wall-of-text layouts.
- Keep data and content views visually unified.
- Let the dashboard feel premium and strategic.
- Let working pages feel efficient and operational.
- Keep the visual system consistent across all routes.

## Anti-Patterns

Avoid these patterns:

- bright generic SaaS gradients everywhere
- white cards on white backgrounds
- overly playful crypto visuals
- giant hero marketing sections inside the app
- too many chart libraries or decorative charts
- long forms with weak hierarchy
- hiding evidence behind too many clicks

## Frontend Quality Bar

The UI is successful if:

- a user can understand the weekly SEO priority within seconds
- recommendations look trustworthy because their evidence is visible
- content drafting feels reviewable and grounded
- CSV importing feels safe and structured
- connector architecture feels modular and expandable
- the product feels like a serious Qubic operations console
