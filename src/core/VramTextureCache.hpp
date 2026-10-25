#pragma once
#include "core/D3D12DeviceManager.hpp"
#include <mutex>

namespace dlss5::core {

// Holds the active inspected frame's GPU textures in VRAM so changing UI sliders
// updates in <8ms (for post-grading) or ~35ms (for DLSS 5 neural re-eval) without
// re-decoding video or re-running Depth Anything V2.
struct CachedFrameSet {
    double timestampSec = -1.0;
    uint32_t sourceWidth = 1920;
    uint32_t sourceHeight = 1080;
    uint32_t targetWidth = 3840;
    uint32_t targetHeight = 2160;

    ComPtr<ID3D12Resource> texRawLinear;     // Stage 1: RGBA16F Linear scRGB source frame
    ComPtr<ID3D12Resource> texDepthReversedZ;// Stage 2: R32F Reversed-Z Depth Anything V2 map
    ComPtr<ID3D12Resource> texMotionVectors; // Stage 2: RG16F NVOFA Optical Flow vectors
    ComPtr<ID3D12Resource> texVsrUpscaled;   // Stage 3: 4K RTX Video Super Resolution output
    ComPtr<ID3D12Resource> texDlss5Natural;  // Stage 4a: DLSS 5 Neural Pass (Natural style)
    ComPtr<ID3D12Resource> texDlss5Cinematic;// Stage 4b: DLSS 5 Neural Pass (Cinematic style)
    ComPtr<ID3D12Resource> texFinalGraded;   // Stage 6: HLSL SplitWipeGrade post-processed output
};

class VramTextureCache {
public:
    explicit VramTextureCache(D3D12DeviceManager& deviceMgr) : m_deviceMgr(deviceMgr) {}

    void AllocateOrResize(uint32_t srcW, uint32_t srcH, uint32_t dstW, uint32_t dstH) {
        std::scoped_lock lock(m_mutex);
        if (m_cache.sourceWidth == srcW && m_cache.sourceHeight == srcH &&
            m_cache.targetWidth == dstW && m_cache.targetHeight == dstH &&
            m_cache.texRawLinear != nullptr) {
            return;
        }
        m_cache.sourceWidth = srcW;
        m_cache.sourceHeight = srcH;
        m_cache.targetWidth = dstW;
        m_cache.targetHeight = dstH;

        m_cache.texRawLinear = m_deviceMgr.CreateTexture2D(srcW, srcH, DXGI_FORMAT_R16G16B16A16_FLOAT);
        m_cache.texDepthReversedZ = m_deviceMgr.CreateTexture2D(srcW, srcH, DXGI_FORMAT_R32_FLOAT);
        m_cache.texMotionVectors = m_deviceMgr.CreateTexture2D(srcW, srcH, DXGI_FORMAT_R16G16_FLOAT);
        m_cache.texVsrUpscaled = m_deviceMgr.CreateTexture2D(dstW, dstH, DXGI_FORMAT_R16G16B16A16_FLOAT);
        m_cache.texDlss5Natural = m_deviceMgr.CreateTexture2D(dstW, dstH, DXGI_FORMAT_R16G16B16A16_FLOAT);
        m_cache.texDlss5Cinematic = m_deviceMgr.CreateTexture2D(dstW, dstH, DXGI_FORMAT_R16G16B16A16_FLOAT);
        m_cache.texFinalGraded = m_deviceMgr.CreateTexture2D(dstW, dstH, DXGI_FORMAT_R16G16B16A16_FLOAT);
    }

    CachedFrameSet& Get() { return m_cache; }

private:
    D3D12DeviceManager& m_deviceMgr;
    CachedFrameSet m_cache;
    std::mutex m_mutex;
};

} // namespace dlss5::core
