/* ==========================================================================
   Анимация смены акцентного цвета (волна от места клика)
   и плавная смена темы (круговое раскрытие от места клика).
   Следит за --accent-color на <html>: любой способ смены (пресеты в настройках,
   цветовой диалог, первоначальная настройка) даёт одинаковую анимацию.
   Волна запускается только после действия пользователя, поэтому при
   загрузке страницы (когда сохранённый цвет применяется впервые) её нет.
   ========================================================================== */
(function () {
    "use strict";

    const root = document.documentElement;
    const RECENT_MS = 1500;

    let lastColor = root.style.getPropertyValue("--accent-color").trim();
    let origin = null; // {x, y, t}

    function rememberOrigin(e) {
        const t = e.target && e.target.closest ? e.target : null;
        let x = e.clientX;
        let y = e.clientY;
        // клавиатурный «клик» приходит с координатами 0,0 — берём центр элемента
        if (t && (!x && !y)) {
            const r = t.getBoundingClientRect();
            x = r.left + r.width / 2;
            y = r.top + r.height / 2;
        }
        origin = { x: x, y: y, t: Date.now() };
    }

    document.addEventListener("pointerdown", rememberOrigin, true);
    document.addEventListener("click", rememberOrigin, true);

    function animationsOff() {
        return (
            document.body.classList.contains("no-animations") ||
            (window.matchMedia &&
                window.matchMedia("(prefers-reduced-motion: reduce)").matches)
        );
    }

    function wave(color) {
        if (animationsOff() || !origin || Date.now() - origin.t > RECENT_MS) {
            return;
        }

        const w = window.innerWidth;
        const h = window.innerHeight;
        const x = Math.min(Math.max(origin.x, 0), w);
        const y = Math.min(Math.max(origin.y, 0), h);
        // радиус до самого дальнего угла экрана
        const far = Math.max(
            Math.hypot(x, y),
            Math.hypot(w - x, y),
            Math.hypot(x, h - y),
            Math.hypot(w - x, h - y),
        );

        const node = document.createElement("div");
        node.className = "accent-wave";
        node.style.left = x + "px";
        node.style.top = y + "px";
        node.style.width = node.style.height = far * 2 + "px";
        node.style.background =
            "radial-gradient(circle, " +
            "color-mix(in oklab, " + color + " 55%, transparent) 0%, " +
            "color-mix(in oklab, " + color + " 38%, transparent) 55%, " +
            "color-mix(in oklab, " + color + " 0%, transparent) 72%)";
        document.body.appendChild(node);

        const done = () => node.remove();
        if (node.animate) {
            const anim = node.animate(
                [
                    { transform: "translate(-50%, -50%) scale(0)", opacity: 1 },
                    {
                        transform: "translate(-50%, -50%) scale(0.7)",
                        opacity: 0.85,
                        offset: 0.55,
                    },
                    { transform: "translate(-50%, -50%) scale(1)", opacity: 0 },
                ],
                { duration: 850, easing: "cubic-bezier(0.2, 0, 0, 1)" },
            );
            anim.onfinish = done;
            anim.oncancel = done;
        } else {
            setTimeout(done, 850);
        }
    }

    function pulseSwatch(color) {
        document.querySelectorAll(".accent-preset").forEach((p) => {
            if (p.dataset.color === color) {
                p.classList.remove("accent-just-picked");
                void p.offsetWidth; // перезапуск анимации
                p.classList.add("accent-just-picked");
                setTimeout(() => p.classList.remove("accent-just-picked"), 800);
            }
        });
    }

    /* ---------- Плавная смена темы ----------
       settings.js ставит data-theme через root.setAttribute — оборачиваем
       этот вызов в View Transition и раскрываем новую тему кругом от места
       клика. Если API нет / анимации выключены / смена не от пользователя —
       всё работает как раньше. */
    const origSetAttribute = root.setAttribute;
    root.setAttribute = function (name, value) {
        const canAnimate =
            name === "data-theme" &&
            typeof document.startViewTransition === "function" &&
            root.getAttribute("data-theme") !== String(value) &&
            !animationsOff() &&
            origin &&
            Date.now() - origin.t <= RECENT_MS;

        if (!canAnimate) {
            return origSetAttribute.call(this, name, value);
        }

        const self = this;
        const x = origin.x;
        const y = origin.y;
        const far = Math.max(
            Math.hypot(x, y),
            Math.hypot(window.innerWidth - x, y),
            Math.hypot(x, window.innerHeight - y),
            Math.hypot(window.innerWidth - x, window.innerHeight - y),
        );

        let transition;
        try {
            transition = document.startViewTransition(() => {
                origSetAttribute.call(self, name, value);
            });
        } catch (e) {
            return origSetAttribute.call(this, name, value);
        }

        transition.ready
            .then(() => {
                // motion.js мог запустить свой переход цветов — под снимком он не нужен
                root.classList.remove("m3x-theme-switch");
                root.animate(
                    {
                        clipPath: [
                            "circle(0px at " + x + "px " + y + "px)",
                            "circle(" + far + "px at " + x + "px " + y + "px)",
                        ],
                    },
                    {
                        duration: 750,
                        easing: "cubic-bezier(0.4, 0, 0.2, 1)",
                        pseudoElement: "::view-transition-new(root)",
                    },
                );
            })
            .catch(() => {});
    };

    new MutationObserver(() => {
        const color = root.style.getPropertyValue("--accent-color").trim();
        if (!color || color === lastColor) return;
        lastColor = color;
        wave(color);
        pulseSwatch(color);
    }).observe(root, { attributes: true, attributeFilter: ["style"] });
})();
