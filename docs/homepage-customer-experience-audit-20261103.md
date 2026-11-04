# AD ASTRA Homepage — Deep Customer Experience Audit

**Audit date:** November 3, 2026  
**Owner:** Centauri Renewables Corporation  
**Live baseline:** `dpl_Ca5Lbwfmd6RDhKmb9YJpy1Uis4hZ` / `1a651f47bf6fa0e68702b68594bfd4cdf1d56f90`  
**Candidate branch:** `codex/global-resource-gateway-live-20261103`

## Executive finding

The live homepage already contains valuable cinematic material: orbital hero media, a film study, neural concepts, an intelligence-layer simulation and long-form brand storytelling. It still feels basic because the strongest components do not form one decisive customer journey.

The problem is hierarchy—not the absence of graphics.

The current experience leads with vision, then requires a long conceptual scroll before visitors can identify products, solutions, audience fit, release status or a clear next action. Product, media and internal operating concepts are mixed at the same level. The neural section reads as a production experiment instead of the central explanation of the platform.

The accepted target sequence is:

```text
Outcome-led hero
→ customer goal pathways
→ interactive neural product model
→ intelligence-layer explanation
→ six product families
→ six solution pathways
→ trust and governance
→ cinematic film and company story
```

## Scorecard

| Area | Live | Target | Priority |
|---|---:|---:|---|
| Product clarity | 4/10 | 9/10 | Critical |
| Solution clarity | 3/10 | 9/10 | Critical |
| First-screen customer direction | 4/10 | 9/10 | Critical |
| Visual originality | 7/10 | 9/10 | High |
| Neural/3D interaction | 5/10 | 9/10 | High |
| Story-to-product connection | 4/10 | 9/10 | Critical |
| Availability truthfulness | 7/10 | 10/10 | High |
| Accessibility architecture | 7/10 | 9/10 | High |
| Mobile hierarchy | 6/10 | 9/10 | High |
| Conversion architecture | 4/10 | 8/10 | High |

## Critical findings and resolutions

### 1. Vision precedes customer value

The live hero is aspirational but does not immediately explain what AD ASTRA helps a visitor accomplish.

**Resolution:**

- Headline: **Intelligence for what comes next.**
- Promise: **Research. Create. Build. Decide.**
- Primary CTA: **Explore products**
- Secondary CTA: **Enter the knowledge workspace**

### 2. Product architecture is not visible

The live systems section combines Intelligence OS, market experiences, film and an internal audit loop. This does not represent the six-family / 25-direction product structure.

**Resolution:** Add explicit product cards for:

1. Core Intelligence
2. Creative Studio
3. Specialist Intelligence
4. Business & Commerce
5. Developer Platform
6. Autonomous Workflows

Each card carries an explicit status: guided preview, planned, research direction or private development. No card implies general availability.

### 3. Solutions are buried

Visitors must understand AD ASTRA’s internal structure before they can find an outcome.

**Resolution:** Add audience-filtered solution pathways:

- Research & Knowledge
- Creative Production
- Customer Operations
- Enterprise Intelligence
- Earth & Space Intelligence
- Engineering & Industry

### 4. No immediate “start here” decision

The customer journey lacks a clear route from need to product.

**Resolution:** Add six goal pathways directly after the hero:

- Understand
- Create
- Operate
- Build
- Discover
- Engineer

The section accurately communicates the defined scope: six product families, 25 product directions, 12 knowledge domains and 42 source candidates.

### 5. Neural experience is presented as a research exhibit

The existing neural section contains useful production language but does not operate as a customer-facing explanation of AD ASTRA.

**Resolution:** Convert it into three local procedural 3D modes:

- Knowledge Graph
- Agent Orchestration
- Earth + Space Intelligence

The visualization uses bounded Canvas rendering with 3D coordinates, perspective projection and depth-aware links. It makes no provider request and permanently states **NO LIVE TELEMETRY**.

### 6. Navigation is story-led rather than product-led

“Possibilities” is not a concrete destination and products are not first-class in the navigation.

**Resolution:** Rename it **Products & solutions** and expose products, solutions, the neural model, the knowledge network and the workspace on desktop and mobile.

### 7. Release language conflicts

The live header says “OPEN PLATFORM” even though public AI and customer release remain gated.

**Resolution:** Use **PLATFORM PREVIEW**. Preserve all existing public AI, billing, connector and release gates.

## Visual and interaction direction

The upgrade introduces one visual system across the new journey:

- dark cinematic foundation;
- cyan, violet and gold intelligence accents;
- consistent glass panels and section kickers;
- product-status labels;
- outcome-led cards;
- one central interactive neural model;
- shared hover, focus and responsive behavior.

The film remains part of the story but moves after the product and solution decisions, where it supports the customer journey instead of delaying it.

## Accessibility controls

The implementation includes:

- semantic sections and unique IDs;
- keyboard-accessible solution filters and model controls;
- `aria-pressed` state;
- polite live-region updates;
- explicit focus-visible styling;
- controls outside `role="img"` containers;
- Canvas hidden from assistive technology while text readouts remain available;
- reduced-motion mode starting paused;
- static neural fallback;
- responsive coverage at 320, 390, 768, 1024 and 1440 pixels.

Manual physical-device, VoiceOver, TalkBack, color-over-video and cognitive-load testing remain required before general availability.

## Performance controls

The neural model deliberately avoids a new 3D library and external model assets. It:

- uses 78 bounded nodes;
- caps device pixel ratio at 2;
- makes no network call;
- pauses for reduced-motion users;
- limits active rendering through viewport visibility checks;
- preserves existing static artwork as fallback.

Before release, measure LCP, INP, CLS, sustained mobile GPU/CPU use and live-video contrast on the protected preview.

## Engineering strategy

The redesign is isolated and progressively loaded on `/` and `/index.html` only:

- `public/home-experience-data.js`
- `public/home-experience-ui.js`
- `public/home-experience-neural.js`
- `public/home-experience.js`
- `public/home-experience.css`
- `public/home-neural.css`

The existing homepage remains the no-JavaScript fallback. Before a general-availability launch, accepted metadata and product content should be consolidated into server-rendered source.

## Release boundary

This change does not activate:

- public model inference;
- billing or checkout;
- provider connectors;
- CRM writes;
- advertising or outreach;
- diagnosis, engineering certification or legal representation;
- autonomous external actions.

## Acceptance requirements

1. Static product, safety and release tests pass on the exact commit.
2. Chromium and WebKit tests pass at all target widths.
3. Protected Vercel preview is READY on the canonical public project.
4. `/api/status` remains paused.
5. No external writes or provider calls occur.
6. Independent GitHub review approves the exact SHA.
7. A production-target build is staged without domain assignment.
8. The exact staged build passes mobile, accessibility and smoke review.
9. The current deployment remains available for rollback.

## Final recommendation

Do not add more disconnected cinematic sections. Align the homepage around a customer-operating narrative: clear promise, visible products, outcome-led solutions, an original neural interaction, explicit trust states and cinematic storytelling in support of the product journey.
