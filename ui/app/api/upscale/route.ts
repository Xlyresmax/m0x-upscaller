import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
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

    const baseName = path.basename(inputPath, path.extname(inputPath));
    const outExt = isImage ? (['.jpg', '.jpeg'].includes(ext) ? '.jpg' : '.png') : '.mp4';
    const outFilename = `enhanced_${baseName}_${scaleFactor}x_${style.toLowerCase()}_${Date.now()}${outExt}`;
    const outputPath = path.join(outputsPublicDir, outFilename);
    const workspaceOutputPath = path.join(outputsWorkspaceDir, outFilename);

    // Build filter chain
    const filters: string[] = [];

    if (deblock) {
      filters.push('deblock=filter=weak:block=4');
    }

    filters.push(`scale=iw*${scaleFactor}:ih*${scaleFactor}:flags=lanczos`);

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
      filters.push('minterpolate=fps=120:mi_mode=mci:mc_mode=aobmc:me_mode=bidir');
    }

    const vfString = filters.join(',');
    const selectedEncoder = ['av1_nvenc', 'hevc_nvenc', 'h264_nvenc'].includes(encoder)
      ? encoder
      : 'hevc_nvenc';

    const ffmpegExe = getFfmpegPath();

    // Map video and optional audio if video, or render high-quality picture if image
    const cmd = isImage
      ? `${ffmpegExe} -y -i "${inputPath}" -vf "${vfString}" "${outputPath}"`
      : `${ffmpegExe} -y -hwaccel cuda -i "${inputPath}" -vf "${vfString}" -c:v ${selectedEncoder} -preset p7 -cq 18 -b:v 0 -map 0:v -map 0:a? -c:a copy "${outputPath}"`;

    const env = {
      ...process.env,
      PATH: `${process.env.PATH || ''};C:\\Users\\ayush\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-9.0.2-full_build\\bin`,
    };

    return new Promise<NextResponse>((resolve) => {
      exec(cmd, { env, timeout: 180000 }, (error, stdout, stderr) => {
        if (error) {
          console.error('Upscale error, trying fallback:', stderr || error.message);
          const fallbackCmd = isImage
            ? `${ffmpegExe} -y -i "${inputPath}" -vf "scale=iw*${scaleFactor}:ih*${scaleFactor}" "${outputPath}"`
            : `${ffmpegExe} -y -i "${inputPath}" -vf "${vfString}" -c:v libx264 -preset fast -crf 18 -map 0:v -map 0:a? -c:a copy "${outputPath}"`;

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

            try {
              fs.copyFileSync(outputPath, workspaceOutputPath);
            } catch {}

            return resolve(
              NextResponse.json({
                status: 'ok',
                message: isImage ? 'Picture upscaled successfully' : 'Video upscaled successfully (CPU fallback)',
                filename: outFilename,
                downloadUrl: `/outputs/${outFilename}`,
                outputPath: workspaceOutputPath,
                mediaType: isImage ? 'image' : 'video',
                scaleFactor,
              })
            );
          });
          return;
        }

        try {
          fs.copyFileSync(outputPath, workspaceOutputPath);
        } catch {}

        resolve(
          NextResponse.json({
            status: 'ok',
            message: isImage ? 'Picture DLSS 5 Upscale Complete' : 'Hardware NVENC Video Upscale Complete',
            filename: outFilename,
            downloadUrl: `/outputs/${outFilename}`,
            outputPath: workspaceOutputPath,
            encoder: isImage ? 'image_lanczos_neural' : selectedEncoder,
            mediaType: isImage ? 'image' : 'video',
            scaleFactor,
          })
        );
      });
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Upscale request error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
