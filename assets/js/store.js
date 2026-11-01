class StoreManager {
  constructor() {
    this.storePopup = document.getElementById("storePopup");
    this.storeBtn = document.getElementById("storeBtn");
    this.closeStorePopup = document.getElementById("closeStorePopup");
    this.storeGrid = document.getElementById("storeGrid");
    this.storeBalance = document.getElementById("storeBalance");

    this.isClosing = false;
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.updateBalance();
    // Предзагружаем данные магазина
    this.preloadStoreData();
    // Пассивный доход от «Автокликера»
    this.startAutoClicker();
  }

  setupEventListeners() {
    // Открытие/закрытие popup магазина
    this.storeBtn.addEventListener("click", () => this.openStorePopup());
    this.closeStorePopup.addEventListener("click", () =>
      this.closeStorePopupWindow(),
    );

    // Закрытие по клику вне popup
    this.storePopup.addEventListener("click", (e) => {
      if (e.target === this.storePopup && !this.isClosing) {
        this.closeStorePopupWindow();
      }
    });

    // Закрытие по ESC
    document.addEventListener("keydown", (e) => {
      if (
        e.key === "Escape" &&
        this.storePopup.classList.contains("active") &&
        !this.isClosing
      ) {
        this.closeStorePopupWindow();
      }
    });
  }

  openStorePopup() {
    if (this.isClosing) return;

    this.storePopup.classList.add("active");
    document.body.style.overflow = "hidden";
    this.updateBalance();
    // Новое открытие окна — анимация появления карточек снова включена
    if (this.storeGrid) this.storeGrid.classList.remove("store-refresh");
    this.loadStoreItems();
  }

  closeStorePopupWindow() {
    if (this.isClosing) return;

    this.isClosing = true;
    this.storePopup.classList.add("popup-closing");

    setTimeout(() => {
      this.storePopup.classList.remove("active", "popup-closing");
      document.body.style.overflow = "";
      this.isClosing = false;
    }, 400);
  }

  // Обновление магазина после покупки: окно не перезагружается —
  // заменяются только те карточки, у которых изменилось состояние
  // (куплено, не хватает денег, новый уровень и т.п.). Прокрутка и
  // остальные карточки остаются как были, анимация появления не повторяется.
  refreshStoreItems() {
    const grid = this.storeGrid;
    if (!grid || typeof storeItems === "undefined" || !storeItems) {
      return this.loadStoreItems();
    }

    const scroller = grid.closest(".store-content");
    const top = scroller ? scroller.scrollTop : 0;

    grid.classList.add("store-refresh");

    // Рисуем актуальные карточки во временный контейнер
    const temp = document.createElement("div");
    this.storeGrid = temp;
    try {
      this.loadStoreItems();
    } finally {
      this.storeGrid = grid;
    }

    const oldNodes = Array.from(grid.children);
    const newNodes = Array.from(temp.children);

    if (
      oldNodes.length !== newNodes.length ||
      oldNodes.some((n) => !n.dataset.sig)
    ) {
      grid.replaceChildren(...newNodes);
    } else {
      newNodes.forEach((fresh, i) => {
        if (oldNodes[i].dataset.sig !== fresh.dataset.sig) {
          oldNodes[i].replaceWith(fresh);
        }
      });
    }

    this.updateUpgradeInfo();
    if (scroller) scroller.scrollTop = top;
  }

  loadStoreItems() {
    if (!this.storeGrid) return;

    this.storeGrid.innerHTML = "";

    // Проверяем существует ли storeItems
    if (typeof storeItems === "undefined" || !storeItems) {
      console.error("storeItems is not defined");
      this.showNotification("Ошибка загрузки магазина", "error");
      return;
    }

    storeItems.forEach((item) => {
      if (item.type === "skin") {
        this.createSkinItem(item);
      } else if (item.type === "upgrade") {
        this.createUpgradeItem(item);
      } else if (item.type === "case") {
        this.createCaseItem(item);
      }
    });

    // Обновляем информацию о прокачке
    this.updateUpgradeInfo();

    // Добавляем обработчики для кнопок покупки
    this.addBuyButtonListeners();
  }

  createSkinItem(item) {
    const isOwned = this.isSkinOwned(item.id);
    const canAfford = this.canAfford(item.price);

    const storeItem = document.createElement("div");
    storeItem.className = `store-item ${isOwned ? "owned" : ""}`;
    storeItem.dataset.sig = `${item.id}|${isOwned}|${canAfford}|${item.price - this.getBalance()}`;
    storeItem.innerHTML = `
                ${isOwned ? '<span class="owned-badge"><span class="material-symbols-rounded">check</span>Куплен</span>' : ""}
                <div class="store-item-preview">
                    <img src="assets/images/${item.image}" alt="${item.name}" onerror="this.src='assets/images/p6.png'">
                </div>
                <div class="store-item-info">
                    <h3>${item.name}</h3>
                    <p>${item.description}</p>
                    <div class="store-item-price">
                        <span class="price">${item.price}</span>
                    </div>
                    <button class="buy-btn ${isOwned ? "owned" : ""}"
                            data-id="${item.id}"
                            data-type="skin"
                            data-price="${item.price}"
                            ${isOwned ? "disabled" : !canAfford ? "disabled" : ""}>
                        ${isOwned ? '<span class="material-symbols-rounded">check</span> Куплен' : !canAfford ? "Недостаточно" : "Купить"}
                    </button>
                    ${!isOwned && !canAfford ? '<div class="insufficient-funds">Не хватает: ' + (item.price - this.getBalance()) + "</div>" : ""}
                </div>
            `;

    this.storeGrid.appendChild(storeItem);
  }

  createUpgradeItem(item) {
    const currentLevel = this.getUpgradeLevel(item.id);
    const nextLevel = currentLevel + 1;
    const currentPrice = this.calculateUpgradePrice(item.id, nextLevel);
    const canAfford = this.canAfford(currentPrice);
    const isMaxLevel = currentLevel >= item.maxLevel;

    // Рассчитываем текущий и максимальный бонус
    const currentBonus = currentLevel * item.multiplier;
    const maxBonus = item.maxLevel * item.multiplier;

    // Для прокачек с особым эффектом (автокликер, крит, дроп) — свои подписи
    const effect = this.getUpgradeEffect(item);
    const isClickEffect = effect === "click";
    const currentBonusText = isClickEffect
      ? `+${currentBonus}`
      : this.formatUpgradeBonus(item, currentLevel);
    const maxBonusText = isClickEffect
      ? `+${maxBonus} за клик`
      : this.formatUpgradeBonus(item, item.maxLevel);
    const previewHtml = item.previewIcon
      ? `<span class="material-symbols-rounded" style="font-size: 40px;">${item.previewIcon}</span>`
      : `+${item.multiplier}`;

    const storeItem = document.createElement("div");
    storeItem.className = `store-item upgrade-item ${isMaxLevel ? "max-level" : ""}`;
    storeItem.dataset.sig = `${item.id}|${currentLevel}|${canAfford}|${currentPrice - this.getBalance()}`;
    storeItem.innerHTML = `
                <div class="store-item-preview">
                    <div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: var(--accent-color); border-radius: 12px; color: white; font-size: 24px; font-weight: bold;">
                        ${previewHtml}
                    </div>
                </div>
                <div class="store-item-info">
                    <h3>${item.name} (Ур. ${currentLevel})</h3>
                    <p>${item.description}</p>
                    <div class="upgrade-stats">
                        <div style="font-size: 0.9rem; margin: 0.5rem 0;">
                            <span style="color: var(--success-color)">Текущий бонус: ${currentBonusText}</span><br>
                            <span style="color: #ff4444">Максимум: ${maxBonusText}</span>
                        </div>
                    </div>
                    <div class="upgrade-progress">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${(currentLevel / item.maxLevel) * 100}%"></div>
                        </div>
                        <span class="progress-text">${currentLevel} / ${item.maxLevel}</span>
                    </div>
                    <div class="store-item-price">
                        <span class="price">${isMaxLevel ? "МАКС." : currentPrice}</span>
                    </div>
                    <button class="buy-btn upgrade-btn ${isMaxLevel ? "max-level" : ""}"
                            data-id="${item.id}"
                            data-type="upgrade"
                            data-price="${currentPrice}"
                            ${isMaxLevel ? "disabled" : !canAfford ? "disabled" : ""}>
                        ${isMaxLevel ? "Макс. уровень" : !canAfford ? "Недостаточно" : "Улучшить"}
                    </button>
                    ${!isMaxLevel && !canAfford ? '<div class="insufficient-funds">Не хватает: ' + (currentPrice - this.getBalance()) + "</div>" : ""}
                </div>
            `;

    this.storeGrid.appendChild(storeItem);
  }

  createCaseItem(item) {
    const canAfford = this.canAfford(item.price);
    const owned = this.getCaseCount(item.id);

    const storeItem = document.createElement("div");
    storeItem.className = "store-item case-item";
    storeItem.dataset.sig = `${item.id}|${owned}|${canAfford}|${item.price - this.getBalance()}`;
    storeItem.innerHTML = `
                <div class="store-item-preview">
                    <img src="assets/images/${item.image}" alt="${item.name}" ${item.imageFilter ? `style="filter: ${item.imageFilter}"` : ""} onerror="this.src='assets/images/p6.png'">
                </div>
                <div class="store-item-info">
                    <h3>${item.name}</h3>
                    <p>${item.description}</p>
                    <div class="store-item-price">
                        <span class="price">${item.price}</span>
                        <span class="case-owned-count">В инвентаре: ${owned}</span>
                    </div>
                    <button class="buy-btn case-btn"
                            data-id="${item.id}"
                            data-type="case"
                            data-price="${item.price}"
                            ${!canAfford ? "disabled" : ""}>
                        ${!canAfford ? "Недостаточно" : "Купить"}
                    </button>
                    ${!canAfford ? '<div class="insufficient-funds">Не хватает: ' + (item.price - this.getBalance()) + "</div>" : ""}
                </div>
            `;

    this.storeGrid.appendChild(storeItem);
  }

  getCaseCount(caseId) {
    return parseInt(localStorage.getItem(`case_${caseId}_count`) || "0");
  }

  setCaseCount(caseId, count) {
    if (count > 0) {
      localStorage.setItem(`case_${caseId}_count`, String(count));
    } else {
      localStorage.removeItem(`case_${caseId}_count`);
    }
  }

  buyCase(caseId, price) {
    if (!this.canAfford(price)) {
      this.showNotification("Недостаточно!", "error");
      return;
    }

    this.deductBalance(price);
    this.setCaseCount(caseId, this.getCaseCount(caseId) + 1);

    this.updateBalance();
    this.refreshStoreItems();
    this.showNotification("Кейс куплен! Он лежит в инвентаре", "success");
  }

  calculateUpgradePrice(upgradeId, level) {
    const baseItem = storeItems.find((item) => item.id === upgradeId);
    if (!baseItem) return 0;

    // Базовая цена + ступень за каждый уровень (по умолчанию 100)
    const step = baseItem.priceStep !== undefined ? baseItem.priceStep : 100;
    return baseItem.price + (level - 1) * step;
  }

  getUpgradeLevel(upgradeId) {
    return parseInt(localStorage.getItem(`upgrade_${upgradeId}_level`) || "0");
  }

  setUpgradeLevel(upgradeId, level) {
    localStorage.setItem(`upgrade_${upgradeId}_level`, level.toString());
  }

  getTotalMultiplier() {
    let totalMultiplier = 1;

    if (typeof storeItems === "undefined" || !storeItems)
      return totalMultiplier;

    storeItems.forEach((item) => {
      if (item.type === "upgrade" && this.getUpgradeEffect(item) === "click") {
        const level = this.getUpgradeLevel(item.id);
        totalMultiplier += level * item.multiplier;
      }
    });

    return totalMultiplier;
  }

  // ---------- Особые прокачки ----------
  getUpgradeEffect(item) {
    return (item && item.effect) || "click";
  }

  getUpgradeStep(item) {
    if (!item) return 0;
    return item.perLevel !== undefined ? item.perLevel : item.multiplier || 0;
  }

  // Сумма прибавок всех прокачек с нужным эффектом
  getEffectTotal(effect) {
    if (typeof storeItems === "undefined" || !storeItems) return 0;
    let total = 0;
    storeItems.forEach((item) => {
      if (item.type === "upgrade" && this.getUpgradeEffect(item) === effect) {
        total += this.getUpgradeLevel(item.id) * this.getUpgradeStep(item);
      }
    });
    // убираем хвосты вида 0.5000000001
    return Math.round(total * 1000) / 1000;
  }

  // Текст бонуса для карточки магазина и инвентаря
  formatUpgradeBonus(item, level) {
    const effect = this.getUpgradeEffect(item);
    const value = Math.round(level * this.getUpgradeStep(item) * 1000) / 1000;
    switch (effect) {
      case "auto":
        return `+${value} коин./сек`;
      case "crit":
        return `${value}% шанс крита`;
      case "critpower":
        return `крит ×${(item.baseValue || 0) + value}`;
      case "daily":
        return `+${value}% к дропу`;
      default:
        return `+${value} за клик`;
    }
  }

  // Коинов в секунду от автокликера
  getAutoRate() {
    return Math.floor(this.getEffectTotal("auto"));
  }

  // Шанс крита, 0..1 (не больше 100%)
  getCritChance() {
    return Math.min(1, this.getEffectTotal("crit") / 100);
  }

  // Множитель крита: ×5 + прокачка «Сила крита»
  getCritMultiplier() {
    return 5 + this.getEffectTotal("critpower");
  }

  // Возвращает множитель, если клик критический, иначе 0
  rollCrit() {
    const chance = this.getCritChance();
    if (chance > 0 && Math.random() < chance) return this.getCritMultiplier();
    return 0;
  }

  // Бонус ежедневного дропа в процентах
  getDailyBonusPercent() {
    return this.getEffectTotal("daily");
  }

  // «Отпечаток» того, что сейчас по карману: нужен, чтобы при открытом магазине
  // карточки обновлялись, когда автокликер накопил на покупку
  getAffordKey() {
    if (typeof storeItems === "undefined" || !storeItems) return "";
    return storeItems
      .map((item) => {
        let price = item.price;
        if (item.type === "upgrade") {
          const level = this.getUpgradeLevel(item.id);
          if (level >= item.maxLevel) return "m";
          price = this.calculateUpgradePrice(item.id, level + 1);
        } else if (item.type === "skin" && this.isSkinOwned(item.id)) {
          return "o";
        }
        return this.canAfford(price) ? "1" : "0";
      })
      .join("");
  }

  startAutoClicker() {
    if (this._autoTimer) return;
    this._autoTimer = setInterval(() => {
      const storeOpen =
        this.storePopup &&
        this.storePopup.classList.contains("active") &&
        !this.isClosing;
      if (!storeOpen) this._affordKey = undefined;

      const rate = this.getAutoRate();
      if (rate <= 0) return;
      if (typeof clicker === "undefined" || !clicker) return;

      if (storeOpen && this._affordKey === undefined) {
        this._affordKey = this.getAffordKey();
      }

      clicker.count += rate;
      clicker.saveCount();
      clicker.updateDisplay();

      if (storeOpen) {
        const key = this.getAffordKey();
        if (key !== this._affordKey) {
          this._affordKey = key;
          this.refreshStoreItems();
        }
      }
    }, 1000);
  }

  updateUpgradeInfo() {
    // Обновляем информацию о множителе в описаниях прокачки
    const multiplierElements = document.querySelectorAll("#currentMultiplier");
    const totalMultiplier = this.getTotalMultiplier();

    multiplierElements.forEach((element) => {
      element.textContent = totalMultiplier;
    });

    // Обновляем прогресс бары
    const progressBars = document.querySelectorAll(".progress-fill");
    progressBars.forEach((bar) => {
      const storeItem = bar.closest(".store-item");
      if (storeItem) {
        const upgradeId = storeItem.querySelector(".buy-btn")?.dataset.id;
        if (upgradeId) {
          const baseItem = storeItems.find((item) => item.id === upgradeId);
          if (baseItem) {
            const currentLevel = this.getUpgradeLevel(upgradeId);
            bar.style.width = `${(currentLevel / baseItem.maxLevel) * 100}%`;

            // Обновляем текст прогресса
            const progressText = storeItem.querySelector(".progress-text");
            if (progressText) {
              progressText.textContent = `${currentLevel} / ${baseItem.maxLevel}`;
            }
          }
        }
      }
    });
  }

  addBuyButtonListeners() {
    const buyButtons = this.storeGrid.querySelectorAll(
      ".buy-btn:not(:disabled):not(.owned):not(.max-level)",
    );

    buyButtons.forEach((button) => {
      button.addEventListener("click", (e) => {
        const itemId = e.target.dataset.id;
        const itemType = e.target.dataset.type;
        const price = parseInt(e.target.dataset.price);

        if (itemType === "skin") {
          this.buySkin(itemId, price);
        } else if (itemType === "upgrade") {
          this.buyUpgrade(itemId, price);
        } else if (itemType === "case") {
          this.buyCase(itemId, price);
        }
      });
    });
  }

  buySkin(skinId, price) {
    if (this.isSkinOwned(skinId)) {
      this.showNotification("Этот скин уже куплен!", "error");
      return;
    }

    if (!this.canAfford(price)) {
      this.showNotification("Недостаточно!", "error");
      return;
    }

    // Списываем стоимость
    this.deductBalance(price);

    // Добавляем скин в коллекцию
    this.addOwnedSkin(skinId);

    // Обновляем интерфейс
    this.updateBalance();
    this.refreshStoreItems();

    // Показываем уведомление
    this.showNotification("Скин успешно куплен!", "success");

    // Обновляем список скинов
    if (window.skinsManager) {
      window.skinsManager.loadAvailableSkins();
    }
  }

  buyUpgrade(upgradeId, price) {
    if (!this.canAfford(price)) {
      this.showNotification("Недостаточно!", "error");
      return;
    }

    const baseItem = storeItems.find((item) => item.id === upgradeId);
    if (!baseItem) return;

    const currentLevel = this.getUpgradeLevel(upgradeId);
    const nextLevel = currentLevel + 1;

    if (nextLevel > baseItem.maxLevel) {
      this.showNotification("Достигнут максимальный уровень!", "error");
      return;
    }

    // Списываем стоимость
    this.deductBalance(price);

    // Увеличиваем уровень прокачки
    this.setUpgradeLevel(upgradeId, nextLevel);

    // Обновляем интерфейс
    this.updateBalance();
    this.refreshStoreItems();

    // Показываем уведомление
    const newBonus = nextLevel * baseItem.multiplier;
    const totalMultiplier = this.getTotalMultiplier();
    this.showNotification(
      `Прокачка улучшена до уровня ${nextLevel}! Бонус: +${newBonus} (Всего: +${totalMultiplier - 1})`,
      "success",
    );

    // Обновляем кликер
    if (clicker) {
      clicker.forceUpdate();
    }
  }

  isSkinOwned(skinId) {
    const ownedSkins = JSON.parse(localStorage.getItem("ownedSkins") || "[]");
    return ownedSkins.includes(skinId);
  }

  addOwnedSkin(skinId) {
    const ownedSkins = JSON.parse(localStorage.getItem("ownedSkins") || "[]");
    if (!ownedSkins.includes(skinId)) {
      ownedSkins.push(skinId);
      localStorage.setItem("ownedSkins", JSON.stringify(ownedSkins));
    }
  }

  getBalance() {
    return parseInt(localStorage.getItem("clickCount") || "0");
  }

  updateBalance() {
    // Метод оставлен для внутреннего использования, но не вызывает обновление UI
    return this.getBalance();
  }

  canAfford(price) {
    return this.getBalance() >= price;
  }

  deductBalance(amount) {
    const currentBalance = this.getBalance();
    const newBalance = currentBalance - amount;
    localStorage.setItem("clickCount", newBalance.toString());

    // Обновляем счетчик в кликере
    if (clicker) {
      clicker.count = newBalance;
      clicker.updateDisplay();
    }
  }

  showNotification(message, type = "info") {
    const notification = document.createElement("div");
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === "success" ? "#4CAF50" : type === "error" ? "#F44336" : "#2196F3"};
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 12px;
            z-index: 1001;
            animation: slideInRight 0.3s ease-out;
        `;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.animation = "slideOutRight 0.3s ease-out forwards";
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 3000);
  }

  preloadStoreData() {
    // Предзагружаем изображения скинов для магазина
    setTimeout(() => {
      if (typeof storeItems === "undefined" || !storeItems) return;

      storeItems.forEach((item) => {
        if (item.id !== "p6" && item.type === "skin") {
          const img = new Image();
          img.src = `assets/images/${item.image}`;
        }
      });
    }, 2000);
  }
}

// Инициализация менеджера магазина
document.addEventListener("DOMContentLoaded", () => {
  window.storeManager = new StoreManager();
});
