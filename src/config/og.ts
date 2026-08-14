type RGBColor = [r: number, g: number, b: number];

export const ogConfig = {
  ogImageSite: '/og/site.png',
  fontPaths: [
    './src/assets/fonts/og/NotoSansSC-Regular.ttf',
    './src/assets/fonts/og/NotoSansSC-SemiBold.ttf',
  ],
  bgColor: [
    [9, 9, 11],
    [24, 24, 27],
  ] as [RGBColor, RGBColor],
  borderColor: [99, 102, 241] as RGBColor,
  titleColor: [250, 250, 250] as RGBColor,
  descriptionColor: [161, 161, 170] as RGBColor,
  accentColor: [99, 102, 241] as const,
};
