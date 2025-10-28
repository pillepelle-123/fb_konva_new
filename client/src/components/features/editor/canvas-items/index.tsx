import { Group } from 'react-konva';
import type { CanvasElement } from '../../../../context/editor-context';
import { useEditor } from '../../../../context/editor-context';
import type { CanvasItemProps } from './base-canvas-item';
import ThemedShape from './themed-shape';
import Textbox from './textbox';
import TextboxQnA2 from './textbox-qna2';
import TextboxQnAInline from './textbox-qna-inline';
import Image from './image';

interface CanvasItemComponentProps extends CanvasItemProps {
  element: CanvasElement;
}

export default function CanvasItemComponent(props: CanvasItemComponentProps) {
  const { element, onDragStart, onSelect, hoveredElementId } = props;
  const { dispatch, state } = useEditor();

  if ((element.type === 'group' || element.type === 'brush-multicolor') && element.groupedElements) {
    return (
      <Group 
        x={element.x} 
        y={element.y} 
        id={element.id}
        listening={true}
        draggable={state.activeTool === 'select'}
        onMouseDown={(e) => {
          if (state.activeTool === 'select') {
            e.cancelBubble = true;
          }
        }}
        onClick={(e) => {
          if (state.activeTool === 'select') {
            e.cancelBubble = true;
            onSelect?.(e);
          }
        }}
        onTap={(e) => {
          if (state.activeTool === 'select') {
            e.cancelBubble = true;
            onSelect?.();
          }
        }}
        onDragStart={(e) => {
          dispatch({ type: 'SAVE_TO_HISTORY', payload: 'Move Group' });
          onDragStart?.();
        }}
        onDragEnd={(e) => {
          dispatch({
            type: 'UPDATE_ELEMENT_PRESERVE_SELECTION',
            payload: {
              id: element.id,
              updates: { x: e.target.x(), y: e.target.y() }
            }
          });
        }}
      >
        {element.groupedElements.map(groupedEl => (
          <CanvasItemComponent key={groupedEl.id} {...props} element={groupedEl} isSelected={false} isInsideGroup={true} hoveredElementId={hoveredElementId} />
        ))}
      </Group>
    );
  }

  if (element.type === 'brush') {
    return <ThemedShape {...props} />;
  }

  if (['rect', 'circle', 'line', 'triangle', 'polygon', 'heart', 'star', 'speech-bubble', 'dog', 'cat', 'smiley'].includes(element.type)) {
    return <ThemedShape {...props} />;
  }

  if (element.type === 'text') {
    // Check for QnA2 textType
    if (element.textType === 'qna2') {
      return <TextboxQnA2 {...props} />;
    }
    // Check for QnA Inline textType
    if (element.textType === 'qna_inline') {
      return <TextboxQnAInline {...props} />;
    }
    return <Textbox {...props} />;
  }

  if (element.type === 'placeholder' || element.type === 'image') {
    return <Image {...props} />;
  }

  // Fallback for other element types
  return null;
}