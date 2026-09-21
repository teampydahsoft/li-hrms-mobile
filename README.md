# LI HRMS Mobile App

Welcome to the **LI HRMS Mobile App** repository. This is a cross-platform mobile application built with **React Native**, **Expo (SDK 54)**, and **TypeScript**. It provides employees, HODs, and managers with an intuitive interface to handle attendance, leaves, on-duty (OD) requests, loans, overtime/permissions, complaints, payslips, and profile management directly from their mobile devices.

---

## 🚀 Tech Stack

- **Framework**: [Expo SDK 54](https://expo.dev/) (using Expo Router for file-based navigation)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [NativeWind (v4)](https://www.nativewind.dev/) (Tailwind CSS for React Native)
- **State Management**: [Zustand](https://github.com/pmndrs/zustand)
- **Animations**: [React Native Reanimated](https://docs.swmansion.com/react-native-reanimated/) & [Moti](https://moti.fyi/)
- **Icons**: [Lucide React Native](https://lucide.dev/guide/packages/lucide-react-native)
- **Networking**: [Axios](https://axios-http.com/) & Socket.io-client

---

## 📱 Features & Modules

### 1. Role-Based Navigation & Dashboards
The application dynamically alters its UI and available options depending on the user's role:
- **Employee**: Can view their own requests, submit new requests (leaves, OD, loans, overtime), check payslips, perform attendance check-ins, and view their profile.
- **HOD / Manager**: In addition to self-service features, they gain access to a **Team Inbox** to approve/reject pending leaves, OD, and loan requests.

### 2. Core Modules
- **Attendance & GPS Tracking**:
  - Live check-in/out and background GPS route tracking for On-Duty (OD) staff.
  - Integration with fine/coarse location permissions and foreground/background service tracking.
- **Leaves & On-Duty (OD)**:
  - Submit leave requests with balance tracking.
  - Submit OD requests with location matches and optional image/camera uploads as proof.
  - Withdraw pending or in-progress requests.
- **Finance (Loans)**:
  - Apply for loans, view monthly balances, and coordinate guarantor flows.
- **OT (Overtime) & Permissions**:
  - Request overtime hours or short-duration permission slips.
- **Complaints & Feedback**:
  - Log complaints and track response statuses.
- **Payslips**:
  - Digital preview and download of monthly salary slips.
- **Push Notifications**:
  - Real-time updates for approvals, rejections, and company announcements.

---

## 🛠️ Prerequisites

Make sure you have the following installed on your machine:
- **Node.js**: `v18.x` or `v20.x` (Recommended: Active LTS)
- **Package Manager**: `npm` (comes with Node) or `yarn`
- **Expo Go** (for quick previewing) or an **Expo Dev Client** build (recommended for testing native features like background location tracking)
- **EAS CLI**: Installed globally for building binaries:
  ```bash
  npm install -g eas-cli
  ```
- **Android Studio** (for Android Emulator) and/or **Xcode** (for iOS Simulator, macOS only)

---

## 📦 Getting Started

### 1. Install Dependencies
Navigate into the mobile directory and install the packages:
```bash
cd li-hrms-mobile
npm install
```

### 2. Environment Configuration
The application reads its backend API URL from environment variables.
- Copy your local environment configurations or edit the API endpoint directly in [Config.ts].
- For local builds, you can set the variable `EXPO_PUBLIC_API_ORIGIN`:
  - **Windows (PowerShell)**:
    ```powershell
    $env:EXPO_PUBLIC_API_ORIGIN="http://<YOUR_LAN_IP>:5000"
    ```
  - **Linux / macOS**:
    ```bash
    export EXPO_PUBLIC_API_ORIGIN="http://<YOUR_LAN_IP>:5000"
    ```
- Defaults:
  - **Development / Production**: Falls back to `https://hrmsu1.sleipl.com` if not provided.

---

## 💻 Development Commands

You can run the following scripts defined in `package.json`:

| Command | Action |
| :--- | :--- |
| `npm run start` | Starts the Expo development server (`npx expo start`) |
| `npm run android` | Starts Expo and attempts to open the app on an Android Emulator or connected physical device |
| `npm run ios` | Starts Expo and attempts to open the app on an iOS Simulator |
| `npm run web` | Launches the web-preview version of the React Native app |

### Useful Developer Shortcuts (in the terminal running Expo):
- **`r`**: Reloads the JavaScript bundle.
- **`d`**: Opens the Expo developer/debug menu.
- **`a`**: Opens on Android.
- **`i`**: Opens on iOS.

---

## 🏗️ Building and EAS Deployment

We use **EAS (Expo Application Services)** to manage builds. The build configuration is defined in [eas.json].

### Build Commands

#### For Android
*   **Generate an APK for internal testing (Preview)**:
    ```bash
    npm run build:android:apk
    # Equivalently: eas build -p android --profile preview
    ```
    *This generates an installable `.apk` file instead of an `.aab` bundle.*

#### For iOS
*   **Build for physical iOS test devices (Development Client)**:
    ```bash
    npm run build:ios:dev
    # Equivalently: eas build --platform ios --profile development
    ```
*   **Build for iOS Simulators**:
    ```bash
    npm run build:ios:dev-sim
    # Equivalently: eas build --platform ios --profile development-simulator
    ```
*   **Generate iOS preview/ad-hoc build**:
    ```bash
    npm run build:ios:preview
    # Equivalently: eas build --platform ios --profile preview
    ```

---

## 📂 Project Structure

```
li-hrms-mobile/
├── .expo/                  # Expo build artifacts and cache
├── app/                    # Expo Router directory (file-based routing)
│   ├── (tabs)/             # Main tab navigator screens (Attendance, leaves, profile, menu)
│   ├── _components/        # Page-specific components and layout shells
│   ├── _layout.tsx         # Main entry point layout routing
│   ├── index.tsx           # Initial entry routing logic (e.g. Auth checks)
│   ├── login.tsx           # Authentication page
│   └── [feature].tsx       # Application forms (apply-leave.tsx, apply-loan.tsx, etc.)
├── assets/                 # App icons, splash screens, and images
├── src/                    # Shared Source Directory
│   ├── api/                # Axios instances, request/response interceptors, API services
│   ├── auth/               # Context/utilities for login, logout, and token refresh
│   ├── background/         # Geolocation and background task registry
│   ├── components/         # Reusable global UI widgets and layouts
│   ├── constants/          # Static app settings and configurations (Config.ts)
│   ├── features/           # Feature-specific logic (e.g. OD details, leaf cards)
│   ├── hooks/              # Custom React hooks (useAuth, useLocation, etc.)
│   ├── lib/                # Third-party configurations and wrappers
│   ├── notifications/      # Notification handlers and background listeners
│   ├── store/              # Zustand global state slices
│   ├── styles/             # Global CSS and Tailwind configurations
│   ├── ui/                 # Atomic UI components (Buttons, Inputs, Badges)
│   └── utils/              # Helper functions (dates, formats, validators)
├── app.json                # Expo application config
├── eas.json                # Expo Application Services build configurations
├── tailwind.config.js      # Custom NativeWind styling configuration
└── tsconfig.json           # TypeScript configuration
```

---

## 🛡️ Native Permissions Requirements

The app requests permissions dynamically but must have them declared in `app.json` for compilation:
- **Location Permissions**: `ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION`, and `ACCESS_BACKGROUND_LOCATION` (Android) alongside `NSLocationAlwaysAndWhenInUseUsageDescription` (iOS) to support live route tracking for on-duty employees.
- **Foreground Service**: `FOREGROUND_SERVICE` and `FOREGROUND_SERVICE_LOCATION` to keep location tracking alive even when the app is minimized.
- **Notifications**: `POST_NOTIFICATIONS` to prompt permission for remote push alerts.
- **Camera / Media Library**: Access to take photos/select attachments for OD proof.

---

## 🧪 Testing & Verification

A QA checklist is maintained in the root folder. Refer to [ROLE_QA_CHECKLIST.md] for detailed manual verification steps broken down by roles (Employee, HOD, and Manager).
