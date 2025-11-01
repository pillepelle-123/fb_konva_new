import { Paintbrush2 } from 'lucide-react';
import { getGlobalTheme } from '../../../../utils/global-themes';

interface TemplateThemeProps {
  selectedTheme: string;
  onThemeSelect: (theme: string) => void;
}

export function TemplateTheme({ selectedTheme, onThemeSelect }: TemplateThemeProps) {
  const themes = ['default', 'sketchy', 'minimal', 'colorful'];

  return (
    <div className="flex h-full">
      {/* Left side - List */}
      <div className="w-1/2 border-r border-gray-200 p-4">
        <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
          <Paintbrush2 className="h-4 w-4" />
          Themes
        </h3>
        <div className="space-y-2">
          {themes.map((themeId) => {
            const theme = getGlobalTheme(themeId);
            return (
              <button
                key={themeId}
                onClick={() => onThemeSelect(themeId)}
                className={`w-full p-3 border rounded-lg text-left transition-colors ${
                  selectedTheme === themeId
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-medium text-sm capitalize">{theme?.name || themeId}</div>
                <div className="text-xs text-gray-600 mt-1">
                  {theme?.description || 'Theme styling'}
                </div>
                <div className="mt-2 flex gap-1">
                  <div className={`w-4 h-4 rounded-sm ${
                    themeId === 'sketchy' ? 'bg-orange-200 border-2 border-orange-400' :
                    themeId === 'minimal' ? 'bg-gray-100 border border-gray-300' :
                    themeId === 'colorful' ? 'bg-gradient-to-r from-pink-200 to-blue-200' :
                    'bg-white border border-gray-400'
                  }`} />
                  <div className={`w-4 h-4 rounded-sm ${
                    themeId === 'sketchy' ? 'bg-yellow-200 border-2 border-yellow-400' :
                    themeId === 'minimal' ? 'bg-gray-50 border border-gray-200' :
                    themeId === 'colorful' ? 'bg-gradient-to-r from-green-200 to-purple-200' :
                    'bg-gray-50 border border-gray-300'
                  }`} />
                </div>
              </button>
            );
          })}
        </div>
      </div>
      
      {/* Right side - Preview */}
      <div className="w-1/2 p-4">
        <h3 className="text-sm font-medium mb-3">Preview</h3>
        {selectedTheme ? (
          <div className="bg-white border rounded-lg p-4">
            <div className="text-sm font-medium mb-2 capitalize">
              {getGlobalTheme(selectedTheme)?.name || selectedTheme}
            </div>
            <div className="aspect-[210/297] bg-gray-50 border rounded p-4">
              <div className={`w-full h-8 rounded mb-2 ${
                selectedTheme === 'sketchy' ? 'bg-orange-100 border-2 border-orange-300' :
                selectedTheme === 'minimal' ? 'bg-gray-100 border border-gray-300' :
                selectedTheme === 'colorful' ? 'bg-gradient-to-r from-pink-100 to-blue-100' :
                'bg-white border border-gray-300'
              }`} />
              <div className={`w-3/4 h-6 rounded mb-2 ${
                selectedTheme === 'sketchy' ? 'bg-yellow-100 border-2 border-yellow-300' :
                selectedTheme === 'minimal' ? 'bg-gray-50 border border-gray-200' :
                selectedTheme === 'colorful' ? 'bg-gradient-to-r from-green-100 to-purple-100' :
                'bg-gray-50 border border-gray-200'
              }`} />
            </div>
          </div>
        ) : (
          <div className="text-gray-500 text-sm">Select a theme to see preview</div>
        )}
      </div>
    </div>
  );
}