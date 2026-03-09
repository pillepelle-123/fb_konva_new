/**
 * Designer Property Panel
 * Right panel for editing selected item properties
 */

import { useState, useEffect } from 'react';
import { Input } from '../../../ui/primitives/input';
import { Label } from '../../../ui/primitives/label';
import { Button } from '../../../ui/primitives/button';
import { Separator } from '../../../ui/primitives/separator';
import { Trash2, Copy, ArrowUp, ArrowDown, ChevronsDown, ChevronsUp } from 'lucide-react';
import { ColorSelector } from '../../../features/editor/tool-settings/color-selector';
import { PositionButtons } from './position-buttons';
import type {
  DesignerItem as DesignerAsset,
  DesignerItemPosition as DesignerAssetPosition,
} from '../../../../../../shared/types/background-designer';

interface DesignerPropertyPanelProps {
  asset: DesignerAsset | null;
  canvasWidth: number;
  canvasHeight: number;
  onAssetUpdate: (updates: Partial<DesignerAsset>) => void;
  onAssetDelete: () => void;
  onAssetDuplicate: () => void;
  onPositionPreset: (position: DesignerAssetPosition) => void;
  onLayerChange: (direction: 'forward' | 'backward' | 'front' | 'back') => void;
  favoriteColors?: string[];
  onAddFavoriteColor?: (color: string) => void;
  onRemoveFavoriteColor?: (color: string) => void;
}

