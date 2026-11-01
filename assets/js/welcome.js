/* ==========================================================================
   Приветственный экран.
   Порядок: 5 слайдов → настройка → финал. Показывается один раз
   (localStorage.welcomeDone). Повторно открыть: window.showWelcome().

   Настройки применяются через уже существующие элементы страницы
   (переключатели и пресеты акцентного цвета из окна «Настройки»), поэтому
   вся логика сохранения остаётся в settings.js. Если элемента нет —
   значение пишется в localStorage напрямую.
   ========================================================================== */
(function () {
    "use strict";

    const STORAGE_KEY = "welcomeDone";

    const SLIDES = [
        {
            img: "assets/images/p6.png",
            title: "Жми на Pixel 6",
            text: "Каждый тап — это клик. Чем больше кликаешь, тем больше копится на счётчике.",
        },
        {
            icon: "storefront",
            title: "Магазин скинов",
            text: "Трать клики на новые скины для телефона и переодевай его когда захочешь.",
        },
        {
            icon: "casino",
            title: "Казино и кейсы",
            text: "Рискни кликами в слотах или открой кейс — вдруг выпадет что-то редкое.",
        },
        {
            icon: "inventory_2",
            title: "Инвентарь",
            text: "Всё, что выбил из кейсов, лежит в инвентаре. Смотри свою коллекцию в любой момент.",
        },
        {
            icon: "tune",
            title: "Настройки и моды",
            text: "Меняй цвета, фон, звуки клика и подключай моды из Мододельни.",
        },
    ];

    const COLORS = [
        { name: "Фиолетовый", value: "#6750a4" },
        { name: "Синий", value: "#2196f3" },
        { name: "Зеленый", value: "#4caf50" },
        { name: "Оранжевый", value: "#ff9800" },
        { name: "Розовый", value: "#e91e63" },
        { name: "Бирюзовый", value: "#00bcd4" },
        { name: "Красный", value: "#f44336" },
        { name: "Золотой", value: "#ffd700" },
    ];

    // Тумблеры настройки: id переключателя в «Настройках», ключ в localStorage
    const TOGGLES = [
        {
            id: "soundToggle",
            key: "soundEnabled",
            icon: "volume_up",
            title: "Звук клика",
            hint: "Звук при каждом нажатии",
        },
        {
            id: "animationsToggle",
            key: "animationsEnabled",
            icon: "animation",
            title: "Анимации",
            hint: "Выключи, если телефон тормозит",
        },
        {
            id: "gradientToggle",
            key: "gradientEnabled",
            icon: "gradient",
            title: "Живой фон",
            hint: "Переливающийся градиент",
        },
    ];

    let root = null;
    let current = 0;
    let maxReached = 0; // дальше этого шага перепрыгнуть нельзя — пропустить приветствие нельзя
    let keyHandler = null;

    const TOTAL = SLIDES.length + 2; // слайды + настройка + финал
    const SETUP_INDEX = SLIDES.length;
    const DONE_INDEX = SLIDES.length + 1;

    function safeGet(key) {
        try {
            return localStorage.getItem(key);
        } catch (e) {
            return null;
        }
    }

    function safeSet(key, value) {
        try {
            localStorage.setItem(key, value);
        } catch (e) {
            /* хранилище недоступно — не страшно */
        }
    }

    function el(tag, className, html) {
        const node = document.createElement(tag);
        if (className) node.className = className;
        if (html != null) node.innerHTML = html;
        return node;
    }

    /* ---------- Применение настроек ---------- */

    function applyTheme(isDark) {
        const toggle = document.getElementById("darkThemeToggle");
        if (toggle) {
            toggle.checked = isDark;
            toggle.dispatchEvent(new Event("change", { bubbles: true }));
        } else {
            document.documentElement.setAttribute(
                "data-theme",
                isDark ? "dark" : "light",
            );
            safeSet("darkTheme", String(isDark));
        }
    }

    function applyAccent(color) {
        const preset = Array.from(
            document.querySelectorAll("#accentPresets .accent-preset"),
        ).find((p) => p.dataset.color === color.value);
        if (preset) {
            preset.click();
        } else {
            safeSet("accentColor", color.value);
            safeSet("accentColorName", color.name);
            document.documentElement.style.setProperty(
                "--accent-color",
                color.value,
            );
        }
    }

    function applyToggle(def, value) {
        const toggle = document.getElementById(def.id);
        if (toggle) {
            toggle.checked = value;
            toggle.dispatchEvent(new Event("change", { bubbles: true }));
        } else {
            safeSet(def.key, String(value));
            if (def.key === "animationsEnabled") {
                document.body.classList.toggle("no-animations", !value);
            }
        }
    }

    function readToggle(def) {
        return safeGet(def.key) !== "false";
    }

    function readDark() {
        return safeGet("darkTheme") === "true";
    }

    function readAccent() {
        return (safeGet("accentColor") || "#6750a4").toLowerCase();
    }

    /* ---------- Построение шагов ---------- */

    function buildSlide(slide, index) {
        const step = el("section", "welcome-step");
        step.setAttribute("aria-label", `Слайд ${index + 1} из ${SLIDES.length}`);

        const art = el("div", "welcome-art");
        if (slide.img) {
            const img = document.createElement("img");
            img.src = slide.img;
            img.alt = "";
            img.draggable = false;
            art.appendChild(img);
        } else {
            art.appendChild(
                el("span", "material-symbols-rounded", slide.icon),
            );
        }

        const h = el("h2");
        h.textContent = slide.title;
        const p = el("p");
        p.textContent = slide.text;

        step.append(art, h, p);
        return step;
    }

    function buildSetup() {
        const step = el("section", "welcome-step is-setup");
        step.setAttribute("aria-label", "Настройка");

        const h = el("h2");
        h.textContent = "Настрой под себя";
        const p = el("p");
        p.textContent = "Всё это можно поменять потом в настройках.";
        step.append(h, p);

        const box = el("div", "welcome-setup");

        // Тема
        const themeWrap = el("div");
        themeWrap.appendChild(
            el("span", "welcome-field-label", "Тема"),
        );
        const seg = el("div", "welcome-seg");
        const lightBtn = el(
            "button",
            "",
            '<span class="material-symbols-rounded">light_mode</span>Светлая',
        );
        const darkBtn = el(
            "button",
            "",
            '<span class="material-symbols-rounded">dark_mode</span>Тёмная',
        );
        lightBtn.type = darkBtn.type = "button";
        const syncTheme = () => {
            const dark = readDark();
            darkBtn.classList.toggle("is-on", dark);
            lightBtn.classList.toggle("is-on", !dark);
        };
        lightBtn.addEventListener("click", () => {
            applyTheme(false);
            syncTheme();
        });
        darkBtn.addEventListener("click", () => {
            applyTheme(true);
            syncTheme();
        });
        syncTheme();
        seg.append(lightBtn, darkBtn);
        themeWrap.appendChild(seg);
        box.appendChild(themeWrap);

        // Акцентный цвет
        const colorWrap = el("div");
        colorWrap.appendChild(
            el("span", "welcome-field-label", "Акцентный цвет"),
        );
        const colors = el("div", "welcome-colors");
        const swatches = COLORS.map((c) => {
            const b = el("button", "welcome-color");
            b.type = "button";
            b.style.background = c.value;
            b.title = c.name;
            b.setAttribute("aria-label", c.name);
            b.addEventListener("click", () => {
                applyAccent(c);
                syncColors();
            });
            colors.appendChild(b);
            return { b, c };
        });
        const syncColors = () => {
            const cur = readAccent();
            swatches.forEach(({ b, c }) =>
                b.classList.toggle("is-on", c.value === cur),
            );
        };
        syncColors();
        colorWrap.appendChild(colors);
        box.appendChild(colorWrap);

        // Тумблеры — настоящие .switch / .slider, как в окне «Настройки»
        const rows = el("div", "welcome-rows");
        TOGGLES.forEach((def) => {
            const row = el("div", "welcome-row");
            row.innerHTML =
                `<span class="material-symbols-rounded">${def.icon}</span>` +
                `<span class="welcome-row-text">${def.title}<small>${def.hint}</small></span>` +
                `<label class="switch"><input type="checkbox"><span class="slider"></span></label>`;
            const input = row.querySelector("input");
            const sync = () => {
                const on = readToggle(def);
                input.checked = on;
                row.classList.toggle("is-on", on);
            };
            input.addEventListener("change", () => {
                applyToggle(def, input.checked);
                sync();
            });
            // клик по остальной части строки тоже переключает
            row.addEventListener("click", (e) => {
                if (e.target.closest(".switch")) return;
                input.click();
            });
            sync();
            rows.appendChild(row);
        });
        box.appendChild(rows);

        step.appendChild(box);
        return step;
    }

    function buildDone() {
        const step = el("section", "welcome-step");
        step.setAttribute("aria-label", "Готово");

        const art = el("div", "welcome-art welcome-done-art");
        art.appendChild(el("span", "material-symbols-rounded", "check_circle"));
        const h = el("h2");
        h.textContent = "Всё готово!";
        const p = el("p");
        p.textContent =
            "Pixel 6 ждёт твоих кликов. Приятной игры и побольше редких скинов!";
        step.append(art, h, p);
        return step;
    }

    /* ---------- Навигация ---------- */

    function go(index) {
        // вперёд можно идти только по одному шагу (кнопка «Далее», стрелка, свайп)
        current = Math.max(0, Math.min(TOTAL - 1, maxReached + 1, index));
        if (current > maxReached) maxReached = current;
        const track = root.querySelector(".welcome-track");
        track.style.transform = `translateX(${-current * 100}%)`;

        root.querySelectorAll(".welcome-step").forEach((s, i) => {
            s.classList.toggle("is-active", i === current);
            if (i === current) s.removeAttribute("aria-hidden");
            else s.setAttribute("aria-hidden", "true");
        });
        root.querySelectorAll(".welcome-dot").forEach((d, i) =>
            d.classList.toggle("is-active", i === current),
        );

        const back = root.querySelector(".welcome-back");
        const next = root.querySelector(".welcome-next");

        back.hidden = current === 0 || current === DONE_INDEX;

        let label = "Далее";
        let icon = "arrow_forward";
        if (current === SETUP_INDEX) {
            label = "Готово";
            icon = "check";
        } else if (current === DONE_INDEX) {
            label = "Играть";
            icon = "sports_esports";
        }
        next.innerHTML = `${label}<span class="material-symbols-rounded">${icon}</span>`;
    }

    function next() {
        if (current === DONE_INDEX) {
            finish();
        } else {
            go(current + 1);
        }
    }

    function finish() {
        safeSet(STORAGE_KEY, "1");
        if (!root) return;
        const node = root;
        root = null;
        if (keyHandler) {
            document.removeEventListener("keydown", keyHandler, true);
            keyHandler = null;
        }
        // круг закрытия сужается к кнопке «Начать играть»
        const btn = node.querySelector(".welcome-next");
        if (btn) {
            const r = btn.getBoundingClientRect();
            node.style.setProperty("--wl-x", r.left + r.width / 2 + "px");
            node.style.setProperty("--wl-y", r.top + r.height / 2 + "px");
        }
        node.classList.add("is-closing");
        document.body.classList.remove("welcome-lock");
        setTimeout(() => node.remove(), 900);
    }

    function show() {
        if (root) return;

        root = el("div", "welcome");
        root.id = "welcome";
        root.setAttribute("role", "dialog");
        root.setAttribute("aria-modal", "true");
        root.setAttribute("aria-label", "Добро пожаловать в Pixel Clicker!");

        const card = el("div", "welcome-card");

        // Верх
        const top = el("div", "welcome-top");
        const title = el("h1", "welcome-title");
        title.innerHTML =
            "Добро пожаловать в <span>Pixel&nbsp;Clicker</span>!";
        top.append(title);

        // Шаги
        const viewport = el("div", "welcome-viewport");
        const track = el("div", "welcome-track");
        SLIDES.forEach((s, i) => track.appendChild(buildSlide(s, i)));
        track.appendChild(buildSetup());
        track.appendChild(buildDone());
        viewport.appendChild(track);

        // Низ
        const bottom = el("div", "welcome-bottom");
        const dots = el("div", "welcome-dots");
        for (let i = 0; i < TOTAL; i++) {
            const d = el("button", "welcome-dot");
            d.type = "button";
            d.setAttribute("aria-label", `Шаг ${i + 1}`);
            d.addEventListener("click", () => {
                if (i <= maxReached) go(i); // вперёд по точкам нельзя
            });
            dots.appendChild(d);
        }
        const nav = el("div", "welcome-nav");
        const back = el(
            "button",
            "welcome-btn is-tonal welcome-back",
            '<span class="material-symbols-rounded">arrow_back</span>Назад',
        );
        const nextBtn = el("button", "welcome-btn is-primary welcome-next");
        back.type = nextBtn.type = "button";
        back.addEventListener("click", () => go(current - 1));
        nextBtn.addEventListener("click", next);
        nav.append(back, nextBtn);
        bottom.append(dots, nav);

        card.append(top, viewport, bottom);
        root.appendChild(card);

        // Свайп
        let startX = null;
        let startY = null;
        viewport.addEventListener(
            "touchstart",
            (e) => {
                startX = e.touches[0].clientX;
                startY = e.touches[0].clientY;
            },
            { passive: true },
        );
        viewport.addEventListener(
            "touchend",
            (e) => {
                if (startX == null) return;
                const dx = e.changedTouches[0].clientX - startX;
                const dy = e.changedTouches[0].clientY - startY;
                startX = startY = null;
                if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy)) return;
                if (dx < 0 && current < DONE_INDEX) go(current + 1);
                else if (dx > 0 && current > 0 && current < DONE_INDEX)
                    go(current - 1);
            },
            { passive: true },
        );

        // Клавиатура
        keyHandler = (e) => {
            if (e.key === "ArrowRight") {
                if (current < DONE_INDEX) go(current + 1);
            } else if (e.key === "ArrowLeft") {
                if (current > 0 && current < DONE_INDEX) go(current - 1);
            } else if (e.key === "Enter" && !e.target.closest("[role=switch]")) {
                if (e.target.closest("button")) return;
                next();
            }
        };
        document.addEventListener("keydown", keyHandler, true);

        document.body.appendChild(root);
        document.body.classList.add("welcome-lock");
        go(0);
        requestAnimationFrame(() =>
            requestAnimationFrame(() => root && root.classList.add("is-open")),
        );
        nextBtn.focus({ preventScroll: true });
    }

    window.showWelcome = function () {
        current = 0;
        maxReached = 0;
        show();
    };

    document.addEventListener("DOMContentLoaded", () => {
        if (safeGet(STORAGE_KEY) !== "1") show();
    });
})();
