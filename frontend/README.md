# Databases project's frontend repo

# Disco Music Streaming Application

## Get started

1. Clone Repo
```bash
git clone https://github.com/<your-team-repo>/frontend.git
cd frontend
```

2. Install dependencies

   ```bash
   npm install
   ```

3. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

#
---

## 4. Main Libraries Used

### Navigation
- `@react-navigation/native`
- `@react-navigation/native-stack`
- `react-native-screens`
- `react-native-safe-area-context`

### API & Networking
- `axios`

### Audio Playback
- `expo-av`  
  Used to stream & play audio files.

### File Uploads (S3 Presigned URL Flow)
- `expo-file-system`
- `expo-document-picker`

### Secure Storage
- `expo-secure-store`  
  For storing JWT tokens securely.

### UI Libraries

#### 1. gluestack-ui  
React Native equivalent of *shadcn/ui*.  
Used for:
- Buttons  
- Inputs  
- Cards  
- Layout components  

#### 2. React Native Elements  
Used for music-friendly UI:
- Sliders (for progress bar)  
- Cards  
- Icon buttons  
- Lists  

---

## 5. UI Framework Notes

### gluestack-ui (shadcn for React Native)
Provides:
- Modern consistent UI  
- Dark/light theme  
- Utility components like `Card`, `Button`, `Input`  

### React Native Elements
Provides:
- Music sliders  
- Icons (play/pause/skip)  
- Cards  
- Lists  

---



## 6. Contributing Workflow

```bash
git checkout -b feature/<your-feature>
git add .
git commit -m "Added feature"
git push origin feature/<your-feature>
```

Open a PR into `main`.

