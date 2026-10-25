#pragma once
#include "core/D3D12DeviceManager.hpp"
#include "core/VramTextureCache.hpp"
#include <string>

namespace dlss5::pipeline {

enum class ContentPreset {
    ScreenShareCrisp = 0,
    CameraPortraitNatural = 1,
    Gameplay3DUltra = 2,
    LowBitrateRestore = 3
};

struct EnhancementParams {
    ContentPreset contentPreset = ContentPreset::Gameplay3DUltra;
    // Stage 3: Upscaling
    bool enableRtxVsr = true;
    int vsrQualityLevel = 4;        // 1..4
    int upscaleFactor = 2;          // 1, 2, 3, 4
    bool removeCompressionBlocks = true;

    // Stage 4: DLSS 5 3D-Guided Neural Rendering
    bool enableDlss5Neural = true;
    std::string dlss5Style = "Natural"; // "Natural" | "Cinematic"
    std::string dlss5ModelPreset = "PresetB_Fast118M"; // "PresetA_155M" | "PresetB_Fast118M"
    float structureIntensity = 0.85f;   // 0.0 .. 2.0 (Subsurface scattering, AO, reflections)
    float toneIntensity = 0.55f;        // 0.0 .. 2.0 (Low-frequency scene relighting)
    float skinStrength = 0.35f;         // 0.0 .. 2.0 (Lower for real camera faces to avoid waxy look)
    bool semanticFaceMask = true;       // Protects human likeness / UI overlays
    int neuralPasses = 1;               // 1 .. 4 passes

    // Stage 5: Frame Generation
    bool enableFrameGen = false;
    int frameGenMultiplier = 2;         // 2x, 3x, 4x, 8x
    std::string frameGenBackend = "DLSS_MFG"; // "DLSS_MFG" | "FSR3_OFA" | "RIFE_VULKAN"

    // Stage 6: Post-Grading & RTX Video HDR (Instant <8ms HLSL Shader)
    bool enableRtxVideoHdr = false;
    float paperWhiteNits = 203.0f;
    float exposure = 0.0f;
    float contrast = 1.05f;
    float vibrance = 0.18f;
    float saturation = 1.02f;
    float nisSharpness = 0.35f;
    float filmGrain = 0.04f;
    float depthContrast = 1.0f;
};

class RtxVsrAndDlss5Harness {
public:
    explicit RtxVsrAndDlss5Harness(dlss5::core::D3D12DeviceManager& deviceMgr);
    ~RtxVsrAndDlss5Harness();

    // Pre-warms the hidden 64x64 DirectX 12 swapchain and loads nvngx_dlss.dll +
    // nvngx_dlssnr.dll + Streamline/RenoDX hooks once at startup so the 3.5s init
    // cost never happens when the user clicks "Enhance & Inspect Current Frame".
    bool PreWarmRuntime(const std::wstring& dlssFilesDir);

    // Stage 3: Runs NVIDIA RTX Video Super Resolution / DLSS Super Resolution
    bool EvaluateRtxVsrUpscale(
        dlss5::core::CachedFrameSet& frameSet,
        const EnhancementParams& params);

    // Stage 4: Runs DLSS 5 3D-Guided Neural Rendering over the cached depth + color buffers
    bool EvaluateDlss5NeuralPass(
        dlss5::core::CachedFrameSet& frameSet,
        const EnhancementParams& params,
        bool isLowResProxyDrag = false);

    // Stage 6: Updates the HLSL SplitWipeGrade constant buffer in <1ms for 60+ FPS slider response
    bool ApplyInstantPostGradeShader(
        dlss5::core::CachedFrameSet& frameSet,
        const EnhancementParams& params,
        float wipePosition = 0.5f);

    bool IsDlssLoaded() const { return m_hDlss != nullptr; }
    bool IsDlssnrLoaded() const { return m_hDlssnr != nullptr; }
    bool IsDlssgLoaded() const { return m_hDlssg != nullptr; }
    bool IsDlisrLoaded() const { return m_hDlisr != nullptr; }

private:
    dlss5::core::D3D12DeviceManager& m_deviceMgr;
    ComPtr<IDXGISwapChain3> m_hiddenSwapChain;
    bool m_isPreWarmed = false;
    HMODULE m_hDlss = nullptr;
    HMODULE m_hDlssnr = nullptr;
    HMODULE m_hDlssg = nullptr;
    HMODULE m_hDlisr = nullptr;
};

} // namespace dlss5::pipeline
