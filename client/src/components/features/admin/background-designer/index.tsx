/**
 * Background Image Designer
 * Main component for creating and editing designer background images
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDesignerCanvas } from './hooks/useDesignerCanvas';
import { DesignerCanvas } from './designer-canvas';
import { DesignerToolbar } from './designer-toolbar';
import { DesignerPropertyPanel } from './designer-property-panel';
import { ImageUploadDialog } from './image-upload-dialog';
import { StickerSelectorDialog } from './sticker-selector-dialog';
import { Button } from '../../../ui/primitives/button';
import { ArrowLeft } from 'lucide-react';
import type { CanvasStructure } from '../../../../../../shared/types/background-designer';

interface BackgroundImageDesignerProps {
  designerId?: string;
  onCancel?: () => void;
}

export function BackgroundImageDesigner({ designerId, onCancel }: BackgroundImageDesignerProps) {
  const navigate = useNavigate();
  const params = useParams();

  const id = designerId || params.id;

  // State
  const [initialStructure, setInitialStructure] = useState<CanvasStructure | undefined>();
  const [isLoading, setIsLoading] = useState(!!id);
  const [showImageUpload, setShowImageUpload] = useState(false);
  const [showStickerSelector, setShowStickerSelector] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [title, setTitle] = useState('New Background Design');
  const [designData, setDesignData] = useState<any>(null);

  // Load existing design if ID provided (only for actual IDs, not for 'new')
  useEffect(() => {
    // Don't fetch for 'new' - that's for creating, not loading
    if (!id || id === 'new') {
      setIsLoading(false);
      return;
    }

    (async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(
          `/api/admin/background-images/designer/${id}`,
          {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        setDesignData(data.image);
        setInitialStructure(data.image.canvas.structure);
        setTitle(data.image.name);
      } catch (error) {
        console.error('Failed to load designer image:', error);
        alert('Failed to load design');
      } finally {
        setIsLoading(false);
      }
    })();
  }, [id]);

  // Memoized onSave callback to prevent constant recreation
  const onSaveCallback = useCallback(
    async (structure: CanvasStructure) => {
      try {
        const token = localStorage.getItem('token');

        if (id && id !== 'new' && designData) {
          // Update existing design
          const response = await fetch(
            `/api/admin/background-images/designer/${id}`,
            {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
              },
              body: JSON.stringify({
                canvasStructure: structure,
                name: title,
              }),
            }
          );

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }
        }
        // For 'new' (create) mode, do nothing - auto-save is not enabled for new designs
        // User must manually save/create first
      } catch (error) {
        console.error('Failed to save design:', error);
        throw error;
      }
    },
    [id, designData, title]
  );

  // Designer canvas hook
  const designer = useDesignerCanvas({
    initialStructure,
    // Only enable auto-save for existing designs, not for new ones in creation mode
    onSave: (id && id !== 'new' && designData) ? onSaveCallback : undefined,
  });

  // Handlers
  const handleAddImage = () => {
    setShowImageUpload(true);
  };

  const handleImageUpload = async (file: File) => {
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(
        `/api/admin/background-images/designer/assets/upload`,
        {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      const uploadPath = data.asset.storage.publicUrl;

      // Get image dimensions from file
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        // Aspect ratio preserved, max 300px width
        const maxWidth = 300;
        const ratio = img.height / img.width;
        const height = maxWidth * ratio;

        designer.addImageItem(uploadPath, maxWidth, height);
        URL.revokeObjectURL(url);
      };
      img.src = url;
    } catch (error) {
      console.error('Failed to upload image:', error);
      alert('Failed to upload image');
    }
  };

  const handleAddSticker = () => {
    setShowStickerSelector(true);
  };

  const handleStickerSelect = (stickerId: string) => {
    designer.addStickerItem(stickerId);
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const token = localStorage.getItem('token');

      if (!id) {
        alert('Please save the design first');
        return;
      }

      const response = await fetch(
        `/api/admin/background-images/designer/${id}/generate`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            width: designer.canvasWidth,
            height: designer.canvasHeight,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      alert('Image generated successfully!');
    } catch (error) {
      console.error('Failed to generate image:', error);
      alert('Failed to generate image');
    } finally {
      setIsGenerating(false);
    }
  };

  const selectedItem = designer.getSelectedItem();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onCancel?.() || navigate(-1)}
            className="gap-2"
          >
            <ArrowLeft size={16} />
            Back
          </Button>
          <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
          {designer.isDirty && <span className="text-sm text-amber-600 font-medium">*</span>}
        </div>
      </div>

      {/* Toolbar */}
      <DesignerToolbar
        onAddImage={handleAddImage}
        onAddText={() => designer.addTextItem()}
        onAddSticker={handleAddSticker}
        onSave={() => designer.save()}
        onGenerate={handleGenerate}
        isSaving={designer.isSaving}
        isGenerating={isGenerating}
        isDirty={designer.isDirty}
      />

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Canvas */}
        <DesignerCanvas
          canvasWidth={designer.canvasWidth}
          canvasHeight={designer.canvasHeight}
          canvasStructure={designer.canvasStructure}
          selectedItemId={designer.selectedItemId}
          onItemUpdate={(itemId, updates) => designer.updateItem(itemId, updates)}
          onItemSelect={(itemId) => designer.setSelectedItemId(itemId)}
          onCanvasClick={() => designer.setSelectedItemId(null)}
        />

        {/* Property Panel */}
        <DesignerPropertyPanel
          item={selectedItem || null}
          canvasWidth={designer.canvasWidth}
          canvasHeight={designer.canvasHeight}
          onItemUpdate={(updates) => {
            if (designer.selectedItemId) {
              designer.updateItem(designer.selectedItemId, updates);
            }
          }}
          onItemDelete={() => {
            if (designer.selectedItemId) {
              designer.deleteItem(designer.selectedItemId);
            }
          }}
          onItemDuplicate={() => {
            if (designer.selectedItemId) {
              designer.duplicateItem(designer.selectedItemId);
            }
          }}
          onPositionPreset={(preset) => {
            if (designer.selectedItemId) {
              designer.applyPositionPreset(designer.selectedItemId, preset);
            }
          }}
          onLayerChange={(direction) => {
            if (designer.selectedItemId) {
              designer.changeZIndex(designer.selectedItemId, direction);
            }
          }}
        />
      </div>

      {/* Dialogs */}
      <ImageUploadDialog
        open={showImageUpload}
        onOpenChange={setShowImageUpload}
        onUpload={handleImageUpload}
      />

      <StickerSelectorDialog
        open={showStickerSelector}
        onOpenChange={setShowStickerSelector}
        onStickerSelect={handleStickerSelect}
        stickers={[]} // TODO: Load stickers from library
      />
    </div>
  );
}
