"""
train_model.py — Enhanced PyTorch LSTM Model Training for Sign Language Recognition
================================================================================
Loads .npy landmark files from MP_Data/, implements data augmentation,
trains an improved LSTM model using PyTorch, and saves results.
"""

import os
import pickle
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report
from sklearn.preprocessing import LabelEncoder

# ──────────────────────────────────────────────────────────────────────────────
# CONFIGURATION
# ──────────────────────────────────────────────────────────────────────────────

LABELS = ["NOTHING", "HI", "WE", "ARE", "AT", "I", "T", "M", "HELLO", "THANK_YOU"]
NUM_SEQUENCES = 30
SEQUENCE_LENGTH = 30
NUM_FEATURES = 126

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "MP_Data")
MODEL_PATH = os.path.join(BASE_DIR, "sign_model.pth")
LABELS_PATH = os.path.join(BASE_DIR, "labels.pkl")
PLOT_PATH = os.path.join(BASE_DIR, "training_plot.png")

# ──────────────────────────────────────────────────────────────────────────────
# DATASET & AUGMENTATION
# ──────────────────────────────────────────────────────────────────────────────

class LandmarkDataset(Dataset):
    def __init__(self, data, labels, augment=False):
        self.data = torch.tensor(data, dtype=torch.float32)
        self.labels = torch.tensor(labels, dtype=torch.long)
        self.augment = augment

    def __len__(self):
        return len(self.data)

    def __getitem__(self, idx):
        x = self.data[idx]
        y = self.labels[idx]
        
        if self.augment:
            # Add small Gaussian noise to landmarks to help generalize
            # This is critical for subtle signs like 'T' and 'M'
            noise = torch.randn_like(x) * 0.002
            x = x + noise
            
        return x, y

# ──────────────────────────────────────────────────────────────────────────────
# ENHANCED MODEL DEFINITION
# ──────────────────────────────────────────────────────────────────────────────

class SignLanguageLSTM(nn.Module):
    def __init__(self, num_classes):
        super(SignLanguageLSTM, self).__init__()
        
        hidden_dim = 256
        num_layers = 3
        
        # LSTM Layers with Dropout
        self.lstm = nn.LSTM(
            input_size=NUM_FEATURES,
            hidden_size=hidden_dim,
            num_layers=num_layers,
            batch_first=True,
            dropout=0.3
        )
        
        self.batch_norm = nn.BatchNorm1d(hidden_dim)
        
        # Fully Connected Classifier
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
        # x: (batch, seq_len, features)
        lstm_out, _ = self.lstm(x)
        
        # Take the output of the last time step
        last_out = lstm_out[:, -1, :]  # (batch, hidden_dim)
        
        # Stability layers
        norm_out = self.batch_norm(last_out)
        logits = self.classifier(norm_out)
        
        return logits

# ──────────────────────────────────────────────────────────────────────────────
# UTILS
# ──────────────────────────────────────────────────────────────────────────────

class EarlyStopping:
    def __init__(self, patience=15, min_delta=0.0001):
        self.patience = patience
        self.min_delta = min_delta
        self.counter = 0
        self.best_loss = None
        self.early_stop = False

    def __call__(self, val_loss):
        if self.best_loss is None:
            self.best_loss = val_loss
        elif val_loss > self.best_loss - self.min_delta:
            self.counter += 1
            if self.counter >= self.patience:
                self.early_stop = True
        else:
            self.best_loss = val_loss
            self.counter = 0

# ──────────────────────────────────────────────────────────────────────────────
# MAIN TRAINING PROCESS
# ──────────────────────────────────────────────────────────────────────────────

