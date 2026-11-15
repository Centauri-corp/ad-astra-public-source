#include "AdAstraCinematicCoreActor.h"
#include "Components/SceneComponent.h"
#include "Components/StaticMeshComponent.h"
#include "Engine/StaticMesh.h"
#include "UObject/UObjectGlobals.h"

AAdAstraCinematicCoreActor::AAdAstraCinematicCoreActor()
{
    PrimaryActorTick.bCanEverTick = true;
    Root = CreateDefaultSubobject<USceneComponent>(TEXT("SceneRoot"));
    SetRootComponent(Root);
}

void AAdAstraCinematicCoreActor::OnConstruction(const FTransform& Transform)
{
    Super::OnConstruction(Transform);
    RegenerateNodes();
}

void AAdAstraCinematicCoreActor::RegenerateNodes()
{
    for (UStaticMeshComponent* Component : Nodes)
    {
        if (IsValid(Component)) Component->DestroyComponent();
    }
    Nodes.Reset();
    UStaticMesh* Sphere = LoadObject<UStaticMesh>(nullptr, TEXT("/Engine/BasicShapes/Sphere.Sphere"));
    if (!Sphere) return;
    const int32 Count = FMath::Clamp(NodeCount, 8, 128);
    const float GoldenAngle = 2.399963229728653f;
    for (int32 Index = 0; Index < Count; ++Index)
    {
        UStaticMeshComponent* Node = NewObject<UStaticMeshComponent>(this);
        if (!Node) continue;
        Node->SetStaticMesh(Sphere);
        Node->SetCollisionEnabled(ECollisionEnabled::NoCollision);
        Node->SetCastShadow(false);
        Node->SetupAttachment(Root);
        AddInstanceComponent(Node);
        Node->RegisterComponent();
        const float Z = 1.f - 2.f * (Index + 0.5f) / Count;
        const float R = FMath::Sqrt(FMath::Max(0.f, 1.f - Z * Z));
        const float Theta = GoldenAngle * Index;
        Node->SetRelativeLocation(FVector(FMath::Cos(Theta) * R * Radius, FMath::Sin(Theta) * R * Radius, Z * Radius));
        Node->SetRelativeScale3D(FVector(0.08f + 0.04f * (Index % 3)));
        Nodes.Add(Node);
    }
}

void AAdAstraCinematicCoreActor::SetMotionEnabled(bool bEnabled)
{
    bAllowMotion = bEnabled;
}

void AAdAstraCinematicCoreActor::SetVisualIntensity(float Intensity)
{
    VisualIntensity = FMath::Clamp(Intensity, 0.f, 1.f);
}

void AAdAstraCinematicCoreActor::Tick(float DeltaTime)
{
    Super::Tick(DeltaTime);
    if (!bAllowMotion || MotionSpeed <= 0.f) return;
    Elapsed += FMath::Min(DeltaTime, 0.05f);
    const float Angle = Elapsed * MotionSpeed * (0.5f + VisualIntensity);
    Root->SetRelativeRotation(FRotator(0.f, FMath::RadiansToDegrees(Angle), 0.f));
}
