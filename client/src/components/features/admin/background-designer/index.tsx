/**
 * Background Image Designer
 * Main component for creating and editing designer background images
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDesignerCanvas } from './hooks/useDesignerCanvas';
import { DesignerCanvas } from './designer-canvas';
import { DesignerHeader } from './designer-header';
import { DesignerPropertyPanel } from './designer-property-panel';
import { DesignerImageAssetModal, type DesignerImageAsset } from './designer-image-asset-modal';
import { StickerSelectorDialog } from './sticker-selector-dialog';
import AlertDialog from '../../../ui/overlays/alert-dialog';
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
  const [propertyPanelMode, setPropertyPanelMode] = useState<'canvas' | 'asset'>('canvas');
  const [title, setTitle] = useState('New Background Design');
  const [designData, setDesignData] = useState<any>(null);
  const [designerCategoryId, setDesignerCategoryId] = useState<number | null>(null);
  const [alertState, setAlertState] = useState<{
    open: boolean;
    title: string;
    message: string;
  }>({
    open: false,
    title: '',
    message: '',
  });

  const showAlert = useCallback((title: string, message: string) => {
    setAlertState({
      open: true,
      title,
      message,
    });
  }, []);

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
        showAlert('Error', 'Failed to load design');
      } finally {
        setIsLoading(false);
      }
    })();
  }, [id, showAlert]);

  // Save callback used by explicit Save action
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
        // For 'new' mode, Save triggers create flow via handleSave/handleCreateDesign.
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
    // Save callback is invoked only when user clicks Save.
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
      showAlert('Success', 'Design saved. You can now upload image assets.');
    } catch (error) {
      console.error('Failed to create design:', error);
      showAlert('Error', 'Failed to save design');
    } finally {
      setIsCreating(false);
    }
  }, [designer.canvasStructure, navigate, resolveDesignerCategoryId, showAlert, title]);

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
        showAlert('Save Required', 'Please save the design first');
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

      await response.json();
      
      // Reload background image registry to reflect new/updated image
      await loadBackgroundImageRegistry(true);
      
      showAlert('Success', 'Image generated successfully!');
    } catch (error) {
      console.error('Failed to generate image:', error);
      showAlert('Error', 'Failed to generate image');
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
      <DesignerHeader
        title={title}
        onBack={() => onCancel?.() || navigate(-1)}
        onAddImage={handleAddImage}
        onAddText={() => designer.addTextAsset()}
        onAddSticker={handleAddSticker}
        onOpenCanvasSettings={() => {
          setPropertyPanelMode('canvas');
          designer.setSelectedAssetId(null);
        }}
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
          onAssetDuplicate={() => {
            if (designer.selectedAssetId) {
              designer.duplicateAsset(designer.selectedAssetId);
            }
          }}
          onAssetDelete={() => {
            if (designer.selectedAssetId) {
              designer.deleteAsset(designer.selectedAssetId);
            }
          }}
          onLayerChange={(direction) => {
            if (designer.selectedAssetId) {
              designer.changeZIndex(designer.selectedAssetId, direction);
            }
          }}
          onAssetSelect={(assetId) => {
            designer.setSelectedAssetId(assetId);
            if (assetId) {
              setPropertyPanelMode('asset');
            }
          }}
          onCanvasClick={() => designer.setSelectedAssetId(null)}
        />

        {/* Property Panel */}
        <DesignerPropertyPanel
          mode={propertyPanelMode}
          asset={selectedAsset || null}
          canvasWidth={designer.canvasWidth}
          canvasHeight={designer.canvasHeight}
          backgroundColor={designer.canvasStructure.backgroundColor}
          transparentBackground={Boolean(designer.canvasStructure.transparentBackground)}
          onBackgroundColorChange={(color) =>
            designer.updateCanvasBackground({
              backgroundColor: color,
            })
          }
          onToggleTransparentBackground={(enabled) =>
            designer.updateCanvasBackground({
              transparentBackground: enabled,
            })
          }
          onAssetUpdate={(updates) => {
            if (designer.selectedAssetId) {
              designer.updateAsset(designer.selectedAssetId, updates);
            }
          }}
          onPositionPreset={(preset) => {
            if (designer.selectedAssetId) {
              designer.applyPositionPreset(designer.selectedAssetId, preset);
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

      <AlertDialog
        open={alertState.open}
        onOpenChange={(open) => setAlertState((prev) => ({ ...prev, open }))}
        title={alertState.title}
        message={alertState.message}
        onClose={() => setAlertState((prev) => ({ ...prev, open: false }))}
      />
    </div>
  );
}
