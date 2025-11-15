// bridge.js
import { BASE } from "./config.js";
import { state } from "./state.js";
import { getCanvas } from "./drawing.js";

export function sendShapes() {
  const canvas = getCanvas();
  const payload = {
    time: new Date().toISOString(),
    canvas: { width: canvas.width, height: canvas.height },
    shapes: state.shapes
  };

  return fetch(BASE + "/from_browser", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  }).catch(err => {
    console.warn("Send error:", err);
  });
}
