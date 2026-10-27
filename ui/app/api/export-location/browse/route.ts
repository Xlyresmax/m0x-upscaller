import { NextRequest, NextResponse } from 'next/server';
import { execFile } from 'child_process';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const initialDir = body?.initialDir || '';

    const psCommand = `
Add-Type -AssemblyName System.Windows.Forms;
$f = New-Object System.Windows.Forms.FolderBrowserDialog;
$f.Description = 'Select Destination Folder for Export';
$f.ShowNewFolderButton = $true;
if ($env:INIT_DIR -and (Test-Path $env:INIT_DIR)) {
  $f.SelectedPath = $env:INIT_DIR;
}
$form = New-Object System.Windows.Forms.Form;
$form.TopMost = $true;
$form.Opacity = 0;
$form.Show();
$res = $f.ShowDialog($form);
$form.Close();
if ($res -eq [System.Windows.Forms.DialogResult]::OK) {
  [Console]::Out.Write($f.SelectedPath);
}
    `.trim();

    return new Promise<NextResponse>((resolve) => {
      execFile(
        'powershell',
        ['-NoProfile', '-Sta', '-Command', psCommand],
        {
          env: {
            ...process.env,
            INIT_DIR: initialDir && fs.existsSync(initialDir) ? path.resolve(initialDir) : '',
          },
          timeout: 120000,
        },
        (error, stdout) => {
          if (error) {
            console.error('Folder picker error:', error);
            return resolve(NextResponse.json({ status: 'cancelled', message: error.message }));
          }

          const selected = stdout ? stdout.trim() : '';
          if (selected && fs.existsSync(selected)) {
            return resolve(NextResponse.json({ status: 'ok', folder: selected }));
          }

          return resolve(NextResponse.json({ status: 'cancelled' }));
        }
      );
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Browse dialog failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
