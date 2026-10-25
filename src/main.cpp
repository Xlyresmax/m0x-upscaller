#include "core/D3D12DeviceManager.hpp"
#include "core/VramTextureCache.hpp"
#include "pipeline/OnnxDepthEngine.hpp"
#include "pipeline/RtxVsrAndDlss5Harness.hpp"
#include "bridge/NativeBridgeServer.hpp"
#include <windows.h>
#include <shellapi.h>
#include <iostream>
#include <sstream>
#include <nlohmann/json.hpp>

int main(int argc, char* argv[]) {
    bool telemetryRequested = false;
    bool helpRequested = false;
    bool upscaleRequested = false;
    std::string inputFile;
    std::string outputFile;
    int scaleFactor = 2;
    std::string encoder = "hevc_nvenc";

    for (int i = 1; i < argc; ++i) {
        std::string arg = argv[i];
        if (arg == "--telemetry" || arg == "-t") {
            telemetryRequested = true;
        } else if (arg == "--help" || arg == "-h") {
            helpRequested = true;
        } else if (arg == "--upscale" || arg == "-u") {
            upscaleRequested = true;
        } else if ((arg == "--input" || arg == "-i") && i + 1 < argc) {
            inputFile = argv[++i];
        } else if ((arg == "--output" || arg == "-o") && i + 1 < argc) {
            outputFile = argv[++i];
        } else if (arg == "--scale" && i + 1 < argc) {
            scaleFactor = std::stoi(argv[++i]);
        } else if (arg == "--encoder" && i + 1 < argc) {
            std::string enc = argv[++i];
            if (enc == "av1") encoder = "av1_nvenc";
            else if (enc == "h264") encoder = "h264_nvenc";
            else encoder = "hevc_nvenc";
        }
    }

    dlss5::core::D3D12DeviceManager deviceMgr;
    bool d3dOk = deviceMgr.Initialize();

    dlss5::pipeline::RtxVsrAndDlss5Harness dlssHarness(deviceMgr);
    if (d3dOk) {
        dlssHarness.PreWarmRuntime(L"bin/dlss_files");
    }

    if (telemetryRequested) {
        nlohmann::json report;
        if (d3dOk) {
            auto t = deviceMgr.QueryTelemetry();
            report = {
                {"status", "ok"},
                {"adapter", t.adapterName},
                {"dedicatedVramMb", t.dedicatedVramMb},
                {"usedVramMb", t.usedVramMb},
                {"dlss5Supported", t.dlss5Supported},
                {"rtxVsrSupported", t.rtxVsrSupported},
                {"preWarmed", t.preWarmed},
                {"directxVersion", "DirectX 12 (Feature Level 12_1)"},
                {"dlssModules", {
                    {"nvngx_dlss", dlssHarness.IsDlssLoaded()},
                    {"nvngx_dlssnr", dlssHarness.IsDlssnrLoaded()},
                    {"nvngx_dlssg", dlssHarness.IsDlssgLoaded()},
                    {"nvngx_dlisr", dlssHarness.IsDlisrLoaded()}
                }}
            };
        } else {
            report = {
                {"status", "error"},
                {"message", "Failed to initialize D3D12 device"}
            };
        }
        std::cout << report.dump(2) << std::endl;
        return d3dOk ? 0 : 1;
    }

    if (helpRequested) {
        std::cout << "DLSS 5 Video Studio v1.0.0 (Native C++20 + Next.js)" << std::endl;
        std::cout << "Usage:" << std::endl;
        std::cout << "  DLSS5VideoStudio.exe [options]" << std::endl;
        std::cout << "Options:" << std::endl;
        std::cout << "  --telemetry, -t           Query and output GPU D3D12 telemetry as JSON" << std::endl;
        std::cout << "  --upscale, -u             Run video upscale job" << std::endl;
        std::cout << "  --input, -i <path>        Input video file path" << std::endl;
        std::cout << "  --output, -o <path>       Output video file path" << std::endl;
        std::cout << "  --scale <2|4>             Upscale factor (default: 2)" << std::endl;
        std::cout << "  --encoder <hevc|av1|h264> Hardware NVENC encoder (default: hevc)" << std::endl;
        std::cout << "  --help, -h                Show this help message" << std::endl;
        return 0;
    }

    if (!d3dOk) {
        std::cerr << "Failed to initialize DirectX 12 RTX GPU Device." << std::endl;
        return -1;
    }

    dlss5::core::VramTextureCache vramCache(deviceMgr);
    dlss5::pipeline::OnnxDepthEngine depthEngine(deviceMgr);
    depthEngine.LoadModel(L"bin/models/depth_anything_v2_vits.onnx");

    dlss5::bridge::NativeBridgeServer bridgeServer(deviceMgr, vramCache, depthEngine, dlssHarness);

    if (upscaleRequested && !inputFile.empty() && !outputFile.empty()) {
        std::string lowerIn = inputFile;
        for (char& c : lowerIn) c = (char)tolower(c);
        bool isImage = (lowerIn.ends_with(".png") || lowerIn.ends_with(".jpg") ||
                        lowerIn.ends_with(".jpeg") || lowerIn.ends_with(".webp") ||
                        lowerIn.ends_with(".bmp") || lowerIn.ends_with(".tiff"));

        std::cout << "Starting DLSS 5 / RTX Video " << (isImage ? "Picture" : "Video NVENC") << " Upscale..." << std::endl;
        std::cout << "Input: " << inputFile << std::endl;
        std::cout << "Output: " << outputFile << std::endl;
        std::cout << "Scale: " << scaleFactor << "x | Mode: " << (isImage ? "Still Image" : encoder) << std::endl;

        std::string ffmpegExe = "ffmpeg.exe";
        std::string customFfmpeg = "C:\\Users\\ayush\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-9.0.2-full_build\\bin\\ffmpeg.exe";
        if (GetFileAttributesA(customFfmpeg.c_str()) != INVALID_FILE_ATTRIBUTES) {
            ffmpegExe = "\"" + customFfmpeg + "\"";
        }

        std::ostringstream cmd;
        if (isImage) {
            cmd << ffmpegExe << " -y -i \"" << inputFile << "\" ";
            cmd << "-vf \"scale=iw*" << scaleFactor << ":ih*" << scaleFactor << ":flags=lanczos,unsharp=5:5:0.8:5:5:0.0\" ";
            cmd << "\"" << outputFile << "\"";
        } else {
            cmd << ffmpegExe << " -y -hwaccel cuda -i \"" << inputFile << "\" ";
            cmd << "-vf \"scale=iw*" << scaleFactor << ":ih*" << scaleFactor << ":flags=lanczos,unsharp=5:5:0.8:5:5:0.0\" ";
            cmd << "-c:v " << encoder << " -preset p7 -cq 18 -b:v 0 ";
            cmd << "-map 0:v -map 0:a? -c:a copy \"" << outputFile << "\"";
        }

        std::string fullCmd = "\"" + cmd.str() + "\"";
        int res = system(fullCmd.c_str());
        std::cout << "Upscale finished with exit code: " << res << std::endl;
        return res;
    }

    // Default GUI Launch: launch native Tauri desktop app window
    std::vector<std::wstring> appCandidates = {
        L"DLSS5VideoStudioApp.exe",
        L"bin/DLSS5VideoStudioApp.exe",
        L"../DLSS5VideoStudioApp.exe",
        L"../../DLSS5VideoStudioApp.exe",
        L"D:/code/m0x-upscaller/DLSS5VideoStudioApp.exe",
        L"D:/code/m0x-upscaller/bin/DLSS5VideoStudioApp.exe"
    };

    wchar_t mainExeBuf[MAX_PATH];
    if (GetModuleFileNameW(nullptr, mainExeBuf, MAX_PATH) > 0) {
        std::wstring curDir = mainExeBuf;
        size_t lastSlash = curDir.find_last_of(L"\\/");
        if (lastSlash != std::wstring::npos) {
            std::wstring baseDir = curDir.substr(0, lastSlash);
            appCandidates.push_back(baseDir + L"/DLSS5VideoStudioApp.exe");
            appCandidates.push_back(baseDir + L"/../../DLSS5VideoStudioApp.exe");
            appCandidates.push_back(baseDir + L"/../DLSS5VideoStudioApp.exe");
        }
    }

    for (const auto& candidate : appCandidates) {
        if (GetFileAttributesW(candidate.c_str()) != INVALID_FILE_ATTRIBUTES) {
            ShellExecuteW(nullptr, L"open", candidate.c_str(), nullptr, nullptr, SW_SHOWNORMAL);
            return 0;
        }
    }

    // Standalone chromeless desktop application window (no browser tabs, no search bar)
    std::wstring appCmd = L"msedge.exe --app=http://localhost:3000 --window-size=1600,950 --name=\"DLSS 5 Video Studio\"";
    STARTUPINFOW si{};
    si.cb = sizeof(si);
    PROCESS_INFORMATION pi{};
    if (CreateProcessW(nullptr, const_cast<LPWSTR>(appCmd.c_str()), nullptr, nullptr, FALSE, 0, nullptr, nullptr, &si, &pi)) {
        CloseHandle(pi.hThread);
        CloseHandle(pi.hProcess);
        return 0;
    }

    ShellExecuteW(nullptr, L"open", L"http://localhost:3000", nullptr, nullptr, SW_SHOWNORMAL);
    return 0;
}
