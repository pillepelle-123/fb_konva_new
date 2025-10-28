import { useState } from 'react';

interface TemplateHelpProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function TemplateHelp({ isOpen, onClose }: TemplateHelpProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose} />
      
      <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Template System Guide</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-6">
            <section>
              <h3 className="text-lg font-medium text-gray-900 mb-2">What are Templates?</h3>
              <p className="text-gray-600">
                Templates are pre-designed page layouts that help you create beautiful, consistent pages quickly. 
                Each template includes positioned text boxes, image placeholders, and coordinated colors.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Template Categories</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3 border rounded-lg">
                  <h4 className="font-medium text-blue-600">Structured</h4>
                  <p className="text-sm text-gray-600">Organized layouts with clear sections for questions and answers</p>
                </div>
                <div className="p-3 border rounded-lg">
                  <h4 className="font-medium text-pink-600">Playful</h4>
                  <p className="text-sm text-gray-600">Fun, creative layouts with decorative elements</p>
                </div>
                <div className="p-3 border rounded-lg">
                  <h4 className="font-medium text-gray-600">Minimal</h4>
                  <p className="text-sm text-gray-600">Clean, simple layouts focusing on content</p>
                </div>
                <div className="p-3 border rounded-lg">
                  <h4 className="font-medium text-purple-600">Creative</h4>
                  <p className="text-sm text-gray-600">Artistic layouts with unique arrangements</p>
                </div>
              </div>
            </section>

            <section>
              <h3 className="text-lg font-medium text-gray-900 mb-2">How to Use Templates</h3>
              <ol className="list-decimal list-inside space-y-2 text-gray-600">
                <li>Browse templates by category or search by name</li>
                <li>Click a template to preview it</li>
                <li>Use "Quick Apply" on hover for instant application</li>
                <li>Click "Customize" to modify colors and settings</li>
                <li>Click "Apply" to use the template on your page</li>
              </ol>
            </section>

            <section>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Magic Wand Feature</h3>
              <p className="text-gray-600 mb-2">
                The Magic Wand randomly selects a template and color palette for you. Perfect when you want 
                inspiration or can't decide between options.
              </p>
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-sm text-blue-800">
                  💡 <strong>Tip:</strong> Use Magic Wand with a specific category to get random templates 
                  within that style.
                </p>
              </div>
            </section>

            <section>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Keyboard Shortcuts</h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><kbd className="px-2 py-1 bg-white border rounded">←→</kbd> Navigate templates</div>
                  <div><kbd className="px-2 py-1 bg-white border rounded">Enter</kbd> Apply template</div>
                  <div><kbd className="px-2 py-1 bg-white border rounded">Esc</kbd> Close gallery</div>
                  <div><kbd className="px-2 py-1 bg-white border rounded">Tab</kbd> Navigate controls</div>
                </div>
              </div>
            </section>

            <section>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Important Notes</h3>
              <div className="space-y-2">
                <div className="bg-yellow-50 p-3 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    ⚠️ <strong>Warning:</strong> Applying a template will replace all existing content on the page.
                  </p>
                </div>
                <div className="bg-green-50 p-3 rounded-lg">
                  <p className="text-sm text-green-800">
                    ✅ <strong>Best Practice:</strong> Apply templates to new pages or save your work before applying.
                  </p>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

export function TemplateTooltip({ children, content }: { children: React.ReactNode; content: string }) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
      >
        {children}
      </div>
      {isVisible && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg whitespace-nowrap z-50">
          {content}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
        </div>
      )}
    </div>
  );
}