import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../../context/auth-context';
import { Badge } from '../../ui/composites/badge';
import { FileText } from 'lucide-react';
import Konva from 'konva';

interface PagePreviewProps {
  bookId: number;
  pageId: number;
  pageNumber: number;
}

export default function PagePreview({ bookId, pageId, pageNumber }: PagePreviewProps) {
  const { token } = useAuth();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const stageRef = useRef<Konva.Stage | null>(null);

  useEffect(() => {
    generatePagePreview();
  }, [bookId, pageId]);

  const generatePagePreview = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/books/${bookId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        const book = await response.json();
        const page = book.pages.find((p: any) => p.id === pageId);
        
        console.log('Page elements:', page?.elements);
        
        if (page?.elements && page.elements.length > 0) {
          // Create container div
          const container = document.createElement('div');
          document.body.appendChild(container);
          
          const stage = new Konva.Stage({
            container: container,
            width: 800,
            height: 600,
            fill: 'white'
          });
          
          const layer = new Konva.Layer();
          
          // Add white background
          // const bg = new Konva.Rect({
          //   x: 110,
          //   y: 0,
          //   width: 800,
          //   height: 600,
          //   fill: 'white'
          // });
          // layer.add(bg);
          
          // Add elements
          page.elements.forEach((element: any) => {
            let shape;
            if (element.type === 'rect') {
              shape = new Konva.Rect({
                x: element.x || 0,
                y: element.y || 0,
                width: element.width || 50,
                height: element.height || 50,
                fill: element.fill || '#3b82f6',
                stroke: element.stroke || '#000',
                strokeWidth: element.strokeWidth || 1
              });
            } else if (element.type === 'circle') {
              shape = new Konva.Circle({
                x: (element.x || 0) + (element.width || 50) / 2,
                y: (element.y || 0) + (element.height || 50) / 2,
                radius: Math.min(element.width || 50, element.height || 50) / 2,
                fill: element.fill || '#3b82f6',
                stroke: element.stroke || '#000',
                strokeWidth: element.strokeWidth || 1
              });
            } else if (element.type === 'text') {
              const isQuestion = element.textType === 'question';
              shape = new Konva.Text({
                x: element.x || 0,
                y: element.y || 0,
                text: element.text || 'Text',
                fontSize: element.fontSize || 16,
                fill: isQuestion ? '#dc2626' : (element.fill || '#000')
              });
              
              // Add question indicator background
              if (isQuestion) {
                const questionBg = new Konva.Rect({
                  x: element.x || 0,
                  y: element.y || 0,
                  width: element.width || 100,
                  height: element.height || 30,
                  fill: '#fef2f2',
                  stroke: '#dc2626',
                  strokeWidth: 2
                });
                layer.add(questionBg);
              }
            } else {
              // Default shape for other types
              shape = new Konva.Rect({
                x: element.x || 0,
                y: element.y || 0,
                width: element.width || 20,
                height: element.height || 20,
                fill: element.fill || '#3b82f6'
              });
            }
            
            if (shape) layer.add(shape);
          });
          
          stage.add(layer);
          
          // Generate preview with proper scaling
          stage.scale({ x: 0.024, y: 0.024 });
          const dataURL = stage.toDataURL({
            width: 60,
            height: 80,
            pixelRatio: 1
          });
          
          setPreviewUrl(dataURL);
          stage.destroy();
          document.body.removeChild(container);
        }
      }
    } catch (error) {
      console.error('Error generating page preview:', error);
    }
  };

  return (
    <div className="w-16 h-20 bg-muted border-2 border-border rounded-lg flex items-center justify-center relative overflow-hidden">
      {previewUrl ? (
        <img 
          src={previewUrl} 
          alt={`Page ${pageNumber} preview`}
          className="w-full h-full object-cover"
        />
      ) : (
        <FileText className="h-6 w-6 text-muted-foreground" />
      )}
      <Badge variant="secondary" className="absolute -top-2 -right-2 text-xs">
        {pageNumber}
      </Badge>
    </div>
  );
}