# SkwelaDabaw

The offline-first campus, transit, and timetable companion for Davao City students.

## Overview

SkwelaDabaw provides student schedule organization, transit navigation, and campus utility tools in an offline-first mobile application built for Android and modern web browsers.

## Core Features

- **Offline Timetable & Schedule Management**: Class schedules, room assignments, instructor contacts, and day routines stored directly on device via IndexedDB.
- **Home Screen Widgets**: Glanceable next-class schedules and task progress directly on the Android home screen with automated background updates.
- **Davao Transit Directory**: Offline transit routes, stops, and maps to assist daily student commutes across Davao City.
- **Academic Tools**: Course deadline tracking, task management, and academic grade calculators.
- **QR Timetable Sharing**: Quick peer-to-peer schedule exchange via camera QR scan without network overhead.

## Tech Stack

- **Client**: React 19, TypeScript, Tailwind CSS
- **Mobile Runtime**: Capacitor 7 (Android)
- **Local Persistence**: Dexie.js (IndexedDB)
- **Mapping**: Leaflet, MapLibre GL

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Java JDK 17 or 21 (for Android native builds)
- Android SDK (API level 34+)

### Installation & Web Development

```bash
# Clone the repository
git clone https://github.com/kurzyrio/SkwelaDabaw.git
cd SkwelaDabaw

# Install dependencies
npm install

# Setup environment configuration
cp .env.example .env

# Run local development server
npm run dev

# Build production bundle
npm run build
```

### Android Native Build

```bash
# Copy sample Google services config
cp android/app/google-services.json.example android/app/google-services.json

# Compile web bundle
npm run build

# Synchronize native Android assets
npx cap sync android

# Build debug APK
cd android
./gradlew assembleDebug
```

The output APK will be generated at:
`android/app/build/outputs/apk/debug/app-debug.apk`

## Security & Transparency

SkwelaDabaw is published as source-available software to provide transparency, facilitate privacy verification, and welcome community peer review. Student timetable and personal task data remain on-device.

Contributions through GitHub Pull Requests for bug fixes, performance improvements, and documentation are welcome.

## License

This project is licensed under the **SkwelaDabaw Source-Available and Community Trust License**. See [LICENSE](LICENSE) for terms.

Official releases and application packages are distributed solely via official channels by kurzyrio. Unauthorized redistribution, cloning, or commercial app store publishing is prohibited.
