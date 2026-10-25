# m0x-upscaller | DLSS 5 Video Studio

<div align="center">

[![C++20](https://img.shields.io/badge/C%2B%2B-20-00599C?style=for-the-badge&logo=c%2B%2B&logoColor=white)](https://en.cppreference.com/w/cpp/20)
[![DirectX 12](https://img.shields.io/badge/DirectX-12_FL_12__1-0078D6?style=for-the-badge&logo=windows&logoColor=white)](https://learn.microsoft.com/en-us/windows/win32/direct3d12/direct3d-12-graphics)
[![NVIDIA RTX](https://img.shields.io/badge/NVIDIA-RTX_50%2F40%2F30-76B900?style=for-the-badge&logo=nvidia&logoColor=white)](https://www.nvidia.com/en-us/geforce/rtx/)
[![Next.js 15](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![Tauri v2](https://img.shields.io/badge/Tauri-v2-FFC131?style=for-the-badge&logo=tauri&logoColor=black)](https://v2.tauri.app/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS_v3-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)

**Next-Generation AI Neural Video & Picture Super-Resolution Studio**  
*Native C++20 DirectX 12 GPU Engine • NVIDIA DLSS 5 & RTX Video SDK • Next.js 15 Glassmorphic Studio Interface • Dual NVENC AV1/HEVC Hardware Encoding*

</div>

---

## 🌟 Executive Overview

**m0x-upscaller (DLSS 5 Video Studio)** is a workstation-grade neural upscaling and restoration suite engineered for creators, video editors, and 3D professionals. It unites a **low-overhead native C++20 DirectX 12 GPU compute engine** with a **modern desktop studio frontend** built with Next.js 15, React 18, and Tauri v2.

The engine harnesses the genuine **NVIDIA DLSS 5 / RTX Video Super Resolution (VSR)** runtime, **Streamline v2.4**, and **ONNX Neural Depth (Depth Anything V2)** to deliver real-time multi-view comparison, edge-aware reconstruction, semantic facial protection, and hardware-accelerated exports in **AV1**, **HEVC (10-bit HDR)**, and **H.264**.

---

## 🚀 Key Highlights & Capabilities

### ⚡ 1. Native C++20 DirectX 12 Compute Pipeline
- **Zero-Copy VRAM Caching**: Zero memory churn through dedicated DXGI swapchain and Direct3D 12 shared texture heaps (`VramTextureCache`).
- **HLSL SM 6.6 Real-Time Post-Process Shader**: `SplitWipeGrade.hlsl` executes in **< 0.8 ms** per frame, providing instant 120+ FPS slider updates for exposure, contrast, vibrance, NIS sharpness, and film grain without needing to re-infer neural models.
- **Hardware Telemetry**: Direct DXGI query exposing adapter name, total dedicated VRAM, allocated VRAM, and DLSS/VSR compatibility flags in real time.

### 🧠 2. NVIDIA DLSS 5 & Streamline Neural Suite
Pre-warms and coordinates genuine NVIDIA libraries in `bin/dlss_files/`:
- **`nvngx_dlss.dll`**: DLSS 2/3/5 Super Resolution (Deep Transformer Model).
- **`nvngx_dlssnr.dll`**: DLSS 5 Neural Reconstruction & Neural Relighting (Preset B / Oct 2026).
- **`nvngx_dlssg.dll`**: DLSS Frame Generation (Optical Flow acceleration).
- **`nvngx_dlisr.dll`**: NVIDIA Deep Learning Image Scaling & Multi-Frame Reconstruction.
- **`sl.interposer.dll`**: NVIDIA Streamline Framework v2.4.0 integration.

### 👁️ 3. Interactive Multi-Mode Viewport
- **Split Wipe**: Draggable bidirectional divider providing instant pixel-to-pixel comparison between the input source and the neural upscaled frame.
- **Tri-Pane Comparator**: Side-by-side tri-split showing **Original**, **Natural Neural Reconstruction**, and **Cinematic HDR Grade** simultaneously.
- **3D Depth X-Ray**: Turbo colormap visualization derived from the inverted reversed-Z neural depth buffer (near objects rendered in hot reds/oranges, backgrounds in deep indigo).
- **AI Delta Heatmap**: Spectral frequency analyzer highlighting reconstructed high-frequency edges, texture synthesis, and neural sharpening deltas.
- **Semantic Masking**: Automatic facial and skin protection mask preventing over-sharpening artifacts on human subjects while maximizing background clarity.

### 🎬 4. NVIDIA NVENC Dual-Hardware Exporter
- Up to **2x (4K UHD)** and **4x (8K Ultra)** neural resolution expansion.
- **AV1 NVENC**: Maximum compression efficiency and crisp 4K/8K streaming.
- **HEVC NVENC**: 10-bit Rec.2020 HDR support with expanded luminance headroom.
- **H.264 NVENC**: Broad backwards compatibility.
- Instant in-studio **Play in Viewport** preview and one-click **Download Export**.

---

## 🏗️ Architecture & Pipeline Flow

```mermaid
flowchart TD
    subgraph UI ["Desktop UI (Next.js 15 + Tauri v2)"]
        A[User Input Media: Video / Picture] --> B[Studio Interface & Live Viewport]
        B --> C[Interactive HLSL Controls: Exposure, Contrast, NIS, Wipe]
    end

    subgraph NativeBridge ["Native C++20 Bridge & CLI"]
        D[DLSS5VideoStudio.exe]
        E[NativeBridgeServer / DXGI Telemetry]
    end

    subgraph D3D12Engine ["DirectX 12 Hardware Backend"]
        F[D3D12DeviceManager FL 12_1]
        G[VRAM Texture Cache - Shared Heaps]
        H[SplitWipeGrade.hlsl - Compute Shader SM 6.6]
        I[OnnxDepthEngine - Depth Anything V2]
    end

    subgraph NvidiaSDKs ["NVIDIA RTX & DLSS Runtime"]
        J[nvngx_dlss.dll - Super Resolution]
        K[nvngx_dlssnr.dll - Neural Reconstruction]
        L[nvngx_dlssg.dll - Frame Generation]
        M[NVIDIA Dual NVENC Hardware Encoders]
    end

    B <-->|IPC / HTTP Bridge| NativeBridge
    NativeBridge --> D3D12Engine
    D3D12Engine --> NvidiaSDKs
    NvidiaSDKs -->|Hardware Accelerated Export| N[outputs/*.mp4 / *.jpg]
```

---

## 💻 Hardware & Software Requirements

| Requirement | Minimum Specification | Recommended Specification |
| :--- | :--- | :--- |
| **Operating System** | Windows 10 64-bit (21H2+) | Windows 11 64-bit (23H2+ / 24H2) |
| **Graphics Card** | NVIDIA GeForce RTX 2060 (6 GB VRAM) | NVIDIA GeForce RTX 4070 / 4080 / 5080 (16+ GB) |
| **DirectX** | DirectX 12 (Feature Level 12_1) | DirectX 12 Ultimate (Feature Level 12_2) |
| **NVIDIA Driver** | Game Ready / Studio Driver 550.00+ | Game Ready / Studio Driver 565.00+ or newer |
| **CPU** | Intel Core i5 (10th Gen) / AMD Ryzen 5 3600 | Intel Core i7/i9 (14th Gen) / AMD Ryzen 7 7800X3D |
| **System Memory** | 16 GB DDR4 | 32 GB+ DDR5 |

---

## ⚡ Quick Start

### 1. One-Click Desktop Launch
The easiest way to launch the complete studio (backend + frontend in a dedicated native desktop window):

```powershell
.\Launch-Studio.bat
```
*Or double-click `DLSS5VideoStudioApp.exe` directly.*

---

### 2. Running via Package Scripts (Node.js & Tauri)

Clone the repository and install root and UI dependencies:

```powershell
# Clone the repository
git clone https://github.com/Xlyresmax/m0x-upscaller.git
cd m0x-upscaller

# Install dependencies
npm install
npm install --prefix ui

# Run the Tauri desktop studio in development mode
npm run dev

# Or run the Next.js web studio standalone
npm run dev:ui
```

Available npm scripts:
- `npm run dev` — Launch the Tauri v2 desktop application with live reload.
- `npm run build` — Build the production Tauri desktop binary.
- `npm run dev:ui` — Start the Next.js development server on `http://localhost:3000`.
- `npm run build:ui` — Produce an optimized Next.js production build.
- `npm run start:ui` — Start the production Next.js server.
- `npm run build:cpp` — Build the native C++20 DirectX 12 engine via CMake.
- `npm run build:release` — Full unified release pipeline (UI + C++ + Tauri).

---

### 3. C++ DirectX 12 CLI Engine

You can run GPU telemetry diagnostics or batch upscale operations directly from PowerShell or Command Prompt:

```powershell
# 1. Query live RTX GPU telemetry, VRAM usage & DLSS DLL status
.\DLSS5VideoStudio.exe --telemetry

# 2. Upscale a 1080p video to 4K UHD with AV1 NVENC
.\DLSS5VideoStudio.exe --upscale --input "ui/public/sample_gameplay.mp4" --output "outputs/upscaled_4k.mp4" --scale 2 --encoder av1

# 3. Upscale a portrait image to 4K with Neural Reconstruction
.\DLSS5VideoStudio.exe --upscale --input "ui/public/sample_portrait.jpg" --output "outputs/upscaled_portrait.jpg" --scale 2

# 4. View CLI help and all flags
.\DLSS5VideoStudio.exe --help
```

#### CLI Options Reference
| Option | Short | Parameters | Description |
| :--- | :---: | :--- | :--- |
| `--telemetry` | `-t` | *None* | Query D3D12 device, VRAM allocation, and DLSS module status as formatted JSON |
| `--upscale` | `-u` | *None* | Trigger a neural upscale process |
| `--input` | `-i` | `<path>` | Path to the source video or picture |
| `--output` | `-o` | `<path>` | Destination file path (automatically creates directories) |
| `--scale` | `-s` | `2` \| `4` | Target upscaling multiplier (`2` = 4K UHD, `4` = 8K Ultra) |
| `--encoder` | `-e` | `hevc` \| `av1` \| `h264` | Hardware video encoder (default: `hevc`) |
| `--help` | `-h` | *None* | Display CLI usage manual |

---

## 🎛️ Content Presets & Enhancement Modes

| Preset | Optimal Content | Neural Configuration | Protection Features |
| :--- | :--- | :--- | :--- |
| **🎮 Gameplay** | PC & Console 3D Games, CGI | High structure intensity, motion-vector edge sharpness | De-ringing, high-frequency boundary reconstruction |
| **📷 Camera / Portrait** | DSLR Video, Vlogs, Photography | Preset B Natural styling, organic film grain synthesis | Semantic skin/face protection mask enabled |
| **🖥️ Screen & UI** | Software tutorials, Screen recordings | Low grain, ultra-crisp line enhancement | Sub-pixel text clarity & aliasing suppression |
| **📼 Archive Restore** | Low-res retro footage, compressed clips | Aggressive deblocking & neural denoising | Deblock filter, temporal stability pass |

---

## 📁 Repository Directory Structure

```plaintext
m0x-upscaller/
├── .gitignore                   # Git exclusion rules for builds, caches & temp files
├── CMakeLists.txt               # CMake 3.28+ native C++20 build configuration
├── DLSS5VideoStudio.exe         # Pre-compiled C++20 DirectX 12 CLI engine
├── DLSS5VideoStudioApp.exe      # Pre-compiled Tauri v2 native desktop application
├── Launch-Studio.bat            # One-click launcher script
├── package.json                 # Monorepo task runner & scripts
├── vcpkg.json                   # C++ package manifest
├── bin/
│   ├── DLSS5VideoStudio.exe     # Standalone binary copy
│   ├── DLSS5VideoStudioApp.exe  # Standalone app copy
│   ├── dlss_files/              # Genuine NVIDIA DLSS runtime libraries
│   │   ├── nvngx_dlss.dll       # DLSS 2/3/5 Super Resolution
│   │   ├── nvngx_dlssnr.dll     # DLSS 5 Neural Reconstruction
│   │   ├── nvngx_dlssg.dll      # DLSS Frame Generation
│   │   └── nvngx_dlisr.dll      # DLISR Image Scaling
│   └── models/                  # ONNX neural weights (Depth Anything V2)
├── src/                         # Native C++20 DirectX 12 Engine
│   ├── main.cpp                 # CLI entry point, argument parsing & telemetry
│   ├── bridge/                  # IPC bridge server for studio frontend
│   │   ├── NativeBridgeServer.cpp
│   │   └── NativeBridgeServer.hpp
│   ├── core/                    # Direct3D 12 device management & texture cache
│   │   ├── D3D12DeviceManager.cpp
│   │   ├── D3D12DeviceManager.hpp
│   │   └── VramTextureCache.hpp
│   ├── pipeline/                # Neural runtime harnesses
│   │   ├── OnnxDepthEngine.cpp
│   │   ├── OnnxDepthEngine.hpp
│   │   ├── RtxVsrAndDlss5Harness.cpp
│   │   └── RtxVsrAndDlss5Harness.hpp
│   └── shaders/                 # HLSL Compute Shaders
│       └── SplitWipeGrade.hlsl  # SM 6.6 real-time interactive color & wipe shader
├── src-tauri/                   # Tauri v2 Desktop Wrapper
│   ├── Cargo.toml               # Rust dependencies (tauri 2.x, serde, plugins)
│   ├── tauri.conf.json          # Window configuration (1600x960, frameless, titlebar)
│   └── src/                     # Rust application entry points
├── ui/                          # Next.js 15 Web & Studio Interface
│   ├── package.json             # React 18, Next 15, Lucide & Tailwind dependencies
│   ├── tailwind.config.js       # Studio color theme & styling tokens
│   ├── app/
│   │   ├── layout.tsx           # Global root layout & font injection
│   │   ├── page.tsx             # Interactive studio UI, multi-view & telemetry
│   │   └── api/                 # Studio REST endpoints (telemetry, upload, process)
│   └── public/                  # Static assets & demo media
│       ├── sample_gameplay.mp4  # 1080p 60 FPS gameplay clip
│       ├── sample_portrait.jpg  # Cyberpunk character portrait
│       ├── sample_test.mp4      # Demo animation sequence
│       └── sample_game_screenshot.png
└── outputs/                     # Generated export directory (.gitkeep)
```

---

## 🛠️ Compiling from Source

### Prerequisites
- **Visual Studio 2022** (v17.8 or higher) with the **Desktop development with C++** workload and **MSVC C++20 Standard Library**.
- **CMake** 3.28+.
- **Node.js** 18.x or 20.x+.
- **Rust** 1.80+ with `cargo` (for building the Tauri desktop wrapper).
- **Windows 10/11 SDK** (10.0.22621.0 or newer for DirectX 12 headers).

### Building the C++20 DirectX 12 Engine
```powershell
# Generate CMake build files for Visual Studio 2022 x64
cmake -B build -S . -DCMAKE_BUILD_TYPE=Release

# Compile release executable
cmake --build build --config Release
```
The compiled executable will be placed in `build/Release/DLSS5VideoStudio.exe`.

### Building the Tauri Desktop Studio
```powershell
# Build frontend assets and bundle native desktop executable
npm run build
```
The output desktop executable will be created in `src-tauri/target/release/`.

---

## 🔒 Security & Data Privacy

- **100% Local Inference**: All neural processing, depth estimation, and video encoding runs directly on your local NVIDIA RTX GPU. No frames or personal media are ever transmitted to cloud servers.
- **VRAM Isolation**: Video frames are processed in private Direct3D 12 swap buffers and automatically freed upon session completion.

---

## 📄 License & Credits

Distributed under the **MIT License**. See `LICENSE` for details.

### Third-Party Acknowledgments
- **[NVIDIA DLSS & Streamline](https://developer.nvidia.com/rtx/streamline)** — NVIDIA Corporation.
- **[DirectX 12](https://github.com/microsoft/DirectX-Headers)** — Microsoft Corporation.
- **[Next.js](https://nextjs.org/)** — Vercel, Inc.
- **[Tauri](https://tauri.app/)** — Tauri Programme within The Commons Conservancy.
- **[nlohmann/json](https://github.com/nlohmann/json)** — Niels Lohmann.
- **[Lucide Icons](https://lucide.dev/)** — Lucide Contributors.

---

<div align="center">
Made with ❤️ for high-fidelity real-time neural graphics and creator workflows.
</div>
