import React from 'react';
import { Modal } from '../../../ui/overlays/modal';

type ImageSelectionModalProps = {
  showImageModal: boolean;
  onImageModalClose: () => void;
  token: string;
  onImageSelect: (index: number, imageUrl: unknown) => void;
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
      import('../../images/images-content').then((module) => {
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
        <ImagesContent
          token={token}
          mode="select"
          onImageSelect={onImageSelect}
          onImageUpload={(imageUrl: unknown) => onImageSelect(0, imageUrl)}
          onClose={onImageModalClose}
        />
      )}
    </Modal>
  );
};
