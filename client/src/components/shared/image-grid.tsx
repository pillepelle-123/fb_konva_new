import { Badge } from '../ui/composites/badge';

export interface ImageGridItem {
  id: string;
  thumbnailUrl: string;
  name: string;
  category: string;
  format: 'vector' | 'pixel';
}

interface ImageGridProps {
  items: ImageGridItem[];
  selectedItemId?: string | null;
  activeItemId?: string | null;
  onItemSelect: (item: ImageGridItem) => void;
  renderItemContent?: (item: ImageGridItem) => React.ReactNode;
  emptyStateMessage?: string;
}

export function ImageGrid({
  items,
  selectedItemId,
  activeItemId,
  onItemSelect,
  renderItemContent,
  emptyStateMessage = 'No items found',
}: ImageGridProps) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-sm text-muted-foreground">{emptyStateMessage}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
      {items.map((item) => {
        const isSelected = selectedItemId === item.id;
        const isActive = activeItemId === item.id;

        return (
          <div
            key={item.id}
            onClick={() => onItemSelect(item)}
            className={`
              relative group cursor-pointer rounded-lg border-2 transition-all overflow-hidden
              ${isSelected ? 'border-primary ring-2 ring-primary ring-offset-2' : 'border-gray-200 hover:border-gray-300'}
              ${isActive ? 'ring-2 ring-blue-500 ring-offset-2' : ''}
            `}
          >
            {/* Thumbnail */}
            <div className="relative aspect-square bg-gray-100 overflow-hidden">
              <img
                src={item.thumbnailUrl}
                alt={item.name}
                className={`
                  w-full h-full transition-transform duration-200 group-hover:scale-105
                  ${item.format === 'vector' ? 'object-contain p-2' : 'object-cover'}
                `}
                onError={(e) => {
                  // Fallback to a placeholder if image fails to load
                  (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect fill="%23e5e7eb" width="100" height="100"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="%239ca3af" font-family="sans-serif" font-size="12">No Image</text></svg>';
                }}
              />
              
              {/* Active Badge */}
              {isActive && (
                <div className="absolute top-2 right-2">
                  <Badge variant="default" className="text-xs">
                    Active
                  </Badge>
                </div>
              )}
            </div>

            {/* Item Info */}
            <div className="p-3 bg-white">
              <h3 className="text-sm font-medium text-gray-900 truncate">{item.name}</h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-gray-500 capitalize">{item.category}</span>
                <span className="text-xs text-gray-400">•</span>
                <span className="text-xs text-gray-500 capitalize">{item.format}</span>
              </div>
            </div>

            {/* Custom Content */}
            {renderItemContent && (
              <div className="p-3 bg-gray-50 border-t">
                {renderItemContent(item)}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}







