// Brush mode state management
export interface BrushStroke {
  points: number[];
}

export class BrushModeManager {
  private strokes: BrushStroke[] = [];
  private isActive: boolean = false;

  start() {
    this.isActive = true;
    this.strokes = [];
    window.dispatchEvent(new CustomEvent('brushModeStart'));
  }

  addStroke(points: number[]) {
    if (!this.isActive) return;
    this.strokes.push({ points });
    window.dispatchEvent(new CustomEvent('brushStrokeAdded', { detail: { points } }));
  }

  undo() {
    if (this.strokes.length > 0) {
      this.strokes.pop();
    }
  }

  getStrokes(): BrushStroke[] {
    return [...this.strokes];
  }

  clear() {
    this.strokes = [];
    this.isActive = false;
    window.dispatchEvent(new CustomEvent('brushModeEnd'));
  }

  isActiveMode(): boolean {
    return this.isActive;
  }
}

export const brushModeManager = new BrushModeManager();
