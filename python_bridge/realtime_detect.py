"""
realtime_detect.py — PyTorch Real-Time Sign Language Translator (Task API)
========================================================================
Loads the trained PyTorch LSTM model and runs real-time sign detection via webcam
using the modern MediaPipe Task API (Python 3.13 compatible).
"""

import os
import time
import pickle
import numpy as np
import cv2
import torch
import torch.nn as nn
from collections import deque

import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision

# ──────────────────────────────────────────────────────────────────────────────
# CONFIGURATION
# ──────────────────────────────────────────────────────────────────────────────

SEQUENCE_LENGTH = 30
NUM_FEATURES = 126

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "sign_model.pth")
LABELS_PATH = os.path.join(BASE_DIR, "labels.pkl")
TASK_PATH   = os.path.join(BASE_DIR, "hand_landmarker.task")

STABILITY_FRAMES = 5
CONFIDENCE_THRESHOLD = 0.75
COOLDOWN_SECONDS = 0.8
VELOCITY_THRESHOLD = 0.012
INACTIVITY_FRAMES = 10

# ──────────────────────────────────────────────────────────────────────────────
# MODEL DEFINITION
# ──────────────────────────────────────────────────────────────────────────────

class SignLanguageLSTM(nn.Module):
    def __init__(self, num_classes):
        super(SignLanguageLSTM, self).__init__()
        hidden_dim = 256
        num_layers = 3
        self.lstm = nn.LSTM(
            input_size=NUM_FEATURES,
            hidden_size=hidden_dim,
            num_layers=num_layers,
            batch_first=True,
            dropout=0.3
        )
        self.batch_norm = nn.BatchNorm1d(hidden_dim)
        self.classifier = nn.Sequential(
            nn.Linear(hidden_dim, 128),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(128, 64),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(64, num_classes)
        )
        
    def forward(self, x):
        lstm_out, _ = self.lstm(x)
        last_out = lstm_out[:, -1, :]
        norm_out = self.batch_norm(last_out)
        logits = self.classifier(norm_out)
        return logits

