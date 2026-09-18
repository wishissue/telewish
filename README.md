# Telewish

A single-file, no-backend, peer-to-peer chat app. Two people connect directly over WebRTC — messages never pass through a server, and everything is encrypted end-to-end with AES-256 on top of DTLS.

Telewish is just one HTML file (`telewish.html`). No build step, no server required, no accounts.

## How it works

WebRTC needs a way for two peers to exchange connection info before a direct link can open (the "handshake"). Telewish gives you two ways to do that:

- **Manual / QR code** — one person generates a connection code (shown as text or a QR code), the other pastes it in or scans it to generate a reply code, which goes back to the first person. No server involved at all.
- **Relay server (optional)** — if you'd rather not copy-paste codes back and forth, you can point both sides at a small WebSocket relay server (`wss://...`) that only passes the handshake messages along. It never sees your chat messages, and the connection becomes direct once the handshake completes. Telewish doesn't include a relay server implementation — bring your own, or use one someone you trust runs.

Either way, the actual chat connection is a direct WebRTC data channel between the two browsers, with messages further encrypted using a key derived from a split code + passphrase (shared over two different channels, so no single link/message contains everything needed to connect).

## Getting started

Just open `telewish.html` in a browser. For encryption to work (WebCrypto requires a secure context), serve it over `https://` or open it from `localhost` — opening the raw file with `file://` may disable encryption features in some browsers.

For local testing:

```bash
python3 -m http.server 8000
# then open http://localhost:8000/telewish.html
```

## Features

- Direct P2P messaging over WebRTC — no message ever touches a server
- End-to-end encryption (AES-256) layered on top of DTLS
- Split-code connection setup (code + passphrase over separate channels) so no single shared link is enough to connect
- QR code generation/scanning for the handshake
- Optional relay server support for easier connection setup
- Light, dark, and rose themes (plus a custom theme option)
- Sound settings, avatars, and other small UX niceties

## Security notes

- This is a personal/hobby project and has **not** had a professional security audit. Please review the code yourself before relying on it for sensitive communication.
- The optional relay server only ever sees WebRTC handshake metadata (SDP offers/answers), never chat content — but you're trusting whoever runs that relay to not tamper with the handshake. Using a relay you control, or the manual QR/code flow, avoids that trust requirement entirely.
- Keep the code and the passphrase on separate channels (as the app prompts you to) — sending both together defeats the purpose of splitting them.

## Contributing

Issues and pull requests are welcome. Since this is a single HTML file, please keep changes self-contained and avoid adding new external dependencies unless there's a good reason.

## License

MIT — see [LICENSE](LICENSE).
