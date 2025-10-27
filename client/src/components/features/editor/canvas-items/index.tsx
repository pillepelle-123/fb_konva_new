import type { CanvasElement } from '../../../../context/editor-context';
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
  const { element } = props;

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