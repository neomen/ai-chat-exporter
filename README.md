<p align="center">
  <img src="icons/128x128.png" alt="AI Chat Exporter" width="96" />
</p>

<h1 align="center">AI Chat Exporter</h1>

<p align="center">
  <strong>Export your AI conversations to Markdown — with one click.</strong><br/>
  <em>Local. Private. No servers. No telemetry. Your secrets stay yours.</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/manifest-v3-blue?logo=googlechrome&logoColor=white" alt="Manifest V3" />
  <img src="https://img.shields.io/badge/license-MIT-green" alt="License" />
  <img src="https://img.shields.io/badge/platforms-DeepSeek%20%7C%20Grok%20%7C%20ChatGPT%20%7C%20Qwen-orange" alt="Platforms" />
  <img src="https://img.shields.io/badge/telemetry-none-brightgreen" alt="No telemetry" />
</p>

---

## ✨ Features

- **One-click export** — click the extension icon, get a `.md` file.
- **Multi-platform** — DeepSeek, Grok (grok.com + x.com/i/grok), ChatGPT, and Qwen.
- **Virtual-list aware** — correctly exports long chats where only a fraction of messages are in the DOM.
- **Clean Markdown** — code blocks become real fenced blocks, UI buttons are stripped, thinking blocks are preserved.
- **Sane filenames** — auto-generated from the chat title, sanitized for every OS.
- **SPA-friendly** — works even if you navigated inside the app without a full page reload.

---

## 🔒 Privacy — the whole point

This extension was built around a single rule:

> **Your conversations never leave your browser.**

- 🟢 **All processing is local.** The content script reads the DOM of the open tab and writes a file to your disk. That's it.
- 🟢 **No network requests.** There are zero `fetch` / `XMLHttpRequest` / `WebSocket` calls to any external server — including my servers. There are no servers.
- 🟢 **No telemetry, no analytics.** No Google Analytics, no Plausible, no "crash reporting". Nothing.
- 🟢 **No accounts, no sign-up, no keys.**
- 🟢 **No `eval`, no remote code.** Everything that runs is in this repo.
- 🟢 **Open source.** Don't trust me — read the code.

The only network activity the extension is capable of is the browser's own download of the `.md` file it created from the page you're already on.

---

## 🚀 Installation

### From source (developer mode)

```bash
git clone https://github.com/neomen/ai-chat-exporter.git
cd ai-chat-exporter
```

1. Open `chrome://extensions/`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked**
4. Select the cloned folder

### From Chrome Web Store

_Coming soon._

---

## 📦 Supported platforms

| Platform | URL pattern | Notes |
|---|---|---|
| DeepSeek | `chat.deepseek.com/*` | Virtual list, thinking blocks, attachments |
| Grok | `grok.com/*`, `x.com/i/grok*`, `twitter.com/i/grok*` | X/Twitter SPA navigation supported |
| ChatGPT | `chatgpt.com/*`, `chat.openai.com/*` | Handles long virtualized chats |
| Qwen | `chat.qwen.ai/*` | Messages, code blocks |

> If a supported site changes its DOM and export breaks, please open an issue — the selectors live in a single config block at the top of `content.js` and are easy to update.

---

## 🧭 Usage

1. Open a chat on any supported platform.
2. (Optional) Pin the extension to your toolbar for one-click access.
3. Click the extension icon.
4. A small toast shows progress.
5. When it finishes, your browser downloads `<chat-title>.md`.

That's all. No dialogs, no settings, no friction.

---

## 🛡️ Permissions — why each one

| Permission | Why it's needed |
|---|---|
| `activeTab` | To send the "export" message to the currently focused tab only. |
| `notifications` | To show the "this page isn't supported" warning when you click the icon on a random site. |
| `scripting` | To programmatically inject the content script into tabs opened *before* the extension was installed, and into SPA navigations that didn't trigger a full reload. |
| `host_permissions` (the four chat domains) | To read the DOM of those specific pages. Nothing else. |

The extension **does not** request `<all_urls>`, `webRequest`, `tabs` (broad), `storage`, or any other sensitive permission.

---

## 🧩 Architecture

```
background.js              one click → validate URL → ensure content script → send message
content.js
 ├─ ADAPTERS {}            per-platform configs (selectors, role detection)
 ├─ cleanContent()         strips UI noise, turns <pre> into ```fences
 ├─ scrollAndCollect()     unified virtual-list traversal
 ├─ MarkdownBuilder        single markdown renderer
 └─ handleExport()         orchestrates the flow
```

Adding a new platform = adding one object to `ADAPTERS`. No changes to the rest of the code.

---

## 🧪 Known limitations

- Markdown is produced from `innerText`, so **bold / italic / links / tables inside AI replies are preserved as plain text**, not as rich Markdown. This is a deliberate trade-off for robustness across sites that keep changing their DOM.
- Streaming replies (messages still being generated) are captured *as they are* at the moment of the click. Wait for generation to finish for a complete export.
- Images, file attachments, and inline previews are not embedded in the `.md` — only the surrounding text.

---

## 🤝 Contributing

PRs are welcome, especially:

- Improved selectors for any of the supported platforms (they do drift).
- A richer DOM → Markdown converter (Turndown-based) behind an opt-in flag.
- Firefox (Manifest V3) compatibility testing.

Please keep the "no network, no telemetry" promise intact.

---

## 📄 License

MIT — do whatever you want with it, just don't add spyware to your fork.