// main.js
import { CATEGORIES } from "./config.js";
import { state, resetState } from "./state.js";
import {
  getRectCorners,
  getCircleHandle,
  getShapeCenter,
  rotatePointAround,
  hitRect,
  hitCircle,
  hitPoly,
  hitRectCorner,
  hitCircleRadiusHandle,
  hitPolyVertex,
  worldToLocal
} from "./geometry.js";
import { initDrawing, redraw, drawPreview, getCanvas } from "./drawing.js";
import { sendShapes, setSketchId, fetchSketch } from "./bridge.js";
import { downloadSketch, hookLoadInput } from "./storage.js";

let canvas, statusEl;
let toolButtons, catButtons, clearBtn, saveBtn, loadBtn, loadInput;

function setStatus(msg) {
  if (statusEl) statusEl.textContent = msg;
}

function getMousePos(evt) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: evt.clientX - rect.left,
    y: evt.clientY - rect.top
  };
}

// ----------------- Helper: resolve sketch ID -----------------

function getOrCreateSketchId() {
  let id = window.location.hash.slice(1).trim();
  if (!id) {
    id = "sketch-" + Math.random().toString(36).slice(2, 10);
    window.history.replaceState(null, "", "#" + id);
  }
  return id;
}

// ----------------- Shape hit helpers -----------------

function getShapeAt(x, y) {
  for (let i = state.shapes.length - 1; i >= 0; i--) {
    const s = state.shapes[i];
    if (hitShape(s, x, y)) return s;
  }
  return null;
}

function hitShape(s, x, y) {
  if (s.type === "rect") return hitRect(s, x, y);
  if (s.type === "circle") return hitCircle(s, x, y);
  if (s.type === "poly") return hitPoly(s, x, y);
  return false;
}

// ----------------- UI setup -----------------

function setupToolButtons() {
  toolButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      state.currentTool = btn.getAttribute("data-tool");
      state.tempPoly = [];
      state.dragging = false;
      state.dragMode = null;
      setStatus(
        `Sketch: ${getSketchIdSafe()} — Tool: ${state.currentTool} — Category: ${CATEGORIES[state.currentCategory].label}`
      );
    });
  });
}

function setupCategoryButtons() {
  catButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const cat = btn.getAttribute("data-cat");
      state.currentCategory = cat;

      if (state.selectedShapeId != null) {
        const s = state.shapes.find(sh => sh.id === state.selectedShapeId);
        if (s) {
          s.category = state.currentCategory;
          redraw();
          sendShapes();
        }
      }

      setStatus(
        `Sketch: ${getSketchIdSafe()} — Tool: ${state.currentTool} — Category: ${CATEGORIES[state.currentCategory].label}`
      );
    });
  });
}

function setupClearButton() {
  clearBtn.addEventListener("click", () => {
    resetState();
    redraw();
    sendShapes();
  });
}

function setupSaveLoad() {
  saveBtn.addEventListener("click", () => {
    downloadSketch();
  });

  hookLoadInput(loadBtn, loadInput);
}

function setupCanvasEvents() {
  canvas.addEventListener("mousedown", onMouseDown);
  canvas.addEventListener("mousemove", onMouseMove);
  canvas.addEventListener("mouseup", onMouseUp);
  canvas.addEventListener("contextmenu", onContextMenu);
}

// ----------------- Mouse handlers -----------------

