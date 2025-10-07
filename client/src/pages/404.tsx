import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/primitives/button';
import { ArrowLeft } from 'lucide-react';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="container mx-auto px-4 py-8">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back</span>
          </Button>

      <div className="max-w-2xl mx-auto space-y-6">

        </div>
      <div className="max-w-2xl mx-auto text-center space-y-6">
        
        <h1 className="text-4xl font-bold tracking-tight text-foreground">404</h1>
        <p className="text-xl text-muted-foreground">Book not found or access denied</p>
      </div>
    </div>
  );
}