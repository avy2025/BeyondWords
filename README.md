# 🤟 BeyondWords: The Universal & Inclusive Communication Platform

<p align="center">
  <img src="https://img.shields.io/badge/Status-Active-success?style=for-the-badge" alt="Status">
  <img src="https://img.shields.io/badge/Accessibility-Premium-gold?style=for-the-badge" alt="Accessibility">
  <img src="https://img.shields.io/badge/Version-1.2.0-orange?style=for-the-badge" alt="Version">
  <img src="https://img.shields.io/badge/License-MIT-blue?style=for-the-badge" alt="License">
</p>

**BeyondWords** is a state-of-the-art, AI-powered video conferencing platform designed to dissolve communication barriers for *everyone*. Whether you are deaf, dumb, blind, or simply speak a different language, BeyondWords provides the tools to connect seamlessly. 

By integrating real-time sign language interpretation, live universal subtitles, and a voice-controlled command center, we ensure that digital spaces are truly inclusive.

---

## ✨ Key Pillars

### 🤟 Real-Time Sign Language Interpretation
Bridge the gap between visual sign language and spoken words.
- **AI Gesture Recognition**: Uses **MediaPipe** and custom **LSTM (PyTorch)** models to translate hand gestures into text and speech in real-time.
- **Sentence Construction**: Intelligent `SignSegmenter` logic builds coherent sentences from fluent hand movements.

### 🌍 Live Universal Subtitles
Break language barriers with instant, high-accuracy translation.
- **Hindi to English**: Live transcription and translation for Hindi speakers.
- **German to English**: Seamless subtitles for German dialogue.
- **Bi-Directional Layers**: Participants can choose their own "Linguistic Layer" for personalized accessibility.

### 🎓 Gamified Learning Hub
Master new forms of dialogue through an interactive, cognitive-focused curriculum.
- **Sign Language Mastery**: Learn to communicate with others using your hands.
- **German Philology**: Deep dive into German grammar and vocabulary.
- **Nuance Games**: Cognitive exercises designed to sharpen linguistic and contextual understanding.
- **Progression System**: Earn XP, level up your rank, and unlock philological achievements.

### 🎙️ Voice AI Command Center ("Mr. Pineapple")
A fully voice-integrated experience for those with visual impairments or hands-busy situations.
- **Wake-Word Activation**: Simply say *"Mr. Pineapple"* to wake your personal assistant.
- **Intelligent Scheduling**: *"Mr. Pineapple, schedule a meeting for 3 PM"* — automate your workflow with voice commands.
- **Meeting Control**: Join rooms, leave meetings, or send chat messages using only your voice.

---

## 🏗️ System Architecture

BeyondWords is built on a high-performance, decoupled architecture to ensure low-latency AI inference and crystal-clear communication.

```mermaid
graph TD
    subgraph Frontend [React Client Cluster]
        A[Camera Stream] --> B[MediaPipe Landmark Extraction]
        B --> C[WebSocket Client]
        K[Video Rendering] <--> J[WebRTC PeerJS]
        L[Voice Agent Layer] --> M[Web Speech API]
        C -- "Subtitles" --> K
    end

    subgraph AI_Bridge [Python Inference Engine]
        C <--> D[WS Server]
        D --> E[LSTM Inference Pipeline]
        E --> F[Gesture Translation]
        F --> D
    end

    subgraph Backend [Node.js Command Center]
        G[Express API] <--> H[Socket.io Signaling]
        G <--> I[MongoDB / Cloud Atlas]
        H <--> J
    end

    D -- "Translated Tokens" --> C
```

---

## 🛠️ Tech Stack

### Frontend & UI
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Framer Motion](https://img.shields.io/badge/Framer_Motion-0055FF?style=for-the-badge&logo=framer&logoColor=white)
![PeerJS](https://img.shields.io/badge/PeerJS-D16464?style=for-the-badge&logo=webrtc&logoColor=white)

### Intelligence & Translation
![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)
![PyTorch](https://img.shields.io/badge/PyTorch-EE4C2C?style=for-the-badge&logo=pytorch&logoColor=white)
![MediaPipe](https://img.shields.io/badge/MediaPipe-00BFFF?style=for-the-badge&logo=google&logoColor=white)
![OpenCV](https://img.shields.io/badge/OpenCV-5C3EE8?style=for-the-badge&logo=opencv&logoColor=white)
![Web Speech API](https://img.shields.io/badge/Web_Speech_API-FF6F00?style=for-the-badge&logo=google-chrome&logoColor=white)

### Backend & Real-Time
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)
![Socket.io](https://img.shields.io/badge/Socket.io-010101?style=for-the-badge&logo=socketdotio&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)

---

## 🧠 Core Intelligence

### Sign Language Pipeline
Our custom **LSTM** model processes sequences of 30 frames (126 landmarks per frame) to capture the temporal signatures of signs. The `SignSegmenter` ensures accuracy by filtering out noise and confirming gestures before finalizing text output.

### Universal Translation
BeyondWords leverages advanced speech synthesis and recognition to provide real-time subtitles. 
- **Live CC**: Toggle subtitles and select between **Hindi** or **German** layers.
- **Audio Feedback**: TTS (Text-to-Speech) allows the system to talk back, supporting users with visual impairments.

---

## 🎙️ Command Your World: Mr. Pineapple
To activate the voice agent, say **"Mr. Pineapple"** followed by:
- *"Start a meeting"*
- *"Join room [room-code]"*
- *"Schedule a meeting for tomorrow at 4 PM"*
- *"Send message Hello everyone"*

---

## 💻 Getting Started

### 1. Installation

```bash
# Clone the repository
git clone https://github.com/MdTariq01/BeyondWords.git
cd BeyondWords

# Install Backend
cd server && npm install

# Install Frontend
cd ../client && npm install

# Setup Python Bridge
cd ../python_bridge
python -m venv .venv
source .venv/bin/activate # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Run the Platform
**Unified Startup (PowerShell):**
```powershell
./start-dev.ps1
```

**Individual Components:**
- **Server**: `cd server && npm run dev` (Port 5000)
- **Client**: `cd client && npm run dev` (Port 5173 / 3000)
- **Python ML Server**: `cd python_bridge && python sign_ws_server.py` (Port 8765)

---

## 📁 Project Structure

```text
├── client/          # Vite + React Frontend (Inclusivity & UI Layer)
├── server/          # Node.js + Express Backend (Signaling & Auth)
├── python_bridge/   # ML Inference Server (Sign Language Processing)
├── start-dev.ps1    # Development automation script
└── README.md        # Comprehensive documentation
```

---

<p align="center">
  Built with ❤️ by the BeyondWords Team for a more inclusive future.
</p>
