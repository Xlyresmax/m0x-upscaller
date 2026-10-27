import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { filePath, action = 'open' } = await req.json();

    if (!filePath || typeof filePath !== 'string') {
      return NextResponse.json({ error: 'File path is required' }, { status: 400 });
    }

    const resolved = path.resolve(filePath);
    if (!fs.existsSync(resolved)) {
      return NextResponse.json({ error: `File does not exist: ${resolved}` }, { status: 404 });
    }

    if (action === 'reveal') {
      // Open Windows Explorer with the specific file highlighted
      exec(`explorer.exe /select,"${resolved}"`, (err) => {
        if (err) console.error('Failed to reveal file:', err);
      });
      return NextResponse.json({ status: 'ok', action: 'reveal', path: resolved });
    } else {
      // Launch the file with default system application (e.g. Media Player, VLC)
      exec(`cmd.exe /c start "" "${resolved}"`, (err) => {
        if (err) console.error('Failed to open file:', err);
      });
      return NextResponse.json({ status: 'ok', action: 'open', path: resolved });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Open file error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
