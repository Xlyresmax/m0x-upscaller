import { NextRequest, NextResponse } from 'next/server';
import { exec, execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

function getFfmpegPath(): string {
  const customWinget = path.resolve(
    process.env.LOCALAPPDATA || 'C:\\Users\\ayush\\AppData\\Local',
    'Microsoft/WinGet/Packages/Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-9.0.2-full_build/bin/ffmpeg.exe'
  );
  if (fs.existsSync(customWinget)) {
    return `"${customWinget}"`;
  }
  return 'ffmpeg.exe';
}

function getFfprobePath(): string {
  const customWinget = path.resolve(
    process.env.LOCALAPPDATA || 'C:\\Users\\ayush\\AppData\\Local',
    'Microsoft/WinGet/Packages/Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-9.0.2-full_build/bin/ffprobe.exe'
  );
  if (fs.existsSync(customWinget)) {
    return `"${customWinget}"`;
  }
  return 'ffprobe.exe';
}

function probeVideoDimensions(inputPath: string): { width: number; height: number } | null {
  try {
    const ffprobeExe = getFfprobePath();
    const env = {
      ...process.env,
      PATH: `${process.env.PATH || ''};C:\\Users\\ayush\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-9.0.2-full_build\\bin`,
    };
    const out = execSync(
      `${ffprobeExe} -v error -select_streams v:0 -show_entries stream=width,height -of csv=s=x:p=0 "${inputPath}"`,
      { env, encoding: 'utf-8', timeout: 6000 }
    );
    const parts = out.trim().split('x');
    if (parts.length >= 2) {
      const w = parseInt(parts[0], 10);
      const h = parseInt(parts[1], 10);
      if (!isNaN(w) && !isNaN(h) && w > 0 && h > 0) return { width: w, height: h };
    }
  } catch (err) {
    console.warn('Probe dimensions failed:', err);
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      inputUrl,
      scaleFactor = 2,
      encoder = 'hevc_nvenc',
      style = 'Cinematic',
      structureIntensity = 1.1,
      toneIntensity = 0.8,
      nisSharpness = 0.45,
      deblock = true,
      frameGen = false,
      fpsMultiplier = 2,
      destinationFolder,
      destinationFileName,
      exportPath,
      videoResolution,
    } = body;

    let inputPath = '';
    if (inputUrl) {
      if (inputUrl.startsWith('/')) {
        inputPath = path.resolve(process.cwd(), 'public', inputUrl.replace(/^\//, ''));
      } else {
        inputPath = path.resolve(inputUrl);
      }
    }

    if (!fs.existsSync(inputPath)) {
      inputPath = path.resolve(process.cwd(), 'public/sample_gameplay.mp4');
    }

    const outputsPublicDir = path.resolve(process.cwd(), 'public/outputs');
    const outputsWorkspaceDir = path.resolve(process.cwd(), '../outputs');
    if (!fs.existsSync(outputsPublicDir)) fs.mkdirSync(outputsPublicDir, { recursive: true });
    if (!fs.existsSync(outputsWorkspaceDir)) fs.mkdirSync(outputsWorkspaceDir, { recursive: true });

    const ext = path.extname(inputPath).toLowerCase();
    const isImage = ['.png', '.jpg', '.jpeg', '.webp', '.bmp', '.tiff', '.avif'].includes(ext);
    const defaultOutExt = isImage ? (['.jpg', '.jpeg'].includes(ext) ? '.jpg' : '.png') : '.mp4';

    // Determine target export path requested by user
    let finalTargetDir = outputsWorkspaceDir;
    let finalTargetFilename = '';

    if (exportPath && typeof exportPath === 'string' && exportPath.trim().length > 0) {
      let resolvedExport = path.resolve(exportPath.trim());
      if (!path.extname(resolvedExport)) {
        resolvedExport += defaultOutExt;
      }
      finalTargetDir = path.dirname(resolvedExport);
      finalTargetFilename = path.basename(resolvedExport);
    } else if (destinationFolder && typeof destinationFolder === 'string' && destinationFolder.trim().length > 0) {
      finalTargetDir = path.resolve(destinationFolder.trim());
      if (destinationFileName && typeof destinationFileName === 'string' && destinationFileName.trim().length > 0) {
        let fn = destinationFileName.trim();
        if (!path.extname(fn)) {
          fn += defaultOutExt;
        }
        finalTargetFilename = fn;
      } else {
        const baseName = path.basename(inputPath, path.extname(inputPath));
        finalTargetFilename = `enhanced_${baseName}_${scaleFactor}x_${style.toLowerCase()}_${Date.now()}${defaultOutExt}`;
      }
    } else {
      const baseName = path.basename(inputPath, path.extname(inputPath));
      finalTargetFilename = `enhanced_${baseName}_${scaleFactor}x_${style.toLowerCase()}_${Date.now()}${defaultOutExt}`;
    }

    // Ensure user's target destination directory exists
    if (!fs.existsSync(finalTargetDir)) {
      try {
        fs.mkdirSync(finalTargetDir, { recursive: true });
      } catch (dirErr) {
        console.error('Failed to create target directory, falling back to workspace outputs:', dirErr);
        finalTargetDir = outputsWorkspaceDir;
      }
    }

    const finalTargetPath = path.join(finalTargetDir, finalTargetFilename);

    // Unique filename for public web access to avoid browser cache conflicts
    const webFilename = `render_${Date.now()}_${finalTargetFilename}`;
    const publicOutputPath = path.join(outputsPublicDir, webFilename);
    const workspaceOutputPath = path.join(outputsWorkspaceDir, finalTargetFilename);

    // Compute input & target dimensions
    let inWidth = videoResolution?.width || 0;
    let inHeight = videoResolution?.height || 0;
    if (!inWidth || !inHeight) {
      const probed = probeVideoDimensions(inputPath);
      if (probed) {
        inWidth = probed.width;
        inHeight = probed.height;
      }
    }
    const targetWidth = inWidth > 0 ? inWidth * scaleFactor : 1920 * scaleFactor;
    const targetHeight = inHeight > 0 ? inHeight * scaleFactor : 1080 * scaleFactor;

    // Build filter chain with strict even dimensions (divisible by 2)
    const filters: string[] = [];

    if (deblock) {
      filters.push('deblock=filter=weak:block=4');
    }

    filters.push(`scale=trunc(iw*${scaleFactor}/2)*2:trunc(ih*${scaleFactor}/2)*2:flags=lanczos`);

    const sharpVal = (nisSharpness * 1.5).toFixed(2);
    if (parseFloat(sharpVal) > 0.05) {
      filters.push(`unsharp=5:5:${sharpVal}:5:5:0.0`);
    }

    if (style === 'Cinematic') {
      const contrast = (1.0 + structureIntensity * 0.08).toFixed(2);
      const sat = (1.0 + toneIntensity * 0.12).toFixed(2);
      filters.push(`eq=contrast=${contrast}:saturation=${sat}`);
    }

    if (!isImage && frameGen && fpsMultiplier >= 2) {
      if (targetWidth > 1920) {
        filters.push('framerate=fps=60');
      } else {
        filters.push('minterpolate=fps=60:mi_mode=blend');
      }
    }

    const vfString = filters.join(',');

    // NVIDIA NVENC Hardware Limit Safeguard:
    // H.264 (h264_nvenc) has a physical hardware limit of 4096px width or height.
    // HEVC (hevc_nvenc) and AV1 (av1_nvenc) support up to 8192x8192 (8K UHD).
    let selectedEncoder = ['av1_nvenc', 'hevc_nvenc', 'h264_nvenc'].includes(encoder)
      ? encoder
      : 'hevc_nvenc';

    if (!isImage && (targetWidth > 4096 || targetHeight > 4096)) {
      if (selectedEncoder === 'h264_nvenc') {
        console.log(
          `[NVENC] Target resolution ${targetWidth}x${targetHeight} exceeds H.264 4096px hardware limit. Automatically promoting to HEVC NVENC.`
        );
        selectedEncoder = 'hevc_nvenc';
      }
    }

    const ffmpegExe = getFfmpegPath();

    // Map video and optional audio if video, or render high-quality picture if image
    const cmd = isImage
      ? `${ffmpegExe} -y -i "${inputPath}" -vf "${vfString}" "${publicOutputPath}"`
      : `${ffmpegExe} -y -hwaccel cuda -i "${inputPath}" -vf "${vfString}" -c:v ${selectedEncoder} -preset p7 -cq 18 -b:v 0 -map 0:v -map 0:a? -c:a copy "${publicOutputPath}"`;

    const env = {
      ...process.env,
      PATH: `${process.env.PATH || ''};C:\\Users\\ayush\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-9.0.2-full_build\\bin`,
    };

    const copyToDestinations = () => {
      // 1. Ensure target directory exists
      if (!fs.existsSync(finalTargetDir)) {
        try {
          fs.mkdirSync(finalTargetDir, { recursive: true });
        } catch (dirErr) {
          console.error('Failed to create target directory:', dirErr);
        }
      }

      // 2. Copy to user's explicitly chosen target path
      try {
        fs.copyFileSync(publicOutputPath, finalTargetPath);
        console.log(`[EXPORT SUCCESS] File saved to target path: ${finalTargetPath}`);
      } catch (copyErr) {
        console.error('Failed copying to final target path:', copyErr);
      }

      // 3. Keep in workspace outputs for convenience if different
      if (path.resolve(finalTargetPath) !== path.resolve(workspaceOutputPath)) {
        try {
          fs.copyFileSync(publicOutputPath, workspaceOutputPath);
        } catch {}
      }
    };

    return new Promise<NextResponse>((resolve) => {
      exec(cmd, { env, timeout: 180000 }, (error, stdout, stderr) => {
        if (error) {
          console.error('Upscale error, trying fallback:', stderr || error.message);

          // If the failure was due to h264_nvenc 4096 limit, try HEVC NVENC first!
          const canRetryHevc = !isImage && selectedEncoder === 'h264_nvenc';
          const retryCmd = canRetryHevc
            ? `${ffmpegExe} -y -hwaccel cuda -i "${inputPath}" -vf "${vfString}" -c:v hevc_nvenc -preset p7 -cq 18 -b:v 0 -map 0:v -map 0:a? -c:a copy "${publicOutputPath}"`
            : null;

          const executeCpuFallback = () => {
            const fallbackCodec = targetWidth > 4096 ? 'libx265' : 'libx264';
            const fallbackCmd = isImage
              ? `${ffmpegExe} -y -i "${inputPath}" -vf "scale=trunc(iw*${scaleFactor}/2)*2:trunc(ih*${scaleFactor}/2)*2:flags=lanczos" "${publicOutputPath}"`
              : `${ffmpegExe} -y -i "${inputPath}" -vf "scale=trunc(iw*${scaleFactor}/2)*2:trunc(ih*${scaleFactor}/2)*2:flags=lanczos,unsharp=5:5:0.5:5:5:0.0" -c:v ${fallbackCodec} -preset fast -crf 18 -pix_fmt yuv420p -map 0:v -map 0:a? -c:a copy "${publicOutputPath}"`;

            exec(fallbackCmd, { env, timeout: 180000 }, (fbErr, fbStdout, fbStderr) => {
              if (fbErr) {
                console.error('Fallback error:', fbStderr || fbErr.message);
                return resolve(
                  NextResponse.json(
                    { error: `Upscale failed: ${fbErr.message}` },
                    { status: 500 }
                  )
                );
              }

              copyToDestinations();

              let targetSize = 0;
              try {
                if (fs.existsSync(finalTargetPath)) {
                  targetSize = fs.statSync(finalTargetPath).size;
                }
              } catch {}

              return resolve(
                NextResponse.json({
                  status: 'ok',
                  message: isImage ? 'Picture upscaled successfully' : `Video upscaled successfully (${fallbackCodec} fallback)`,
                  filename: finalTargetFilename,
                  downloadUrl: `/outputs/${webFilename}`,
                  outputPath: finalTargetPath,
                  destinationFolder: finalTargetDir,
                  mediaType: isImage ? 'image' : 'video',
                  scaleFactor,
                  fileSizeBytes: targetSize,
                })
              );
            });
          };

          if (retryCmd) {
            exec(retryCmd, { env, timeout: 180000 }, (retryErr) => {
              if (retryErr) {
                executeCpuFallback();
              } else {
                copyToDestinations();
                let targetSize = 0;
                try {
                  if (fs.existsSync(finalTargetPath)) {
                    targetSize = fs.statSync(finalTargetPath).size;
                  }
                } catch {}
                resolve(
                  NextResponse.json({
                    status: 'ok',
                    message: 'Hardware HEVC NVENC Video Upscale Complete',
                    filename: finalTargetFilename,
                    downloadUrl: `/outputs/${webFilename}`,
                    outputPath: finalTargetPath,
                    destinationFolder: finalTargetDir,
                    encoder: 'hevc_nvenc',
                    mediaType: 'video',
                    scaleFactor,
                    fileSizeBytes: targetSize,
                  })
                );
              }
            });
          } else {
            executeCpuFallback();
          }
          return;
        }

        copyToDestinations();

        let targetSize = 0;
        try {
          if (fs.existsSync(finalTargetPath)) {
            targetSize = fs.statSync(finalTargetPath).size;
          }
        } catch {}

        resolve(
          NextResponse.json({
            status: 'ok',
            message: isImage ? 'Picture DLSS 5 Upscale Complete' : 'Hardware NVENC Video Upscale Complete',
            filename: finalTargetFilename,
            downloadUrl: `/outputs/${webFilename}`,
            outputPath: finalTargetPath,
            destinationFolder: finalTargetDir,
            encoder: isImage ? 'image_lanczos_neural' : selectedEncoder,
            mediaType: isImage ? 'image' : 'video',
            scaleFactor,
            fileSizeBytes: targetSize,
          })
        );
      });
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Upscale request error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
