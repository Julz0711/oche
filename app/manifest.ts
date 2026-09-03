import type { MetadataRoute } from 'next';
import { tokens } from '@/lib/theme';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Oche',
    short_name: 'Oche',
    description: 'Real-time darts scoring web app',
    start_url: '/',
    display: 'standalone',
    background_color: tokens.oche,
    theme_color: tokens.oche,
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
