import { useAuth } from '../../context/auth-context';
import ImagesContent from '../../components/features/images/images-content';

export default function ImagesList() {
  const { token } = useAuth();

  return (
    <div className="container mx-auto">
      <ImagesContent
        token={token || ''}
        mode="manage"
        showAsContent={true}
      />
    </div>
  );
}