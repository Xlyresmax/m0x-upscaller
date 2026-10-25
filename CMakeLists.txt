cmake_minimum_required(VERSION 3.28)
project(DLSS5VideoStudio VERSION 1.0.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_MSVC_RUNTIME_LIBRARY "MultiThreaded$<$<CONFIG:Debug>:Debug>DLL")

add_compile_definitions(UNICODE _UNICODE NOMINMAX WIN32_LEAN_AND_MEAN)

# Packages managed via vcpkg, system, or FetchContent
find_package(nlohmann_json CONFIG QUIET)
if(NOT nlohmann_json_FOUND)
    include(FetchContent)
    FetchContent_Declare(
        nlohmann_json
        URL https://github.com/nlohmann/json/releases/download/v3.11.3/json.tar.xz
        DOWNLOAD_EXTRACT_TIMESTAMP TRUE
    )
    FetchContent_MakeAvailable(nlohmann_json)
endif()
find_package(Threads REQUIRED)

set(STREAMLINE_SDK_DIR "${CMAKE_SOURCE_DIR}/external/streamline" CACHE PATH "Path to NVIDIA Streamline SDK")
set(RTX_VIDEO_SDK_DIR  "${CMAKE_SOURCE_DIR}/external/rtx_video_sdk" CACHE PATH "Path to NVIDIA RTX Video SDK")
set(ONNXRUNTIME_DIR    "${CMAKE_SOURCE_DIR}/external/onnxruntime-win-x64-gpu" CACHE PATH "Path to ONNX Runtime GPU")
set(FFMPEG_DIR         "${CMAKE_SOURCE_DIR}/external/ffmpeg" CACHE PATH "Path to FFmpeg LGPL shared dev libs")

file(GLOB_RECURSE ENGINE_SOURCES
    "src/*.cpp"
    "src/bridge/*.cpp"
    "src/core/*.cpp"
    "src/pipeline/*.cpp"
)

add_executable(DLSS5VideoStudio ${ENGINE_SOURCES})

target_include_directories(DLSS5VideoStudio PRIVATE
    "${CMAKE_SOURCE_DIR}/src"
    "${STREAMLINE_SDK_DIR}/include"
    "${RTX_VIDEO_SDK_DIR}/include"
    "${ONNXRUNTIME_DIR}/include"
    "${FFMPEG_DIR}/include"
)

target_link_libraries(DLSS5VideoStudio PRIVATE
    d3d12.lib
    dxgi.lib
    dxguid.lib
    dcomp.lib
    d3dcompiler.lib
    ws2_32.lib
    nlohmann_json::nlohmann_json
)

# Link external SDK libraries if present in external/
foreach(_LIB
    "${STREAMLINE_SDK_DIR}/lib/x64/sl.interposer.lib"
    "${ONNXRUNTIME_DIR}/lib/onnxruntime.lib"
    "${FFMPEG_DIR}/lib/avcodec.lib"
    "${FFMPEG_DIR}/lib/avformat.lib"
    "${FFMPEG_DIR}/lib/avutil.lib"
    "${FFMPEG_DIR}/lib/swscale.lib"
)
    if(EXISTS "${_LIB}")
        target_link_libraries(DLSS5VideoStudio PRIVATE "${_LIB}")
    endif()
endforeach()
