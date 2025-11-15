from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)

# For first tests you can allow all origins: CORS(app)
# but let's already restrict to the Render static site.
# We'll update this URL once we know the frontend URL.
ALLOWED_ORIGINS = ["https://sketchpad-frontend.onrender.com"]  # temporarily allow all; tighten later

CORS(app, origins=ALLOWED_ORIGINS)

# In-memory store: sketch_id -> latest payload
SKETCHES = {}

@app.route("/")
def health():
    return jsonify({"status": "ok", "sketches_count": len(SKETCHES)})

@app.route("/sketches/<sketch_id>", methods=["GET"])
def get_sketch(sketch_id):
    data = SKETCHES.get(sketch_id)
    return jsonify(data)

@app.route("/sketches/<sketch_id>", methods=["POST"])
def upsert_sketch(sketch_id):
    try:
        payload = request.get_json(force=True, silent=False)
    except Exception as e:
        return jsonify({"error": "invalid json", "detail": str(e)}), 400

    SKETCHES[sketch_id] = payload
    return jsonify({"ok": True})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000)

