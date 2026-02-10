import React from 'react';
import { Modal } from '../../../ui/overlays/modal';

type StickerSelectionModalProps = {
  showStickerModal: boolean;
  onStickerModalClose: () => void;
  onStickerSelect: (selection: { stickerId: string; textEnabled: boolean; text: string }) => void;
};

export const StickerSelectionModal: React.FC<StickerSelectionModalProps> = ({
  showStickerModal,
  onStickerModalClose,
  onStickerSelect
}) => {
  const [StickerSelectorContent, setStickerSelectorContent] = React.useState<any>(null);

  React.useEffect(() => {
    if (showStickerModal && !StickerSelectorContent) {
      import('../tool-settings/sticker-selector-content').then((module) => {
        setStickerSelectorContent(() => module.StickerSelectorContent);
      });
    }
  }, [showStickerModal, StickerSelectorContent]);

  return (
    <Modal
      isOpen={showStickerModal}
      onClose={onStickerModalClose}
      title="Select Sticker"
    >
      {StickerSelectorContent && (
        <StickerSelectorContent
          onBack={onStickerModalClose}
          onStickerSelect={onStickerSelect}
        />
      )}
    </Modal>
  );
};
