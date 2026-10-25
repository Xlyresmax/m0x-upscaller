// Zero-Python Native C++ Bridge Hook for Next.js Frontend
// Connects directly to src/bridge/NativeBridgeServer.cpp via WebView2 HostObject / Binary WebSocket

export interface BridgeTelemetry {
  adapter: string;
  dedicatedVramMb: number;
  usedVramMb: number;
  dlss5Supported: boolean;
  rtxVsrSupported: boolean;
  preWarmed: boolean;
  lastLatencyMs: number;
  activeTier: 'IDLE_60FPS' | 'HLSL_INSTANT' | 'PROXY_720P_DRAG' | 'FULL_4K_SETTLE';
}

export function sendCppCommand(payload: Record<string, unknown>): void {
  if (typeof window !== 'undefined' && (window as unknown as { chrome?: { webview?: { postMessage: (msg: string) => void } } }).chrome?.webview) {
    (window as unknown as { chrome: { webview: { postMessage: (msg: string) => void } } }).chrome.webview.postMessage(JSON.stringify(payload));
  }
}
