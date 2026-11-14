# Neural motion quality and preview provenance

The website browser job on `ee498fa` failed at a byte-equality comparison of two canvas-element PNG screenshots after Pause. An element screenshot is a composited page crop: it includes text and other foreground elements over the canvas. It is not a read-back of the WebGL framebuffer.

A local reproduction issued no additional WebGL draws after Pause while the two captured images differed in 16 foreground-text pixels by at most two channel levels. Another capture pair on the same source was identical. This demonstrates that the original screenshot assertion can fail independently of continued scene rendering; it does not establish that every hosted discrepancy has the same rasterization pattern.

The audit now verifies the real rendering lifecycle as well as image appearance:

- Test-only instrumentation observes native WebGL draw, clear and framebuffer-copy calls without stubbing the renderer. Motion must produce new draws and changing rendered geometry.
- After Pause, WebGL operation counts and intrinsic canvas dimensions must remain exactly unchanged. PNGs are decoded before comparison; only channel differences of at most three levels and a maximum changed-pixel fraction of 0.0001 are tolerated for page-compositing noise. The exact zero-operation requirement remains independent of this image tolerance.
- Pause ends the decorative entrance transition, so a fading canvas or still cannot continue changing the visible composition.
- The static artwork must replace the live canvas when reduced motion or data saving becomes active. Restoring motion creates one scene. A delayed module import cannot create a scene after the preference has changed.
- Both the shared motion-state observer and preference listeners enforce the current preference. A local desktop probe observed the shared listener updating while the scene's separate MediaQueryList notification had not arrived; the invariant must hold regardless of notification order.
- A failed audit retains its stage, width and runtime state, rather than leaving only a blank result.

The media register separately identifies native still production, the live cinematic hero, legacy workspace scenes and the existing twelve-second silent company study. Historical PR38 and older generated stills are not current PR39 selection instructions. No study is substituted for the unfinished final company film, and registration does not establish visual/rights acceptance.

Reviewers should use a preview whose provider metadata matches the current PR39 head. The browser tab inspected during this repair was at `9c50752`, which predates the cinematic hero and the subsequent design-reference work. A READY older preview does not verify current source.

All of these checks concern decorative artwork, accessibility and delivery provenance. They do not claim authenticated customer/model execution or authorize public promotion.
