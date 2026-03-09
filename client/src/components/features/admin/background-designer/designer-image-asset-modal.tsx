import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { Modal } from '../../../ui/overlays/modal';
import { Button } from '../../../ui/primitives/button';
import { Search, Upload, Image as ImageIcon } from 'lucide-react';

export interface DesignerImageAsset {
  id: string;
  fileName: string;
  mimeType: string;
  width: number | null;
  height: number | null;
  storage: {
    filePath: string;
    thumbnailPath: string;
    publicUrl: string;
    thumbnailUrl: string;
  };
  createdAt: string;
}

interface DesignerImageAssetModalProps {
  open: boolean;
  onClose: () => void;
  canUpload: boolean;
  onSelectAsset: (asset: DesignerImageAsset) => void;
}

export function DesignerImageAssetModal({ open, onClose, canUpload, onSelectAsset }: DesignerImageAssetModalProps) {
  const [assets, setAssets] = useState<DesignerImageAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const fetchAssets = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const query = new URLSearchParams({ page: '1', pageSize: '200' });
      if (search.trim()) {
        query.set('search', search.trim());
      }

      const response = await fetch(`/api/admin/background-images/designer/assets?${query.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      setAssets(Array.isArray(data.items) ? data.items : []);
    } catch (fetchError) {
      console.error('Failed to load designer assets:', fetchError);
      setError('Failed to load image assets.');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    if (!open) {
      return;
    }
    fetchAssets();
  }, [open, fetchAssets]);

  const sortedAssets = useMemo(() => {
    return [...assets].sort((a, b) => {
      const tsA = new Date(a.createdAt).getTime();
      const tsB = new Date(b.createdAt).getTime();
      return tsB - tsA;
    });
  }, [assets]);

  const handleUpload = async (file: File) => {
    if (!canUpload) {
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/admin/background-images/designer/assets/upload', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body?.error || `HTTP ${response.status}`);
      }

      await fetchAssets();
    } catch (uploadError) {
      console.error('Failed to upload designer asset:', uploadError);
      setError(uploadError instanceof Error ? uploadError.message : 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const handleFileInputChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    await handleUpload(file);
    event.currentTarget.value = '';
  };

  return (
    <Modal isOpen={open} onClose={onClose} title="Select Image Asset" size="lg">
      <div className="flex flex-col gap-4 h-full">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2 rounded-md border bg-white px-3 py-2">
            <Search size={16} className="text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search image assets"
              className="w-64 max-w-full border-0 bg-transparent text-sm outline-none"
            />
            <Button type="button" size="sm" variant="outline" onClick={fetchAssets}>
              Refresh
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/svg+xml"
              className="hidden"
              onChange={handleFileInputChange}
            />
            <Button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={!canUpload || uploading}
              className="gap-2"
            >
              <Upload size={16} />
              {uploading ? 'Uploading...' : 'Upload Asset'}
            </Button>
          </div>
        </div>

        {!canUpload && (
          <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Save the design first before uploading new image assets.
          </div>
        )}

        {error && (
          <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex-1 min-h-0 overflow-y-auto rounded-md border bg-white p-3">
          {loading ? (
            <div className="flex h-full items-center justify-center text-sm text-gray-500">Loading assets...</div>
          ) : sortedAssets.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-sm text-gray-500">
              <ImageIcon size={28} />
              <p>No image assets found.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-5">
              {sortedAssets.map((asset) => (
                <button
                  key={asset.id}
                  type="button"
                  className="rounded-md border border-gray-200 bg-white p-2 text-left transition hover:border-gray-400"
                  onClick={() => {
                    onSelectAsset(asset);
                    onClose();
                  }}
                >
                  <div className="mb-2 flex h-32 items-center justify-center overflow-hidden rounded bg-gray-100">
                    <img
                      src={asset.storage.thumbnailUrl}
                      alt={asset.fileName}
                      className="h-full w-full object-contain"
                    />
                  </div>
                  <p className="line-clamp-2 text-xs font-medium text-gray-800">{asset.fileName}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
