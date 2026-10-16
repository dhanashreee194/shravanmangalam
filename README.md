# 🦚 Shravan Mangalam — learn shlokas, mantras & bhajans by listening

॥ श्री कृष्णः शरणं मम ॥

An Android + iOS app (Expo / React Native) plus a simple CMS website to upload content.
Built for everyone, including people who **cannot read or write**, **blind** and **elderly** users, and **kids**.

```
cms/   Node.js server: admin website + API + uploaded audio/images
app/   Expo app for Android, iOS (and web for quick testing)
```

## What's inside

**34 starter texts** with pronunciation and meaning (Hindi + English), including:
- **Shri Radharaman (Krishna):** Krishnaya Vasudevaya, Vasudeva Sutam, Mookam Karoti, He Krishna Karuna Sindho, Kararavindena, Om Namo Bhagavate Vasudevaya, Shantakaram, Madhurashtakam (verses 1–4)
- **Narayan Kavach:** Bhagavatam 6.8.12–15, the core protection verses
- **Gopi Geet:** Bhagavatam 10.31.1–4, plus verse 9 (Tava Kathamritam)
- **Bhagavad Gita:** 2.20, 2.47, 4.7–8, 6.5, 9.22, 9.26, 9.34, 18.66
- **Bhajans:** Achyutam Keshavam, Govinda Bolo, Shri Krishna Govinda Hare Murare, Hare Krishna, Raghupati Raghava
- The earlier starters: Gayatri, Vakratunda, Gurur Brahma, Shanti mantras, and more

Long stotras include their opening verses. Add the remaining verses in the CMS. **Please have every text and meaning checked by a teacher or pandit (e.g. against a Gita Press edition) before publishing.**

## How blind and elderly people use it: 👂 Listen mode (सुनकर सीखें)

The biggest button on the home screen. The whole screen becomes one large touch area, and the app speaks every step aloud in Hindi or English:

| Gesture | Choosing | While learning a shloka |
|---|---|---|
| Swipe right / left | next / previous | next / previous line |
| Tap once | say it again | hear this line (tap again to stop) |
| Double tap | open | **Repeat after me** (double tap again to stop) |
| Swipe up | help | chant the whole shloka |
| Press & hold | help | hear the meaning |
| Swipe down | go back | go back |

- A soft temple-bell sound means "your turn to repeat", and a chime plays when a shloka is finished.
- Everything it says (welcome, help, collection names, shloka titles, "अब आप", "बहुत बढ़िया") is in your recorded voice.
- **Works with TalkBack / VoiceOver:** when a screen reader is on, use its normal gestures. Swipe up/down = next/previous, double tap = open or Repeat after me, two-finger double tap = play/stop, and the scrub gesture (iOS) = back. Extra actions (back, help, play all, meaning) are in the screen reader's actions menu.
- A family member can turn on **Settings → "Open in Listen mode at start"** once. After that, the app opens straight into Listen mode.
- Large high-contrast text for low vision, three text sizes, and slow chanting speed.

## Your voice, everywhere: 🎙️ Voice Studio

The whole app (every chanted line, title, meaning, and every spoken message in Listen mode) plays **in the owner's voice**. Users don't choose voices.

Open **CMS → 🎙️ Voice Studio** (`/admin/studio.html`):

1. **Record, line by line.** A large prompter shows each piece in order: the app messages first, then each shloka's title, chanted lines, line meanings and summary. Press <kbd>Space</kbd> to record and <kbd>Space</kbd> again to stop. It plays back, then <kbd>Enter</kbd> saves and moves to the next piece. <kbd>R</kbd> records again, and <kbd>←</kbd> <kbd>→</kbd> move between pieces. A progress bar shows how much is done. Switch हिंदी / English to record the meanings and messages in each language (chanted lines are shared).
   Every recording is cleaned automatically: silence trimmed at both ends, volume evened out, and converted so every phone can play it (needs `ffmpeg` on the server).
2. **Optional: your voice clone fills the rest.** Read the sample passage (1–2 minutes total; it can be recorded in parts), tick the consent box, and create your clone. Then **✨ Fill everything missing in my voice** speaks every part you haven't recorded, in your cloned voice. Your own recordings are never replaced. This uses ElevenLabs voice cloning and needs `ELEVENLABS_API_KEY` on the server. For the best Sanskrit, record the chanted lines yourself and let the clone handle the meanings and messages.

Until a piece is recorded, the app falls back to the phone's most natural installed voice, with Sanskrit pronunciation fixes: ॐ → "ओम्", visarga with its echo vowel (नमः → नमह), and word-final anusvara as "m" (मधुरं → मधुरम्).

## Design

"Krishna night": a deep Shyam-blue sky with twinkling stars and drifting glows, peacock teal, pitambar gold and lotus pink. It also has:
- a swaying peacock feather with a breathing halo and a bansuri on the home banner
- cards that spring in
- a glowing frame around the line being chanted
- a dancing sound wave while the voice plays
- a shower of flowers (pushpa vrishti) when a shloka is learned

All motion turns off automatically when the phone's "Reduce motion" setting is on.

## What makes Shravan Mangalam different

