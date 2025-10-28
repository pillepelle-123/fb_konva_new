import { useEffect, useRef } from 'react';
import type { PageTemplate } from '../../types/template-types';

interface TemplatePreviewProps {
  template: PageTemplate;
  width?: number;
  height?: number;
}

export default function TemplatePreview({ template, width = 300, height = 400 }: TemplatePreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = width;
    canvas.height = height;

    // Template dimensions (A4 portrait)
    const templateWidth = 2480;
    const templateHeight = 3508;
    
    // Calculate scale to fit preview
    const scaleX = width / templateWidth;
    const scaleY = height / templateHeight;
    const scale = Math.min(scaleX, scaleY);
    
    // Center the preview
    const offsetX = (width - templateWidth * scale) / 2;
    const offsetY = (height - templateHeight * scale) / 2;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw background
    ctx.fillStyle = template.colorPalette.background;
    ctx.fillRect(offsetX, offsetY, templateWidth * scale, templateHeight * scale);

    // Draw border
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    ctx.strokeRect(offsetX, offsetY, templateWidth * scale, templateHeight * scale);

    // Draw textboxes
    template.textboxes.forEach((textbox, index) => {
      const x = offsetX + textbox.position.x * scale;
      const y = offsetY + textbox.position.y * scale;
      const w = textbox.size.width * scale;
      const h = textbox.size.height * scale;

      // Textbox background
      ctx.fillStyle = '#dbeafe'; // blue-100
      ctx.fillRect(x, y, w, h);
      
      // Textbox border
      ctx.strokeStyle = '#3b82f6'; // blue-500
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, w, h);

      // Label
      ctx.fillStyle = '#1e40af'; // blue-800
      ctx.font = `${Math.max(10, 12 * scale)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`Q${index + 1}`, x + w / 2, y + h / 2);
    });

    // Draw image slots
    template.elements.filter(el => el.type === 'image').forEach((element, index) => {
      const x = offsetX + element.position.x * scale;
      const y = offsetY + element.position.y * scale;
      const w = element.size.width * scale;
      const h = element.size.height * scale;

      // Image placeholder background
      ctx.fillStyle = '#dcfce7'; // green-100
      ctx.fillRect(x, y, w, h);
      
      // Image placeholder border
      ctx.strokeStyle = '#22c55e'; // green-500
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, w, h);

      // Camera icon (simplified)
      const iconSize = Math.min(w, h) * 0.3;
      const iconX = x + w / 2 - iconSize / 2;
      const iconY = y + h / 2 - iconSize / 2;
      
      ctx.fillStyle = '#16a34a'; // green-600
      ctx.fillRect(iconX, iconY, iconSize, iconSize * 0.7);
      ctx.fillRect(iconX + iconSize * 0.3, iconY - iconSize * 0.1, iconSize * 0.4, iconSize * 0.2);
    });

    // Draw sticker positions
    template.elements.filter(el => el.type === 'sticker').forEach((element) => {
      const x = offsetX + element.position.x * scale;
      const y = offsetY + element.position.y * scale;
      const size = Math.min(element.size.width, element.size.height) * scale;

      // Sticker circle
      ctx.fillStyle = '#fef3c7'; // yellow-100
      ctx.beginPath();
      ctx.arc(x + size / 2, y + size / 2, size / 2, 0, 2 * Math.PI);
      ctx.fill();
      
      ctx.strokeStyle = '#f59e0b'; // yellow-500
      ctx.lineWidth = 1;
      ctx.stroke();

      // Star icon (simplified)
      ctx.fillStyle = '#d97706'; // yellow-600
      ctx.font = `${Math.max(8, 10 * scale)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('★', x + size / 2, y + size / 2);
    });

  }, [template, width, height]);

  return (
    <div className="flex flex-col">
      <canvas
        ref={canvasRef}
        className="border border-gray-200 rounded-lg bg-white"
        style={{ width, height }}
      />
      
      {/* Metadata */}
      <div className="mt-4 space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">Category:</span>
          <span className="font-medium capitalize">{template.category}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Questions:</span>
          <span className="font-medium">{template.textboxes.length}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Images:</span>
          <span className="font-medium">{template.constraints.imageSlots}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Stickers:</span>
          <span className="font-medium">{template.constraints.stickerSlots}</span>
        </div>
      </div>
    </div>
  );
}