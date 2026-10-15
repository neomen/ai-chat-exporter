'use strict';

// ============================================================
//  URL validation
// ============================================================

const SUPPORTED_HOSTS = [
  'chat.deepseek.com',
  'grok.com',
  'chatgpt.com',
  'chat.openai.com',
  'chat.qwen.ai'
];

const GROK_PATH_HOSTS = ['x.com', 'twitter.com'];

function isSupportedUrl(rawUrl) {
  if (!rawUrl) return false;
  try {
    const url = new URL(rawUrl);

    if (SUPPORTED_HOSTS.includes(url.hostname)) {
      return true;
    }

    // Grok on X/Twitter lives under /i/grok
    if (GROK_PATH_HOSTS.includes(url.hostname)) {
      return url.pathname.startsWith('/i/grok');
    }

    return false;
  } catch {
    return false;
  }
}

// ============================================================
//  Notifications
// ============================================================

async function notify(title, message) {
  try {
    await chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/32x32.png',
      title: `AI Chat Exporter — ${title}`,
      message
    });
  } catch (err) {
    console.warn('Failed to show notification (missing icon?):', err);
  }
}

// ============================================================
//  Programmatic injection (fallback for SPA navigation)
// ============================================================

async function ensureContentScript(tabId) {
  try {
    await chrome.tabs.sendMessage(tabId, { action: 'ping' });
    return true;
  } catch {
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['content.js']
      });
      // Small delay so the listener is registered before we fire the real action
      await new Promise(r => setTimeout(r, 100));
      return true;
    } catch (err) {
      console.warn('Failed to inject content script', err);
      return false;
    }
  }
}

// ============================================================
//  Main action
// ============================================================

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab?.id) return;

  if (!isSupportedUrl(tab.url)) {
    notify(
      'Not supported',
      'Open a supported chat page first (DeepSeek, Grok, ChatGPT or Qwen).'
    );
    return;
  }

  const injected = await ensureContentScript(tab.id);
  if (!injected) {
    notify('Injection failed', 'Reload the page and try again.');
    return;
  }

  try {
    await chrome.tabs.sendMessage(tab.id, { action: 'export_chat' });
  } catch (err) {
    console.warn('sendMessage failed', err);
    notify('Export error', 'Could not start export. Reload the page and try again.');
  }
});