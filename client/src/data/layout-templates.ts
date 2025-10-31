import type { LayoutTemplate } from '../types/layout-types';

export const layoutTemplates: LayoutTemplate[] = [
  {
    id: 'single-question',
    name: 'Single Question',
    description: 'One centered question box',
    elements: [
      {
        id: 'qna-1',
        type: 'textbox-qna-inline',
        x: 150,
        y: 200,
        width: 400,
        height: 120
      }
    ]
  },
  {
    id: 'two-column',
    name: 'Two Column',
    description: 'Two questions side by side',
    elements: [
      {
        id: 'qna-1',
        type: 'textbox-qna-inline',
        x: 50,
        y: 150,
        width: 300,
        height: 120
      },
      {
        id: 'qna-2',
        type: 'textbox-qna-inline',
        x: 370,
        y: 150,
        width: 300,
        height: 120
      }
    ]
  },
  {
    id: 'grid-layout',
    name: 'Grid Layout',
    description: 'Four questions in 2x2 grid',
    elements: [
      {
        id: 'qna-1',
        type: 'textbox-qna-inline',
        x: 50,
        y: 100,
        width: 300,
        height: 100
      },
      {
        id: 'qna-2',
        type: 'textbox-qna-inline',
        x: 370,
        y: 100,
        width: 300,
        height: 100
      },
      {
        id: 'qna-3',
        type: 'textbox-qna-inline',
        x: 50,
        y: 220,
        width: 300,
        height: 100
      },
      {
        id: 'qna-4',
        type: 'textbox-qna-inline',
        x: 370,
        y: 220,
        width: 300,
        height: 100
      }
    ]
  },
  {
    id: 'interview-style',
    name: 'Interview Style',
    description: 'Six questions in vertical list',
    elements: [
      {
        id: 'qna-1',
        type: 'textbox-qna-inline',
        x: 100,
        y: 80,
        width: 500,
        height: 80
      },
      {
        id: 'qna-2',
        type: 'textbox-qna-inline',
        x: 100,
        y: 170,
        width: 500,
        height: 80
      },
      {
        id: 'qna-3',
        type: 'textbox-qna-inline',
        x: 100,
        y: 260,
        width: 500,
        height: 80
      },
      {
        id: 'qna-4',
        type: 'textbox-qna-inline',
        x: 100,
        y: 350,
        width: 500,
        height: 80
      },
      {
        id: 'qna-5',
        type: 'textbox-qna-inline',
        x: 100,
        y: 440,
        width: 500,
        height: 80
      },
      {
        id: 'qna-6',
        type: 'textbox-qna-inline',
        x: 100,
        y: 530,
        width: 500,
        height: 80
      }
    ]
  },
  {
    id: 'mixed-content',
    name: 'Mixed Content',
    description: 'Questions with shapes and images',
    elements: [
      {
        id: 'qna-1',
        type: 'textbox-qna-inline',
        x: 50,
        y: 50,
        width: 300,
        height: 100
      },
      {
        id: 'qna-2',
        type: 'textbox-qna-inline',
        x: 50,
        y: 170,
        width: 300,
        height: 100
      },
      {
        id: 'image-1',
        type: 'image',
        x: 400,
        y: 50,
        width: 200,
        height: 150
      },
      {
        id: 'shape-1',
        type: 'shape',
        x: 400,
        y: 220,
        width: 100,
        height: 100,
        shapeType: 'heart'
      },
      {
        id: 'qna-3',
        type: 'textbox-qna-inline',
        x: 50,
        y: 290,
        width: 300,
        height: 100
      }
    ]
  }
];