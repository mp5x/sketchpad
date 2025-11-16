// bridge.js
// Handles communication between the browser sketchpad and the central backend API.

import { BASE } from "./config.js";
import { state } from "./state.js";
import { getCanvas } from "./drawing.js";

let SKETCH_ID = null;

/**
 * Set the active sketch ID.
 * Typically comes from the URL hash (e.g. #client-001).
 */
export function setSketchId(id) {
  SKETCH_ID = id;
}

/**
 * Get the current sketch ID.
 */
export function getSketchId() {
  return SKETCH_ID;
}

/**
 * Send the current sketch state (canvas + shapes) to the backend.
 * Called after editing actions (draw, move, rotate, resize, etc.).
 */
export function sendShapes() {
  if (!SKETCH_ID) {
    console.warn("No sketch ID set, not sending.");
    return;
  }

  const canvas = getCanvas();
  if (!canvas) {
    console.warn("No canvas available, not sending.");
    return;
  }

  const payload = {
    time: new Date().toISOString(),
    canvas: {
      width: canvas.width,
      height: canvas.height
    },
    shapes: state.shapes
  };

  fetch(`${BASE}/sketches/${encodeURIComponent(SKETCH_ID)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  }).catch(err => {
    console.warn("Send error:", err);
  });
}

/**
 * (Optional) Fetch the current sketch from the backend.
 * Not strictly required for the live one-way flow, but useful if you
 * want the front-end to reload an existing sketch from the server.
 */
export async function fetchSketch() {
  if (!SKETCH_ID) {
    console.warn("No sketch ID set, not fetching.");
    return null;
  }

  try {
    const res = await fetch(`${BASE}/sketches/${encodeURIComponent(SKETCH_ID)}`, {
      method: "GET"
    });
    if (!res.ok) {
      console.warn("Fetch sketch failed with status", res.status);
      return null;
    }
    const data = await res.json();
    return data; // { canvas, shapes, ... } or null
  } catch (err) {
    console.warn("Fetch sketch error:", err);
    return null;
  }
}
