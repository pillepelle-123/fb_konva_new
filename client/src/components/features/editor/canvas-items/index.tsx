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

  if (['rect', 'circle', 'line', 'heart', 'star', 'speech-bubble', 'dog', 'cat', 'smiley'].includes(element.type)) {
    return <ThemedShape {...props} />;
  }

  if (element.type === 'text') {
    // Check for QnA2 textStyle
    if (element.textStyle === 'qna2') {
      return <TextboxQnA2 {...props} />;
    }
    // Check for QnA Inline textType or textStyle
    if (element.textType === 'qna_inline' || element.textStyle === 'qna-inline') {
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