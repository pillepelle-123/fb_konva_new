import { useEffect, useMemo, useState } from 'react';
import { Group, Rect, Image as KonvaImage } from 'react-konva';
import themesData from '../../../../data/templates/themes';
import { colorPalettes, getPalettePartColor } from '../../../../data/templates/color-palettes';
import { resolveBackgroundImageUrl } from '../../../../utils/background-image-utils';

type MiniKonvaBackgroundProps = {
  x: number;
  y: number;
  width: number;
  height: number;
  themeId: string;
  paletteId: string;
  mirror?: boolean;
};

const imageCache = new Map<string, HTMLImageElement>();

function usePreloadedImage(url: string | null) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    let mounted = true;
    if (!url) {
      setImg(null);
      return;
    }
    const cached = imageCache.get(url);
    if (cached && cached.complete) {
      setImg(cached);
      return;
    }
    const image = cached ?? new window.Image();
    if (!cached) {
      image.crossOrigin = 'anonymous';
      image.src = url;
      imageCache.set(url, image);
    }
    const onLoad = () => mounted && setImg(image);
    const onError = () => mounted && setImg(null);
    if (image.complete) {
      onLoad();
    } else {
      image.addEventListener('load', onLoad);
      image.addEventListener('error', onError);
    }
    return () => {
      mounted = false;
      image.removeEventListener('load', onLoad);
      image.removeEventListener('error', onError);
    };
  }, [url]);
  return img;
}

export default function MiniKonvaBackground({
  x,
  y,
  width,
  height,
  themeId,
  paletteId,
  mirror = false,
}: MiniKonvaBackgroundProps) {
  const theme = (themesData as any)[themeId] ?? (themesData as any).default;
  const palette = colorPalettes.find((p) => p.id === paletteId) ?? colorPalettes[0];
  const baseBgColor = getPalettePartColor(palette, 'pageBackground', 'surface', '#ffffff') || '#ffffff';

  const bgCfg = theme?.pageSettings?.backgroundImage?.enabled ? theme.pageSettings.backgroundImage : null;
  const opacity = typeof theme?.pageSettings?.backgroundOpacity === 'number' ? theme.pageSettings.backgroundOpacity : 1;

  const { imageUrl, sizeMode, repeat, position, containWidthPercent } = useMemo(() => {
    if (!bgCfg) {
      return {
        imageUrl: null as string | null,
        sizeMode: 'none' as 'none' | 'cover' | 'contain',
        repeat: false,
        position: 'top-left' as string,
        containWidthPercent: 100,
      };
    }
    const url =
      resolveBackgroundImageUrl(
        {
          type: 'image',
          value: bgCfg?.templateId || bgCfg?.url || '',
          backgroundImageTemplateId: bgCfg?.templateId,
          imageSize: bgCfg?.size || 'cover',
          imageRepeat: !!bgCfg?.repeat,
          imagePosition: bgCfg?.position || 'top-left',
          imageContainWidthPercent: bgCfg?.width ?? 100,
        } as any,
        { paletteId: palette?.id ?? null, paletteColors: palette?.colors },
      ) || (bgCfg?.url ?? null);
    return {
      imageUrl: url,
      sizeMode: (bgCfg?.size || 'cover') as 'cover' | 'contain',
      repeat: !!bgCfg?.repeat,
      position: bgCfg?.position || 'top-left',
      containWidthPercent: bgCfg?.width ?? 100,
    };
  }, [bgCfg, palette?.id, palette?.colors]);

  const image = usePreloadedImage(imageUrl);

  const imageProps = useMemo(() => {
    if (!image || !imageUrl) return null;
    const iw = image.naturalWidth || image.width || 1;
    const ih = image.naturalHeight || image.height || 1;
    let w = width;
    let h = height;
    let dx = x;
    let dy = y;
    let scaleX = 1;
    let scaleY = 1;
    if (sizeMode === 'cover') {
      const s = Math.max(width / iw, height / ih);
      w = iw * s;
      h = ih * s;
    } else {
      const widthRatio = Math.max(0.1, Math.min(2, (containWidthPercent ?? 100) / 100));
      const desiredWidth = width * widthRatio;
      const s = desiredWidth / iw;
      w = iw * s;
      h = ih * s;
    }
    const { offX, offY } = computePosition(position, width, height, w, h);
    dx = x + offX;
    dy = y + offY;
    if (mirror) {
      scaleX = -1;
      dx = dx + w;
    }
    return { image, dx, dy, w, h, scaleX, scaleY, opacity };
  }, [image, imageUrl, sizeMode, containWidthPercent, position, x, y, width, height, mirror, opacity]);

  return (
    <Group>
      <Rect x={x} y={y} width={width} height={height} fill={baseBgColor} listening={false} />
      {image && imageUrl && bgCfg?.repeat ? (
        <Rect
          x={x}
          y={y}
          width={width}
          height={height}
          fillPatternImage={image}
          fillPatternRepeat="repeat"
          opacity={opacity}
          listening={false}
          scaleX={mirror ? -1 : 1}
          offsetX={mirror ? width : 0}
        />
      ) : null}
      {imageProps && !bgCfg?.repeat ? (
        <KonvaImage
          image={imageProps.image}
          x={imageProps.dx}
          y={imageProps.dy}
          width={imageProps.w}
          height={imageProps.h}
          opacity={imageProps.opacity}
          scaleX={imageProps.scaleX}
          scaleY={imageProps.scaleY}
          listening={false}
        />
      ) : null}
    </Group>
  );
}

function computePosition(
  pos: string,
  pw: number,
  ph: number,
  iw: number,
  ih: number,
): { offX: number; offY: number } {
  const isRight = pos.endsWith('right');
  const isBottom = pos.startsWith('bottom');
  const isCenter = pos === 'center';
  const offX = isCenter ? (pw - iw) / 2 : isRight ? pw - iw : 0;
  const offY = isCenter ? (ph - ih) / 2 : isBottom ? ph - ih : 0;
  return { offX, offY };
}



