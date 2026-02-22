import { Label } from '../../../ui/primitives/label';
import type { PaletteColorSlot } from '../../../../utils/sandbox-utils';
import { PALETTE_COLOR_SLOTS } from '../../../../utils/sandbox-utils';

interface SlotSelectorProps {
  value: PaletteColorSlot;
  onChange: (slot: PaletteColorSlot) => void;
  slotColors: Record<PaletteColorSlot, string>;
  label?: string;
}

export function SlotSelector({
  value,
  onChange,
  slotColors,
  label,
}: SlotSelectorProps) {
  return (
    <div className="space-y-2">
      {label && (
        <Label variant="xs">{label}</Label>
      )}
      <div className="grid grid-cols-3 gap-1.5">
        {PALETTE_COLOR_SLOTS.map((slot) => (
          <button
            key={slot}
            type="button"
            className={`
              h-9 rounded border-2 transition-all flex flex-col items-center justify-center p-1
              ${value === slot
                ? 'border-primary ring-2 ring-primary/30'
                : 'border-border hover:border-muted-foreground/50'
              }
            `}
            style={{ backgroundColor: slotColors[slot] || '#888' }}
            onClick={() => onChange(slot)}
            title={slot}
          >
            <span
              className={`text-[10px] truncate w-full text-center ${
                value === slot ? 'text-white font-medium drop-shadow' : 'text-white/90'
              }`}
              style={{ textShadow: value === slot ? '0 0 2px rgba(0,0,0,0.8)' : undefined }}
            >
              {slot}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
