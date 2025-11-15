// drawing.js
import { CATEGORIES, HANDLE_SIZE } from "./config.js";
import { state } from "./state.js";
import { getRectCorners, getCircleHandle } from "./geometry.js";

let canvas, ctx;

export function initDrawing(canvasEl) {
  canvas = canvasEl;
  ctx = canvas.getContext("2d");
}

export function redraw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawShapes();
}

function drawShapes() {
  for (const s of state.shapes) {
    ctx.save();
    ctx.lineWidth = (s.id === state.selectedShapeId) ? 2 : 1;

    const catKey = s.category || "other";
    const cat = CATEGORIES[catKey] || CATEGORIES.other;
    ctx.strokeStyle = cat.color;

    if (s.type === "rect") {
      ctx.beginPath();
      ctx.translate(s.cx, s.cy);
      ctx.rotate(s.rotation || 0);
      ctx.rect(-s.w / 2, -s.h / 2, s.w, s.h);
      ctx.stroke();
    } else if (s.type === "circle") {
      ctx.beginPath();
      ctx.arc(s.cx, s.cy, s.r, 0, Math.PI * 2);
      ctx.stroke();
    } else if (s.type === "poly") {
      if (s.points.length > 0) {
        ctx.beginPath();
        ctx.moveTo(s.points[0][0], s.points[0][1]);
        for (let i = 1; i < s.points.length; i++) {
          ctx.lineTo(s.points[i][0], s.points[i][1]);
        }
        ctx.closePath();
        ctx.stroke();
      }
    }

    ctx.restore();

    // Handles while selected
    if (s.id === state.selectedShapeId && state.currentTool === "select") {
      drawHandles(s);
    }
  }

  // Current polygon-in-progress
  if (state.currentTool === "poly" && state.tempPoly.length > 0) {
    ctx.beginPath();
    ctx.moveTo(state.tempPoly[0].x, state.tempPoly[0].y);
    for (let i = 1; i < state.tempPoly.length; i++) {
      ctx.lineTo(state.tempPoly[i].x, state.tempPoly[i].y);
    }
    ctx.stroke();
  }
}

function drawHandles(s) {
  ctx.save();
  ctx.fillStyle = "black";
  ctx.strokeStyle = "black";

  if (s.type === "rect") {
    const corners = getRectCorners(s);
    for (const c of corners) drawHandleBox(c.x, c.y);
  } else if (s.type === "circle") {
    const h = getCircleHandle(s);
    drawHandleBox(h.x, h.y);
  } else if (s.type === "poly") {
    if (s.points) {
      for (const p of s.points) drawHandleBox(p[0], p[1]);
    }
  }

  ctx.restore();
}

function drawHandleBox(x, y) {
  const half = HANDLE_SIZE / 2;
  ctx.beginPath();
  ctx.rect(x - half, y - half, HANDLE_SIZE, HANDLE_SIZE);
  ctx.fill();
}

export function drawPreview(x, y) {
  ctx.save();
  ctx.lineWidth = 1;
  ctx.setLineDash([5, 3]);
  if (state.currentTool === "rect") {
    const w = x - state.dragStart.x;
    const h = y - state.dragStart.y;
    const cx = state.dragStart.x + w / 2;
    const cy = state.dragStart.y + h / 2;
    ctx.translate(cx, cy);
    ctx.rect(-Math.abs(w) / 2, -Math.abs(h) / 2, Math.abs(w), Math.abs(h));
  } else if (state.currentTool === "circle") {
    const dx = x - state.dragStart.x;
    const dy = y - state.dragStart.y;
    const r = Math.sqrt(dx * dx + dy * dy);
    ctx.beginPath();
    ctx.arc(state.dragStart.x, state.dragStart.y, r, 0, Math.PI * 2);
  }
  ctx.stroke();
  ctx.restore();
  ctx.setLineDash([]);
}

export function getCanvas() {
  return canvas;
}
