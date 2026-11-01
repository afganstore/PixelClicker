/* Кастомное выпадающее меню вместо нативного <select> */
(function () {
  "use strict";

  const SELECTOR = "select.background-select, select.sound-select";
  const valueDesc = Object.getOwnPropertyDescriptor(
    HTMLSelectElement.prototype,
    "value",
  );
  let openInstance = null;

  function enhance(select) {
    if (select.dataset.mdSelect) return;
    select.dataset.mdSelect = "1";

    const wrap = document.createElement("div");
    wrap.className = "md-select";
    select.parentNode.insertBefore(wrap, select);
    wrap.appendChild(select);

    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = "md-select-trigger";
    trigger.setAttribute("aria-haspopup", "listbox");
    trigger.innerHTML =
      '<span class="md-select-label"></span><span class="md-select-arrow"></span>';
    wrap.appendChild(trigger);
    const label = trigger.querySelector(".md-select-label");

    const list = document.createElement("ul");
    list.className = "md-select-list";
    list.setAttribute("role", "listbox");
    document.body.appendChild(list);

    let focusedIndex = -1;

    function opts() {
      return Array.from(select.options);
    }

    function render() {
      const o = opts();
      list.innerHTML = "";
      o.forEach((opt, i) => {
        const li = document.createElement("li");
        li.className = "md-select-option";
        li.setAttribute("role", "option");
        li.textContent = opt.textContent.trim();
        if (i === select.selectedIndex) li.classList.add("selected");
        li.addEventListener("mousedown", (e) => e.preventDefault());
        li.addEventListener("click", () => choose(i));
        list.appendChild(li);
      });
      const cur = o[select.selectedIndex];
      label.textContent = cur ? cur.textContent.trim() : "";
    }

    function choose(i) {
      if (select.selectedIndex !== i) {
        select.selectedIndex = i;
        select.dispatchEvent(new Event("change", { bubbles: true }));
      }
      render();
      close();
      trigger.focus();
    }

    function setFocused(i) {
      const items = list.children;
      if (!items.length) return;
      focusedIndex = (i + items.length) % items.length;
      Array.from(items).forEach((el, k) =>
        el.classList.toggle("focused", k === focusedIndex),
      );
      items[focusedIndex].scrollIntoView({ block: "nearest" });
    }

    function position() {
      const r = trigger.getBoundingClientRect();
      const below = window.innerHeight - r.bottom - 12;
      const above = r.top - 12;
      const maxH = 280;
      const openUp = below < 160 && above > below;
      list.style.left = r.left + "px";
      list.style.width = r.width + "px";
      list.style.maxHeight = Math.min(maxH, openUp ? above : below) + "px";
      if (openUp) {
        list.style.top = "auto";
        list.style.bottom = window.innerHeight - r.top + 4 + "px";
        list.style.transformOrigin = "bottom center";
      } else {
        list.style.bottom = "auto";
        list.style.top = r.bottom + 4 + "px";
        list.style.transformOrigin = "top center";
      }
    }

    function open() {
      if (openInstance && openInstance !== api) openInstance.close();
      render();
      position();
      void list.offsetWidth; // фиксируем начальное состояние, чтобы анимация шла с первого раза
      wrap.classList.add("open");
      list.classList.add("open");
      trigger.setAttribute("aria-expanded", "true");
      openInstance = api;
      setFocused(Math.max(select.selectedIndex, 0));
    }

    function close() {
      wrap.classList.remove("open");
      list.classList.remove("open");
      trigger.setAttribute("aria-expanded", "false");
      if (openInstance === api) openInstance = null;
    }

    const api = { close, list, trigger };

    trigger.addEventListener("click", () => {
      wrap.classList.contains("open") ? close() : open();
    });

    trigger.addEventListener("keydown", (e) => {
      const isOpen = wrap.classList.contains("open");
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        if (!isOpen) open();
        else setFocused(focusedIndex + (e.key === "ArrowDown" ? 1 : -1));
      } else if ((e.key === "Enter" || e.key === " ") && isOpen) {
        e.preventDefault();
        choose(focusedIndex);
      } else if (e.key === "Escape" && isOpen) {
        e.preventDefault();
        e.stopPropagation();
        close();
      }
    });

    // Синхронизация: список опций меняется из settings.js и value ставится из кода
    new MutationObserver(render).observe(select, {
      childList: true,
      subtree: true,
      characterData: true,
    });
    Object.defineProperty(select, "value", {
      configurable: true,
      get() {
        return valueDesc.get.call(this);
      },
      set(v) {
        valueDesc.set.call(this, v);
        render();
      },
    });
    select.addEventListener("change", render);

    render();
  }

  function scan() {
    document.querySelectorAll(SELECTOR).forEach(enhance);
  }

  document.addEventListener("mousedown", (e) => {
    if (
      openInstance &&
      !openInstance.list.contains(e.target) &&
      !openInstance.trigger.contains(e.target)
    )
      openInstance.close();
  });
  window.addEventListener("resize", () => openInstance && openInstance.close());
  document.addEventListener(
    "scroll",
    (e) => {
      if (openInstance && !openInstance.list.contains(e.target))
        openInstance.close();
    },
    true,
  );

  function start() {
    scan();
    // селекты, которые settings.js создаёт позже
    new MutationObserver(scan).observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", start);
  else start();
})();
