import { useAuth } from '../../context/auth-context';
import PhotosContent from '../../components/features/photos/photos-content';
import FloatingActionButton from '../../components/ui/composites/floating-action-button';

export default function PhotosList() {
  const { token } = useAuth();

  return (
    <div className="container mx-auto px-4 py-8">
      <PhotosContent
        token={token || ''}
        mode="manage"
        showAsContent={true}
      />
      
      <FloatingActionButton />
    </div>
  );
}