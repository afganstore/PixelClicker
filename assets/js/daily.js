/* ==========================================================================
   Ежедневный дроп.
   Нужно заходить каждый день и нажимать «Забрать». Серия из 7 дней:
   каждый день — своя награда, на 7-й день — самая крупная. Пропустил день —
   серия начинается заново. После 7-го дня круг повторяется, а награды
   растут (+25% за каждую пройденную неделю, максимум +200%).
   Прокачка «Ежедневный бонус» из магазина добавляет % к коинам.
   Состояние хранится в localStorage под ключом "dailyDrop".
   ========================================================================== */
class DailyDropManager {
  constructor() {
    this.storageKey = "dailyDrop";

    // Награды по дням серии. cases — кейсы из магазина (id: количество)
    this.rewards = [
      { coins: 100 },
      { coins: 250 },
      { coins: 500, cases: { case_basic: 1 } },
      { coins: 750 },
      { coins: 1500 },
      { coins: 2500, cases: { case_basic: 2 } },
      { coins: 10000, cases: { case_pro: 1 }, big: true },
    ];

    this.popup = document.getElementById("dailyPopup");
    this.openBtn = document.getElementById("dailyBtn");
    this.closeBtn = document.getElementById("closeDailyPopup");
    this.streakEl = document.getElementById("dailyStreak");
    this.gridEl = document.getElementById("dailyGrid");
    this.resultEl = document.getElementById("dailyResult");
    this.claimBtn = document.getElementById("dailyClaimBtn");
    this.infoEl = document.getElementById("dailyInfo");

    this.isClosing = false;
    this._lastClaimable = null;

    if (!this.popup || !this.openBtn) return;

    this.setupEventListeners();
    window.addEventListener("resize", () => this.fitScroll());
    this.updateBadge();
    this._lastClaimable = this.canClaim();

    // Раз в секунду: обратный отсчёт, смена суток, значок на кнопке
    setInterval(() => this.tick(), 1000);
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) this.tick();
    });
  }

  setupEventListeners() {
    this.openBtn.addEventListener("click", () => this.open());
    this.closeBtn.addEventListener("click", () => this.close());

    this.popup.addEventListener("click", (e) => {
      if (e.target === this.popup) this.close();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.popup.classList.contains("active")) {
        this.close();
      }
    });

    this.claimBtn.addEventListener("click", () => this.claim());
  }

  // ---------- Дата ----------
  // Номер локального дня (с учётом часового пояса, без проблем с переводом часов)
  getToday() {
    const d = new Date();
    return Math.floor(
      Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000,
    );
  }

  msUntilNextDay() {
    const now = new Date();
    const next = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1,
      0,
      0,
      0,
      0,
    );
    return Math.max(0, next.getTime() - now.getTime());
  }

  formatTime(ms) {
    const total = Math.ceil(ms / 1000);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    const pad = (n) => String(n).padStart(2, "0");
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
  }

  fmt(n) {
    return typeof clicker !== "undefined" && clicker
      ? clicker.addSeparators(String(n))
      : String(n);
  }

  // ---------- Сохранение ----------
  load() {
    const empty = { lastDay: null, streak: 0, total: 0 };
    try {
      const raw = JSON.parse(localStorage.getItem(this.storageKey) || "null");
      if (!raw || typeof raw !== "object") return empty;
      const lastDay = Number.isFinite(raw.lastDay) ? raw.lastDay : null;
      const streak = Number.isFinite(raw.streak) ? Math.max(0, raw.streak) : 0;
      const total = Number.isFinite(raw.total) ? Math.max(0, raw.total) : 0;
      return { lastDay, streak, total };
    } catch (e) {
      return empty;
    }
  }

  save(state) {
    localStorage.setItem(this.storageKey, JSON.stringify(state));
  }

  reset() {
    localStorage.removeItem(this.storageKey);
    this._lastClaimable = this.canClaim();
    this.updateBadge();
    if (this.popup && this.popup.classList.contains("active")) this.render();
  }

  // ---------- Логика серии ----------
  canClaim() {
    const state = this.load();
    return state.lastDay === null || this.getToday() > state.lastDay;
  }

  // Серия с учётом пропусков: если пропущен хотя бы один день — 0
  getEffectiveStreak(state = this.load()) {
    if (state.lastDay === null) return 0;
    const diff = this.getToday() - state.lastDay;
    if (diff <= 1) return state.streak;
    return 0;
  }

  isStreakBroken(state = this.load()) {
    return (
      state.lastDay !== null &&
      state.streak > 0 &&
      this.getToday() - state.lastDay > 1
    );
  }

  // Какая неделя (круг) у серии с таким номером дня: 0, 1, 2...
  weekOf(streakNumber) {
    return Math.floor(Math.max(0, streakNumber - 1) / 7);
  }

  // Итоговая награда: { coins, cases }
  getReward(dayIndex, week) {
    const base = this.rewards[dayIndex];
    const weekMult = 1 + Math.min(week, 8) * 0.25;
    const bonusPct =
      window.storeManager && window.storeManager.getDailyBonusPercent
        ? window.storeManager.getDailyBonusPercent()
        : 0;
    const coins = Math.round(base.coins * weekMult * (1 + bonusPct / 100));
    return { coins, cases: base.cases || {}, big: !!base.big };
  }

  getCaseName(caseId) {
    if (typeof storeItems !== "undefined" && storeItems) {
      const item = storeItems.find((i) => i.id === caseId && i.type === "case");
      if (item) return item.name;
    }
    return null;
  }

  caseExists(caseId) {
    return this.getCaseName(caseId) !== null;
  }

  // ---------- Открытие / закрытие ----------
  open() {
    if (this.isClosing) return;
    this.popup.classList.add("active");
    document.body.style.overflow = "hidden";
    this.resultEl.textContent = "";
    this.resultEl.className = "daily-result";
    this.render();
  }

  // Полоса прокрутки нужна, только если окно реально не помещается.
  // Из-за дробной высоты (шрифты) браузер иногда показывал её при
  // переполнении на 1px — такие случаи игнорируем.
  fitScroll() {
    const content = this.popup.querySelector(".popup-content");
    if (!content) return;
    // Считаем по offsetHeight, а не по scrollHeight: scrollHeight раздувают
    // transform-анимации дочерних элементов (пульс кнопки, появление карточек)
    let needed = 0;
    Array.from(content.children).forEach((el) => {
      if (!el.classList.contains("daily-burst-layer")) needed += el.offsetHeight;
    });
    const overflow = needed - content.clientHeight;
    content.classList.toggle("scrollable", overflow > 2);
  }

  close() {
    if (this.isClosing) return;
    this.isClosing = true;
    this.popup.classList.add("popup-closing");
    setTimeout(() => {
      this.popup.classList.remove("active", "popup-closing");
      document.body.style.overflow = "";
      this.isClosing = false;
    }, 400);
  }

  // ---------- Отрисовка ----------
  render() {
    const state = this.load();
    const streak = this.getEffectiveStreak(state);
    const claimable = this.canClaim();

    // День, который сейчас «в фокусе»: сегодняшний к получению
    // или уже полученный сегодня
    const focusStreak = claimable ? streak + 1 : streak;
    const week = this.weekOf(focusStreak);
    const focusIndex = (Math.max(1, focusStreak) - 1) % 7;

    // Шапка с серией
    this.streakEl.innerHTML = `
      <span class="material-symbols-rounded">local_fire_department</span>
      <span>Серия: <b>${streak}</b> ${this.plural(streak, "день", "дня", "дней")}</span>
      ${week > 0 ? `<span class="daily-week-badge">Неделя ${week + 1} · +${Math.min(week, 8) * 25}%</span>` : ""}
    `;

    // Карточки 7 дней
    this.gridEl.innerHTML = "";
    for (let i = 0; i < 7; i++) {
      const reward = this.getReward(i, week);
      let status = "locked";
      if (claimable) {
        if (i < focusIndex) status = "claimed";
        else if (i === focusIndex) status = "today";
      } else if (i <= focusIndex) {
        status = "claimed";
      }

      const caseLines = Object.keys(reward.cases)
        .filter((id) => this.caseExists(id))
        .map(
          (id) =>
            `<div class="daily-card-case"><span class="material-symbols-rounded">inventory_2</span>×${reward.cases[id]}</div>`,
        )
        .join("");

      const casePlaceholder =
        !caseLines && !reward.big
          ? '<div class="daily-card-case daily-card-case-empty">&nbsp;</div>'
          : "";

      const card = document.createElement("div");
      card.className = `daily-card ${status}${reward.big ? " big" : ""}`;
      card.dataset.day = String(i + 1);
      card.innerHTML = `
        <div class="daily-card-day">День ${i + 1}</div>
        <div class="daily-card-icon">
          ${status === "claimed" ? '<span class="material-symbols-rounded daily-check">check_circle</span>' : '<span class="coin"></span>'}
        </div>
        <div class="daily-card-coins">${this.fmt(reward.coins)}</div>
        ${caseLines}${casePlaceholder}
      `;
      this.gridEl.appendChild(card);
    }

    // Кнопка и подпись
    this.claimBtn.disabled = !claimable;
    this.claimBtn.textContent = claimable ? "ЗАБРАТЬ" : "ЗАБРАНО";
    this.updateInfo(state, claimable);
    this.fitScroll();
  }

  updateInfo(state = this.load(), claimable = this.canClaim()) {
    if (claimable) {
      this.infoEl.textContent = this.isStreakBroken(state)
        ? "Серия прервалась — начинаем с первого дня. Заходи каждый день!"
        : "Заходи каждый день и забирай награду — не пропускай!";
    } else {
      this.infoEl.textContent = `Следующий дроп через ${this.formatTime(this.msUntilNextDay())}`;
    }
  }

  plural(n, one, few, many) {
    const m10 = n % 10;
    const m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return one;
    if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
    return many;
  }

  // ---------- Получение награды ----------
  claim() {
    if (!this.canClaim()) return;
    if (typeof clicker === "undefined" || !clicker) return;

    const state = this.load();
    const today = this.getToday();

    // Серия продолжается, только если прошлый дроп был вчера
    const continues = state.lastDay !== null && today - state.lastDay === 1;
    const newStreak = continues ? state.streak + 1 : 1;
    const dayIndex = (newStreak - 1) % 7;
    const reward = this.getReward(dayIndex, this.weekOf(newStreak));

    // Сохраняем состояние первым — повторно забрать нельзя
    this.save({
      lastDay: today,
      streak: newStreak,
      total: state.total + 1,
    });

    // Коины
    clicker.count += reward.coins;
    clicker.saveCount();
    clicker.updateDisplay();
    if (window.storeManager) window.storeManager.updateBalance();

    // Кейсы
    const sm = window.storeManager;
    const gotCases = [];
    Object.keys(reward.cases).forEach((id) => {
      if (!sm || !this.caseExists(id)) return;
      const amount = reward.cases[id];
      sm.setCaseCount(id, sm.getCaseCount(id) + amount);
      gotCases.push(`${this.getCaseName(id)} ×${amount}`);
    });

    // Интерфейс
    this._lastClaimable = false;
    this.updateBadge();
    this.render();

    let text = `+${this.fmt(reward.coins)} коинов`;
    if (gotCases.length) text += ` и ${gotCases.join(", ")}`;
    this.resultEl.className = "daily-result";
    void this.resultEl.offsetWidth;
    this.resultEl.innerHTML =
      '<span class="material-symbols-rounded">celebration</span>';
    this.resultEl.appendChild(document.createTextNode(text));
    this.resultEl.classList.add("win");
    this.fitScroll();

    const todayCard = this.gridEl.querySelector(
      `.daily-card[data-day="${dayIndex + 1}"]`,
    );
    if (todayCard) todayCard.classList.add("just-claimed");

    this.burstCoins();
    if (sm) sm.showNotification("Ежедневный дроп получен!", "success");
  }

  // Салют из монеток от кнопки
  burstCoins() {
    if (document.body.classList.contains("no-animations")) return;
    if (localStorage.getItem("particlesEnabled") === "false") return;

    const content = this.popup.querySelector(".popup-content");
    if (!content) return;
    // Отдельный слой с обрезкой, чтобы монетки не создавали полосу прокрутки
    let host = content.querySelector(".daily-burst-layer");
    if (!host) {
      host = document.createElement("div");
      host.className = "daily-burst-layer";
      content.appendChild(host);
    }
    const hostRect = content.getBoundingClientRect();
    const btnRect = this.claimBtn.getBoundingClientRect();
    const cx = btnRect.left - hostRect.left + btnRect.width / 2;
    const cy = btnRect.top - hostRect.top + btnRect.height / 2;

    for (let i = 0; i < 16; i++) {
      const coin = document.createElement("span");
      coin.className = "coin daily-burst-coin";
      const angle = (Math.PI * 2 * i) / 16 + Math.random() * 0.4;
      const dist = 90 + Math.random() * 90;
      coin.style.left = `${cx}px`;
      coin.style.top = `${cy}px`;
      coin.style.setProperty("--dx", `${Math.cos(angle) * dist}px`);
      coin.style.setProperty("--dy", `${Math.sin(angle) * dist - 40}px`);
      host.appendChild(coin);
      coin.addEventListener("animationend", () => coin.remove(), {
        once: true,
      });
      setTimeout(() => coin.remove(), 1400);
    }
  }

  // ---------- Значок на кнопке ----------
  updateBadge() {
    if (!this.openBtn) return;
    const ready = this.canClaim();
    this.openBtn.classList.toggle("daily-ready", ready);
    this.openBtn.title = ready
      ? "Ежедневный дроп — можно забрать!"
      : "Ежедневный дроп";
  }

  tick() {
    const claimable = this.canClaim();
    if (claimable !== this._lastClaimable) {
      // наступил новый день (или данные сбросили)
      this._lastClaimable = claimable;
      this.updateBadge();
      if (this.popup.classList.contains("active")) this.render();
      return;
    }
    if (this.popup.classList.contains("active") && !claimable) {
      this.updateInfo(this.load(), false);
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  window.dailyDrop = new DailyDropManager();
});
