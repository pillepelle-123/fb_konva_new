import { Group } from 'react-konva';
import type { CanvasElement } from '../../../../context/editor-context.tsx';
import { useEditor } from '../../../../context/editor-context.tsx';
import type { CanvasItemProps } from './base-canvas-item.tsx';
import ThemedShape from './themed-shape.tsx';

import TextboxQnAInline from './textbox-qna-inline.tsx';
import TextboxQna from './textbox-qna.tsx';
import TextboxFreeText from './textbox-free-text.tsx';
import Image from './image.tsx';
import Sticker from './sticker.tsx';

interface CanvasItemComponentProps extends CanvasItemProps {
  element: CanvasElement;
}

export default function CanvasItemComponent(props: CanvasItemComponentProps) {
  const { element, onDragStart, onSelect, hoveredElementId, interactive = true } = props;
  const { dispatch, state } = useEditor();

  if ((element.type === 'group' || element.type === 'brush-multicolor') && element.groupedElements) {
    return (
      <Group 
        x={element.x} 
        y={element.y} 
        id={element.id}
        listening={interactive}
        draggable={interactive && state.activeTool === 'select' && !(state.editorSettings?.editor?.lockElements)}
        onMouseDown={interactive ? (e) => {
          if (state.activeTool === 'select') {
            e.cancelBubble = true;
          }
        } : undefined}
        onClick={interactive ? (e) => {
          if (state.activeTool === 'select') {
            e.cancelBubble = true;
            onSelect?.(e);
          }
        } : undefined}
        onTap={interactive ? (e) => {
          if (state.activeTool === 'select') {
            e.cancelBubble = true;
            onSelect?.();
          }
        } : undefined}
        onDragStart={interactive ? (e) => {
          // Block dragging if elements are locked
          if (state.editorSettings?.editor?.lockElements) {
            e.target.stopDrag();
            return;
          }
          dispatch({ type: 'SAVE_TO_HISTORY', payload: 'Move Group' });
          onDragStart?.();
        } : undefined}
        onDragEnd={interactive ? (e) => {
          // Block position update if elements are locked
          if (state.editorSettings?.editor?.lockElements) {
            // Reset position to original
            e.target.x(element.x);
            e.target.y(element.y);
            return;
          }
          
          dispatch({
            type: 'UPDATE_ELEMENT_PRESERVE_SELECTION',
            payload: {
              id: element.id,
              updates: { x: e.target.x(), y: e.target.y() }
            }
          });
        } : undefined}
      >
        {element.groupedElements.map(groupedEl => (
          <CanvasItemComponent key={groupedEl.id} {...props} element={groupedEl} isSelected={false} isInsideGroup={true} hoveredElementId={hoveredElementId} interactive={interactive} />
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
    // Check for QnA Inline textType
    if (element.textType === 'qna_inline') {
      return <TextboxQnAInline {...props} />;
    }
    // Check for QnA textType (qna and qna2)
    if (element.textType === 'qna' || element.textType === 'qna2') {
      return <TextboxQna {...props} />;
    }
    // Check for Free Text textType
    if (element.textType === 'free_text') {
      return <TextboxFreeText {...props} />;
    }
    // Fallback for other text types - use QnA Inline as default
    return <TextboxQnAInline {...props} />;
  }

  if (element.type === 'placeholder' || element.type === 'image') {
    return <Image {...props} />;
  }

  if (element.type === 'sticker') {
    return <Sticker {...props} />;
  }

  // Fallback for other element types
  return null;
}