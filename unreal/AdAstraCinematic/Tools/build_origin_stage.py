"""Run inside Unreal Editor Python console. Non-destructive bootstrap; never deploys or saves a level."""
import unreal

def create_origin_stage():
    world = unreal.EditorLevelLibrary.get_editor_world()
    if not world:
        raise RuntimeError("Open an empty development level first")
    actor_class = getattr(unreal, "AdAstraCinematicCoreActor", None)
    if actor_class is None:
        raise RuntimeError("Compile the AdAstraCinematic C++ project before running")
    origin = unreal.EditorLevelLibrary.spawn_actor_from_class(actor_class, unreal.Vector(0, 0, 150))
    origin.set_actor_label("AD ASTRA | Origin Neural Field | Development")
    camera = unreal.EditorLevelLibrary.spawn_actor_from_class(unreal.CineCameraActor, unreal.Vector(-1250, 0, 300))
    camera.set_actor_label("AD ASTRA | Cinematic Camera")
    camera.set_actor_rotation(unreal.Rotator(-7, 0, 0), False)
    key = unreal.EditorLevelLibrary.spawn_actor_from_class(unreal.DirectionalLight, unreal.Vector(0, 0, 700))
    key.set_actor_label("AD ASTRA | Key Light")
    key.set_actor_rotation(unreal.Rotator(-35, 25, 0), False)
    unreal.log("AD ASTRA stage created in current editor level; motion remains off until manually enabled. Save manually after review.")
    return origin

if __name__ == "__main__":
    create_origin_stage()
