import type { PageTemplate } from '../../../../types/template-types';

const PAGE_WIDTH = 2480;
const PAGE_HEIGHT = 3508;

type TemplateItem =
  | {
      id: string;
      type: 'qna' | 'text' | 'answer' | 'other';
      position: { x: number; y: number };
      size: { width: number; height: number };
      rotation?: number;
    }
  | {
      id: string;
      type: 'image';
      position: { x: number; y: number };
      size: { width: number; height: number };
      rotation?: number;
    };

const ITEM_STYLE: Record<
  TemplateItem['type'],
  { background: string; border: string; label: string }
> = {
  qna: {
    background: 'rgba(160, 18, 160, 0.65)', // darker blue
    border: '#1e3a8a',
    label: 'Q&A'
  },
  answer: {
    background: 'rgba(56, 189, 248, 0.65)',
    border: '#0ea5e9',
    label: 'Answer'
  },
  text: {
    background: 'rgba(96, 165, 250, 0.65)',
    border: '#2563eb',
    label: 'Text'
  },
  other: {
    background: 'rgba(148, 163, 184, 0.65)',
    border: '#475569',
    label: 'Element'
  },
  image: {
    background: 'rgba(249, 115, 22, 0.65)', // orange
    border: '#ea580c',
    label: 'Image'
  }
};

function normalizeTemplateItems(template: PageTemplate): TemplateItem[] {
  const textboxItems =
    template.textboxes?.map((textbox, index) => {
      const type = (textbox.type as TemplateItem['type']) ?? 'other';
      return {
        id: `textbox-${index}`,
        type: ITEM_STYLE[type] ? type : ('other' as const),
        position: {
          x: textbox.position.x + 300 ?? 0,
          y: textbox.position.y + 300 ?? 0
        },
        size: {
          width: textbox.size.width ?? 0,
          height: textbox.size.height ?? 0
        },
        rotation: (textbox as any).rotation ?? 0
      };
    }) ?? [];

  const elementItems =
    template.elements?.map((element, index) => ({
      id: `element-${index}`,
      type: element.type === 'image' ? ('image' as const) : ('other' as const),
      position: {
        x: element.position.x + 300 ?? 0,
        y: element.position.y + 300 ?? 0
      },
      size: {
        width: element.size.width ?? 0,
        height: element.size.height ?? 0
      },
      rotation: (element as any).rotation ?? 0
    })) ?? [];

  return [...textboxItems, ...elementItems];
}

export interface LayoutTemplatePreviewProps {
  template: PageTemplate;
  className?: string;
  showLegend?: boolean;
  showItemLabels?: boolean;
}

export function LayoutTemplatePreview({
  template,
  className,
  showLegend = false,
  showItemLabels = true
}: LayoutTemplatePreviewProps) {
  const items = normalizeTemplateItems(template);

  return (
    <div className={`flex flex-col gap-2 ${className ?? ''}`}>
      <div className="relative w-full rounded-lg border border-gray-200 bg-slate-50 shadow-inner aspect-[210/297] overflow-hidden">
        <div className="absolute inset-1 rounded-md border border-dashed border-slate-300 bg-white" />
        {items.map((item) => {
          const styleConfig = ITEM_STYLE[item.type] ?? ITEM_STYLE.other;
          const widthPercent = (item.size.width / PAGE_WIDTH) * 80;
          const heightPercent = (item.size.height / PAGE_HEIGHT) * 80;
          const leftPercent = (item.position.x / PAGE_WIDTH) * 80;
          const topPercent = (item.position.y / PAGE_HEIGHT) * 80;
          const rotation = item.rotation ?? 0;

          return (
            <div
              key={item.id}
              className="absolute flex items-center justify-center text-[11px] font-medium text-white"
              style={{
                left: `${leftPercent}%`,
                top: `${topPercent}%`,
                width: `${widthPercent}%`,
                height: `${heightPercent}%`,
                backgroundColor: styleConfig.background,
                border: `1.5px solid ${styleConfig.border}`,
                borderRadius: 2,
                boxShadow: '0 2px 4px rgba(15, 23, 42, 0.15)',
                letterSpacing: '0.02em',
                transform: rotation !== 0 ? `rotate(${rotation}deg)` : undefined,
                transformOrigin: 'center center'
              }}
            >
              {showItemLabels && (
                <span className="px-2 py-0.5 rounded-full bg-slate-900/20 backdrop-blur">
                  {styleConfig.label}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {showLegend && (
        <div className="flex flex-wrap gap-2 text-[11px] text-slate-600">
          {Object.entries(ITEM_STYLE).map(([key, value]) => {
            // Hide generic "Element" legend if no item uses it
            if (
              key === 'other' &&
              !items.some((item) => item.type === ('other' as TemplateItem['type']))
            ) {
              return null;
            }
            return (
              <div key={key} className="flex items-center gap-1 rounded-full border border-slate-200 bg-white/80 px-2 py-1 shadow-sm">
                <span
                  className="inline-flex h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: value.background, border: `1px solid ${value.border}` }}
                />
                <span className="font-medium">{value.label}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

