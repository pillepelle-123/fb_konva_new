import { useState } from 'react';
import { useEditor } from '../../context/EditorContext';

export default function Toolbar() {
  const { state, dispatch } = useEditor();
  const [isExpanded, setIsExpanded] = useState(true);

  const tools = [
    { id: 'select', label: 'Select', icon: '🔍' },
    { id: 'pan', label: 'Pan', icon: '✋' },
    { id: 'text', label: 'Text', icon: '📝' },
    { id: 'question', label: 'Question', icon: '❓' },
    { id: 'answer', label: 'Answer', icon: '💬' },
    { id: 'photo', label: 'Photo', icon: '🖼️' },
    { id: 'line', label: 'Line', icon: '📏' },
    { id: 'circle', label: 'Circle', icon: '⭕' },
    { id: 'rect', label: 'Rectangle', icon: '⬜' },
    { id: 'brush', label: 'Brush', icon: '🖌️' },
  ];

  return (
    <div style={{
      width: isExpanded ? '200px' : '60px',
      backgroundColor: 'white',
      borderRight: '1px solid #e5e7eb',
      display: 'flex',
      flexDirection: 'column',
      transition: 'width 0.2s ease'
    }}>
      {/* Toggle button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          padding: '0.75rem',
          border: 'none',
          backgroundColor: '#f3f4f6',
          borderBottom: '1px solid #e5e7eb',
          cursor: 'pointer',
          fontSize: '1rem',
          display: 'flex',
          justifyContent: isExpanded ? 'space-between' : 'center',
          alignItems: 'center'
        }}
      >
        {isExpanded && <span style={{ fontSize: '0.9rem', fontWeight: '500' }}>Tools</span>}
        <span>{isExpanded ? '◀' : '▶'}</span>
      </button>
      
      {/* Tool buttons */}
      <div style={{ padding: '0.5rem' }}>
        {tools.map(tool => (
          <button
            key={tool.id}
            onClick={() => dispatch({ type: 'SET_ACTIVE_TOOL', payload: tool.id as any })}
            style={{
              width: '100%',
              padding: '0.75rem',
              margin: '0.25rem 0',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              backgroundColor: state.activeTool === tool.id ? '#2563eb' : 'white',
              color: state.activeTool === tool.id ? 'white' : '#374151',
              cursor: 'pointer',
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              justifyContent: isExpanded ? 'flex-start' : 'center'
            }}
            title={!isExpanded ? tool.label : undefined}
          >
            <span>{tool.icon}</span>
            {isExpanded && <span>{tool.label}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}