/* Загрузка файла мода + полноценный редактор кода мода */
(function () {
  "use strict";

  function init() {
    const field = document.getElementById("customModCode");
    const uploadBtn = document.getElementById("uploadMod");
    const fileInput = document.getElementById("modFileInput");
    if (!field) return;

    /* ---------- общий способ записать код в поле ---------- */
    function setCode(code) {
      field.value = code;
      field.dispatchEvent(new Event("input", { bubbles: true }));
    }

    /* ---------- загрузка файла ---------- */
    if (uploadBtn && fileInput) {
      uploadBtn.addEventListener("click", () => fileInput.click());
      fileInput.addEventListener("change", () => {
        const file = fileInput.files && fileInput.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
          setCode(String(reader.result || ""));
          const status = document.getElementById("modStatus");
          if (status) {
            status.textContent = "Файл загружен: " + file.name;
            status.className = "mod-status info";
            status.style.display = "block";
            setTimeout(() => (status.style.display = "none"), 3000);
          }
        };
        reader.readAsText(file);
        fileInput.value = ""; // чтобы можно было выбрать тот же файл ещё раз
      });
    }

    /* ---------- окно редактора ---------- */
    field.readOnly = true;
    field.classList.add("code-editor-readonly");

    const overlay = document.createElement("div");
    overlay.className = "mod-editor-overlay";
    overlay.innerHTML =
      '<div class="mod-editor-window" role="dialog" aria-modal="true">' +
      '<div class="mod-editor-header">' +
      '<h3 class="mod-editor-title"><span class="material-symbols-rounded">code</span> Редактор мода</h3>' +
      '<span class="mod-editor-info"></span>' +
      '<button type="button" class="mod-editor-done" title="Закрыть" aria-label="Закрыть"><span class="material-symbols-rounded">close</span></button>' +
      "</div>" +
      '<div class="mod-editor-body">' +
      '<div class="mod-editor-gutter"></div>' +
      '<textarea class="mod-editor-text" spellcheck="false" autocapitalize="off" autocomplete="off" autocorrect="off" wrap="off"></textarea>' +
      "</div></div>";
    document.body.appendChild(overlay);

    const gutter = overlay.querySelector(".mod-editor-gutter");
    const text = overlay.querySelector(".mod-editor-text");
    const info = overlay.querySelector(".mod-editor-info");
    const doneBtn = overlay.querySelector(".mod-editor-done");

    function updateGutter() {
      const lines = text.value.split("\n").length;
      let out = "";
      for (let i = 1; i <= lines; i++) out += i + (i < lines ? "\n" : "");
      gutter.textContent = out;
      gutter.scrollTop = text.scrollTop;
      info.textContent = lines + " стр. · " + text.value.length + " симв.";
    }

    function open() {
      text.value = field.value;
      updateGutter();
      void overlay.offsetWidth; // фиксируем начальное состояние, чтобы анимация шла с первого раза
      void overlay.querySelector(".mod-editor-window").offsetWidth;
      overlay.classList.add("active");
      document.body.style.overflow = "hidden";
      // На мобильных клавиатура не должна выскакивать посреди выезда окна снизу
      const focusText = () => {
        text.focus({ preventScroll: true });
        text.setSelectionRange(0, 0);
      };
      if (window.matchMedia("(max-width: 768px)").matches) {
        setTimeout(() => {
          if (overlay.classList.contains("active")) focusText();
        }, 420);
      } else {
        focusText();
      }
      text.scrollTop = 0;
    }

    function close() {
      setCode(text.value);
      overlay.classList.remove("active");
      document.body.style.overflow = "";
    }

    field.addEventListener("click", open);
    field.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        open();
      }
    });
    doneBtn.addEventListener("click", close);
    overlay.addEventListener("mousedown", (e) => {
      if (e.target === overlay) close();
    });

    text.addEventListener("input", updateGutter);
    text.addEventListener("scroll", () => {
      gutter.scrollTop = text.scrollTop;
    });

    text.addEventListener("keydown", (e) => {
      if (e.key === "Tab") {
        e.preventDefault();
        const s = text.selectionStart;
        const en = text.selectionEnd;
        text.value = text.value.slice(0, s) + "  " + text.value.slice(en);
        text.selectionStart = text.selectionEnd = s + 2;
        updateGutter();
      }
    });

    // Esc закрывает редактор (раньше остальных обработчиков, чтобы не закрылись настройки)
    document.addEventListener(
      "keydown",
      (e) => {
        if (e.key === "Escape" && overlay.classList.contains("active")) {
          e.preventDefault();
          e.stopPropagation();
          close();
        }
      },
      true,
    );
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
