# SkwelaDabaw 🎓🚌
**The Offline-First Campus, Transit & Timetable Companion for Davao City Students**

SkwelaDabaw is an academic and urban transit companion engineered specifically for college and university students across Davao City — including Ateneo de Davao University, University of Southeastern Philippines, University of Mindanao, University of the Immaculate Conception, San Pedro College, Davao Doctors College, Holy Cross of Davao College, UP Mindanao, and Mapua Malayan Colleges Mindanao.

The platform operates as a cohesive, three-tier ecosystem uniting a high-performance **Android Native & Web PWA Client**, a public **Web Distribution & API Gateway**, and a cloud-connected **Web Admin Panel**.

---

## 🏛️ Ecosystem Architecture & Platform Workflow

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                               SKWELADABAW UNIFIED ECOSYSTEM                            │
└────────────────────────────────────────────────────────────────────────────────────────┘

    [ STUDENT CLIENTS ]                                   [ PUBLIC WEB & GATEWAY ]
  ┌──────────────────────────────────────┐               ┌───────────────────────────────┐
  │  Android Native App (Capacitor 7)    │               │  Public Website               │
  │  - React 18, TypeScript 5, Tailwind  │               │  (Website/index.php)          │
  │  - Offline Dexie IndexedDB Database  │               │  - Landing & Feature Showcase │
  │  - Home Screen Widgets (All Sizes)   │               │  - Direct APK Downloads       │
  │  - Ongoing Status Bar Service        │               │  - Transparency & Changelog   │
  └──────────────────┬───────────────────┘               └───────────────┬───────────────┘
                     │                                                   │
                     ├─────────────────────────┬─────────────────────────┤
                     │                         │                         │
                     ▼                         ▼                         ▼
           [ LOCAL & OFFLINE ]           [ API GATEWAY ]         [ CLOUD BACKEND ]
          ┌─────────────────────┐      ┌─────────────────┐     ┌──────────────────┐
          │ Dexie.js (IndexedDB)│      │ Website/api/    │     │ Firebase Cloud   │
          │ - Class timetables  │      │ - proxy.php     │     │ - Auth accounts  │
          │ - Day routines      │      │ - dibs_proxy.php│     │ - Cloud backups  │
          │ - Task manager      │      │ - report.php    │     │ - Community chat │
          │ - Davao Jeep routes │      │ - feedback.php  │     │ - Announcements  │
          │ - Davao Bus stops   │      │ - user-status   │     │ - Security rules │
          └─────────────────────┘      └────────┬────────┘     └────────┬─────────┘
                                                │                       │
                                                ▼                       ▼
                                       ┌──────────────────────────────────────────┐
                                       │             WEB ADMIN PANEL              │
                                       │             (Website/admin/)             │
                                       │  - Real-Time Firestore REST Bridge       │
                                       │  - Student User Management & Sanctions   │
                                       │  - Live Community Chat Moderation        │
                                       │  - Emergency & Campus Announcements      │
                                       │  - In-App Versioning & APK OTA Releases  │
                                       │  - Feedback Analytics & System Audit Logs│
                                       └──────────────────────────────────────────┘
