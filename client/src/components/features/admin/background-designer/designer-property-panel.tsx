/**
 * Designer Property Panel
 * Right panel for editing selected item properties
 */

import { useState } from 'react';
import { Separator } from '../../../ui/primitives/separator';
import { ColorSelector } from '../../../features/editor/tool-settings/color-selector';
import { PositionButtons } from './position-buttons';
import type {
  DesignerItem as DesignerAsset,
  DesignerItemPosition as DesignerAssetPosition,
} from '../../../../../../shared/types/background-designer';

interface DesignerPropertyPanelProps {
  mode: 'canvas' | 'asset';
  asset: DesignerAsset | null;
  canvasWidth: number;
  canvasHeight: number;
  onAssetUpdate: (updates: Partial<DesignerAsset>) => void;
  onPositionPreset: (position: DesignerAssetPosition) => void;
  backgroundColor: string;
  transparentBackground: boolean;
  onBackgroundColorChange: (color: string) => void;
  onToggleTransparentBackground: (enabled: boolean) => void;
  favoriteColors?: string[];
  onAddFavoriteColor?: (color: string) => void;
  onRemoveFavoriteColor?: (color: string) => void;
}

export function DesignerPropertyPanel({
  mode,
  asset,
  canvasWidth,
  canvasHeight,
  onAssetUpdate,
  onPositionPreset,
  backgroundColor,
  transparentBackground,
  onBackgroundColorChange,
  onToggleTransparentBackground,
  favoriteColors,
  onAddFavoriteColor,
  onRemoveFavoriteColor,
}: DesignerPropertyPanelProps) {
  const [showColorPicker, setShowColorPicker] = useState(false);

  const assetX = asset ? Math.round(asset.x * canvasWidth) : 0;
  const assetY = asset ? Math.round(asset.y * canvasHeight) : 0;
  const assetWidth = asset ? Math.round(asset.width) : 0;
  const assetHeight = asset ? Math.round(asset.height) : 0;

  return (
    <div className="w-80 border-l border-gray-200 bg-white overflow-y-auto max-h-full">
      <div className="p-4 space-y-4">
        {mode === 'canvas' ? (
          <div className="space-y-2">
            <p className="text-sm font-semibold text-gray-900">Canvas Settings</p>
            <div className="flex items-center gap-2">
              <input
                id="designer-transparent-background-panel"
                type="checkbox"
                checked={transparentBackground}
                onChange={(event) => onToggleTransparentBackground(event.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <label htmlFor="designer-transparent-background-panel" className="text-sm text-gray-700">
                Transparent background
              </label>
            </div>

            {!transparentBackground && (
              <div className="rounded-md border border-gray-200 bg-gray-50 p-2">
                <ColorSelector
                  value={backgroundColor}
                  onChange={onBackgroundColorChange}
                  showOpacitySlider={false}
                  favoriteColors={favoriteColors ?? []}
                  onAddFavorite={onAddFavoriteColor ?? (() => {})}
                  onRemoveFavorite={onRemoveFavoriteColor ?? (() => {})}
                />
              </div>
            )}
          </div>
        ) : !asset ? (
          <div className="py-6 text-center">
            <p className="text-sm text-gray-500">Select an asset to edit its properties</p>
          </div>
        ) : (
          <>
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
              <label className="mb-1 block text-sm font-medium">Text</label>
              <input
                type="text"
                value={(asset as any).text || ''}
                onChange={(e) => onAssetUpdate({ text: e.target.value })}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-sm font-medium">Font Family</label>
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
                <label className="mb-1 block text-sm font-medium">Font Size</label>
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
              <label className="mb-1 block text-sm font-medium">Color</label>
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
                    favoriteColors={favoriteColors ?? []}
                    onAddFavorite={onAddFavoriteColor ?? (() => {})}
                    onRemoveFavorite={onRemoveFavoriteColor ?? (() => {})}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {asset.type === 'sticker' && (
          <div>
            <label className="mb-1 block text-sm font-medium">Sticker ID</label>
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
              <label className="mb-1 block text-sm font-medium">X</label>
              <input
                type="number"
                value={assetX}
                onChange={(e) => onAssetUpdate({ x: Number(e.target.value) / canvasWidth })}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Y</label>
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
              <label className="mb-1 block text-sm font-medium">Width</label>
              <input
                type="number"
                value={assetWidth}
                 onChange={(e) => onAssetUpdate({ width: Number(e.target.value) })}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Height</label>
              <input
                type="number"
                value={assetHeight}
                 onChange={(e) => onAssetUpdate({ height: Number(e.target.value) })}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Rotation</label>
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
            <label className="mb-1 block text-sm font-medium">Opacity</label>
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
          </>
        )}
      </div>
    </div>
  );
}
