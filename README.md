# 🤟 BeyondWords: Real-Time Sign Language Interpretation

<p align="center">
  <img src="https://img.shields.io/badge/Status-Active-success?style=for-the-badge" alt="Status">
  <img src="https://img.shields.io/badge/License-MIT-blue?style=for-the-badge" alt="License">
  <img src="https://img.shields.io/badge/Version-1.0.0-orange?style=for-the-badge" alt="Version">
</p>

**BeyondWords** is a state-of-the-art video conferencing and sign language translation platform. It bridges communication gaps by providing real-time AI-powered sign language to speech/text translation within a collaborative meeting environment. Leveraging advanced deep learning and computer vision, it empowers individuals who use sign language to communicate seamlessly in digital spaces.

---

## ✨ Key Features

- **🤖 AI Gesture Recognition**: Uses **MediaPipe** and custom **LSTM (PyTorch)** models to translate hand gestures into words and sentences in real-time.
- **🎙️ Real-Time Communication**: High-quality video conferencing powered by **Socket.io** and **WebRTC (PeerJS)**.
- **🌍 Multi-Language Output**: Supports live translation results in multiple languages (Hindi, German, English).
- **📝 Live Transcription**: Integrated speech-to-text ensures accessibility for everyone.
- **🎨 Premium UI/UX**: Sleek, responsive interface built with **React**, **Tailwind CSS**, and **Framer Motion**.
- **🔒 Secure Architecture**: JWT-based authentication and secure signaling for private meetings.

---

## 🚀 Demo

> [!NOTE]
> Demo video coming soon! Check back for a full walkthrough of the platform in action.

---

## 🏗️ System Architecture

BeyondWords follows a decoupled, three-tier architecture designed for high performance and low-latency inference.

```mermaid
graph TD
    subgraph Frontend [React Client]
        A[Camera Stream] --> B[MediaPipe Landmark Extraction]
        B --> C[WebSocket Client]
        J[WebRTC PeerJS] <--> K[Video Rendering]
    end

    subgraph AI_Engine [Python Bridge]
        C <--> D[Sign Language WS Server]
        D --> E[LSTM Inference Pipeline]
        E --> F[Gesture Translation]
        F --> D
    end

    subgraph Backend [Node.js Server]
        G[Express API] <--> H[Socket.io Signaling]
        G <--> I[MongoDB / Mongoose]
        H <--> J
    end

    D -- "Translated Text" --> C
    C -- "Update Display" --> K
```

### Data Flow Diagram
1. **Input**: User captures video via the browser.
2. **Processing**: Landmarks are extracted locally or sent to the Python Bridge.
3. **Inference**: The LSTM model processes sequences of 30 frames to predict the gesture.
4. **Output**: The predicted text is broadcasted to all meeting participants via Socket.io.

---

## 🛠️ Tech Stack

### Frontend
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Framer Motion](https://img.shields.io/badge/Framer_Motion-0055FF?style=for-the-badge&logo=framer&logoColor=white)
![PeerJS](https://img.shields.io/badge/PeerJS-D16464?style=for-the-badge&logo=webrtc&logoColor=white)

### Backend
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)
![Socket.io](https://img.shields.io/badge/Socket.io-010101?style=for-the-badge&logo=socketdotio&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)

### AI & Machine Learning
![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)
![PyTorch](https://img.shields.io/badge/PyTorch-EE4C2C?style=for-the-badge&logo=pytorch&logoColor=white)
![MediaPipe](https://img.shields.io/badge/MediaPipe-00BFFF?style=for-the-badge&logo=google&logoColor=white)
![OpenCV](https://img.shields.io/badge/OpenCV-5C3EE8?style=for-the-badge&logo=opencv&logoColor=white)

---

## 🧠 Machine Learning Model

The heart of BeyondWords is a custom-trained **Long Short-Term Memory (LSTM)** neural network.

- **Feature Extraction**: MediaPipe Holistic provides 126 features per frame (21 landmarks per hand with X, Y, Z coordinates).
- **Sequence Processing**: The model analyzes a sliding window of **30 frames** to capture the temporal dynamics of signs.
- **Stability Logic**: Implements a `SignSegmenter` that requires consistent predictions over multiple frames before committing a word to the final sentence, ensuring accuracy despite ambient noise or minor hand jitters.

---

## 💻 Getting Started

### Prerequisites
- Node.js v18+
- Python 3.10+
- MongoDB instance (local or Atlas)

### 1. Installation

```bash
# Clone the repository
git clone https://github.com/MdTariq01/BeyondWords.git
cd BeyondWords

# Install Backend dependencies
cd server
npm install

# Install Frontend dependencies
cd ../client
npm install

# Setup Python Bridge
cd ../python_bridge
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Environment Setup
Create a `.env` file in the `server/` directory:
```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_secret_key
```

### 3. Run the Project
Use the provided PowerShell script or start components individually:

**Unified Start:**
```powershell
./start-dev.ps1
```

**Manual Start:**
- **Server**: `cd server && npm run dev` (Runs on port 5000)
- **Client**: `cd client && npm run dev` (Runs on port 5173)
- **Python Bridge**: `cd python_bridge && python sign_ws_server.py` (Runs on port 8765)

---

## 📁 Project Structure

```text
├── client/          # Vite + React Frontend
├── server/          # Node.js + Express Backend
├── python_bridge/   # ML Inference Server (WebSockets)
├── start-dev.ps1    # Development startup script
└── README.md        # Project documentation
```

---

## 🤝 Contributing

We welcome contributions! Whether it's improving the ML model, adding new sign support, or refining the UI.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📜 License

Distributed under the MIT License. See `LICENSE` for more information.

---

<p align="center">
  Built with ❤️ for a more inclusive world.
</p>
