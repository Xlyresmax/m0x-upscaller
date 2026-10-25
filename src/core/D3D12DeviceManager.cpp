#include "core/D3D12DeviceManager.hpp"
#include <stdexcept>

namespace dlss5::core {

D3D12DeviceManager::D3D12DeviceManager() = default;

D3D12DeviceManager::~D3D12DeviceManager() {
    Shutdown();
}

bool D3D12DeviceManager::Initialize() {
    UINT dxgiFlags = 0;
    if (FAILED(CreateDXGIFactory2(dxgiFlags, IID_PPV_ARGS(&m_factory)))) {
        return false;
    }

    ComPtr<IDXGIAdapter1> adapter1;
    for (UINT i = 0;
         m_factory->EnumAdapterByGpuPreference(i, DXGI_GPU_PREFERENCE_HIGH_PERFORMANCE, IID_PPV_ARGS(&adapter1)) != DXGI_ERROR_NOT_FOUND;
         ++i) {
        DXGI_ADAPTER_DESC1 desc{};
        adapter1->GetDesc1(&desc);
        if (desc.Flags & DXGI_ADAPTER_FLAG_SOFTWARE) continue;

        if (SUCCEEDED(D3D12CreateDevice(adapter1.Get(), D3D_FEATURE_LEVEL_12_1, IID_PPV_ARGS(&m_device)))) {
            adapter1.As(&m_adapter);
            char nameBuf[256]{};
            WideCharToMultiByte(CP_UTF8, 0, desc.Description, -1, nameBuf, sizeof(nameBuf), nullptr, nullptr);
            m_adapterName = nameBuf;
            break;
        }
    }

    if (!m_device) return false;

    D3D12_COMMAND_QUEUE_DESC qDesc{};
    qDesc.Type = D3D12_COMMAND_LIST_TYPE_DIRECT;
    qDesc.Priority = D3D12_COMMAND_QUEUE_PRIORITY_HIGH;
    if (FAILED(m_device->CreateCommandQueue(&qDesc, IID_PPV_ARGS(&m_directQueue)))) return false;

    qDesc.Type = D3D12_COMMAND_LIST_TYPE_COMPUTE;
    qDesc.Priority = D3D12_COMMAND_QUEUE_PRIORITY_NORMAL;
    if (FAILED(m_device->CreateCommandQueue(&qDesc, IID_PPV_ARGS(&m_computeQueue)))) return false;

    if (FAILED(m_device->CreateFence(0, D3D12_FENCE_FLAG_NONE, IID_PPV_ARGS(&m_fence)))) return false;
    m_fenceEvent = CreateEvent(nullptr, FALSE, FALSE, nullptr);
    return m_fenceEvent != nullptr;
}

void D3D12DeviceManager::WaitForGpuIdle() {
    if (!m_directQueue || !m_fence) return;
    const uint64_t target = ++m_fenceValue;
    m_directQueue->Signal(m_fence.Get(), target);
    if (m_fence->GetCompletedValue() < target) {
        m_fence->SetEventOnCompletion(target, m_fenceEvent);
        WaitForSingleObject(m_fenceEvent, INFINITE);
    }
}

GpuTelemetry D3D12DeviceManager::QueryTelemetry() const {
    GpuTelemetry info{};
    info.adapterName = m_adapterName;
    if (m_adapter) {
        DXGI_ADAPTER_DESC3 desc{};
        m_adapter->GetDesc3(&desc);
        info.dedicatedVramMb = desc.DedicatedVideoMemory / (1024 * 1024);

        DXGI_QUERY_VIDEO_MEMORY_INFO memInfo{};
        if (SUCCEEDED(m_adapter->QueryVideoMemoryInfo(0, DXGI_MEMORY_SEGMENT_GROUP_LOCAL, &memInfo))) {
            info.usedVramMb = memInfo.CurrentUsage / (1024 * 1024);
        }
    }
    info.dlss5Supported = m_adapterName.find("RTX") != std::string::npos;
    info.rtxVsrSupported = info.dlss5Supported;
    info.preWarmed = (m_device != nullptr);
    return info;
}

ComPtr<ID3D12Resource> D3D12DeviceManager::CreateTexture2D(
    uint32_t width, uint32_t height, DXGI_FORMAT format,
    D3D12_RESOURCE_FLAGS flags, D3D12_RESOURCE_STATES initialState) {
    D3D12_HEAP_PROPERTIES heapProps{};
    heapProps.Type = D3D12_HEAP_TYPE_DEFAULT;

    D3D12_RESOURCE_DESC texDesc{};
    texDesc.Dimension = D3D12_RESOURCE_DIMENSION_TEXTURE2D;
    texDesc.Width = width;
    texDesc.Height = height;
    texDesc.DepthOrArraySize = 1;
    texDesc.MipLevels = 1;
    texDesc.Format = format;
    texDesc.SampleDesc.Count = 1;
    texDesc.Layout = D3D12_TEXTURE_LAYOUT_UNKNOWN;
    texDesc.Flags = flags;

    ComPtr<ID3D12Resource> resource;
    m_device->CreateCommittedResource(
        &heapProps, D3D12_HEAP_FLAG_SHARED, &texDesc, initialState, nullptr, IID_PPV_ARGS(&resource));
    return resource;
}

void D3D12DeviceManager::Shutdown() {
    WaitForGpuIdle();
    if (m_fenceEvent) {
        CloseHandle(m_fenceEvent);
        m_fenceEvent = nullptr;
    }
}

} // namespace dlss5::core
