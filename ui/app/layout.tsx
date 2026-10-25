import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'DLSS 5 Video Studio - AI Neural Upscaler & Frame Generator',
  description: 'DirectX 12 GPU-Accelerated Video Studio with RTX Video Super Resolution, DLSS 5 Neural Rendering, and Multi-Frame Generation.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-slate-950 text-slate-100 antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
