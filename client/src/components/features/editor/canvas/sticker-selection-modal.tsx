import React from 'react';
import { Modal } from '../../../ui/overlays/modal';

type StickerSelectionModalProps = {
  showStickerModal: boolean;
  onStickerModalClose: () => void;
  onStickerSelect: (sticker: any) => void;
};

export const StickerSelectionModal: React.FC<StickerSelectionModalProps> = ({
  showStickerModal,
  onStickerModalClose,
  onStickerSelect
}) => {
  const [StickerSelector, setStickerSelector] = React.useState<any>(null);

  React.useEffect(() => {
    if (showStickerModal && !StickerSelector) {
      import('../tool-settings/sticker-selector').then((module) => {
        setStickerSelector(() => module.StickerSelector);
      });
    }
  }, [showStickerModal, StickerSelector]);

  return (
    <Modal
      isOpen={showStickerModal}
      onClose={onStickerModalClose}
      title="Select Sticker"
    >
      {StickerSelector && (
        <StickerSelector
          onBack={onStickerModalClose}
          onStickerSelect={onStickerSelect}
        />
      )}
    </Modal>
  );
};
