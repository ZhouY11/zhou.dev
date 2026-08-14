import type { APIRoute } from 'astro';

import { generateOpenGraphImage } from 'astro-og-canvas';

import { ogConfig } from '@/config/og';
import { siteConfig } from '@/config/site';

export const GET: APIRoute = async () => {
  const image = await generateOpenGraphImage({
    title: siteConfig.name,
    description: `FRONTEND ENGINEER · ${siteConfig.description}`,

    bgGradient: ogConfig.bgColor,

    border: {
      color: ogConfig.borderColor,
      width: 8,
      side: 'inline-start',
    },

    padding: 72,

    fonts: ogConfig.fontPaths,

    font: {
      title: {
        size: 76,
        weight: 'SemiBold',
        color: ogConfig.titleColor,
        families: ['Noto Sans SC'],
        lineHeight: 1.15,
      },

      description: {
        size: 28,
        weight: 'Normal',
        color: ogConfig.descriptionColor,
        families: ['Noto Sans SC'],
        lineHeight: 1.45,
      },
    },
  });

  return new Response(image, {
    headers: {
      'Content-Type': 'image/png',
    },
  });
};
