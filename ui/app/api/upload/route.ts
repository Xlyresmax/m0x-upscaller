import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = (formData.get('file') ||
      formData.get('media') ||
      formData.get('video') ||
      formData.get('image')) as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No media file (picture or video) provided' }, { status: 400 });
    }

    const uploadsDir = path.resolve(process.cwd(), 'public/uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const isImage =
      /\.(png|jpe?g|webp|bmp|tiff|avif)$/i.test(file.name) || file.type.startsWith('image/');
    const mediaType = isImage ? 'image' : 'video';

    const safeName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const filePath = path.join(uploadsDir, safeName);

    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(filePath, buffer);

    return NextResponse.json({
      status: 'ok',
      filename: safeName,
      url: `/uploads/${safeName}`,
      fullPath: filePath,
      sizeBytes: buffer.length,
      mediaType,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Upload failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
