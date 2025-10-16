import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../../context/auth-context';
import { Badge } from '../../ui/composites/badge';
import { FileText } from 'lucide-react';
import Konva from 'konva';
import ProfilePicture from '../users/profile-picture';

interface PagePreviewProps {
  bookId: number;
  pageId: number;
  pageNumber: number;
  assignedUser?: { name: string; id: number } | null;
  isActive?: boolean;
}

function getConsistentColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = [
    '3b82f6', '8b5cf6', 'ef4444', '10b981', 'f59e0b', 'ec4899', '06b6d4', 'f97316',
    'f87171', 'fb7185', 'f472b6', 'e879f9', 'c084fc', 'a78bfa', '8b5cf6', '7c3aed',
    '6366f1', '4f46e5', '3b82f6', '2563eb', '0ea5e9', '0891b2', '0e7490', '0f766e',
    '059669', '047857', '065f46', '166534', '15803d', '16a34a', '22c55e', '4ade80',
    '65a30d', '84cc16', 'a3e635', 'bef264', 'eab308', 'f59e0b', 'f97316', 'ea580c',
    'dc2626', 'b91c1c', '991b1b', '7f1d1d', '78716c', '57534e', '44403c', '292524'
  ];
  return colors[Math.abs(hash) % colors.length];
}

export default function PagePreview({ bookId, pageId, pageNumber, assignedUser, isActive }: PagePreviewProps) {
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

  const borderClass = isActive ? 'border-ring' : 'border-border';

  return (
    <div className={`w-16 h-20 bg-muted border-2 ${borderClass} rounded-lg flex items-center justify-center relative overflow-visible`}>
      {previewUrl ? (
        <img 
          src={previewUrl} 
          alt={`Page ${pageNumber} preview`}
          className="w-full h-full object-cover"
        />
      ) : (
        <FileText className="h-6 w-6 text-muted-foreground" />
      )}
      
      {/* Profile picture badge at top-right */}
      {assignedUser && (
        <div className="absolute -top-3 -right-2 w-8 h-8 rounded-full">
          <ProfilePicture 
            name={assignedUser.name} 
            size="sm" 
            userId={assignedUser.id}
            className="w-full h-full"
            variant="withColoredBorder"
          />
        </div>
      )}
      
      {/* Page number badge at bottom center */}
      <Badge 
        variant="secondary" 
        className="h-5 w-5 absolute -bottom-2 left-1/2 transform -translate-x-1/2 text-xs border bg-white text-primary border-border p-1 flex items-center justify-center"
      >
        {pageNumber}
      </Badge>
    </div>
  );
}