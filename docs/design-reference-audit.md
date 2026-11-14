# AD ASTRA — design concepts and technology audit

Observed 14 November 2026 against base `ac81817`. This is a reference-by-reference audit, not a claim that a library, studio style or provider output has been accepted for launch. The machine-readable authority is `projects/website-customer-experience/design-reference-alignment.json`.

## Findings that change the build

The missing layer was a shared interaction design: source references had been inventoried as assets or tool names, while the site still treated the neural hero, product images and workspace as largely separate experiences. The appropriate integration is a single story and interaction system across discovery, connected context, product direction and workspace entry.

The existing code already includes self-hosted Three.js on the public site and Next.js 16 / React 19, AI SDK and React Flow 12.12.1 in the isolated workspace. Installing another overlapping renderer or website builder would add a second implementation surface without resolving the visual design. The native public page can adopt scroll/pinning and graph interaction patterns without loading the React application at first paint.

## Reference-by-reference decisions

### dji

Source: https://www.dji.com/

- Evidence: Rendered first view and one scroll step observed.
- Contribution: Large product stages, concise promise, consistent Learn/Buy action hierarchy and sticky navigation.
- Ad Astra application: Use catalog-backed product stages and clear discovery-to-workspace actions; do not show Buy until purchasing exists.
- Disposition: `implemented-pattern`; implementation: `scripts/lib/product-showcase.cjs`, `public/neural/product-showcase.js`.

### apple

Source: https://www.apple.com/

- Evidence: Public page content inspected.
- Contribution: Restrained typography, product hierarchy, clear primary/secondary actions.
- Ad Astra application: Keep the page calm around the neural art; test contrast and mobile crops.
- Disposition: `partly-implemented`; implementation: `public/customer-experience.css`.

### mckp

Source: https://mckp.live/?ref=a1.gallery

- Evidence: Rendered introduction/scroll observed; cursor/timeline capabilities described by site, not exercised.
- Contribution: Treat a real product screen as the subject of a lit stage; optional cursor/scroll camera and progressive quality.
- Ad Astra application: Use original workspace preview, modest perspective and actual sample content; external templates require separate licensed export.
- Disposition: `partly-implemented`; implementation: `scripts/lib/customer-home.cjs`, `public/customer-experience.css`.

### lusion

Source: https://lusion.co/

- Evidence: Loader observed; main scene remained unverified.
- Contribution: One spatial scene, cinematic pacing and transitions aligned with brand narrative.
- Ad Astra application: Native sticky scroll sequence directs the existing neural camera; avoid mandatory full-screen loaders.
- Disposition: `implemented-concept-not-copied-scene`; implementation: `public/neural/cinematic-home.js`, `public/neural/scroll-narrative.css`.

### active-theory

Source: https://activetheory.net/

- Evidence: Text extraction insufficient; rendered experience not verified.
- Contribution: Custom real-time environments can integrate identity, motion and interaction.
- Ad Astra application: Use as an art-direction benchmark, not proof that current artwork matches studio quality.
- Disposition: `reference-only`.

### thebrain

Source: https://thebrain.com/

- Evidence: Rendered relationship graphic and page narrative observed; graph interaction not tested.
- Contribution: Show information through its relationships, then expose selected context.
- Ad Astra application: Curated interactive knowledge map with node selection, neighboring edges and explanatory detail.
- Disposition: `implemented-pattern`; implementation: `scripts/lib/knowledge-map.cjs`, `public/platform-preview/knowledge-map.js`.

### content-guru

Source: https://www.contentguru.com/en-us/products/brain-ai/

- Evidence: Public product text inspected; no service execution verified.
- Contribution: Explain orchestration, knowledge assistance, transcription and next actions as separate capabilities.
- Ad Astra application: Keep actual workflow status separate from decorative neural motion; current React Flow workspace remains a read-only sample.
- Disposition: `architecture-reference`; implementation: `apps/customer-workspace/components/workflow-graph.tsx`.

### awwwards

Source: https://www.awwwards.com/websites/3d/

- Evidence: Gallery taxonomy inspected.
- Contribution: Find examples for spatial design, typography, transitions and storytelling.
- Ad Astra application: Curate specific examples and test them; an award does not establish accessibility, loading speed or Ad Astra acceptance.
- Disposition: `reference-only`.

### a1

Source: https://www.a1.gallery/websites/3d-design

- Evidence: Gallery guidance inspected.
- Contribution: Focused shortlist of 3D sites and progressive first paint.
- Ad Astra application: Maintain a stable readable poster while richer artwork loads.
- Disposition: `implemented-pattern`; implementation: `public/neural/cinematic-home.js`.