Gita apps like *Bhagavad Gita For All* are video libraries: you watch an explanation of each verse. Shravan Mangalam is for **learning to chant by ear and practising every day**, for everyone, including people who can't read, blind people, elders and kids:

| Unique feature | What it does |
|---|---|
| 🎙️ **The guru's own voice** | Every line, meaning and message is in the owner's recorded voice (Voice Studio), not a stranger's video or a robot. |
| 🔁 **Repeat after me** | Guru–shishya style: hear a line, a pause for you to repeat it, three times, then all together. |
| 👂 **Listen mode** | The whole app works with gestures and voice alone, made for blind and elderly users. |
| 📿 **Japa Mala** | A 108-bead mala. Tap anywhere to count, or "Chant with me" (your voice chants and the mala counts itself). It vibrates on each bead and calls "राधारमण लाल की जय!" at 108. |
| 🌳 **My Vrindavan** | Every shloka you learn blooms as a flower in your own garden by the Yamuna, with milestones up to "All of Vrindavan". |
| 🎯 **Shloka game** | Find the missing word, with big buttons and a "hear the line" hint. Ten rounds and a flower shower. |
| 🕰️ **Dincharya** | The right shlokas for प्रातः · मध्याह्न · सन्ध्या · रात्रि (morning, midday, evening, night), chosen by the time of day. |
| 🦚 **Radharaman greetings** | Opens with "जय गौर · श्री राधारमणो विजयते · राधेश्याम"; celebrates with "राधारमण लाल की जय!". |

## Home dashboard

- **Greeting** that changes with the time of day (सुप्रभात / शुभ संध्या), with a quick हि / EN switch.
- **Today's shloka**: a new short Krishna shloka every day, with ▶ Listen (plays straight away in your voice) and Learn → buttons.
- **Progress strip**: a ring of shlokas learned, a 🔥 daily streak, and whether today's practice is done.
- **Continue learning**: jumps back to the last shloka opened.
- **Collections** as a colourful grid (Shri Krishna, Gita, Kids, Shlokas, Mantras, Stotras, Bhajans), each with its own colours and a progress bar.
- **Quick to learn**: a swipeable row of short 1–2 line shlokas.
- **Gita wisdom** of the day.
- Each collection opens with a coloured header, a progress ring and filters (All · To learn · Learned ⭐).

## 1. Run the CMS

```bash
cd cms
npm install
npm run seed      # adds any starter texts that are missing (never overwrites your edits)
ADMIN_PASSWORD=choose-a-strong-password npm start
```

Open **http://localhost:4000/admin/**. Optional settings (environment variables):

| Variable | What it does |
|---|---|
| `ADMIN_PASSWORD` | Admin login password (default `admin123`; change it) |
| `ELEVENLABS_API_KEY` | Turns on the voice clone (fills unrecorded parts in your voice) |
| `ELEVENLABS_MODEL` | Default `eleven_multilingual_v2` (speaks Hindi) |
| `DATA_DIR`, `UPLOAD_DIR` | Where the library and audio files are stored (use a persistent disk when hosting) |
| `PORT` | Default 4000 |

`npm run seed -- --force` replaces the whole library with the starter content.

## 2. Run the app

```bash
cd app
npm install
npx expo start
```

Scan the QR code with **Expo Go** (phone on the same Wi-Fi), or press `a` (Android emulator), `i` (iOS simulator) or `w` (browser). If the app can't find the CMS, set the address in ⚙️ Settings, or start with `EXPO_PUBLIC_API_URL=http://<computer-ip>:4000 npx expo start`.

## Android APK

The APK is built for 64-bit ARM, which covers almost all phones from the last 7–8 years. APK files are kept out of git. To build one:

```bash
cd app
EXPO_PUBLIC_API_URL=http://<your-computer-ip>:4000 npx expo prebuild --platform android
cd android && EXPO_PUBLIC_API_URL=http://<your-computer-ip>:4000 ./gradlew assembleRelease
```

The APK appears at `app/android/app/build/outputs/apk/release/app-release.apk`. It loads shlokas and your recordings from the CMS at `EXPO_PUBLIC_API_URL` (the phone must reach that address, e.g. the same Wi-Fi). It also bundles all shlokas, so it still works offline with the phone voice. You can change the server address in the app's ⚙️ Settings. For the Play Store, host the CMS online with HTTPS and sign with your own upload key (EAS Build does this for you).

## 3. Going live

1. Host the CMS with **HTTPS**, `ffmpeg` installed, and `DATA_DIR`/`UPLOAD_DIR` on persistent storage.
2. Build with `EXPO_PUBLIC_API_URL=https://your-cms.example.com`, then run `npx eas-cli@latest build --platform all` and `npx eas-cli@latest submit`.
3. Replace the icons in `app/assets/` (a peacock-feather icon would suit the theme).

## Not done yet / ideas

- Voice commands ("next", "repeat") need a development build with a speech-recognition module; Listen mode uses gestures instead.
- Recordings stream from the server. Downloading them for full offline audio is a good next step.
- More meaning languages (Marathi, Gujarati…): add the code to `LANGS` in `cms/public/admin.js` and to `app/src/lib/i18n.ts`.
