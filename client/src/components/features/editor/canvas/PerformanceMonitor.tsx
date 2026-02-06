import React, { useEffect, useState, useRef } from 'react';

interface PerformanceStats {
  fps: number;
  avgFps: number;
  renderTime: number;
  nodeCount: number;
  snapshotActive: boolean;
  memoryUsage?: number;
  hasPartnerPage: boolean;
  snapshotEnabled: boolean;
  hiddenStageExists: boolean;
  imageNodesCount: number;
}

export const PerformanceMonitor: React.FC<{ stageRef: React.RefObject<any> }> = ({ stageRef }) => {
  const [stats, setStats] = useState<PerformanceStats>({
    fps: 0,
    avgFps: 0,
    renderTime: 0,
    nodeCount: 0,
    snapshotActive: false,
    hasPartnerPage: false,
    snapshotEnabled: true,
    hiddenStageExists: false,
    imageNodesCount: 0
  });
  const [visible, setVisible] = useState(false);
  
  const frameTimesRef = useRef<number[]>([]);
  const lastFrameTimeRef = useRef(performance.now());
  const animationFrameRef = useRef<number>();

  useEffect(() => {
    const measurePerformance = () => {
      const now = performance.now();
      const delta = now - lastFrameTimeRef.current;
      lastFrameTimeRef.current = now;

      const currentFps = Math.round(1000 / delta);
      frameTimesRef.current.push(currentFps);
      if (frameTimesRef.current.length > 60) frameTimesRef.current.shift();

      const avgFps = Math.round(
        frameTimesRef.current.reduce((a, b) => a + b, 0) / frameTimesRef.current.length
      );

      let nodeCount = 0;
      let snapshotActive = false;
      let hasPartnerPage = false;
      let imageNodesCount = 0;
      
      if (stageRef.current) {
        const stage = stageRef.current;
        const layers = stage.getLayers();
        layers.forEach((layer: any) => {
          nodeCount += layer.getChildren().length;
        });
        
        // Check for partner page (preview-page group)
        const allGroups = stage.find('Group');
        hasPartnerPage = allGroups.some((node: any) => 
          node.name()?.includes('preview-page')
        );
        
        // Check all Image nodes
        const allImages = stage.find('Image');
        imageNodesCount = allImages.length;
        
        // Simplified snapshot detection: Look for any Image with data URL
        snapshotActive = allImages.some((node: any) => {
          try {
            const img = node.image?.();
            if (img && img.src) {
              // Check if it's a data URL (snapshot) and not a regular image
              const isDataUrl = img.src.startsWith('data:image');
              const isJpeg = img.src.includes('image/jpeg');
              return isDataUrl && isJpeg; // Snapshots are JPEG data URLs
            }
          } catch (e) {
            return false;
          }
          return false;
        });
      }

      const snapshotEnabled = localStorage.getItem('force-disable-snapshot') !== 'true';
      const hiddenStageExists = document.querySelector('[style*="-9999px"]') !== null;

      const memoryUsage = (performance as any).memory?.usedJSHeapSize 
        ? Math.round((performance as any).memory.usedJSHeapSize / 1048576)
        : undefined;

      setStats({
        fps: currentFps,
        avgFps,
        renderTime: delta,
        nodeCount,
        snapshotActive,
        memoryUsage,
        hasPartnerPage,
        snapshotEnabled,
        hiddenStageExists,
        imageNodesCount
      });

      animationFrameRef.current = requestAnimationFrame(measurePerformance);
    };

    if (visible) {
      animationFrameRef.current = requestAnimationFrame(measurePerformance);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [visible, stageRef]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'P') {
        e.preventDefault();
        setVisible(v => !v);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  if (!visible) return null;

  const getFpsColor = (fps: number) => {
    if (fps >= 55) return '#22c55e';
    if (fps >= 30) return '#eab308';
    return '#ef4444';
  };

  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      left: '10px',
      backgroundColor: 'rgba(0, 0, 0, 0.85)',
      color: '#fff',
      padding: '12px 16px',
      borderRadius: '8px',
      fontFamily: 'monospace',
      fontSize: '12px',
      zIndex: 10000,
      minWidth: '220px',
      backdropFilter: 'blur(4px)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)'
    }}>
      <div style={{ 
        fontWeight: 'bold', 
        marginBottom: '8px', 
        fontSize: '13px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
        paddingBottom: '6px'
      }}>
        Performance Monitor
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>FPS:</span>
          <span style={{ 
            color: getFpsColor(stats.fps),
            fontWeight: 'bold'
          }}>
            {stats.fps}
          </span>
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Avg FPS:</span>
          <span style={{ 
            color: getFpsColor(stats.avgFps),
            fontWeight: 'bold'
          }}>
            {stats.avgFps}
          </span>
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Frame Time:</span>
          <span>{stats.renderTime.toFixed(1)}ms</span>
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Nodes:</span>
          <span>{stats.nodeCount}</span>
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Snapshot:</span>
          <span style={{ 
            color: stats.snapshotActive ? '#22c55e' : '#ef4444',
            fontWeight: 'bold'
          }}>
            {stats.snapshotActive ? 'ACTIVE' : 'OFF'}
          </span>
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', opacity: 0.7 }}>
          <span>Partner Page:</span>
          <span>{stats.hasPartnerPage ? 'Yes' : 'No'}</span>
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', opacity: 0.7 }}>
          <span>Snap Enabled:</span>
          <span>{stats.snapshotEnabled ? 'Yes' : 'No'}</span>
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', opacity: 0.5 }}>
          <span>Hidden Stage:</span>
          <span>{stats.hiddenStageExists ? 'Yes' : 'No'}</span>
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', opacity: 0.5 }}>
          <span>Image Nodes:</span>
          <span>{stats.imageNodesCount}</span>
        </div>
        
        {stats.memoryUsage && (
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Memory:</span>
            <span>{stats.memoryUsage}MB</span>
          </div>
        )}
      </div>
      
      <div style={{ 
        marginTop: '8px', 
        paddingTop: '6px',
        borderTop: '1px solid rgba(255, 255, 255, 0.2)',
        fontSize: '10px',
        color: 'rgba(255, 255, 255, 0.6)'
      }}>
        Press Ctrl+Shift+P to toggle
      </div>
    </div>
  );
};