# ──────────────────────────────────────────────────────────────────────────────
# SIGN SEGMENTER CLASS
# ──────────────────────────────────────────────────────────────────────────────

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

    def update(self, predicted_label, confidence, landmarks, hands_present=True):
        if not hands_present:
            self.consecutive_count = 0
            self.last_prediction = None
            self.current_label = "NONE"
            self.current_confidence = 0.0
            self.conf_buffer.clear()
            return None

        self.conf_buffer.append(confidence)
        smoothed_conf = sum(self.conf_buffer) / len(self.conf_buffer)
        self.current_label = predicted_label or "NONE"
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

        if smoothed_conf >= CONFIDENCE_THRESHOLD:
            if predicted_label == self.last_prediction:
                self.consecutive_count += 1
            else:
                self.last_prediction = predicted_label
                self.consecutive_count = 1

            required_stability = STABILITY_FRAMES
            if smoothed_conf > 0.98:
                required_stability = max(3, STABILITY_FRAMES // 2)

            if self.consecutive_count >= required_stability:
                committed_word = predicted_label
                self.sentence.append(committed_word)
                self.cooldown_until = time.time() + COOLDOWN_SECONDS
                self.consecutive_count = 0
                self.last_prediction = None
                self.conf_buffer.clear()
                print(f"[COMMITTED] {committed_word}  →  Sentence: {' '.join(self.sentence)}")

        return committed_word

    def get_sentence(self):
        return " ".join(self.sentence)

    def get_stability_progress(self):
        if self.consecutive_count == 0: return 0.0
        return min(self.consecutive_count / STABILITY_FRAMES, 1.0)

    def is_in_cooldown(self):
        return time.time() < self.cooldown_until

    def clear_sentence(self):
        self.sentence = []
        self.consecutive_count = 0
        self.last_prediction = None
        self.idle_count = 0
        self.conf_buffer.clear()
        print("[INFO] Sentence cleared.")

# ──────────────────────────────────────────────────────────────────────────────
# HELPERS
# ──────────────────────────────────────────────────────────────────────────────

HAND_CONNECTIONS = [
    (0, 1), (1, 2), (2, 3), (3, 4),
    (0, 5), (5, 6), (6, 7), (7, 8),
    (0, 9), (9, 10), (10, 11), (11, 12),
    (0, 13), (13, 14), (14, 15), (15, 16),
    (0, 17), (17, 18), (18, 19), (19, 20),
    (5, 9), (9, 13), (13, 17)
]

def draw_hand_landmarks(frame, detection_result):
    if not detection_result.hand_landmarks:
        return
    h, w = frame.shape[:2]
    for hand_landmarks in detection_result.hand_landmarks:
        # Draw Connections
        for a, b in HAND_CONNECTIONS:
            pt1 = (int(hand_landmarks[a].x * w), int(hand_landmarks[a].y * h))
            pt2 = (int(hand_landmarks[b].x * w), int(hand_landmarks[b].y * h))
            cv2.line(frame, pt1, pt2, (0, 255, 0), 2)
        # Draw Joints
        for i, lm in enumerate(hand_landmarks):
            center = (int(lm.x * w), int(lm.y * h))
            cv2.circle(frame, center, 4, (0, 0, 255), -1 if i==0 else 2)

def draw_ui(frame, segmenter):
    h, w = frame.shape[:2]
    font = cv2.FONT_HERSHEY_SIMPLEX
    overlay = frame.copy()
    cv2.rectangle(overlay, (0, 0), (w, 80), (20, 20, 20), -1)
    cv2.addWeighted(overlay, 0.6, frame, 0.4, 0, frame)
    
    label = segmenter.current_label
    conf = segmenter.current_confidence
    
    if label == "NONE":
         status_text = "STATUS: NO HANDS DETECTED"
         status_color = (100, 100, 100)
    elif label == "NOTHING":
         status_text = "STATUS: IGNORING BACKGROUND"
         status_color = (150, 150, 150)
    elif conf > 0.3:
         status_text = f"detecting: {label.upper()} ({conf*100:.0f}%)"
         status_color = (255, 255, 255)
    else:
         status_text = "STATUS: WAITING..."
         status_color = (150, 150, 150)
    
    cv2.putText(frame, status_text, (20, 35), font, 0.7, status_color, 2, cv2.LINE_AA)
    cv2.putText(frame, "Press 'C' to clear | 'Q' to quit", (w - 320, 35), font, 0.6, (150, 150, 150), 1, cv2.LINE_AA)
    progress = segmenter.get_stability_progress()
    cv2.rectangle(frame, (20, 50), (320, 60), (50, 50, 50), -1)
    if progress > 0:
        cv2.rectangle(frame, (20, 50), (20 + int(300 * progress), 60), (0, 255, 100), -1)
    
    sentence = segmenter.get_sentence()
    sub_overlay = frame.copy()
    cv2.rectangle(sub_overlay, (0, h - 100), (w, h), (10, 10, 10), -1)
    cv2.addWeighted(sub_overlay, 0.8, frame, 0.2, 0, frame)
    if sentence:
        cv2.putText(frame, sentence, (50, h - 45), font, 1.2, (255, 255, 255), 2, cv2.LINE_AA)
    else:
        cv2.putText(frame, "Begin signing...", (50, h - 45), font, 0.8, (100, 100, 100), 1, cv2.LINE_AA)

# ── MAIN LOOP ──
def main():
    if not os.path.exists(MODEL_PATH) or not os.path.exists(LABELS_PATH) or not os.path.exists(TASK_PATH):
        print("[ERROR] Model/Labels/Task file missing.")
        return

    with open(LABELS_PATH, 'rb') as f:
        label_encoder = pickle.load(f)
    labels = label_encoder.classes_

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model = SignLanguageLSTM(len(labels)).to(device)
    model.load_state_dict(torch.load(MODEL_PATH, map_location=device, weights_only=True))
    model.eval()

    base_options = python.BaseOptions(model_asset_path=TASK_PATH)
    options = vision.HandLandmarkerOptions(base_options=base_options, num_hands=2)
    detector = vision.HandLandmarker.create_from_options(options)

    segmenter = SignSegmenter()
    frame_buffer = deque([np.zeros(NUM_FEATURES)]*SEQUENCE_LENGTH, maxlen=SEQUENCE_LENGTH)
    cap = cv2.VideoCapture(0)

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret: break
        frame = cv2.flip(frame, 1)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
        result = detector.detect(mp_image)
        
        lh, rh = np.zeros(63), np.zeros(63)
        hands_present = False
        if result.hand_landmarks:
            hands_present = True
            for i, h_lms in enumerate(result.hand_landmarks):
                hand_flat = np.array([[lm.x, lm.y, lm.z] for lm in h_lms]).flatten()
                if result.handedness[i][0].category_name == 'Left': lh = hand_flat
                else: rh = hand_flat
        
        landmarks = np.concatenate([lh, rh])
        frame_buffer.append(landmarks)

        pred_label, conf = None, 0.0
        if hands_present:
            input_seq = torch.tensor(np.array([list(frame_buffer)]), dtype=torch.float32).to(device)
            with torch.no_grad():
                out = model(input_seq)
                probs = torch.softmax(out, dim=1)[0]
                conf, top_idx = torch.max(probs, 0)
                pred_label = labels[top_idx.item()]
        
        segmenter.update(pred_label, float(conf), landmarks, hands_present)
        draw_hand_landmarks(frame, result)
        draw_ui(frame, segmenter)
        cv2.imshow("Sign Language Translator (Task API)", frame)

        key = cv2.waitKey(1) & 0xFF
        if key == ord('q'): break
        elif key == ord('c'): segmenter.clear_sentence()

    cap.release()
    cv2.destroyAllWindows()
    detector.close()

if __name__ == "__main__":
    main()