def main():
    print("=" * 60)
    print("  ENHANCED SIGN LANGUAGE MODEL TRAINING (PyTorch)")
    print("=" * 60)

    # 1. Load Data
    print("[INFO] Loading sequences from MP_Data...")
    X = []
    y_raw = []

    for label in LABELS:
        label_dir = os.path.join(DATA_DIR, label)
        if not os.path.exists(label_dir):
            print(f"[WARN] Skipping {label}: Directory not found.")
            continue
        
        for seq_idx in range(NUM_SEQUENCES):
            window = []
            seq_path = os.path.join(label_dir, str(seq_idx))
            if not os.path.exists(seq_path): continue
            
            for frame_num in range(SEQUENCE_LENGTH):
                f_path = os.path.join(seq_path, f"{frame_num}.npy")
                if os.path.exists(f_path):
                    window.append(np.load(f_path))
                else:
                    window.append(np.zeros(NUM_FEATURES))
            
            X.append(window)
            y_raw.append(label)

    X = np.array(X, dtype=np.float32)
    print(f"[INFO] Dataset loaded. Total samples: {len(X)}")

    # 2. Encode Labels
    label_encoder = LabelEncoder()
    y = label_encoder.fit_transform(y_raw)
    num_classes = len(label_encoder.classes_)

    with open(LABELS_PATH, 'wb') as f:
        pickle.dump(label_encoder, f)

    # 3. Split Data
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.15, random_state=42, stratify=y
    )

    # 4. DataLoaders
    train_ds = LandmarkDataset(X_train, y_train, augment=True)
    test_ds = LandmarkDataset(X_test, y_test, augment=False)
    
    train_loader = DataLoader(train_ds, batch_size=16, shuffle=True)
    test_loader = DataLoader(test_ds, batch_size=16, shuffle=False)

    # 5. Setup Training
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model = SignLanguageLSTM(num_classes).to(device)
    
    criterion = nn.CrossEntropyLoss()
    optimizer = optim.Adam(model.parameters(), lr=0.001, weight_decay=1e-5)
    
    # Learning Rate Scheduler
    scheduler = optim.lr_scheduler.ReduceLROnPlateau(
        optimizer, mode='min', factor=0.5, patience=5
    )
    
    early_stop = EarlyStopping(patience=20)

    # 6. Training Loop
    epochs = 200
    t_losses, v_losses = [], []
    t_accs, v_accs = [], []

    print(f"[INFO] Starting training on {device}...")
    for epoch in range(epochs):
        model.train()
        train_loss, train_correct, train_total = 0, 0, 0
        
        for inputs, targets in train_loader:
            inputs, targets = inputs.to(device), targets.to(device)
            
            optimizer.zero_grad()
            outputs = model(inputs)
            loss = criterion(outputs, targets)
            loss.backward()
            optimizer.step()
            
            train_loss += loss.item() * inputs.size(0)
            _, preds = torch.max(outputs, 1)
            train_total += targets.size(0)
            train_correct += (preds == targets).sum().item()
            
        # Validation
        model.eval()
        val_loss, val_correct, val_total = 0, 0, 0
        with torch.no_grad():
            for inputs, targets in test_loader:
                inputs, targets = inputs.to(device), targets.to(device)
                outputs = model(inputs)
                loss = criterion(outputs, targets)
                val_loss += loss.item() * inputs.size(0)
                _, preds = torch.max(outputs, 1)
                val_total += targets.size(0)
                val_correct += (preds == targets).sum().item()
        
        # Calculate Epoch metrics
        epoch_t_loss = train_loss / train_total
        epoch_v_loss = val_loss / val_total
        epoch_t_acc = train_correct / train_total
        epoch_v_acc = val_correct / val_total
        
        t_losses.append(epoch_t_loss)
        v_losses.append(epoch_v_loss)
        t_accs.append(epoch_t_acc)
        v_accs.append(epoch_v_acc)
        
        if (epoch + 1) % 5 == 0 or epoch == 0:
            print(f"Epoch {epoch+1}/{epochs} | Loss: {epoch_t_loss:.4f} Acc: {epoch_t_acc:.4f} | Val Loss: {epoch_v_loss:.4f} Acc: {epoch_v_acc:.4f}")

        scheduler.step(epoch_v_loss)
        early_stop(epoch_v_loss)
        
        if early_stop.early_stop:
            print(f"[INFO] Early stopping at epoch {epoch+1}")
            break

    # 7. Finalize
    torch.save(model.state_dict(), MODEL_PATH)
    print(f"[SUCCESS] Model saved to {MODEL_PATH}")

    # Plot
    plt.figure(figsize=(12, 5))
    plt.subplot(1, 2, 1)
    plt.plot(t_losses, label='Train')
    plt.plot(v_losses, label='Val')
    plt.title('Loss')
    plt.legend()
    
    plt.subplot(1, 2, 2)
    plt.plot(t_accs, label='Train')
    plt.plot(v_accs, label='Val')
    plt.title('Accuracy')
    plt.legend()
    
    plt.savefig(PLOT_PATH)
    plt.close()
    print(f"[INFO] Plot saved to {PLOT_PATH}")

    # Report
    model.eval()
    y_true, y_pred = [], []
    with torch.no_grad():
        for inputs, targets in test_loader:
            outputs = model(inputs.to(device))
            _, preds = torch.max(outputs, 1)
            y_true.extend(targets.numpy())
            y_pred.extend(preds.cpu().numpy())
    
    print("\nClassification Report:")
    print(classification_report(y_true, y_pred, target_names=label_encoder.classes_))

if __name__ == "__main__":
    main()
