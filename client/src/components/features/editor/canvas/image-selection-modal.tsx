import React from 'react';
import { Modal } from '../../../ui/overlays/modal';

let imageSelectionContentPromise: Promise<any> | null = null;

export function preloadImageSelectionContent() {
  if (!imageSelectionContentPromise) {
    imageSelectionContentPromise = import('../../images/images-content');
  }

  return imageSelectionContentPromise;
}

type ImageSelectionModalProps = {
  showImageModal: boolean;
  onImageModalClose: () => void;
  token: string;
  onImageSelect: (imageId: string, imageUrl: string) => void;
};

export const ImageSelectionModal: React.FC<ImageSelectionModalProps> = ({
  showImageModal,
  onImageModalClose,
  token,
  onImageSelect
}) => {
  const [ImagesContent, setImagesContent] = React.useState<any>(null);

  React.useEffect(() => {
    if (showImageModal && !ImagesContent) {
      preloadImageSelectionContent().then((module) => {
        setImagesContent(() => module.default);
      });
    }
  }, [showImageModal, ImagesContent]);

  return (
    <Modal
      isOpen={showImageModal}
      onClose={onImageModalClose}
      title="Select Image"
    >
      {ImagesContent && (
        <div className="flex-1 min-h-0 overflow-y-auto">
          <ImagesContent
            token={token}
            mode="select"
            onImageSelect={onImageSelect}
            onImageUpload={(imageId: string, imageUrl: string) => onImageSelect(imageId, imageUrl)}
            onClose={onImageModalClose}
          />
        </div>
      )}
      {!ImagesContent && showImageModal && (
        <div className="py-8 text-center text-sm text-muted-foreground">
          Loading images...
        </div>
      )}
    </Modal>
  );
};
