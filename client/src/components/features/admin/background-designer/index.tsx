/**
 * Background Image Designer
 * Main component for creating and editing designer background images
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDesignerCanvas } from './hooks/useDesignerCanvas';
import { DesignerCanvas } from './designer-canvas';
import { DesignerToolbar } from './designer-toolbar';
import { DesignerPropertyPanel } from './designer-property-panel';
import { DesignerImageAssetModal, type DesignerImageAsset } from './designer-image-asset-modal';
import { StickerSelectorDialog } from './sticker-selector-dialog';
import { Button } from '../../../ui/primitives/button';
import { ArrowLeft } from 'lucide-react';
import type { CanvasStructure } from '../../../../../../shared/types/background-designer';
import { loadBackgroundImageRegistry } from '../../../../data/templates/background-images';

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
  const [showImageAssetModal, setShowImageAssetModal] = useState(false);
  const [showStickerSelector, setShowStickerSelector] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [title, setTitle] = useState('New Background Design');
  const [designData, setDesignData] = useState<any>(null);
  const [designerCategoryId, setDesignerCategoryId] = useState<number | null>(null);

  const resolveDesignerCategoryId = useCallback(async () => {
    if (designerCategoryId) {
      return designerCategoryId;
    }

    const token = localStorage.getItem('token');
    const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};

    const categoriesResponse = await fetch('/api/admin/background-images/categories', { headers });
    if (!categoriesResponse.ok) {
      throw new Error(`Failed to load categories (${categoriesResponse.status})`);
    }

    const categoriesData = await categoriesResponse.json();
    const firstCategoryId = Number(categoriesData?.items?.[0]?.id);
    if (Number.isFinite(firstCategoryId) && firstCategoryId > 0) {
      setDesignerCategoryId(firstCategoryId);
      return firstCategoryId;
    }

    const createCategoryResponse = await fetch('/api/admin/background-images/categories', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ name: 'Designer' }),
    });

    if (!createCategoryResponse.ok) {
      throw new Error(`Failed to create category (${createCategoryResponse.status})`);
    }

    const createCategoryData = await createCategoryResponse.json();
    const createdCategoryId = Number(createCategoryData?.category?.id);
    if (!Number.isFinite(createdCategoryId) || createdCategoryId <= 0) {
      throw new Error('Invalid category id returned by server');
    }

    setDesignerCategoryId(createdCategoryId);
    return createdCategoryId;
  }, [designerCategoryId]);

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

  const handleCreateDesign = useCallback(async () => {
    try {
      setIsCreating(true);

      const token = localStorage.getItem('token');
      const categoryId = await resolveDesignerCategoryId();
      const slugTitle = title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'designer-background';
      const uniqueSlug = `${slugTitle}-${Date.now()}`;

      const response = await fetch('/api/admin/background-images/designer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          name: title,
          slug: uniqueSlug,
          categoryId,
          canvasStructure: designer.canvasStructure,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      setDesignData(data.image);
      setTitle(data.image?.name || title);
      navigate(`/admin/background-images/designer/${data.image.id}`, { replace: true });
      alert('Design saved. You can now upload image assets.');
    } catch (error) {
      console.error('Failed to create design:', error);
      alert('Failed to save design');
    } finally {
      setIsCreating(false);
    }
  }, [designer.canvasStructure, navigate, resolveDesignerCategoryId, title]);

  const handleSave = useCallback(async () => {
    if (!id || id === 'new') {
      await handleCreateDesign();
      return;
    }

    await designer.save();
  }, [designer, handleCreateDesign, id]);

  // Handlers
  const handleAddImage = () => {
    setShowImageAssetModal(true);
  };

  const handleImageAssetSelect = (asset: DesignerImageAsset) => {
    const maxWidth = 300;
    const ratio = asset.width && asset.height ? asset.height / asset.width : 1;
    const height = Math.max(120, maxWidth * ratio);
    designer.addImageAsset(asset.storage.publicUrl, maxWidth, height, asset.id);
  };

  const handleAddSticker = () => {
    setShowStickerSelector(true);
  };

  const handleStickerSelect = (stickerId: string) => {
    designer.addStickerAsset(stickerId);
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const token = localStorage.getItem('token');

      if (!id || id === 'new') {
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

      const data = await response.json();
      
      // Reload background image registry to reflect new/updated image
      await loadBackgroundImageRegistry(true);
      
      alert('Image generated successfully!');
    } catch (error) {
      console.error('Failed to generate image:', error);
      alert('Failed to generate image');
    } finally {
      setIsGenerating(false);
    }
  };

  const selectedAsset = designer.getSelectedAsset();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-0">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden bg-gray-100">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white px-3 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="xs"
            onClick={() => onCancel?.() || navigate(-1)}
            className="gap-1.5"
          >
            <ArrowLeft size={14} />
            Back
          </Button>
          <h1 className="text-lg font-semibold text-gray-900 leading-none">{title}</h1>
          {designer.isDirty && <span className="text-xs text-amber-600 font-medium leading-none">*</span>}
        </div>
      </div>

      {/* Toolbar */}
      <DesignerToolbar
        onAddImage={handleAddImage}
        onAddText={() => designer.addTextAsset()}
        onAddSticker={handleAddSticker}
        onSave={handleSave}
        onGenerate={handleGenerate}
        isSaving={designer.isSaving || isCreating}
        isGenerating={isGenerating}
        isDirty={designer.isDirty}
      />

      {/* Main content */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        {/* Canvas */}
        <DesignerCanvas
          canvasWidth={designer.canvasWidth}
          canvasHeight={designer.canvasHeight}
          canvasStructure={designer.canvasStructure}
          selectedAssetId={designer.selectedAssetId}
          onAssetUpdate={(assetId, updates) => designer.updateAsset(assetId, updates)}
          onAssetSelect={(assetId) => designer.setSelectedAssetId(assetId)}
          onCanvasClick={() => designer.setSelectedAssetId(null)}
        />

        {/* Property Panel */}
        <DesignerPropertyPanel
          asset={selectedAsset || null}
          canvasWidth={designer.canvasWidth}
          canvasHeight={designer.canvasHeight}
          onAssetUpdate={(updates) => {
            if (designer.selectedAssetId) {
              designer.updateAsset(designer.selectedAssetId, updates);
            }
          }}
          onAssetDelete={() => {
            if (designer.selectedAssetId) {
              designer.deleteAsset(designer.selectedAssetId);
            }
          }}
          onAssetDuplicate={() => {
            if (designer.selectedAssetId) {
              designer.duplicateAsset(designer.selectedAssetId);
            }
          }}
          onPositionPreset={(preset) => {
            if (designer.selectedAssetId) {
              designer.applyPositionPreset(designer.selectedAssetId, preset);
            }
          }}
          onLayerChange={(direction) => {
            if (designer.selectedAssetId) {
              designer.changeZIndex(designer.selectedAssetId, direction);
            }
          }}
        />
      </div>

      {/* Dialogs */}
      <DesignerImageAssetModal
        open={showImageAssetModal}
        onClose={() => setShowImageAssetModal(false)}
        canUpload={Boolean(id && id !== 'new')}
        onSelectAsset={handleImageAssetSelect}
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