export function DesignerPropertyPanel({
  asset,
  canvasWidth,
  canvasHeight,
  onAssetUpdate,
  onAssetDelete,
  onAssetDuplicate,
  onPositionPreset,
  onLayerChange,
  favoriteColors,
  onAddFavoriteColor,
  onRemoveFavoriteColor,
}: DesignerPropertyPanelProps) {
  const [showColorPicker, setShowColorPicker] = useState(false);

  if (!asset) {
    return (
      <div className="w-80 border-l border-gray-200 bg-gray-50 p-4 flex items-center justify-center h-full">
        <p className="text-sm text-gray-500">Select an asset to edit properties</p>
      </div>
    );
  }

  const assetX = Math.round(asset.x * canvasWidth);
  const assetY = Math.round(asset.y * canvasHeight);
  const assetWidth = Math.round(asset.width);
  const assetHeight = Math.round(asset.height);

  return (
    <div className="w-80 border-l border-gray-200 bg-white overflow-y-auto max-h-full">
      <div className="p-4 space-y-4">
        {/* Header */}
        <div>
          <p className="text-sm font-semibold text-gray-900 capitalize">{asset.type} Asset</p>
          <p className="text-xs text-gray-500">{asset.id.slice(0, 8)}</p>
        </div>

        <Separator />

        {/* Type-specific properties */}
        {asset.type === 'image' && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="aspect-ratio"
                checked={(asset as any).aspectRatioLocked || false}
                onChange={(e) => onAssetUpdate({ aspectRatioLocked: e.target.checked })}
                className="w-4 h-4 rounded border-gray-300"
              />
              <label htmlFor="aspect-ratio" className="text-sm text-gray-700">
                Lock aspect ratio
              </label>
            </div>
          </div>
        )}

        {asset.type === 'text' && (
          <div className="space-y-3">
            <div>
              <Label size="sm">Text</Label>
              <input
                type="text"
                value={(asset as any).text || ''}
                onChange={(e) => onAssetUpdate({ text: e.target.value })}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label size="sm">Font Family</Label>
                <select
                  value={(asset as any).fontFamily || 'Arial'}
                  onChange={(e) => onAssetUpdate({ fontFamily: e.target.value })}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded"
                >
                  <option value="Arial">Arial</option>
                  <option value="Helvetica">Helvetica</option>
                  <option value="Times New Roman">Times New Roman</option>
                  <option value="Georgia">Georgia</option>
                  <option value="Courier New">Courier New</option>
                </select>
              </div>

              <div>
                <Label size="sm">Font Size</Label>
                <input
                  type="number"
                   value={Math.round((asset as any).fontSize || 0)}
                  onChange={(e) =>
                    onAssetUpdate({
                       fontSize: Math.max(12, Math.min(200, Number(e.target.value))),
                    })
                  }
                  min="8"
                  max="200"
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => onAssetUpdate({ fontBold: !(asset as any).fontBold })}
                className={`flex-1 px-2 py-1.5 text-sm font-bold rounded border ${
                  (asset as any).fontBold
                    ? 'bg-blue-100 border-blue-300 text-blue-700'
                    : 'bg-gray-100 border-gray-300 text-gray-700'
                }`}
              >
                B
              </button>
              <button
                onClick={() => onAssetUpdate({ fontItalic: !(asset as any).fontItalic })}
                className={`flex-1 px-2 py-1.5 text-sm italic rounded border ${
                  (asset as any).fontItalic
                    ? 'bg-blue-100 border-blue-300 text-blue-700'
                    : 'bg-gray-100 border-gray-300 text-gray-700'
                }`}
              >
                I
              </button>
            </div>

            <div>
              <Label size="sm">Color</Label>
              <div className="flex gap-2">
                <div
                  onClick={() => setShowColorPicker(!showColorPicker)}
                  className="flex-1 h-10 rounded border-2 border-gray-300 cursor-pointer"
                  style={{ backgroundColor: (asset as any).fontColor || '#000000' }}
                />
                <button
                  className="px-3 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50"
                  onClick={() => setShowColorPicker(!showColorPicker)}
                >
                  Pick
                </button>
              </div>

              {showColorPicker && (
                <div className="mt-2">
                  <ColorSelector
                    value={(asset as any).fontColor || '#000000'}
                    onChange={(color) => {
                      onAssetUpdate({ fontColor: color });
                    }}
                    opacity={(asset as any).fontOpacity || 1}
                    onOpacityChange={(opacity) => {
                      onAssetUpdate({ fontOpacity: opacity });
                    }}
                    onBack={() => setShowColorPicker(false)}
                    showOpacitySlider={true}
                    favoriteColors={favoriteColors}
                    onAddFavorite={onAddFavoriteColor}
                    onRemoveFavorite={onRemoveFavoriteColor}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {asset.type === 'sticker' && (
          <div>
            <Label size="sm">Sticker ID</Label>
            <input
              type="text"
              disabled
              value={(asset as any).stickerId || ''}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded bg-gray-50 text-gray-500"
            />
          </div>
        )}

        <Separator />

        {/* Position */}
        <PositionButtons onPositionSelect={onPositionPreset} disabled={false} />

        <Separator />

        {/* Transform properties */}
        <div className="space-y-3">
          <p className="text-sm font-medium text-gray-700">Transform</p>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label size="sm">X</Label>
              <input
                type="number"
                value={assetX}
                onChange={(e) => onAssetUpdate({ x: Number(e.target.value) / canvasWidth })}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded"
              />
            </div>
            <div>
              <Label size="sm">Y</Label>
              <input
                type="number"
                value={assetY}
                onChange={(e) => onAssetUpdate({ y: Number(e.target.value) / canvasHeight })}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label size="sm">Width</Label>
              <input
                type="number"
                value={assetWidth}
                 onChange={(e) => onAssetUpdate({ width: Number(e.target.value) })}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded"
              />
            </div>
            <div>
              <Label size="sm">Height</Label>
              <input
                type="number"
                value={assetHeight}
                 onChange={(e) => onAssetUpdate({ height: Number(e.target.value) })}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded"
              />
            </div>
          </div>

          <div>
            <Label size="sm">Rotation</Label>
            <input
              type="number"
              value={Math.round(asset.rotation)}
              onChange={(e) => onAssetUpdate({ rotation: Number(e.target.value) })}
              min="0"
              max="360"
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded"
            />
          </div>

          <div>
            <Label size="sm">Opacity</Label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={asset.opacity}
              onChange={(e) => onAssetUpdate({ opacity: Number(e.target.value) })}
              className="w-full"
            />
            <p className="text-xs text-gray-500 mt-1">{Math.round(asset.opacity * 100)}%</p>
          </div>
        </div>

        <Separator />

        {/* Layer controls */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">Layers</p>
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => onLayerChange('forward')}
              title="Bring Forward"
            >
              <ArrowUp size={16} />
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => onLayerChange('backward')}
              title="Send Backward"
            >
              <ArrowDown size={16} />
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => onLayerChange('front')}
              title="Bring to Front"
            >
              <ChevronsUp size={16} />
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => onLayerChange('back')}
              title="Send to Back"
            >
              <ChevronsDown size={16} />
            </Button>
          </div>
        </div>

        <Separator />

        {/* Action buttons */}
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="flex-1"
            onClick={onAssetDuplicate}
            title="Duplicate Asset"
          >
            <Copy size={16} className="mr-1" />
            Duplicate
          </Button>
          <Button
            type="button"
            size="sm"
            variant="destructive"
            className="flex-1"
            onClick={onAssetDelete}
            title="Delete Asset"
          >
            <Trash2 size={16} className="mr-1" />
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}
