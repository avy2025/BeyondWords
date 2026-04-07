# 🤟 BeyondWords: Real-Time Sign Language Interpretation

**BeyondWords** is a state-of-the-art video conferencing and sign language translation platform. It bridges communication gaps by providing real-time AI-powered sign language to speech/text translation within a collaborative meeting environment.

![BeyondWords Banner](https://img.shields.io/badge/BeyondWords-Sign_Language_AI-blue?style=for-the-badge&logo=mediapipe)
![Tech Stack](https://img.shields.io/badge/Stack-React_|_Node_|_Python-green?style=for-the-badge)

---

## ✨ Key Features

- **🤖 AI Sign Language Detection**: Leverages **MediaPipe** and **PyTorch (LSTM)** to recognize hand gestures and translate them into words/sentences in real-time.
- **🎙️ Real-Time Communication**: Seamless video conferencing powered by **Socket.io** and modern WebRTC patterns.
- **🌍 Multi-Language Support**: Supports live translation for various languages (Hindi, German, English).
- **📝 Live Transcription**: Integrated speech-to-text to ensure accessibility for all users.
- **🎨 Premium UI**: A modern, sleek, and responsive interface built with **React**, **Tailwind CSS**, and **Vite**.

---

## 🏗️ Project Architecture

The repository is organized into three main components:

| Component | Description | Tech Stack |
| :--- | :--- | :--- |
| **`client/`** | The React frontend application. Handles UI, video streams, and WebRTC. | Vite, React, Tailwind CSS |
| **`server/`** | Node.js backend for signaling, meeting management, and data synchronization. | Node.js, Express, Socket.io, Drizzle ORM |
| **`python_bridge/`** | The ML engine that processes hand landmarks and performs gesture inference. | Python, PyTorch, MediaPipe, OpenCV |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: v18.x or higher
- **Python**: 3.10+ (preferably 3.11/3.12)
- **Git**

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/MdTariq01/BeyondWords.git
   cd BeyondWords
   ```

2. **Setup the Client**:
   ```bash
   cd client
   npm install
   ```

3. **Setup the Server**:
   ```bash
   cd ../server
   npm install
   ```

4. **Setup the Python Bridge**:
   ```bash
   cd ../python_bridge
   python -m venv .venv
   .\.venv\Scripts\activate   # On Windows
   pip install -r requirements.txt
   ```

---

## 🛠️ Run the Project

For development, use the unified startup script provided in the root:

```powershell
./start-dev.ps1
```

This script will launch:
1. **Node.js API Server** on `http://localhost:5000`
2. **React Frontend** on `http://localhost:5173`
3. **Python WebSocket Bridge** on `localhost:8765`

---

## 🧠 Machine Learning Model

The sign language detection logic uses a **PyTorch LSTM model** trained on landmarks extracted by **MediaPipe Holistic**. 

- **Landmark Extraction**: Hand, pose, and face landmarks.
- **Inference**: High-frequency real-time sequence classification.
- **Stability**: Implements segmenter logic to ensure gestures are confirmed before and translated into sentences.

---

## 🤝 Contributing

Contributions are welcome! If you'd like to improve the model accuracy, add support for new languages, or enhance the UI/UX:

1. Fork the repo.
2. Create a new branch.
3. Push your changes.
4. Open a Pull Request.

---

---

*Built with ❤️ by the BeyondWords Team.*
