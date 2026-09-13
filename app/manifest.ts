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
    // No `maskable` entry: Android masks the whole image to a circle or squircle, which needs
    // an export whose background bleeds to the edges. The supplied icon is a rounded tile with
    // transparent corners, so declaring it maskable risks a clipped sliver on some launchers.
    // A padded, full-bleed export can be added here later.
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    ],
  };
}