### mesh

Source: https://mesh3d.gallery/

- Evidence: Gallery text inspected; discovered from supplied Reddit reference.
- Contribution: Compare real-time Three.js/WebGL examples by makers and use case.
- Ad Astra application: Use as a research library; do not import gallery artwork or code as owned assets.
- Disposition: `reference-only`.

### fabric

Source: https://fabric.so/zh/comparison/best-3d-design-tool-for-web

- Evidence: Article inspected.
- Contribution: Separate authoring, rendering and lightweight animation tools.
- Ad Astra application: Choose one renderer and one scene authority; authoring tools are optional production aids.
- Disposition: `decision-guidance`.

### mdx

Source: https://mdx.so/blog/best-3d-websites-2026-examples

- Evidence: Article inspected against official rendering docs.
- Contribution: Purposeful 3D, mobile budgets and stack choices.
- Ad Astra application: Adopt performance discipline; reject the article's implication that WebGL2 provides compute shaders.
- Disposition: `partly-adopted-with-correction`; implementation: `public/neural/cinematic-scene.js`.

### school-of-motion

Source: https://schoolofmotion.com/blog/10-websites-with-great-animation-in-2026

- Evidence: Article inspected.
- Contribution: Typography, pacing, section choreography and useful microinteractions.
- Ad Astra application: Make scroll change perspective and narrative, rather than merely rotating an ornament.
- Disposition: `implemented-pattern`; implementation: `public/neural/scroll-narrative.css`.

### youtube-spline

Source: https://www.youtube.com/watch?v=JGlmbElrGbo

- Evidence: Timed out; video/transcript not reviewed.
- Contribution: Unknown beyond the supplied description.
- Ad Astra application: No implementation claim derived from unavailable video.
- Disposition: `unverified`.

### youtube-claude

Source: https://www.youtube.com/watch?v=AGHqBAVyrQs

- Evidence: Title visible; no demonstration or transcript available.
- Contribution: Title suggests AI-assisted 3D development.
- Ad Astra application: Treat as a development workflow lead; no verified design specification extracted.
- Disposition: `unverified`.

### youtube-scroll

Source: https://www.youtube.com/watch?v=IR1tzLU-r_4&t=667

- Evidence: Timed out; video/transcript not reviewed.
- Contribution: Unknown beyond supplied description.
- Ad Astra application: No claim to have reviewed its demonstrated scroll rig.
- Disposition: `unverified`.

### reddit-mesh

Source: https://www.reddit.com/r/webdev/comments/1scdv42/i_built_a_curated_gallery_for_the_best_3d/

- Evidence: Public post inspected.
- Contribution: Points to mesh3d.gallery and describes its directory stack.
- Ad Astra application: Gallery infrastructure is not the Ad Astra runtime architecture.
- Disposition: `reference-only`.

### facebook-brain

Source: https://www.facebook.com/reel/768474506284450/?fs=e&mibextid=wwXIfr&fs=e

- Evidence: Public title/description only; playback not inspected.
- Contribution: The Brain Paradox is a biology/science inspiration lead.
- Ad Astra application: No footage copied, anatomy validation or content licence inferred.
- Disposition: `unverified-visual`.

### three

Source: https://threejs.org/manual/en/fundamentals.html

- Evidence: Official documentation and installed source inspected.
- Contribution: Scenes, materials, lighting, geometry and camera control.
- Ad Astra application: Keep the current self-hosted renderer as the public site's one 3D foundation.
- Disposition: `already-in-use`; implementation: `public/neural/cinematic-scene.js`.

### r3f

Source: https://docs.pmnd.rs/react-three-fiber/getting-started/introduction

- Evidence: Official documentation inspected.
- Contribution: React composition of Three.js scenes; React-major compatibility matters.
- Ad Astra application: Use if/when the scene moves into the React workspace; avoid a rewrite or second renderer on the current static site; v10 is alpha.
- Disposition: `conditional-adoption`; implementation: `apps/customer-workspace/package.json`.

### gsap

Source: https://gsap.com/docs/v3/Plugins/ScrollTrigger/

- Evidence: Official documentation and standard licence inspected.
- Contribution: Pinning, scrubbing, camera timelines and responsive animation lifecycles.
- Ad Astra application: Current sequence uses native sticky/progress for this bounded interaction; consider GSAP for a larger authored timeline. Site use is permitted; a competing visual animation builder needs licence review.
- Disposition: `concept-applied-library-not-installed`; implementation: `public/neural/scroll-narrative.css`, `public/neural/cinematic-home.js`.

### spline

Source: https://spline.design/

