import { useAuth } from '../../context/auth-context';
import ImagesContent from '../../components/features/images/images-content';
import FloatingActionButton from '../../components/ui/composites/floating-action-button';

export default function ImagesList() {
  const { token } = useAuth();

  return (
    <div className="container mx-auto px-4 py-4">
      <ImagesContent
        token={token || ''}
        mode="manage"
        showAsContent={true}
      />
      
      <FloatingActionButton />
    </div>
  );
}