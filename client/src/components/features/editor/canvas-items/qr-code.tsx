import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Image as KonvaImage, Rect } from 'react-konva';
import QRCodeStyling from 'qr-code-styling';
import BaseCanvasItem, { type CanvasItemProps } from './base-canvas-item';
import { useEditor } from '../../../../context/editor-context';
import { getGlobalThemeDefaults } from '../../../../utils/global-themes';

const DEFAULT_QR_SIZE = 200;

type QrDotsStyle = 'square' | 'dots' | 'rounded' | 'extra-rounded';
type QrCornerSquareStyle = 'square' | 'dot' | 'extra-rounded';
type QrCornerDotStyle = 'square' | 'dot';

type QrCodeStylingOptions = {
  width: number;
  height: number;
  data: string;
  margin?: number;
  dotsOptions: {
    type: QrDotsStyle;
    color: string;
  };
  backgroundOptions: {
    color: string;
  };
  qrOptions: {
    errorCorrectionLevel: 'L' | 'M' | 'Q' | 'H';
  };
  cornersSquareOptions?: {
    type: QrCornerSquareStyle;
    color: string;
  };
  cornersDotOptions?: {
    type: QrCornerDotStyle;
    color: string;
  };
};

type QrCodeStylingInstance = QRCodeStyling & {
  update: (options: QrCodeStylingOptions) => void;
  getRawData?: (type: 'png') => Promise<Blob>;
  getDataUrl?: (type: 'png') => Promise<string>;
};

type PdfExportWindow = Window & {
  __PDF_EXPORT__?: boolean;
  __PDF_QR_PENDING__?: number;
};

const getPdfWindow = (): PdfExportWindow | null => {
  if (typeof window === 'undefined') return null;
  return window as PdfExportWindow;
};

