import type { CanvasElement } from '../../../../context/editor-context';
import type { CanvasItemProps } from './base-canvas-item';
import RoughBrush from './rough-brush';
import RoughShape from './rough-shape';
import Textbox from './textbox';
import Photo from './photo';

interface CanvasItemComponentProps extends CanvasItemProps {
  element: CanvasElement;
}

export default function CanvasItemComponent(props: CanvasItemComponentProps) {
  const { element } = props;

  if (element.type === 'brush') {
    return <RoughBrush {...props} />;
  }

  if (['rect', 'circle', 'line', 'heart', 'star', 'speech-bubble', 'dog', 'cat', 'smiley'].includes(element.type)) {
    return <RoughShape {...props} />;
  }

  if (element.type === 'text') {
    return <Textbox {...props} />;
  }

  if (element.type === 'placeholder' || element.type === 'photo') {
    return <Photo {...props} />;
  }

  // Fallback for other element types
  return null;
}