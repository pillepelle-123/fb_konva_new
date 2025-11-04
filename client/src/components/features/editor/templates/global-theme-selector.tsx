import { Paintbrush2, Eye } from 'lucide-react';
import { getGlobalTheme, GLOBAL_THEMES } from '../../../../utils/global-themes';

interface GlobalThemeSelectorProps {
  currentTheme?: string;
  selectedTheme?: string; // For template-selector/template-wrapper compatibility
  onThemeSelect: (themeId: string) => void;
  onPreviewClick?: (themeId: string) => void; // Optional - for preview functionality
  onBack?: () => void; // Optional - kept for backwards compatibility but not used in UI
  title?: string; // Optional for template-selector/template-wrapper
  previewPosition?: 'top' | 'bottom' | 'right'; // 'bottom' = Preview below list (default), 'top' = Preview above list, 'right' = Preview to the right
}

export function GlobalThemeSelector({ 
  currentTheme, 
  selectedTheme, 
  onThemeSelect,
  onPreviewClick,
  title,
  previewPosition = 'bottom'
}: GlobalThemeSelectorProps) {
  // Use selectedTheme if provided (template-selector), otherwise use currentTheme (general-settings)
  const activeTheme = selectedTheme || currentTheme || 'default';
  const themes = GLOBAL_THEMES.map(theme => theme.id);

  const previewSection = (
    <div className={`p-4 ${previewPosition === 'right' ? 'w-1/2' : 'border-t border-gray-200 shrink-0'}`}>
      <h3 className="text-sm font-medium mb-3">Preview</h3>
      {activeTheme ? (
        <div className="bg-white border rounded-lg p-4">
          <div className="text-sm font-medium mb-2">
            {getGlobalTheme(activeTheme)?.name || activeTheme}
          </div>
          {getGlobalTheme(activeTheme)?.description && (
            <div className="text-xs text-gray-600 mb-3">
              {getGlobalTheme(activeTheme)?.description}
            </div>
          )}
          <div className="aspect-[210/297] bg-gray-50 border rounded p-4 flex flex-col gap-2">
            {/* Example textbox */}
            <div className={`w-full h-10 rounded flex items-center px-2 ${
              activeTheme === 'sketchy' ? 'bg-orange-100 border-2 border-orange-300' :
              activeTheme === 'minimal' ? 'bg-gray-100 border border-gray-300' :
              activeTheme === 'colorful' ? 'bg-gradient-to-r from-pink-100 to-blue-100 border border-pink-300' :
              'bg-white border border-gray-300'
            }`}>
              <span className={`text-xs ${
                activeTheme === 'sketchy' ? 'text-orange-800 font-bold' :
                activeTheme === 'minimal' ? 'text-gray-700' :
                activeTheme === 'colorful' ? 'text-purple-700 font-semibold' :
                'text-gray-700'
              }`}>
                Example Textbox
              </span>
            </div>
            {/* Example shape */}
            <div className={`w-16 h-12 rounded flex items-center justify-center ${
              activeTheme === 'sketchy' ? 'bg-yellow-100 border-2 border-yellow-400' :
              activeTheme === 'minimal' ? 'bg-gray-50 border border-gray-200' :
              activeTheme === 'colorful' ? 'bg-gradient-to-r from-green-100 to-purple-100 border border-green-300' :
              'bg-gray-50 border border-gray-200'
            }`}>
              <span className="text-xs text-gray-600">Shape</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-gray-500 text-sm">Select a theme to see preview</div>
      )}
    </div>
  );

  const listSection = (
    <div className={`p-2 flex-1 min-h-0 flex flex-col ${previewPosition === 'right' ? 'w-1/2 border-r border-gray-200' : ''}`}>
      <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
        <Paintbrush2 className="h-4 w-4" />
        {title || 'Themes'}
      </h3>
      <div className="space-y-2 flex-1 overflow-y-auto">
        {themes.map((themeId) => {
          const theme = getGlobalTheme(themeId);
          if (!theme) return null;
          
          return (
            <div
              key={themeId}
              className={`w-full p-3 border rounded-lg transition-colors flex items-center justify-between gap-2 ${
                activeTheme === themeId
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <button
                onClick={() => onThemeSelect(themeId)}
                className="flex-1 text-left"
              >
                <div className="font-medium text-sm">{theme.name}</div>
                <div className="text-xs text-gray-600 mt-1">
                  {theme.description || 'Theme styling'}
                </div>
              </button>
              {onPreviewClick && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onPreviewClick(themeId);
                  }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  className="p-1.5 rounded hover:bg-gray-200 transition-colors flex-shrink-0"
                  title="Preview"
                >
                  <Eye className="h-4 w-4 text-gray-600" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  if (previewPosition === 'right') {
    return (
      <div className="flex flex-row h-full">
        {listSection}
        <div className="w-1/2 border-l border-gray-200">
          {previewSection}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {previewPosition === 'top' ? (
        <>
          {previewSection}
          {listSection}
        </>
      ) : (
        <>
          {listSection}
          {previewSection}
        </>
      )}
    </div>
  );
}

