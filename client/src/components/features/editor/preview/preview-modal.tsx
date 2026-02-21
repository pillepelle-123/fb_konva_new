import { Modal } from '../../../ui/overlays/modal';
import { StaticSpreadPreview } from './static-spread-preview';
import { getThemePaletteId } from '../../../../utils/global-themes';
import type { WizardState } from '../../books/create/types';

type PreviewModalProps = {
  isOpen: boolean;
  onClose: () => void;
  wizardState: WizardState;
};

export function PreviewModal({ isOpen, onClose, wizardState }: PreviewModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Live Preview"
      size="xl"
    >
      <div className="w-full flex-1 min-h-0 overflow-auto">
        <div className="w-full h-full min-h-[400px] rounded-lg">
          <StaticSpreadPreview
            pageSize={wizardState.basic.pageSize}
            orientation={wizardState.basic.orientation}
            themeId={wizardState.design.themeId}
            paletteId={wizardState.design.paletteId ?? getThemePaletteId(wizardState.design.themeId) ?? 'default'}
            baseTemplate={wizardState.design.layoutTemplate ?? null}
            pickLeftRight={wizardState.design.pickLeftRight}
            leftTemplate={wizardState.design.leftLayoutTemplate ?? null}
            rightTemplate={wizardState.design.rightLayoutTemplate ?? null}
            mirrorRight={wizardState.design.mirrorLayout && !wizardState.design.pickLeftRight}
            className="h-full"
          />
        </div>
      </div>
    </Modal>
  );
}
