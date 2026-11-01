/* ==========================================================================
   Material 3 Expressive — поведенческий слой.
   Ничего в существующей логике не меняет: только добавляет
   ripple, Material Symbols вместо эмодзи, пружинку счётчика,
   stagger-анимацию сеток и контрастный цвет текста на акценте.
   ========================================================================== */
(function () {
    "use strict";

    const root = document.documentElement;
    const animationsOff = () => document.body.classList.contains("no-animations");

    /* ---------- 1. Контрастный цвет на акценте ---------- */
    let lastAccentKey = "";

    function parseColor(value) {
        const probe = document.createElement("span");
        probe.style.color = value;
        probe.style.display = "none";
        document.body.appendChild(probe);
        const rgb = getComputedStyle(probe).color;
        probe.remove();
        const m = rgb.match(/[\d.]+/g);
        return m ? m.slice(0, 3).map(Number) : [103, 80, 164];
    }

    function luminance([r, g, b]) {
        const f = (c) => {
            c /= 255;
            return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
        };
        return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
    }

    function syncAccentContrast() {
        const accent = getComputedStyle(root).getPropertyValue("--accent-color").trim();
        const key = accent + "|" + root.getAttribute("data-theme");
        if (!accent || key === lastAccentKey) return;
        lastAccentKey = key;
        const L = luminance(parseColor(accent));
        root.style.setProperty("--m3e-on-primary", L > 0.38 ? "#1d1b20" : "#ffffff");
    }

    /* ---------- 2. Ripple ---------- */
    const RIPPLE_SELECTOR = [
        ".icon-btn",
        ".close-btn",
        ".tab-btn",
        ".buy-btn",
        ".upgrade-btn",
        ".case-btn",
        ".danger-btn",
        ".link-btn",
        ".mod-btn",
        ".example-btn",
        ".confirm-btn",
        ".color-picker-confirm",
        ".color-picker-cancel",
        ".casino-spin-btn",
        ".casino-bet-quick",
        ".inventory-menu-btn",
        ".auto-load-remove",
        ".store-item",
        ".skin-card",
        ".inventory-item",
    ].join(",");

    document.addEventListener(
        "pointerdown",
        (e) => {
            if (animationsOff()) return;
            if (e.pointerType === "mouse" && e.button !== 0) return;
            const host = e.target.closest && e.target.closest(RIPPLE_SELECTOR);
            if (!host || host.disabled) return;

            const rect = host.getBoundingClientRect();
            const size = Math.hypot(rect.width, rect.height) * 2;
            const ripple = document.createElement("span");
            ripple.className = "m3e-ripple";
            ripple.style.width = ripple.style.height = size + "px";
            ripple.style.left = e.clientX - rect.left - size / 2 + "px";
            ripple.style.top = e.clientY - rect.top - size / 2 + "px";
            host.appendChild(ripple);
            ripple.addEventListener("animationend", () => ripple.remove(), { once: true });
            setTimeout(() => ripple.remove(), 900);
        },
        { passive: true },
    );

    /* ---------- 3. Эмодзи → Material Symbols ---------- */
    const EMOJI_ICONS = {
        "🎨": "palette",
        "🔊": "volume_up",
        "⚡": "bolt",
        "🛠": "build",
        "🔗": "link",
        "🌟": "star",
        "📱": "smartphone",
        "⚠": "warning",
        "🎰": "casino",
        "🎉": "celebration",
        "🔄": "sync",
        "🗑": "delete",
        "📋": "assignment",
        "💾": "save",
        "✅": "check_circle",
        "❌": "cancel",
        "🚀": "rocket_launch",
    };
    const EMOJI_RE = new RegExp(
        "(" + Object.keys(EMOJI_ICONS).join("|") + ")\\uFE0F?",
        "g",
    );
    const SKIP_SELECTOR =
        "script,style,textarea,input,option,select,code,pre,.code-editor,.code-preview,.material-symbols-rounded,.tab-btn";

    function iconSpan(name, inline) {
        const s = document.createElement("span");
        s.className = "material-symbols-rounded" + (inline ? " m3e-ic-inline" : "");
        s.setAttribute("aria-hidden", "true");
        s.textContent = name;
        return s;
    }

    function iconifyTextNode(node) {
        const text = node.nodeValue;
        if (!text || !EMOJI_RE.test(text)) {
            EMOJI_RE.lastIndex = 0;
            return;
        }
        EMOJI_RE.lastIndex = 0;
        const parent = node.parentElement;
        if (!parent || parent.closest(SKIP_SELECTOR)) return;

        const frag = document.createDocumentFragment();
        let last = 0;
        text.replace(EMOJI_RE, (match, emoji, offset) => {
            if (offset > last) frag.appendChild(document.createTextNode(text.slice(last, offset)));
            frag.appendChild(iconSpan(EMOJI_ICONS[emoji], true));
            last = offset + match.length;
            return match;
        });
        if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
        // убираем пробел сразу после иконки
        if (frag.childNodes[1] && frag.childNodes[1].nodeType === 3) {
            frag.childNodes[1].nodeValue = frag.childNodes[1].nodeValue.replace(/^\s+/, " ");
        }
        node.replaceWith(frag);
    }

    function iconifyTree(node) {
        if (!node) return;
        if (node.nodeType === 3) return iconifyTextNode(node);
        if (node.nodeType !== 1) return;
        if (node.closest && node.closest(SKIP_SELECTOR)) return;
        const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
        const batch = [];
        let n;
        while ((n = walker.nextNode())) {
            if (n.nodeValue && /[^\x00-\u2000]/.test(n.nodeValue)) batch.push(n);
        }
        batch.forEach(iconifyTextNode);
    }

    /* Иконки во вкладках настроек (settings.js делит «эмодзи + текст» сам) */
    const TAB_ICONS = {
        all: "apps",
        appearance: "palette",
        audio: "volume_up",
        optimization: "bolt",
        actions: "build",
        mods: "extension",
        links: "link",
    };

    function upgradeTabs() {
        document.querySelectorAll(".tab-btn[data-tab]").forEach((btn) => {
            if (btn.dataset.m3e) return;
            const name = TAB_ICONS[btn.dataset.tab];
            if (!name) return;
            let emoji = btn.querySelector(".tab-emoji");
            let text = btn.querySelector(".tab-text");
            if (!emoji) {
                // Кнопка с переносами строк в HTML: settings.js её структуру не разбирал,
                // собираем ту же «иконка + текст» разметку сами.
                const label = btn.textContent
                    .replace(EMOJI_RE, "")
                    .replace(/\s+/g, " ")
                    .trim();
                EMOJI_RE.lastIndex = 0;
                btn.textContent = "";
                emoji = document.createElement("span");
                emoji.className = "tab-emoji";
                text = document.createElement("span");
                text.className = "tab-text";
                text.textContent = label;
                btn.append(emoji, text);
            }
            // «Все»: settings.js кладёт слово целиком в .tab-emoji — возвращаем его в текст
            if (text && !text.textContent.trim()) text.textContent = emoji.textContent.trim();
            emoji.textContent = "";
            emoji.appendChild(iconSpan(name, false));
            // Вкладки — только иконки: подпись остаётся во всплывающей подсказке и для скринридеров
            if (text && text.textContent.trim()) {
                btn.title = text.textContent.trim();
                btn.setAttribute("aria-label", text.textContent.trim());
            }
            btn.dataset.m3e = "1";
        });
    }

    /* ---------- 4. Stagger для сеток ---------- */
    function stagger(container) {
        Array.from(container.children).forEach((child, i) => {
            child.style.setProperty("--i", Math.min(i, 14));
        });
    }

    /* ---------- 5. Пружинка счётчика ---------- */
    function watchCounter() {
        const counter = document.getElementById("counter");
        if (!counter) return;
        let busy = false;
        new MutationObserver(() => {
            if (busy || animationsOff()) return;
            busy = true;
            counter.classList.remove("m3e-bump");
            void counter.offsetWidth;
            counter.classList.add("m3e-bump");
            setTimeout(() => {
                counter.classList.remove("m3e-bump");
                busy = false;
            }, 420);
        }).observe(counter, { childList: true, characterData: true, subtree: true });
    }

    /* ---------- 6. Градиент фона без зелёного ---------- */
    // Стандартный градиент из settings.js содержит бирюзово-зелёные стопы
    // (#006a6b, #00b3a6) — подменяем их на фиолетовые, сам settings.js не трогаем.
    const GREEN_SWAPS = [
        [/rgb\(\s*0,\s*106,\s*107\s*\)|#006a6b/gi, "#4a3a8f"],
        [/rgb\(\s*0,\s*179,\s*166\s*\)|#00b3a6/gi, "#9a67ea"],
    ];

    function fixGreenBackground() {
        const bg = document.body.style.backgroundImage;
        if (!bg || bg.indexOf("gradient") === -1) return;
        let next = bg;
        GREEN_SWAPS.forEach(([re, color]) => {
            next = next.replace(re, color);
        });
        if (next !== bg) document.body.style.backgroundImage = next;
    }

    /* ---------- Старт ---------- */
    function init() {
        fixGreenBackground();
        new MutationObserver(fixGreenBackground).observe(document.body, {
            attributes: true,
            attributeFilter: ["style"],
        });

        syncAccentContrast();
        new MutationObserver(syncAccentContrast).observe(root, {
            attributes: true,
            attributeFilter: ["style", "data-theme"],
        });

        upgradeTabs();
        iconifyTree(document.body);
        watchCounter();

        ["storeGrid", "skinsGrid", "inventoryGrid", "autoLoadList"].forEach((id) => {
            const el = document.getElementById(id);
            if (!el) return;
            stagger(el);
            new MutationObserver(() => stagger(el)).observe(el, { childList: true });
        });
        document.querySelectorAll(".setting-category").forEach((c, i) => c.style.setProperty("--i", i));

        // Динамический контент (уведомления, статусы, результаты казино, список модов…)
        new MutationObserver((mutations) => {
            for (const m of mutations) {
                m.addedNodes.forEach((n) => {
                    if (n.nodeType === 3 || n.nodeType === 1) iconifyTree(n);
                });
            }
            upgradeTabs();
        }).observe(document.body, { childList: true, subtree: true });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        // Скрипт подключён в конце body: ждём, чтобы остальные DOMContentLoaded-обработчики
        // (settings.js и др.) успели отработать первыми.
        setTimeout(init, 0);
    }
})();
