from __future__ import annotations

import asyncio
import base64
import collections
import json
import os
import pickle
import sys
import time
from collections import deque

import cv2
import numpy as np

try:
    from websockets.asyncio.server import serve as ws_serve
except ImportError:
    from websockets import serve as ws_serve  # type: ignore

from websockets.exceptions import ConnectionClosed

# ── PyTorch + MediaPipe Task API ──────────────────────────────────────────────
import torch
import torch.nn as nn
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision

# ── CONFIGURATION ──────────────────────────────────────────────────────────────

_ROOT = os.path.dirname(os.path.abspath(__file__))

HOST        = os.environ.get("SIGN_LANGUAGE_HOST",  "0.0.0.0")
PORT        = int(os.environ.get("SIGN_LANGUAGE_PORT", "8765"))
MODEL_PATH  = os.environ.get("MODEL_PATH",  os.path.join(_ROOT, "sign_model.pth"))
LABELS_PATH = os.environ.get("LABELS_PATH", os.path.join(_ROOT, "labels.pkl"))
TASK_PATH   = os.path.join(_ROOT, "hand_landmarker.task")

SEQUENCE_LENGTH = 30
NUM_FEATURES    = 126   # 21 left-hand + 21 right-hand landmarks × 3 coords

STABILITY_FRAMES = 5
CONFIDENCE_THRESHOLD = 0.75
COOLDOWN_SECONDS = 0.8
VELOCITY_THRESHOLD = 0.012
INACTIVITY_FRAMES = 10

# ── MODEL DEFINITION (must match train_model.py exactly) ──────────────────────

class SignLanguageLSTM(nn.Module):
    def __init__(self, num_classes: int):
        super().__init__()
        hidden_dim = 256
        num_layers = 3
        self.lstm = nn.LSTM(
            input_size=NUM_FEATURES,
            hidden_size=hidden_dim,
            num_layers=num_layers,
            batch_first=True,
            dropout=0.3,
        )
        self.batch_norm = nn.BatchNorm1d(hidden_dim)
        self.classifier = nn.Sequential(
            nn.Linear(hidden_dim, 128),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(128, 64),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(64, num_classes),
        )

    def forward(self, x):
        lstm_out, _ = self.lstm(x)
        last_out  = lstm_out[:, -1, :]
        norm_out  = self.batch_norm(last_out)
        return self.classifier(norm_out)


# ── GLOBAL INFERENCE STATE (shared across connections) ────────────────────────

_model:         SignLanguageLSTM | None = None
_labels:        list[str]               = []
_device:        torch.device            = torch.device("cpu")
_detector:      vision.HandLandmarker | None = None


def load_model() -> None:
    """Load PyTorch model + labels + MediaPipe detector once at startup."""
    global _model, _labels, _device, _detector

    if not os.path.isfile(MODEL_PATH):
        print(f"[ERROR] Model not found: {MODEL_PATH}")
        sys.exit(1)

    if not os.path.isfile(LABELS_PATH):
        print(f"[ERROR] Labels not found: {LABELS_PATH}")
        sys.exit(1)

    if not os.path.isfile(TASK_PATH):
        print(f"[ERROR] Task model not found: {TASK_PATH}")
        sys.exit(1)

    with open(LABELS_PATH, "rb") as f:
        label_encoder = pickle.load(f)
    _labels = list(label_encoder.classes_)

    _device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    _model  = SignLanguageLSTM(len(_labels)).to(_device)
    _model.load_state_dict(torch.load(MODEL_PATH, map_location=_device, weights_only=True))
    _model.eval()

    # Initialize MediaPipe Task API HandLandmarker
    base_options = python.BaseOptions(model_asset_path=TASK_PATH)
    options = vision.HandLandmarkerOptions(
        base_options=base_options,
        num_hands=2,
        min_hand_detection_confidence=0.5,
        min_hand_presence_confidence=0.5,
        min_tracking_confidence=0.5
    )
    _detector = vision.HandLandmarker.create_from_options(options)

    print(f"[INFO] Model loaded — {len(_labels)} classes: {_labels}")
    print(f"[INFO] MediaPipe Task API initialized.")