function onMouseDown(e) {
  const { x, y } = getMousePos(e);

  if (state.currentTool === "poly") {
    if (e.button === 0) {
      state.tempPoly.push({ x, y });
      redraw();
    }
    return;
  }

  if (state.currentTool === "rect" || state.currentTool === "circle") {
    state.drawing = true;
    state.dragStart.x = x;
    state.dragStart.y = y;
    return;
  }

  if (state.currentTool === "select" || state.currentTool === "rotate") {
    const shape = getShapeAt(x, y);
    if (shape) {
      state.selectedShapeId = shape.id;
      state.dragStart.x = x;
      state.dragStart.y = y;

      const catKey = shape.category || state.currentCategory;
      state.currentCategory = catKey;
      setStatus(
        `Sketch: ${getSketchIdSafe()} — Tool: ${state.currentTool} — Selected: ${shape.type} #${shape.id} — Category: ${CATEGORIES[catKey].label}`
      );

      // Handle-based edits
      if (state.currentTool === "select") {
        if (shape.type === "rect") {
          const hitCorner = hitRectCorner(shape, x, y);
          if (hitCorner) {
            state.dragging = true;
            state.dragMode = "resize-rect";
            const cornerIndex = hitCorner.index;
            const oppIndex = (cornerIndex + 2) % 4;
            const oppCorner = hitCorner.corners[oppIndex];
            state.shapeSnapshot = {
              type: "rect",
              rotation: shape.rotation || 0,
              opp: { x: oppCorner.x, y: oppCorner.y }
            };
            redraw();
            return;
          }
        } else if (shape.type === "circle") {
          if (hitCircleRadiusHandle(shape, x, y)) {
            state.dragging = true;
            state.dragMode = "resize-circle";
            state.shapeSnapshot = { cx: shape.cx, cy: shape.cy };
            redraw();
            return;
          }
        } else if (shape.type === "poly") {
          const vertexIndex = hitPolyVertex(shape, x, y);
          if (vertexIndex !== null) {
            state.dragging = true;
            state.dragMode = "move-poly-point";
            state.shapeSnapshot = {
              shapeId: shape.id,
              vertexIndex: vertexIndex,
              points: shape.points.map(p => [p[0], p[1]]),
              startX: x,
              startY: y
            };
            redraw();
            return;
          }
        }
      }

      // Move / rotate whole shape
      state.dragging = true;
      if (state.currentTool === "select") {
        state.dragMode = "move";
        state.shapeSnapshot = JSON.parse(JSON.stringify(shape));
      } else if (state.currentTool === "rotate") {
        state.dragMode = "rotate";
        const center = getShapeCenter(shape);
        state.shapeSnapshot = {
          shapeId: shape.id,
          center: center,
          rotation: shape.rotation || 0,
          points: shape.type === "poly" ? shape.points.map(p => [p[0], p[1]]) : null
        };
        state.shapeSnapshot.startAngle = Math.atan2(y - center.y, x - center.x);
      }
      redraw();
    } else {
      state.selectedShapeId = null;
      state.dragging = false;
      state.dragMode = null;
      redraw();
    }
  }
}

function onMouseMove(e) {
  const { x, y } = getMousePos(e);

  if (state.drawing && (state.currentTool === "rect" || state.currentTool === "circle")) {
    redraw();
    drawPreview(x, y);
    return;
  }

  if (state.dragging && state.selectedShapeId != null &&
      (state.currentTool === "select" || state.currentTool === "rotate")) {
    const shape = state.shapes.find(s => s.id === state.selectedShapeId);
    if (!shape) return;

    const dx = x - state.dragStart.x;
    const dy = y - state.dragStart.y;

    if (state.dragMode === "move") {
      if (shape.type === "rect" || shape.type === "circle") {
        shape.cx = state.shapeSnapshot.cx + dx;
        shape.cy = state.shapeSnapshot.cy + dy;
      } else if (shape.type === "poly") {
        shape.points = state.shapeSnapshot.points.map(p => [p[0] + dx, p[1] + dy]);
      }
    } else if (state.dragMode === "rotate") {
      const center = state.shapeSnapshot.center;
      const startAngle = state.shapeSnapshot.startAngle;
      const newAngle = Math.atan2(y - center.y, x - center.x);
      const delta = newAngle - startAngle;

      if (shape.type === "rect") {
        shape.rotation = (state.shapeSnapshot.rotation || 0) + delta;
      } else if (shape.type === "poly") {
        shape.points = state.shapeSnapshot.points.map(p =>
          rotatePointAround(p[0], p[1], center.x, center.y, delta)
        );
      }
    } else if (state.dragMode === "resize-rect") {
      const rot = state.shapeSnapshot.rotation || 0;
      const opp = state.shapeSnapshot.opp;
      const newCorner = { x, y };

      const cx = (opp.x + newCorner.x) / 2;
      const cy = (opp.y + newCorner.y) / 2;

      const local = worldToLocal(newCorner.x, newCorner.y, cx, cy, rot);
      const halfW = Math.abs(local.x);
      const halfH = Math.abs(local.y);

      shape.cx = cx;
      shape.cy = cy;
      shape.w = Math.max(1, halfW * 2);
      shape.h = Math.max(1, halfH * 2);
      shape.rotation = rot;
    } else if (state.dragMode === "resize-circle") {
      const cx = state.shapeSnapshot.cx;
      const cy = state.shapeSnapshot.cy;
      const r = Math.sqrt((x - cx) * (x - cx) + (y - cy) * (y - cy));
      shape.cx = cx;
      shape.cy = cy;
      shape.r = Math.max(1, r);
    } else if (state.dragMode === "move-poly-point") {
      const index = state.shapeSnapshot.vertexIndex;
      const pts = state.shapeSnapshot.points;
      const ddx = x - state.shapeSnapshot.startX;
      const ddy = y - state.shapeSnapshot.startY;

      shape.points = pts.map((p, i) =>
        i === index ? [p[0] + ddx, p[1] + ddy] : [p[0], p[1]]
      );
    }

    redraw();
  }
}

