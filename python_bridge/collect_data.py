"""
collect_data.py — Sign Language Data Collection Script
======================================================
Uses MediaPipe Holistic to capture hand landmarks from webcam.
For each label, collects 30 sequences of 30 frames each.
Saves each frame's landmarks as a .npy file under MP_Data/{label}/{sequence}/{frame}.npy

Feature vector per frame:
  - Left hand:  21 landmarks × 3 coords = 63 values
  - Right hand: 21 landmarks × 3 coords = 63 values
  - Total: 126 values (flat numpy array)
  - If a hand is not detected, its 63 values are filled with zeros.
"""

import os
import time
import cv2
import sys
import argparse
import numpy as np
import mediapipe as mp
import mediapipe.python.solutions.holistic as mp_holistic
import mediapipe.python.solutions.drawing_utils as mp_drawing
import mediapipe.python.solutions.drawing_styles as mp_drawing_styles

# ──────────────────────────────────────────────────────────────────────────────
# CONFIGURATION
# ──────────────────────────────────────────────────────────────────────────────

# All sign labels to collect data for
LABELS = ["NOTHING", "HI", "WE", "ARE", "AT", "I", "T", "M", "HELLO", "THANK_YOU", "SORRY"]

NUM_SEQUENCES = 30       # Number of sequences per label
SEQUENCE_LENGTH = 30     # Number of frames per sequence
DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "MP_Data")

COUNTDOWN_SECONDS = 3    # Countdown before each sequence
PAUSE_BETWEEN_LABELS = 3 # Pause between different labels (seconds)

# ──────────────────────────────────────────────────────────────────────────────
# MEDIAPIPE SETUP
# ──────────────────────────────────────────────────────────────────────────────

mp_holistic = mp.solutions.holistic
mp_drawing = mp.solutions.drawing_utils
mp_drawing_styles = mp.solutions.drawing_styles


def init_holistic():
    """Initialize MediaPipe Holistic model with reasonable detection thresholds."""
    return mp_holistic.Holistic(
        min_detection_confidence=0.5,
        min_tracking_confidence=0.5,
        model_complexity=1
    )


# ──────────────────────────────────────────────────────────────────────────────
# LANDMARK EXTRACTION  (shared logic — must match train & detect scripts)
# ──────────────────────────────────────────────────────────────────────────────

def extract_landmarks(results):
    """
    Extract a flat 126-value numpy array from MediaPipe Holistic results.

    Layout:
      [0:63]   → left hand  (21 landmarks × 3)
      [63:126] → right hand (21 landmarks × 3)

    If a hand is not detected, its section is filled with zeros.
    """
    # Left hand: 21 landmarks × (x, y, z) = 63 values
    if results.left_hand_landmarks:
        left_hand = np.array([[lm.x, lm.y, lm.z]
                              for lm in results.left_hand_landmarks.landmark]).flatten()
    else:
        left_hand = np.zeros(21 * 3)  # 63 zeros

    # Right hand: 21 landmarks × (x, y, z) = 63 values
    if results.right_hand_landmarks:
        right_hand = np.array([[lm.x, lm.y, lm.z]
                               for lm in results.right_hand_landmarks.landmark]).flatten()
    else:
        right_hand = np.zeros(21 * 3)  # 63 zeros

    # Concatenate into a single 126-element vector
    return np.concatenate([left_hand, right_hand])


# ──────────────────────────────────────────────────────────────────────────────
# DRAWING HELPERS
# ──────────────────────────────────────────────────────────────────────────────

def draw_landmarks_on_frame(frame, results):
    """Draw left and right hand landmarks + connections on the frame."""
    if results.left_hand_landmarks:
        mp_drawing.draw_landmarks(
            frame,
            results.left_hand_landmarks,
            mp_holistic.HAND_CONNECTIONS,
            mp_drawing_styles.get_default_hand_landmarks_style(),
            mp_drawing_styles.get_default_hand_connections_style()
        )
    if results.right_hand_landmarks:
        mp_drawing.draw_landmarks(
            frame,
            results.right_hand_landmarks,
            mp_holistic.HAND_CONNECTIONS,
            mp_drawing_styles.get_default_hand_landmarks_style(),
            mp_drawing_styles.get_default_hand_connections_style()
        )


def put_centered_text(frame, text, y_pos, font_scale=1.2, color=(255, 255, 255),
                      thickness=3, bg_color=(0, 0, 0)):
    """Draw centered text with a background rectangle for readability."""
    font = cv2.FONT_HERSHEY_SIMPLEX
    text_size = cv2.getTextSize(text, font, font_scale, thickness)[0]
    text_x = (frame.shape[1] - text_size[0]) // 2
    text_y = y_pos

    # Background rectangle
    pad = 10
    cv2.rectangle(frame,
                  (text_x - pad, text_y - text_size[1] - pad),
                  (text_x + text_size[0] + pad, text_y + pad),
                  bg_color, -1)
    cv2.putText(frame, text, (text_x, text_y), font, font_scale, color, thickness)


