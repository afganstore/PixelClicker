/* ==========================================================================
   Собственные диалоги вместо системных alert / confirm / prompt.

   appDialog.alert("текст", { title, icon, okText })        -> Promise<void>
   appDialog.confirm("текст", { title, icon, okText,
                                cancelText, danger })       -> Promise<boolean>
   appDialog.prompt("текст", { title, icon, okText, cancelText,
                               value, placeholder })        -> Promise<string|null>

   window.alert заменён на appDialog.alert (он не блокирующий, поведение
   вызывающего кода не меняется). window.confirm / window.prompt намеренно
   НЕ подменяются: они синхронные, а новые диалоги — асинхронные.
   Стили — в m3e.css (блок «Диалоги»), окно использует те же классы,
   что и окно подтверждения кода (confirmation-*).
   ========================================================================== */
(function () {
    "use strict";

    const queue = [];
    let current = null;
    let closing = false; // идёт анимация закрытия — следующий диалог ждёт
    let root = null;

    function ensureRoot() {
        if (root) return root;
        root = document.createElement("div");
        root.className = "confirmation-modal app-dialog";
        root.id = "appDialog";
        root.setAttribute("role", "dialog");
        root.setAttribute("aria-modal", "true");
        root.innerHTML = `
            <div class="confirmation-content app-dialog-content">
                <div class="confirmation-header">
                    <div class="confirmation-icon"><span class="material-symbols-rounded app-dialog-icon">warning</span></div>
                    <h3 class="confirmation-title app-dialog-title"></h3>
                </div>
                <p class="confirmation-message app-dialog-message"></p>
                <input class="app-dialog-input" type="text" autocomplete="off" />
                <div class="confirmation-actions">
                    <button type="button" class="confirm-btn confirm-no app-dialog-cancel"></button>
                    <button type="button" class="confirm-btn confirm-yes app-dialog-ok"></button>
                </div>
            </div>
        `;
        document.body.appendChild(root);

        root.addEventListener("click", (e) => {
            // клик по подложке = отмена (для alert — «ОК»)
            if (e.target === root && current) current.finish(current.kind === "alert" ? true : null);
        });
        root.querySelector(".app-dialog-ok").addEventListener("click", () => {
            if (!current) return;
            current.finish(current.kind === "prompt" ? root.querySelector(".app-dialog-input").value : true);
        });
        root.querySelector(".app-dialog-cancel").addEventListener("click", () => {
            if (current) current.finish(current.kind === "prompt" ? null : false);
        });

        document.addEventListener(
            "keydown",
            (e) => {
                if (!current) return;
                if (e.key === "Escape") {
                    e.preventDefault();
                    e.stopPropagation();
                    current.finish(current.kind === "alert" ? true : current.kind === "prompt" ? null : false);
                } else if (e.key === "Enter" && e.target.tagName !== "BUTTON") {
                    e.preventDefault();
                    root.querySelector(".app-dialog-ok").click();
                }
            },
            true,
        );

        return root;
    }

    function showNext() {
        if (current || closing || !queue.length) return;
        const job = queue.shift();
        const el = ensureRoot();

        const defaults = {
            alert: { title: "Сообщение", icon: "info", ok: "ОК" },
            confirm: { title: "Подтверждение", icon: "help", ok: "Да", cancel: "Отмена" },
            prompt: { title: "Введите значение", icon: "edit", ok: "ОК", cancel: "Отмена" },
        }[job.kind];
        const o = job.options;

        el.querySelector(".app-dialog-icon").textContent = o.icon || (o.danger ? "warning" : defaults.icon);
        el.querySelector(".app-dialog-title").textContent = o.title || defaults.title;
        el.querySelector(".app-dialog-message").textContent = String(job.message == null ? "" : job.message);
        el.querySelector(".app-dialog-ok").textContent = o.okText || defaults.ok;

        const cancel = el.querySelector(".app-dialog-cancel");
        cancel.textContent = o.cancelText || defaults.cancel || "";
        cancel.style.display = job.kind === "alert" ? "none" : "";

        const input = el.querySelector(".app-dialog-input");
        input.style.display = job.kind === "prompt" ? "" : "none";
        input.value = job.kind === "prompt" && o.value != null ? o.value : "";
        input.placeholder = o.placeholder || "";

        el.classList.toggle("danger", !!o.danger);
        el.classList.remove("closing");

        const previousFocus = document.activeElement;

        current = {
            kind: job.kind,
            finish(result) {
                if (!current) return;
                current = null;
                closing = true;
                el.classList.add("closing");
                setTimeout(() => {
                    el.classList.remove("active", "closing");
                    if (previousFocus && previousFocus.focus) {
                        try {
                            previousFocus.focus({ preventScroll: true });
                        } catch (_) {}
                    }
                    closing = false;
                    job.resolve(result);
                    showNext();
                }, 220);
            },
        };

        el.classList.add("active");
        setTimeout(() => {
            if (job.kind === "prompt") {
                input.focus();
                input.select();
            } else {
                el.querySelector(".app-dialog-ok").focus({ preventScroll: true });
            }
        }, 30);
    }

    function open(kind, message, options) {
        return new Promise((resolve) => {
            queue.push({ kind, message, options: options || {}, resolve });
            if (document.body) showNext();
            else document.addEventListener("DOMContentLoaded", showNext, { once: true });
        });
    }

    window.appDialog = {
        alert: (message, options) => open("alert", message, options).then(() => undefined),
        confirm: (message, options) => open("confirm", message, options),
        prompt: (message, options) => open("prompt", message, options),
    };

    // Системный alert -> свой (не блокирует выполнение, возвращает undefined, как и родной)
    window.alert = function (message) {
        window.appDialog.alert(message);
    };
})();
