#pragma once
#include "core/D3D12DeviceManager.hpp"
#include "core/VramTextureCache.hpp"
#include "pipeline/OnnxDepthEngine.hpp"
#include "pipeline/RtxVsrAndDlss5Harness.hpp"
#include <nlohmann/json.hpp>
#include <functional>
#include <string>

namespace dlss5::bridge {

class NativeBridgeServer {
public:
    NativeBridgeServer(
        dlss5::core::D3D12DeviceManager& deviceMgr,
        dlss5::core::VramTextureCache& vramCache,
        dlss5::pipeline::OnnxDepthEngine& depthEngine,
        dlss5::pipeline::RtxVsrAndDlss5Harness& dlssHarness);

    // Handles incoming JSON/Binary commands from the Next.js UI (<0.5ms dispatch)
    nlohmann::json HandleCommand(const nlohmann::json& msg, std::function<void(const nlohmann::json&)> emitEvent);

private:
    dlss5::core::D3D12DeviceManager& m_deviceMgr;
    dlss5::core::VramTextureCache& m_vramCache;
    dlss5::pipeline::OnnxDepthEngine& m_depthEngine;
    dlss5::pipeline::RtxVsrAndDlss5Harness& m_dlssHarness;
    dlss5::pipeline::EnhancementParams m_params;
};

} // namespace dlss5::bridge
