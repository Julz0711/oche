import type { MetadataRoute } from 'next';
import { tokens } from '@/lib/theme';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Oche',
    short_name: 'Oche',
    description: 'Real-time darts scoring web app',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait-primary',
    background_color: tokens.oche,
    theme_color: tokens.oche,
    // These icons are now a solid --oche tile with the mark inset to roughly Android's
    // maskable "safe zone" (the glyph sits within the centre ~65-70% of the square), so a
    // `purpose: 'maskable'` entry could be added safely if adaptive-icon theming is wanted —
    // left as plain `any` for now since nothing has asked for that yet.
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    ],
  };
}
