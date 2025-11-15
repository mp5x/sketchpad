// storage.js
import { state, resetState } from "./state.js";
import { redraw, getCanvas } from "./drawing.js";

export function exportSketchJSON() {
  const canvas = getCanvas();
  const data = {
    canvas: { width: canvas.width, height: canvas.height },
    shapes: state.shapes,
    meta: {
      savedAt: new Date().toISOString()
    }
  };
  return JSON.stringify(data, null, 2);
}

export function downloadSketch(filename = "sketch.json") {
  const json = exportSketchJSON();
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function importSketchJSON(json) {
  const parsed = JSON.parse(json);
  const canvas = getCanvas();

  if (parsed.canvas) {
    canvas.width = parsed.canvas.width || canvas.width;
    canvas.height = parsed.canvas.height || canvas.height;
  }

  resetState();
  state.shapes = parsed.shapes || [];
  redraw();
}

export function hookLoadInput(loadButton, fileInput) {
  loadButton.addEventListener("click", () => {
    fileInput.click();
  });

  fileInput.addEventListener("change", () => {
    const file = fileInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      try {
        importSketchJSON(e.target.result);
      } catch (err) {
        alert("Failed to load sketch: " + err);
      }
    };
    reader.readAsText(file, "utf-8");
  });
}
