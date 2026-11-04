class InventoryManager {
  constructor() {
    this.popup = document.getElementById("inventoryPopup");
    this.openBtn = document.getElementById("inventoryBtn");
    this.closeBtn = document.getElementById("closeInventoryPopup");
    this.grid = document.getElementById("inventoryGrid");

    this.isClosing = false;
    this.menu = null; // контекстное меню
    this.longPressTimer = null;
    this.suppressClick = false;

    if (!this.popup || !this.openBtn) return;
    this.setupEventListeners();
  }

  setupEventListeners() {
    this.openBtn.addEventListener("click", () => this.open());
    this.closeBtn.addEventListener("click", () => this.close());

    this.popup.addEventListener("click", (e) => {
      if (e.target === this.popup) this.close();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;
      if (this.menu) {
        this.hideMenu();
        return;
      }
      if (this.popup.classList.contains("active") && !this.isClosing) {
        this.close();
      }
    });

    // Любой клик вне меню закрывает меню
    document.addEventListener("mousedown", (e) => {
      if (this.menu && !this.menu.contains(e.target)) this.hideMenu();
    });
    document.addEventListener("touchstart", (e) => {
      if (this.menu && !this.menu.contains(e.target)) this.hideMenu();
    });
    this.popup.addEventListener(
      "scroll",
      () => this.hideMenu(),
      true,
    );

    // ПКМ по предмету
    this.grid.addEventListener("contextmenu", (e) => {
      const card = e.target.closest(".inventory-item");
      if (!card) return;
      e.preventDefault();
      this.showMenu(card, e.clientX, e.clientY);
    });

    // Долгое нажатие на телефоне
    this.grid.addEventListener(
      "touchstart",
      (e) => {
        const card = e.target.closest(".inventory-item");
        if (!card) return;
        const t = e.touches[0];
        this.clearLongPress();
        this.longPressTimer = setTimeout(() => {
          this.suppressClick = true;
          this.showMenu(card, t.clientX, t.clientY);
        }, 550);
      },
      { passive: true },
    );
    ["touchend", "touchmove", "touchcancel"].forEach((ev) => {
      this.grid.addEventListener(ev, () => this.clearLongPress(), {
        passive: true,
      });
    });

    // Клик по кейсу - открыть
    this.grid.addEventListener("click", (e) => {
      if (this.suppressClick) {
        this.suppressClick = false;
        return;
      }
      const card = e.target.closest(".inventory-item");
      if (!card) return;
      if (card.dataset.kind === "case") this.openCase(card.dataset.id);
    });
  }

  clearLongPress() {
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
  }

  // ---------- Открытие / закрытие ----------
  open() {
    if (this.isClosing) return;
    this.popup.classList.add("active");
    document.body.style.overflow = "hidden";
    // При открытии рисуем с нуля, чтобы карточки красиво появились
    if (this.grid) this.grid.innerHTML = "";
    this.render();
  }

  close() {
    if (this.isClosing) return;
    this.hideMenu();
    this.isClosing = true;
    this.popup.classList.add("popup-closing");
    setTimeout(() => {
      this.popup.classList.remove("active", "popup-closing");
      document.body.style.overflow = "";
      this.isClosing = false;
    }, 400);
  }

  // ---------- Данные ----------
  getOwnedSkinIds() {
    try {
      return JSON.parse(localStorage.getItem("ownedSkins") || '["p6"]');
    } catch (e) {
      return ["p6"];
    }
  }

  getEntries() {
    const entries = [];
    if (typeof storeItems === "undefined" || !storeItems) return entries;
    const sm = window.storeManager;

    const ownedSkins = this.getOwnedSkinIds();
    const selected = localStorage.getItem("selectedSkin") || "p6";

    storeItems.forEach((item) => {
      if (item.type === "skin" && ownedSkins.includes(item.id)) {
        entries.push({
          kind: "skin",
          item,
          selected: selected === item.id,
          canDelete: item.id !== "p6", // базовый скин удалить нельзя
        });
      } else if (item.type === "upgrade") {
        const level = sm ? sm.getUpgradeLevel(item.id) : 0;
        if (level > 0) entries.push({ kind: "upgrade", item, level, canDelete: true });
      } else if (item.type === "case") {
        const count = sm ? sm.getCaseCount(item.id) : 0;
        if (count > 0) entries.push({ kind: "case", item, count, canDelete: true });
      }
    });

    return entries;
  }

  // ---------- Отрисовка ----------
  // Описание карточки: превью, значок и подпись
  describe(entry) {
    const { item, kind } = entry;
    let preview = "";
    let badgeText = "";
    let badgeCls = "";
    let sub = "";

    if (kind === "upgrade") {
      const iconHtml = item.previewIcon
        ? `<span class="material-symbols-rounded">${item.previewIcon}</span>`
        : `+${item.multiplier}`;
      preview = `<div class="inventory-upgrade-preview">${iconHtml}</div>`;
      badgeText = `Ур. ${entry.level}`;
      const sm2 = window.storeManager;
      sub =
        sm2 && sm2.formatUpgradeBonus
          ? `Бонус: ${sm2.formatUpgradeBonus(item, entry.level)}`
          : `Бонус: +${entry.level * item.multiplier} за клик`;
    } else {
      preview = `<img src="assets/images/${item.image}" alt="${item.name}" draggable="false" ${item.imageFilter ? `style="filter: ${item.imageFilter}"` : ""} onerror="this.src='assets/images/p6.png'">`;
      if (kind === "case") {
        badgeText = `×${entry.count}`;
        sub = "Нажми, чтобы открыть";
      } else if (entry.selected) {
        badgeText = "Выбран";
        badgeCls = "selected";
        sub = "Скин";
      } else {
        sub = "Скин";
      }
    }
    return { preview, badgeText, badgeCls, sub };
  }

  entrySig(entry) {
    const d = this.describe(entry);
    return [d.badgeText, d.badgeCls, d.sub].join("|");
  }

  createEntryEl(entry) {
    const { item, kind } = entry;
    const d = this.describe(entry);
    const el = document.createElement("div");
    el.className = `inventory-item inv-${kind}`;
    el.dataset.kind = kind;
    el.dataset.id = item.id;
    el.innerHTML = `
      <div class="inventory-item-preview">${d.preview}</div>
      <div class="inventory-item-name">${item.name}</div>
      <div class="inventory-item-sub"></div>
    `;
    this.patchEntryEl(el, entry);
    return el;
  }

  // Обновляет только изменившееся (значок и подпись), сама карточка
  // остаётся на месте, поэтому анимация появления не запускается заново
  patchEntryEl(el, entry) {
    const d = this.describe(entry);
    const subEl = el.querySelector(".inventory-item-sub");
    if (subEl && subEl.textContent !== d.sub) subEl.textContent = d.sub;

    const prev = el.querySelector(".inventory-item-preview");
    let badge = el.querySelector(".inventory-badge");
    if (d.badgeText) {
      if (!badge) {
        badge = document.createElement("span");
        prev.appendChild(badge);
      }
      badge.className = `inventory-badge${d.badgeCls ? " " + d.badgeCls : ""}`;
      if (badge.textContent !== d.badgeText) badge.textContent = d.badgeText;
    } else if (badge) {
      badge.remove();
    }
    el.dataset.sig = this.entrySig(entry);
  }

  // Полная перерисовка только при открытии окна; дальше — точечные правки
  render() {
    if (!this.grid) return;

    const entries = this.getEntries();
    const emptyEl = this.grid.querySelector(".inventory-empty");

    if (entries.length === 0) {
      Array.from(this.grid.children).forEach((c) => {
        if (c !== emptyEl) c.remove();
      });
      if (!emptyEl) {
        this.grid.innerHTML = '<div class="inventory-empty">Инвентарь пуст</div>';
      }
      return;
    }
    if (emptyEl) emptyEl.remove();

    const existing = new Map();
    Array.from(this.grid.children).forEach((c) => {
      if (c.dataset && c.dataset.kind) {
        existing.set(`${c.dataset.kind}:${c.dataset.id}`, c);
      }
    });

    let prev = null;
    const keep = new Set();
    entries.forEach((entry) => {
      const key = `${entry.kind}:${entry.item.id}`;
      keep.add(key);

      let el = existing.get(key);
      if (!el) {
        el = this.createEntryEl(entry);
      } else if (el.dataset.sig !== this.entrySig(entry)) {
        this.patchEntryEl(el, entry);
      }

      const ref = prev ? prev.nextSibling : this.grid.firstChild;
      if (el !== ref) this.grid.insertBefore(el, ref);
      prev = el;
    });

    existing.forEach((el, key) => {
      if (!keep.has(key)) el.remove();
    });
  }

  // ---------- Открытие кейса ----------
  openCase(caseId) {
    if (!window.caseManager) return;
    const ok = window.caseManager.open(caseId, () => this.render());
    if (ok) {
      // Количество кейсов на карточке обновится сразу
      this.render();
    }
  }

  // ---------- Контекстное меню ----------
  showMenu(card, x, y) {
    this.hideMenu();
    this.clearLongPress();

    const kind = card.dataset.kind;
    const id = card.dataset.id;
    const entry = this.getEntries().find(
      (en) => en.kind === kind && en.item.id === id,
    );
    if (!entry) return;

    const menu = document.createElement("div");
    menu.className = "inventory-menu";

    const title = document.createElement("div");
    title.className = "inventory-menu-title";
    title.textContent = entry.item.name;
    menu.appendChild(title);

    const addBtn = (label, cls, handler) => {
      const b = document.createElement("button");
      b.className = `inventory-menu-btn ${cls || ""}`;
      b.textContent = label;
      b.addEventListener("click", (e) => {
        e.stopPropagation();
        handler(b);
      });
      menu.appendChild(b);
      return b;
    };

    if (!entry.canDelete) {
      const note = document.createElement("div");
      note.className = "inventory-menu-note";
      note.textContent = "Базовый предмет, удалить нельзя";
      menu.appendChild(note);
    } else if (kind === "case" && entry.count > 1) {
      addBtn("Удалить 1 шт.", "danger", (b) =>
        this.confirmInMenu(menu, "Удалить 1 кейс?", () => this.deleteEntry(entry, 1)),
      );
      addBtn(`Удалить все (${entry.count})`, "danger", (b) =>
        this.confirmInMenu(menu, `Удалить все кейсы (${entry.count})?`, () =>
          this.deleteEntry(entry, entry.count),
        ),
      );
    } else {
      const label = kind === "upgrade" ? "Удалить прокачку" : "Удалить";
      const q =
        kind === "upgrade"
          ? `Удалить прокачку (ур. ${entry.level})?`
          : "Удалить предмет?";
      addBtn(label, "danger", () =>
        this.confirmInMenu(menu, q, () => this.deleteEntry(entry, 1)),
      );
    }

    document.body.appendChild(menu);
    this.menu = menu;

    // Позиция: не вылезаем за экран
    const mw = menu.offsetWidth;
    const mh = menu.offsetHeight;
    const left = Math.max(8, Math.min(x, window.innerWidth - mw - 8));
    const top = Math.max(8, Math.min(y, window.innerHeight - mh - 8));
    menu.style.left = `${left}px`;
    menu.style.top = `${top}px`;
  }

  confirmInMenu(menu, question, onYes) {
    menu.innerHTML = "";
    const q = document.createElement("div");
    q.className = "inventory-menu-title";
    q.textContent = question;
    menu.appendChild(q);

    const row = document.createElement("div");
    row.className = "inventory-menu-row";

    const no = document.createElement("button");
    no.className = "inventory-menu-btn";
    no.textContent = "Нет";
    no.addEventListener("click", (e) => {
      e.stopPropagation();
      this.hideMenu();
    });

    const yes = document.createElement("button");
    yes.className = "inventory-menu-btn danger";
    yes.textContent = "Да, удалить";
    yes.addEventListener("click", (e) => {
      e.stopPropagation();
      this.hideMenu();
      onYes();
    });

    row.appendChild(no);
    row.appendChild(yes);
    menu.appendChild(row);
  }

  hideMenu() {
    if (this.menu) {
      this.menu.remove();
      this.menu = null;
    }
  }

  // ---------- Удаление (не продажа: коины не возвращаются) ----------
  deleteEntry(entry, amount) {
    const sm = window.storeManager;
    const { kind, item } = entry;

    if (kind === "case") {
      if (sm) sm.setCaseCount(item.id, Math.max(0, sm.getCaseCount(item.id) - amount));
    } else if (kind === "upgrade") {
      localStorage.removeItem(`upgrade_${item.id}_level`);
      if (typeof clicker !== "undefined" && clicker) clicker.forceUpdate();
    } else if (kind === "skin") {
      if (item.id === "p6") return;
      const owned = this.getOwnedSkinIds().filter((id) => id !== item.id);
      localStorage.setItem("ownedSkins", JSON.stringify(owned));

      // Если удалили выбранный скин - возвращаем базовый
      if ((localStorage.getItem("selectedSkin") || "p6") === item.id) {
        localStorage.setItem("selectedSkin", "p6");
        if (typeof clicker !== "undefined" && clicker && clicker.clickImage) {
          clicker.clickImage.src = "assets/images/p6.png";
        }
        if (window.skinsManager) window.skinsManager.currentSkin = "p6";
      }
      if (window.skinsManager) window.skinsManager.loadAvailableSkins();
    }

    this.render();

    // Если магазин открыт под инвентарём - обновим его
    if (
      sm &&
      sm.storePopup &&
      sm.storePopup.classList.contains("active")
    ) {
      sm.loadStoreItems();
    }

    if (sm) sm.showNotification("Предмет удалён", "info");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  window.inventoryManager = new InventoryManager();
});
