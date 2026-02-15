import { Button } from '../primitives/button';
import { BookPlus } from 'lucide-react';
import { Tooltip } from './tooltip';
import { useNavigate } from 'react-router-dom';

export default function FloatingActionButton() {
  const navigate = useNavigate();

  return (
    <Tooltip content="Create a Book" side="floating_button_fixed">
      <Button
        variant="highlight"
        size="icon"
        onClick={() => navigate('/books/create')}
        className="fixed bottom-6 right-6 h-16 w-16 rounded-full shadow-lg hover:shadow-xl transition-shadow z-50 hidden sm:inline-flex"
      >
        <BookPlus className="h-10 w-10" />
      </Button>
    </Tooltip>
  );
}