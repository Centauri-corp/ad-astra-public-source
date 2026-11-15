using UnrealBuildTool;
using System.Collections.Generic;
public class AdAstraCinematicTarget : TargetRules
{
    public AdAstraCinematicTarget(TargetInfo Target) : base(Target)
    {
        Type = TargetType.Game;
        DefaultBuildSettings = BuildSettingsVersion.V5;
        ExtraModuleNames.Add("AdAstraCinematic");
    }
}