# ── PREDICT FROM A SINGLE FRAME ───────────────────────────────────────────────

def _predict_from_buffer(frame_buffer: deque) -> tuple[str, float]:
    """Run the LSTM on the current frame buffer and return (label, confidence)."""
    if _model is None:
        return "", 0.0

    seq = torch.tensor(
        np.array([list(frame_buffer)], dtype=np.float32)
    ).to(_device)  # (1, 30, 126)

    with torch.no_grad():
        outputs      = _model(seq)
        probs        = torch.softmax(outputs, dim=1)[0]
        conf, top_idx = torch.max(probs, 0)

    label = _labels[top_idx.item()]
    if label == "NOTHING":
        return "", 0.0

    return label, round(float(conf) * 100.0, 1)


# ── SIGN SEGMENTER CLASS ──────────────────────────────────────────────────────

class SignSegmenter:
    def __init__(self):
        self.consecutive_count = 0
        self.last_prediction = None
        self.cooldown_until = 0.0
        self.prev_landmarks = None
        self.idle_count = 0
        self.sentence = []
        self.current_label = ""
        self.current_confidence = 0.0
        self.conf_buffer = deque(maxlen=5)

    def update(self, predicted_label: str | None, confidence: float, landmarks: np.ndarray, hands_present: bool = True) -> str | None:
        if not hands_present:
            self.consecutive_count = 0
            self.last_prediction = None
            self.current_label = ""
            self.current_confidence = 0.0
            self.conf_buffer.clear()
            return None

        self.conf_buffer.append(confidence)
        smoothed_conf = sum(self.conf_buffer) / len(self.conf_buffer)
        self.current_label = predicted_label or ""
        self.current_confidence = smoothed_conf
        committed_word = None

        if self.prev_landmarks is not None:
            velocity = np.mean(np.abs(landmarks - self.prev_landmarks))
            if velocity < VELOCITY_THRESHOLD:
                self.idle_count += 1
            else:
                self.idle_count = 0
        else:
            self.idle_count = 0

        self.prev_landmarks = landmarks.copy()

        if self.idle_count >= INACTIVITY_FRAMES:
            self.consecutive_count = 0
            self.last_prediction = None

        now = time.time()
        if now < self.cooldown_until:
            self.consecutive_count = 0
            self.last_prediction = None
            return None

        if predicted_label == "NOTHING" or not predicted_label:
            self.consecutive_count = 0
            self.last_prediction = predicted_label
            return None

        # Confidence is always in 0-100 scale in this server
        # CONFIDENCE_THRESHOLD = 0.75 → effective threshold is 75.0
        if smoothed_conf >= CONFIDENCE_THRESHOLD * 100.0:
            actual_conf = confidence / 100.0  # normalise to 0-1 for stability logic

            if predicted_label == self.last_prediction:
                self.consecutive_count += 1
            else:
                self.last_prediction = predicted_label
                self.consecutive_count = 1

            required_stability = STABILITY_FRAMES
            if actual_conf > 0.98:
                required_stability = max(3, STABILITY_FRAMES // 2)

            if self.consecutive_count >= required_stability:
                committed_word = predicted_label
                self.sentence.append(committed_word)
                self.cooldown_until = time.time() + COOLDOWN_SECONDS
                self.consecutive_count = 0
                self.last_prediction = None
                self.conf_buffer.clear()
                print(f"[COMMITTED] {committed_word}  →  Sentence: {' '.join(self.sentence)}", flush=True)

        return committed_word

    def get_sentence(self) -> str:
        return " ".join(self.sentence)

    def clear(self):
        self.sentence = []
        self.consecutive_count = 0
        self.last_prediction = None
        self.idle_count = 0
        self.conf_buffer.clear()

async def handle_client(websocket) -> None:
    frame_buffer: deque[np.ndarray] = deque(
        [np.zeros(NUM_FEATURES)] * SEQUENCE_LENGTH, maxlen=SEQUENCE_LENGTH
    )
    segmenter = SignSegmenter()

    print(f"[+] Client connected: {websocket.remote_address}")
    try:
        async for message in websocket:
            try:
                payload = json.loads(message)
            except json.JSONDecodeError:
                await websocket.send(json.dumps({"error": "invalid_json"}))
                continue

            if payload.get("type") == "clear":
                segmenter.clear()
                await websocket.send(json.dumps({"label": "", "confidence": 0.0, "sentence": ""}))
                continue

            if payload.get("type") != "frame":
                continue

            b64 = payload.get("data", "")
            if not b64:
                continue

            # Decode JPEG frame
            raw   = base64.b64decode(b64)
            arr   = np.frombuffer(raw, dtype=np.uint8)
            frame = cv2.imdecode(arr, cv2.IMREAD_COLOR)
            if frame is None:
                continue

            # 1. Flip frame to match mirrored training data
            frame = cv2.flip(frame, 1)

            # 2. MediaPipe Task API detection (using compatible constructor)
            mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
            detection_result = _detector.detect(mp_image)

            # Initialize empty landmarks
            lh = np.zeros(63)
            rh = np.zeros(63)
            hands_present = False

            if detection_result.hand_landmarks:
                hands_present = True
                for i, hand_landmarks in enumerate(detection_result.hand_landmarks):
                    # Handedness labels: 'Left' or 'Right'
                    label = detection_result.handedness[i][0].category_name
                    # MediaPipe handedness is often mirrored in camera views (opposite of viewer)
                    # For this project we match 'Left' (0) to lh and 'Right' (1) to rh if possible.
                    # Note: handedness index and category_name depend on the model/api.
                    hand_flat = np.array([[lm.x, lm.y, lm.z] for lm in hand_landmarks]).flatten()
                    
                    if label == 'Left':
                        lh = hand_flat
                    else:
                        rh = hand_flat

            landmarks = np.concatenate([lh, rh])
            frame_buffer.append(landmarks)

            # --- Inference and Segmenter Update ---
            label, conf = "", 0.0

            if hands_present:
                label, conf = _predict_from_buffer(frame_buffer)

                # Diagnostic Logging (Show top-3 probabilities if hands are present)
                if _model is not None:
                    seq = torch.tensor(np.array([list(frame_buffer)], dtype=np.float32)).to(_device)
                    with torch.no_grad():
                        outputs = _model(seq)
                        probs = torch.softmax(outputs, dim=1)[0]
                        top_vals, top_idxs = torch.topk(probs, min(3, len(_labels)))
                        top_preds = [f"{_labels[i]}: {v:.2f}" for v, i in zip(top_vals, top_idxs)]
                        print(f"[DEBUG] Top Predictions: {', '.join(top_preds)}", flush=True)

            # Always update segmenter state (handles hands_present=False internally)
            segmenter.update(label, conf, landmarks, hands_present)

            # Send response to client
            await websocket.send(
                json.dumps({
                    "label": segmenter.current_label,
                    "confidence": segmenter.current_confidence,
                    "sentence": segmenter.get_sentence()
                })
            )

    except ConnectionClosed:
        print(f"[-] Client disconnected: {websocket.remote_address}")


# ── MAIN ──────────────────────────────────────────────────────────────────────

async def main() -> None:
    load_model()

    async with ws_serve(
        handle_client,
        HOST,
        PORT,
        max_size=8 * 1024 * 1024,
        origins=None,
    ):
        print(
            f"[READY] Sign language WS listening on ws://{HOST}:{PORT}",
            flush=True,
        )
        await asyncio.Event().wait()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n[INFO] Server stopped by user.")
    except OSError as e:
        if e.errno == 10048:
            print(f"\n[ERROR] Port {PORT} is already in use. Please close any other running instances of this server or check for processes using this port.")
        else:
            print(f"\n[ERROR] OS Error: {e}")
    except Exception as e:
        print(f"\n[ERROR] Unexpected error: {e}")
    finally:
        if _detector is not None:
            print("[INFO] Closing MediaPipe detector...")
            _detector.close()
            _detector = None