```

---

## 📱 Tier 1: The Student Client (Android App & Web PWA)

### 1. Offline-First Academic Core
- **Dexie.js / IndexedDB Storage**: Course timetables, instructor details, rooms, assignment deadlines, Davao PUJ routes, and emergency contacts are written directly to on-device storage. The academic cockpit requires zero internet connection.
- **QR Code Timetable Sharing**: Students can instantly export their timetable as a dense matrix QR code or scan a peer's schedule via the device camera to import it in one second without server round-trips.
- **Philippine GWA & QPI Calculator**: Supports standard 1.00–5.00 grading and Ateneo de Davao 4.0 QPI scale calculations with honors projections.

### 2. Native Android Integration & Automation
- **Real-Time Home Screen Widgets**:
  - Available in **Small 2x2**, **Medium 4x2**, **Large 4x4**, **Tasks 4x2**, and **Skwela Unified** dimensions.
  - Powered by `WidgetScheduleHelper.java`: dynamically calculates current vs next classes on-device using local system time.
  - Automatically schedules transition alarms via Android `AlarmManager` (`setExactAndAllowWhileIdle`) so the home screen updates the exact minute a class starts or concludes, even while the app is closed.
- **Unremovable Class Status Bar Service**:
  - Powered by `SkwelaOngoingService.java`: special-use foreground service presenting a glanceable class badge in the notification shade.
  - Supports 5 customizable color themes: `midnight`, `emerald`, `ocean`, `sunset`, and `nordic`.
  - Immune to task swiping and Recent Apps dismissal.
- **Capacitor Bridge (`WidgetBridgePlugin.java`)**:
  - Seamlessly marshals raw schedule arrays (`all_schedules_json`), task queues, and theme tokens from the React frontend into native Android `SharedPreferences`.

---

## 🌐 Tier 2: Public Website & Serverless API Gateway (`Website/`)

### 1. Public Web Portal
- **Main Landing Page (`Website/index.php`)**: Features overview, live Davao bus route explorer, and student guide.
- **Direct APK Distribution (`Website/download.php`)**: Provides official direct downloads for compiled Android APK releases (`app-debug.apk` and release builds).
- **Transparency & Legal (`about.php`, `privacy.php`, `terms.php`, `transparency.php`)**: Details local storage guarantees, Republic Act 10963 student fare discount protections, and data minimization protocols.

### 2. Secure API Gateway (`Website/api/`)
The mobile client securely interacts with serverless endpoints to perform privileged operations:
- **`proxy.php` (Gemini Vision AI Schedule Scanner)**: Accepts photos of registration cards or curriculum checklists, applies client IP rate limiting via `rate_limiter.php`, and talks to Google Gemini models with server-side keys without exposing secrets inside the mobile APK.
- **`dibs_proxy.php` (Davao Bus Live Telemetry)**: Connects to Davao City transit feeds to deliver live vehicle GPS coordinates, bearings, and velocity to the in-app bus tracking map.
- **`feedback.php` & `report.php`**: Collects student bug reports, suggestions, and chat moderation flags into the administrative review queue.
- **`user-status.php`**: Verifies account standing and active suspensions on startup.

---

## 🛡️ Tier 3: Web Admin Panel (`Website/admin/`)

The Admin Panel provides operational control, user safety enforcement, and content management for the student platform. It interfaces with Firebase Firestore via a dedicated REST bridge (`firestore.php`).

### Admin Modules & Capabilities:

| Module | File | Operational Workflow |
| :--- | :--- | :--- |
| **System Dashboard** | `index.php` | Real-time overview of active student accounts, pending reports, rate-limiter health, and Gemini API quota verification. |
| **User Management** | `users.php`, `user-details.php` | Review student profiles, inspect cloud-synced course lists, assign administrative roles, issue warnings, or enforce temporary and permanent account suspensions. |
| **Chat Moderation** | `chats.php`, `moderation.php` | Real-time monitoring of the Student Community Chat. Administrators can delete harmful messages, clear channels, and silence repeat offenders. |
| **Reports Resolution** | `reports.php` | Investigates student-submitted flags concerning abusive content, harassment, or fraudulent timetable imports. |
| **Campus Announcements** | `announcements.php` | Broadcasts official campus alerts, holiday notices, and weather suspension bulletins directly to all active student devices via Firestore listeners. |
| **App Updates & Releases** | `changelog.php` | Manages app version codes, release notes, and download targets. When an update is published, `updateService.ts` prompts students with an in-app update modal. |
| **Feedback Analytics** | `feedback.php` | Triages student suggestions, bug submissions, and client diagnostic payloads. |
| **Audit Logs** | `logs.php` | Immutable log of administrative actions ensuring transparency and security. |

---

## 🔄 End-to-End Workflow Examples

### Workflow A: Offline Schedule Management & Native Android Widgets
1. **User Mutation**: Student creates or imports a class schedule in `ScheduleManager.tsx`.
2. **Local Persistence**: Schedule is committed to Dexie IndexedDB table `schedules`.
3. **Bridge Dispatch**: `widgetService.ts` serializes the full timetable array into `all_schedules_json` and invokes `WidgetBridge.setWidgetData()`.
4. **Native Storage**: `WidgetBridgePlugin.java` persists the data into `SkwelaWidgetPrefs` and triggers `WidgetScheduleHelper.evaluateAndUpdateAllWidgets()`.
5. **Widget Refresh**: Native RemoteViews for Small, Medium, Large, and Unified widgets update immediately.
6. **Alarm Scheduling**: An exact transition alarm is scheduled for the next class boundary. Even when the student turns off the screen and puts the phone in their pocket, the widget updates on time.

### Workflow B: AI Registration Card Scanning
1. **Capture**: Student snaps a photo of their paper enrollment assessment form inside `ScheduleImportModal.tsx`.
2. **Gateway Upload**: Image is posted to `Website/api/proxy.php`.
3. **AI Extraction**: `proxy.php` validates origin and rate limits, passes the payload to Google Gemini Vision, and receives structured course codes, schedules, and room numbers.
4. **Review & Save**: Student reviews the parsed schedule in the interactive verification screen and saves it to their device.

### Workflow C: Weather Suspension Broadcast
1. **Admin Action**: City or university authorities announce a class suspension.
2. **Broadcast Dispatch**: Administrator logs into `Website/admin/announcements.php` and posts a high-priority alert.
3. **Cloud Sync**: The announcement is saved to the Firestore `announcements` collection.
4. **Client Reception**: The student app receives the real-time push, displaying the alert prominently on the student dashboard.

---

## 🛠️ Building & Running the Project

### Prerequisites
- Node.js 18+ and npm
- Java JDK 17 or JDK 21
- Android SDK installed (`platforms/android-34` or `platforms/android-36`)
- PHP 8.1+ with cURL and OpenSSL extensions enabled (for `Website/` hosting)

### 1. Web Application Development
```bash
# Clone the repository
git clone https://github.com/KurzIsRio/SkwelaDabaw.git
cd SkwelaDabaw