export default function QrCodeCanvasItem(props: CanvasItemProps) {
  const { element } = props;
  const { state } = useEditor();
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const qrRef = useRef<QrCodeStylingInstance | null>(null);
  const pdfPendingRef = useRef(false);
  const isPdfExport = useMemo(() => Boolean(getPdfWindow()?.__PDF_EXPORT__), []);

  const updatePdfPending = useCallback((delta: number) => {
    const pdfWindow = getPdfWindow();
    if (!pdfWindow?.__PDF_EXPORT__) return;
    const current = Number(pdfWindow.__PDF_QR_PENDING__ || 0);
    const next = Math.max(0, current + delta);
    pdfWindow.__PDF_QR_PENDING__ = next;
  }, []);

  const currentPage = state.currentBook?.pages[state.activePageIndex];
  const pageTheme = currentPage?.themeId || currentPage?.background?.pageTheme;
  const bookTheme = state.currentBook?.themeId || state.currentBook?.bookTheme;
  const pageColorPaletteId = currentPage?.colorPaletteId;
  const bookColorPaletteId = state.currentBook?.colorPaletteId;

  const qrDefaults = useMemo(() => {
    const activeTheme = pageTheme || bookTheme || 'default';
    const effectivePaletteId = pageColorPaletteId || bookColorPaletteId;
    return getGlobalThemeDefaults(activeTheme, 'qr_code', effectivePaletteId);
  }, [pageTheme, bookTheme, pageColorPaletteId, bookColorPaletteId]);

  const qrValue = element.qrValue || '';
  const qrForegroundColor = element.qrForegroundColor || qrDefaults.qrForegroundColor || '#111827';
  const qrBackgroundColor = element.qrBackgroundColor || qrDefaults.qrBackgroundColor || '#ffffff';
  const qrErrorCorrection = element.qrErrorCorrection || qrDefaults.qrErrorCorrection || 'M';
  const qrMargin = element.qrMargin ?? qrDefaults.qrMargin ?? 1;
  const qrDotsStyle = element.qrDotsStyle || qrDefaults.qrDotsStyle || 'square';
  const qrCornerStyle = element.qrCornerStyle || qrDefaults.qrCornerStyle || 'default';

  const width = element.width || DEFAULT_QR_SIZE;
  const height = element.height || DEFAULT_QR_SIZE;

  const cornerOptions = useMemo<{
    cornersSquareOptions?: { type: QrCornerSquareStyle; color: string };
    cornersDotOptions?: { type: QrCornerDotStyle; color: string };
  }>(() => {
    switch (qrCornerStyle) {
      case 'square-square':
        return {
          cornersSquareOptions: { type: 'square', color: qrForegroundColor },
          cornersDotOptions: { type: 'square', color: qrForegroundColor }
        };
      case 'dot-dot':
        return {
          cornersSquareOptions: { type: 'dot', color: qrForegroundColor },
          cornersDotOptions: { type: 'dot', color: qrForegroundColor }
        };
      case 'extra-rounded-dot':
        return {
          cornersSquareOptions: { type: 'extra-rounded', color: qrForegroundColor },
          cornersDotOptions: { type: 'dot', color: qrForegroundColor }
        };
      default:
        return {
          cornersSquareOptions: undefined,
          cornersDotOptions: undefined
        };
    }
  }, [qrCornerStyle, qrForegroundColor]);

  useEffect(() => {
    let isCancelled = false;

    if (!qrValue) {
      setDataUrl(null);
      setImage(null);
      if (pdfPendingRef.current) {
        updatePdfPending(-1);
        pdfPendingRef.current = false;
      }
      return undefined;
    }

    if (isPdfExport && !pdfPendingRef.current) {
      pdfPendingRef.current = true;
      updatePdfPending(1);
    }

    const pixelSize = Math.max(128, Math.round(Math.max(width, height) * 4));
    const backgroundColor = qrBackgroundColor === 'transparent' ? 'rgba(0,0,0,0)' : qrBackgroundColor;

    const options: QrCodeStylingOptions = {
      width: pixelSize,
      height: pixelSize,
      data: qrValue,
      margin: qrMargin,
      dotsOptions: {
        type: qrDotsStyle as QrDotsStyle,
        color: qrForegroundColor
      },
      backgroundOptions: {
        color: backgroundColor
      },
      qrOptions: {
        errorCorrectionLevel: qrErrorCorrection
      },
      cornersSquareOptions: cornerOptions.cornersSquareOptions,
      cornersDotOptions: cornerOptions.cornersDotOptions
    };

    if (!qrRef.current) {
      qrRef.current = new QRCodeStyling(options) as QrCodeStylingInstance;
    } else {
      qrRef.current.update(options);
    }

    const readBlobAsDataUrl = (blob: Blob) =>
      new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(blob);
      });

    const buildDataUrl = async () => {
      try {
        const qrCode = qrRef.current;
        if (!qrCode) return;

        if (qrCode.getRawData) {
          const raw = await qrCode.getRawData('png');
          if (!raw || isCancelled) return;
          const url = await readBlobAsDataUrl(raw);
          if (!isCancelled) setDataUrl(url);
          return;
        }

        if (qrCode.getDataUrl) {
          const url = await qrCode.getDataUrl('png');
          if (!isCancelled) setDataUrl(url);
          return;
        }

        setDataUrl(null);
      } catch {
        if (!isCancelled) {
          setDataUrl(null);
          setImage(null);
        }
        if (pdfPendingRef.current) {
          updatePdfPending(-1);
          pdfPendingRef.current = false;
        }
      }
    };

    void buildDataUrl();

    return () => {
      isCancelled = true;
    };
  }, [qrValue, qrForegroundColor, qrBackgroundColor, qrErrorCorrection, qrMargin, qrDotsStyle, cornerOptions, width, height, isPdfExport, updatePdfPending]);

  useEffect(() => {
    if (!dataUrl) {
      setImage(null);
      return;
    }

    const img = new window.Image();
    img.onload = () => setImage(img);
    img.onerror = () => setImage(null);
    img.src = dataUrl;
  }, [dataUrl]);

  useEffect(() => {
    if (!isPdfExport) return;
    if (image && pdfPendingRef.current) {
      updatePdfPending(-1);
      pdfPendingRef.current = false;
    }
  }, [image, isPdfExport, updatePdfPending]);

  return (
    <BaseCanvasItem {...props}>
      {image ? (
        <KonvaImage
          image={image}
          x={0}
          y={0}
          width={width}
          height={height}
          listening={false}
        />
      ) : (
        <Rect
          x={0}
          y={0}
          width={width}
          height={height}
          fill={qrBackgroundColor}
          stroke="#e5e7eb"
          strokeWidth={1}
          listening={false}
        />
      )}
    </BaseCanvasItem>
  );
}
