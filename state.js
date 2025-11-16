// state.js
export const state = {
  shapes: [],
  tempPoly: [],
  currentTool: "rect",
  currentCategory: "wall",
  selectedShapeId: null,
  dragging: false,
  dragMode: null,      // 'move', 'rotate', 'resize-rect', 'resize-circle', 'move-poly-point'
  dragStart: { x: 0, y: 0 },
  shapeSnapshot: null,
  nextShapeId: 1,
  drawing: false       // <--- add this
};

export function resetState() {
  state.shapes = [];
  state.tempPoly = [];
  state.selectedShapeId = null;
  state.dragging = false;
  state.dragMode = null;
  state.shapeSnapshot = null;
  state.nextShapeId = 1;
  state.drawing = false;
}
