import { useEditor } from '../../../context/editor-context';
import { Modal } from '../../ui/overlays/modal';
import { BookExportManager } from '../books/book-export-manager';

interface BookExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function BookExportModal({ isOpen, onClose }: BookExportModalProps) {
  const { state } = useEditor();

  if (!isOpen || !state.currentBook) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      closeOnBackdrop={true}
      title="PDF Exports"
      size="lg"
    >
      <div className="overflow-y-auto flex-1 pr-2">
        <BookExportManager
          bookId={state.currentBook.id}
          bookName={state.currentBook.name}
          maxPages={state.currentBook.pages.length}
          userRole={state.userRole}
          userAdminRole={state.user?.role || null}
          showHeader={false}
          currentPageIndex={state.activePageIndex}
          book={state.currentBook}
        />
      </div>
    </Modal>
  );
}

