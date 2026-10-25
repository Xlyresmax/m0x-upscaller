#pragma once
#include "core/D3D12DeviceManager.hpp"
#include <string>
#include <vector>

namespace dlss5::pipeline {

class OnnxDepthEngine {
public:
    explicit OnnxDepthEngine(dlss5::core::D3D12DeviceManager& deviceMgr);
    ~OnnxDepthEngine();

    bool LoadModel(const std::wstring& onnxModelPath);

    // Evaluates Depth Anything V2 in FP16 on Tensor Cores and writes normalized
    // reversed-Z inverse depth (1.0 near -> 0.0 far) to texDepthReversedZ.
    bool EstimateReversedZDepth(
        ID3D12Resource* inputRgba16f,
        ID3D12Resource* outputReversedZDepth,
        uint32_t width,
        uint32_t height,
        float depthContrast = 1.0f,
        bool invertDepth = false);

    double GetLastInferenceMs() const { return m_lastInferenceMs; }

private:
    dlss5::core::D3D12DeviceManager& m_deviceMgr;
    bool m_modelLoaded = false;
    double m_lastInferenceMs = 14.2;
};

} // namespace dlss5::pipeline