# ──────────────────────────────────────────────────────────────────────────────
# DIRECTORY SETUP
# ──────────────────────────────────────────────────────────────────────────────

def create_directories():
    """Create the MP_Data/{label}/{sequence} directory tree."""
    for label in LABELS:
        for seq in range(NUM_SEQUENCES):
            dir_path = os.path.join(DATA_DIR, label, str(seq))
            os.makedirs(dir_path, exist_ok=True)
    print(f"[INFO] Directory tree created under: {DATA_DIR}")


# ──────────────────────────────────────────────────────────────────────────────
# MAIN COLLECTION LOOP
# ──────────────────────────────────────────────────────────────────────────────

def main():
    # ── ARGUMENT PARSING ─────────────────────────────────────────────────────
    parser = argparse.ArgumentParser(description='Sign Language Data Collection')
    parser.add_argument('--label', type=str, help='Specific label(s) to collect (comma-separated). e.g. "T" or "I,T"')
    args = parser.parse_args()

    # ── LABEL SELECTION ──────────────────────────────────────────────────────
    selected_labels = []

    if args.label:
        # Use labels from CLI arguments
        target_labels = [x.strip().upper() for x in args.label.split(',')]
        selected_labels = [l for l in LABELS if l in target_labels]
        if not selected_labels:
            print(f"[ERROR] None of the provided labels {target_labels} found in master list.")
            return
    else:
        # Use interactive menu
        print("\n" + "=" * 60)
        print("  SIGN LANGUAGE DATA COLLECTION MENU")
        print("=" * 60)
        print("0: [COLLECT ALL LABELS]")
        for i, label in enumerate(LABELS):
            print(f"{i+1}: {label}")
        print("=" * 60)
        
        choice = input("\nEnter the numbers of labels to collect (e.g., '6,7' for I and T) or '0' for all: ").strip()
        
        if choice == '0' or not choice:
            selected_labels = LABELS
        else:
            try:
                indices = [int(x.strip()) - 1 for x in choice.split(',')]
                selected_labels = [LABELS[i] for i in indices if 0 <= i < len(LABELS)]
            except (ValueError, IndexError):
                print("[ERROR] Invalid selection. Defaulting to ALL labels.")
                selected_labels = LABELS

    if not selected_labels:
        print("[ERROR] No valid labels selected. Exiting.")
        return

    # ── DIRECTORY SETUP ──────────────────────────────────────────────────────
    for label in selected_labels:
        for seq in range(NUM_SEQUENCES):
            dir_path = os.path.join(DATA_DIR, label, str(seq))
            os.makedirs(dir_path, exist_ok=True)
    print(f"[INFO] Directory tree prepared under: {DATA_DIR}")

    # Open webcam
    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print("[ERROR] Cannot open webcam. Check your camera connection.")
        return

    # Set camera resolution
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)

    holistic = init_holistic()

    print("\n[INFO] Starting data collection...")
    print(f"[INFO] Selected Labels: {selected_labels}")
    print(f"[INFO] {NUM_SEQUENCES} sequences × {SEQUENCE_LENGTH} frames per label")
    print(f"[INFO] Press Q at any time to quit early.\n")

    for label_idx, label in enumerate(selected_labels):
        print(f"\n{'='*50}")
        print(f"[LABEL {label_idx+1}/{len(selected_labels)}] Collecting data for: {label}")
        print(f"{'='*50}")

        for seq in range(NUM_SEQUENCES):
            # ── COUNTDOWN PHASE ──────────────────────────────────────────
            countdown_start = time.time()
            while True:
                ret, frame = cap.read()
                if not ret:
                    break
                frame = cv2.flip(frame, 1)  # Mirror for natural interaction

                # Process frame to show landmarks during countdown too
                frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                frame_rgb.flags.writeable = False
                results = holistic.process(frame_rgb)
                frame_rgb.flags.writeable = True

                draw_landmarks_on_frame(frame, results)

                # Calculate remaining countdown time
                elapsed = time.time() - countdown_start
                remaining = COUNTDOWN_SECONDS - elapsed

                if remaining <= 0:
                    break  # Countdown finished, start recording

                # Display countdown
                put_centered_text(frame, f"Get ready to sign: {label}",
                                  frame.shape[0] // 2 - 40,
                                  font_scale=1.0, color=(0, 255, 255),
                                  bg_color=(50, 50, 50))
                put_centered_text(frame, f"Starting in {int(remaining) + 1}...",
                                  frame.shape[0] // 2 + 30,
                                  font_scale=1.5, color=(0, 0, 255),
                                  bg_color=(50, 50, 50))

                # Show sequence counter
                info_text = f"Label: {label} | Sequence: {seq+1}/{NUM_SEQUENCES}"
                cv2.putText(frame, info_text, (10, 30),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.7, (200, 200, 200), 2)

                cv2.imshow("Sign Language Data Collection", frame)
                if cv2.waitKey(1) & 0xFF == ord('q'):
                    print("\n[INFO] Quit requested. Exiting...")
                    cap.release()
                    cv2.destroyAllWindows()
                    return

            # ── RECORDING PHASE ──────────────────────────────────────────
            print(f"  Recording sequence {seq+1}/{NUM_SEQUENCES} for '{label}'...", end=" ")

            for frame_num in range(SEQUENCE_LENGTH):
                ret, frame = cap.read()
                if not ret:
                    break
                frame = cv2.flip(frame, 1)

                # Convert to RGB for MediaPipe processing
                frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                frame_rgb.flags.writeable = False
                results = holistic.process(frame_rgb)
                frame_rgb.flags.writeable = True

                # Draw landmarks so user can see tracking is working
                draw_landmarks_on_frame(frame, results)

                # Extract and save landmarks
                landmarks = extract_landmarks(results)
                save_path = os.path.join(DATA_DIR, label, str(seq), f"{frame_num}.npy")
                np.save(save_path, landmarks)

                # Display recording indicator
                # Red pulsing dot to indicate recording
                dot_radius = 12 if frame_num % 10 < 5 else 8
                cv2.circle(frame, (frame.shape[1] - 30, 30), dot_radius, (0, 0, 255), -1)
                cv2.putText(frame, "RECORDING", (frame.shape[1] - 160, 35),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)

                # Show progress
                info_text = f"Label: {label} | Seq: {seq+1}/{NUM_SEQUENCES} | Frame: {frame_num+1}/{SEQUENCE_LENGTH}"
                cv2.putText(frame, info_text, (10, 30),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)

                # Progress bar at the bottom
                bar_width = int((frame_num + 1) / SEQUENCE_LENGTH * frame.shape[1])
                cv2.rectangle(frame, (0, frame.shape[0] - 10),
                              (bar_width, frame.shape[0]), (0, 255, 0), -1)

                cv2.imshow("Sign Language Data Collection", frame)
                if cv2.waitKey(1) & 0xFF == ord('q'):
                    print("\n[INFO] Quit requested. Exiting...")
                    cap.release()
                    cv2.destroyAllWindows()
                    return

            print("Done [OK]")

        # ── PAUSE BETWEEN LABELS ─────────────────────────────────────────
        if label_idx < len(LABELS) - 1:
            next_label = LABELS[label_idx + 1]
            print(f"\n  [OK] Finished '{label}'. Next sign: '{next_label}' in {PAUSE_BETWEEN_LABELS} seconds...")

            pause_start = time.time()
            while time.time() - pause_start < PAUSE_BETWEEN_LABELS:
                ret, frame = cap.read()
                if not ret:
                    break
                frame = cv2.flip(frame, 1)

                remaining = PAUSE_BETWEEN_LABELS - (time.time() - pause_start)
                put_centered_text(frame, f"Finished: {label} [OK]",
                                  frame.shape[0] // 2 - 60,
                                  font_scale=1.0, color=(0, 255, 0),
                                  bg_color=(50, 50, 50))
                put_centered_text(frame, f"Next sign: {next_label}",
                                  frame.shape[0] // 2,
                                  font_scale=1.0, color=(0, 255, 255),
                                  bg_color=(50, 50, 50))
                put_centered_text(frame, f"in {int(remaining) + 1} seconds...",
                                  frame.shape[0] // 2 + 60,
                                  font_scale=1.2, color=(255, 255, 255),
                                  bg_color=(50, 50, 50))

                cv2.imshow("Sign Language Data Collection", frame)
                if cv2.waitKey(1) & 0xFF == ord('q'):
                    print("\n[INFO] Quit requested. Exiting...")
                    cap.release()
                    cv2.destroyAllWindows()
                    return

    # ── DONE ─────────────────────────────────────────────────────────────────
    cap.release()
    cv2.destroyAllWindows()
    holistic.close()

    total_files = len(LABELS) * NUM_SEQUENCES * SEQUENCE_LENGTH
    print(f"\n{'='*50}")
    print(f"Data collection complete!")
    print(f"Total .npy files saved: {total_files}")
    print(f"Location: {DATA_DIR}")
    print(f"{'='*50}")


if __name__ == "__main__":
    main()
