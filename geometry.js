// geometry.js
import { HANDLE_HIT_RADIUS } from "./config.js";

export function getRectCorners(s) {
  const rot = s.rotation || 0;
  const halfW = s.w / 2;
  const halfH = s.h / 2;
  const cosA = Math.cos(rot);
  const sinA = Math.sin(rot);

  const locals = [
    [-halfW, -halfH],
    [ halfW, -halfH],
    [ halfW,  halfH],
    [-halfW,  halfH]
  ];

  return locals.map(([lx, ly]) => ({
    x: s.cx + lx * cosA - ly * sinA,
    y: s.cy + lx * sinA + ly * cosA
  }));
}

export function worldToLocal(px, py, cx, cy, rot) {
  const dx = px - cx;
  const dy = py - cy;
  const cosR = Math.cos(rot);
  const sinR = Math.sin(rot);
  const lx = dx * cosR + dy * sinR;
  const ly = -dx * sinR + dy * cosR;
  return { x: lx, y: ly };
}

export function getCircleHandle(s) {
  return { x: s.cx + s.r, y: s.cy };
}

export function getShapeCenter(s) {
  if (s.type === "rect" || s.type === "circle") {
    return { x: s.cx, y: s.cy };
  } else if (s.type === "poly") {
    let sx = 0, sy = 0;
    for (const p of s.points) { sx += p[0]; sy += p[1]; }
    return { x: sx / s.points.length, y: sy / s.points.length };
  }
  return { x: 0, y: 0 };
}

export function rotatePointAround(px, py, cx, cy, angle) {
  const dx = px - cx;
  const dy = py - cy;
  const cosA = Math.cos(angle);
  const sinA = Math.sin(angle);
  const rx = cx + dx * cosA - dy * sinA;
  const ry = cy + dx * sinA + dy * cosA;
  return [rx, ry];
}

// Distance helpers
function dist2(x1, y1, x2, y2) {
  const dx = x1 - x2;
  const dy = y1 - y2;
  return dx * dx + dy * dy;
}

// Hit tests for shapes
export function hitRect(s, x, y) {
  const local = worldToLocal(x, y, s.cx, s.cy, s.rotation || 0);
  return Math.abs(local.x) <= s.w / 2 && Math.abs(local.y) <= s.h / 2;
}

export function hitCircle(s, x, y) {
  return dist2(x, y, s.cx, s.cy) <= s.r * s.r;
}

export function hitPoly(s, x, y) {
  const pts = s.points;
  if (!pts || pts.length < 3) return false;
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const xi = pts[i][0], yi = pts[i][1];
    const xj = pts[j][0], yj = pts[j][1];
    const intersect = ((yi > y) !== (yj > y)) &&
      (x < (xj - xi) * (y - yi) / ((yj - yi) || 1e-9) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

export function hitRectCorner(s, x, y) {
  const corners = getRectCorners(s);
  for (let i = 0; i < corners.length; i++) {
    if (dist2(x, y, corners[i].x, corners[i].y) <= HANDLE_HIT_RADIUS * HANDLE_HIT_RADIUS) {
      return { index: i, corners };
    }
  }
  return null;
}

export function hitCircleRadiusHandle(s, x, y) {
  const h = getCircleHandle(s);
  return dist2(x, y, h.x, h.y) <= HANDLE_HIT_RADIUS * HANDLE_HIT_RADIUS;
}

export function hitPolyVertex(s, x, y) {
  if (!s.points) return null;
  for (let i = 0; i < s.points.length; i++) {
    const px = s.points[i][0];
    const py = s.points[i][1];
    if (dist2(x, y, px, py) <= HANDLE_HIT_RADIUS * HANDLE_HIT_RADIUS) {
      return i;
    }
  }
  return null;
}
