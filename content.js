'use strict';

// Guard against double injection (especially after programmatic executeScript)
if (window.__AI_CHAT_EXPORTER_INJECTED__) {
  // already running
} else {
  window.__AI_CHAT_EXPORTER_INJECTED__ = true;
  boot();
}

function boot() {
  // ============================================================
  //  PLATFORM CONFIGS
  //  Each adapter describes: how to find the scroller, which DOM
  //  nodes are messages, how to detect role, and which UI bits to strip.
  // ============================================================

  const ADAPTERS = {
    deepseek: {
      name: 'deepseek',
      match: (loc) => loc.hostname === 'chat.deepseek.com',

      title: () =>
        document.title.replace(/\s*[-|]\s*DeepSeek.*$/i, '').trim() || 'DeepSeek Chat',

      findScroller: () => {
        // Primary: the virtual-list container exposes this CSS variable
        for (const el of document.querySelectorAll('div')) {
          const inline = el.style?.getPropertyValue('--dsl-virtual-list-transform-y');
          const computed = getComputedStyle(el).getPropertyValue(
            '--dsl-virtual-list-transform-y'
          );
          if (inline || computed) return el;
        }
        return null;
      },

      async collectMessages() {
        const collected = new Map(); // key -> message object

        const collect = () => {
          for (const item of document.querySelectorAll(
            '[data-virtual-list-item-key]'
          )) {
            const key = item.getAttribute('data-virtual-list-item-key');
            if (!key || collected.has(key)) continue;

            const msg = item.querySelector('.ds-message');
            if (!msg) continue;

            const isAssistant = !!msg.querySelector(
              '.ds-assistant-message-main-content'
            );
            const role = isAssistant ? 'assistant' : 'user';

            const contentEl = isAssistant
              ? msg.querySelector('.ds-markdown.ds-assistant-message-main-content')
              : msg.querySelector('.ds-markdown') || msg;
            if (!contentEl) continue;

            const text = cleanContent(contentEl, {
              codeBlocks: '.md-code-block',
              codeBanner: '.md-code-block-banner',
              codeLang: '.md-code-block-banner span',
              codeBody: 'pre code, pre',
              ui: [
                '.md-code-block-banner-wrap',
                '[role="button"]',
                'button',
                '.ds-button',
                '.ds-icon',
                'svg'
              ]
            });
            if (!text) continue;

            const thinkEl = msg.querySelector('.ds-think-content .ds-markdown');
            const thinking = thinkEl ? cleanContent(thinkEl, { ui: [] }) : '';

            collected.set(key, {
              key: parseInt(key, 10) || 0,
              role,
              text,
              thinking
            });
          }
        };

        collect();
        await scrollAndCollect(ADAPTERS.deepseek, collect);

        if (!collected.size) {
          throw new Error(
            'No DeepSeek messages found. Open a chat with history first.'
          );
        }

        return [...collected.values()].sort((a, b) => a.key - b.key);
      }
    },

    grok: {
      name: 'grok',
      match: (loc) => {
        if (loc.hostname === 'grok.com') return true;
        if (
          (loc.hostname === 'x.com' || loc.hostname === 'twitter.com') &&
          loc.pathname.startsWith('/i/grok')
        ) {
          return true;
        }
        return false;
      },

      title: () =>
        document.title.replace(/\s*[-|]\s*Grok.*$/i, '').trim() || 'Grok Chat',

      findScroller: () => {
        // Grok's scroll container — try a few candidates
        return (
          document.querySelector(
            'main div[class*="overflow-y-auto"], div[class*="scrollable"]'
          ) || null
        );
      },

      async collectMessages() {
        const collected = new Map();

        const collect = () => {
          const nodes = document.querySelectorAll('div[id^="response-"]');
          for (const node of nodes) {
            const id = node.id;
            if (collected.has(id)) continue;

            const isUser =
              node.querySelector('.message-bubble.user') ||
              node.querySelector('[data-role="user"]') ||
              node.querySelector('[class*="user"]');

            const role = isUser ? 'user' : 'assistant';

            const contentEl =
              node.querySelector(
                '.message-content, .prose, .markdown, .whitespace-pre-wrap'
              ) || node;

            const text = cleanContent(contentEl, {
              codeBlocks: 'pre',
              codeBody: 'pre code, pre',
              ui: ['button', '[role="button"]', 'svg', '[aria-label*="Copy"]']
            });
            if (!text) continue;

            collected.set(id, {
              key: collected.size,
              role,
              text,
              thinking: ''
            });
          }
        };

        collect();
        await scrollAndCollect(ADAPTERS.grok, collect);

        if (!collected.size) {
          throw new Error('No Grok messages found.');
        }
        return [...collected.values()].sort((a, b) => a.key - b.key);
      }
    },

    chatgpt: {
      name: 'chatgpt',
      match: (loc) =>
        loc.hostname === 'chatgpt.com' || loc.hostname === 'chat.openai.com',

      title: () =>
        document.title.replace(/\s*[-|]\s*ChatGPT.*$/i, '').trim() || 'ChatGPT Chat',

      findScroller: () => {
        return (
          document.querySelector('main div[class*="overflow-y-auto"]') ||
          document.querySelector('main div[class*="scroll"]') ||
          null
        );
      },

      async collectMessages() {
        const collected = new Map();

        const collect = () => {
          // Use the outermost "turn" node only, to avoid nested duplicates
          const turns = document.querySelectorAll(
            'article[data-testid*="conversation-turn"]'
          );

          for (const turn of turns) {
            const id =
              turn.getAttribute('data-testid') ||
              turn.id ||
              `turn-${collected.size}`;
            if (collected.has(id)) continue;

            const inner =
              turn.querySelector('[data-message-author-role]') || turn;
            const roleAttr = inner.getAttribute('data-message-author-role');
            const role = roleAttr === 'user' ? 'user' : 'assistant';

            const contentEl =
              turn.querySelector(
                '.markdown, [data-message-content], .whitespace-pre-wrap'
              ) || turn;

            const text = cleanContent(contentEl, {
              codeBlocks: 'pre',
              codeBody: 'pre code, pre',
              ui: [
                'button',
                '[role="button"]',
                'svg',
                '[aria-label*="Copy"]',
                '[aria-label*="copy"]'
              ]
            });
            if (!text) continue;

            collected.set(id, {
              key: collected.size,
              role,
              text,
              thinking: ''
            });
          }
        };

        collect();
        await scrollAndCollect(ADAPTERS.chatgpt, collect);

        if (!collected.size) {
          throw new Error('No ChatGPT messages found.');
        }
        return [...collected.values()].sort((a, b) => a.key - b.key);
      }
    },

    qwen: {
      name: 'qwen',
      match: (loc) => loc.hostname === 'chat.qwen.ai',

      title: () =>
        document.title.replace(/\s*[-|]\s*Qwen.*$/i, '').trim() || 'Qwen Chat',

      findScroller: () => {
        // Qwen скроллится внутри main .chat-messages-container
        return (
          document.querySelector('.chat-messages-container') ||
          document.querySelector('.chat-container') ||
          document.querySelector('main') ||
          null
        );
      },

      async collectMessages() {
        const collected = new Map();
        const seen = new WeakSet();

        const collect = () => {
          // Корневые узлы сообщений — всегда .qwen-chat-message
          const roots = document.querySelectorAll(
            '.qwen-chat-message.qwen-chat-message-user, ' +
            '.qwen-chat-message.qwen-chat-message-assistant'
          );

          for (const wrapper of roots) {
            if (seen.has(wrapper)) continue;
            seen.add(wrapper);

            // Идентификатор из data-msg-id, если есть — иначе по позиции
            const msgId =
              wrapper.querySelector('[data-msg-id]')?.getAttribute('data-msg-id') ||
              `qwen-${collected.size}`;
            if (collected.has(msgId)) continue;

            const isUser = wrapper.classList.contains('qwen-chat-message-user');
            const role = isUser ? 'user' : 'assistant';

            // Разные контейнеры контента для user и assistant
            const contentEl = isUser
              ? wrapper.querySelector('.user-message-content') ||
              wrapper.querySelector('p.whitespace-pre-wrap')
              : wrapper.querySelector('.response-message-content') ||
              wrapper.querySelector('.qwen-markdown');

            if (!contentEl) continue;

            const text = cleanContent(contentEl, {
              codeBlocks: 'pre',
              codeBody: 'pre code, pre',
              ui: [
                '.qwen-chat-thinking-tool-status-card-wraper', // "Thinking completed"
                '.qwen-chat-tool-status-card',
                '.message-hoc-container',                      // кнопки Copy/Edit/Delete/Good/Bad
                '.user-message-footer',
                '.response-message-footer',
                '.qwen-chat-package-comp-new-action-control',
                '.copy-response-button',
                '.scroll-down-button',
                '.chat-detail-skeleton',
                'button',
                '[role="button"]',
                'svg',
                '[aria-label*="Copy"]',
                '[aria-label*="copy"]'
              ]
            });
            if (!text) continue;

            collected.set(msgId, {
              key: collected.size,
              role,
              text,
              thinking: ''
            });
          }
        };

        collect();
        await scrollAndCollect(ADAPTERS.qwen, collect);

        if (!collected.size) {
          throw new Error('No Qwen messages found.');
        }
        return [...collected.values()].sort((a, b) => a.key - b.key);
      }
    }
  };

  // ============================================================
  //  DOM HELPERS
  // ============================================================

  function cleanContent(rootEl, opts = {}) {
    if (!rootEl) return '';

    const clone = rootEl.cloneNode(true);

    // 1. Convert code blocks into markdown fences before we strip UI
    if (opts.codeBlocks) {
      clone.querySelectorAll(opts.codeBlocks).forEach((block) => {
        let lang = '';
        if (opts.codeLang) {
          const langEl = block.querySelector(opts.codeLang);
          lang = (langEl?.textContent || '').trim().toLowerCase();
        }
        const codeEl = opts.codeBody
          ? block.querySelector(opts.codeBody) || block
          : block;
        let code = (codeEl.innerText || '').replace(/\n+$/, '');

        const fence = document.createElement('pre');
        fence.textContent = '```' + lang + '\n' + code + '\n```';
        block.replaceWith(fence);
      });
    }

    // 2. Strip UI noise
    if (opts.ui && opts.ui.length) {
      clone.querySelectorAll(opts.ui.join(',')).forEach((n) => n.remove());
    }

    // Attach to DOM briefly so innerText respects visual layout
    clone.style.cssText =
      'position:fixed;left:-99999px;top:0;white-space:pre-wrap;';
    document.body.appendChild(clone);
    let text = (clone.innerText || '').trim();
    clone.remove();

    // 3. Strip leftover service strings
    text = text
      .replace(/^\s*(Copy|Download|Run|Copied!)\s*$/gm, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    return text;
  }

  function findScrollableElement(adapter) {
    // Adapter-provided first
    let scroller = adapter.findScroller && adapter.findScroller();
    if (scroller) return scroller;

    // Generic fallback: any scrollable container with meaningful content
    const candidates = [...document.querySelectorAll('div')].filter((el) => {
      const s = getComputedStyle(el);
      return (
        /auto|scroll/.test(s.overflowY) &&
        el.scrollHeight > el.clientHeight + 100
      );
    });

    // Prefer the deepest (innermost) scrollable
    return candidates[candidates.length - 1] || document.scrollingElement;
  }

  // ============================================================
  //  UNIFIED SCROLL + COLLECT LOOP
  //  Used by every platform. Replaces the old scattered logic.
  // ============================================================

  async function scrollAndCollect(adapter, collectFn, opts = {}) {
    const {
      stepRatio = 0.7,
      stepDelayMs = 180,
      settleRounds = 2,
      maxMs = 45000
    } = opts;

    const scroller = findScrollableElement(adapter);

    const scrollBy = (delta) => {
      if (scroller === document.scrollingElement) {
        window.scrollBy(0, delta);
      } else {
        scroller.scrollTop += delta;
      }
    };

    const scrollTop = (v) => {
      if (scroller === document.scrollingElement) {
        window.scrollTo(0, v);
      } else {
        scroller.scrollTop = v;
      }
    };

    const getScrollHeight = () =>
      scroller === document.scrollingElement
        ? document.body.scrollHeight
        : scroller.scrollHeight;

    const getScrollTop = () =>
      scroller === document.scrollingElement
        ? window.scrollY
        : scroller.scrollTop;

    const getClientHeight = () =>
      scroller === document.scrollingElement
        ? window.innerHeight
        : scroller.clientHeight;

    const start = Date.now();
    let prevSize = -1;
    let stableRounds = 0;

    collectFn();

    while (stableRounds < settleRounds && Date.now() - start < maxMs) {
      scrollTop(0);
      await sleep(250);
      collectFn();

      const step = Math.max(300, Math.floor(getClientHeight() * stepRatio));
      while (getScrollTop() + getClientHeight() < getScrollHeight() - 4) {
        scrollBy(step);
        await sleep(stepDelayMs);
        collectFn();
      }

      await sleep(350);
      collectFn();

      // Approximate "size" by last message count — adapter stores in its Map
      const currentSize = getLastCollectedSize(adapter);
      if (currentSize === prevSize) stableRounds++;
      else {
        stableRounds = 0;
        prevSize = currentSize;
      }
    }
  }

  // Small hack: we need to know how many items the adapter has collected,
  // but the Map lives inside its closure. We expose a getter via a shared ref.
  const __state = { lastSize: 0 };
  function getLastCollectedSize() {
    return __state.lastSize;
  }

  // Wrap each adapter.collectMessages so we can observe progress
  for (const key of Object.keys(ADAPTERS)) {
    const original = ADAPTERS[key].collectMessages;
    ADAPTERS[key].collectMessages = async function () {
      const origCollect = original;
      // We patch the inner collect loop by monkey-patching scrollAndCollect's
      // size source. Simpler: just observe via a periodic timer while we run.
      const resultPromise = origCollect.call(this);
      const interval = setInterval(() => {
        // Count collected messages by looking at the running promise's state —
        // actually, we just count DOM hits for this adapter as a proxy.
        __state.lastSize = document.querySelectorAll(
          adapterProbeSelector(key)
        ).length;
      }, 150);
      try {
        const result = await resultPromise;
        __state.lastSize = result.length;
        return result;
      } finally {
        clearInterval(interval);
      }
    };
  }

  function adapterProbeSelector(name) {
    switch (name) {
      case 'deepseek':
        return '[data-virtual-list-item-key]';
      case 'grok':
        return 'div[id^="response-"]';
      case 'chatgpt':
        return 'article[data-testid*="conversation-turn"]';
      case 'qwen':
        return '[data-role], [class*="message-user"], [class*="message-assistant"]';
      default:
        return '[data-message-author-role]';
    }
  }

  // ============================================================
  //  MARKDOWN BUILDER (single source of truth)
  // ============================================================

  const MarkdownBuilder = {
    build({ title, messages }) {
      const lines = [];
      lines.push(`# ${title}`);
      lines.push('');
      lines.push(`_Exported on ${new Date().toISOString().slice(0, 10)}_`);
      lines.push('');
      lines.push('---');
      lines.push('');

      for (const m of messages) {
        const label = m.role === 'user' ? 'User' : 'Assistant';
        lines.push(`## ${label}`);
        lines.push('');
        if (m.thinking && m.thinking.trim()) {
          lines.push('> **Thinking:**');
          lines.push('>');
          lines.push(...m.thinking.split('\n').map((l) => '> ' + l));
          lines.push('');
        }
        lines.push(m.text);
        lines.push('');
        lines.push('---');
        lines.push('');
      }

      return lines.join('\n');
    }
  };

  // ============================================================
  //  UTILITIES
  // ============================================================

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  function sanitizeFilename(name) {
    return (
      name
        .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '')
        .replace(/\s+/g, ' ')
        .replace(/^[\s.]+|[\s.]+$/g, '')
        .slice(0, 120)
        .trim() || 'chat'
    );
  }

  function downloadFile(content, baseName) {
    const blob = new Blob([content], {
      type: 'text/markdown;charset=utf-8'
    });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `${baseName}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  // ============================================================
  //  UNIFIED UI
  // ============================================================

  function showNotification(text, type = 'success') {
    const colors = {
      success: { bg: '#10b981', fg: '#fff' },
      error: { bg: '#ef4444', fg: '#fff' },
      info: { bg: '#1a1a2e', fg: '#fff' }
    };
    const { bg, fg } = colors[type] || colors.info;

    const div = document.createElement('div');
    div.textContent = text;
    Object.assign(div.style, {
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      background: bg,
      color: fg,
      padding: '12px 20px',
      borderRadius: '8px',
      fontFamily: 'system-ui, sans-serif',
      fontSize: '14px',
      zIndex: 2147483647,
      boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
      transition: 'opacity 0.3s, transform 0.3s',
      opacity: '1',
      transform: 'translateY(0)'
    });
    document.body.appendChild(div);

    setTimeout(() => {
      div.style.opacity = '0';
      div.style.transform = 'translateY(10px)';
      setTimeout(() => div.remove(), 300);
    }, 3000);
  }

  // ============================================================
  //  PLATFORM DETECTION
  // ============================================================

  function detectAdapter() {
    for (const key of Object.keys(ADAPTERS)) {
      if (ADAPTERS[key].match(window.location)) {
        return ADAPTERS[key];
      }
    }
    return null;
  }

  // ============================================================
  //  MAIN EXPORT FLOW
  // ============================================================

  let isExporting = false;

  async function handleExport() {
    if (isExporting) {
      showNotification('Export already in progress…', 'info');
      return;
    }
    isExporting = true;

    try {
      const adapter = detectAdapter();
      if (!adapter) {
        showNotification('This page is not supported.', 'error');
        return;
      }

      showNotification(`Exporting ${adapter.name} chat…`, 'info');

      const messages = await adapter.collectMessages();
      const title = adapter.title();
      const markdown = MarkdownBuilder.build({ title, messages });

      downloadFile(markdown, sanitizeFilename(title));
      showNotification(
        `✅ Exported ${messages.length} messages.`,
        'success'
      );
    } catch (err) {
      console.error('[AI Chat Exporter]', err);
      showNotification(`Export failed: ${err.message}`, 'error');
    } finally {
      isExporting = false;
    }
  }

  // ============================================================
  //  MESSAGE LISTENER
  // ============================================================

  chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
    if (request?.action === 'ping') {
      sendResponse({ ok: true });
      return;
    }
    if (request?.action === 'export_chat') {
      handleExport().then(
        () => sendResponse({ success: true }),
        (err) => sendResponse({ success: false, error: err.message })
      );
      return true; // keep sendResponse channel open for async
    }
  });
}