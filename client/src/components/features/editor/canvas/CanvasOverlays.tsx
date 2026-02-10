import React from 'react';
import ContextMenu from '../../../ui/overlays/context-menu';
import { QuestionSelectorModal } from '../question-selector-modal';
import { Alert } from '../../../ui/composites/alert';
import { Tooltip } from '../../../ui/composites/tooltip';
import { QrCodeModal } from '../qr-code/qr-code-modal';
import { ImageSelectionModal } from './image-selection-modal';
import { StickerSelectionModal } from './sticker-selection-modal';

interface CanvasOverlaysProps {
  // Context Menu props
  contextMenu: { x: number; y: number; visible: boolean };
  onDuplicate: () => void;
  onDelete: () => void;
  onCopy: () => void;
  onPaste: () => void | undefined;
  onMoveToFront: () => void;
  onMoveToBack: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onGroup: () => void;
  onUngroup: () => void;
  hasSelection: boolean;
  hasClipboard: boolean;
  canGroup: boolean;
  canUngroup: boolean;
  canCopy?: boolean;
  canDuplicate?: boolean;
  canDelete?: boolean;

  // Image Modal props
  showImageModal: boolean;
  onImageModalClose: () => void;
  token: string;
  onImageSelect: (index: number, imageUrl: unknown) => void;

  // Sticker Modal props
  showStickerModal: boolean;
  onStickerModalClose: () => void;
  onStickerSelect: (sticker: any) => void;

  // Question Dialog props
  showQuestionDialog: boolean;
  onQuestionDialogClose: () => void;
  onQuestionSelect: (questionId: string, questionText: string, questionPosition?: number) => void;
  selectedQuestionElementId: string | null;
  canManageQuestions: boolean;

  // Question Selector Modal props (second modal for question selection)
  showQuestionSelectorModal: boolean;
  onQuestionSelectorModalClose: () => void;
  questionSelectorElementId: string | null;

  // QR Code Modal props
  showQrCodeModal: boolean;
  onQrCodeModalClose: () => void;
  onQrCodeCreate: (value: string) => void;

  // Alert props
  alertMessage: string | null;
  alertPosition: { x: number; y: number } | null;

  // Tooltip props
  inactivePageTooltip: { x: number; y: number } | null;
  outsidePageTooltip: { x: number; y: number } | null;
  imageQualityTooltip: { x: number; y: number; text: string } | null;
}

export const CanvasOverlays: React.FC<CanvasOverlaysProps> = ({
  // Context Menu
  contextMenu,
  onDuplicate,
  onDelete,
  onCopy,
  onPaste,
  onMoveToFront,
  onMoveToBack,
  onMoveUp,
  onMoveDown,
  onGroup,
  onUngroup,
  hasSelection,
  hasClipboard,
  canGroup,
  canUngroup,
  canCopy,
  canDuplicate,
  canDelete,

  // Image Modal
  showImageModal,
  onImageModalClose,
  token,
  onImageSelect,

  // Sticker Modal
  showStickerModal,
  onStickerModalClose,
  onStickerSelect,

  // Question Dialog
  showQuestionDialog,
  onQuestionDialogClose,
  onQuestionSelect,
  selectedQuestionElementId,
  canManageQuestions,

  // Question Selector Modal
  showQuestionSelectorModal,
  onQuestionSelectorModalClose,
  questionSelectorElementId,

  // QR Code Modal
  showQrCodeModal,
  onQrCodeModalClose,
  onQrCodeCreate,

  // Alert
  alertMessage,
  alertPosition,

  // Tooltips
  inactivePageTooltip,
  outsidePageTooltip,
  imageQualityTooltip
}) => {
  return (
    <>
      {/* Context Menu */}
      <ContextMenu
        x={contextMenu.x}
        y={contextMenu.y}
        visible={contextMenu.visible}
        onDuplicate={onDuplicate}
        onDelete={onDelete}
        onCopy={onCopy}
        onPaste={onPaste}
        onMoveToFront={onMoveToFront}
        onMoveToBack={onMoveToBack}
        onMoveUp={onMoveUp}
        onMoveDown={onMoveDown}
        onGroup={onGroup}
        onUngroup={onUngroup}
        hasSelection={hasSelection}
        hasClipboard={hasClipboard}
        canGroup={canGroup}
        canUngroup={canUngroup}
        canCopy={canCopy}
        canDuplicate={canDuplicate}
        canDelete={canDelete}
      />

      <ImageSelectionModal
        showImageModal={showImageModal}
        onImageModalClose={onImageModalClose}
        token={token}
        onImageSelect={onImageSelect}
      />

      <StickerSelectionModal
        showStickerModal={showStickerModal}
        onStickerModalClose={onStickerModalClose}
        onStickerSelect={onStickerSelect}
      />

      {/* Question Selector Dialog */}
      {showQuestionDialog && selectedQuestionElementId && canManageQuestions && (
        <QuestionSelectorModal
          isOpen={showQuestionDialog}
          onClose={onQuestionDialogClose}
          onQuestionSelect={onQuestionSelect}
          elementId={selectedQuestionElementId}
        />
      )}

      {/* Question Selector Modal (second instance) */}
      {showQuestionSelectorModal && questionSelectorElementId && canManageQuestions && (
        <QuestionSelectorModal
          isOpen={showQuestionSelectorModal}
          onClose={onQuestionSelectorModalClose}
          onQuestionSelect={onQuestionSelect}
          elementId={questionSelectorElementId}
        />
      )}

      {/* QR Code Modal */}
      <QrCodeModal
        isOpen={showQrCodeModal}
        onClose={onQrCodeModalClose}
        onCreate={onQrCodeCreate}
      />

      {/* Alert */}
      {alertMessage && alertPosition && (
        <div
          style={{
            position: 'fixed',
            left: alertPosition.x,
            top: alertPosition.y,
            zIndex: 1000,
            pointerEvents: 'none'
          }}
        >
          <Alert>{alertMessage}</Alert>
        </div>
      )}

      {/* Tooltip for inactive page */}
      {inactivePageTooltip && (
        <Tooltip
          side="top"
          content="Click to enter this page."
          forceVisible
          screenPosition={inactivePageTooltip}
        >
          <div />
        </Tooltip>
      )}

      {/* Tooltip for outside page placement */}
      {outsidePageTooltip && (
        <Tooltip
          side="top"
          content="Elements cannot be placed outside the active page."
          forceVisible
          screenPosition={outsidePageTooltip}
        >
          <div />
        </Tooltip>
      )}

      {/* Tooltip for image print quality */}
      {imageQualityTooltip && (
        <Tooltip
          side="right"
          content={imageQualityTooltip.text}
          forceVisible
          screenPosition={imageQualityTooltip}
          backgroundColor="#ffffff"
          textColor="#111827"
        >
          <div />
        </Tooltip>
      )}
    </>
  );
};
