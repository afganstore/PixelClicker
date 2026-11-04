class SettingsManager {
  constructor() {
    this.settingsPopup = document.getElementById("settingsPopup");
    this.settingsBtn = document.getElementById("settingsBtn");
    this.closePopup = document.getElementById("closePopup");
    this.darkThemeToggle = document.getElementById("darkThemeToggle");
    this.resetDataBtn = document.getElementById("resetData");

    this.animationsToggle = document.getElementById("animationsToggle");
    this.particlesToggle = document.getElementById("particlesToggle");
    this.gradientToggle = document.getElementById("gradientToggle");

    this.soundToggle = document.getElementById("soundToggle");

    this.tabButtons = document.querySelectorAll(".tab-btn");
    this.settingCategories = document.querySelectorAll(".setting-category");
    this.settingsTabs = document.querySelector(".settings-tabs");

    this.customModCode = document.getElementById("customModCode");
    this.applyModBtn = document.getElementById("applyMod");
    this.clearModBtn = document.getElementById("clearMod");
    this.modStatus = document.getElementById("modStatus");
    this.autoLoadToggle = document.getElementById("autoLoadToggle");

    this.modConfirmationModal = document.getElementById("modConfirmationModal");
    this.confirmModYes = document.getElementById("confirmModYes");
    this.confirmModNo = document.getElementById("confirmModNo");
    this.codePreview = document.getElementById("codePreview");

    // Новые элементы для настройки фона
    this.backgroundTypeSelect = document.getElementById("backgroundTypeSelect");
    this.solidColorInput = document.getElementById("solidColorInput");
    this.colorPreview = document.getElementById("colorPreview");
    this.gradientColorsGrid = document.getElementById("gradientColorsGrid");
    this.gradientAddBtn = document.getElementById("gradientAddColor");
    this.gradientPreview = document.getElementById("gradientPreview");

    // Элементы для акцентного цвета
    this.accentColorPreview = document.getElementById("accentColorPreview");
    this.accentColorHex = document.getElementById("accentColorHex");
    this.accentColorName = document.getElementById("accentColorName");
    this.accentPresetsContainer = document.getElementById("accentPresets");

    // Переменные для color picker
    this.colorPickerOverlay = null;
    this.currentColorPicker = null;
    this.pendingColorChange = null;
    this.currentEscHandler = null;

    // Пресеты акцентных цветов
    this.accentColorPresets = [
      { name: "Фиолетовый", value: "#6750a4", default: true },
      { name: "Синий", value: "#2196f3" },
      { name: "Зеленый", value: "#4caf50" },
      { name: "Оранжевый", value: "#ff9800" },
      { name: "Розовый", value: "#e91e63" },
      { name: "Бирюзовый", value: "#00bcd4" },
      { name: "Красный", value: "#f44336" },
      { name: "Золотой", value: "#ffd700" },
    ];

    this.isClosing = false;
    this.currentTab = "all";
    this.pendingModCode = null;

    this.init();
  }

  init() {
    // Запоминаем место последнего нажатия — от него «раскрывается» новый фон
    document.addEventListener(
      "pointerdown",
      (e) => {
        this._lastPointer = { x: e.clientX, y: e.clientY };
      },
      { passive: true, capture: true },
    );
    this.loadSettings();
    this.setupEventListeners();
    this.applyOptimizationSettings();
    this.setupTabs();
    this.setupModsEventListeners();
    this.loadAutoLoadMods();

    // Инициализация системы звуков
    this.initializeSoundSystem();

    // Инициализация настроек фона
    this.setupBackgroundSettings();
    this.loadBackgroundSettings();

    // Инициализация акцентного цвета
    this.setupAccentColor();
    this.loadAccentColor();

    // Обновляем структуру кнопок вкладок
    this.updateTabButtonsStructure();
  }

  // МЕТОД: Обновление структуры кнопок вкладок для разделения эмодзи и текста
  updateTabButtonsStructure() {
    this.tabButtons.forEach((button) => {
      const originalHTML = button.innerHTML;

      // Сохраняем оригинальный HTML в data-атрибут
      button.dataset.originalHTML = originalHTML;

      // Извлекаем эмодзи (первый символ или символы до пробела)
      const emojiMatch = originalHTML.match(/^.[^a-zA-Z0-9\s]*/);
      const textMatch = originalHTML.replace(/^.[^a-zA-Z0-9\s]*\s*/, "");

      if (emojiMatch) {
        const emoji = emojiMatch[0];
        const newHTML = `
                    <span class="tab-emoji">${emoji}</span>
                    <span class="tab-text">${textMatch}</span>
                `;
        button.innerHTML = newHTML;
      }
    });
  }

  // ОСТАЛЬНЫЕ МЕТОДЫ ОСТАЮТСЯ БЕЗ ИЗМЕНЕНИЙ
  setupAccentColor() {
    if (!this.accentColorPreview) return;

    // Обработчик клика на превью акцентного цвета
    this.accentColorPreview.addEventListener("click", () => {
      this.openColorPicker("accent", this.getCurrentAccentColor());
    });

    // Создаем пресеты цветов
    this.createAccentPresets();
  }

  createAccentPresets() {
    if (!this.accentPresetsContainer) return;

    this.accentColorPresets.forEach((preset, index) => {
      const presetElement = document.createElement("div");
      presetElement.className = `accent-preset preset-delay-${(index % 8) + 1} preset-stagger`;
      presetElement.style.background = preset.value;
      presetElement.title = preset.name;
      presetElement.dataset.color = preset.value;
      presetElement.dataset.name = preset.name;

      presetElement.addEventListener("click", () => {
        this.selectAccentPreset(presetElement, preset);
      });

      this.accentPresetsContainer.appendChild(presetElement);
    });
  }

  selectAccentPreset(presetElement, preset) {
    // Анимация выбора
    presetElement.classList.add("color-select-animation");

    // Убираем активный класс у всех пресетов
    document.querySelectorAll(".accent-preset").forEach((p) => {
      p.classList.remove("active", "preset-pulse");
    });

    // Добавляем активный класс к выбранному пресету
    presetElement.classList.add("active", "preset-pulse");

    // Применяем цвет
    this.applyAccentColor(preset.value, preset.name);

    // Показываем анимацию смены цвета
    this.showAccentColorChangeAnimation();

    setTimeout(() => {
      presetElement.classList.remove("color-select-animation");
    }, 600);
  }

  applyAccentColor(color, name = "Пользовательский") {
    // Сохраняем в localStorage
    localStorage.setItem("accentColor", color);
    localStorage.setItem("accentColorName", name);

    // Обновляем CSS переменную
    document.documentElement.style.setProperty("--accent-color", color);

    // Обновляем UI
    this.updateAccentColorUI(color, name);

    // Применяем цвет ко всем элементам
    this.applyAccentColorToElements(color);

    console.log(`🎨 Акцентный цвет изменен на: ${name} (${color})`);
  }

  updateAccentColorUI(color, name) {
    if (this.accentColorPreview) {
      this.accentColorPreview.style.background = color;
    }
    if (this.accentColorHex) {
      this.accentColorHex.textContent = color;
    }
    if (this.accentColorName) {
      this.accentColorName.textContent = name;
    }

    // Обновляем активный пресет
    document.querySelectorAll(".accent-preset").forEach((preset) => {
      if (preset.dataset.color === color) {
        preset.classList.add("active", "preset-pulse");
      } else {
        preset.classList.remove("active", "preset-pulse");
      }
    });
  }

  applyAccentColorToElements(color) {
    // Обновляем все элементы с акцентным цветом
    const accentElements = document.querySelectorAll(
      '[style*="--accent-color"], .tab-btn.active, .switch input:checked + .slider',
    );

    // Добавляем плавный переход
    document.documentElement.classList.add("smooth-color-transition");

    setTimeout(() => {
      document.documentElement.classList.remove("smooth-color-transition");
    }, 500);
  }

  showAccentColorChangeAnimation() {
    if (this.accentColorPreview) {
      this.accentColorPreview.classList.add("accent-glow");
      setTimeout(() => {
        this.accentColorPreview.classList.remove("accent-glow");
      }, 1500);
    }

    // Показываем уведомление
    this.showNotification(`Акцентный цвет изменен! 🎨`, "success");
  }

  loadAccentColor() {
    const savedColor = localStorage.getItem("accentColor") || "#6750a4";
    const savedName = localStorage.getItem("accentColorName") || "Фиолетовый";

    this.applyAccentColor(savedColor, savedName);
  }

  getCurrentAccentColor() {
    return localStorage.getItem("accentColor") || "#6750a4";
  }

  // ИСПРАВЛЕННЫЙ МЕТОД: Открытие color picker
  openColorPicker(type, currentColor, index = null) {
    // Закрываем предыдущий color picker если он открыт
    if (this.colorPickerOverlay) {
      this.closeColorPicker();
      return;
    }

    this.createColorPickerDialog(type, currentColor, index);
  }

  createColorPickerDialog(type, currentColor, index = null) {
    // Создаем overlay
    this.colorPickerOverlay = document.createElement("div");
    this.colorPickerOverlay.className = "color-picker-overlay";

    // Создаем диалог
    const dialog = document.createElement("div");
    dialog.className = "color-picker-dialog color-picker-open";

    const title = this.getColorPickerTitle(type, index);

    dialog.innerHTML = `
            <h3>${title}</h3>
            <input type="color" id="nativeColorPicker" value="${currentColor}"
                   style="width: 100%; height: 150px; border: none; border-radius: 8px; cursor: pointer;">
            <div class="color-picker-actions">
                <button class="color-picker-cancel" id="colorPickerCancel">Отмена</button>
                <button class="color-picker-confirm" id="colorPickerConfirm">Выбрать</button>
            </div>
        `;

    this.colorPickerOverlay.appendChild(dialog);
    document.body.appendChild(this.colorPickerOverlay);

    // Сохраняем контекст для использования в обработчиках
    this.pendingColorChange = { type, index, currentColor };

    // Обработчики событий
    const nativePicker = dialog.querySelector("#nativeColorPicker");
    const confirmBtn = dialog.querySelector("#colorPickerConfirm");
    const cancelBtn = dialog.querySelector("#colorPickerCancel");

    // Анимация при изменении цвета
    nativePicker.addEventListener("input", (e) => {
      this.animateColorChange(nativePicker);
    });

    confirmBtn.addEventListener("click", () => {
      this.confirmColorSelection(nativePicker.value);
    });

    cancelBtn.addEventListener("click", () => {
      this.closeColorPicker();
    });

    this.colorPickerOverlay.addEventListener("click", (e) => {
      if (e.target === this.colorPickerOverlay) {
        this.closeColorPicker();
      }
    });

    // Закрытие по ESC
    const escHandler = (e) => {
      if (e.key === "Escape") {
        this.closeColorPicker();
        document.removeEventListener("keydown", escHandler);
      }
    };
    document.addEventListener("keydown", escHandler);

    // Сохраняем ссылку для удаления
    this.currentEscHandler = escHandler;

    // Фокус на color picker
    setTimeout(() => {
      nativePicker.focus();
    }, 100);
  }

  getColorPickerTitle(type, index) {
    switch (type) {
      case "accent":
        return "Выберите акцентный цвет";
      case "solid":
        return "Выберите цвет фона";
      case "gradient":
        return `Выберите цвет градиента ${index + 1}`;
      default:
        return "Выберите цвет";
    }
  }

  animateColorChange(colorPicker) {
    // Создаем ripple эффект
    this.createRippleEffect(colorPicker);

    // Добавляем класс анимации
    colorPicker.classList.add("color-hover");
    setTimeout(() => {
      colorPicker.classList.remove("color-hover");
    }, 300);
  }

  createRippleEffect(element) {
    const rect = element.getBoundingClientRect();
    const ripple = document.createElement("div");
    ripple.className = "color-ripple";
    ripple.style.width = "20px";
    ripple.style.height = "20px";
    ripple.style.left = rect.width / 2 - 10 + "px";
    ripple.style.top = rect.height / 2 - 10 + "px";

    element.appendChild(ripple);

    setTimeout(() => {
      if (ripple.parentNode) {
        ripple.parentNode.removeChild(ripple);
      }
    }, 600);
  }

  confirmColorSelection(color) {
    if (!this.pendingColorChange) return;

    const { type, index } = this.pendingColorChange;

    // Анимация подтверждения
    this.animateColorConfirmation();

    switch (type) {
      case "accent":
        this.applyAccentColor(color, "Пользовательский");
        break;
      case "solid":
        this.changeSolidColor(color);
        break;
      case "gradient":
        this.changeGradientColor(index, color);
        break;
    }

    this.closeColorPicker();
  }

  animateColorConfirmation() {
    const confirmBtn = document.querySelector("#colorPickerConfirm");
    if (confirmBtn) {
      confirmBtn.classList.add("color-select-animation");
      setTimeout(() => {
        confirmBtn.classList.remove("color-select-animation");
      }, 600);
    }
  }

  closeColorPicker() {
    if (this.colorPickerOverlay) {
      const dialog = this.colorPickerOverlay.querySelector(
        ".color-picker-dialog",
      );
      if (dialog) {
        dialog.classList.remove("color-picker-open");
        dialog.classList.add("color-picker-close");
      }

      setTimeout(() => {
        if (this.colorPickerOverlay && this.colorPickerOverlay.parentNode) {
          this.colorPickerOverlay.parentNode.removeChild(
            this.colorPickerOverlay,
          );
        }
        this.colorPickerOverlay = null;

        if (this.currentEscHandler) {
          document.removeEventListener("keydown", this.currentEscHandler);
          this.currentEscHandler = null;
        }
        this.pendingColorChange = null;
      }, 300);
    }
  }

  initializeSoundSystem() {
    // Создаем контейнер для выбора звуков если его нет
    this.createSoundSelectionUI();
  }

  createSoundSelectionUI() {
    // Находим категорию звуков
    const audioCategory = document.querySelector('[data-category="audio"]');
    if (!audioCategory) return;

    // Проверяем, не добавлен ли уже блок выбора звуков
    if (document.getElementById("soundSelection")) return;

    const soundSelectionHTML = `
            <div class="sound-selection" id="soundSelection">
                <div class="sound-combobox">
                    <select class="sound-select" id="soundSelect">
                    </select>
                </div>
            </div>
        `;

    // Добавляем после переключателя звуков
    const soundToggle = audioCategory.querySelector("#soundToggle");
    if (soundToggle) {
      soundToggle
        .closest(".setting-item")
        .insertAdjacentHTML("afterend", soundSelectionHTML);
    }

    // Загружаем список звуков
    this.loadSoundOptions();
  }

  loadSoundOptions() {
    const soundSelect = document.getElementById("soundSelect");
    if (!soundSelect) return;

    // Проверяем доступность clickSounds
    if (typeof clickSounds === "undefined" || !clickSounds) {
      soundSelect.innerHTML =
        '<option value="">Ошибка загрузки звуков</option>';
      return;
    }

    const currentSoundId = localStorage.getItem("clickSound") || "pixel6";
    let html = "";

    clickSounds.sounds.forEach((sound) => {
      const isSelected = sound.id === currentSoundId;
      html += `<option value="${sound.id}" ${isSelected ? "selected" : ""}>${sound.name}</option>`;
    });

    soundSelect.innerHTML = html;

    // Добавляем обработчики событий
    this.addSoundEventListeners();
  }

  addSoundEventListeners() {
    const soundSelect = document.getElementById("soundSelect");
    if (!soundSelect) return;

    soundSelect.addEventListener("change", (e) => {
      const soundId = e.target.value;
      this.selectSound(soundId);
    });
  }

  selectSound(soundId) {
    if (!clicker) {
      this.showNotification("Кликер не инициализирован", "error");
      return;
    }

    const success = clicker.changeClickSound(soundId);

    if (success) {
      // Анимация выбора
      const soundSelect = document.getElementById("soundSelect");
      soundSelect.classList.add("sound-selected");
      setTimeout(() => {
        soundSelect.classList.remove("sound-selected");
      }, 300);

      // Получаем человеко-читаемое название звука
      const soundName = this.getSoundDisplayName(soundId);
      this.showNotification(`Звук изменен на: ${soundName}`, "success");
    } else {
      this.showNotification("Ошибка смены звука", "error");
      // Сбрасываем выбор в комбобоксе
      this.loadSoundOptions();
    }
  }

  getSoundDisplayName(soundId) {
    if (typeof clickSounds === "undefined" || !clickSounds) {
      return soundId; // fallback на ID если звуки не загружены
    }

    const sound = clickSounds.sounds.find((s) => s.id === soundId);
    return sound ? sound.name : soundId;
  }

  setupEventListeners() {
    this.settingsBtn.addEventListener("click", () => this.openPopup());
    this.closePopup.addEventListener("click", () => this.closePopupWindow());

    this.settingsPopup.addEventListener("click", (e) => {
      if (e.target === this.settingsPopup && !this.isClosing) {
        this.closePopupWindow();
      }
    });

    document.addEventListener("keydown", (e) => {
      if (
        e.key === "Escape" &&
        this.settingsPopup.classList.contains("active") &&
        !this.isClosing
      ) {
        this.closePopupWindow();
      }
    });

    this.darkThemeToggle.addEventListener("change", () =>
      this.toggleDarkTheme(),
    );
    this.resetDataBtn.addEventListener("click", () => this.resetAllData());

    if (this.animationsToggle) {
      this.animationsToggle.addEventListener("change", () =>
        this.toggleAnimations(),
      );
    }
    if (this.particlesToggle) {
      this.particlesToggle.addEventListener("change", () =>
        this.toggleParticles(),
      );
    }
    if (this.gradientToggle) {
      this.gradientToggle.addEventListener("change", () =>
        this.toggleGradient(),
      );
    }

    if (this.soundToggle) {
      this.soundToggle.addEventListener("change", () => this.toggleSound());
    }
  }

  // ИСПРАВЛЕННЫЙ МЕТОД: Настройка обработчиков для фона
  setupBackgroundSettings() {
    if (this.backgroundTypeSelect) {
      this.backgroundTypeSelect.addEventListener("change", (e) => {
        this.changeBackgroundType(e.target.value);
      });
    }

    // Обработчики для кликов на превью цветов
    if (this.colorPreview) {
      this.colorPreview.addEventListener("click", () => {
        const currentColor = this.solidColorInput?.value || "#6750a4";
        this.openColorPicker("solid", currentColor);
      });
    }

    // Кастомные цвета градиента: список строится динамически (renderGradientColors)
    if (this.gradientAddBtn) {
      this.gradientAddBtn.addEventListener("click", () =>
        this.addGradientColor(),
      );
    }
    if (this.gradientColorsGrid) {
      this.gradientColorsGrid.addEventListener("click", (e) => {
        const del = e.target.closest(".gradient-color-remove");
        if (del) {
          const item = del.closest(".gradient-color-item");
          if (item) this.removeGradientColor(Number(item.dataset.index));
          return;
        }
        const preview = e.target.closest(".gradient-color-preview");
        if (preview) {
          const item = preview.closest(".gradient-color-item");
          const index = Number(item.dataset.index);
          const colors = this.getGradientColors();
          this.openColorPicker("gradient", colors[index] || "#6750a4", index);
        }
      });
    }

    // Скрываем текстовые поля - они теперь только для хранения значений
    if (this.solidColorInput) {
      this.solidColorInput.style.display = "none";
    }
  }

  changeBackgroundType(type) {
    localStorage.setItem("backgroundType", type);
    this.applyBackgroundSettings();

    // Показываем/скрываем соответствующие элементы
    this.toggleBackgroundSettingsVisibility(type);

    // Анимация переключения
    const containers = document.querySelectorAll(
      ".color-picker-container, .custom-gradient-container",
    );
    containers.forEach((container) => {
      if (container.style.display !== "none") {
        container.classList.add("background-type-switch");
        setTimeout(() => {
          container.classList.remove("background-type-switch");
        }, 300);
      }
    });
  }

  toggleBackgroundSettingsVisibility(type) {
    const colorPicker = document.querySelector(".color-picker-container");
    const customGradient = document.querySelector(".custom-gradient-container");

    if (colorPicker) {
      colorPicker.style.display = type === "solid" ? "block" : "none";
    }

    if (customGradient) {
      customGradient.style.display =
        type === "custom-gradient" ? "block" : "none";
    }
  }

  changeSolidColor(color) {
    if (!this.validateHexColor(color)) {
      return;
    }

    localStorage.setItem("solidBackgroundColor", color);
    this.applyBackgroundSettings();

    // Обновляем превью цвета
    if (this.colorPreview) {
      this.colorPreview.style.background = color;
    }
    if (this.solidColorInput) {
      this.solidColorInput.value = color;
    }
  }

  // ---------- Цвета своего градиента: сколько угодно (минимум 2) ----------
  getGradientColors() {
    let colors;
    try {
      colors = JSON.parse(localStorage.getItem("customGradientColors"));
    } catch (e) {
      colors = null;
    }
    if (!Array.isArray(colors)) colors = [];
    colors = colors.filter((c) => typeof c === "string" && this.validateHexColor(c));
    const defaults = ["#6750a4", "#b583da", "#e67bd6", "#ff8da1"];
    if (colors.length === 0) colors = defaults.slice();
    while (colors.length < 2) colors.push(defaults[colors.length] || "#b583da");
    return colors;
  }

  saveGradientColors(colors) {
    localStorage.setItem("customGradientColors", JSON.stringify(colors));
  }

  // Новый цвет — сдвиг оттенка последнего, чтобы сразу выглядело красиво
  nextGradientColor(colors) {
    const last = colors[colors.length - 1] || "#6750a4";
    const full = last.length === 4
      ? "#" + last.slice(1).split("").map((c) => c + c).join("")
      : last;
    const r = parseInt(full.slice(1, 3), 16) / 255;
    const g = parseInt(full.slice(3, 5), 16) / 255;
    const b = parseInt(full.slice(5, 7), 16) / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    const l = (max + min) / 2;
    const d = max - min;
    const sat = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
    if (d !== 0) {
      if (max === r) h = ((g - b) / d) % 6;
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
    }
    h = (h * 60 + 47 + 360) % 360;
    const S = Math.max(0.45, sat);
    const L = Math.min(0.68, Math.max(0.45, l));
    const c = (1 - Math.abs(2 * L - 1)) * S;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = L - c / 2;
    let rgb;
    if (h < 60) rgb = [c, x, 0];
    else if (h < 120) rgb = [x, c, 0];
    else if (h < 180) rgb = [0, c, x];
    else if (h < 240) rgb = [0, x, c];
    else if (h < 300) rgb = [x, 0, c];
    else rgb = [c, 0, x];
    return (
      "#" +
      rgb
        .map((v) => Math.round((v + m) * 255).toString(16).padStart(2, "0"))
        .join("")
    );
  }

  renderGradientColors(enterIndex = -1) {
    const grid = this.gradientColorsGrid;
    if (!grid) return;
    const colors = this.getGradientColors();
    const canRemove = colors.length > 2;

    // Переиспользуем существующие элементы, чтобы у остальных не перезапускалась анимация
    const items = Array.from(grid.querySelectorAll(".gradient-color-item"));
    while (items.length > colors.length) items.pop().remove();
    while (items.length < colors.length) {
      const item = document.createElement("div");
      item.className = "gradient-color-item";
      item.innerHTML =
        '<div class="gradient-color-preview" title="Нажмите для выбора цвета"></div>' +
        '<span class="gradient-color-label"></span>' +
        '<button type="button" class="gradient-color-remove" title="Удалить цвет" aria-label="Удалить цвет">' +
        '<span class="material-symbols-rounded">close</span></button>';
      grid.appendChild(item);
      items.push(item);
    }
    items.forEach((item, i) => {
      item.classList.remove("is-leaving");
      item.dataset.index = String(i);
      item.querySelector(".gradient-color-preview").style.background = colors[i];
      item.querySelector(".gradient-color-label").textContent = "Цвет " + (i + 1);
      const rm = item.querySelector(".gradient-color-remove");
      rm.disabled = !canRemove;
      item.classList.toggle("is-locked", !canRemove);
    });
    if (enterIndex >= 0 && items[enterIndex]) {
      const el = items[enterIndex];
      el.classList.remove("is-entering");
      void el.offsetWidth;
      el.classList.add("is-entering");
      el.addEventListener(
        "animationend",
        () => el.classList.remove("is-entering"),
        { once: true },
      );
    }
    this.updateGradientPreview();
  }

  addGradientColor() {
    const colors = this.getGradientColors();
    colors.push(this.nextGradientColor(colors));
    this.saveGradientColors(colors);
    this.renderGradientColors(colors.length - 1);
    if (localStorage.getItem("backgroundType") === "custom-gradient") {
      this.applyBackgroundSettings();
    }
  }

  removeGradientColor(index) {
    const colors = this.getGradientColors();
    if (colors.length <= 2 || index < 0 || index >= colors.length) return;
    const grid = this.gradientColorsGrid;
    const el = grid && grid.querySelector(`.gradient-color-item[data-index="${index}"]`);
    const commit = () => {
      colors.splice(index, 1);
      this.saveGradientColors(colors);
      this.renderGradientColors();
      if (localStorage.getItem("backgroundType") === "custom-gradient") {
        this.applyBackgroundSettings();
      }
    };
    const off = document.body.classList.contains("no-animations");
    if (!el || off) return commit();
    // Обратная анимация появления: элемент «схлопывается», и только потом удаляется
    if (el.classList.contains("is-leaving")) return;
    el.classList.add("is-leaving");
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      commit();
    };
    el.addEventListener("animationend", finish, { once: true });
    setTimeout(finish, 420);
  }

  changeGradientColor(index, color) {
    if (!this.validateHexColor(color)) {
      return;
    }

    const gradientColors = this.getGradientColors();
    gradientColors[index] = color;
    this.saveGradientColors(gradientColors);

    this.renderGradientColors();

    // Применяем настройки если выбран кастомный градиент
    if (localStorage.getItem("backgroundType") === "custom-gradient") {
      this.applyBackgroundSettings();
    }
  }

  updateGradientPreview() {
    if (!this.gradientPreview) return;
    const gradientColors = this.getGradientColors();
    this.gradientPreview.style.background = `linear-gradient(90deg, ${gradientColors.join(", ")})`;
  }

  validateHexColor(color) {
    return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
  }

  applyBackgroundSettings() {
    const backgroundType = localStorage.getItem("backgroundType") || "gradient";

    switch (backgroundType) {
      case "solid":
        this.applySolidBackground();
        break;
      case "custom-gradient":
        this.applyCustomGradientBackground();
        break;
      case "gradient":
      default:
        this.applyDefaultGradientBackground();
        break;
    }
  }

  // ---------- Фон: слои с плавной сменой ----------
  // Каждое изменение фона — это новый слой поверх старого, который «раскрывается»
  // кругом от места нажатия. Градиент не сбрасывается в начало (раньше
  // `background:` в body.style перезапускал его — отсюда рывки).
  getBgStack() {
    let stack = document.getElementById("bgStack");
    if (!stack) {
      stack = document.createElement("div");
      stack.id = "bgStack";
      stack.setAttribute("aria-hidden", "true");
      document.body.prepend(stack);
    }
    return stack;
  }

  setBackgroundLayer(spec) {
    const stack = this.getBgStack();
    const sig = JSON.stringify(spec);
    const layers = Array.from(stack.querySelectorAll(".bg-layer"));
    const top = layers[layers.length - 1];
    if (top && top.dataset.sig === sig) return;

    const layer = document.createElement("div");
    layer.className = "bg-layer" + (spec.animated ? " is-animated" : "");
    layer.dataset.sig = sig;
    layer.style.background = spec.background;
    layer.style.backgroundSize = spec.size;
    if (spec.animated) {
      // единая фаза для всех слоёв — градиент не «перескакивает» при смене
      const phase = (document.timeline.currentTime || performance.now()) % 20000;
      layer.style.setProperty("--bg-phase", `-${Math.round(phase)}ms`);
    }

    const animate =
      top &&
      !document.body.classList.contains("no-animations") &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (!animate) {
      stack.replaceChildren(layer);
      return;
    }

    // Прошлую незаконченную смену не обрываем: слои, которые ещё «раскрываются»,
    // остаются как подложка (иначе в нераскрытых местах проглядывал бы запасной фон
    // страницы — градиент «не показывался»). Убираем только лишние уже готовые слои,
    // оставив самый верхний из них как основу.
    const ready = layers.filter((l) => !l.classList.contains("bg-enter"));
    ready.slice(0, -1).forEach((l) => l.remove());
    const p = this._lastPointer || {
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    };
    layer.style.setProperty("--bg-x", Math.round(p.x) + "px");
    layer.style.setProperty("--bg-y", Math.round(p.y) + "px");
    layer.classList.add("bg-enter");
    stack.appendChild(layer);

    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      // Слой уже убрали (быстрая смена подряд) — ничего не трогаем. Раньше здесь
      // сравнивалось положение отсоединённого слоя, и стопка могла очиститься целиком.
      if (!layer.isConnected) return;
      layer.classList.remove("bg-enter");
      const all = Array.from(stack.querySelectorAll(".bg-layer"));
      all.slice(0, all.indexOf(layer)).forEach((l) => l.remove());
    };
    layer.addEventListener(
      "animationend",
      (e) => {
        if (e.animationName === "bgReveal") finish();
      },
      { once: false },
    );
    setTimeout(finish, 1300);
  }

  applySolidBackground() {
    const solidColor =
      localStorage.getItem("solidBackgroundColor") || "#6750a4";
    this.setBackgroundLayer({
      background: solidColor,
      size: "auto",
      animated: false,
    });
  }

  applyCustomGradientBackground() {
    const gradientString = `linear-gradient(-45deg, ${this.getGradientColors().join(", ")})`;
    this.setBackgroundLayer({
      background: gradientString,
      size: "400% 400%",
      animated: true,
    });
  }

  applyDefaultGradientBackground() {
    this.setBackgroundLayer({
      background:
        "linear-gradient(-45deg, #6750a4, #b583da, #e67bd6, #ff8da1, #4a3a8f, #9a67ea, #8e24aa, #ba68c8)",
      size: "400% 400%",
      animated: true,
    });
  }

  loadBackgroundSettings() {
    // Загружаем настройки фона
    const backgroundType = localStorage.getItem("backgroundType") || "gradient";
    const solidColor =
      localStorage.getItem("solidBackgroundColor") || "#6750a4";

    // Устанавливаем значения в UI
    if (this.backgroundTypeSelect) {
      this.backgroundTypeSelect.value = backgroundType;
    }

    if (this.solidColorInput) {
      this.solidColorInput.value = solidColor;
    }

    if (this.colorPreview) {
      this.colorPreview.style.background = solidColor;
    }

    // Цвета градиента и его превью
    this.renderGradientColors();

    // Показываем/скрываем соответствующие элементы
    this.toggleBackgroundSettingsVisibility(backgroundType);

    // Применяем настройки
    this.applyBackgroundSettings();
  }

  setupModsEventListeners() {
    if (this.applyModBtn) {
      this.applyModBtn.addEventListener("click", () =>
        this.requestModApplication(),
      );
    }

    if (this.clearModBtn) {
      this.clearModBtn.addEventListener("click", () => this.clearModCode());
    }

    if (this.confirmModYes) {
      this.confirmModYes.addEventListener("click", () =>
        this.executePendingMod(),
      );
    }

    if (this.confirmModNo) {
      this.confirmModNo.addEventListener("click", () =>
        this.cancelModApplication(),
      );
    }

    if (this.modConfirmationModal) {
      this.modConfirmationModal.addEventListener("click", (e) => {
        if (e.target === this.modConfirmationModal) {
          this.cancelModApplication();
        }
      });
    }

    this.settingsBtn.addEventListener("click", () => {
      setTimeout(() => {
        this.loadSavedMod();
        this.updateAutoLoadList();
        this.loadSoundOptions(); // Обновляем список звуков при открытии настроек
      }, 100);
    });
  }

  setupTabs() {
    this.tabButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const tab = button.dataset.tab;
        this.switchTab(tab);
      });
    });
  }

  switchTab(tab, immediate = false) {
    const prevTab = this.currentTab;
    this.tabButtons.forEach((btn) => btn.classList.remove("active"));
    const activeButton = Array.from(this.tabButtons).find(
      (btn) => btn.dataset.tab === tab,
    );
    if (activeButton) activeButton.classList.add("active");
    this.currentTab = tab;

    const token = (this._tabToken = (this._tabToken || 0) + 1);
    const order = Array.from(this.tabButtons).map((b) => b.dataset.tab);
    const dir = order.indexOf(tab) >= order.indexOf(prevTab) ? 1 : -1;
    const mobile = window.matchMedia("(max-width: 768px)").matches;
    const dist = mobile ? 56 : 24;
    const animate =
      !immediate &&
      prevTab !== undefined &&
      prevTab !== tab &&
      this.settingsPopup.classList.contains("active") &&
      !document.body.classList.contains("no-animations");

    const shows = (c) => tab === "all" || c.dataset.category === tab;

    const reveal = () => {
      if (token !== this._tabToken) return;
      this.settingCategories.forEach((category) => {
        if (shows(category)) {
          const wasHidden = category.classList.contains("hidden");
          category.classList.remove("hidden");
          // Новая страница въезжает со стороны направления (translate — не конфликтует с m3eRise)
          if (animate && wasHidden && category.animate) {
            category.animate(
              [
                { translate: `${dir * dist}px 0` },
                { translate: "0 0" },
              ],
              { duration: 420, easing: "cubic-bezier(0.2, 0, 0, 1)" },
            );
          }
        } else {
          category.classList.add("hidden");
        }
      });
      if (tab === "mods") this.updateAutoLoadList();
    };

    const out = Array.from(this.settingCategories).filter(
      (c) => !shows(c) && !c.classList.contains("hidden"),
    );
    if (!animate || out.length === 0 || !out[0].animate) {
      reveal();
      return;
    }
    // Обратная анимация: уходящая страница уезжает в противоположную сторону
    let pending = out.length;
    out.forEach((c) => {
      const a = c.animate(
        [
          { translate: "0 0", opacity: 1 },
          { translate: `${-dir * dist}px 0`, opacity: 0 },
        ],
        { duration: 170, easing: "cubic-bezier(0.3, 0, 1, 1)", fill: "forwards" },
      );
      const done = () => {
        a.cancel();
        if (--pending === 0) reveal();
      };
      a.onfinish = done;
      a.oncancel = () => {};
    });
  }

  openPopup() {
    if (this.isClosing) return;

    this.settingsPopup.classList.add("active");
    document.body.style.overflow = "hidden";

    this.switchTab("all", true);
  }

  closePopupWindow() {
    if (this.isClosing) return;

    this.isClosing = true;
    this.settingsPopup.classList.add("popup-closing");

    setTimeout(() => {
      this.settingsPopup.classList.remove("active", "popup-closing");
      document.body.style.overflow = "";
      this.isClosing = false;
    }, 400);
  }

  toggleDarkTheme() {
    const isDark = this.darkThemeToggle.checked;
    document.documentElement.setAttribute(
      "data-theme",
      isDark ? "dark" : "light",
    );
    localStorage.setItem("darkTheme", isDark);
  }

  toggleSound() {
    if (!this.soundToggle) return;
    const isSoundOn = this.soundToggle.checked;
    localStorage.setItem("soundEnabled", isSoundOn);

    if (clicker && clicker.soundPool) {
      clicker.soundPool.forEach((audio) => {
        audio.volume = isSoundOn ? 0.7 : 0;
      });
    }
  }

  toggleAnimations() {
    const animationsEnabled = this.animationsToggle.checked;
    localStorage.setItem("animationsEnabled", animationsEnabled);
    this.applyOptimizationSettings();
  }

  toggleParticles() {
    const particlesEnabled = this.particlesToggle.checked;
    localStorage.setItem("particlesEnabled", particlesEnabled);
    this.applyOptimizationSettings();
  }

  toggleGradient() {
    const gradientEnabled = this.gradientToggle.checked;
    localStorage.setItem("gradientEnabled", gradientEnabled);
    this.applyOptimizationSettings();
  }

  applyOptimizationSettings() {
    const animationsEnabled =
      localStorage.getItem("animationsEnabled") !== "false";
    const particlesEnabled =
      localStorage.getItem("particlesEnabled") !== "false";
    const gradientEnabled = localStorage.getItem("gradientEnabled") !== "false";

    if (animationsEnabled) {
      document.body.classList.remove("no-animations");
    } else {
      document.body.classList.add("no-animations");
    }

    // Градиент ставится на паузу, а не сбрасывается — без рывка при переключении
    this.getBgStack().classList.toggle("is-paused", !gradientEnabled);
  }

  resetAllData() {
    const resetQuestion =
      "Вы уверены, что хотите сбросить все данные? Это действие нельзя отменить.";
    // Собственное окно подтверждения (dialogs.js); системный confirm — запасной вариант
    const askReset = window.appDialog
      ? window.appDialog.confirm(resetQuestion, {
          title: "Сбросить все данные?",
          icon: "delete_forever",
          okText: "Сбросить",
          cancelText: "Отмена",
          danger: true,
        })
      : Promise.resolve(confirm(resetQuestion));

    askReset.then((confirmedReset) => {
    if (confirmedReset) {
      if (clicker) {
        clicker.resetData();
      }
      localStorage.removeItem("clickCount");

      // Сбрасываем настройки фона
      localStorage.removeItem("backgroundType");
      localStorage.removeItem("solidBackgroundColor");
      localStorage.removeItem("customGradientColors");
      this.loadBackgroundSettings();

      // Сбрасываем акцентный цвет
      localStorage.removeItem("accentColor");
      localStorage.removeItem("accentColorName");
      this.loadAccentColor();

      this.resetDataBtn.classList.add("animate-shake");
      setTimeout(() => {
        this.resetDataBtn.classList.remove("animate-shake");
      }, 500);

      // Обновляем интерфейс звуков
      setTimeout(() => {
        this.loadSoundOptions();
      }, 100);
    }
    });
  }

  loadSettings() {
    const darkTheme = localStorage.getItem("darkTheme") === "true";
    this.darkThemeToggle.checked = darkTheme;
    document.documentElement.setAttribute(
      "data-theme",
      darkTheme ? "dark" : "light",
    );

    if (this.soundToggle) {
      const soundEnabled = localStorage.getItem("soundEnabled") !== "false";
      this.soundToggle.checked = soundEnabled;
    }

    if (this.animationsToggle) {
      const animationsEnabled =
        localStorage.getItem("animationsEnabled") !== "false";
      this.animationsToggle.checked = animationsEnabled;
    }
    if (this.particlesToggle) {
      const particlesEnabled =
        localStorage.getItem("particlesEnabled") !== "false";
      this.particlesToggle.checked = particlesEnabled;
    }
    if (this.gradientToggle) {
      const gradientEnabled =
        localStorage.getItem("gradientEnabled") !== "false";
      this.gradientToggle.checked = gradientEnabled;
    }

    this.applyOptimizationSettings();
  }

  parseModMetadata(code) {
    const metadata = {
      name: "Пользовательский мод",
      author: "Неизвестный автор",
      description: "Без описания",
      version: "1.0",
      hasMetadata: false,
      codePreview: code.length > 100 ? code.substring(0, 100) + "..." : code,
    };

    try {
      const lines = code.split("\n");
      let inMetadata = false;

      for (let i = 0; i < Math.min(lines.length, 20); i++) {
        const line = lines[i].trim();

        if (line === "// ==Mod==") {
          inMetadata = true;
          metadata.hasMetadata = true;
          continue;
        }

        if (line === "// ==/Mod==") {
          break;
        }

        if (inMetadata) {
          const nameMatch = line.match(/\/\/\s*@name\s+(.+)/i);
          const authorMatch = line.match(/\/\/\s*@author\s+(.+)/i);
          const descriptionMatch = line.match(/\/\/\s*@description\s+(.+)/i);
          const versionMatch = line.match(/\/\/\s*@version\s+(.+)/i);

          if (nameMatch) metadata.name = nameMatch[1].trim();
          if (authorMatch) metadata.author = authorMatch[1].trim();
          if (descriptionMatch)
            metadata.description = descriptionMatch[1].trim();
          if (versionMatch) metadata.version = versionMatch[1].trim();
        }
      }
    } catch (error) {
      console.warn("Ошибка парсинга мета-информации:", error);
    }

    return metadata;
  }

  showCodePreview(code) {
    if (!this.codePreview) return;

    const metadata = this.parseModMetadata(code);

    if (metadata.hasMetadata) {
      this.codePreview.innerHTML = `
                <div class="mod-metadata-preview">
                    <h4>📋 Информация о моде:</h4>
                    <div><strong>Название:</strong> ${metadata.name}</div>
                    <div><strong>Автор:</strong> ${metadata.author}</div>
                    <div><strong>Версия:</strong> ${metadata.version}</div>
                    <div><strong>Описание:</strong> ${metadata.description}</div>
                </div>
            `;
    } else {
      this.codePreview.textContent = metadata.codePreview;
    }
  }

  requestModApplication() {
    const code = this.customModCode.value.trim();

    if (!code) {
      this.showModStatus("Введите код мода", "error");
      return;
    }

    this.pendingModCode = code;
    this.showCodePreview(code);
    this.showConfirmationModal();
  }

  showConfirmationModal() {
    if (this.modConfirmationModal) {
      this.modConfirmationModal.classList.add("active");
      document.body.style.overflow = "hidden";
    }
  }

  hideConfirmationModal() {
    if (this.modConfirmationModal) {
      this.modConfirmationModal.classList.remove("active");
      document.body.style.overflow = "";
    }
  }

  executePendingMod() {
    if (!this.pendingModCode) {
      this.hideConfirmationModal();
      return;
    }

    try {
      const result = this.executeModCode(this.pendingModCode);

      if (result && result.success) {
        this.showModStatus("Мод успешно применен!", "success");
        this.saveModCode(this.pendingModCode);

        // Сохраняем мод для автозагрузки если включена галочка
        if (this.autoLoadToggle && this.autoLoadToggle.checked) {
          this.saveAutoLoadMod(this.pendingModCode);
        }
      } else if (result && result.error) {
        this.showModStatus(`Ошибка выполнения: ${result.error}`, "error");
      } else {
        this.showModStatus("Мод применен", "info");
        this.saveModCode(this.pendingModCode);

        // Сохраняем мод для автозагрузки если включена галочка
        if (this.autoLoadToggle && this.autoLoadToggle.checked) {
          this.saveAutoLoadMod(this.pendingModCode);
        }
      }
    } catch (error) {
      this.showModStatus(`Ошибка: ${error.message}`, "error");
      console.error("Mod execution error:", error);
    }

    this.pendingModCode = null;
    this.hideConfirmationModal();
  }

  cancelModApplication() {
    this.pendingModCode = null;
    this.hideConfirmationModal();
    this.showModStatus("Выполнение кода отменено", "info");
  }

  executeModCode(code) {
    const safeGlobals = {
      clicker: clicker,
      storeManager: window.storeManager,
      skinsManager: window.skinsManager,
      storeItems: typeof storeItems !== "undefined" ? storeItems : [],
      localStorage: localStorage,
      console: console,
    };

    try {
      const modFunction = new Function(
        ...Object.keys(safeGlobals),
        `
                try {
                    ${code}
                    return { success: true };
                } catch (e) {
                    return { success: false, error: e.message };
                }
            `,
      );

      const result = modFunction(...Object.values(safeGlobals));
      return result;
    } catch (error) {
      throw new Error(`Синтаксическая ошибка: ${error.message}`);
    }
  }

  showModStatus(message, type) {
    if (!this.modStatus) return;

    this.modStatus.textContent = message;
    this.modStatus.className = `mod-status ${type}`;
    this.modStatus.style.display = "block";

    if (type === "success" || type === "info") {
      setTimeout(() => {
        if (this.modStatus) {
          this.modStatus.style.display = "none";
        }
      }, 3000);
    }
  }

  clearModCode() {
    if (this.customModCode) {
      this.customModCode.value = "";
    }
    if (this.modStatus) {
      this.modStatus.style.display = "none";
    }

    localStorage.removeItem("customModCode");
    this.showModStatus("Код очищен", "info");
  }

  loadSavedMod() {
    const savedCode = localStorage.getItem("customModCode");
    if (savedCode && this.customModCode) {
      this.customModCode.value = savedCode;
    }
  }

  saveModCode(code) {
    localStorage.setItem("customModCode", code);
  }

  // ==================== СИСТЕМА АВТОЗАГРУЗКИ МОДОВ ====================

  saveAutoLoadMod(code) {
    const metadata = this.parseModMetadata(code);
    const modName = metadata.hasMetadata
      ? metadata.name
      : "Пользовательский мод";

    // Генерируем уникальный ID для мода
    const modId =
      "autoload_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);

    // Сохраняем мод в localStorage с метаданными
    const modData = {
      id: modId,
      name: modName,
      code: code,
      metadata: metadata,
      timestamp: Date.now(),
    };

    localStorage.setItem(modId, JSON.stringify(modData));

    // Добавляем ID в список автозагружаемых модов
    const autoLoadList = JSON.parse(
      localStorage.getItem("autoLoadMods") || "[]",
    );
    autoLoadList.push(modId);
    localStorage.setItem("autoLoadMods", JSON.stringify(autoLoadList));

    this.showModStatus(
      `Мод "${modName}" сохранен для автозагрузки! 🔄`,
      "success",
    );
    console.log(`💾 Мод сохранен для автозагрузки: ${modName} (${modId})`);

    // Обновляем список автозагрузки
    this.updateAutoLoadList();
  }

  loadAutoLoadMods() {
    const autoLoadList = JSON.parse(
      localStorage.getItem("autoLoadMods") || "[]",
    );

    if (autoLoadList.length === 0) {
      return;
    }

    console.log(`🔄 Загружаем ${autoLoadList.length} модов с автозагрузкой...`);

    // Запускаем загрузку с небольшой задержкой чтобы игра успела инициализироваться
    setTimeout(() => {
      autoLoadList.forEach((modId, index) => {
        setTimeout(() => {
          this.executeAutoLoadMod(modId);
        }, index * 500); // Задержка между выполнением модов
      });
    }, 2000);
  }

  executeAutoLoadMod(modId) {
    const modDataStr = localStorage.getItem(modId);

    if (!modDataStr) {
      console.warn(`❌ Мод для автозагрузки не найден: ${modId}`);
      this.removeFromAutoLoadList(modId);
      return;
    }

    try {
      const modData = JSON.parse(modDataStr);
      console.log(`🚀 Выполняем автозагрузку мода: ${modData.name} (${modId})`);

      const result = this.executeModCode(modData.code);

      if (result && result.success) {
        console.log(`✅ Мод автозагружен успешно: ${modData.name}`);
      } else if (result && result.error) {
        console.error(
          `❌ Ошибка выполнения автозагрузки мода ${modData.name}:`,
          result.error,
        );
        this.removeFromAutoLoadList(modId);
      } else {
        console.log(`✅ Мод автозагружен: ${modData.name}`);
      }
    } catch (error) {
      console.error(`❌ Критическая ошибка автозагрузки мода ${modId}:`, error);
      this.removeFromAutoLoadList(modId);
    }
  }

  removeFromAutoLoadList(modId) {
    const autoLoadList = JSON.parse(
      localStorage.getItem("autoLoadMods") || "[]",
    );
    const updatedList = autoLoadList.filter((id) => id !== modId);
    localStorage.setItem("autoLoadMods", JSON.stringify(updatedList));

    // Удаляем сам мод из localStorage
    localStorage.removeItem(modId);

    console.log(`🗑️ Мод удален из автозагрузки: ${modId}`);

    // Обновляем список
    this.updateAutoLoadList();
  }

  updateAutoLoadList() {
    const autoLoadListContainer = document.getElementById("autoLoadList");
    if (!autoLoadListContainer) return;

    const autoLoadList = JSON.parse(
      localStorage.getItem("autoLoadMods") || "[]",
    );

    if (autoLoadList.length === 0) {
      autoLoadListContainer.innerHTML =
        '<div class="no-mods-message">Нет модов для автозагрузки</div>';
      return;
    }

    let html = '<div class="auto-load-header">Моды для автозагрузки:</div>';

    autoLoadList.forEach((modId) => {
      const modDataStr = localStorage.getItem(modId);
      if (modDataStr) {
        try {
          const modData = JSON.parse(modDataStr);
          html += `
                        <div class="auto-load-item">
                            <div class="auto-load-info">
                                <strong>${modData.name}</strong>
                                ${modData.metadata.hasMetadata ? `<div class="auto-load-meta">v${modData.metadata.version} • ${modData.metadata.author}</div>` : ""}
                            </div>
                            <button class="auto-load-remove" data-modid="${modId}">🗑️</button>
                        </div>
                    `;
        } catch (e) {
          // Если не удалось распарсить, показываем базовую информацию
          html += `
                        <div class="auto-load-item">
                            <div class="auto-load-info">
                                <strong>Неизвестный мод</strong>
                                <div class="auto-load-meta">Ошибка загрузки</div>
                            </div>
                            <button class="auto-load-remove" data-modid="${modId}">🗑️</button>
                        </div>
                    `;
        }
      }
    });

    autoLoadListContainer.innerHTML = html;

    // Добавляем обработчики для кнопок удаления
    autoLoadListContainer
      .querySelectorAll(".auto-load-remove")
      .forEach((button) => {
        button.addEventListener("click", (e) => {
          const modId = e.target.dataset.modid;
          this.removeFromAutoLoadList(modId);
        });
      });
  }

  // Метод для очистки всех автозагружаемых модов
  clearAllAutoLoadMods() {
    const autoLoadList = JSON.parse(
      localStorage.getItem("autoLoadMods") || "[]",
    );

    autoLoadList.forEach((modId) => {
      localStorage.removeItem(modId);
    });

    localStorage.removeItem("autoLoadMods");
    this.showModStatus("Все автозагружаемые моды очищены! 🗑️", "success");
    console.log("🗑️ Все автозагружаемые моды очищены");

    this.updateAutoLoadList();
  }

  showNotification(message, type = "info") {
    // Создаем уведомление если его нет в DOM
    let notification = document.querySelector(".sound-notification");
    if (!notification) {
      notification = document.createElement("div");
      notification.className = `sound-notification ${type}`;
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
    }

    notification.textContent = message;
    notification.className = `sound-notification ${type}`;

    setTimeout(() => {
      if (notification.parentNode) {
        notification.style.animation = "slideOutRight 0.3s ease-out forwards";
        setTimeout(() => {
          if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
          }
        }, 300);
      }
    }, 3000);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new SettingsManager();
});
