import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET() {
  const userProfile = process.env.USERPROFILE || process.env.HOME || 'C:\\Users\\Default';
  const videosDir = path.resolve(userProfile, 'Videos');
  const desktopDir = path.resolve(userProfile, 'Desktop');
  const downloadsDir = path.resolve(userProfile, 'Downloads');
  const workspaceOutputsDir = path.resolve(process.cwd(), '../outputs');

  let defaultFolder = videosDir;
  if (!fs.existsSync(defaultFolder)) {
    defaultFolder = desktopDir;
  }
  if (!fs.existsSync(defaultFolder)) {
    defaultFolder = workspaceOutputsDir;
  }

  if (!fs.existsSync(workspaceOutputsDir)) {
    try {
      fs.mkdirSync(workspaceOutputsDir, { recursive: true });
    } catch {}
  }

  return NextResponse.json({
    status: 'ok',
    videos: fs.existsSync(videosDir) ? videosDir : userProfile,
    desktop: fs.existsSync(desktopDir) ? desktopDir : userProfile,
    downloads: fs.existsSync(downloadsDir) ? downloadsDir : userProfile,
    outputs: workspaceOutputsDir,
    defaultFolder,
    homeDir: userProfile,
  });
}
