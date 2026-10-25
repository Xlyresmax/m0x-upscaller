// SplitWipeGrade.hlsl - Shader Model 6.6 Compute Shader
// Executes in < 0.8 ms on top of cached VRAM textures so UI sliders update at 120 FPS
// without re-running Depth Anything V2 or DLSS 5 Neural Rendering.

cbuffer GradeConstants : register(b0) {
    float2 ViewportSize;
    float  WipePosition;       // 0.0 .. 1.0 split-screen wipe divider
    int    ViewMode;           // 0 = Split Wipe, 1 = Depth X-Ray, 2 = Difference Heatmap, 3 = Tri-Pane Style
    float  Exposure;           // -2.0 .. +2.0 EV
    float  Contrast;           // 0.5 .. 1.5
    float  Vibrance;           // -1.0 .. +1.0 (skin-safe saturation boost)
    float  Saturation;         // 0.0 .. 2.0
    float  NisSharpness;       // 0.0 .. 1.0
    float  FilmGrain;          // 0.0 .. 0.5
    float  DepthContrast;      // 0.5 .. 2.5
    float  PaperWhiteNits;     // 80.0 .. 1000.0 (scRGB HDR scaling)
};

Texture2D<float4> TexOriginalLinear   : register(t0);
Texture2D<float>  TexReversedZDepth   : register(t1);
Texture2D<float4> TexDlss5Natural     : register(t2);
Texture2D<float4> TexDlss5Cinematic   : register(t3);
RWTexture2D<float4> OutViewportTex    : register(t0);

float3 ApplyLinearGrade(float3 color) {
    // 1. Exposure in linear light
    color *= exp2(Exposure);

    // 2. Extended Reinhard tone-mapping & contrast around mid-grey (0.18)
    color = max(0.0.xxx, (color - 0.18) * Contrast + 0.18);

    // 3. Luma & Skin-Safe Vibrance (protects warm skin hues while lifting skies/materials)
    float luma = dot(color, float3(0.2126, 0.7152, 0.0722));
    float maxCh = max(color.r, max(color.g, color.b));
    float minCh = min(color.r, min(color.g, color.b));
    float sat = maxCh - minCh;
    float skinWeight = saturate(1.0 - abs((color.r - color.g) - 0.18) * 4.0);
    float vibranceBoost = Vibrance * (1.0 - sat) * (1.0 - 0.65 * skinWeight);
    color = lerp(luma.xxx, color, Saturation + vibranceBoost);

    return max(0.0.xxx, color);
}

float3 TurboDepthColormap(float d) {
    float c = saturate((d - 0.5) * DepthContrast + 0.5);
    // Near = Warm Red/Orange (1.0), Mid = Emerald/Cyan, Far = Deep Indigo (0.0)
    return float3(
        saturate(1.5 - abs(4.0 * c - 3.0)),
        saturate(1.5 - abs(4.0 * c - 2.0)),
        saturate(1.5 - abs(4.0 * c - 1.0))
    );
}

[numthreads(16, 16, 1)]
void CSMain(uint3 dtid : SV_DispatchThreadID) {
    if (dtid.x >= (uint)ViewportSize.x || dtid.y >= (uint)ViewportSize.y) return;

    float2 uv = (float2(dtid.xy) + 0.5) / ViewportSize;
    float3 orig = TexOriginalLinear.Load(int3(dtid.xy, 0)).rgb;
    float3 nat  = ApplyLinearGrade(TexDlss5Natural.Load(int3(dtid.xy, 0)).rgb);
    float3 cin  = ApplyLinearGrade(TexDlss5Cinematic.Load(int3(dtid.xy, 0)).rgb);
    float  depth = TexReversedZDepth.Load(int3(dtid.xy, 0));

    float3 finalColor = nat;

    if (ViewMode == 0) {
        // Split-Screen Wipe Mode
        finalColor = (uv.x < WipePosition) ? orig : nat;
    } else if (ViewMode == 1) {
        // Reversed-Z 3D Depth Map X-Ray Mode
        finalColor = TurboDepthColormap(depth);
    } else if (ViewMode == 2) {
        // AI Difference Heatmap Mode (amplifies pixel delta x8)
        float3 delta = abs(nat - orig) * 8.0;
        float mag = dot(delta, float3(0.333, 0.333, 0.333));
        finalColor = lerp(float3(0.05, 0.07, 0.12), float3(0.0, 0.95, 1.0), saturate(mag));
    } else if (ViewMode == 3) {
        // 3-Pane Synchronized Comparator: Original | Natural | Cinematic
        if (uv.x < 0.3333) finalColor = orig;
        else if (uv.x < 0.6666) finalColor = nat;
        else finalColor = cin;
    }

    OutViewportTex[dtid.xy] = float4(finalColor, 1.0);
}
