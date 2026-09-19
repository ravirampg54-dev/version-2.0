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
