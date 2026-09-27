# RPG Todo

RPG Todo is a mobile-first productivity app built with HTML5, CSS3, and vanilla JavaScript, designed to work fully offline with LocalStorage and package as an Android app using Capacitor.

## Features

- Offline-first task management with LocalStorage
- Dashboard summaries with streak tracking
- Add, edit, complete, uncomplete, delete, and view task details
- Search, filters, and sorting
- Theme center with multiple appearance modes
- Android-ready Capacitor setup
- Mobile-first design with safe-area support

## Run locally

```bash
npm install
npm start
```

Then open the browser at:

```text
http://localhost:8080
```

## Capacitor Android

```bash
npm install
npx cap add android
npx cap sync android
npx cap open android
```

## Android app icons

After adding Android, generate Android launcher assets from the app icon and splash source images:

```bash
npx @capacitor/assets generate --android
```

If the tool does not generate the expected icon resources automatically, copy the generated files from the generated Android resource folders into the app `mipmap-*` directories and rebuild the app.

## Notes

- The app keeps all data in `localStorage`.
- No backend or database is used.
- Tasks and settings persist across browser refresh and Android app restarts.

## Install as an app from the browser (PWA)

The `www` folder is already a progressive web app, so the deployed site can be
installed on a phone and it will open full screen with its own icon, no browser
address bar.

### Deploy requirements

Service workers only run on secure origins, so:

- Deploy over **HTTPS** (Vercel, Netlify, GitHub Pages, Firebase Hosting all do
  this by default). `http://localhost` also works while testing.
- Publish the **`RPG-Todo/www` folder** as the site root. `manifest.json`,
  `sw.js`, `app.js`, and `style.css` must sit at the root of that folder.
- Do not set a long `Cache-Control` on `sw.js`. A stale worker will keep serving
  an old build.
- If the site is served from a sub-path, keep the relative paths (`./`,
  `manifest.json`, `sw.js`) as they are. The manifest `id` and `scope` are both
  `./`, so the app keeps working under any sub-path.

### Install on Android

1. Open the deployed link in Chrome.
2. Either tap the **Install** banner at the top of the app, or open
   **Settings → App → Install App / How to Install** inside RPG Todo.
3. If Chrome has not shown the native prompt yet, use the browser menu
   (three dots) and pick **Install app** or **Add to Home screen**.

### Install on iPhone / iPad

Safari has no install button. Tap **Share → Add to Home Screen**.

### After installing

- The app opens from its own icon with no address bar.
- It works with no internet connection; the app shell is precached.
- Long-press the icon for the **Today** and **Add Quest** shortcuts.
- To update after a new deploy, close and reopen the installed app. The worker
  checks for a new version on every launch.

### Verify locally

```bash
npm start
```

Then in Chrome on `http://localhost:8080` open DevTools → Application:

- **Manifest** shows the name, icons, and `display: standalone`.
- **Service Workers** shows `sw.js` as activated and controlling.

