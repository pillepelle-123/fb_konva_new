import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '../../../ui/primitives/button';
import { X } from 'lucide-react';
import { useZoom } from '../canvas/zoom-context';

interface ZoomPopoverProps {
  activeTool: string;
  onToolSelect: (toolId: string) => void;
  children: React.ReactNode;
}

export function ZoomPopover({ onToolSelect, children }: ZoomPopoverProps) {
  const { zoom, setZoom, minZoom, maxZoom } = useZoom();
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const updatePosition = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPosition({ x: rect.right + 8, y: rect.top });
    }
  };

  const handleClick = () => {
    updatePosition();
    setIsOpen(!isOpen);
    if (!isOpen) {
      onToolSelect('zoom');
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        popoverRef.current && !popoverRef.current.contains(e.target as Node) &&
        triggerRef.current && !triggerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Convert zoom (0.1-3) to percentage (10-300) for display
  const zoomPercentage = Math.round(zoom * 100);
  const zoomValue = zoomPercentage; // 10-300 range

  const handleZoomChange = (value: number) => {
    // Convert percentage (10-300) back to zoom (0.1-3)
    const newZoom = value / 100;

    // Trigger zoom minimal mode for better performance during zoom changes
    window.dispatchEvent(new CustomEvent('zoom-start'));
    setZoom(newZoom);

    // Reset zoom minimal mode after a short delay
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('zoom-end'));
    }, 200);
  };

  return (
    <div ref={triggerRef}>
      <div onClick={handleClick}>
        {children}
      </div>
      {isOpen && createPortal(
        <div
          ref={popoverRef}
          className="fixed w-30 p-2 bg-background border rounded-md shadow-lg"
          style={{ left: position.x, top: position.y, zIndex: 10000 }}
        >
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-medium">Zoom</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
              className="h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex flex-col items-center gap-4 py-2">
            {/* Vertical Slider */}
            <div className="flex flex-col items-center gap-2" style={{ height: '200px' }}>
              <span className="text-xs text-muted-foreground">{minZoom * 100}%</span>
              <div className="flex-1 flex items-center justify-center" style={{ height: '150px' }}>
                <input
                  type="range"
                  min={minZoom * 100}
                  max={maxZoom * 100}
                  step={1}
                  value={zoomValue}
                  onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
                  className="slider-vertical"
                  style={{
                    WebkitAppearance: 'slider-vertical',
                    width: '8px',
                    height: '150px',
                    cursor: 'pointer',
                    transform: 'rotate(180deg)',
                    direction: 'rtl'
                  }}
                />
                <style>{`
                  .slider-vertical {
                    -webkit-appearance: slider-vertical;
                    appearance: slider-vertical;
                  }
                  .slider-vertical::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    appearance: none;
                    width: 16px;
                    height: 16px;
                    border-radius: 50%;
                    background: var(--foreground);
                    cursor: pointer;
                  }
                  .slider-vertical::-moz-range-thumb {
                    width: 16px;
                    height: 16px;
                    border-radius: 50%;
                    background: var(--foreground);
                    cursor: pointer;
                    border: none;
                  }
                `}</style>
              </div>
              <span className="text-xs text-muted-foreground">{maxZoom * 100}%</span>
            </div>
            {/* Current zoom value display */}
            <div className="text-center">
              <span className="text-lg font-semibold">{zoomPercentage}%</span>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