function onMouseUp(e) {
  const { x, y } = getMousePos(e);

  if (state.drawing && (state.currentTool === "rect" || state.currentTool === "circle")) {
    state.drawing = false;
    finalizeShape(x, y);
    redraw();
    sendShapes();
    return;
  }

  if (state.dragging && (state.currentTool === "select" || state.currentTool === "rotate")) {
    state.dragging = false;
    state.dragMode = null;
    state.shapeSnapshot = null;
    sendShapes();
  }
}

function onContextMenu(e) {
  e.preventDefault();
  if (state.currentTool === "poly" && state.tempPoly.length >= 3) {
    const pts = state.tempPoly.map(p => [p.x, p.y]);
    state.shapes.push({
      id: state.nextShapeId++,
      type: "poly",
      points: pts,
      category: state.currentCategory
    });
    state.tempPoly = [];
    redraw();
    sendShapes();
  }
}

// ----------------- Creating shapes -----------------

function finalizeShape(x, y) {
  if (state.currentTool === "rect") {
    const w = x - state.dragStart.x;
    const h = y - state.dragStart.y;
    const cx = state.dragStart.x + w / 2;
    const cy = state.dragStart.y + h / 2;
    state.shapes.push({
      id: state.nextShapeId++,
      type: "rect",
      cx, cy,
      w: Math.abs(w),
      h: Math.abs(h),
      rotation: 0,
      category: state.currentCategory
    });
  } else if (state.currentTool === "circle") {
    const dx = x - state.dragStart.x;
    const dy = y - state.dragStart.y;
    const r = Math.sqrt(dx * dx + dy * dy);
    state.shapes.push({
      id: state.nextShapeId++,
      type: "circle",
      cx: state.dragStart.x,
      cy: state.dragStart.y,
      r,
      category: state.currentCategory
    });
  }
}

// ----------------- Server sync: initial restore -----------------

function getSketchIdSafe() {
  // tiny helper just to show it in status text
  return window.location.hash.slice(1).trim() || "unknown";
}

async function restoreSketchFromServer(sketchId) {
  const existing = await fetchSketch();
  if (!existing) return;

  const canvas = getCanvas();
  if (existing.canvas) {
    if (typeof existing.canvas.width === "number") {
      canvas.width = existing.canvas.width;
    }
    if (typeof existing.canvas.height === "number") {
      canvas.height = existing.canvas.height;
    }
  }

  resetState();
  if (Array.isArray(existing.shapes)) {
    state.shapes = existing.shapes;
    // compute nextShapeId to avoid ID collisions
    const maxId = existing.shapes.reduce(
      (m, s) => Math.max(m, typeof s.id === "number" ? s.id : 0),
      0
    );
    state.nextShapeId = maxId + 1;
  }

  redraw();
}

// ----------------- Init -----------------

async function init() {
  canvas = document.getElementById("pad");
  statusEl = document.getElementById("status");
  toolButtons = document.querySelectorAll("button[data-tool]");
  catButtons = document.querySelectorAll("button[data-cat]");
  clearBtn = document.getElementById("clear");
  saveBtn = document.getElementById("save");
  loadBtn = document.getElementById("load");
  loadInput = document.getElementById("loadInput");

  const sketchId = getOrCreateSketchId();
  setSketchId(sketchId);

  initDrawing(canvas);

  // Try to restore existing sketch from the server
  await restoreSketchFromServer(sketchId);

  setupToolButtons();
  setupCategoryButtons();
  setupClearButton();
  setupCanvasEvents();
  setupSaveLoad();

  setStatus(
    `Sketch: ${sketchId} — Tool: ${state.currentTool} — Category: ${CATEGORIES[state.currentCategory].label} — right-click to finish polygon`
  );
  redraw();
}

window.addEventListener("load", () => {
  init(); // async; we don't need to await it here
});
