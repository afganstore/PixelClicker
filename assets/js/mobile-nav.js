/* Нижняя панель вкладок на мобильных: переключение между окнами одним тапом.
   Логику самих окон не трогает — только закрывает открытое окно
   (через его же кнопку закрытия) перед открытием другого.
   Крестиков на мобильных нет: выйти из окна — вкладка «Кликер». */
(function () {
    const mq = window.matchMedia("(max-width: 768px)");

    const tabs = [
        { btn: "storeBtn", popup: "storePopup", close: "closeStorePopup" },
        { btn: "inventoryBtn", popup: "inventoryPopup", close: "closeInventoryPopup" },
        { btn: "skinsBtn", popup: "skinsPopup", close: "closeSkinsPopup" },
        { btn: "casinoBtn", popup: "casinoPopup", close: "closeCasinoPopup" },
        { btn: "dailyBtn", popup: "dailyPopup", close: "closeDailyPopup" },
        { btn: "settingsBtn", popup: "settingsPopup", close: "closePopup" },
    ];

    function init() {
        const items = tabs
            .map((t) => ({
                btn: document.getElementById(t.btn),
                popup: document.getElementById(t.popup),
                close: document.getElementById(t.close),
            }))
            .filter((t) => t.btn && t.popup);

        const isOpen = (t) =>
            t.popup.classList.contains("active") &&
            !t.popup.classList.contains("popup-closing");

        const clickerBtn = document.getElementById("clickerBtn");

        const sync = () => {
            items.forEach((t) =>
                t.btn.classList.toggle("nav-active", isOpen(t)),
            );
            if (clickerBtn) {
                clickerBtn.classList.toggle(
                    "nav-active",
                    !items.some(isOpen),
                );
            }
        };

        // Порядок вкладок как на панели: Кликер, Магазин, Инвентарь, Скины, Казино, Дроп, Настройки
        const order = ["clickerBtn", ...tabs.map((t) => t.btn)];
        const indexOfBtn = (id) => order.indexOf(id);

        // data-slide остаётся, пока окно открыто (иначе анимация сменилась бы на
        // обычную и «проигралась» второй раз); data-sliding — только на время листания
        const setSlide = (popup, dir) => {
            popup.setAttribute("data-slide", dir);
            popup.setAttribute("data-sliding", "");
            clearTimeout(popup._slideTimer);
            popup._slideTimer = setTimeout(() => {
                popup.removeAttribute("data-sliding");
                if (!popup.classList.contains("active")) {
                    popup.removeAttribute("data-slide");
                }
            }, 520);
        };

        // Подложки на время листания (см. fx.css): не дают просвечивать кликеру
        // в скруглениях нижней панели и между окнами при переходе окно → окно
        const rootEl = document.documentElement;
        let coverTimer = 0;
        const coverNav = (between) => {
            rootEl.classList.add("m3x-nav-open");
            rootEl.classList.toggle("m3x-nav-between", between);
            clearTimeout(coverTimer);
            coverTimer = setTimeout(() => {
                rootEl.classList.remove("m3x-nav-open", "m3x-nav-between");
            }, 520);
        };

        const closeAll = (except, dir) =>
            items.forEach((t) => {
                if (t !== except && isOpen(t) && t.close) {
                    if (dir) setSlide(t.popup, dir);
                    t.close.click();
                }
            });

        items.forEach((t) =>
            new MutationObserver(sync).observe(t.popup, {
                attributes: true,
                attributeFilter: ["class"],
            }),
        );

        document.addEventListener(
            "click",
            (e) => {
                if (!mq.matches) return;
                const btn = e.target.closest(".header-buttons .icon-btn");
                if (!btn) return;

                // «Кликер» — закрыть открытое окно и вернуться на главный экран
                if (btn === clickerBtn) {
                    clearTimeout(coverTimer);
                    rootEl.classList.remove("m3x-nav-open", "m3x-nav-between");
                    closeAll(null, "back");
                    return;
                }

                const tab = items.find((t) => t.btn === btn);
                if (!tab) return;

                // Тап по уже открытой вкладке ничего не делает
                if (isOpen(tab)) {
                    e.stopPropagation();
                    return;
                }

                // Листаем: вправо, если вкладка правее текущей, иначе влево
                const open = items.find(isOpen);
                const from = open ? indexOfBtn(open.btn.id) : 0;
                const dir = indexOfBtn(btn.id) > from ? "fwd" : "back";
                coverNav(!!open);
                setSlide(tab.popup, dir);
                closeAll(tab, dir);
            },
            true,
        );

        sync();
        initNavHeight();
        initSkinFit();
    }

    // Реальная высота нижней панели -> --nav-h, чтобы окно вплотную примыкало к панели
    function initNavHeight() {
        const bar = document.querySelector(".header-buttons");
        if (!bar) return;
        const root = document.documentElement;
        const update = () => {
            if (!mq.matches) {
                root.style.removeProperty("--nav-h");
                return;
            }
            // --nav-h не включает safe-area (она добавляется отдельно):
            // нижний отступ панели = 10px + safe-area
            const padBottom = parseFloat(getComputedStyle(bar).paddingBottom) || 10;
            const h = bar.offsetHeight - (padBottom - 10);
            root.style.setProperty("--nav-h", Math.ceil(h) + "px");
        };
        window.addEventListener("resize", update);
        window.addEventListener("orientationchange", update);
        if (mq.addEventListener) mq.addEventListener("change", update);
        if (document.fonts && document.fonts.ready) {
            document.fonts.ready.then(update);
        }
        // Панель может поменять высоту сама (шрифт, перенос подписи, safe-area) —
        // иначе окна заходят под неё и контент оказывается за панелью
        if (window.ResizeObserver) new ResizeObserver(update).observe(bar);
        update();
    }

    // Размер скина на мобильных: максимум 70vw / 250px, но так, чтобы счётчик,
    // скин и нижняя панель помещались на экране любой высоты
    function initSkinFit() {
        const img = document.getElementById("clickImage");
        const counter = document.getElementById("counter");
        const bar = document.querySelector(".header-buttons");
        if (!img || !counter || !bar) return;
        const root = document.documentElement;

        const fit = () => {
            if (!mq.matches) {
                root.style.removeProperty("--skin-w");
                return;
            }
            const nw = img.naturalWidth;
            const nh = img.naturalHeight;
            const ratio = nw && nh ? nh / nw : 1;
            const maxW = Math.min(window.innerWidth * 0.7, 250);
            // 16 — верхний отступ, 24 — промежуток, 16 — запас снизу
            const availH =
                window.innerHeight -
                bar.offsetHeight -
                counter.offsetHeight -
                16 -
                24 -
                16;
            const w = Math.max(80, Math.min(maxW, availH / ratio));
            root.style.setProperty("--skin-w", Math.floor(w) + "px");
        };

        img.addEventListener("load", fit);
        window.addEventListener("resize", fit);
        window.addEventListener("orientationchange", fit);
        if (mq.addEventListener) mq.addEventListener("change", fit);
        new MutationObserver(fit).observe(counter, {
            childList: true,
            characterData: true,
            subtree: true,
        });
        fit();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
