#pragma once
#include <windows.h>
#include <d3d12.h>
#include <dxgi1_6.h>
#include <wrl/client.h>
#include <cstdint>
#include <string>
#include <mutex>

using Microsoft::WRL::ComPtr;

namespace dlss5::core {

struct GpuTelemetry {
    std::string adapterName;
    uint64_t dedicatedVramMb = 0;
    uint64_t usedVramMb = 0;
    bool dlss5Supported = false;
    bool rtxVsrSupported = false;
    bool preWarmed = false;
};

class D3D12DeviceManager {
public:
    D3D12DeviceManager();
    ~D3D12DeviceManager();

    bool Initialize();
    void Shutdown();

    ID3D12Device8* GetDevice() const { return m_device.Get(); }
    ID3D12CommandQueue* GetDirectQueue() const { return m_directQueue.Get(); }
    ID3D12CommandQueue* GetComputeQueue() const { return m_computeQueue.Get(); }
    IDXGIFactory6* GetFactory() const { return m_factory.Get(); }

    void WaitForGpuIdle();
    GpuTelemetry QueryTelemetry() const;

    ComPtr<ID3D12Resource> CreateTexture2D(
        uint32_t width,
        uint32_t height,
        DXGI_FORMAT format,
        D3D12_RESOURCE_FLAGS flags = D3D12_RESOURCE_FLAG_ALLOW_UNORDERED_ACCESS,
        D3D12_RESOURCE_STATES initialState = D3D12_RESOURCE_STATE_COMMON);

private:
    ComPtr<IDXGIFactory6> m_factory;
    ComPtr<IDXGIAdapter4> m_adapter;
    ComPtr<ID3D12Device8> m_device;
    ComPtr<ID3D12CommandQueue> m_directQueue;
    ComPtr<ID3D12CommandQueue> m_computeQueue;
    ComPtr<ID3D12Fence> m_fence;
    uint64_t m_fenceValue = 0;
    HANDLE m_fenceEvent = nullptr;
    std::string m_adapterName;
};

} // namespace dlss5::core
