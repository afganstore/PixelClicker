class CaseManager {
  constructor() {
    this.popup = document.getElementById("casePopup");
    this.roulette = document.getElementById("caseRoulette");
    this.track = document.getElementById("caseTrack");
    this.hintEl = document.getElementById("caseHint");

    this.item = null; // текущий кейс из storeItems
    this.isSpinning = false;
    this.isFinished = false;
    this.isClosing = false;

    this.spinDuration = 6500; // мс
    this.stripLength = 60; // сколько карточек в ленте
    this.winnerIndex = 48; // на какой карточке остановимся
    this.startIndex = 3; // с какой карточки стартуем

    this.onClose = null; // колбэк после закрытия

    if (!this.popup) return;
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Закрыть можно только после остановки рулетки
    this.popup.addEventListener("click", () => this.close());

    // Escape: закрываем только кейс, всё под ним не трогаем
    document.addEventListener(
      "keydown",
      (e) => {
        if (e.key === "Escape" && this.popup.classList.contains("active")) {
          e.stopImmediatePropagation();
          this.close();
        }
      },
      true,
    );
  }

  fmt(n) {
    return typeof clicker !== "undefined" && clicker
      ? clicker.addSeparators(String(n))
      : String(n);
  }

  // ---------- Дроп ----------
  getDrops() {
    return this.item && this.item.drops ? this.item.drops : [];
  }

  getTotalWeight() {
    return this.getDrops().reduce((sum, d) => sum + d.weight, 0);
  }

  pickDrop() {
    const drops = this.getDrops();
    let r = Math.random() * this.getTotalWeight();
    for (const d of drops) {
      r -= d.weight;
      if (r <= 0) return d;
    }
    return drops[drops.length - 1];
  }

  // ---------- Лента ----------
  createCard(drop) {
    const card = document.createElement("div");
    card.className = `case-card r-${drop.rarity}`;
    card.innerHTML = `
      <div class="coin coin-big"></div>
      <div class="case-card-amount">${this.fmt(drop.coins)}</div>
    `;
    return card;
  }

  buildTrack(drops) {
    this.track.innerHTML = "";
    drops.forEach((d) => this.track.appendChild(this.createCard(d)));
  }

  getStep() {
    const a = this.track.children[0];
    const b = this.track.children[1];
    if (!a || !b) return 200;
    return b.offsetLeft - a.offsetLeft;
  }

  // Смещение ленты, чтобы центр карточки index (+jitter) был под указателем
  offsetFor(index, jitter) {
    const step = this.getStep();
    const center = this.roulette.clientWidth / 2;
    return index * step + step / 2 + jitter - center;
  }

  // ---------- Открытие ----------
  // Забирает один кейс из инвентаря и сразу крутит рулетку на весь экран
  open(itemId, onClose) {
    if (this.isSpinning || this.isClosing || !this.popup) return false;
    if (typeof storeItems === "undefined" || !storeItems) return false;
    if (!window.storeManager) return false;

    const item = storeItems.find((i) => i.id === itemId && i.type === "case");
    if (!item) return false;

    const count = window.storeManager.getCaseCount(itemId);
    if (count < 1) return false;

    this.item = item;
    this.onClose = onClose || null;
    this.isSpinning = true;
    this.isFinished = false;

    // Кейс тратится сразу
    window.storeManager.setCaseCount(itemId, count - 1);

    // Приз определяем заранее и сразу записываем в сохранение,
    // чтобы закрытие вкладки посреди прокрутки ничего не ломало.
    // На экране баланс обновится после остановки.
    const prize = this.pickDrop();
    if (typeof clicker !== "undefined" && clicker) {
      clicker.count += prize.coins;
      clicker.saveCount();
    }

    this.hintEl.textContent = "";
    this.hintEl.classList.remove("show");

    this.popup.classList.remove("popup-closing");
    this.popup.classList.add("active");
    document.body.style.overflow = "hidden";

    // Строим ленту после показа, чтобы измерить ширину
    requestAnimationFrame(() => {
      const drops = [];
      for (let i = 0; i < this.stripLength; i++) drops.push(this.pickDrop());
      drops[this.winnerIndex] = prize;
      this.track.classList.remove("done");
      this.buildTrack(drops);

      this.track.style.transition = "none";
      this.track.style.transform = `translateX(${-this.offsetFor(this.startIndex, 0)}px)`;
      void this.track.offsetWidth; // перезапуск анимации

      // Небольшая пауза, чтобы успела появиться рулетка
      setTimeout(() => this.run(prize), 500);
    });

    return true;
  }

  async run(prize) {
    // Останавливаемся уверенно внутри карточки, не у самого края
    const jitter = (Math.random() - 0.5) * this.getStep() * 0.5;
    const endOffset = this.offsetFor(this.winnerIndex, jitter);

    // Быстрый старт и резкое замедление без долгого «доползания» в конце
    this.track.style.transition = `transform ${this.spinDuration}ms cubic-bezier(0.165, 0.84, 0.44, 1)`;
    this.track.style.transform = `translateX(${-endOffset}px)`;

    await new Promise((resolve) => {
      let finished = false;
      const done = () => {
        if (finished) return;
        finished = true;
        this.track.removeEventListener("transitionend", onEnd);
        resolve();
      };
      // Реагируем только на саму ленту, а не на всплывающие события карточек
      const onEnd = (e) => {
        if (e.target === this.track && e.propertyName === "transform") done();
      };
      this.track.addEventListener("transitionend", onEnd);
      setTimeout(done, this.spinDuration + 300); // страховка
    });

    // Точно фиксируем ленту на выигрышной карточке
    this.track.style.transition = "none";
    this.track.style.transform = `translateX(${-endOffset}px)`;
    void this.track.offsetWidth;

    // Подсвечиваем выигрышную карточку, остальные приглушаем
    if (this.track.children[this.winnerIndex]) {
      this.track.children[this.winnerIndex].classList.add("winner");
    }
    this.track.classList.add("done");

    // Обновляем баланс на экране
    if (typeof clicker !== "undefined" && clicker) {
      clicker.updateDisplay();
      if (window.storeManager) window.storeManager.updateBalance();
    }

    this.isSpinning = false;
    this.isFinished = true;
    this.hintEl.textContent = "Нажми, чтобы закрыть";
    this.hintEl.classList.add("show");
  }

  close() {
    if (!this.isFinished || this.isClosing) return;
    this.isClosing = true;
    this.popup.classList.add("popup-closing");
    setTimeout(() => {
      this.popup.classList.remove("active", "popup-closing");
      this.isClosing = false;
      this.isFinished = false;

      // Не снимаем блокировку прокрутки, если под кейсом открыт другой popup
      const stillOpen = document.querySelector(
        ".inventory-popup.active, .store-popup.active",
      );
      if (!stillOpen) document.body.style.overflow = "";

      const cb = this.onClose;
      this.onClose = null;
      if (typeof cb === "function") cb();
    }, 400);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  window.caseManager = new CaseManager();
});
