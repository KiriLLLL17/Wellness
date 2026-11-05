# Wellness — step counter app

A small mobile pedometer built with **React Native + Expo** and **TypeScript**. It counts steps from the phone's accelerometer, estimates the distance walked, and keeps a history of past walks on the device.

## Features

- ▶️ Start / ⏹ stop a walking session
- 👣 Live step count and distance (metres)
- 🕒 Session duration
- 💾 History of sessions saved locally (AsyncStorage) — survives app restarts
- 🗑 Clear history

## How step detection works

The app reads the accelerometer every **100 ms** (`expo-sensors`) and compares each reading with the previous one:

```
change = |Δx| + |Δy| + |Δz|        (in g)
step   = change > 1.2  AND  ≥ 300 ms since the last step
distance += 0.7 m per step         (average step length)
```

The 300 ms minimum interval prevents one physical step from being counted twice.

This is a simple threshold heuristic, so the count depends on how the phone is held, and the 0.7 m step length is the same for everyone.

## Tech stack

| | |
|---|---|
| Framework | React Native 0.79, Expo SDK 53 |
| Language | TypeScript |
| Sensors | `expo-sensors` (Accelerometer) |
| Storage | `@react-native-async-storage/async-storage` |

## Run it locally

Requirements: [Node.js](https://nodejs.org/) (LTS) and either the **Expo Go** app on your phone or an Android emulator (Android Studio).

```bash
git clone https://github.com/KiriLLLL17/Wellness.git
cd Wellness
npm install
npm start
```

Then:
- **on a phone** — scan the QR code with Expo Go (the accelerometer works only on a real device);
- **on an emulator** — press `a` in the terminal.

## Project structure

```
├── App.tsx        # the whole app: sensor logic, history, UI
├── index.ts       # entry point
├── app.json       # Expo configuration
└── assets/        # icons and splash screen
```

## Possible improvements

- Use the built-in step counter (`Pedometer` from `expo-sensors`) and compare it with the threshold method
- Let the user set their own step length (or estimate it from height)
- Low-pass filter on the signal instead of a fixed threshold
- Charts of daily / weekly activity
- English / Russian UI switch (the UI is currently in Russian)
