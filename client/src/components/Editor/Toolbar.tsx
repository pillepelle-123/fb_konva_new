import { useEditor } from '../../context/EditorContext';

export default function Toolbar() {
  const { state, dispatch } = useEditor();

  const tools = [
    { id: 'select', label: '🔍 Select', icon: '🔍' },
    { id: 'text', label: '📝 Text', icon: '📝' },
    { id: 'question', label: '❓ Question', icon: '❓' },
    { id: 'answer', label: '💬 Answer', icon: '💬' },
    { id: 'photo', label: '🖼️ Photo', icon: '🖼️' },
    { id: 'line', label: '📏 Line', icon: '📏' },
    { id: 'circle', label: '⭕ Circle', icon: '⭕' },
    { id: 'rect', label: '⬜ Rectangle', icon: '⬜' },
    { id: 'brush', label: '🖌️ Brush', icon: '🖌️' },
  ];

  return (
    <div style={{
      display: 'flex',
      gap: '0.5rem',
      padding: '1rem',
      backgroundColor: 'white',
      borderBottom: '1px solid #e5e7eb',
      flexWrap: 'wrap'
    }}>
      {tools.map(tool => (
        <button
          key={tool.id}
          onClick={() => dispatch({ type: 'SET_ACTIVE_TOOL', payload: tool.id as any })}
          style={{
            padding: '0.5rem 1rem',
            border: '1px solid #d1d5db',
            borderRadius: '4px',
            backgroundColor: state.activeTool === tool.id ? '#2563eb' : 'white',
            color: state.activeTool === tool.id ? 'white' : '#374151',
            cursor: 'pointer',
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem'
          }}
        >
          <span>{tool.icon}</span>
          <span>{tool.label.split(' ')[1]}</span>
        </button>
      ))}
    </div>
  );
}