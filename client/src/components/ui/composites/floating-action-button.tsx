import { useState } from 'react';
import { Button } from '../primitives/button';
import { BookPlus } from 'lucide-react';
import CreationWizard from '../../features/books/creation/creation-wizard';
import { Tooltip } from './tooltip';

export default function FloatingActionButton() {
  const [createBookOpen, setCreateBookOpen] = useState(false);

  return (
    <>
      <Tooltip content="Create a Book" side="floating_button_fixed">
        <Button
          variant="highlight"
          size="icon"
          onClick={() => setCreateBookOpen(true)}
          className="fixed bottom-6 right-6 h-16 w-16 rounded-full shadow-lg hover:shadow-xl transition-shadow z-50"
        >
          <BookPlus className="h-10 w-10" />
        </Button>
      </Tooltip>
      
      <CreationWizard
        open={createBookOpen} 
        onOpenChange={setCreateBookOpen}
        onSuccess={() => {}} 
      />
    </>
  );
}