# AD ASTRA — Unreal Cinematic Intelligence Development

This directory contains an **initial native Unreal Engine C++ project** for a production-isolated cinematic laboratory. It is not a compiled game, finished cinematic, deployed stream, or production promotion.

## Setup

1. Install a compatible Unreal Engine 5.6+ toolchain on an approved Windows GPU workstation with Visual Studio C++ development support. The `.uproject` currently targets 5.6; update and test EngineAssociation before using a newer editor.
2. Open `AdAstraCinematic/AdAstraCinematic.uproject`, allow project file generation and build the native module.
3. Create or open an empty development level. In Unreal's Python console execute the contents of `Tools/build_origin_stage.py`.
4. The editor tool places a procedural neural core, CineCameraActor and DirectionalLight. Motion is initially disabled; enable `bAllowMotion` only for an approved interactive preview.
5. Use `node unreal/AdAstraCinematic/Tools/export_scene_contract.cjs` from the repository root to regenerate the seven-scene offline contract; use `--check` to detect drift once the file is committed.
6. Add artist-authored assets through licensed Blender/Houdini -> FBX/glTF import as appropriate; develop Control Rig, MetaHuman/Live Link mocap retargeting and Sequencer shots in the Editor. These assets and cinematic takes are *not yet created*.
7. Before shipping any video or stream, validate licensing, face/body mocap consent, performance, exact-SHA build evidence, independent code review, CEO visual signoff and release approvals.

## Intended production architecture

`Intelligence OS -> Graphics Intelligence Core -> validated offline scene adapter -> Unreal cinematic scene composer -> Control Rig / MetaHuman / Live Link / Niagara / Sequencer -> Movie Render Queue or isolated interactive streaming`

A live connection must use a separately reviewed authenticated, allowlisted scene-command gateway; no direct AI-to-Unreal executable commands. Unreal movie rendering is suitable for the public cinematic hero, while Three.js remains the lightweight browser interaction layer. GPU-hosted interactive Unreal sessions are a later gated optional product; Vercel is not a GPU renderer.

## Next implementation targets

- Replace starter geometry with a designed topology: hierarchical neural filaments, intelligent particles, emissive PBR materials, authored key light and procedural world environments.
- Construct a Level Sequence with cinematic camera rails, dramatic transitions and VFX shot continuity.
- Import a licensed digital human and build a **consented** mocap -> Live Link -> IK Retargeter -> Control Rig -> Sequencer pipeline.
- Define signed scene command data for lens, shot, procedural motif, measured annotations, semantic roles and intelligence reactions.
- Add automated Unreal build, editor smoke, cinematic render frames, performance benchmarks and CI artifacts to a private GPU-enabled runner.
- Store large binary Unreal assets and mocap takes in governed storage with licensing and source hashes, not scattered GitHub repositories.

## Boundaries

This laboratory preserves the current private/coming-soon production gates and the AI infrastructure spending cap. It does not upload private data, start paid GPU sessions, mutate the active public website or imply live model activity.
