export interface ChangelogItem {
  type: 'feature' | 'improvement' | 'security' | 'fix' | 'ui';
  title: string;
  description: string;
}

export interface ChangelogRelease {
  version: string;
  releaseDate: string;
  title: string;
  isLatest?: boolean;
  tagline: string;
  highlights: string[];
  items: ChangelogItem[];
  changes?: { category: string; items: string[] }[];
}

export const CHANGELOG_DATA: ChangelogRelease[] = [
  {
    version: '1.11.5.1',
    releaseDate: 'November 10, 2026',
    title: 'Google Play Photo Policy Alignment & Privacy Optimization',
    isLatest: true,
    tagline: 'Streamlined media access to the zero-permission Android System Photo Picker for strengthened student privacy.',
    highlights: [
      'Transitioned image selection and OCR schedule importing to the zero-permission Android System Photo Picker',
      'Purged legacy READ_MEDIA_IMAGES and storage permissions to comply with Google Play security standards',
      'Ensured all schedule image imports and avatar selections remain isolated to user-picked files only'
    ],
    items: [
      {
        type: 'security',
        title: 'Android Photo Picker Alignment',
        description: 'Adopted Android system photo picker architecture, eliminating broad storage permission requirements.'
      },
      {
        type: 'improvement',
        title: 'Student Privacy Hardening',
        description: 'Zero broad gallery permissions requested on install; file access is strictly limited to files you tap.'
      }
    ]
  },
  {
    version: '1.11.5.0',
    releaseDate: 'November 10, 2026',
    title: 'Live Class Status & Schedule Quick Search',
    isLatest: false,
    tagline: 'Instant classroom navigation with real-time class status countdowns, room search filtering, and one-tap subject duplication.',
    highlights: [
      'Added real-time In-Session and Up-Next status badges with minute countdowns on today\'s schedule cards',
      'Added instant search and filter for classrooms, laboratories, subject codes, and professors',
      'Added one-tap subject duplicator to rapidly replicate recurring courses across multiple days'
    ],
    items: [
      {
        type: 'feature',
        title: 'Live Class Status Badges',
        description: 'Displays pulsing in-session indicators and up-next countdowns on today\'s lecture cards.'
      },
      {
        type: 'feature',
        title: 'Schedule & Room Filter',
        description: 'Quickly search and isolate classes by room number, subject code, or professor.'
      },
      {
        type: 'improvement',
        title: 'Subject Duplicator',
        description: 'Replicate existing subject details into the Add Class dialog with a single tap.'
      }
    ]
  },
  {
    version: '1.11.4.6',
    releaseDate: 'November 10, 2026',
    title: 'Android 16 API 36 Target Alignment & Release Signing',
    isLatest: false,
    tagline: 'Upgraded target SDK to API 36 (Android 16) and configured official release keystore signing for Google Play Store compliance.',
    highlights: [
      'Upgraded targetSdkVersion and compileSdkVersion to API 36 satisfying Google Play Console requirements',
      'Configured production release keystore signing across all Gradle bundle and assembly workflows',
      'Preserved offline-first local database stability, widget sync, and class reminder dispatching'
    ],
    items: [
      {
        type: 'improvement',
        title: 'Android 16 (API 36) Target Upgrade',
        description: 'Upgraded compile and target SDK to level 36 with Build Tools 36.0.0, ensuring optimal performance and platform security.'
      },
      {
        type: 'security',
        title: 'Production Release Signing Configuration',
        description: 'Configured automated release keystore signing in Gradle to ensure all distributed App Bundles are cryptographically verified.'
      }
    ]
  },
  {
    version: '1.11.4.5',
    releaseDate: 'November 9, 2026',
    title: 'Google Play Compliance & Account Deletion Framework',
    isLatest: false,
    tagline: 'Aligned client application with Google Play Store policies by removing out-of-store update prompts and providing comprehensive account deletion.',
    highlights: [
      'Removed all in-app update popups and external APK download prompts in compliance with Google Play Store policies',
      'Added in-app Account & Cloud Data Deletion in Settings with complete multi-table database purge',
      'Streamlined exact alarm and battery optimization permissions for streamlined Google Play Console review',
      'Established automated local Android App Bundle (.aab) packaging for Google Play distribution'
    ],
    items: [
      {
        type: 'improvement',
        title: 'Google Play Update Policy Compliance',
        description: 'Eliminated startup update popups and external APK downloading triggers, enabling seamless Google Play background updates.'
      },
      {
        type: 'feature',
        title: 'Permanent Account & Data Deletion',
        description: 'Empowered students to permanently delete their cloud account, timetables, and profile data directly from Settings or via web portal.'
      },
      {
        type: 'security',
        title: 'Android Permission Streamlining',
        description: 'Hardened exact alarm and battery optimization declarations in the Android manifest to satisfy Google Play audit requirements.'
      },
      {
        type: 'fix',
        title: 'TypeScript Compiler Resolution',
        description: 'Resolved latent componentStack, ClassSchedule, and uid type mismatches ensuring clean TypeScript builds.'
      }
    ]
  },
  {
    version: '1.11.4.4',
    releaseDate: 'November 9, 2026',
    title: 'Play Store Package Name Alignment & Ecosystem Sync',
    isLatest: false,
    tagline: 'Aligned technical application identifier to com.kurzyrio.skweladabaw.app for Google Play Store compatibility with verified dual deep-linking.',
    highlights: [
      'Configured official Android application ID com.kurzyrio.skweladabaw.app unlocking Google Play Store distribution',
      'Dual-target Digital Asset Links ensuring schedule and class shares open smoothly on both direct-install and Play Store builds',
      'Preserved complete commuter privacy, offline database state, and native class notification services'
    ],
    items: [
      {
        type: 'improvement',
        title: 'Google Play Store Package Alignment',
        description: 'Updated application ID to com.kurzyrio.skweladabaw.app for Google Play Console compatibility while preserving internal Java class structures.'
      },
      {
        type: 'improvement',
        title: 'Dual-Target Digital Asset Links',
        description: 'Synchronized domain assetlinks to support deep-linking across both legacy direct installations and official Play Store editions.'
      },
      {
        type: 'fix',
        title: 'Ecosystem Configuration Sync',
        description: 'Updated strings, manifest authorities, and web portal download displays to match new package specifications.'
      }
    ]
  },
  {
    version: '1.11.4.3',
    releaseDate: 'November 6, 2026',
    title: 'Non-Destructive Schedule Sync & Native Class Reminder Engine',
    isLatest: false,
    tagline: 'Implemented smart differential schedule reconciliation to protect customized reminder settings and connected native background class alerts.',
    highlights: [
      'Intelligent differential schedule sync updating only modified server fields while permanently preserving your custom reminder minutes and notes',
      'Reliable heads-up class reminders powered by the native background service with sound and vibration alerts before classes start',
      'System-wide preservation guaranteeing zero disruption to the unremovable notification, home screen widgets, and task tracking'
    ],
    items: [
      {
        type: 'fix',
        title: 'Class Reminder Delivery Resolution',
        description: 'Fixed an issue where class reminder notifications failed to sound or vibrate by correcting notification channel audio and connecting native background evaluation.'
      },
      {
        type: 'improvement',
        title: 'Differential Schedule Sync',
        description: 'Cloud sync now compares local and remote schedules to update only necessary changes, preventing accidental loss of custom alarm settings.'
      },
      {
        type: 'improvement',
        title: 'Settings Fallback Protection',
        description: 'Classes without custom per-card alarms now automatically adopt your default reminder timing from App Settings.'
      }
    ]
  },
  {
    version: '1.11.4.2',
    releaseDate: 'November 6, 2026',
    title: 'Enhanced Diagnostics Partitioning & Device Crash Synchronization',
    isLatest: false,
    tagline: 'Upgraded crash reporting with partitioned error queues, anonymous device diagnostics, and seamless reconnection sync.',
    highlights: [
      'Partitioned error telemetry isolating offline render exceptions from regular runtime diagnostics',
      'Anonymous device diagnostics ensuring error logs are uniquely tracked for rapid bug resolution without compromising commuter privacy',
      'Automated background sync for queued crash reports upon network reconnection'
    ],
    items: [
      {
        type: 'improvement',
        title: 'Partitioned Diagnostics Queue',
        description: 'Offline render crashes and online runtime errors are now stored in separate queues for faster recovery and transmission.'
      },
      {
        type: 'improvement',
        title: 'Anonymous Device Token',
        description: 'Added anonymous non-PII device identifiers to error reports so developers can pinpoint device-specific crashes.'
      },
      {
        type: 'fix',
        title: 'Reconnection Crash Sync',
        description: 'Ensured unsent offline crash reports reliably upload the moment an active internet connection is re-established.'
      }
    ]
  },
  {
    version: '1.11.4.1',
    releaseDate: 'November 6, 2026',
    title: 'Accurate Network Detection & Dismissible Offline Banner',
    isLatest: false,
    tagline: 'Resolved persistent offline banner display by connecting native Android network monitoring and added session dismissal.',
    highlights: [
      'Accurate online status detection via native Android ConnectivityManager interface monitoring',
      'Instant session dismissal option on the offline banner to reclaim vertical screen space',
      'Real-time connectivity reactivity: successful cloud sync and API responses immediately clear offline alerts'
    ],
    items: [
      {
        type: 'fix',
        title: 'Persistent Offline Banner Resolution',
        description: 'Fixed an issue where the offline warning remained visible despite an active internet connection.'
      },
      {
        type: 'improvement',
        title: 'Native Network State Monitoring',
        description: 'Integrated Android system-level connectivity checks to accurately track Wi-Fi and mobile data availability.'
      },
      {
        type: 'ui',
        title: 'Dismissible Offline Banner',
        description: 'Added a one-tap close button allowing commuters to dismiss the offline notice for the active session.'
      }
    ]
  },
  {
    version: '1.11.4.0',
    releaseDate: 'November 6, 2026',
    title: 'Diagnostics & Privacy Settings and Commuter Data Protection',
    isLatest: false,
    tagline: 'Added dedicated Diagnostics & Privacy controls, Wi-Fi data-saver guardrails, and transparent stability reporting.',
    highlights: [
      'Dedicated Diagnostics & Privacy page in App Settings to manage telemetry preferences, view local sync status, and clear diagnostic logs',
      'Commuter mobile data protection: error reporting is set to Wi-Fi only by default to preserve cellular allowances',
      'Transparent developer assurance guarantee: zero personal information or student data is used to improve the app',
      'First-time onboarding consent prompt for anonymous crash and stability reporting'
    ],
    items: [
      {
        type: 'feature',
        title: 'Diagnostics & Privacy Settings',
        description: 'Added dedicated controls in App Settings to manage diagnostic preferences and view local sync status.'
      },
      {
        type: 'improvement',
        title: 'Cellular Data Saver Guardrail',
        description: 'Configured crash diagnostics to transmit over Wi-Fi only by default, preserving commuter mobile data.'
      },
      {
        type: 'security',
        title: 'Transparent Privacy Assurance',
        description: 'Added explicit privacy guarantees ensuring zero user personal information or data is collected.'
      },
      {
        type: 'feature',
        title: 'Onboarding Privacy Prompt',
        description: 'Integrated an optional stability reporting step during initial student setup.'
      }
    ]
  },
  {
    version: '1.11.3.9',
    releaseDate: 'November 5, 2026',
    title: 'Offline Schedule Retention & Real-Time Background Notification',
    isLatest: false,
    tagline: 'Preserved offline timetable schedules with zero-loss protection and connected unremovable status card to background minute ticks.',
    highlights: [
      'Guaranteed offline timetable persistence: schedules, tasks, and routines are permanently preserved even when offline',
      'Fixed unremovable status bar notification to update dynamically every minute in the background as class periods transition',
      'Connected status bar notification directly to native Android background execution and weather wake-up loop',
      'Eliminated schedule page offline freezing and premature empty-cloud sync triggers'
    ],
    items: [
      {
        type: 'fix',
        title: 'Offline Timetable Retention',
        description: 'Prevented cloud synchronization from wiping local class schedules when offline or on empty cloud responses.'
      },
      {
        type: 'feature',
        title: 'Autonomous Background Status Bar Ticks',
        description: 'Hooked ongoing timetable card into native Android time ticks to transition active lectures automatically.'
      },
      {
        type: 'improvement',
        title: 'Background Loop Integration',
        description: 'Synchronized ongoing status bar notification and home screen widgets with the native 5-minute background service.'
      },
      {
        type: 'fix',
        title: 'Schedule Page Offline Stability',
        description: 'Fixed timetable loading glitches when launching the app without an internet connection.'
      }
    ]
  },
  {
    version: '1.11.3.8',
    releaseDate: 'November 5, 2026',
    title: 'Schedule Menu Polish, Legal Unification & Campus Sync Protection',
    isLatest: false,
    tagline: 'Cleaned up schedule menu interaction, streamlined settings, unified legal policies, and strengthened student campus synchronization.',
    highlights: [
      'Fixed the timetable 3-dots options menu to open without screen darkening or containing box borders',
      'Streamlined settings by removing the redundant onboarding guide replay button',
      'Unified Terms of Service and Privacy Policy into a single tabbed dialog with instant web access',
      'Fixed campus persistence across cloud synchronization, preventing profile resets to AdDU Jacinto',
      'Improved campus display so unassigned students cleanly see "Select Campus" instead of default ACQ'
    ],
    items: [
      {
        type: 'fix',
        title: 'Schedule Options Dropdown Polish',
        description: 'Eliminated screen dimming and rectangular clipped borders when opening the schedule options menu.'
      },
      {
        type: 'improvement',
        title: 'Settings Menu Streamlining',
        description: 'Cleaned up the About & System section by removing the obsolete onboarding replay button.'
      },
      {
        type: 'feature',
        title: 'Unified Legal & Privacy Center',
        description: 'Merged Terms of Service and Privacy Policy into a single comprehensive dialog with one-tap web viewing.'
      },
      {
        type: 'fix',
        title: 'Campus Sync Reversion Protection',
        description: 'Prevented student campus preferences from automatically reverting to AdDU Jacinto during account sync.'
      },
      {
        type: 'improvement',
        title: 'Unassigned Campus State',
        description: 'Display "Select Campus" rather than defaulting unassigned student profiles to ACQ College of Ministries.'
      }
    ]
  },
  {
    version: '1.11.3.7',
    releaseDate: 'November 5, 2026',
    title: 'Widget Polish, Routines & Tasks Widgets, and Campus Persistence',
    isLatest: false,
    tagline: 'Fixed schedule widget outline clipping, added new Day Routines and Tasks List home screen widgets, theme-adaptive Eagle Overlay, and permanent campus persistence.',
    highlights: [
      'Eliminated border and corner outline clipping across schedule cards in home screen widgets',
      'Added dedicated home screen widgets for weekly Day Routine alarms and scrollable Tasks checklist',
      'Upgraded Eagle Overlay with dynamic color theme adaptation matching your active app theme',
      'Resolved campus selection persistence so chosen campuses remain saved across restarts and syncs',
      'Fixed the timetable 3-dot options menu to open smoothly without clipping or glitching'
    ],
    items: [
      {
        type: 'fix',
        title: 'Widget Card Outline Polish',
        description: 'Fixed schedule card borders and rounded corners being cut off on home screen widgets.'
      },
      {
        type: 'feature',
        title: 'Day Routines & Tasks Widgets',
        description: 'Added dedicated home screen widgets for daily routine alarms and a scrollable tasks list.'
      },
      {
        type: 'improvement',
        title: 'Theme-Adaptive Eagle Overlay',
        description: 'The floating Eagle companion bubble and quick glance card now seamlessly match your active app theme.'
      },
      {
        type: 'fix',
        title: 'Campus Selection Persistence',
        description: 'Eliminated hardcoded fallbacks so your selected campus stays saved permanently.'
      },
      {
        type: 'fix',
        title: 'Timetable Options Menu Glitch Fix',
        description: 'Resolved the 3-dot options dropdown on the schedule header to open cleanly over page content.'
      }
    ]
  },
  {
    version: '1.11.3.6',
    releaseDate: 'November 5, 2026',
    title: 'Timetable Auto-Sync & Single-Row Topbar',
    isLatest: false,
    tagline: 'Automated timetable cloud restoration upon login or account switch with guest schedule preservation, and unified the Schedule header into a crisp single row.',
    highlights: [
      'Automated timetable cloud restoration immediately upon account login or switch without requiring manual sync',
      'Preserved guest local schedules during login transitions, intelligently offering account merge or cloud restoration',
      'Unified the Timetable topbar into a compact single row (Row 1 Only), eliminating awkward multi-row line breaks',
      'Added normalized weekday parser ensuring all saved day abbreviations correctly display in daily class views'
    ],
    items: [
      {
        type: 'fix',
        title: 'Automated Timetable Login Sync',
        description: 'Schedules and coursework now automatically restore from cloud backup immediately upon logging in or switching accounts.'
      },
      {
        type: 'improvement',
        title: 'Guest Schedule Preservation',
        description: 'Local schedules created in guest mode are safely preserved during account sign-in, preventing accidental data loss.'
      },
      {
        type: 'ui',
        title: 'Single-Row Timetable Topbar',
        description: 'Consolidated Today, Weekly, Routines, Add Class, and More Options cleanly across a single unified topbar row.'
      }
    ]
  },
  {
    version: '1.11.3.5',
    releaseDate: 'November 5, 2026',
    title: 'Timetable, Tasks & Profile UI Streamlining',
    isLatest: false,
    tagline: 'Streamlined Timetable toolbar navigation, focused the Tasks page purely on assignments and due dates, and consolidated university campus selection.',
    highlights: [
      'Removed redundant GPA button from Timetable subtabs in favor of the dedicated GPA & QPI Calculator page',
      'Streamlined Timetable toolbar with a prominent Add Class button and consolidated More Options menu',
      'Removed Pomodoro focus timer card to give immediate prominence to assignment deliverables and due dates',
      'Consolidated campus changing inside Edit Profile, removing the duplicate Change Campus button'
    ],
    items: [
      {
        type: 'ui',
        title: 'Timetable Toolbar Streamlining',
        description: 'Cleaned up timetable navigation by removing the duplicate GPA button and nesting secondary actions cleanly in the More menu.'
      },
      {
        type: 'ui',
        title: 'Focused Tasks Tracker',
        description: 'Removed the focus timer card, allowing commuters to immediately view and manage pending assignments, quizzes, and deadlines.'
      },
      {
        type: 'ui',
        title: 'Consolidated Campus Selection',
        description: 'Cleaned up the Profile overview card by removing the redundant campus button while preserving full campus customization in Edit Profile.'
      }
    ]
  },
  {
    version: '1.11.3.4',
    releaseDate: 'November 5, 2026',
    title: 'Settings Render Fix & Diagnostic Error Reporting',
    isLatest: false,
    tagline: 'Resolved initialization order causing Settings page to crash on open and introduced Go Back navigation and in-app Diagnostic Error Reporting.',
    highlights: [
      'Resolved Settings page render crash caused by state initialization ordering',
      'Added Go Back button to error screens for instant one-tap recovery to safe view',
      'Integrated in-app Error Reporting modal allowing commuters to describe what happened before a crash',
      'Isolated view error boundaries across Settings, About, Changelog, and Feedback'
    ],
    items: [
      {
        type: 'fix',
        title: 'Settings Page Initialization Fix',
        description: 'Corrected profile modal state ordering before back-handler registration, eliminating runtime ReferenceError crash on open.'
      },
      {
        type: 'improvement',
        title: 'Interactive Crash Diagnostic Reporting',
        description: 'Added Go Back and Report buttons to error screens to capture context, user explanation, and stack trace.'
      },
      {
        type: 'improvement',
        title: 'Isolated Subview Error Boundaries',
        description: 'Wrapped all main views in individual ErrorBoundary containers to prevent subpage errors from impacting the Application Shell.'
      }
    ]
  },
  {
    version: '1.11.3.3',
    releaseDate: 'November 5, 2026',
    title: 'Campus Selection Scroll Lock Fix',
    isLatest: false,
    tagline: 'Fixed vertical scroll lock across all pages after selecting or updating campus by introducing a reference-counted body scroll lock manager.',
    highlights: [
      'Fixed vertical scrolling freeze occurring after selecting or updating university campus in Settings or onboarding',
      'Implemented reference-counted body scroll lock manager preventing conflicting modal state overrides',
      'Restored smooth touch and vertical scrolling navigation across all pages and student tools'
    ],
    items: [
      {
        type: 'fix',
        title: 'Campus Selection Scroll Lock Fix',
        description: 'Resolved race condition where modal close handlers trapped overflow and touch-action styles in document body.'
      },
      {
        type: 'improvement',
        title: 'Reference-Counted Scroll Management',
        description: 'Centralized modal scroll locking with safe reference counting, preventing stuck locks during parallel or subpage overlays.'
      },
      {
        type: 'fix',
        title: 'Settings Username Edit Scrollability',
        description: 'Fixed inline username editing card so the settings page remains fully scrollable when typing.'
      }
    ]
  },
  {
    version: '1.11.3.2',
    releaseDate: 'November 3, 2026',
    title: 'Streamlined Google & Guest Sign-In',
    isLatest: false,
    tagline: 'Streamlined onboarding focused on Google Account and offline Guest access while preserving degree program and academic profile onboarding.',
    highlights: [
      'Clean and fast onboarding interface with Google Account and offline Guest mode',
      'Preserved Degree Program / Course and College Year Level selections in Step 3',
      'Zero password prompts or verification barriers during student onboarding'
    ],
    items: [
      {
        type: 'improvement',
        title: 'Simplified Onboarding Interface',
        description: 'Temporarily disabled mobile number sign-in to ensure immediate, zero-friction sign-in with Google and Guest access.'
      },
      {
        type: 'ui',
        title: 'Streamlined Auth Action Buttons',
        description: 'Cleaned up Step 1 layout to focus commuters directly on 1-tap Google Sign-In and offline Guest browsing.'
      }
    ]
  },
  {
    version: '1.11.3.1',
    releaseDate: 'November 2, 2026',
    title: 'SMS API PH Gateway & Phone Auth Android Fix',
    isLatest: false,
    tagline: 'Integration with SMS API PH gateway for high-speed Philippine SMS OTP delivery and permanent fix for Android phone auth handler exception.',
    highlights: [
      'Dedicated SMS API PH gateway integration for reliable SMS delivery across Smart, Globe, DITO, TNT, and TM',
      'Fixed Android PhoneAuthProviderHandler null reference error by routing OTP through secure backend microservice',
      'Cryptographically signed session tokens supporting cross-device login and instant MySQL profile hydration'
    ],
    items: [
      {
        type: 'feature',
        title: 'SMS API PH Integration',
        description: 'Replaced fragile client-side phone authentication with a robust server-side SMS API PH gateway delivering 6-digit codes to Philippine numbers.'
      },
      {
        type: 'fix',
        title: 'Android Native Phone Auth Fix',
        description: 'Resolved native Capacitor PhoneAuthProviderHandler crash on Android by dispatching OTP requests through the backend microservice.'
      },
      {
        type: 'improvement',
        title: 'Cryptographic Session Signing',
        description: 'Implemented HMAC-SHA256 session token generation and verification for complete parity with Firebase ID tokens across all API endpoints.'
      }
    ]
  },
  {
    version: '1.11.3.0',
    releaseDate: 'November 2, 2026',
    title: 'Mobile Number Sign-In & Degree Program Onboarding',
    isLatest: false,
    tagline: 'Student onboarding with Mobile Phone SMS OTP sign-in, Degree Program and College Year Level selection, and a fully passwordless experience.',
    highlights: [
      'Fast SMS OTP verification to sign in with Philippine mobile numbers (Globe, Smart, DITO, TNT, TM)',
      'Degree Program / Course and College Year Level selection in Step 3 of student onboarding',
      'Completely passwordless experience with removal of redundant password prompts',
      'Instant profile updates synchronization to prevent stale campus or program info'
    ],
    items: [
      {
        type: 'feature',
        title: 'Mobile Phone SMS Sign-In',
        description: 'Students can now sign in using their Philippine mobile number with instantaneous SMS OTP verification alongside Google Sign-In.'
      },
      {
        type: 'feature',
        title: 'Degree Program & Year Level in Onboarding',
        description: 'Added Course / Program field and Year Level selector during onboarding so academic profiles are configured from day one.'
      },
      {
        type: 'improvement',
        title: 'Streamlined Passwordless Flow',
        description: 'Removed unnecessary password creation steps and verification dialogs in favor of secure Google and Phone OTP authentication.'
      },
      {
        type: 'fix',
        title: 'Real-Time User Profile Sync',
        description: 'Fixed profile synchronization to ensure campus and academic updates persist accurately without reverting upon restart.'
      }
    ]
  },
  {
    version: '1.11.2.3',
    releaseDate: 'November 2, 2026',
    title: 'Google Maps Verification & Coordinates Accuracy',
    isLatest: false,
    tagline: 'Comprehensive audit and calibration of all Davao City police stations, hospitals, and transit hubs to verified Google Maps locations.',
    highlights: [
      'Calibrated all 34 police stations and 36 hospitals with verified Google Maps names and high-precision coordinates',
      'Pinpoint nearest emergency facility distances and 1-tap Google Maps directions across all 11 Davao districts',
      'Fixed major location displacements for St. John Hospital, Marilog, Paquibato, and Tugbok emergency stations',
      'Updated bus terminal and mall access points for DCOTT Ecoland and SM City Davao'
    ],
    items: [
      {
        type: 'fix',
        title: 'Emergency Proximity Routing',
        description: 'Nearest police station and hospital distance calculations in the Emergency Directory now reflect exact Google Maps facility pins.'
      },
      {
        type: 'fix',
        title: 'Accurate Hospital & Station Locations',
        description: 'Corrected displaced coordinates across 70 emergency locations, fixing major errors up to 25 km in Toril, Bunawan, Marilog, and Calinan.'
      },
      {
        type: 'improvement',
        title: 'Google Maps Name Parity',
        description: 'Updated facility titles to match physical signage and Google Maps listings for seamless search and navigation.'
      },
      {
        type: 'improvement',
        title: 'Transit Point Calibration',
        description: 'Calibrated entrance coordinates for Ecoland Bus Terminal (DCOTT) and SM City Davao for transit routing accuracy.'
      }
    ]
  },
  {
    version: '1.11.2.2',
    releaseDate: 'November 2, 2026',
    title: 'Permanent Campus & Student Profile Persistence',
    isLatest: false,
    tagline: 'Permanent campus choice retention on app restarts, resilient profile synchronization, and instant server confirmation.',
    highlights: [
      'Fixed an issue where restarting the app would revert your selected campus or university back to the default',
      'All profile changes (degree, year level, display name, age, gender) now persist reliably across sessions',
      'Instant cloud synchronization with real-time confirmation so your choices are never overwritten'
    ],
    items: [
      {
        type: 'fix',
        title: 'Permanent Campus Retention',
        description: 'Fixed an issue where relaunching the application reverted recently chosen campuses back to older records.'
      },
      {
        type: 'fix',
        title: 'Reliable Profile Synchronization',
        description: 'Profile updates now save securely to the server with immediate confirmation before closing.'
      },
      {
        type: 'improvement',
        title: 'Zero-Loss Startup Protection',
        description: 'App startup hydration now protects local student preferences from being overwritten by older data.'
      }
    ]
  },
  {
    version: '1.11.2.1',
    releaseDate: 'November 2, 2026',
    title: 'Instant User Profile & Campus Synchronization Fix',
    isLatest: false,
    tagline: 'Immediate server synchronization when changing campuses or profile details, preventing local choices from reverting on app restart.',
    highlights: [
      'Changing university or campus affiliation in Settings now pushes directly to the server immediately',
      'Fixed profile overwrite bug where restarting the app reverted newly selected campuses back to old cloud values',
      'Synchronous profile persistence ensuring degree, year level, and personal details save before closing modal'
    ],
    items: [
      {
        type: 'fix',
        title: 'Instant Campus & School Synchronization',
        description: 'Changing your school or campus now immediately updates your account in the cloud without delay.'
      },
      {
        type: 'fix',
        title: 'Conflict-Free Profile Persistence',
        description: 'Fixed an issue where restarting the app caused local campus choices to be overwritten by older cloud records.'
      },
      {
        type: 'improvement',
        title: 'Synchronous Profile Saving',
        description: 'Profile edits for course, year level, age, and gender now save synchronously to prevent data loss on app exit.'
      }
    ]
  },
  {
    version: '1.11.2.0',
    releaseDate: 'October 30, 2026',
    title: 'Automatic Cloud Synchronization & Cloud Push Reliability',
    isLatest: false,
    tagline: 'Reactive automatic cloud synchronization for schedules, expenses, and transit bookmarks with offline-to-online auto-flush queue.',
    highlights: [
      'Reactive background cloud sync automatically saving student schedules, expenses, reminders, and commuter preferences',
      'Bidirectional data synchronization cleanly merging local offline edits with cloud updates',
      'Fixed backend database schema mismatches preventing push errors when uploading expenses or saving transit routes',
      'Offline auto-flush queue seamlessly uploading queued changes the moment network connection returns'
    ],
    items: [
      {
        type: 'feature',
        title: 'Reactive Cloud Synchronization',
        description: 'All student schedule changes, budget entries, day reminders, and commuter settings automatically queue and upload to the cloud.'
      },
      {
        type: 'improvement',
        title: 'Bidirectional Conflict-Free Sync',
        description: 'Synchronizing cloud data seamlessly merges remote updates with local offline changes without overwriting newer entries.'
      },
      {
        type: 'fix',
        title: 'Cloud Schedule & Route Push Reliability',
        description: 'Fixed backend database schema mismatches that caused push errors when uploading expenses or saving transit routes.'
      },
      {
        type: 'improvement',
        title: 'Network Reconnection Auto-Flush',
        description: 'Local changes created offline are securely queued and immediately synced as soon as internet connectivity is regained.'
      }
    ]
  },
  {
    version: '1.11.1.0',
    releaseDate: 'October 30, 2026',
    title: 'Offline Data & Avatar Caching Architecture',
    tagline: 'Instant-loading offline profile pictures and persistent transit dataset caching for seamless zero-data commuter access.',
    highlights: [
      'Instant offline profile picture rendering across Header, Community Chat, and Posts with zero broken images',
      'Automatic profile synchronization when other student accounts update their pictures or tags',
      'Persistent transit stops and route caching to eliminate repetitive multi-megabyte data downloads',
      'Clean initials and color-coded avatar fallbacks preventing blank spaces and layout shifts'
    ],
    items: [
      {
        type: 'feature',
        title: 'Offline Profile Picture Storage',
        description: 'Profile pictures and avatars are now stored locally on device disk, loading instantly without consuming cellular data or showing blank spaces.'
      },
      {
        type: 'improvement',
        title: 'Real-Time Cross-User Profile Updates',
        description: 'Updates to student usernames, photos, and badges automatically sync and update in active chat and community views.'
      },
      {
        type: 'improvement',
        title: 'Transit Stops & Route Dataset Caching',
        description: 'Heavy transit datasets and route maps are cached locally, eliminating repetitive downloads on app launch.'
      },
      {
        type: 'fix',
        title: 'Profile Picture Display Guardrails',
        description: 'Replaced blank spaces and broken icon fallbacks with stylish, color-coded initials badges.'
      }
    ]
  },
  {
    version: '1.11.0.0',
    releaseDate: 'October 29, 2026',
    title: 'Multi-Device Academic & Commuter Cloud Sync',
    isLatest: false,
    tagline: 'Expanded cloud sync to preserve student grades, GPA computations, saved commuter places, bulletin bookmarks, and app preferences across all devices.',
    highlights: [
      'Automatic multi-device synchronization for academic grades and GWA/QPI computations',
      'Preservation of saved commuter places (Home, Campus, Dorm) for instant one-tap navigation on new devices',
      'Synchronized campus bulletin bookmarks and app customization settings across student devices',
      'Updated Terms of Service and Privacy Policy with transparent Application and User Responsibility safeguards'
    ],
    items: [
      {
        type: 'feature',
        title: 'Multi-Device Grade & GPA Synchronization',
        description: 'Subject grades, units, and GWA/QPI calculations now automatically sync to your secure student cloud account, ensuring academic history is preserved when changing phones.'
      },
      {
        type: 'feature',
        title: 'Saved Commute Places & Bulletin Bookmarks',
        description: 'Pinned locations (Home, Campus, Dorm) and bookmarked campus announcements now restore seamlessly across devices without repetitive entry.'
      },
      {
        type: 'improvement',
        title: 'Full App Customization Sync',
        description: 'Sticky status bar notification preferences, alert timings, and visual theme choices now persist across all student devices.'
      },
      {
        type: 'security',
        title: 'Bilateral Responsibility Framework',
        description: 'Updated Privacy Policy and Terms of Service clearly establishing technical data safeguards and student user operational responsibilities.'
      }
    ]
  },
  {
    version: '1.10.5.0',
    releaseDate: 'October 29, 2026',
    title: 'Comprehensive Character Limits & Input Guardrails',
    isLatest: false,
    tagline: 'Added 500-character input ceilings, live minimalist character counters, and input safeguards across schedules, routines, and tasks.',
    highlights: [
      'Enforced 500-character limits and live label counters for schedule notes, weekly routines, and academic tasks',
      'Added input validation guardrails across transit alerts, community posts, bug reports, and student budget notes',
      'Protected mobile notifications, home screen widgets, and database sync from text truncation and overflow',
      'Hardened schedule importers with anti-freeze safeguards against giant clipboard pastes'
    ],
    items: [
      {
        type: 'improvement',
        title: 'Schedule, Routine & Task Input Ceilings',
        description: 'Enforced 500-character limits and live label counters on schedule notes, weekly routines, and academic tasks.'
      },
      {
        type: 'improvement',
        title: 'Form Input Guardrails',
        description: 'Added right-sized character boundaries across commute alerts, community posts, feedback reports, and student budget notes.'
      },
      {
        type: 'improvement',
        title: 'Display & Sync Reliability',
        description: 'Safeguards local notifications, home screen widgets, and database sync pipelines from text truncation and overflow.'
      }
    ]
  },
  {
    version: '1.10.4.0',
    releaseDate: 'October 29, 2026',
    title: 'Personal Information Verification for Existing Student Accounts',
    isLatest: false,
    tagline: 'Automated personal profile checks on app launch for older accounts lacking gender identity and age.',
    highlights: [
      'Identifies existing accounts missing newer personal profile information upon app startup',
      'In-place personal information update form prompts commuters for gender identity and age',
      'Immediately persists updated profile attributes to MySQL cloud storage and local session',
      'Safeguards brand-new onboarding and offline commuters from interruptions'
    ],
    items: [
      {
        type: 'feature',
        title: 'Personal Profile Startup Verification',
        description: 'Startup check detects returning student accounts lacking newer profile fields (Gender Identity and Age) upon launch.'
      },
      {
        type: 'improvement',
        title: 'Streamlined Profile Update Modal',
        description: 'In-place form prompts existing students to provide missing personal details and immediately persists them to cloud storage.'
      },
      {
        type: 'improvement',
        title: 'Seamless Commuter Experience',
        description: 'Safeguards brand-new onboarding and offline launches from interruptions while maintaining accurate student records.'
      }
    ]
  },
  {
    version: '1.10.3.0',
    releaseDate: 'October 28, 2026',
    title: 'Sub-Second Startup Acceleration & Continuous Orbital Loading Screen',
    isLatest: false,
    tagline: 'Instant cold-boot startup, continuous orbital loading rings, and non-blocking background initialization.',
    highlights: [
      'Eliminated render-blocking network requests and fonts to achieve sub-second app startup',
      'Reformatted opening loading screen with smooth dual orbital spinners and shimmer loading beam',
      'Decoupled notification channels and background reminder tasks to prevent main-thread UI stalling',
      'Added instant first-frame HTML/CSS loader to eliminate blank white flashes on launch'
    ],
    items: [
      {
        type: 'improvement',
        title: 'Sub-Second Startup Acceleration',
        description: 'Deferred background synchronization and non-critical network requests to launch straight into your schedule and transit map.'
      },
      {
        type: 'ui',
        title: 'Continuous Orbital Loading Screen',
        description: 'Reformatted startup screen featuring dual GPU-accelerated orbital rings, animated shimmer progress beam, and centered Bayani mascot.'
      },
      {
        type: 'improvement',
        title: 'First-Frame Pre-Mount Loader',
        description: 'Added an inline lightweight loader to eliminate blank flashes during JavaScript bundle initialization.'
      }
    ]
  },
  {
    version: '1.10.2.0',
    releaseDate: 'October 28, 2026',
    title: 'Precision Double-Ride Transit, Directional Walking Vectors & Smart System Alerts',
    isLatest: false,
    tagline: 'Destination-first multi-ride jeep routing, directional shoe vectors for walking paths, task deletion confirmation dialog, and 5-minute background weather monitoring.',
    highlights: [
      'Overhauled double-ride transit routing using 96,720 transfer points to prioritize drop-offs closest to your destination',
      'Replaced cut dashed walking lines on the Jeep Transit map with forward-facing directional shoe vectors',
      'Added a safety confirmation dialog before deleting tasks to prevent accidental loss',
      'Automated 5-minute native background weather checks for extreme heat index and heavy rainfall advisories',
      'Enlarged floating Eagle Overlay dismiss target to Messenger-like proportions with responsive tactile feedback',
      'Persisted 7-day username cooldown across logouts and logins with real-time uniqueness validation'
    ],
    items: [
      {
        type: 'improvement',
        title: 'Destination-First Double-Ride Precision',
        description: 'Multi-ride jeep routing now prioritizes drop-offs closest to the destination with 2.5x walking penalties to eliminate unnecessary walking.'
      },
      {
        type: 'ui',
        title: 'Directional Walking Shoe Vectors',
        description: 'Pedestrian paths on the transit map now feature clean directional shoe icons that face the exact heading of the walking segment.'
      },
      {
        type: 'improvement',
        title: 'Task Deletion Confirmation',
        description: 'Safety confirmation modal prevents accidental task deletion and immediately synchronizes changes with cloud storage.'
      },
      {
        type: 'feature',
        title: '5-Minute Background Weather Monitoring',
        description: 'Background service checks Davao weather every 5 minutes and notifies commuters when heat indexes exceed 40°C or heavy rain approaches.'
      },
      {
        type: 'ui',
        title: 'Messenger-Sized Dismiss Target',
        description: 'Enlarged 88dp dismiss target with prominent red accent and tactile haptic vibration makes closing the Eagle Overlay effortless.'
      },
      {
        type: 'security',
        title: 'Persistent 7-Day Username Cooldown',
        description: 'Enforced 7-day cooldown on the database level that persists across device sessions with instant username availability checks.'
      }
    ]
  },
  {
    version: '1.10.1.0',
    releaseDate: 'October 28, 2026',
    title: 'Exhaustive Hospital & Police Locations Directory with GPS Routing',
    isLatest: false,
    tagline: 'Comprehensive city-wide directory of all 33 DCPO police stations and 36 public/private hospitals with live GPS distance sorting and transit routing.',
    highlights: [
      'Comprehensive City-Wide Directory: Added all 33 DCPO police stations, headquarters, units, and EACs across every district of Davao City.',
      'All DOH-Licensed Hospitals: Added all 36 tertiary apex, private, and community hospitals with 24/7 ER status and specialized services.',
      'Proximity GPS Distance Sorting: Automatically calculates and sorts the nearest police station or hospital to the commuter\'s location.',
      'Transit Search Integration: Search and plan jeepney routes directly to any hospital or police station on the Jeep Transit map.'
    ],
    items: [
      {
        type: 'feature',
        title: 'Exhaustive Police & Hospital Locations',
        description: 'Complete unconstrained catalog of 33 police installations and 36 DOH hospitals with exact GPS coordinates and direct emergency lines.'
      },
      {
        type: 'feature',
        title: 'Nearest Facility GPS Distance Sorting',
        description: 'Real-time proximity calculation automatically sorts facilities by distance to highlight the closest police station or emergency room.'
      },
      {
        type: 'feature',
        title: 'Jeepney Transit Search Integration',
        description: 'Integrated all emergency facilities into the Jeep Transit search modal with recommended jeep routes and turn-by-turn navigation.'
      }
    ]
  },
  {
    version: '1.10.0.2',
    releaseDate: 'October 28, 2026',
    title: 'Discord-Style Settings, Touch FX Suite & Eagle Overlay Polish',
    isLatest: false,
    tagline: 'Multi-page settings navigation, comprehensive tap particles and audio suite, separated theme studio, and enhanced Eagle Overlay glance cards.',
    highlights: [
      'Refactored Settings into Discord-style dedicated sub-pages with seamless back navigation',
      'Restored full Touch Effects suite with 8 particle burst styles, speeds, and audio chimes',
      'Separated Appearance & Themes into a dedicated page with live preview cards',
      'Enhanced Eagle Assistive Overlay with dynamic coordinate anchoring and class/task tabs'
    ],
    items: [
      {
        type: 'ui',
        title: 'Discord-Style Multi-Page Settings',
        description: 'Replaced dropdown popups with dedicated setting sub-pages and effortless top back navigation.'
      },
      {
        type: 'feature',
        title: 'Touch Effects & Sound Customization Suite',
        description: 'Configurable particle bursts (8 styles), duration speeds, mascot audio tones, and interactive test arena.'
      },
      {
        type: 'ui',
        title: 'Dedicated Appearance & Themes Page',
        description: 'Separated color themes and mascot language from account settings for easier customization.'
      },
      {
        type: 'improvement',
        title: 'Eagle Overlay Dynamic Positioning & Tabs',
        description: 'Overlay card dynamically tracks bubble coordinates with interactive tabs for classes and tasks.'
      }
    ],
    changes: [
      {
        category: 'Features',
        items: [
          'Added full touch physics customization with particle burst selector and synth audio chimes',
          'Introduced interactive test arena in settings for instant touch effect previewing'
        ]
      },
      {
        category: 'UI/UX',
        items: [
          'Refactored settings layout into clean Discord-inspired sub-page architecture',
          'Separated themes and mascot language into a dedicated Appearance section',
          'Upgraded Eagle Overlay floating card with larger typography and tabbed views'
        ]
      },
      {
        category: 'Fixes',
        items: [
          'Fixed Eagle Overlay information card anchoring to track floating bubble position on screen',
          'Eliminated overlay dismissal flicker and double-tap race conditions',
          'Automated background schedule and weather synchronization to Eagle Overlay'
        ]
      }
    ]
  },
  {
    version: '1.10.0.1',
    releaseDate: 'October 28, 2026',
    title: 'Eagle Overlay Persistence, Modal Scroll Lock & Cloud Sync',
    isLatest: false,
    tagline: 'System-wide Eagle Overlay app switching persistence, scroll lock containment for settings dropdowns, and Baon expense & transit cloud sync.',
    highlights: [
      'Resolved Eagle Overlay persistence when navigating to home launcher and switching apps',
      'Fixed background page scrolling leakage on Settings dropdown and modal popups',
      'Added automated cloud sync for Baon allowance expenses and favorite transit routes',
      'Prevented duplicate in-app overlay bubbles on native Android devices'
    ],
    items: [
      {
        type: 'fix',
        title: 'System-Wide Overlay App-Switching Persistence',
        description: 'Fixed overlay service lifecycle so Eagle Overlay stays active when switching apps or minimizing.'
      },
      {
        type: 'fix',
        title: 'Settings Modal Background Scroll Lock',
        description: 'Prevented underlying screen scrolls when opening category selectors and settings dialogs.'
      },
      {
        type: 'improvement',
        title: 'Baon Budget & Transit Route Cloud Backup',
        description: 'Synchronized student Baon expenses and saved transit routes with your cloud account.'
      },
      {
        type: 'fix',
        title: 'Native Overlay Bubble Deduplication',
        description: 'Streamlined overlay presentation on native Android devices to eliminate duplicate bubbles.'
      }
    ],
    changes: [
      {
        category: 'Fixes',
        items: [
          'Fixed Eagle Overlay foreground service auto-start lifecycle upon returning from Android settings',
          'Locked background document scrolling when settings category dropdown or modal dialogs are active',
          'Eliminated duplicate React bubble rendering on native Android platforms'
        ]
      },
      {
        category: 'Improvements',
        items: [
          'Added automatic synchronization for Baon allowance expenses to cloud database',
          'Added automatic synchronization for saved commuter transit corridors'
        ]
      }
    ]
  },
  {
    version: '1.10.0.0',
    releaseDate: 'October 27, 2026',
    title: 'Native Eagle Overlay, Offline Tasks & Modern Settings',
    isLatest: false,
    tagline: 'Native System-Wide Floating Eagle Overlay, 0ms offline task management, and Discord-style Settings dropdown.',
    highlights: [
      'Native System-Wide Floating Eagle Overlay with edge-snapping physics and live quick-card',
      'Offline-First Task Management with 0ms local toggles and silent background MySQL sync',
      'Refactored Mobile Settings with Discord-inspired vertical dropdown category navigation',
      'Non-blocking Eagle Overlay onboarding opt-in prompt for new and returning students'
    ],
    items: [
      {
        type: 'feature',
        title: 'System-Wide Floating Eagle Companion',
        description: 'Native Android overlay accessible over any application with real-time class status and Davao weather.'
      },
      {
        type: 'feature',
        title: 'Zero-Latency Offline Task Management',
        description: 'Instant 0ms task checkbox toggling and local task creation with silent background cloud synchronization.'
      },
      {
        type: 'ui',
        title: 'Vertical Settings Category Navigation',
        description: 'Streamlined Discord-inspired vertical dropdown selector with 6 dedicated preference panels.'
      },
      {
        type: 'improvement',
        title: 'Non-Blocking Eagle Setup Modal',
        description: 'Smooth opt-in permission onboarding flow for new and existing accounts without blocking app usage.'
      },
      {
        type: 'improvement',
        title: 'Silent Background Cloud Reconnection Sync',
        description: 'Decoupled task checkboxes from network latency with automatic conflict reconciliation on reconnect.'
      }
    ],
    changes: [
      {
        category: 'Features',
        items: [
          'System-wide floating Eagle companion accessible over any Android app',
          'Instant zero-latency task completion and offline task creation with UUIDs',
          'Vertical dropdown category navigation in Settings with 6 dedicated panels',
          'Non-blocking Eagle Overlay setup modal for new and existing accounts'
        ]
      },
      {
        category: 'Improvements',
        items: [
          'Silent background batch sync for pending tasks upon network reconnection',
          'Eliminated horizontal swipeable navigation ribbons in Settings for cleaner mobile usability',
          'Decoupled task checkboxes from network latency with automatic conflict reconciliation'
        ]
      }
    ]
  },
  {
    version: '1.9.0.1',
    releaseDate: 'October 27, 2026',
    title: 'Eagle Overlay Snapping Fix & Motion Refinements',
    isLatest: false,
    tagline: 'Refined touch drag edge-snapping, calendar task rollback alerts, and 60 FPS GPU transitions.',
    highlights: [
      'Eagle Overlay Physics: Fixed pointer release snapping to always snap to the nearest dragged edge accurately.',
      'Calendar Task Sync Feedback: Added instant alert toasts when task completion sync fails over the network.',
      'Hardware Back Dismissal: Tapping the Android back button now cleanly closes the expanded Eagle Quick Menu.',
      '60 FPS Hardware Acceleration: Optimized sheet slide and screen transitions using GPU-composited 3D transforms.'
    ],
    items: [
      {
        type: 'fix',
        title: 'Eagle Overlay Drag Physics & Edge Clamping',
        description: 'Resolved pointer release closure so the floating companion reliably snaps to the closest margin with viewport clamping.'
      },
      {
        type: 'ui',
        title: 'Hardware Back Button Popover Dismissal',
        description: 'Expanded Eagle Quick Glance popover now gracefully closes on Android hardware back press without altering app view.'
      },
      {
        type: 'fix',
        title: 'Calendar Task Cloud Sync Rollback Alerts',
        description: 'Added notification toast on network failure when toggling assignments inside the academic calendar agenda.'
      },
      {
        type: 'improvement',
        title: 'GPU-Accelerated 60 FPS Transitions',
        description: 'Upgraded modal sheet springs, page slides, and screen enter animations to hardware-composited translate3d transforms.'
      }
    ]
  },
  {
    version: '1.9.0.0',
    releaseDate: 'October 27, 2026',
    title: 'Assistive Eagle Overlay, Verified App Links & Cloud Sync',
    tagline: 'Floating AssistiveTouch quick companion, verified timetable web links, and instant task cloud sync.',
    highlights: [
      'Assistive Eagle Overlay: Draggable floating companion with Davao weather, up-next class info, and quick actions.',
      'Verified App Links Sharing: One-tap schedule sharing via web links with full timetable previews.',
      'Task Cloud Sync: Instant task completion toggle synchronized across devices with offline rollback protection.',
      '60 FPS UI Performance: Hardware-accelerated transitions and crash isolation for uninterrupted navigation.'
    ],
    items: [
      {
        type: 'feature',
        title: 'Floating Assistive Eagle Companion',
        description: 'Draggable edge-snapping overlay providing instant access to upcoming classes, weather, and app shortcuts.'
      },
      {
        type: 'feature',
        title: 'Verified Schedule App Links',
        description: 'Share timetables directly via skweladabaw.kurzyrio.site/share links with interactive web previews and app import.'
      },
      {
        type: 'improvement',
        title: 'Optimistic Cloud Task Sync',
        description: 'Completed tasks immediately sync to cloud storage with automatic offline fallback and rollback protection.'
      },
      {
        type: 'ui',
        title: 'Enhanced Mascot Loading Animations',
        description: 'Added orbital aura spinners and progress tracking to eagle companion loading screens.'
      },
      {
        type: 'fix',
        title: 'Safe Account Linking & In-App Deletions',
        description: 'Added two-option cloud resolution dialog protecting existing usernames, plus native-free post deletion prompts.'
      },
      {
        type: 'improvement',
        title: '60 FPS Transitions & Crash Shields',
        description: 'Replaced CPU shadow animations with GPU transforms and wrapped core tabs in error recovery boundaries.'
      }
    ]
  },
  {
    version: '1.8.1.3',
    releaseDate: 'October 25, 2026',
    title: 'Community Discussions Lifecycle Fix & View Isolation',
    tagline: 'Resolved blank screen crash on campus discussions and isolated feed view with resilient error recovery.',
    highlights: [
      'Community Feed Lifecycle Fix: Resolved initialization order preventing blank screen when opening campus discussions.',
      'View Crash Isolation: Added resilient boundary protection to keep navigation active during transient feed interruptions.'
    ],
    items: [
      {
        type: 'fix',
        title: 'Community Discussion Render Fix',
        description: 'Fixed variable initialization order in campus discussions preventing blank screen crash on launch.'
      },
      {
        type: 'improvement',
        title: 'View Boundary Protection',
        description: 'Wrapped discussions view in an error boundary to prevent full app crashes during network or rendering glitches.'
      }
    ]
  },
  {
    version: '1.8.1.2',
    releaseDate: 'October 24, 2026',
    title: 'Discussion Theming, Centered Lightbox Scroll Lock & Custom Report Modal',
    tagline: 'Portal-anchored theme-matching discussion button, background scroll lock on photo viewer, and native-less community report modal.',
    highlights: [
      'Image Lightbox Scroll Lock: Prevented the underlying screen from scrolling when previewing photos in full screen.',
      'Theme-Matching Discussion Trigger: The floating "+ Discussion" button is now anchored to the viewport and automatically matches your selected theme color.',
      'Custom Discussion Report Dialog: Replaced default system prompt with a sleek, in-app report modal featuring categorized safety violation options.'
    ],
    items: [
      {
        type: 'ui',
        title: 'Theme-Aligned Discussion Button',
        description: 'Refactored discussion buttons to adopt active theme accent colors and anchored floating action button to viewport body.'
      },
      {
        type: 'fix',
        title: 'Lightbox Background Scroll Prevention',
        description: 'Locked viewport scroll and touch pass-through while inspecting community photos.'
      },
      {
        type: 'feature',
        title: 'Custom In-App Report Dialog',
        description: 'Introduced dedicated violation category picker and reason form for reporting community posts without native browser prompts.'
      }
    ]
  },
  {
    version: '1.8.1.1',
    releaseDate: 'October 24, 2026',
    title: 'Discussion Photo Upload Fix, Centered Modal & Guest Account Link Conflict Manager',
    isLatest: false,
    tagline: 'Chunked media upload for discussion photos, centered composer dialog, theme-aware custom dropdowns, and smart guest account linking data sync.',
    highlights: [
      'Discussion Photo Upload Fix: Resolved post upload failures when attaching camera or gallery photos to community posts.',
      'Centered Discussion Composer: Fixed viewport vertical shift on the composer dialog for a clean, centered popup.',
      'Guest Account Linking Conflict Manager: When linking a Google account with existing cloud data, choose whether to restore your cloud profile or sync your current guest settings.',
      'Custom Dropdown Selectors: Replaced raw system spinner dropdowns with dark-mode aware custom selectors across community filters.'
    ],
    items: [
      {
        type: 'fix',
        title: 'Community Photo Upload Stabilization',
        description: 'Resolved FastCGI and column size constraints by uploading discussion photos in chunked media packets before publishing.'
      },
      {
        type: 'ui',
        title: 'Centered Discussion Modal & Redesigned Trigger Card',
        description: 'Portal-mounted discussion modal directly to document body to eliminate transform offsets, paired with a modern discussion creation card.'
      },
      {
        type: 'feature',
        title: 'Guest Account Linking Conflict Manager',
        description: 'Presents a data sync modal when linking a Google account with existing cloud data, allowing students to restore cloud data or apply guest customizations.'
      },
      {
        type: 'ui',
        title: 'Theme-Aware Custom Select Dropdowns',
        description: 'Replaced Android OS default spinners with customized dropdowns for campus and category selection.'
      }
    ]
  },
  {
    version: '1.8.1.0',
    releaseDate: 'October 24, 2026',
    title: 'DepEd Official Alerts, Davao Student Community & Tablet Dock Navigation',
    isLatest: false,
    tagline: 'Official DepEd Order 037 suspension guidelines, open Davao student community discussions, and refined tablet navigation dock.',
    highlights: [
      'Davao Student Community: Connect with fellow Davao students for Q&A, study tips, lost & found, and reviewer swaps with Google Sign-In verification.',
      'Official DepEd Alerts: Dedicated category filter and DepEd Order No. 037 s.2022 guidelines for typhoon signals, heat index, and earthquake advisories.',
      'Refined Tablet & PC Navigation: Replaced cluttered top bar on larger screens with a sleek, centered 6-item segmented floating dock.'
    ],
    items: [
      {
        type: 'feature',
        title: 'Davao Student Community Feed',
        description: 'A dedicated peer-to-peer student discussion space for Q&A, study tips, lost & found, reviewer swaps, and campus events.'
      },
      {
        type: 'feature',
        title: 'Official DepEd Alerts & Guidelines',
        description: 'Campus Bulletins now features official DepEd advisories and quick-reference rules for Typhoon Signals, Heat Index 40°C+, and Intensity V+ earthquakes.'
      },
      {
        type: 'ui',
        title: 'Centered Segmented Navigation Dock',
        description: 'Tablet and PC screens now feature a clean, centered 6-item floating navigation dock, eliminating horizontal clutter.'
      }
    ]
  },
  {
    version: '1.8.0.1',
    releaseDate: 'October 24, 2026',
    title: 'Task Tracker Lifecycle Patch',
    isLatest: false,
    tagline: 'Resolved initialization order in Task Tracker preventing blank screen regressions.',
    highlights: [
      'Task Tracker Blank Screen Fix: Corrected modal handler initialization order ensuring assignment lists and timers load smoothly.'
    ],
    items: [
      {
        type: 'fix',
        title: 'Task Tracker Blank Screen Resolution',
        description: 'Fixed component state initialization ordering that caused the Task Tracker page to fail rendering.'
      }
    ]
  },
  {
    version: '1.8.0.0',
    releaseDate: 'October 24, 2026',
    title: 'Davao Weather Hub, Task Editing & Smart Notification System',
    isLatest: false,
    tagline: 'Real-time Davao City weather and heat index advisories, editable academic tasks and routines, and streamlined class notifications.',
    highlights: [
      'Davao Weather & Heat Index Page: Track real-time temperatures, Davao heat index, 12-hour commute outlook, and DepEd/LGU class suspension guidelines.',
      'Editable Tasks & Routines: Easily modify existing assignments, due dates, course codes, and weekly day routine alarms with dedicated edit modals.',
      'Notification Deduplication: Eliminated forced duplicate alarms, ensuring class alarms trigger strictly according to your chosen reminder time.'
    ],
    items: [
      {
        type: 'feature',
        title: 'Live Davao Weather & Commuter Outlook',
        description: 'Access real-time Davao temperatures, apparent heat index, 12-hour hourly forecasts, and official LGU class suspension temperature thresholds.'
      },
      {
        type: 'feature',
        title: 'Editable Tasks & Weekly Routines',
        description: 'Easily modify existing assignments, due dates, course codes, and weekly day routine alarms with dedicated edit modals.'
      },
      {
        type: 'improvement',
        title: 'Streamlined Class Notifications',
        description: 'Removed duplicate background alarms, allowing class reminders to fire cleanly only when configured on that subject.'
      },
      {
        type: 'ui',
        title: 'Top Header Weather Pill',
        description: 'Quickly inspect current Davao weather conditions and jump straight to the Weather page directly from the app header.'
      }
    ]
  },
  {
    version: '1.7.8.1',
    releaseDate: 'October 23, 2026',
    title: 'Campus Announcement Posters & Flyer Display',
    isLatest: false,
    tagline: 'Full-resolution flyer posters and instant image loading on the student announcement board.',
    highlights: [
      'Campus Announcement Flyers: View full-resolution flyer photos and event posters directly on the campus bulletin board.',
      'Instant Poster Loading: Optimized image caching and smoother preview transitions when opening campus announcements.',
      'Display & Layout Fixes: Resolved display issues where large announcement flyers failed to render properly.'
    ],
    items: [
      {
        type: 'feature',
        title: 'Campus Announcement Posters',
        description: 'View attached flyers and posters cleanly on the campus bulletin board without image cutoff or distortion.'
      },
      {
        type: 'improvement',
        title: 'Poster Performance Optimization',
        description: 'Streamlined announcement image loading and reduced memory usage when opening high-resolution flyers.'
      }
    ]
  },
  {
    version: '1.7.8.0',
    releaseDate: 'October 23, 2026',
    title: 'Campus Bulletin Flyers & Timetable Schedule Focus',
    isLatest: false,
    tagline: 'Rich visual posters on campus bulletins, refined class schedule widgets, and transit route fixes.',
    highlights: [
      'Campus Bulletin Photo Posters: Visual posters and event flyers now display directly on campus advisories and announcements.',
      'Refined Scheduling Focus: Prioritized smart timetables, class countdown widgets, and routine reminder alerts.',
      'Transit Route & Notification Fixes: Resolved known jeepney route mapping bugs and timetable alert notification timing.'
    ],
    items: [
      {
        type: 'feature',
        title: 'Campus Bulletin Photo Posters',
        description: 'Campus advisories and student announcements now display rich photo posters and event flyers.'
      },
      {
        type: 'improvement',
        title: 'Timetable & Widget Refinements',
        description: 'Improved class schedule widget responsiveness and countdown accuracy on home screens.'
      },
      {
        type: 'fix',
        title: 'Transit Route & Alert Fixes',
        description: 'Fixed known jeepney route display alignment and timetable notification timing issues.'
      }
    ]
  },
  {
    version: '1.7.7.6',
    releaseDate: 'October 22, 2026',
    title: 'Custom Task Time Picker, Map Live Navigation & Survey Polish',
    isLatest: false,
    tagline: 'Custom time picker for tasks, live map navigation with accurate GPS, distinct feedback and survey views, and chat UI polish.',
    highlights: [
      'Custom Task Time: Setting task reminder times now uses the app\'s native wheel picker instead of the system clock.',
      'Live Route Navigation: Added Start Navigating with high-accuracy GPS tracking that keeps your location centered as you move.',
      'Survey & Feedback Split: Separated the experience into interactive campus surveys and direct feedback or bug reporting.',
      'Chat Media Polish: Sent photo borders now tightly hug images, and all user tags (Role, School, and Custom) are displayed.',
      'Daily Routine Reminders: Added Everyday repeating notifications for daily habits, and cleared default course data in GPA Calculator.'
    ],
    items: [
      {
        type: 'ui',
        title: 'Custom Task Time Picker',
        description: 'Creating or editing tasks now opens the native in-app wheel time picker modal matching the schedule creator.'
      },
      {
        type: 'feature',
        title: 'Live Map Navigation',
        description: 'Added a Start Navigating mode with continuous high-accuracy GPS updates and automatic map camera recentering.'
      },
      {
        type: 'improvement',
        title: 'Feedback and Survey Hub',
        description: 'Split into dedicated survey questions and direct bug or feature feedback with clean minimalist buttons.'
      },
      {
        type: 'ui',
        title: 'Chat Media and User Tags',
        description: 'Photo outlines now snugly wrap around sent media, and complete user role, school, and custom badges display in chat.'
      },
      {
        type: 'feature',
        title: 'Everyday Routine Reminders',
        description: 'Routines now support daily repeating notifications to ensure consistent habit tracking every day.'
      },
      {
        type: 'improvement',
        title: 'Clean Grade Calculator',
        description: 'Removed pre-populated mock course grades, providing a clean slate to add your own subjects or sync from schedule.'
      }
    ]
  },
  {
    version: '1.7.7.5',
    releaseDate: 'October 22, 2026',
    title: 'Baon Input, Theme Adaptation, Mascot Login & AI Scanner Polish',
    isLatest: false,
    tagline: 'Fixes baon budget input erasure, adapts splash screen to active themes, adds Bayani to login, and speeds up AI timetable scanning.',
    highlights: [
      'Baon Input Polish: Erasing baon no longer inserts 0, preventing accidental "0150" values when typing.',
      'Theme-Adaptive Loading: Splash screen now follows active theme tokens across light and dark modes.',
      'Aesthetic Login Mascot: Added Bayani mascot and welcome message to login while keeping it strictly single-screen.',
      'Authentication Modal Redesign: Replaced the harsh black loading overlay with a modern theme-adaptive modal.',
      'Google Login & AI Speedup: Fixed account-picker loop and reduced timetable extraction time from minutes to ~5 seconds.'
    ],
    items: [
      {
        type: 'fix',
        title: 'Baon Amount Input Polish',
        description: 'Enhanced allowance inputs so clearing the field leaves it blank without prepending zero.'
      },
      {
        type: 'ui',
        title: 'Theme-Adaptive Splash Screen',
        description: 'Splash screen now adapts to the active theme across light and dark modes.'
      },
      {
        type: 'ui',
        title: 'Login Page Bayani Companion',
        description: 'Embedded Bayani mascot and greeting in the login step while keeping single-screen layout.'
      },
      {
        type: 'ui',
        title: 'Redesigned Processing Overlay',
        description: 'Upgraded authentication loader to a clean theme-adaptive card.'
      },
      {
        type: 'fix',
        title: 'Google Sign-In Polish',
        description: 'Resolved account picker re-opening loop on login.'
      },
      {
        type: 'improvement',
        title: 'Fast Timetable Scanner',
        description: 'Optimized timetable image scanning for faster schedule imports.'
      }
    ]
  },
  {
    version: '1.7.7.4',
    releaseDate: 'October 22, 2026',
    title: 'Account Data Isolation & Profile Persistence Fix',
    isLatest: false,
    tagline: 'Guarantees 100% strict data separation between accounts and prevents profile settings from resetting on app restart.',
    highlights: [
      'Account Data Isolation: Class schedules, tasks, and routines stay strictly within the account that created them.',
      'Notification Account Sync: Previous account class alarms are canceled on switch, and current account reminders are scheduled.',
      'Profile Persistence on Restart: Preserved custom handles and selected campus so the app never resets to defaults or prompts repeatedly.',
      'Step 6 Mascot Language Fix: Enabled smooth switching between Bisaya, Tagalog, and English buttons with audible audio chime test.'
    ],
    items: [
      {
        type: 'fix',
        title: 'Account Timetable & Data Isolation',
        description: 'Prevented schedules, tasks, and routines from copying across accounts or into guest mode on logout.'
      },
      {
        type: 'fix',
        title: 'Notification Synchronization for Current User',
        description: 'Ensured Android alarms and persistent notifications only fire for the currently active student session.'
      },
      {
        type: 'fix',
        title: 'Profile Reset and Setup Modal Elimination',
        description: 'Fixed server-side username upsert and client cloud hydration to preserve custom handle and campus across restarts.'
      },
      {
        type: 'ui',
        title: 'Step 6 Language Selection & Audio Test',
        description: 'Synchronized dialogue language state and added responsive touch targets for all language choices and chime preview.'
      }
    ]
  },
  {
    version: '1.7.7.3',
    releaseDate: 'October 22, 2026',
    title: 'New Account Onboarding Flow Restoration',
    isLatest: false,
    tagline: 'Ensures all newly created Google accounts properly navigate through the complete student setup and profile onboarding flow.',
    highlights: [
      'New Account Onboarding Routing: First-time students signing in with Google reliably transition to Step 2 onboarding to customize student profile.',
      'Returning Student Verification: Accurately distinguishes established students with verified custom usernames from brand new accounts.',
      'Cloud Sync Onboarding Guard: Prevents un-onboarded profiles from falsely marking setup as complete during initial sync or app startup.',
      'MySQL Profile Status Alignment: Updated lookup API to treat auto-generated student handles as incomplete onboarding until verified.'
    ],
    items: [
      {
        type: 'fix',
        title: 'New Student Onboarding Routing',
        description: 'Ensures newly created accounts always transition to Step 2 to configure their profile and campus details.'
      },
      {
        type: 'fix',
        title: 'Accurate Returning Student Verification',
        description: 'Restricts instant login bypass strictly to returning students who have already chosen their handle and completed setup.'
      },
      {
        type: 'improvement',
        title: 'Startup Onboarding Guard',
        description: 'Prevents incomplete profiles from prematurely suppressing the onboarding experience on app launch.'
      }
    ]
  },
  {
    version: '1.7.7.2',
    releaseDate: 'October 22, 2026',
    title: 'Clean Single-Viewport Login & New Account Verification Fix',
    isLatest: false,
    tagline: 'Fixes new Google account verification on login and redesigns the welcome screen into a clean, strictly non-scrollable viewport.',
    highlights: [
      'New Account Creation Fix: Resolved MySQL PDO parameter reuse in auth helper, eliminating false server error banners on first-time logins.',
      '4-State Verification Discrimination: Properly separated new user registration from genuine network errors without false connection failure banners.',
      'Single-Viewport Login UI: Redesigned welcome screen to 100dvh non-scrollable viewport with compact branding, segmented language toggle, and feature badges.',
      'Eliminated Dashboard Bar Bleed: Removed top dashboard shortcuts and talking mascot quick actions from displaying over the login interface.'
    ],
    items: [
      {
        type: 'fix',
        title: 'New Google Account Server Verification',
        description: 'Fixed database error on new user account lookup and ensured new Google accounts proceed cleanly to onboarding.'
      },
      {
        type: 'ui',
        title: 'Single-Viewport Non-Scrollable Login Layout',
        description: 'Constrained login screen to 100dvh with compact branding, segmented language toggle, and feature badges.'
      },
      {
        type: 'ui',
        title: 'Eliminated Dashboard Bar Bleed on Login',
        description: 'Unmounted top dashboard shortcuts and talking mascot quick actions from displaying over the login screen.'
      }
    ]
  },
  {
    version: '1.7.7.1',
    releaseDate: 'October 22, 2026',
    title: 'Strict Profile Verification & Setup Guardrail',
    isLatest: false,
    tagline: 'Eliminates false setup popups on app launch and device switch with strict 4-state profile verification.',
    highlights: [
      'Strict 4-State Verification: Prevents premature setup popups during loading, network drops, or database errors.',
      'Cross-Device Login Guardrail: Existing Google Sign-In students immediately enter the app without redundant setup prompts.',
      'MySQL Schema Sync: Synchronized database setup status and restricted verification strictly to core required fields.'
    ],
    items: [
      {
        type: 'fix',
        title: 'Setup Popup False Triggers',
        description: 'Replaced naive field checks with an explicit state machine preventing false account setup prompts.'
      },
      {
        type: 'improvement',
        title: 'Seamless Cross-Device Login',
        description: 'Allows students logging in on new devices to immediately access their accounts without forced password setup.'
      },
      {
        type: 'improvement',
        title: 'Database Schema Synchronization',
        description: 'Added is_setup_complete flag in MySQL and aligned core onboarding validation.'
      }
    ]
  },
  {
    version: '1.7.7.0',
    releaseDate: 'October 22, 2026',
    title: 'Campus Chat Safety, Dynamic Channels & Rich Media Viewing',
    isLatest: false,
    tagline: 'Community incident reporting, cloud-synced campus chat channels, and rich photo previews in discussions.',
    highlights: [
      'Community Safety Reporting: In-app reporting pipeline to keep student discussions safe, constructive, and harassment-free.',
      'Dynamic Campus Channels: Cloud-synchronized discussion channels organized by campus hub and student interests.',
      'Rich Media Lightbox: Tap to zoom and inspect shared photos, study spots, and commute routes within campus chat.',
      'AMOLED Chat Polish: Streamlined message bubbles with clean semantic badges and enhanced contrast.'
    ],
    items: [
      {
        type: 'feature',
        title: 'Community Incident Reporting',
        description: 'Students can report harassment, impersonation, or guideline violations directly within community chat.'
      },
      {
        type: 'feature',
        title: 'Dynamic Campus Channels',
        description: 'Campus channels update automatically from the cloud to reflect campus hubs and active study groups.'
      },
      {
        type: 'improvement',
        title: 'Rich Media Lightbox',
        description: 'Shared photos, study spots, and commute routes now open in an interactive zoomable modal lightbox.'
      },
      {
        type: 'ui',
        title: 'AMOLED Chat Polish',
        description: 'Polished chat bubble typography and replaced cluttered icons with clean semantic tags.'
      }
    ]
  },
  {
    version: '1.7.6.14',
    releaseDate: 'October 22, 2026',
    title: 'Xiaomi HyperOS Native Google Sign-In Hardening & Account Picker Fix',
    isLatest: false,
    tagline: 'Native Activity-bound Credential Manager with GetSignInWithGoogleOption and seamless legacy fallback for Xiaomi MIUI / HyperOS.',
    highlights: [
      'Universal Account Picker: Fixes Google account picker popup on Xiaomi HyperOS and MIUI using active Activity window tokens.',
      'Resilient Sign-In Fallback: Automatically invokes legacy GoogleSignInClient if Credential Manager throws an exception.',
      'Preserved Auth Identity: Maps directly to existing Firebase UIDs, schedule data, and session states without disruption.'
    ],
    items: [
      {
        type: 'fix',
        title: 'Xiaomi HyperOS Google Sign-In Hardening',
        description: 'Binds Credential Manager to active Activity context and adds automated fallback to legacy Google Sign-In.'
      },
      {
        type: 'improvement',
        title: 'Native Auth Token Bridge',
        description: 'Authenticates native Google ID tokens against Firebase JS SDK preserving user UIDs and offline timetable sync.'
      }
    ]
  },
  {
    version: '1.7.6.13',
    releaseDate: 'October 22, 2026',
    title: 'Chunked Chat Media Upload & Universal Map Location Settings Prompt',
    isLatest: false,
    tagline: 'Chunked Base64 upload pipeline bypassing server buffer barriers, and portalized Location Settings prompt across all transit maps.',
    highlights: [
      'Chunked Chat Photo Upload: Streamlined photo uploads into safe sequential chunks, eliminating upload failures on lounge chat.',
      'Universal Location Prompt: Clean "Go to Settings" dialog on Jeep and DC Bus live maps directing users to device GPS settings.'
    ],
    items: [
      {
        type: 'fix',
        title: 'Resilient Chunked Media Upload',
        description: 'Slices images into ~9.5KB base64 payloads to bypass server memory limits and missing temp folder errors.'
      },
      {
        type: 'improvement',
        title: 'Universal Location Settings Dialog',
        description: 'Standardized portalized GPS prompt across both Jeepney and DC Bus maps guiding commuters to device location settings.'
      }
    ]
  },
  {
    version: '1.7.6.12',
    releaseDate: 'October 22, 2026',
    title: 'Chat Attachment Staging, Native Location Settings & Upload Fix',
    isLatest: false,
    tagline: 'Telegram/Discord-style attachment staging with caption support, hardened chat photo upload pipeline, and clean Location Settings prompt.',
    highlights: [
      'Attachment Staging: Staged photo, jeep route, commute alert, and study spot attachments with removable chips so users can add captions before sending.',
      'Chat Upload Pipeline Fix: Resolved empty payload upload error on PHP with genuine File payloads, native HTTP dispatch, and multi-alias decoding.',
      'Location Settings Action: Added a clear "Go to Settings" prompt for device location instead of automatic intent launching.'
    ],
    items: [
      {
        type: 'feature',
        title: 'Telegram/Discord-Style Attachment Staging',
        description: 'Selected photos, jeep routes, commute alerts, and study spots are staged in the input area with preview cards and remove buttons, allowing caption entry before dispatch.'
      },
      {
        type: 'fix',
        title: 'Chat Media Upload Pipeline',
        description: 'Hardened photo upload API and transport against missing multipart boundaries, base64 payload drops, and CapacitorHttp serialization issues.'
      },
      {
        type: 'improvement',
        title: 'User-Permission Guided Location Settings',
        description: 'Replaced abrupt automatic settings launches with a clean modal featuring a prominent "Go to Settings" button and "Cancel" option.'
      }
    ]
  },
  {
    version: '1.7.6.11',
    releaseDate: 'October 22, 2026',
    title: 'Chat Resilience, Native GPS Settings Intent & Account Deduplication',
    isLatest: false,
    tagline: 'Hardened lounge chat against blank renders, added direct native GPS settings opening, and improved account deduplication.',
    highlights: [
      'Chat Resilience: Added empty state welcoming placeholder, null-safety guards, and ErrorBoundary protection against render crashes.',
      'Native Location Intent: Implemented direct system prompt and settings intent opening device Location toggle immediately when GPS is off.',
      'MySQL Account Deduplication: Hardened profile attribute preservation (verification, roles, custom tags, usernames) across email mergers.',
      'Navigation Dock Fix: Harmonized GWA Calculator tab IDs eliminating blank page routing.'
    ],
    items: [
      {
        type: 'fix',
        title: 'Community Chat Guardrails & Empty State',
        description: 'Added lounge empty state and ErrorBoundary wrapper to prevent chat page from rendering blank.'
      },
      {
        type: 'feature',
        title: 'Native Device Location Request',
        description: 'Opening device Location settings directly when GPS is off so commuters can enable it in one tap.'
      },
      {
        type: 'improvement',
        title: 'Consolidated Account Deduplication',
        description: 'Preserves user verification badges, roles, custom tags, and usernames during duplicate account unification.'
      },
      {
        type: 'fix',
        title: 'Navigation Dock Route Alignment',
        description: 'Fixed GWA Calculator tab routing to ensure consistent loading without blank screens.'
      }
    ]
  },
  {
    version: '1.7.6.10',
    releaseDate: 'October 22, 2026',
    title: 'Chat Render Fix, Account Deduplication & Life360 Location Prompt',
    isLatest: false,
    tagline: 'Fixed blank lounge chat screen, added MySQL account deduplication by email, and introduced Google Maps/Life360 style location prompts.',
    highlights: [
      'Chat Render Restoration: Fixed undefined date separator reference error and resolved category union types that caused the lounge to render blank.',
      'MySQL Account Deduplication: Added automatic account linking and data merging by verified email address in cloud synchronization.',
      'Device Location Prompt: Added Google Maps and Life360 style prompt dialogs when GPS is turned off or location access is denied.',
      'Map Crosshair Responsiveness: Added responsive loading spinner and single-tap retry directly from the location prompt.'
    ],
    items: [
      {
        type: 'fix',
        title: 'Community Chat Blank Screen Resolution',
        description: 'Defined missing dateLabel reference in message timeline divider and harmonized lounge category union types.'
      },
      {
        type: 'improvement',
        title: 'MySQL Account Deduplication & Relinking',
        description: 'Safely matched existing student profiles by verified email address to prevent duplicate accounts and preserve cloud timetable data.'
      },
      {
        type: 'improvement',
        title: 'Life360 & Google Maps Style Location Prompts',
        description: 'Added interactive dialogs when device Location is disabled or denied with direct retry and Quick Settings guidance.'
      }
    ]
  },
  {
    version: '1.7.6.9',
    releaseDate: 'October 22, 2026',
    title: 'Photo Uploads, Timetable Persistence & Chat Drawer Polish',
    isLatest: false,
    tagline: 'Reliable album attachments, timetable cloud sync, embedded card visual fixes, and enhanced upload indicators.',
    highlights: [
      'Photo Gallery Access: Restored photo picker permissions and base64 transmission for seamless image sending.',
      'Schedule Persistence: Fixed timetable reset on logout by ensuring cloud synchronization before account cleanup.',
      'Theme-Blended Embeds: Removed white card backgrounds on route, spot, and alert embeds in light mode.',
      'Live Upload Progress: Enhanced optimistic image loading bubble with progress bar and retry actions.',
      'Lounges Drawer: Redesigned chat channels into a slide-over drawer and removed hashtag prefixes.'
    ],
    items: [
      {
        type: 'fix',
        title: 'Photo Gallery Access & Decoupled Transfer',
        description: 'Fixed photo picker access on modern Android devices and ensured image payloads are received reliably.'
      },
      {
        type: 'fix',
        title: 'Timetable Cloud Persistence on Logout',
        description: 'Preserved local schedule state during sign-out and resolved MySQL cloud sync hydration errors.'
      },
      {
        type: 'ui',
        title: 'Seamless Chat Embed Styling',
        description: 'Eliminated white card backgrounds in light mode and formatted routes to fit mobile screens.'
      },
      {
        type: 'ui',
        title: 'Optimistic Upload Progress & Chat Drawer',
        description: 'Added a responsive upload progress bar and overhauled chat channel navigation into a slide-over drawer.'
      }
    ]
  },
  {
    version: '1.7.6.8',
    releaseDate: 'October 22, 2026',
    title: 'Photo Gallery Access, Schedule Cloud Persistence & Chat UI Overhaul',
    isLatest: false,
    tagline: 'Reliable photo sharing with album picker permissions, timetable cloud persistence on logout, clean embed cards, and a slide-over lounges drawer.',
    highlights: [
      'Photo Gallery Permissions: Added modern visual media permissions and direct image decoding to guarantee photos send reliably.',
      'Schedule Cloud Persistence: Guaranteed cloud sync before logging out so student timetables and tasks are never reset or lost.',
      'Clean Chat Embeds: Removed duplicate white outer card backgrounds from shared routes, traffic alerts, and study spots.',
      'In-Chat Photo Progress: Added an upload bubble with real-time progress indicators, thumbnail previews, and retry actions.',
      'Lounge Slide-Over Drawer: Replaced horizontal tabs with a clean side drawer for chat lounges without hashtag prefixes.'
    ],
    items: [
      {
        type: 'fix',
        title: 'Photo Gallery Access & Transfer',
        description: 'Resolved album photo sending by declaring visual user selected permissions and using native DataURL transfer.'
      },
      {
        type: 'fix',
        title: 'Schedule Cloud Persistence on Logout',
        description: 'Fixed schedule loss by enforcing synchronous cloud backup before local database cleanup during account sign-out.'
      },
      {
        type: 'ui',
        title: 'Seamless Chat Embed Cards',
        description: 'Removed unnecessary double white container borders and backgrounds around shared transit routes, spots, and alerts.'
      },
      {
        type: 'ui',
        title: 'Responsive Journey Layout',
        description: 'Restructured shared route cards into a vertical timeline to prevent text and icon overflow on narrow screens.'
      },
      {
        type: 'feature',
        title: 'In-Chat Photo Upload Indicator',
        description: 'Added an in-feed preview bubble with spinner and retry controls while photos are uploading.'
      },
      {
        type: 'improvement',
        title: 'Lounge Navigation Drawer',
        description: 'Introduced an organized slide-out drawer for student chat lounges with hashtag-free titles.'
      }
    ]
  },
  {
    version: '1.7.6.7',
    releaseDate: 'October 21, 2026',
    title: 'Chat Reliability, Map Tracking Unstick & Timetable Polish',
    isLatest: false,
    tagline: 'Reliable chat persistence, full-height chat layout without top bar, map tracking unstick, streamlined channels, and weekly timetable polish.',
    highlights: [
      'Chat Persistence & Media: Fixed message auto-deletion, restored HD photo uploads, and streamlined channels to General and Commute Alerts.',
      'Native Chat Interface: Removed top header bar on chat for full-height messaging, safe-area top padding, and removed online status badges.',
      'Map Tracking Unstick: Resolved tracking lock bug on transit map, allowing instant destination picking and one-tap exit tracking.',
      'Schedule & Timetable Polish: Removed duplicate tasks subtab from schedule and eliminated harsh outer borders on the weekly timetable.'
    ],
    items: [
      {
        type: 'fix',
        title: 'Chat Message Persistence',
        description: 'Fixed an issue where sent messages disappeared after polling by auto-upserting student records and merging optimistic message states.'
      },
      {
        type: 'ui',
        title: 'Full-Height Native Chat View',
        description: 'Removed the top app bar and connection status badges on the chat page to provide an immersive messaging experience with safe-area padding.'
      },
      {
        type: 'improvement',
        title: 'Streamlined Chat Channels',
        description: 'Reduced default channels to General Chat and Commute & Traffic Alerts, with dynamic backend channel support and saved selection.'
      },
      {
        type: 'ui',
        title: 'Responsive Embed Cards',
        description: 'Eliminated horizontal overflow and dark mode white outlines on shared transit route, alert, and study spot cards.'
      },
      {
        type: 'fix',
        title: 'Map Route Tracking Unstick',
        description: 'Fixed an issue where the transit map became locked on a tracked route, adding prominent exit tracking controls and auto-clearing on new points.'
      },
      {
        type: 'improvement',
        title: 'HD Photo Upload Quality',
        description: 'Upgraded chat media compression to 1080p/1920p with 88% quality, bypassing re-encoding for lightweight images.'
      },
      {
        type: 'ui',
        title: 'Timetable & Schedule Clean-Up',
        description: 'Removed the redundant tasks subtab from schedule and removed harsh outer border outlines on the weekly timetable grid.'
      },
      {
        type: 'improvement',
        title: 'Refined Class Reminder Alarms',
        description: 'Upgraded live in-app class alert banners with textured Lucide icons and clean dismissal controls.'
      }
    ]
  },
  {
    version: '1.7.6.6',
    releaseDate: 'October 21, 2026',
    title: 'Dedicated Chat Layout & Full Attachment Engine',
    isLatest: false,
    tagline: 'Dedicated full-height chat layout without navbar underlap, functional media and card attachments, and seamless transit inspection.',
    highlights: [
      'Dedicated Chat Layout: Bottom navigation dock hides inside chat on mobile to prevent underlapping, paired with a header back navigation button.',
      'Full Attachment Engine: Fixed media and card sharing runtime issues for photos, Davao jeep routes, study spots, and commute alerts.',
      'Actionable Embeds: Linked route and study spot embed action buttons to live Jeepney map tracking and study spot discovery.'
    ],
    items: [
      {
        type: 'ui',
        title: 'Dedicated Full-Height Chat',
        description: 'Eliminated bottom navbar underlap and padded gaps, docking the chat box cleanly at the bottom with a header back button.'
      },
      {
        type: 'fix',
        title: 'Chat Attachment Handlers',
        description: 'Fixed undefined variable references that prevented sending photos, transit routes, commute alerts, and study spots.'
      },
      {
        type: 'improvement',
        title: 'Interactive Card Navigation',
        description: 'Tapping View on Map or Explore in Study Spots now immediately switches tabs and focuses the target item.'
      },
      {
        type: 'fix',
        title: 'MySQL Backward Compatibility',
        description: 'Ensured full compatibility between historical chat records and new rich embed payloads with clean text fallbacks.'
      }
    ]
  },
  {
    version: '1.7.6.5',
    releaseDate: 'October 21, 2026',
    title: 'Multi-Format Media Engine, Rich Transit & Alert Embeds',
    isLatest: false,
    tagline: 'Multi-format media pipeline for PNG, JPEG, and animated GIFs, with Discord/Telegram rich cards for transit routes, alerts, and spots.',
    highlights: [
      'Multi-Format Media Pipeline: Added full support for uploading PNG, JPEG, WebP, and animated GIFs without losing animation frames or transparency.',
      'Discord/Telegram Rich Embeds: Formatted shared transit routes, commute alerts, and study spots into distinct, structured cards with colored accent bars.',
      'Persistent Transit Sharing: Connected student user ID authentication fallback to ensure shared routes and alerts are verified and saved to MySQL.'
    ],
    items: [
      {
        type: 'feature',
        title: 'Multi-Format Media Pipeline',
        description: 'Engineered animation-preserving GIF bypass and alpha-preserving PNG compression with multipart streaming.'
      },
      {
        type: 'feature',
        title: 'Discord/Telegram Style Rich Embeds',
        description: 'Transformed shared transit routes, commute alerts, and study spots into distinct stylized embeds with action buttons.'
      },
      {
        type: 'fix',
        title: 'Transit & Alert Sharing Persistence',
        description: 'Connected student user ID fallback authentication to eliminate token dropouts and persist shared items in MySQL.'
      }
    ]
  },
  {
    version: '1.7.6.4',
    releaseDate: 'October 21, 2026',
    title: 'Photo Upload Resilience, Commute Pickers & Chatbox Keyboard Clearance',
    isLatest: false,
    tagline: 'Multi-source photo upload ingestion, interactive transit and study spot pickers, and flush keyboard chatbox clearance.',
    highlights: [
      'Photo Upload Multi-Source Ingestion: Resolved "No media file or image payload received" by supporting base64 extraction across all client formats.',
      'Interactive Content Pickers: Added dedicated modal sheets to browse and share Davao jeepney routes, popular study spots, and live traffic alerts.',
      'Flush Chatbox Keyboard Clearance: Removed faulty viewport resize reset, allowing chat input dock to sit tightly against the virtual keyboard without high gap.'
    ],
    items: [
      {
        type: 'fix',
        title: 'Chat Photo Upload Ingestion',
        description: 'Fixed backend media parsing to support JSON, form-data, and raw payloads, preventing upload failures on native Android.'
      },
      {
        type: 'feature',
        title: 'Interactive Route, Alert & Spot Pickers',
        description: 'Introduced searchable picker sheets for sharing Davao jeepney routes, live commute alerts, and study spots directly to chat.'
      },
      {
        type: 'ui',
        title: 'Chatbox Soft Keyboard Clearance',
        description: 'Streamlined input dock padding to sit flush against the soft keyboard, eliminating the high blank gap while typing.'
      }
    ]
  },
  {
    version: '1.7.6.3',
    releaseDate: 'October 21, 2026',
    title: 'Chat Page Restoration & Workspace Update Guard',
    isLatest: false,
    tagline: 'Resolved chat page initialization black screen, enhanced keyboard clearance detection, and added workspace update integrity rule.',
    highlights: [
      'Chat Page Crash Fix: Hoisted state declarations to eliminate lifecycle ReferenceError that caused a black screen on chat tab mount.',
      'Input & Keyboard Clearance: Strengthened virtual keyboard detection so floating navigation dock stays securely hidden during text entry.',
      'Workspace Update Protocol: Added Rule 8 enforcing full-stack asset synchronization, regression testing, and zero incomplete refactors.'
    ],
    items: [
      {
        type: 'fix',
        title: 'Chat Tab Blank Screen Resolved',
        description: 'Fixed temporal dead zone reference error in chat component state dependencies, ensuring seamless instant rendering.'
      },
      {
        type: 'improvement',
        title: 'Bulletproof Keyboard Detection',
        description: 'Integrated window focusin and viewport height tracking to prevent navigation bar from appearing above soft keyboard.'
      },
      {
        type: 'improvement',
        title: 'Full-Stack Synchronization Standard',
        description: 'Enacted Rule 8 in workspace guidelines to mandate comprehensive verification across native, web, and backend code.'
      }
    ]
  },
  {
    version: '1.7.6.2',
    releaseDate: 'October 21, 2026',
    title: 'Navbar Keyboard Clearance, Photo Upload Fix & Single Password Flow',
    isLatest: false,
    tagline: 'Automatic navbar hiding above keyboard, native Android photo picker integration, and elimination of duplicate password prompts.',
    highlights: [
      'Navbar Keyboard Clearance: Floating navbar automatically docks at bottom and slides out of view whenever the keyboard or attachment drawers open.',
      'Native Gallery Photo Sharing: Integrated Capacitor Camera picker and fixed WebP compression CORS handling for instant photo uploads in community chat.',
      'Single Password Verification: Streamlined password flow to prompt exactly once, eliminating repetitive password popups upon login and app startup.',
      'Portaled Attachment Drawer: Drawer renders at top document level so it cleanly overlays navigation chrome without visual clipping.'
    ],
    items: [
      {
        type: 'fix',
        title: 'Virtual Keyboard Navbar Clearance',
        description: 'Added visual viewport listener to navbar and chat drawers, ensuring the dock never hovers above the soft keyboard or covers inputs.'
      },
      {
        type: 'feature',
        title: 'Native Android Photo Sharing',
        description: 'Switched chat photo attachments to the native system photo picker and resolved canvas compression CORS issues on mobile WebViews.'
      },
      {
        type: 'improvement',
        title: 'Single Password Verification Guard',
        description: 'Enforced session and local storage guards so account passwords are requested strictly once, preventing duplicate popups.'
      }
    ]
  },
  {
    version: '1.7.6.1',
    releaseDate: 'October 21, 2026',
    title: 'Onboarding Render Fix & Existing Account Password Setup',
    isLatest: false,
    tagline: 'Fix for black screen on logout and relaunch, with proactive password setup prompts for existing accounts.',
    highlights: [
      'Black Screen on Logout Fix: Eliminated obsolete conditional check in the main view tree, ensuring instant onboarding presentation on logout and app launch.',
      'Proactive Password & Data Setup: Added prompt modal for existing accounts to establish their account password and complete missing profile details upon updating.'
    ],
    items: [
      {
        type: 'fix',
        title: 'Logout & Launch Black Screen Resolution',
        description: 'Fixed view rendering gate on onboarding state, preventing blank screen crashes after user logout and subsequent app launches.'
      },
      {
        type: 'improvement',
        title: 'Existing Account Password Setup Modal',
        description: 'Proactively prompts existing accounts upon app startup to establish a secure Firebase password and fill missing profile information.'
      }
    ]
  },
  {
    version: '1.7.6.0',
    releaseDate: 'October 21, 2026',
    title: 'Firebase Password Auth, Streamlined Onboarding, Compass Heading & Rich Chat',
    isLatest: false,
    tagline: 'Firebase authentication passwords, streamlined new/existing onboarding, ghost session detection, compass heading indicator, and rich community chat media.',
    highlights: [
      'Firebase Password Auth: Unified secure password protection hosted entirely on Firebase Authentication.',
      'Streamlined Onboarding: Split Google sign-in workflow for new vs existing accounts with zero redundant prompts.',
      'Ghost Session & Missing Info Modals: Added non-intrusive re-login and profile update prompts, strictly offline-exempt.',
      'Compass Heading Indicator: Added real-time directional beam on user location with GPS status diagnostics.',
      'Rich Community Chat Media: Telegram/Discord-style attachment drawer for compressed WebP photos and route sharing.',
      'Legacy PIN Lock Removed: Replaced local PIN locks with full Firebase account password security.'
    ],
    items: [
      {
        type: 'feature',
        title: 'Firebase Password Protection',
        description: 'New accounts create and link account passwords securely via Firebase Authentication, with password verification for existing logins.'
      },
      {
        type: 'improvement',
        title: 'Split Onboarding Architecture',
        description: 'Differentiates existing users from new users upon Google sign-in to eliminate redundant login prompts and deliver instant access.'
      },
      {
        type: 'improvement',
        title: 'Session Verification & Profile Completeness',
        description: 'Detects wiped or corrupted cloud sessions and prompts for missing profile fields while safely exempting offline devices.'
      },
      {
        type: 'feature',
        title: 'Real-time Compass Heading Beam',
        description: 'User location dot displays a dynamic directional beam that rotates with phone compass orientation, alongside quick GPS status prompts.'
      },
      {
        type: 'feature',
        title: 'Rich Community Chat & Media Sharing',
        description: 'Added paperclip attachment drawer with client-side WebP photo compression, interactive transit route cards, and 1-tap route sharing.'
      },
      {
        type: 'security',
        title: 'Legacy PIN Lock Removal',
        description: 'Removed legacy app PIN locks from settings and state management in favor of standard Firebase account authentication.'
      }
    ]
  },
  {
    version: '1.7.5.8',
    releaseDate: 'October 20, 2026',
    title: 'First-Road-Contact Snapping, Straight-Line Fix & Trike Guidance',
    isLatest: false,
    tagline: 'First-road-contact pickup snapping, elimination of diagonal route lines, route de-duplication, trike guidance, and commuter advice.',
    highlights: [
      'First-Road-Contact Boarding: Pickup points snap to the exact road junction where commuter walking paths reach the transit corridor.',
      'Eliminated Diagonal Straight Lines: Fixed route geometry handling on linear routes to prevent long straight-line artifacts across the city.',
      'Route De-duplication: Removed duplicate tabs so each transit line displays only its single best, fastest option.',
      'Long Walk Trike Guidance: Added guidance to take a local Trike or Bao-Bao for walking legs exceeding 500 meters.',
      'Out-of-Coverage & Commuter Advice: Added an alert card with Google Maps link for points outside Davao City, plus practical commuter tips.'
    ],
    items: [
      {
        type: 'improvement',
        title: 'First-Road-Contact Boarding Snapping',
        description: 'Transit router snaps boarding pins directly to the road exit where the pedestrian path reaches the highway corridor.'
      },
      {
        type: 'fix',
        title: 'Eliminated Diagonal Straight Line Slices',
        description: 'Restricted terminus wrapping to true circular routes, eliminating long straight-line visual artifacts on linear routes.'
      },
      {
        type: 'improvement',
        title: 'Route Option De-duplication',
        description: 'Consolidated candidate journeys to display only the single optimal option per unique transit route.'
      },
      {
        type: 'ui',
        title: 'Long Walk Trike & Bao-Bao Recommendation',
        description: 'Displays helpful prompts advising commuters to take a tricycle or bao-bao when pickup points are over 500 meters away.'
      },
      {
        type: 'ui',
        title: 'Out-of-Coverage Alert & Commuter Tips',
        description: 'Provides external Google Maps routing for points outside Davao City and practical advice for navigating local jeepneys.'
      }
    ]
  },
  {
    version: '1.7.5.7',
    releaseDate: 'October 20, 2026',
    title: 'Offline Pedestrian Graph, Road-Matched Transit & Map Style Switch Fix',
    isLatest: false,
    tagline: 'Authentic Davao pedestrian graph routing, road-matched transit curves, style switch route persistence, and instant map pinning.',
    highlights: [
      'Offline Pedestrian Graph: Local high-precision binary graph with A* routing delivers authentic walking paths in <2ms, eliminating highway median loops.',
      'Road-Matched Transit Geometries: Integrated road-matched paths for 105+ Davao jeepney patterns so transit routes follow exact road curves.',
      'Tile Switch Route Persistence: Reconstructed layer rendering on vector style changes to guarantee route lines never disappear when switching map styles.',
      'Instant Map Pinning from Search: Added direct Set on Map option from the search modal and enhanced GPS geolocation for immediate location detection.'
    ],
    items: [
      {
        type: 'feature',
        title: 'Offline Davao Pedestrian Routing Graph',
        description: 'Embedded pre-compiled binary pedestrian graph with spatial hash grid and A* search for ultra-fast, authentic Davao footpaths.'
      },
      {
        type: 'improvement',
        title: 'Road-Matched Jeepney Route Polylines',
        description: 'Upgraded 105+ transit patterns with road-matched coordinate geometries that follow authentic roadway curvatures.'
      },
      {
        type: 'fix',
        title: 'Map Style Switch Route Layer Persistence',
        description: 'Resolved route disappearance when toggling map styles via diff-free loading and automated styledata layer reconciliation.'
      },
      {
        type: 'ui',
        title: 'Instant Map Pinning from Search Modal',
        description: 'Added a dedicated Set Location on Map action in the place search modal to easily select arbitrary map coordinates.'
      }
    ]
  },
  {
    version: '1.7.5.6',
    releaseDate: 'October 20, 2026',
    title: 'Nearest Road Snapping, Tile Style Switching & Initial Map Loading Overlay',
    isLatest: false,
    tagline: 'Pedestrian walk-minimizing transit snapping, route persistence across vector tile switches, and smooth initial map loading.',
    highlights: [
      'Nearest Road Snapping: Router optimizes candidate pairs to minimize pedestrian walking, boarding directly at the closest road intersection.',
      'Tile Switch Route Persistence: Re-mounts all transit lines and pickup/dropoff markers immediately upon vector map style changes.',
      'Initial Map Loading Overlay: Renders a smooth loading state over the canvas until vector tiles are ready, eliminating startup flashes.',
      'Bounded Camera Zoom: Enforces strict zoom constraints (11 to 16) to completely eliminate unexpected camera zoom-outs.'
    ],
    items: [
      {
        type: 'improvement',
        title: 'Nearest Road Pedestrian Snapping',
        description: 'Optimized candidate scoring to prioritize the closest perpendicular road intersection, eliminating distant walking detours.'
      },
      {
        type: 'fix',
        title: 'Map Style Switch Route Persistence',
        description: 'Tracked style.load lifecycle events to seamlessly re-draw transit routes and markers when switching map styles.'
      },
      {
        type: 'ui',
        title: 'Initial Map Loading Overlay',
        description: 'Added an authentic loading overlay that displays until map vector tiles are completely rendered.'
      },
      {
        type: 'fix',
        title: 'Camera Zoom Bounds Stabilization',
        description: 'Enforced metropolitan zoom limits (11 to 16) to ensure the map never zooms out to the globe during routing.'
      }
    ]
  },
  {
    version: '1.7.5.5',
    releaseDate: 'October 20, 2026',
    title: 'Crash Immunity, Smart Street Routing & Camera Bounds Stabilization',
    isLatest: false,
    tagline: 'Defensive React error boundary, multi-provider walking router, antimeridian bounds stabilization, and multi-tier GPS location.',
    highlights: [
      'Blackout Crash Immunity: Wrapped transit map in defensive try-catch handlers and error boundaries to prevent app unmounts.',
      'Authentic Sidewalk Paths: Integrated resilient 2-tier pedestrian routing engine for authentic street-following walking paths.',
      'Stable Camera Bounds: Eliminated 360-degree antimeridian bounds wrapping that previously caused full-world zoom-outs.',
      'Multi-Tier GPS Detection: Added one-tap GPS detection in search modal and resilient multi-stage location acquisition.'
    ],
    items: [
      {
        type: 'fix',
        title: 'Crash Immunity & Safe Teardown',
        description: 'Hardened MapLibre layer management and safe marker teardown against null pointer exceptions and render crashes.'
      },
      {
        type: 'fix',
        title: 'Antimeridian Camera Zoom-Out Fix',
        description: 'Refactored bounding box calculations to prevent coordinate order inversion and unexpected world-level zoom-outs.'
      },
      {
        type: 'improvement',
        title: 'Smart Street-Following Pedestrian Engine',
        description: 'Connected a resilient 2-tier street router to guarantee all walking paths follow real sidewalk and road geometry.'
      },
      {
        type: 'ui',
        title: 'Multi-Tier GPS Detection & Clear Copy',
        description: 'Added one-tap GPS detection to the origin search modal and streamlined scanning phase indicators.'
      }
    ]
  },
  {
    version: '1.7.5.4',
    releaseDate: 'October 20, 2026',
    title: 'Road-Following Pedestrian & Jeep Routing Line Restoration',
    isLatest: false,
    tagline: 'Reliable GeoJSON source management for road-following walking paths, solid transit lines, and corrected marker positioning.',
    highlights: [
      'Persistent Route Lines: Implemented idempotent source and layer management to prevent MapLibre source collisions.',
      'Street-Following Walking Paths: Rendered vibrant dashed pedestrian paths following real OSM streets from origin to transit stop.',
      'Accurate Pin Placement: Removed Tailwind relative positioning from map markers to keep pins locked to their exact coordinates.',
      'Refined Route Summaries: Deduplicated route codes and names on single-leg transit options.'
    ],
    items: [
      {
        type: 'fix',
        title: 'GeoJSON Source Collision Fix',
        description: 'Replaced layer removal calls with an idempotent source data updater, preventing runtime crashes and restoring route polylines.'
      },
      {
        type: 'fix',
        title: 'Marker Absolute Coordinate Fix',
        description: 'Fixed marker container styles so destination and origin pins anchor to true map coordinates instead of the top-left screen.'
      },
      {
        type: 'ui',
        title: 'Clean Journey Summary Labels',
        description: 'Formatted route card titles to avoid redundant duplicated names on direct single-jeep transit rides.'
      }
    ]
  },
  {
    version: '1.7.5.3',
    releaseDate: 'October 20, 2026',
    title: 'OpenFreeMap Vite Worker Integration & Instant Route Suggestions',
    isLatest: false,
    tagline: 'Official OpenFreeMap Web Worker setup for flawless vector tile parsing, decoupled pins, and instant route suggestions.',
    highlights: [
      'OpenFreeMap Vite Worker Setup: Integrated official maplibre-gl Web Worker configuration to flawlessly decode vector tiles.',
      'Instant Destination Routing: Selecting any destination immediately routes from your current location with full road-following walking paths.',
      'Decoupled Markers: Destination, origin, and transit pickup pins render instantaneously without style-loading delays.',
      'Pure OpenFreeMap Cartography: Eliminated Carto dependencies, preserving Dark, Liberty, Bright, and Satellite Hybrid styles.'
    ],
    items: [
      {
        type: 'fix',
        title: 'MapLibre Web Worker Configuration',
        description: 'Configured Vite Web Worker URL to properly decode OpenFreeMap vector geometries and eliminate blank screens.'
      },
      {
        type: 'fix',
        title: 'Instant Destination Routing & Walking Paths',
        description: 'Auto-initialized origin to ensure selecting any destination triggers route planning and road-following walking paths.'
      },
      {
        type: 'fix',
        title: 'Decoupled Marker Rendering',
        description: 'Isolated HTML map markers so destination and origin pins appear immediately on coordinate selection.'
      },
      {
        type: 'ui',
        title: 'Pure Vector Map Styles',
        description: 'Removed external raster tile fallbacks, streamlining selection to OpenFreeMap Dark, Liberty, Bright, and Satellite.'
      }
    ]
  },
  {
    version: '1.7.5.2',
    releaseDate: 'October 19, 2026',
    title: 'Interactive Map Resilience & Destination Routing Fix',
    isLatest: false,
    tagline: 'Reliable MapLibre cartography with fail-safe tile fallbacks, fixed destination placement, and responsive pin interactions.',
    highlights: [
      'Interactive Map Overhaul: Resolved style loading races and added instant raster fallbacks for 100% reliable rendering.',
      'Destination Selection Fix: Selecting any destination immediately drops a pin, focuses the camera, and prompts for routing.',
      'Accurate Pin Tapping: Refactored map tap handlers to ensure immediate pin placement for origins, destinations, and saved places.',
      'Theme & Layout Polish: Guaranteed full-screen map height and seamless readability across all dark and light themes.'
    ],
    items: [
      {
        type: 'fix',
        title: 'Map Rendering & Style Loading',
        description: 'Fixed style initialization race condition and added raster fallbacks to eliminate blank and dark screen errors.'
      },
      {
        type: 'fix',
        title: 'Destination Pin Placement & Camera Focus',
        description: 'Fixed destination selection so selecting a place drops an active marker and centers the camera immediately.'
      },
      {
        type: 'fix',
        title: 'Map Click Stale Closure Patch',
        description: 'Refactored map event listeners to ensure pin drops and map clicks respond reliably without freeze.'
      },
      {
        type: 'ui',
        title: 'Full-Screen Layout Sizing',
        description: 'Guaranteed 100dvh viewport height for the interactive transit map across mobile and desktop devices.'
      }
    ]
  },
  {
    version: '1.7.5.1',
    releaseDate: 'October 19, 2026',
    title: 'Vector Map Overhaul, First-Contact Routing & Design Minimalism',
    isLatest: false,
    tagline: 'MapLibre vector maps with light and dark styles, first-road-contact smart routing, paced scanning, and minimalist design.',
    highlights: [
      'MapLibre Vector Cartography: Hardware-accelerated OpenFreeMap Liberty and Dark vector styles with zero tile seams.',
      'First-Road-Contact Routing: Walking lines stop immediately at the transit route pickup point, eliminating parallel walking.',
      'Paced Scanning & Anti-Lag: Non-blocking asynchronous transit search for smooth, stutter-free performance.',
      'Map-Based Saved Places: Drop pins directly on the map to save and edit Home and go-to locations.',
      'Design Minimalism: Renamed points to My Location and Destination, removed star icons, and streamlined place search.'
    ],
    items: [
      {
        type: 'ui',
        title: 'OpenFreeMap Liberty & Dark Styles',
        description: 'Upgraded map to MapLibre GL vector tiles with dedicated light and dark themes.'
      },
      {
        type: 'fix',
        title: 'First-Road-Contact Snapping',
        description: 'Fixed parallel walking bug by boarding transit at the earliest road intersection.'
      },
      {
        type: 'feature',
        title: 'Interactive Map-Based Saved Places',
        description: 'Save and edit Home, Campus, and custom destinations directly using map pins.'
      },
      {
        type: 'ui',
        title: 'Commuter Text Minimalism',
        description: 'Cleaned up search modal typography, removed star icons, and updated route terminology.'
      }
    ]
  },
  {
    version: '1.7.5.0',
    releaseDate: 'October 19, 2026',
    title: 'Google Maps Spatial Explore, Davao POIs & Road Walking',
    isLatest: false,
    tagline: 'Google Maps-style free spatial exploration, 112 Davao POIs with all malls and parks, and authentic road-following walking paths.',
    highlights: [
      'Google Maps Exploration: Browse Davao City freely with category filters for schools, malls, parks, and hubs without forced point selection.',
      'Road-Following Walking Geometry: Pedestrian walking routes now follow actual streets and sidewalks instead of straight aerial lines.',
      'All Davao Malls & Parks: Added all 25 malls and 25 public parks across Davao City into the searchable database.',
      'Theme Contrast & Vector Tiles: Map tiles remain clean light vector cartography while all UI cards, pills, and buttons adapt dynamically.'
    ],
    items: [
      {
        type: 'feature',
        title: 'Google Maps Spatial Exploration',
        description: 'Browse Davao City with interactive markers, place preview cards, and on-demand Directions mode.'
      },
      {
        type: 'feature',
        title: 'Road-Following Walking Router',
        description: 'Walking legs now follow real street networks with caching and offline fallback.'
      },
      {
        type: 'feature',
        title: 'Comprehensive Davao POIs Catalog',
        description: 'Added all 25 shopping malls and 25 public parks in Davao City.'
      },
      {
        type: 'ui',
        title: 'High-Contrast Theming & Tile Invariant',
        description: 'Fixed UI contrast across all themes while preserving default light map tiles.'
      }
    ]
  },
  {
    version: '1.7.4.3',
    releaseDate: 'October 19, 2026',
    title: 'Single-Tap Direct Download & Multi-Download Guardrails',
    tagline: 'Guaranteed single latest APK download from the in-app popup and automated purging of legacy versions.',
    highlights: [
      'Single-Tap Direct Download: Tapping the update popup cleanly downloads only the single latest APK without duplicates.',
      'Legacy Version Purge: Automated deletion of older APK versions from server downloads prevents multi-file sniffing.',
      'Native Intent Routing: Routed WebView downloads through Android system intent to eliminate download loops.'
    ],
    items: [
      {
        type: 'fix',
        title: 'Single Latest APK Download Fix',
        description: 'Tapping update popup now opens only the single authoritative latest release binary.'
      },
      {
        type: 'improvement',
        title: 'Server Downloads Hygiene',
        description: 'Automated cleanup of obsolete APK versions prevents download managers from sniffing legacy builds.'
      },
      {
        type: 'improvement',
        title: 'Native WebView Download Routing',
        description: 'Configured Android WebView DownloadListener to delegate downloads cleanly to system intent.'
      }
    ]
  },
  {
    version: '1.7.4.2',
    releaseDate: 'October 19, 2026',
    title: 'App Security Hardening & Client Integrity Protections',
    isLatest: false,
    tagline: 'Hardened client bundle security, runtime integrity protections, and enhanced code defense.',
    highlights: [
      'Client Integrity Guards: Runtime integrity safeguards and anti-tamper protections built into the mobile application.',
      'Security Hardening: Strengthened data validation and secure client-side communication safeguards.',
      'Performance Optimization: Cleaned up client-side assets for faster mobile startup.'
    ],
    items: [
      {
        type: 'security',
        title: 'Client Integrity Protection',
        description: 'Hardened application bundle with anti-tampering guards and DevTools inspection warnings.'
      },
      {
        type: 'security',
        title: 'Secure Communication Safeguards',
        description: 'Strengthened network request validation and security controls across all app services.'
      }
    ]
  },
  {
    version: '1.7.4.1',
    releaseDate: 'October 19, 2026',
    title: 'Chat Keyboard Clearance, Custom Saved Routes & Map Independence',
    isLatest: false,
    tagline: 'Clean chat input positioning, custom user saved places, and reliable map rendering across all themes.',
    highlights: [
      'Chat Keyboard Clearance: The mobile floating navbar automatically slides down when typing so the input sits flush above the keyboard.',
      'User-Defined Saved Routes: Removed hardcoded Home (Toril) preset; students can now set, edit, and delete their own Home, Campus, and custom locations.',
      'Map Theme Independence: Decoupled map tiles from theme switching, keeping all maps on reliable MapTiler Dataviz.'
    ],
    items: [
      {
        type: 'fix',
        title: 'Chat Navbar Auto-Hiding',
        description: 'Floating navbar automatically hides when typing in student chat, and chat input docks neatly above the virtual keyboard.'
      },
      {
        type: 'feature',
        title: 'User-Defined Saved Places',
        description: 'Replaced hardcoded Toril preset with full user controls to set, change, and delete custom Home and Campus locations.'
      },
      {
        type: 'fix',
        title: 'MapTiler Theme Decoupling',
        description: 'Prevented map tiles from turning black on dark themes by keeping maps locked to crisp MapTiler Dataviz vector styling.'
      }
    ]
  },
  {
    version: '1.7.4.0',
    releaseDate: 'October 19, 2026',
    title: 'Jeep Transit Theming System & High-Contrast Map Overhaul',
    isLatest: false,
    tagline: 'Comprehensive visual harmony across all 6 app themes and crisp, high-contrast floating map pills.',
    highlights: [
      'Jeep Subsystem Theming: Fully connected all 7 Jeep transit pages, cards, and modals to the dynamic app theming system.',
      'High-Contrast Map Pills: Eliminated dark-on-dark contrast bugs on pin banners, exit notifications, and floating toasts.',
      'Dynamic Map Tiles: Map automatically switches between vector light and dark styles matching the equipped theme.'
    ],
    items: [
      {
        type: 'improvement',
        title: 'Jeep Transit Subsystem Theming',
        description: 'Harmonized Transit Map, Hub, Routes Directory, Campuses, Fare Calculator, Safety Guide, and Saved Places across all 6 themes.'
      },
      {
        type: 'fix',
        title: 'Floating Map Pills & Toast Contrast',
        description: 'Fixed contrast collisions ensuring toasts, banners, and exit pills display crisp, readable text across all themes.'
      },
      {
        type: 'feature',
        title: 'Dynamic Vector Map Theming',
        description: 'Leaflet engine now dynamically flips between vector light and dark tiles with custom styled popups and zoom controls.'
      }
    ]
  },
  {
    version: '1.7.3.9',
    releaseDate: 'October 19, 2026',
    title: 'Changelog Version Scrollbar & Navigation Refinement',
    isLatest: false,
    tagline: 'Custom sleek light/dark responsive scrollbars and pinned version search on the web portal.',
    highlights: [
      'Changelog Scrollbar: Replaced raw browser scrollbars with custom sleek, minimalist light/dark responsive scrollbars.',
      'Pinned Search Bar: Fixed changelog sidebar search so filtering remains accessible at all times while scrolling.',
      'Smooth Pill Navigation: Polished mobile version selector with smooth auto-centering on selection.'
    ],
    items: [
      {
        type: 'ui',
        title: 'Changelog Version Scrollbar',
        description: 'Implemented custom minimalist scrollbars for the version list matching the black-and-white theme.'
      },
      {
        type: 'improvement',
        title: 'Pinned Version Search',
        description: 'Isolated the changelog version list scroll container so the search bar stays fixed at the top.'
      },
      {
        type: 'ui',
        title: 'Mobile Version Selector',
        description: 'Added smooth scroll-into-view behavior and subtle 4px scrollbars to mobile version pills.'
      }
    ]
  },
  {
    version: '1.7.3.8',
    releaseDate: 'October 19, 2026',
    title: 'Android Package Installation Compatibility Patch',
    isLatest: false,
    tagline: 'Resolved Android package installation and parsing compatibility issues across Android devices.',
    highlights: [
      'Android Installation Fix: Resolved package parsing errors on Android devices by compiling against official stable SDK platforms.',
      'SDK Optimization: Aligned target SDK compatibility for smooth installs across Android 10 through 15.'
    ],
    items: [
      {
        type: 'fix',
        title: 'Android Package Installation',
        description: 'Fixed invalid package error on Android devices by targeting finalized stable Android SDK 34 and 35.'
      },
      {
        type: 'improvement',
        title: 'Runtime Compatibility',
        description: 'Ensured seamless app installation and updates across all supported Android versions.'
      }
    ]
  },
  {
    version: '1.7.3.7',
    releaseDate: 'October 18, 2026',
    title: 'Student Safety Guidelines & Anti-Harassment Safeguards',
    isLatest: false,
    tagline: 'Comprehensive anti-bullying and anti-impersonation community safety protections for student chat.',
    highlights: [
      'Anti-Bullying Guidelines: Added strict zero-tolerance policies prohibiting cyberbullying and harassment across student channels.',
      'Anti-Impersonation Protections: Safeguards prohibiting false representation of school officials, student leaders, and teachers.',
      'Community Guidelines Integration: Built-in safety terms linked directly within the student account and chat views.'
    ],
    items: [
      {
        type: 'security',
        title: 'Anti-Bullying Policy',
        description: 'Enforced comprehensive protections against harassment and cyberbullying across all community channels.'
      },
      {
        type: 'security',
        title: 'Zero-Tolerance Impersonation',
        description: 'Prohibited impersonating university officials, student council leaders, faculty, students, and staff.'
      }
    ]
  },
  {
    version: '1.7.3.6',
    releaseDate: 'October 18, 2026',
    title: 'High-Contrast AMOLED Theme & Typography Polish',
    isLatest: false,
    tagline: 'Refined high-contrast dark theme, crisp typography, and streamlined visual layout.',
    highlights: [
      'High-Contrast AMOLED: Refined black-and-white AMOLED contrast for enhanced readability in daylight and night study.',
      'Typography Consistency: Cleaned up font weights and line heights across transit map cards and schedule views.',
      'Visual Badge Minimalism: Replaced cluttered tag containers with clean, distraction-free badge elements.'
    ],
    items: [
      {
        type: 'ui',
        title: 'High-Contrast AMOLED Styling',
        description: 'Optimized theme tokens for crisp readability and battery savings on OLED mobile screens.'
      },
      {
        type: 'ui',
        title: 'Minimalist Badges & Layout',
        description: 'Cleaned up schedule and transit tag containers for a distraction-free student experience.'
      }
    ]
  },
  {
    version: '1.7.3.5',
    releaseDate: 'October 18, 2026',
    title: 'Campus Transit Schedule & Live Map Routing Preview',
    isLatest: false,
    tagline: 'Enhanced schedule previews, real-time campus transit integration, and refined UI styling.',
    highlights: [
      'Transit Schedule Preview: Real-time route previews and campus schedule integration across transit hubs.',
      'Campus Institution Support: Enhanced routing and station data for major Davao City colleges and universities.',
      'Core UI Polish: Polished card layouts and typography across timetable and transit views.'
    ],
    items: [
      {
        type: 'feature',
        title: 'Campus Transit Integration',
        description: 'Linked campus timetables with nearby jeepney stop coordinates and transit hub schedules.'
      },
      {
        type: 'ui',
        title: 'Schedule Preview Polish',
        description: 'Refined timetable card layouts and visual hierarchy for easier morning commute planning.'
      }
    ]
  },
  {
    version: '1.7.3.4',
    releaseDate: 'October 18, 2026',
    title: 'In-App Update Log, Dual Theme Transitions & Brand Identity',
    isLatest: false,
    tagline: 'Enhanced in-app update log viewer, smooth theme switching, and official Blue EagleBuddy branding.',
    highlights: [
      'In-App What\'s New: Browse full release notes, feature highlights, and bug fixes directly within the app.',
      'Seamless Theme Switching: Smooth transitions between light and AMOLED dark modes with zero screen flicker.',
      'Official Mascot Icon: Unified Classic Blue EagleBuddy identity across splash screens and launcher icons.'
    ],
    items: [
      {
        type: 'ui',
        title: 'In-App What\'s New Viewer',
        description: 'Students can inspect latest patch highlights and version history directly in Settings > What\'s New.'
      },
      {
        type: 'ui',
        title: 'Flicker-Free Theme Transitions',
        description: 'Smooth CSS transitions when switching between light and dark themes across all pages.'
      }
    ]
  },
  {
    version: '1.7.3.3',
    releaseDate: 'October 18, 2026',
    title: 'Themed Map Alerts, Multi-Route Carousel & Native Location Overhaul',
    isLatest: false,
    tagline: 'Theme-aware map alerts, interactive multi-route options carousel, and dual-provider native Android location tracking.',
    highlights: [
      'Themed Status Alerts: Redesigned map toast notifications to strictly honor active app themes with zero text clipping.',
      'Multi-Route Carousel: Added an always-visible horizontal scrollable selector displaying all discovered routes on destination select.',
      'Expanded Routing Discovery: Increased route candidate limits to surface more direct and connecting transit choices.',
      'Dual-Provider Location: Concurrently queried Android GPS and Network providers for instantaneous fixes indoors and outdoors.',
      'Permission Fallback: Added automatic intent routing to device settings if location services are disabled.'
    ],
    items: [
      {
        type: 'ui',
        title: 'Theme-Aware Map Toast Notifications',
        description: 'Replaced hardcoded dark alert pill with design tokens matching current theme, safely repositioned below the search header.'
      },
      {
        type: 'feature',
        title: 'Interactive Multi-Route Carousel',
        description: 'Displayed all viable transit choices in a scrollable horizontal card strip, dynamically redrawing map paths upon selection.'
      },
      {
        type: 'improvement',
        title: 'Expanded Transit Engine Discovery',
        description: 'Increased candidate limits in transit router to return up to 10 ranked routes per journey query.'
      },
      {
        type: 'fix',
        title: 'Dual Location Providers & Permission Recovery',
        description: 'Resolved location timeouts by checking coarse and fine permissions and listening to Network and GPS providers simultaneously.'
      }
    ]
  },
  {
    version: '1.7.3.2',
    releaseDate: 'October 18, 2026',
    title: 'Lightweight Canvas Transit, Native GPS Bridge & Centered Modals',
    isLatest: false,
    tagline: 'Hardware-accelerated transit canvas rendering, native Android LocationManager GPS bridge, and centered modal controls.',
    highlights: [
      'Canvas Rendering: Converted campus markers and corridors to hardware-accelerated canvas for 60 FPS on low-end devices.',
      'Default-Off Layers: Kept campus pins and transit corridors turned off by default to minimize initial rendering overhead.',
      'Native GPS Provider: Added direct Android LocationManager queries via WidgetBridgePlugin for fast location fixes.',
      'Centered Style Selector: Replaced side-docked map flyout with an accessible centered modal to prevent screen clipping.',
      'Centered Map Alerts: Repositioned toast notifications to the center viewport below the floating search bar.'
    ],
    items: [
      {
        type: 'improvement',
        title: 'Hardware-Accelerated Canvas Rendering',
        description: 'Rendered all campus markers and transit polylines through Leaflet Canvas to eliminate DOM overhead on older devices.'
      },
      {
        type: 'improvement',
        title: 'Opt-in Transit Layers',
        description: 'Configured school markers and transit lines to default off, allowing commuters on low-end phones to toggle them as needed.'
      },
      {
        type: 'fix',
        title: 'Native Android Location Bridge',
        description: 'Directly queried Android GPS and network location providers through WidgetBridgePlugin to bypass WebView origin timeouts.'
      },
      {
        type: 'ui',
        title: 'Centered Map Style Modal & Floating Toast',
        description: 'Centered the basemap selection dialog and floating notification pills to eliminate edge clipping on narrow mobile screens.'
      }
    ]
  },
  {
    version: '1.7.3.1',
    releaseDate: 'October 18, 2026',
    title: 'Multi-Tier Transit Routing, Campus Markers & Map Safe Area',
    isLatest: false,
    tagline: 'Multi-tier snapping transit router, safe area map spacing, interactive campus markers, and fluid panning.',
    highlights: [
      'Safe Area Spacing: Lowered floating controls below the Android status bar and punch-hole camera.',
      'Campus Markers: 54 clickable college pins on the map for 1-tap origin and destination selection.',
      'Transit Corridors: Added Davao jeepney and DC Bus route network lines with toggle switch.',
      'Multi-Tier Routing: Expanded route discovery with tiered walk buffers and loop route support.',
      'Smooth Swiping: Removed restrictive map bounds to restore natural, lag-free panning across Davao.',
      'GPS Error Feedback: Clear feedback and automatic network fallback for device location detection.'
    ],
    items: [
      {
        type: 'ui',
        title: 'Status Bar Safe Area Spacing',
        description: 'Lowered the floating header, pin mode banner, and side action dock to prevent overlap with Android notification icons.'
      },
      {
        type: 'feature',
        title: 'Interactive Campus Markers Layer',
        description: 'Displayed all 54 verified Davao colleges and universities directly on the map with 1-tap origin and destination popups.'
      },
      {
        type: 'feature',
        title: 'Transit Network Overlay',
        description: 'Visualized active Davao jeepney and DC Bus lines across the city with a dedicated quick toggle button.'
      },
      {
        type: 'improvement',
        title: 'Multi-Tier Snapping Transit Router',
        description: 'Implemented 500m, 900m, and 1400m tiered walking buffers and loop turnaround calculation to discover reliable routes.'
      },
      {
        type: 'fix',
        title: 'Map Viewport Panning & Zoom',
        description: 'Removed rigid bounding box and viscosity locks that previously froze the viewport when panning outward.'
      },
      {
        type: 'fix',
        title: 'Native Android GPS Bridge & Error Handling',
        description: 'Persisted WebView geolocation permissions and provided descriptive diagnostics when device location is turned off.'
      }
    ]
  },
  {
    version: '1.7.3.0',
    releaseDate: 'October 18, 2026',
    title: 'Jeepney Transit Hub, Verified Campuses & Fullscreen Map',
    isLatest: false,
    tagline: 'Modular Transit Hub architecture with dedicated subpages, verified campus locations, and fullscreen interactive map.',
    highlights: [
      'Modular Transit Hub: Separated Jeepney into dedicated subpages matching Student Hub architecture.',
      'Fullscreen Transit Map: Immersive map view with header/navbar hidden and floating Back navigation.',
      '54 Verified Campuses: Ground-truth geocoded coordinates for 54 Davao colleges and universities.',
      'Native GPS Bridge: Added WebChromeClient location permissions for instant device positioning.',
      '1-Tap Route Saving: Effortless bookmarking of locations and transit journeys with Lucide iconography.'
    ],
    items: [
      {
        type: 'feature',
        title: 'Modular Jeepney Transit Hub',
        description: 'Redesigned the Jeepney feature into a modular Hub with dedicated subpages for Map, Campuses, Routes, Saved, Fare, and Safety.'
      },
      {
        type: 'ui',
        title: 'Fullscreen Immersive Map',
        description: 'Map view now takes 100% of the screen by hiding the header and navbar, with an ergonomic floating Back button.'
      },
      {
        type: 'improvement',
        title: '54 Verified Campus Coordinates',
        description: 'Re-verified all 54 Davao college and university campuses against OpenStreetMap for pinpoint accuracy.'
      },
      {
        type: 'fix',
        title: 'Native Android GPS Permission Bridge',
        description: 'Implemented WebChromeClient location permission handler in Android MainActivity to fix GPS location retrieval.'
      },
      {
        type: 'improvement',
        title: '1-Tap Route & Place Saving',
        description: 'Added quick bookmarking buttons on route cards and points with zero emojis and crisp Lucide icons.'
      }
    ]
  },
  {
    version: '1.7.2.9',
    releaseDate: 'October 18, 2026',
    title: 'Place Search & Davao Campuses Directory',
    isLatest: false,
    tagline: 'Interactive Place Search and School Finder modal across 54 verified Davao City educational institutions.',
    highlights: [
      '54 Davao Campuses: Complete directory of 54 Davao colleges and universities with verified transit coordinates.',
      'Interactive Search Modal: Quick search and category filters to set transit origin and destination pins directly.',
      'Commuter Ergonomics: Direct tap-to-search from the route card or the floating left dock school shortcut.'
    ],
    items: [
      {
        type: 'feature',
        title: '54 School Locations',
        description: 'Added 54 Davao City universities and colleges with verified geographic coordinates for route planning.'
      },
      {
        type: 'feature',
        title: 'Interactive School & Place Search',
        description: 'Interactive search modal with category filters to quickly find and set transit Origin (A) or Destination (B).'
      },
      {
        type: 'improvement',
        title: 'Transit Map Ergonomics',
        description: 'Tap Origin A or Destination B directly to search, or open the directory via the floating side dock shortcut.'
      }
    ]
  },
  {
    version: '1.7.2.8',
    releaseDate: 'October 18, 2026',
    title: 'EagleBuddy App Icon Cleanup',
    isLatest: false,
    tagline: 'Streamlined settings by removing in-app icon selection while preserving the permanent Classic Blue EagleBuddy logo.',
    highlights: [
      'Permanent App Logo: Classic Blue EagleBuddy established as the permanent app logo across Android launcher and web.',
      'Streamlined Settings: Removed in-app icon switcher from appearance preferences for a cleaner interface.'
    ],
    items: [
      {
        type: 'ui',
        title: 'Permanent App Logo',
        description: 'Classic Blue EagleBuddy is now the permanent app icon across the home screen and web launcher.'
      },
      {
        type: 'fix',
        title: 'Appearance Settings Cleanup',
        description: 'Removed the redundant in-app icon switcher to simplify theme and appearance settings.'
      }
    ]
  },
  {
    version: '1.7.2.7',
    releaseDate: 'October 18, 2026',
    title: 'Gender Selection & Anti-Impersonation Alignment',
    isLatest: false,
    tagline: 'Added gender identity selection to student setup and MySQL database to reinforce campus anti-impersonation safeguards.',
    highlights: [
      'Gender Identity Setup: Select your gender during onboarding to verify student identity and prevent campus catfishing.',
      'MySQL Cloud Sync: Fully integrates gender identity with your student profile and secure MySQL cloud database.',
      'Profile Controls: View and update your gender selection anytime inside the Edit Profile settings modal.'
    ],
    items: [
      {
        type: 'feature',
        title: 'Gender Selection on Setup',
        description: 'Choose your gender identity during onboarding to align with the Student Honor & Anti-Impersonation pledge.'
      },
      {
        type: 'improvement',
        title: 'MySQL Profile Integration',
        description: 'Safely stores and restores your gender selection on our dedicated MySQL database across device switches.'
      },
      {
        type: 'ui',
        title: 'Profile & Settings Identity',
        description: 'Edit your gender selection anytime in Edit Profile or view it in your student identity card.'
      }
    ]
  },
  {
    version: '1.7.2.6',
    releaseDate: 'October 18, 2026',
    title: 'Simplified About & Profile Declutter',
    isLatest: false,
    tagline: 'Streamlined About hub with separated topics, single-tap dropdown closing, pure profile page, and organized data tools.',
    highlights: [
      'About Hub Layout: Clean card navigation separating The App, The Developer, Data Sources, and Legal Policies.',
      'Single-Tap Dropdowns: Fixed profile dropdown menus closing instantly with a single tap instead of requiring a long-press.',
      'Profile & Data Clean-up: Dedicated profile page with log out at the bottom, and organized action buttons for Data & PIN tools.'
    ],
    items: [
      {
        type: 'ui',
        title: 'About Page Hub',
        description: 'Transformed the About section into an easy hub view separating The App, The Developer, and Data Sources.'
      },
      {
        type: 'fix',
        title: 'Dropdown Touch Fix',
        description: 'Fixed profile selector dropdowns so a single tap cleanly closes them without needing a long-press.'
      },
      {
        type: 'improvement',
        title: 'Decluttered Profile & Storage',
        description: 'Moved settings clutter to appearance, placed log out at the bottom of Profile, and grouped Data & PIN controls into clean cards.'
      },
      {
        type: 'security',
        title: 'Updated Privacy & Terms',
        description: 'Clarified that Google Login is the only external provider and student data is stored on secure MySQL and local offline database.'
      }
    ]
  },
  {
    version: '1.7.2.5',
    releaseDate: 'October 18, 2026',
    title: 'On-Launch Bulletins & Optional Updates',
    isLatest: false,
    tagline: 'Urgent campus alerts and relief posters on startup, with smooth optional updates you can skip anytime.',
    highlights: [
      'Community Alert Popups: Urgent notices and relief drive posters show on launch with direct photo previews.',
      'Optional Updates: Updates are now skippable anytime without forced dialogs interrupting you.',
      'Snooze Alerts: Easily mute announcements for 24 hours with a single tap.'
    ],
    items: [
      {
        type: 'feature',
        title: 'Emergency & Relief Popups',
        description: 'Important announcements and relief drives now display clear photo posters as soon as you open the app.'
      },
      {
        type: 'improvement',
        title: 'Skippable Updates',
        description: 'New updates can now be skipped or postponed to keep your workflow uninterrupted.'
      },
      {
        type: 'improvement',
        title: '24-Hour Snooze',
        description: 'Mute popups for the day so they only remind you when relevant.'
      }
    ]
  },
  {
    version: '1.7.2.4',
    releaseDate: 'October 18, 2026',
    title: 'Clearer Changelog & Everyday Release Notes',
    isLatest: false,
    tagline: 'Simplified all update notes so everyone can easily see what is new in each release.',
    highlights: [
      'Everyday Words: Replaced technical jargon with simple, student-friendly descriptions.',
      'Quick Highlights: Short, bite-sized summaries for every single app update.',
      'Clear Release Notes: Unified clean, readable release notes across all app screens.'
    ],
    items: [
      {
        type: 'ui',
        title: 'Simpler Changelogs',
        description: 'Rewrote all release notes in clear, easy-to-understand language without technical terms.'
      },
      {
        type: 'improvement',
        title: 'Faster Reading',
        description: 'Made update summaries short and direct so you can quickly see what changed.'
      }
    ]
  },
  {
    version: '1.7.2.3',
    releaseDate: 'October 18, 2026',
    title: 'Clearer Transit Maps & Fast Satellite Views',
    isLatest: false,
    tagline: 'Upgraded street and satellite maps for jeepney routes and DC Bus tracking.',
    highlights: [
      'Crisper Street Maps: Clear road names, building shapes, and university campus grounds.',
      'Satellite View: High-resolution aerial photos with overlaid street labels.',
      'Smooth & Fast: Maps now load smoothly on your phone without blank screens.'
    ],
    items: [
      {
        type: 'feature',
        title: 'Upgraded Street & Satellite Maps',
        description: 'Clearer, easier-to-read street and satellite maps for finding your way around Davao.'
      },
      {
        type: 'fix',
        title: 'Fixed Blank Map Screens',
        description: 'Removed broken map styles so every route map loads right away.'
      }
    ]
  },
  {
    version: '1.7.2.2',
    releaseDate: 'October 18, 2026',
    title: 'Faster Cloud Database & Better Privacy',
    isLatest: false,
    tagline: 'Community chat, schedule sharing, and accounts now run on our private, secure database.',
    highlights: [
      'Faster Community Chat: Instant messaging across campus channels.',
      'Safer Student Accounts: Stronger privacy protection for student profiles.',
      'Quick Class Sharing: Faster timetable sharing codes for your classmates.'
    ],
    items: [
      {
        type: 'improvement',
        title: 'Faster Private Database',
        description: 'Moved chat, sharing, and student profiles to a dedicated server for faster, safer performance.'
      },
      {
        type: 'security',
        title: 'Stronger Account Privacy',
        description: 'Locked down cloud rules so your data is kept safe and private.'
      }
    ]
  },
  {
    version: '1.7.2.1',
    releaseDate: 'October 18, 2026',
    title: 'Smoother Android Sign-In & Instant Sync',
    isLatest: false,
    tagline: 'Fixed Google sign-in syncing on Android and made schedule saving instant.',
    highlights: [
      'Android Sign-In Fix: Seamless connection when signing in with Google.',
      'Instant Timetable Save: Your classes save immediately after onboarding.',
      'Reliable Account Info: Age and profile details now save properly.'
    ],
    items: [
      {
        type: 'fix',
        title: 'Google Sign-In Connection',
        description: 'Fixed an issue on Android phones so your account connects smoothly every time.'
      },
      {
        type: 'improvement',
        title: 'Instant Schedule Sync',
        description: 'Your timetable and tasks now save immediately without any waiting.'
      }
    ]
  },
  {
    version: '1.7.2.0',
    releaseDate: 'October 18, 2026',
    title: 'Reliable Multi-Device Sync & Instant Setup',
    isLatest: false,
    tagline: 'Sync schedules across devices, finish onboarding instantly, and keep student badges safe.',
    highlights: [
      'Multi-Device Sync: Access your schedules and tasks from any device.',
      'Instant Onboarding: Finish setting up your account with zero waiting.',
      'Automatic Class Restore: Returning students get their saved schedules right away.'
    ],
    items: [
      {
        type: 'feature',
        title: 'Multi-Device Schedule Sync',
        description: 'Keep your classes, tasks, and jeep routes saved and synced across all your devices.'
      },
      {
        type: 'improvement',
        title: 'Faster First-Time Setup',
        description: 'Made the onboarding flow instant so you can jump right into your schedule.'
      }
    ]
  },
  {
    version: '1.7.1.4',
    releaseDate: 'October 18, 2026',
    title: 'Easy Map Pins & 1-Tap Saved Routes',
    isLatest: false,
    tagline: 'Easier 1-handed pin placement and 1-tap route saving for daily commutes.',
    highlights: [
      'Thumb-Friendly Side Buttons: Easily set your pickup and drop-off points with one hand.',
      'Tap Anywhere on the Map: Drop pins directly on any street or landmark.',
      'Save Favorite Routes: Save frequent jeepney trips and campus locations in one tap.'
    ],
    items: [
      {
        type: 'improvement',
        title: 'Handy Map Buttons',
        description: 'Moved start and end point buttons to the side so you can easily reach them with your thumb.'
      },
      {
        type: 'feature',
        title: '1-Tap Saved Routes',
        description: 'Save your daily commute routes, dorms, and campus spots for quick access.'
      }
    ]
  },
  {
    version: '1.7.1.3',
    releaseDate: 'October 18, 2026',
    title: 'Automatic Update Alerts & Cleaner Downloads',
    isLatest: false,
    tagline: 'Get notified when a new version is out and download it with a single tap.',
    highlights: [
      'On-Launch Update Alerts: See what is new the moment you open the app.',
      'Single-Tap Download: Clean, safe downloads without duplicate files.',
      'Sleek Loading Screen: A clean, minimal progress bar when launching.'
    ],
    items: [
      {
        type: 'feature',
        title: 'Automatic Update Popups',
        description: 'The app lets you know when a new update is ready to install.'
      },
      {
        type: 'ui',
        title: 'Cleaner Loading Bar',
        description: 'A smooth, modern loading bar when opening the app.'
      }
    ]
  },
  {
    version: '1.7.1.2',
    releaseDate: 'October 18, 2026',
    title: 'OpenStreetMap View & Easier Map Swiping',
    isLatest: false,
    tagline: 'Clear Davao City streets, colleges, and smooth 1-finger map navigation.',
    highlights: [
      'Clear Street & College Names: Easy-to-read street labels and college boundaries.',
      'Smooth 1-Finger Swiping: Explore the map without accidentally dragging your pins.',
      'Multiple Map Looks: Choose between Light, Dark, and Street map styles.'
    ],
    items: [
      {
        type: 'feature',
        title: 'Clear City Maps',
        description: 'Browse Davao streets and university grounds with sharp, clear map labels.'
      },
      {
        type: 'improvement',
        title: 'Locked Map Pins',
        description: 'Swipe and zoom the map freely without moving your start or end markers.'
      }
    ]
  },
  {
    version: '1.7.1.1',
    releaseDate: 'October 17, 2026',
    title: 'Refined Home Screen App Icon',
    isLatest: false,
    tagline: 'Updated home screen launcher icon with the clean Classic Blue EagleBuddy.',
    highlights: [
      'Centered EagleBuddy Icon: Sharp and centered mascot icon on your home screen.',
      'Unified App Icons: Matches official branding and Android launcher styles.'
    ],
    items: [
      {
        type: 'ui',
        title: 'New App Icon',
        description: 'Crisp, centered Classic Blue EagleBuddy icon for your phone home screen.'
      }
    ]
  },
  {
    version: '1.7.1.0',
    releaseDate: 'October 17, 2026',
    title: 'Mascot App Icon Styles',
    isLatest: false,
    tagline: 'Choose your favorite EagleBuddy mascot app icon style in Appearance settings.',
    highlights: [
      '5 Icon Designs: Classic Blue, Eagle Close-up, Gold, Campus Green, and Cyber Dark.',
      'Live Mascot Preview: Instantly see changes across the app.'
    ],
    items: [
      {
        type: 'feature',
        title: 'Custom App Icons',
        description: 'Pick your preferred mascot design from 5 fun styles in Settings.'
      }
    ]
  },
  {
    version: '1.7.0.4',
    releaseDate: 'October 17, 2026',
    title: 'Cleaner Text & Smarter Class Scanner',
    isLatest: false,
    tagline: 'Removed cluttered bubble backgrounds and upgraded class schedule scanning.',
    highlights: [
      'Cleaner Text Layout: Removed unnecessary bubble capsules around labels.',
      'Smarter Schedule Scanner: More accurate schedule photo reading.',
      'Consistent Tap Sounds: Tap audio now matches your chosen sound setting.'
    ],
    items: [
      {
        type: 'ui',
        title: 'Clean Typography',
        description: 'Simple, unboxed text labels across the app for a cleaner look.'
      },
      {
        type: 'improvement',
        title: 'Better Schedule Reader',
        description: 'Faster and more accurate reading of printed and screenshot class schedules.'
      }
    ]
  },
  {
    version: '1.7.0.3',
    releaseDate: 'October 17, 2026',
    title: 'Free Vector Maps & Offline Map Viewing',
    isLatest: false,
    tagline: 'Crisp vector maps of Davao that work even with weak internet connection.',
    highlights: [
      'Fast Vector Maps: Sharp street outlines and buildings at every zoom level.',
      'Offline Map Caching: Previously viewed map areas load even when offline.',
      'Easy Start/End Markers: Tap buttons to quickly position your journey pins.'
    ],
    items: [
      {
        type: 'feature',
        title: 'Sharp Vector Maps',
        description: 'Smooth, battery-friendly map browsing for Davao commuters.'
      },
      {
        type: 'improvement',
        title: 'Offline Map Cache',
        description: 'Saves viewed map tiles so you can check routes even with spotty mobile data.'
      }
    ]
  },
  {
    version: '1.7.0.2',
    releaseDate: 'October 17, 2026',
    title: 'Reliable Route Maps & Saved Places',
    isLatest: false,
    tagline: 'Reliable transit maps that never crash and a dedicated tab for saved places.',
    highlights: [
      'Reliable Map Loading: Maps always open properly without blank gray boxes.',
      'Saved Places Tab: Quickly get directions to Home, Campus, or Work.',
      'Locked Marker Pins: Move around the map easily without moving your pins.'
    ],
    items: [
      {
        type: 'feature',
        title: 'Saved Places Tab',
        description: 'Bookmark your house, campus, dorm, and work for 1-tap route finding.'
      },
      {
        type: 'fix',
        title: 'Fixed Map Loading',
        description: 'Maps now display instantly across all phone models and networks.'
      }
    ]
  },
  {
    version: '1.7.0.1',
    releaseDate: 'October 17, 2026',
    title: 'Easy Schedule Scanner & Settings Fix',
    isLatest: false,
    tagline: 'Scan your schedule without any complicated setup, plus fixed settings menu.',
    highlights: [
      'Zero-Setup Schedule Scanning: Just take a photo of your schedule and it imports.',
      'Fixed Settings Crash: Theme and Appearance settings open smoothly.',
      'Simpler Menus: Removed confusing options for a cleaner experience.'
    ],
    items: [
      {
        type: 'improvement',
        title: 'Simple Schedule Scanner',
        description: 'Take a photo of your enrollment form or COR and your timetable imports automatically.'
      },
      {
        type: 'fix',
        title: 'Fixed Settings Screen',
        description: 'Resolved a bug that caused the Appearance settings tab to freeze.'
      }
    ]
  },
  {
    version: '1.7.0.0',
    releaseDate: 'October 17, 2026',
    title: 'Davao Trilingual Support & Smarter Navigation',
    isLatest: false,
    tagline: 'Switch between English, Bisaya, and Tagalog, plus smarter bottom navigation.',
    highlights: [
      'English, Bisaya & Tagalog: Enjoy the app in your favorite local language.',
      'Jeepney Tab in Main Bar: Jump straight into jeep routes from the bottom bar.',
      'Emergency 911 Button: Direct 1-tap call for Davao emergencies at the top.',
      'Cleaner Hub: Organized student tools into 4 neat categories.'
    ],
    items: [
      {
        type: 'feature',
        title: 'Bisaya, Tagalog & English',
        description: 'Switch between conversational Davao Bisaya, Filipino, and English anytime.'
      },
      {
        type: 'ui',
        title: 'Handy Jeepney Tab',
        description: 'Placed jeepney routes right on the bottom navigation bar for quick access.'
      }
    ]
  },
  {
    version: '1.6.0.3',
    releaseDate: 'October 17, 2026',
    title: 'High-Speed Jeepney Route Search',
    isLatest: false,
    tagline: 'Find the best jeep routes in milliseconds with full-screen map views.',
    highlights: [
      'Instant Route Calculation: Get directions between two spots in Davao in under a second.',
      'Smooth Marker Dragging: Drag your start and end pins smoothly across the city.',
      'Full-Screen Map View: More space to explore roads, stops, and transfers.'
    ],
    items: [
      {
        type: 'improvement',
        title: 'Faster Route Finding',
        description: 'Calculates direct jeep rides and transfers across Davao in a split second.'
      },
      {
        type: 'ui',
        title: 'Bigger Map Screen',
        description: 'Full-screen layout gives you maximum view of streets and routes.'
      }
    ]
  },
  {
    version: '1.6.0.2',
    releaseDate: 'October 17, 2026',
    title: 'Interactive Jeep Map & Student Fare Matrix',
    isLatest: false,
    tagline: 'Full-screen interactive jeepney planner, 114+ route catalog, and official student fares.',
    highlights: [
      'Tap-to-Route: Tap any two points on the map to find which jeeps to take.',
      '114+ Davao Jeep Routes: Complete catalog of city, trunk, and provincial routes.',
      'Student Fare Matrix: Accurate LTFRB student discounts based on distance.'
    ],
    items: [
      {
        type: 'feature',
        title: 'Tap-to-Route Jeep Planner',
        description: 'Tap your pickup and drop-off points to see which jeeps to ride and where to transfer.'
      },
      {
        type: 'feature',
        title: 'Official Student Fares',
        description: 'Know your exact discounted fare before riding, starting at ₱11.00.'
      }
    ]
  },
  {
    version: '1.6.0.1',
    releaseDate: 'October 17, 2026',
    title: 'Smoother Maps & Polished App Icons',
    isLatest: false,
    tagline: 'Fixed map sizing on tall phones and rolled out the new blue eagle logo.',
    highlights: [
      'Full-Height Maps: Maps now fill your entire screen on modern phones.',
      'Clean Route Planner: Simpler 2-step journey search with quick campus shortcuts.',
      'New App Branding: Updated eagle-head icon across the app.'
    ],
    items: [
      {
        type: 'fix',
        title: 'Full Screen Map Sizing',
        description: 'Ensured transit maps fill the entire screen without any blank margins.'
      },
      {
        type: 'ui',
        title: 'New App Icon',
        description: 'Modern eagle emblem across app icons and menus.'
      }
    ]
  },
  {
    version: '1.6.0.0',
    releaseDate: 'October 17, 2026',
    title: 'All-New Davao Commute System',
    isLatest: false,
    tagline: '114+ traditional jeepney routes, DC buses, trip planner, and student fare calculator.',
    highlights: [
      '114+ Davao Jeep Routes: Complete coverage from Toril, Matina, Buhangin, to Calinan.',
      'Campus Trip Planner: Step-by-step directions to AdDU, UM, USEP, UIC, and more.',
      'Automatic Fare Calculation: Exact student rates based on official LTFRB distance tables.',
      'Safety First: Warns against dangerous boarding zones like flyovers.'
    ],
    items: [
      {
        type: 'feature',
        title: '114+ Jeepney Routes Catalog',
        description: 'Browse complete routes, stops, and paths for all traditional Davao jeeps and DC buses.'
      },
      {
        type: 'feature',
        title: 'College Trip Planner',
        description: 'Get direct routes and transfer instructions to reach your campus safely.'
      }
    ]
  },
  {
    version: '1.5.0.4',
    releaseDate: 'October 17, 2026',
    title: 'Theme-Matching Widgets & Official DC Bus Link',
    isLatest: false,
    tagline: 'Widgets now match your app theme, screen tap effects restored, and official bus portal link.',
    highlights: [
      'Theme-Matching Widgets: Home screen widgets automatically match your app color.',
      'Fun Tap Effects: Interactive particle sparks on screen touch are back.',
      'Official DC Bus Portal: Updated links to the official Davao City Government bus site.'
    ],
    items: [
      {
        type: 'feature',
        title: 'Theme-Matching Widgets',
        description: 'Your home screen widgets now look great in Light, Dark, Emerald, or Cyber themes.'
      },
      {
        type: 'fix',
        title: 'Restored Tap Effects',
        description: 'Fun particle sparks now burst on your screen when tapping buttons.'
      }
    ]
  },
  {
    version: '1.5.0.3',
    releaseDate: 'October 17, 2026',
    title: 'Friendly EagleBuddy Mascot & Fast Class Import',
    isLatest: false,
    tagline: 'EagleBuddy mascot joins widgets, splash screen glows, and schedules import instantly.',
    highlights: [
      'EagleBuddy Everywhere: Friendly mascot reactions in widgets and notifications.',
      'Instant Schedule Import: Import classmate timetables in a flash.',
      'Color Preservation: Imported classes keep their original subject colors.',
      'Student Honor Pledge: Commitment to honest, verified student identity.'
    ],
    items: [
      {
        type: 'feature',
        title: 'EagleBuddy Mascot Reactions',
        description: 'Fun mascot expressions celebrate completed tasks and remind you of next classes.'
      },
      {
        type: 'improvement',
        title: 'Instant Class Import',
        description: 'Classmate schedules import in a fraction of a second with preserved subject colors.'
      }
    ]
  },
  {
    version: '1.5.0.2',
    releaseDate: 'October 17, 2026',
    title: 'Compact QR Codes & 6-Letter Share Codes',
    isLatest: false,
    tagline: 'Smaller, faster-scanning timetable QR codes and 6-letter codes to share via chat.',
    highlights: [
      'Smaller, Sharper QR Codes: Scan classmate schedules in a fraction of a second.',
      '6-Letter Share Codes: Share your class schedule over Messenger or text (e.g. ID:K9X2M4).',
      'Universal Scanner: Reads any schedule QR code or short-code automatically.'
    ],
    items: [
      {
        type: 'feature',
        title: 'Super-Fast QR Codes',
        description: 'High-density QR codes that scan easily on any phone camera, even in low light.'
      },
      {
        type: 'feature',
        title: '6-Letter Share Codes',
        description: 'Send your schedule to friends via simple short-codes without sending photos.'
      }
    ]
  },
  {
    version: '1.5.0.1',
    releaseDate: 'October 17, 2026',
    title: 'Reliable App Updates & Offline Protection',
    isLatest: false,
    tagline: 'Reliable in-app update checks and clear indicators when offline.',
    highlights: [
      'Reliable Update Checks: Never miss an app update on Android.',
      'Clear Offline Indicator: Clear warning when schedule photo scanning is offline.',
      'Smart Reminders: Never pester you with old update notifications.'
    ],
    items: [
      {
        type: 'fix',
        title: 'Smooth In-App Updates',
        description: 'Direct check for new app versions that works across all mobile networks.'
      },
      {
        type: 'improvement',
        title: 'Offline Scanner Notice',
        description: 'Friendly message when scanning needs internet, preventing confusing errors.'
      }
    ]
  },
  {
    version: '1.5.0.0',
    releaseDate: 'October 17, 2026',
    title: 'Floating Dock Navbar & Full Schedule Import',
    isLatest: false,
    tagline: 'Modern floating navigation bar, separate task alarms, and student profile previews.',
    highlights: [
      'Floating Dock Navbar: Modern, thumb-friendly navigation bar at the bottom.',
      'Dedicated Schedule Import: Clean full-page schedule scanner and review table.',
      'Separate Task Alarms: Set task reminders hours or days before your deadline.',
      'Tap Profiles in Chat: Tap any student name in chat to view their campus profile.'
    ],
    items: [
      {
        type: 'ui',
        title: 'Floating Bottom Navigation',
        description: 'A sleek, floating dock that gives you more screen space for classes and maps.'
      },
      {
        type: 'feature',
        title: 'Custom Task Alarms',
        description: 'Pick when to be reminded before assignments are due so you never miss a deadline.'
      }
    ]
  },
  {
    version: '1.4.2.5',
    releaseDate: 'October 16, 2026',
    title: 'Scrollable Widget & Sunday Class Support',
    isLatest: false,
    tagline: 'Scroll through classes directly on your home screen and full Sunday scheduling.',
    highlights: [
      'Scrollable Schedule Widget: Scroll through all your classes right from your home screen.',
      'Accurate Weekend View: Clearly shows Day Off on weekends without showing Monday classes.',
      'Sunday Classes: Full support for Sunday laboratory or review schedules.'
    ],
    items: [
      {
        type: 'feature',
        title: 'Scrollable Home Widget',
        description: 'View your entire day classes on your home screen by scrolling through the widget.'
      },
      {
        type: 'feature',
        title: 'Sunday Schedules',
        description: 'Add Sunday classes, labs, and church schedules to your timetable.'
      }
    ]
  },
  {
    version: '1.4.2.4',
    releaseDate: 'October 15, 2026',
    title: 'Independent Widgets & College Day Codes',
    isLatest: false,
    tagline: 'Independent home screen widgets and full support for university day codes.',
    highlights: [
      'Independent Widgets: Browse different days on multiple widgets separately.',
      'University Day Codes: Supports MWF, TTH, and single-letter campus schedule formats.',
      'Quick Add Shortcut: Tap + Add on your home screen widget to create a class or task.',
      'Scrollable Weekly Grid: Smooth scrolling through your Monday-to-Sunday weekly view.'
    ],
    items: [
      {
        type: 'feature',
        title: 'Independent Widgets',
        description: 'Each widget on your home screen can show a different day without affecting others.'
      },
      {
        type: 'improvement',
        title: 'University Schedule Formats',
        description: 'Recognizes standard Davao college day formats like MWF, TTH, and combined schedules.'
      }
    ]
  },
  {
    version: '1.4.1',
    releaseDate: 'September 22, 2026',
    title: 'Home Screen Widgets, Camera Fix & 12-Hour Alarms',
    isLatest: false,
    tagline: 'Android widgets with day buttons, reliable QR camera scanner, and clean 12-hour alarms.',
    highlights: [
      'Home Screen Widgets: Browse upcoming days and tap to refresh right from your screen.',
      'QR Camera Scanner Fix: Instant camera opening when scanning classmate schedules.',
      'Clean 12-Hour Alarms: Plain AM/PM reminders without confusing 24-hour military times.',
      'Wallpaper Save: Save your timetable as a high-resolution phone wallpaper.'
    ],
    items: [
      {
        type: 'feature',
        title: 'Interactive Widgets',
        description: 'Switch days and refresh your timetable directly on your Android home screen.'
      },
      {
        type: 'fix',
        title: 'Camera Scanner Permissions',
        description: 'Camera opens instantly for scanning schedule QR codes without black screens.'
      }
    ]
  },
  {
    version: '1.4.0',
    releaseDate: 'September 20, 2026',
    title: 'Android Widgets, Ongoing Notification & 5 Color Themes',
    isLatest: false,
    tagline: 'Home screen widgets, lockscreen class reminders, 5 beautiful themes, and QR schedule sync.',
    highlights: [
      '4 Android Widgets: Small countdown, Medium next class, Large full day, and Tasks.',
      'Lockscreen Class Reminder: See your current and next class in your notification shade.',
      '5 Color Themes: Morning Light, Night Dark, Campus Emerald, Cyber Neon, and OLED Black.',
      'Interactive Tap Bursts: Sparkle and pop effects when touching the screen.'
    ],
    items: [
      {
        type: 'feature',
        title: '4 Home Screen Widgets',
        description: 'Keep your timetable and to-do list right on your phone home screen.'
      },
      {
        type: 'ui',
        title: '5 Color Themes',
        description: 'Personalize the app with 5 vibrant student color palettes.'
      }
    ]
  },
  {
    version: '1.3.1',
    releaseDate: 'August 20, 2026',
    title: 'Light & Dark Themes & Chat Fix',
    isLatest: false,
    tagline: 'Morning Sun light theme, pure dark mode, and improved student chat layout.',
    highlights: [
      'Morning Sun Light Mode: High-contrast bright theme designed for outdoor sunlight.',
      'Chat Layout Fix: Messages from classmates stay neatly on the left side.',
      'Daily Chat Dividers: Messenger-style date pills (Today, Yesterday) in community chat.'
    ],
    items: [
      {
        type: 'ui',
        title: 'High-Contrast Light Theme',
        description: 'Easy reading in bright sunlight while walking between campus buildings.'
      },
      {
        type: 'fix',
        title: 'Chat Alignment',
        description: 'Keeps your messages on the right and friends messages clearly on the left.'
      }
    ]
  },
  {
    version: '1.3.0',
    releaseDate: 'August 18, 2026',
    title: 'Living Mascot Assistant & Campus Chat',
    isLatest: false,
    tagline: 'Animated mascot companion, next-class countdown, and real-time student chat.',
    highlights: [
      'Living Mascot: Expressive animated companion that talks and reacts to your day.',
      'Next-Class Countdown: Live countdown timer so you are never late to class.',
      'Student Lounge: Chat with students across 9 Davao campus channels.',
      'Verified Student Badges: Special verified badges for enrolled college students.'
    ],
    items: [
      {
        type: 'feature',
        title: 'Mascot Companion',
        description: 'A helpful animated guide that gives timely advice and counts down to your next class.'
      },
      {
        type: 'feature',
        title: 'Campus Chat Lounge',
        description: 'Connect, ask questions, and chat with classmates across Davao colleges.'
      }
    ]
  },
  {
    version: '1.2.0',
    releaseDate: 'August 2026',
    title: 'Fast Account Setup & Google Sign-In',
    isLatest: false,
    tagline: 'Instant username check, Google sign-in, and in-app update log.',
    highlights: [
      'Instant Username Check: Check if your chosen username is available with zero delay.',
      'Google Sign-In: Quick and safe login with your Google account.',
      'In-App Release Notes: Read what is new in every update right inside the app.'
    ],
    items: [
      {
        type: 'improvement',
        title: 'Instant Username Validation',
        description: 'Shows whether your handle is available instantly while you type.'
      },
      {
        type: 'feature',
        title: 'Google Sign-In',
        description: 'Sign in safely and easily using your existing Google account.'
      }
    ]
  },
  {
    version: '1.1.0',
    releaseDate: 'July 2026',
    title: 'Schedule Photo Scanner, PIN Lock & Announcements',
    isLatest: false,
    tagline: 'Scan your schedule photo, lock private data with a PIN, and get campus alerts.',
    highlights: [
      'Schedule Photo Scanner: Take a photo of your schedule or COR to import classes.',
      '4-Digit PIN Lock: Keep your timetable, grades, and baon budget private.',
      'Campus Announcements: Real-time Davao class suspensions and city advisories.',
      'Daily Baon Tracker: Track your daily student allowance, jeep fare, and meal costs.'
    ],
    items: [
      {
        type: 'feature',
        title: 'Schedule Photo Scanner',
        description: 'Upload a picture of your enrollment form to automatically create your timetable.'
      },
      {
        type: 'security',
        title: '4-Digit PIN Lock',
        description: 'Protect your student schedule and expenses with a quick PIN code.'
      }
    ]
  },
  {
    version: '1.0.0',
    releaseDate: 'June 2026',
    title: 'Initial Release — SkwelaDabaw',
    isLatest: false,
    tagline: 'The all-in-one offline student companion built specifically for Davao City.',
    highlights: [
      'Davao Jeepney Route Finder: Find traditional jeep routes and student fares offline.',
      '100% Offline Timetable: Full class schedule manager that works without internet.',
      'Emergency Hotlines: 1-tap emergency dial for Davao 911, Police, and Red Cross.',
      'Multi-Campus Support: Tailored for AdDU, USEP, UIC, UM, SPC, UP Mindanao, and more.'
    ],
    items: [
      {
        type: 'feature',
        title: 'Jeepney Route Finder',
        description: 'Explore routes and calculate discounted student fares for traditional Davao jeeps.'
      },
      {
        type: 'feature',
        title: 'Offline Timetable',
        description: 'Manage your classes, rooms, and assignment deadlines completely offline.'
      }
    ]
  }
];
