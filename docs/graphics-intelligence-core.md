# AD ASTRA Graphics Intelligence Core

**Decision:** Graphics Intelligence is a first-class AD ASTRA platform capability, not a customer-prompt decoration and not a view of hidden AI reasoning.

## Core architecture

`AD ASTRA Intelligence OS -> Graphics Intelligence Core -> Canonical Scene Compiler -> Renderer Adapters -> Public, Personal, Scientific, Industry and Enterprise Experiences`

The core owns the canonical visual language, seven graphics systems, scene semantics, identity, color, motion vocabulary, accessible descriptions, provenance requirements, and renderer-neutral scene plans.

- **Identity:** canonical Origin neural field, built as a living constellation that represents interconnected knowledge rather than a model's inner thoughts.
- **Cosmic Atlas:** Earth, planetary, orbital and exploration coordinate spaces.
- **Scientific Field:** formulas, equations, waves, molecules, measured phenomena.
- **Industrial Twin:** renewable energy, physical assets, facilities, process flow, operational overlays.
- **Knowledge Graph:** public knowledge, education, entity relationships and explainable provenance.
- **Temporal Flow:** time, tasks, goals, daily progress and historical sequence.
- **Data Landscape:** evidence-linked quantitative data and business intelligence.

These seven systems are platform-owned presets. Each division and experience reuses them with domain-specific data. Customer-specific rendering is only an optional authenticated extension.

## Implemented in this branch

`lib/graphics-intelligence-core.cjs` compiles a canonical atlas and seven deterministic, frozen, renderer-agnostic scene descriptions. It declares semantic scene components, visual tokens, static-first accessibility, provenance, and explicit activation requirements. `test/graphics-intelligence-core.test.cjs` checks invariants.

**Not yet implemented:** actual geometry/shader renderer adapters, procedural scene animation, signed scientific-data ingest, modeling tools, customer-session binding, visualization UI, GPU measurements or rollout. These require code-owner review and incremental acceptance.

## Production implementation sequence

1. Establish scene/schema snapshots and add CI tests to the existing test pipeline.
2. Build `graphics/adapters/three-webgl2` for the canonical Origin scene using existing self-hosted Three.js. Preserve the existing opt-in, static poster and account boundaries.
3. Add a versioned shader/material registry, geometry and particle systems, lifecycle/disposal controller, adaptive quality and WebGL context recovery.
4. Add renderer adapters for geographic, data, scientific and industrial scenes on demand. Use CesiumJS/deck.gl, ECharts/Plotly, and simulation/asset pipelines only when justified.
5. Wire signed and tenant-authorized data into scene adapters through typed APIs. Raw private data must never enter the public scene specification.
6. Run mobile/desktop visual-diff tests, accessible alternatives, reduced-motion and performance audits; collect exact-SHA artifact and deployment receipts.
7. Obtain independent review, CEO visual approval and explicit production authorization before public promotion.

The core does not require users to ask a question to exist: AD ASTRA has a recognizable canonical visual world before any customer interaction.
