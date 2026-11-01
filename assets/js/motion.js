/* ==========================================================================
   Motion layer — поведенческая часть.
   Ничего в существующей логике не меняет, только добавляет:
   1. пауза всех бесконечных анимаций, когда вкладка не видна (экономия CPU/GPU);
   2. плавная смена темы;
   3. кольцо от клика по пикселю;
   4. лёгкий параллакс пикселя за курсором;
   5. «тик» баланса в казино при изменении.
   Всё уважает тумблеры «Анимации» / «Эффекты частиц» и prefers-reduced-motion.
   ========================================================================== */
(function () {
    "use strict";

    const root = document.documentElement;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    const animationsOff = () =>
        document.body.classList.contains("no-animations") || reducedMotion.matches;
    const particlesOff = () => localStorage.getItem("particlesEnabled") === "false";

    /* ---------- 1. Пауза в фоновой вкладке ---------- */
    function syncVisibility() {
        root.classList.toggle("m3x-paused", document.hidden);
    }
    document.addEventListener("visibilitychange", syncVisibility);
    syncVisibility();

    /* ---------- 2. Плавная смена темы ---------- */
    let themeTimer = 0;
    function watchTheme() {
        let last = root.getAttribute("data-theme");
        new MutationObserver(() => {
            const now = root.getAttribute("data-theme");
            if (now === last) return;
            last = now;
            if (animationsOff()) return;
            root.classList.add("m3x-theme-switch");
            clearTimeout(themeTimer);
            themeTimer = setTimeout(() => root.classList.remove("m3x-theme-switch"), 520);
        }).observe(root, { attributes: true, attributeFilter: ["data-theme"] });
    }

    /* ---------- 3. Кольцо от клика ---------- */
    const MAX_RINGS = 8;
    let ringCount = 0;

    function spawnRing(x, y) {
        if (ringCount >= MAX_RINGS) return;
        ringCount++;
        const ring = document.createElement("span");
        ring.className = "m3x-ring";
        ring.style.left = x + "px";
        ring.style.top = y + "px";
        const done = () => {
            if (ring.isConnected) {
                ring.remove();
                ringCount--;
            }
        };
        ring.addEventListener("animationend", done, { once: true });
        setTimeout(done, 900);
        document.body.appendChild(ring);
    }

    /* ---------- 4. Параллакс пикселя ---------- */
    function setupClickArea() {
        const image = document.getElementById("clickImage");
        const area = document.querySelector(".click-area");
        if (!image || !area) return;

        image.addEventListener(
            "pointerdown",
            (e) => {
                if (animationsOff() || particlesOff()) return;
                spawnRing(e.clientX, e.clientY);
            },
            { passive: true },
        );

        let raf = 0;
        let px = 0;
        let py = 0;

        const apply = () => {
            raf = 0;
            area.style.setProperty("--m3x-px", px.toFixed(3));
            area.style.setProperty("--m3x-py", py.toFixed(3));
        };

        area.addEventListener(
            "pointermove",
            (e) => {
                if (e.pointerType !== "mouse" || animationsOff()) return;
                const r = image.getBoundingClientRect();
                px = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / (r.width / 2)));
                py = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / (r.height / 2)));
                if (!raf) raf = requestAnimationFrame(apply);
            },
            { passive: true },
        );

        area.addEventListener(
            "pointerleave",
            () => {
                px = py = 0;
                if (!raf) raf = requestAnimationFrame(apply);
            },
            { passive: true },
        );
    }

    /* ---------- 5. «Тик» баланса казино ---------- */
    function watchBalance() {
        const el = document.getElementById("casinoBalance");
        if (!el) return;
        let last = el.textContent;
        new MutationObserver(() => {
            const now = el.textContent;
            if (now === last) return;
            last = now;
            if (animationsOff()) return;
            el.classList.remove("m3x-tick");
            void el.offsetWidth;
            el.classList.add("m3x-tick");
        }).observe(el, { childList: true, characterData: true, subtree: true });
        el.addEventListener("animationend", () => el.classList.remove("m3x-tick"));
    }

    /* ---------- Старт ---------- */
    function init() {
        watchTheme();
        setupClickArea();
        watchBalance();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        setTimeout(init, 0);
    }
})();
