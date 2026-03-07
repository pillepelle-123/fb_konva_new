/**
 * Position Buttons Component
 * 9 buttons for quick item placement (corners, edges, center)
 */

import { Button } from '../../../ui/primitives/button';
import {
  ArrowUpLeft,
  ArrowUp,
  ArrowUpRight,
  ArrowLeft,
  ArrowRight,
  ArrowDownLeft,
  ArrowDown,
  ArrowDownRight,
  Dot,
} from 'lucide-react';
import type { DesignerItemPosition } from '../../../../../../shared/types/background-designer';

const POSITION_BUTTONS: Array<{
  position: DesignerItemPosition;
  icon: React.ReactNode;
  tooltip: string;
  row: number;
  col: number;
}> = [
  { position: 'top-left', icon: <ArrowUpLeft size={18} />, tooltip: 'Top Left', row: 0, col: 0 },
  { position: 'top-center', icon: <ArrowUp size={18} />, tooltip: 'Top Center', row: 0, col: 1 },
  { position: 'top-right', icon: <ArrowUpRight size={18} />, tooltip: 'Top Right', row: 0, col: 2 },
  { position: 'center-left', icon: <ArrowLeft size={18} />, tooltip: 'Middle Left', row: 1, col: 0 },
  { position: 'center', icon: <Dot size={18} />, tooltip: 'Center', row: 1, col: 1 },
  { position: 'center-right', icon: <ArrowRight size={18} />, tooltip: 'Middle Right', row: 1, col: 2 },
  {
    position: 'bottom-left',
    icon: <ArrowDownLeft size={18} />,
    tooltip: 'Bottom Left',
    row: 2,
    col: 0,
  },
  { position: 'bottom-center', icon: <ArrowDown size={18} />, tooltip: 'Bottom Center', row: 2, col: 1 },
  {
    position: 'bottom-right',
    icon: <ArrowDownRight size={18} />,
    tooltip: 'Bottom Right',
    row: 2,
    col: 2,
  },
];

interface PositionButtonsProps {
  onPositionSelect: (position: DesignerItemPosition) => void;
  disabled?: boolean;
}

export function PositionButtons({ onPositionSelect, disabled = false }: PositionButtonsProps) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-sm font-medium text-gray-700">Quick Position</p>
      <div className="grid grid-cols-3 gap-2">
        {POSITION_BUTTONS.map((btn) => (
          <Button
            key={btn.position}
            type="button"
            size="sm"
            variant="outline"
            disabled={disabled}
            onClick={() => onPositionSelect(btn.position)}
            title={btn.tooltip}
            className="p-2 h-auto flex items-center justify-center text-gray-600 hover:text-blue-600 hover:bg-blue-50"
          >
            {btn.icon}
          </Button>
        ))}
      </div>
    </div>
  );
}
