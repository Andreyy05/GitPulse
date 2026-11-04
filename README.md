# ⚡ GitPulse — GitHub Commit Streak Monitor & Fuel

**GitPulse** is a lightweight, frameless desktop utility built with **Electron**, **React**, and **Tailwind CSS** (Vite). It helps developers monitor their daily GitHub activity, protect their commit streak with real-time countdowns and evening alerts, and generate witty or conventional commit messages on the fly.

---

## 🚀 Key Features

- **Frameless Floating Utility Window (380×570px):**
  - Modern dark slate aesthetic (`#090d16`), subtle glassmorphism, and accent glows.
  - Native window controls (minimize and close) with custom draggable titlebar region.
- **System Tray Integration:**
  - Minimizes seamlessly to the system tray on close or minimize.
  - Real-time tray icon status and context menu:
    - 🟢 Green icon & tooltip when you've pushed today.
    - 🔴 Red icon & tooltip when your streak is pending.
    - Quick actions: *Open Window*, *Refresh Activity Now*, *Always On Top*, *Quit*.
- **Real-Time Streak & Countdown:**
  - Queries GitHub Events API (`/users/{username}/events`) for today's `PushEvent` items.
  - Glowing Green badge with total commits pushed today and recent repositories.
  - Dynamic countdown to midnight local time (`HH:mm:ss`) showing exact time remaining before the day ends.
- **Automated Background Polling:**
  - Automatically re-checks GitHub activity every 15 minutes (configurable to 5, 15, 30, or 60 min).
  - Manual sync button with spinning feedback.
- **Evening 18:00 Streak Alert:**
  - Automatically triggers a native Electron desktop notification if it is past 6:00 PM (18:00) and you have not pushed any code yet today.
- **"Commit Fuel" Generator:**
  - Generates realistic Conventional Commits (`feat(auth): ...`, `fix(api): ...`) or witty developer humor (`fix: remove console.log from production`, `chore: appease linter deities`).
  - One-click copy to clipboard with instant confirmation.
- **Settings Modal:**
  - Easily configure GitHub username, background refresh interval, and notification toggles. Saved in `localStorage`.

---

## 🛠️ Tech Stack & Architecture

- **Desktop Framework:** [Electron 33](https://www.electronjs.org/)
- **Frontend:** [React 18](https://react.dev/) + [Vite 6](https://vitejs.dev/)
- **Styling:** [Tailwind CSS 3](https://tailwindcss.com/)
- **Icons:** [Lucide React](https://lucide.dev/)
- **Effects:** [Canvas Confetti](https://github.com/catdad/canvas-confetti)
- **Packaging:** [Electron Builder](https://www.electron.build/)

### IPC Security Architecture
- `contextIsolation: true`, `nodeIntegration: false`, and `sandbox: false`.
- Secure `preload.cjs` with `contextBridge` selectively exposing:
  - `window.electronAPI.minimize()`
  - `window.electronAPI.close()`
  - `window.electronAPI.updateTrayStatus(statusData)`
  - `window.electronAPI.sendNotification(notificationData)`
  - `window.electronAPI.openExternal(url)`
  - `window.electronAPI.onRefreshRequested(callback)`

---

## 📦 Installation & Setup

### Prerequisites
- **Node.js** >= 18 (Node 20 or 22 recommended)
- **npm** >= 9

### 1. Install Dependencies
```bash
cd GitPulse
npm install
```

### 2. Run in Development Mode
Starts the Vite dev server on port `5173` and boots Electron simultaneously with hot-reload:
```bash
npm run dev
```

### 3. Build for Production
To bundle the React frontend and package an executable installer for Windows (NSIS executable in `dist-electron/`):
```bash
npm run build
```
Or to generate an unpacked folder without packaging into an installer:
```bash
npm run pack
```

---

## ⚙️ Configuration

1. Click the **Settings ⚙️** icon in the header.
2. Enter your GitHub username (default: `Andreyy05`).
3. Set your preferred background refresh interval (e.g. 15 minutes).
4. Ensure **18:00 Streak Reminder** is enabled to receive desktop notifications when your streak is at risk.
5. Click **Save Settings**.

---

## 📄 License
MIT © Andrej Pavliščak
