#pragma once
#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "AdAstraCinematicCoreActor.generated.h"

class UStaticMeshComponent;
class USceneComponent;
class UStaticMesh;

UCLASS(BlueprintType, Blueprintable)
class ADASTRACINEMATIC_API AAdAstraCinematicCoreActor : public AActor
{
    GENERATED_BODY()
public:
    AAdAstraCinematicCoreActor();
    virtual void OnConstruction(const FTransform& Transform) override;
    virtual void Tick(float DeltaTime) override;

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category="AD ASTRA")
    TObjectPtr<USceneComponent> Root;

    // This is ambient artwork, not real AI reasoning or customer data.
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="AD ASTRA|Visual", meta=(ClampMin="8", ClampMax="128"))
    int32 NodeCount = 48;
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="AD ASTRA|Visual", meta=(ClampMin="50.0", ClampMax="3000.0"))
    float Radius = 400.f;
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="AD ASTRA|Motion", meta=(ClampMin="0.0", ClampMax="2.0"))
    float MotionSpeed = 0.08f;
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="AD ASTRA|Motion")
    bool bAllowMotion = false;

    UFUNCTION(BlueprintCallable, Category="AD ASTRA|Motion")
    void SetMotionEnabled(bool bEnabled);
    UFUNCTION(BlueprintCallable, Category="AD ASTRA|Motion")
    void SetVisualIntensity(float Intensity);

private:
    UPROPERTY(Transient)
    TArray<TObjectPtr<UStaticMeshComponent>> Nodes;
    float Elapsed = 0.f;
    float VisualIntensity = 0.5f;
    void RegenerateNodes();
};
