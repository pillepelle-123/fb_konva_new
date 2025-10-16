import { useState, useRef, useCallback } from 'react';
import ReactCrop from 'react-image-crop';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../ui/overlays/dialog';
import { Button } from '../../ui/primitives/button';
import 'react-image-crop/dist/ReactCrop.css';

interface Crop {
  unit: 'px' | '%';
  x: number;
  y: number;
  width: number;
  height: number;
}

interface PixelCrop {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ProfilePictureEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (file192: File, file32: File) => void;
}

export default function ProfilePictureEditor({ isOpen, onClose, onSave }: ProfilePictureEditorProps) {
  const [imgSrc, setImgSrc] = useState('');
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const imgRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onSelectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setCrop(undefined);
      const reader = new FileReader();
      reader.addEventListener('load', () => setImgSrc(reader.result?.toString() || ''));
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    const size = Math.min(width, height) * 0.8;
    setCrop({
      unit: 'px',
      width: size,
      height: size,
      x: (width - size) / 2,
      y: (height - size) / 2,
    });
  }, []);

  const getCroppedImg = (image: HTMLImageElement, crop: PixelCrop, size: number): Promise<File> => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    canvas.width = size;
    canvas.height = size;

    // Calculate scale factors from displayed image to natural image
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    // Scale crop coordinates to natural image size
    const sourceX = crop.x * scaleX;
    const sourceY = crop.y * scaleY;
    const sourceWidth = crop.width * scaleX;
    const sourceHeight = crop.height * scaleY;

    ctx.drawImage(
      image,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      0,
      0,
      size,
      size
    );

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(new File([blob], `profile_${size}.png`, { type: 'image/png' }));
        }
      }, 'image/png');
    });
  };

  const handleSave = async () => {
    if (imgRef.current && completedCrop?.width && completedCrop?.height) {
      const file192 = await getCroppedImg(imgRef.current, completedCrop, 192);
      const file32 = await getCroppedImg(imgRef.current, completedCrop, 32);
      onSave(file192, file32);
      handleClose();
    }
  };

  const handleClose = () => {
    setImgSrc('');
    setCrop(undefined);
    setCompletedCrop(undefined);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Edit Profile Picture</DialogTitle>
          <DialogDescription>
            Drag to reposition and resize the crop area
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 flex flex-col space-y-4 min-h-0">
          {!imgSrc ? (
            <div className="text-center">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={onSelectFile}
                className="hidden"
              />
              <Button onClick={() => fileInputRef.current?.click()}>
                Select Image
              </Button>
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-auto">
                <ReactCrop
                  crop={crop}
                  onChange={(_, percentCrop) => setCrop(percentCrop)}
                  onComplete={(c) => setCompletedCrop(c)}
                  aspect={1}
                >
                  <img
                    ref={imgRef}
                    alt="Crop me"
                    src={imgSrc}
                    onLoad={onImageLoad}
                    className="max-w-full"
                  />
                </ReactCrop>
              </div>
              <div className="flex justify-end space-x-2 flex-shrink-0">
                <Button variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button onClick={handleSave}>
                  Save
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}