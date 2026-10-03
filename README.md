<p align="center">
  <img src="icons/logo.png" alt="Telewish logo" width="120">
</p>

# Telewish

A private, serverless chat that runs in your browser. Pair two phones with a QR code and talk directly, device to device. No accounts, no chat server, no message history on anyone's cloud.

![Platform](https://img.shields.io/badge/platform-any%20modern%20browser-3b6cf6)
![Transport](https://img.shields.io/badge/transport-WebRTC-f0567f)
![Build](https://img.shields.io/badge/build-none%20(HTML%20%2B%20CSS%20%2B%20JS)-2ec4b6)
![Encryption](https://img.shields.io/badge/passphrase-AES--GCM-7c5cfc)

## Screenshots

### Chats
<p align="center">
  <img src="icons/screenshot-chats.png" alt="Chat list" width="260">
  <img src="icons/screenshot-chat.png" alt="A conversation" width="260">
</p>

### Pair with a QR
<p align="center">
  <img src="icons/screenshot-qr.png" alt="QR pairing" width="260">
  <img src="icons/screenshot-scan.png" alt="QR scanner" width="260">
</p>

### Nearby and Listen together
<p align="center">
  <img src="icons/screenshot-nearby.png" alt="Nearby radar" width="260">
  <img src="icons/screenshot-music.png" alt="Listen together with lyrics" width="260">
</p>

## Why Telewish?

- **Direct by default.** Messages, files and calls travel peer to peer over a WebRTC data channel. There is no server in the middle that stores or reads them.
- **Pairing is a QR code.** Show yours, scan theirs. No sign-up, no phone number, no email.
- **Zero build.** Three files and a few CDN scripts. Open `index.html` and it works.

## Features

### Privacy and security

| Feature | Details |
|---|---|
| Direct connection | WebRTC data channel between the two devices |
| Optional passphrase | AES-GCM with a PBKDF2-derived key (100,000 iterations). Both sides must enter the same one |
| One-time codes | Pairing codes and the passphrase field are wiped once connected |
| Strict receive path | Every incoming packet is schema-checked, size-limited and rate-limited. A peer that floods you is disconnected |
| File consent | The other person must accept a file before any data is sent. Per-friend "Always accept" is available |
| Local storage only | Chats and settings live in your browser. Nothing is uploaded to an account |

### Chatting

- Text with replies, edits and deletes
- Swipe a bubble right to reply
- Reactions, including custom emoji
- Polls (single or multiple choice, close when done)
- Voice notes with a real waveform and 1x / 1.5x / 2x speed
- Voice calls over the same link
- Files of any size or type, with a progress ring
- Shared whiteboard with live cursors, undo, paper styles and image annotation
- Search inside a chat
- Optional link previews (off by default)
- Message effects such as confetti for celebrations

### Pairing options

- **QR code**: Start, Join, scan back. Camera scanning with flash and camera flip, or scan from a photo
- **Nearby**: finds friends on the same Wi-Fi and asks both sides to accept
- **Relay**: your own WebSocket signalling server and a shared room code

### Together

- **Listen together**: pick a song and play it in sync with everyone connected, with a shared queue
- Cover art and synced lyrics, with a sing-along mode
- Song cards in chat with their own player

### Make it yours

- Themes, wallpapers, fonts, emoji and sticker packs in the **Appearance studio**
- **Customize everything**: colors, radius, spacing, layout, textures, text labels, sounds and custom CSS
- Share or back up your look as a pasteable code
- Haptics, soft sound set, per-friend chat colors

## Getting started

No build step and no dependencies to install.

1. Put these files together in one folder:

   ```
   index.html
   style.css
   main.js
   icons/
   ```

2. Serve the folder over HTTPS or localhost. The camera, microphone and clipboard need a secure page:

   ```bash
   python3 -m http.server 8000
   # then open http://localhost:8000
   ```

3. Open it on two devices and tap **Connect** or **Nearby**.

> Opening `index.html` straight from disk works for most things, but camera scanning needs a secure page.

### Pairing in 30 seconds

1. On phone A: **Connect → Start → Create QR code**.
2. On phone B: **Connect → Join → Scan their QR**. A reply code appears.
3. On phone A: **Scan their reply**. You are connected.

Add the same passphrase on both phones first if you want encrypted messages.

## Project layout

| File | What it does |
|---|---|
| `index.html` | Page markup and CDN script tags |
| `style.css` | All styling, themes and animations |
| `main.js` | App logic: pairing, chat, calls, whiteboard, music, customization |
| `icons/` | Logo and screenshots used by this README |

## Under the hood

| Part | How it works |
|---|---|
| Transport | `RTCPeerConnection` and a `RTCDataChannel`. Calls add an audio track |
| Pairing | Offer and answer are compacted into a short code and shown as a QR |
| Encryption | Web Crypto AES-GCM, key from your passphrase |
| Storage | `localStorage` for chats and settings, `IndexedDB` for custom sounds |
| Nearby discovery | Public WebTorrent trackers are used only to meet devices on the same network, then a direct link takes over |

### What leaves your device

Chats stay between you and your friend, but some features call outside services:

- **STUN** (`stun.l.google.com`) to work out how to reach you
- **Nearby** uses public tracker servers for discovery
- **Lyrics and covers**: LRCLIB and iTunes Search, when you play a song
- **Link previews**: microlink.io, only if you turn them on
- **Google Fonts**, only if you pick a Google font

## Credits and licenses

App by [@wishismachine](https://github.com/wishismachine).

- [Tabler Icons](https://tabler.io/icons) (MIT)
- [canvas-confetti](https://github.com/catdad/canvas-confetti) (ISC)
- [GSAP](https://gsap.com/) and [Motion](https://motion.dev/)
- [JSZip](https://stuk.github.io/jszip/)
- [qrcode-generator](https://github.com/kazuhikoarase/qrcode-generator) and [jsQR](https://github.com/cozmo/jsQR)
- [LRCLIB](https://lrclib.net/) for lyrics, iTunes Search for cover art
- Liquid-glass effect inspired by open-source projects rizroze/liquid-glass and archisvaze/liquid-glass

Add a `LICENSE` file to state how this project can be used.

Made for good conversations.
