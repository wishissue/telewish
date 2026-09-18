# Telewish

Direct P2P chat. No server sees a single message.

Two people, one direct WebRTC connection, zero backend. Everything is encrypted end-to-end with AES-256 on top of DTLS. Telewish is one HTML file — no build step, no server, no accounts.

## How it works

Two peers need to swap connection info before a direct link can open. Telewish does this one of two ways:

- **Manual / QR code** — one person generates a code (text or QR), the other scans or pastes it in and sends back a reply code. No server involved.
- **Relay server (optional)** — point both sides at a WebSocket relay (`wss://...`) to skip the copy-pasting. It only passes the handshake along, never sees your messages, and the connection becomes direct once it's done. Bring your own relay, or use one you trust.

The actual chat runs over a direct WebRTC data channel, with messages further encrypted using a key derived from a split code + passphrase — shared over two separate channels, so no single message is enough to connect.

## Getting started

Open `telewish.html` in a browser. Encryption needs a secure context, so serve it over `https://` or `localhost` — opening it directly as a file may disable encryption in some browsers.

```bash
python3 -m http.server 8000
# then open http://localhost:8000/telewish.html
```

## Features

- Direct P2P messaging over WebRTC — no server ever sees a message
- End-to-end encryption (AES-256) on top of DTLS
- Split code + passphrase handshake, shared over separate channels
- QR code generation and scanning
- Optional relay server support
- File, image, and voice messages
- Light, dark, and rose themes, plus a custom option
- Sounds, avatars, and other small touches

## Security notes

This is a personal project and hasn't had a professional security audit — review the code yourself before relying on it for anything sensitive. A relay only ever sees handshake metadata, never chat content, but you're trusting it not to tamper with that handshake; use one you control, or skip it with the manual QR/code flow. Keep the code and passphrase on separate channels, as the app prompts — sending both together defeats the point.

## Contributing

Issues and pull requests welcome. Since this is a single HTML file, keep changes self-contained and avoid new dependencies unless there's a good reason.

## License

MIT — see [LICENSE](LICENSE).
