#!/bin/bash
# Auto-generated script to delete dead code
# Review carefully before running!

echo "⚠️  This will delete 22 files"
echo "Press Ctrl+C to cancel, or Enter to continue..."
read

rm "client\src\components\features\editor\canvas-items\image-placeholder.tsx"
rm "client\src\components\features\editor\canvas-items\shared-text-renderer.tsx"
rm "client\src\components\features\editor\canvas\PartnerPageSnapshot.tsx"
rm "client\src\components\features\editor\canvas\canvas-helpers.tsx"
rm "client\src\components\features\editor\canvas\hooks\useCanvasMouseEvents.ts"
rm "client\src\components\features\editor\canvas\safety-margin-rectangle.tsx"
rm "client\src\components\features\editor\pdf-export-modal.tsx"
rm "client\src\components\features\editor\preview\canvas-preview-dialog.tsx"
rm "client\src\components\features\editor\preview\mini-background.tsx"
rm "client\src\components\features\editor\preview\mini-konva-background.tsx"
rm "client\src\components\features\editor\preview\mini-template-render.tsx"
rm "client\src\components\features\editor\preview\preview-image-dialog.tsx"
rm "client\src\components\features\editor\templates\selector-font.tsx"
rm "client\src\components\features\editor\templates\template-palette.tsx"
rm "client\src\components\features\editor\templates\wizard-palette-selector.tsx"
rm "client\src\components\ui\icons\question-position-icons.tsx"
rm "client\src\components\ui\skeleton.tsx"
rm "client\src\test-setup\canvas-setup.ts"
rm "client\src\utils\canvas-export.ts"
rm "shared\utils\color-utils.js"
rm "shared\utils\constants.js"
rm "shared\utils\konva-transform.ts"

echo "✓ Dead code deleted"