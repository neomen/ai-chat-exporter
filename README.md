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
  <img src="https://img.shields.io/badge/platforms-DeepSeek%20%7C%20Grok%20%7C%20ChatGPT%20%7C%20Qwen%20%7C%20Claude-orange" alt="Platforms" />
  <img src="https://img.shields.io/badge/telemetry-none-brightgreen" alt="No telemetry" />
</p>

---

## Features

- **One-click export** — click the extension icon, get a `.md` file.
- **Multi-platform** — DeepSeek, Grok, ChatGPT, Qwen, and Claude.
- **Virtual-list aware** — scrolls through long chats and collects rendered messages.
- **Clean Markdown** — code blocks become fenced blocks, UI buttons are stripped.
- **Sane filenames** — auto-generated from the chat title, sanitized for every OS.
- **SPA-friendly** — works even if you navigated inside the app without a full page reload.

## Privacy

- All processing is local. The content script reads the DOM of the open tab and writes a file to your disk.
- No extension-owned network requests, telemetry, analytics, or backend.
- No accounts, sign-up, or API keys.
- No `eval` or remote code.

## Installation

1. Open `chrome://extensions/`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select the extension folder.

## Supported platforms

| Platform | URL pattern | Notes |
|---|---|---|
| DeepSeek | `chat.deepseek.com/*` | Virtual list, thinking blocks, attachments |
| Grok | `grok.com/*`, `x.com/i/grok*`, `twitter.com/i/grok*` | X/Twitter SPA navigation supported |
| ChatGPT | `chatgpt.com/*`, `chat.openai.com/*` | Long conversations |
| Qwen | `chat.qwen.ai/*` | Messages and code blocks |
| Claude | `claude.ai/*` | User and assistant messages, code blocks, long-chat scrolling |

> Claude's interface changes periodically. The adapter uses DOM selectors rather than Claude's private API; if the site changes its markup, selectors may need updating.

## Usage

1. Open a conversation on any supported platform.
2. Click the extension icon.
3. Wait for the progress toast.
4. The browser downloads `<chat-title>.md`.

## Permissions

| Permission | Why it's needed |
|---|---|
| `activeTab` | Send the export action to the currently focused tab. |
| `notifications` | Show unsupported-page warnings. |
| `scripting` | Inject the content script into tabs opened before installation. |
| `host_permissions` | Read the DOM on the supported chat domains only. |

The extension does not request `<all_urls>`, `webRequest`, broad `tabs`, or storage permissions.

## Architecture

```text
background.js              validate URL → ensure content script → send export message
content.js
 ├─ ADAPTERS {}             per-platform selectors and message extraction
 ├─ cleanContent()          strips UI noise and converts code blocks
 ├─ scrollAndCollect()      unified scroll traversal
 ├─ MarkdownBuilder        unified Markdown renderer
 └─ handleExport()          orchestrates export and download
```

Adding a platform means adding an adapter to `ADAPTERS` and allowing its domain in `manifest.json` and `background.js`.

## Known limitations

- Bold, italic, links, and tables may be flattened to plain text because extraction is based on `innerText`.
- Streaming replies are captured as they appear when export starts.
- Images, file attachments, and inline previews are not embedded.
- Claude's UI is virtualized and may change; verify exports after major Claude interface updates.

## License

MIT.