- Evidence: Official site capabilities inspected.
- Contribution: Designer-editable materials, interaction states and export workflows.
- Ad Astra application: Suitable for an approved editable scene; no .splinecode file was found in the scoped creative/public asset inventory.
- Disposition: `authoring-option`.

### rive

Source: https://rive.app/

- Evidence: Official site capabilities inspected.
- Contribution: State machines, rigging, vector UI and data-bound interactions.
- Ad Astra application: Use for compact voice/button/UI states after an approved .riv asset exists; do not add it merely to duplicate a Three.js brain.
- Disposition: `authoring-option`.

### lottie

Source: https://lottiefiles.com/

- Evidence: Official site capabilities inspected.
- Contribution: Small vector transitions, illustrations and interface motion.
- Ad Astra application: Use for lightweight UI feedback; not a replacement for physically rendered 3D materials.
- Disposition: `selective-option`.

### react-flow

Source: https://www.reactflow.dev/

- Evidence: Official site and current component source inspected.
- Contribution: Selectable nodes, zoom/pan and workflow relationships; MIT core.
- Ad Astra application: Already installed at 12.12.1 in the isolated React workspace. Marketing uses a small semantic SVG example; no duplicate dependency required.
- Disposition: `already-in-use-and-public-example-added`; implementation: `apps/customer-workspace/components/workflow-graph.tsx`, `public/platform-preview/knowledge-map.js`.

### blender

Source: https://www.blender.org/features/modeling/

- Evidence: Official modelling documentation inspected.
- Contribution: Sculpting, topology, UVs and authored production geometry.
- Ad Astra application: Use for an art-directed neural GLB and high-quality film master; renderer code alone cannot establish final studio-quality artwork.
- Disposition: `production-pipeline-option`.

### framer

Source: https://www.framer.com/

- Evidence: Official public site inspected.
- Contribution: Fast visual page composition, breakpoints and motion prototypes.
- Ad Astra application: Use for isolated prototypes if useful; do not introduce another published source/CMS alongside the existing Git release chain.
- Disposition: `prototype-only`.

### tripo

Source: https://www.tripo3d.ai/

- Evidence: Official public site inspected.
- Contribution: Image/text-to-mesh and topology/rigging options.
- Ad Astra application: Use only as a starting mesh, followed by review, retopology, materials and web optimization. Claimed production readiness is provider marketing.
- Disposition: `conditional-asset-tool`.

### kimi

Source: https://www.kimi.com/

- Evidence: Public surface inspected; no generated project tested.
- Contribution: Agent-assisted design/coding and a 3D Make entry point.
- Ad Astra application: Potential prototyping assistant; does not replace the website renderer, UX design or QA.
- Disposition: `prototype-only`.

### lovable

Source: https://lovable.dev/

- Evidence: Public fetch timed out.
- Contribution: Not independently assessed in this audit.
- Ad Astra application: Do not claim its output or integration has been evaluated.
- Disposition: `unverified`.

### adobe

Source: https://www.adobe.com/products/firefly.html

- Evidence: Official public capabilities inspected; 30 connected asset metadata results sampled, not all assets viewed.
- Contribution: Image generation/refinement, crop expansion, storyboards, grading and media finishing.
- Ad Astra application: Carry one art direction through final stills, responsive crops and film finishing. Export governed web assets rather than embed an authoring application.
- Disposition: `production-pipeline-option`; existing integration point: `projects/website-customer-experience/asset-selections.json`.

### runway

Source: https://runway.com/product

- Evidence: Official public capabilities inspected; 30 recent media metadata entries sampled. No final film acceptance established.
- Contribution: Image/video generation, relighting, shot editing, performance and creative workflows.
- Ad Astra application: Develop coherent hero shots and cinematic transitions. Generated film does not replace browser-based neural interactivity.
- Disposition: `production-pipeline-option`; resource register: `projects/website-customer-experience/resources.json`.

### invideo

Source: https://invideo.io/

- Evidence: Official public capabilities inspected and two matching Ad Astra project metadata entries identified; finished edits not reviewed.
- Contribution: Shot-by-shot storyboarding, multitrack assembly, grading, audio mixing and collaboration.
- Ad Astra application: Assemble the selected shots into one final film with consistent pacing, captions and web-specific exports.
- Disposition: `production-pipeline-option`; resource register: `projects/website-customer-experience/resources.json`.

### sanity

Source: https://www.sanity.io/

- Evidence: Official public capabilities and Ad Astra project/dataset metadata inspected. No private document bodies read or publishing changes made.
- Contribution: Structured content, image hotspots/alt text, revisions, content releases and preview workflows.
- Ad Astra application: Define page scenes, product stories, selected assets and localized copy as governed content, integrated through the canonical build. Keep layout and service-availability decisions in their existing authorities.
- Disposition: `content-integration-recommendation`; integration boundaries: `projects/website-customer-experience/project.json` and `asset-selections.json`.

