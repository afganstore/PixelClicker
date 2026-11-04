/* ==========================================================================
   fx.js — поведенческая часть fx.css.
   1. Прогрев: картинки декодируются заранее, окна один раз «рисуются» невидимыми —
      первое открытие больше не подвисает, анимация не съедается.
   2. Окна растут из кнопки, которой их открыли (transform-origin).
   ========================================================================== */
(function () {
    "use strict";

    const mq = window.matchMedia("(max-width: 768px)");

    const POPUPS = [
        { popup: "storePopup", btn: "storeBtn" },
        { popup: "inventoryPopup", btn: "inventoryBtn" },
        { popup: "skinsPopup", btn: "skinsBtn" },
        { popup: "casinoPopup", btn: "casinoBtn" },
        { popup: "dailyPopup", btn: "dailyBtn" },
        { popup: "settingsPopup", btn: "settingsBtn" },
    ];

    /* ---------- 1. Картинки ---------- */
    const IMAGES = [
        "p6.png", "esha.png", "goldesha.png", "11.png", "upgrade.png",
        "case.png", "case_goy.png",
        "casino/cat1.png", "casino/cat2.png", "casino/cat3.png", "casino/cat4.png",
    ];

    function preloadImages() {
        IMAGES.forEach((name) => {
            const img = new Image();
            img.decoding = "async";
            img.src = "assets/images/" + name;
            if (img.decode) img.decode().catch(() => {});
        });
    }

    /* ---------- 2. Прогрев окон ---------- */
    const frame = () => new Promise((r) => requestAnimationFrame(() => r()));

    async function prewarm() {
        if (document.body.classList.contains("no-animations")) return;
        // шрифт иконок нужен до первого показа
        try {
            if (document.fonts && document.fonts.load) {
                await document.fonts.load('24px "Material Symbols Rounded"');
            }
        } catch (e) {}

        for (const { popup } of POPUPS) {
            const el = document.getElementById(popup);
            // не трогаем окно, если оно уже открыто пользователем
            if (!el || el.classList.contains("active")) continue;
            el.classList.add("m3x-prewarm");
            void el.offsetWidth; // стили + раскладка
            await frame();
            await frame(); // отрисовка (размытие фона и т.д.)
            el.classList.remove("m3x-prewarm");
            await new Promise((r) => setTimeout(r, 30));
        }
    }

    function schedulePrewarm() {
        const run = () => {
            preloadImages();
            const go = () => prewarm();
            if (window.requestIdleCallback) requestIdleCallback(go, { timeout: 1500 });
            else setTimeout(go, 400);
        };
        // после старта приветствия/анимаций главного экрана
        setTimeout(run, 900);
    }

    /* ---------- 3. Окна растут из кнопки ---------- */
    function trackOrigin() {
        POPUPS.forEach(({ popup, btn }) => {
            const root = document.getElementById(popup);
            const button = document.getElementById(btn);
            if (!root || !button) return;
            let lastActive = root.classList.contains("active");
            new MutationObserver(() => {
                const now = root.classList.contains("active");
                if (now && !lastActive && !mq.matches) {
                    const content = root.querySelector(".popup-content");
                    if (content) {
                        const r = button.getBoundingClientRect();
                        const ox = r.left + r.width / 2 - content.offsetLeft;
                        const oy = r.top + r.height / 2 - content.offsetTop;
                        root.style.setProperty("--m3x-ox", Math.round(ox) + "px");
                        root.style.setProperty("--m3x-oy", Math.round(oy) + "px");
                    }
                }
                lastActive = now;
            }).observe(root, { attributes: true, attributeFilter: ["class"] });
        });
    }

    function init() {
        trackOrigin();
        schedulePrewarm();
    }

    if (document.readyState === "complete") init();
    else window.addEventListener("load", init, { once: true });
})();
