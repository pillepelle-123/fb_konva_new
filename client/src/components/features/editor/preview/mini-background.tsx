import React, { useMemo } from 'react';
import themesData from '../../../../data/templates/themes.json';
import { colorPalettes, getPalettePartColor } from '../../../../data/templates/color-palettes';
import { resolveBackgroundImageUrl } from '../../../../utils/background-image-utils';

type MiniBackgroundProps = {
  width: number;
  height: number;
  themeId: string;
  paletteId: string;
  mirror?: boolean;
  className?: string;
};

/**
 * MiniBackground
 * DOM-only background renderer for the lightweight preview.
 * Supports:
 * - Palette background color
 * - Theme background image (cover/contain/repeat, position, opacity)
 * (Patterns optional; omitted in MVP for simplicity and performance)
 */
export default function MiniBackground({
  width,
  height,
  themeId,
  paletteId,
  mirror = false,
  className,
}: MiniBackgroundProps) {
  const theme = (themesData as any)[themeId] ?? (themesData as any).default;
  const palette = colorPalettes.find((p) => p.id === paletteId) ?? colorPalettes[0];

  const baseBgColor = getPalettePartColor(palette, 'pageBackground', 'surface', '#ffffff') || '#ffffff';
  const pageSettings = theme?.pageSettings ?? {};
  const bgImageCfg = pageSettings?.backgroundImage?.enabled ? pageSettings.backgroundImage : null;
  const opacity = typeof pageSettings?.backgroundOpacity === 'number' ? pageSettings.backgroundOpacity : 1;

  const { imageUrl, mode, repeat, position, containWidthPercent } = useMemo(() => {
    if (!bgImageCfg) {
      return {
        imageUrl: null as string | null,
        mode: 'color' as 'color' | 'cover' | 'contain',
        repeat: false,
        position: 'top-left' as string,
        containWidthPercent: 100,
      };
    }

    const effectiveUrl =
      resolveBackgroundImageUrl(
        {
          type: 'image',
          value: bgImageCfg?.templateId || bgImageCfg?.url || '',
          backgroundImageTemplateId: bgImageCfg?.templateId,
          imageSize: bgImageCfg?.size || 'cover',
          imageRepeat: !!bgImageCfg?.repeat,
          imagePosition: bgImageCfg?.position || 'top-left',
          imageContainWidthPercent: bgImageCfg?.width ?? 100,
        } as any,
        {
          paletteId: palette?.id ?? null,
          paletteColors: palette?.colors,
        },
      ) || (bgImageCfg?.url ?? null);

    const size = bgImageCfg?.size || 'cover';
    return {
      imageUrl: effectiveUrl,
      mode: (size === 'contain' ? 'contain' : 'cover') as 'cover' | 'contain',
      repeat: !!bgImageCfg?.repeat,
      position: bgImageCfg?.position || 'top-left',
      containWidthPercent: bgImageCfg?.width ?? 100,
    };
  }, [bgImageCfg, palette?.id, palette?.colors]);

  // Container style
  const containerStyle: React.CSSProperties = {
    width,
    height,
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: baseBgColor,
    borderRadius: 8,
  };

  // For repeat we can use CSS background
  const repeatBgStyle: React.CSSProperties = imageUrl
    ? {
        backgroundImage: `url("${imageUrl}")`,
        backgroundRepeat: repeat ? 'repeat' : 'no-repeat',
        backgroundSize: mode === 'cover' ? 'cover' : mode === 'contain' ? 'contain' : 'cover',
        backgroundPosition: cssPosition(position),
        opacity,
        transform: mirror ? 'scaleX(-1)' : undefined,
        transformOrigin: 'center',
      }
    : {};

  return (
    <div className={className ?? ''} style={containerStyle}>
      {/* Repeat or cover/contain via CSS */}
      {imageUrl ? (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            ...repeatBgStyle,
          }}
        />
      ) : null}
    </div>
  );
}

function cssPosition(pos: string): string {
  // Map theme string to CSS background-position keywords
  switch (pos) {
    case 'top-left':
      return 'left top';
    case 'top-right':
      return 'right top';
    case 'bottom-left':
      return 'left bottom';
    case 'bottom-right':
      return 'right bottom';
    case 'center':
      return 'center center';
    default:
      return 'left top';
  }
}


