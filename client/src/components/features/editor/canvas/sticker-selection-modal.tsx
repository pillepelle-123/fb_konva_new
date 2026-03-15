import React from 'react';
import { Modal } from '../../../ui/overlays/modal';

let stickerSelectorContentPromise: Promise<any> | null = null;

export function preloadStickerSelectorContent() {
  if (!stickerSelectorContentPromise) {
    stickerSelectorContentPromise = import('../tool-settings/sticker-selector-content');
  }

  return stickerSelectorContentPromise;
}

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
      preloadStickerSelectorContent().then((module) => {
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
      {!StickerSelectorContent && showStickerModal && (
        <div className="py-8 text-center text-sm text-muted-foreground">
          Loading stickers...
        </div>
      )}
    </Modal>
  );
};
