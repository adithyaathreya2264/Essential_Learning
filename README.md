# EssentialLearning

Study anything, offline. Upload your notes and get quizzes, flashcards, and explanations — no internet needed after setup.

<!-- TODO: add screenshots (home, chat, quiz, flashcards) -->

## What it does

- **Upload** a PDF or TXT file and get it automatically split into editable chapters — rename, merge, split, reorder, or delete before anything is saved.
- **Ask** a chapter-scoped AI chat to explain, summarize, or answer questions in your own words.
- **Quiz** yourself at a chosen difficulty; generation and difficulty classification are independent passes, so a mismatch (e.g. "asked for hard, generated medium") is always shown honestly, never silently retried. Answers are evaluated against the source content with explanations.
- **Flashcards** with spaced repetition (FSRS) — rate each card Again/Hard/Good/Easy and it schedules its own next review. A Due Today view aggregates what's due across every chapter.
- **Reminders** — a single daily notification aggregates due cards across all decks; you can also ask in chat to be reminded about a specific chapter.

## Privacy

Nothing leaves your phone. The only network activity in the entire app is the one-time AI model download, which is checksum-verified against Hugging Face. There are no accounts and no cloud sync — your material and your study progress stay on the device.

## Install

1. Download the latest `.apk` from this repo's [Releases](../../releases) page.
2. On your Android phone, enable "Install unknown apps" for your browser or file manager if prompted.
3. Open the downloaded APK to install.
4. On first launch, pick an AI model (E2B recommended for most phones, E4B for higher-end devices) and let it download over Wi-Fi — this is the only setup step that needs a connection.

## Tech stack

- React Native + Expo (dev client), TypeScript, Expo Router
- On-device inference via `react-native-litert-lm` (Gemma E2B/E4B, `.litertlm` format, constrained JSON-schema decoding)
- `expo-sqlite` for local data, `expo-file-system` for resumable background model downloads
- `ts-fsrs` for spaced-repetition scheduling
- `expo-notifications` for local due-card reminders

## Known limitations

- Voice input isn't available yet — chat is text-only.
- DOCX upload is deferred; PDF and TXT are supported.
- Android only, distributed as a sideloaded APK via GitHub Releases (no Play Store submission).

## Development

```bash
npm install
npm start
```

Requires a dev client build (not Expo Go) since the app uses native modules — see `eas.json`'s `development` profile.

## Release process

This project ships as a versioned APK attached to a GitHub Release, built via EAS Build. See [`RELEASE_GUIDE.md`](./RELEASE_GUIDE.md) for the full step-by-step walkthrough; the short version:

```bash
# one-time setup
npm install -D eas-cli
npx eas login
npx eas init                     # writes extra.eas.projectId into app.json

# build and release
npx eas build --platform android --profile production
npx eas-cli build:download --build-id <build-id>   # id printed in the build URL above

git tag vX.Y.Z && git push origin vX.Y.Z
gh release create vX.Y.Z ./<downloaded>.apk \
  --title "EssentialLearning vX.Y.Z" \
  --notes-file CHANGELOG.md
```

Before tagging a release, run through [`QA_CHECKLIST.md`](./QA_CHECKLIST.md) on a physical device to confirm the app is fully usable offline.

## License

MIT — see [LICENSE](./LICENSE).