## Technical corrections and selection rules

- WebGL2 does not provide compute shaders. The MDX article's statement is not adopted; use established rendering APIs and official documentation for the actual runtime.
- React Three Fiber must match the React major. Its documentation currently labels v10 alpha; no alpha migration is proposed for this public visual release.
- The current GSAP no-charge licence permits ordinary site implementation, but restricts certain competing visual animation-builder uses. Marketing-site animation and an eventual Ad Astra animation-authoring product are distinct licensing cases.
- React Flow is already present in the isolated workspace, where the graph is explicitly labelled a read-only sample. A diagram must not imply verified model internals or customer execution.
- No `.glb`, `.gltf`, `.blend`, `.splinecode`, `.riv` or `.lottie` source asset was found in the scoped local creative/public inventory. Spline/Rive/Tripo are therefore authoring options, not imported scene deliverables.
- Reference screenshots remain audit evidence. No DJI, Apple, studio, gallery or video creator artwork is copied into Ad Astra.

## Current implementation increment

1. A native sticky scroll sequence changes the neural camera/perspective and narrative text together on desktop, with a static/mobile alternative and no scroll hijacking.
2. A product stage selects six distinct governed visual roles, follows focus/hover on the product list, supports keyboard selection and links to the actual family pages.
3. A semantic knowledge-map example supports node selection, neighboring connections and explanatory detail, with a readable no-script fallback.
4. The central project PR reference is corrected from merged #38 to current #39, and the design reference manifest is attached to the existing source-of-truth structure.

These changes passed 218 local source tests, 180 route/viewport observations, 45 automated accessibility scans and dedicated product/knowledge-map interaction checks. The corrected product captions also passed a fresh homepage accessibility scan. Rendered neural-motion and scroll-story evidence is recorded separately under `/workspace/LStra/review/ad-astra-design-concepts-20261114/implementation/`. Local checks do not establish owner acceptance or remote CI completion, and an unchanged older preview does not include this increment.

Manual screenshot review caught overlapping hero headlines despite the initial passing motion checks. The follow-up corrects the handoff timing and requires the first headline to be fully hidden when the second becomes readable. This is why automated interaction checks alone do not establish final visual acceptance.

## Remaining craft work for a final premium release

An art-directed final neural model, a selected and edited cinematic master, consistent final crops for every page group, manual device/accessibility review and explicit owner visual acceptance remain distinct craft/acceptance tasks. The current procedural sculpture and curated samples should not be presented as finished production AI or as evidence of achieved AGI/ASI. Customer/provider release acceptance remains outside a design inspiration audit.

## Recommended controlled build order

1. Fix the experience brief: one palette, typography system, lighting direction, neural silhouette and product story for the arrival, discovery, workspace and product-detail pages.
2. Produce the final artwork and film: Blender or an approved editable scene for geometry; Adobe for still finishing; Runway for selected shots; invideo or one chosen timeline editor for the final cut. Preserve the source, rights, export settings and final selection together.
3. Integrate into the current site: Three.js for realtime neural motion, native scroll for the current bounded sequence, and React Flow for customer workflow relationships in the existing workspace. Add GSAP only when authored timeline complexity warrants it.
4. Bind visible intelligence states to real engine events through the existing server contracts. Expose status, retrieved sources and permitted tool progress; never simulate completed customer actions or expose private model reasoning.
5. Complete the customer journey and responsive review: discovery, product fit, sample, account, workspace, subscription and support, preserving reduced motion and static fallbacks. Validate navigation, media loading, mobile crops, accessibility and real-device performance before calling the visual build final.
6. Review one exact candidate and preview from the current Git chain. Content/media tools feed that chain; they do not create competing live websites or automatic public availability claims.

## External-source coverage and limits

The 34-entry audit retrieved written material or metadata for the supplied design links, connected creative applications and relevant official documentation. Eight rendered screenshots cover the first and one scrolled view of DJI, MCKP, TheBrain and Lusion; Lusion remained in its loading sequence. The three YouTube demonstrations and Facebook reel were not visually reviewed; Lovable timed out; Active Theory's extracted page did not expose its main scene. Their content is not invented.

Supporting asset discovery sampled 30 Adobe metadata results, 30 recent Runway media entries, two invideo projects, and scoped Ad Astra Drive search results. These samples do not establish that all files, chats, media revisions or private CMS content were searched. No customer records or provider credential values were read.