# Install dependencies
npm install

# Setup environment configuration
cp .env.example .env

# Run local development server
npm run dev

# Build production web bundle
npm run build
```

### 2. Android Native Build (Capacitor)
```bash
# 1. Copy sample google-services config (if using Firebase)
cp android/app/google-services.json.example android/app/google-services.json

# 2. Compile web bundle
npm run build

# 3. Sync web assets into Android project
npx cap sync android

# 4. Assemble Debug APK
cd android
.\gradlew.bat assembleDebug
```
The compiled Android package is located at:
`android/app/build/outputs/apk/debug/app-debug.apk`

---

## 🔒 Transparency, Security & Contributions

- **Trust Through Transparency**: SkwelaDabaw source code is publicly accessible for independent security, privacy, and code audits by students and developers.
- **Data Minimization Guarantee**: Timetables, notes, schedules, and custom transit pins remain stored on-device via Dexie IndexedDB.
- **Contributions**: Pull Requests for bug fixes, performance improvements, and documentation enhancements are warmly welcomed. Please ensure changes follow existing architecture and code guidelines.

---

## 📜 License & Distribution Policy

This project is licensed under the **SkwelaDabaw Source-Available and Community Trust License** (see [LICENSE](LICENSE) for full legal text).

- **Inspection & Personal Use**: Free to inspect, audit, study, and compile locally for personal non-commercial use.
- **Contributions**: Community pull requests and fixes are encouraged.
- **Distribution Restriction**: Unauthorized re-publishing, distribution, or re-uploading of this application (or any derivative work) to Google Play, Apple App Store, or any third-party app distribution platform is strictly prohibited. Official releases are provided exclusively via official channels.

---

## 🎨 Design System & Visual Philosophy

- **iOS 18 Inset Grouped Architecture**: Layered cards with subtle semi-transparent surfaces, curved corners, and clean typography.
- **Dynamic CSS Token Engine**: 5 selectable themes (`Light`, `Dark`, `Emerald`, `Cyber`, and `OLED Black`) mapped through CSS custom variables on the document root.
- **Zero Parentheses Directive**: Strict ban on parentheses across user-facing copy, labels, widget drawables, and notification strings for maximum typographic clarity.
