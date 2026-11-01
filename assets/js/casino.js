class CasinoManager {
  constructor() {
    // Настройки игры
    this.winChance = 0.3; // шанс выигрыша 30%
    this.winMultiplier = 3; // при выигрыше возвращается ставка x3 (чистая прибыль = ставка x2)
    this.symbols = [
      "assets/images/casino/cat1.png",
      "assets/images/casino/cat2.png",
      "assets/images/casino/cat3.png",
      "assets/images/casino/cat4.png",
    ];
    this.reelDurations = [2000, 2600, 3200]; // время остановки каждого слота, мс
    this.stripLength = 24; // сколько картинок крутится в ленте

    this.popup = document.getElementById("casinoPopup");
    this.openBtn = document.getElementById("casinoBtn");
    this.closeBtn = document.getElementById("closeCasinoPopup");
    this.balanceEl = document.getElementById("casinoBalance");
    this.betInput = document.getElementById("casinoBetInput");
    this.spinBtn = document.getElementById("casinoSpinBtn");
    this.resultEl = document.getElementById("casinoResult");
    this.slotsEl = document.getElementById("casinoSlots");
    this.reels = Array.from(document.querySelectorAll(".casino-reel"));
    this.quickBtns = Array.from(document.querySelectorAll(".casino-bet-quick"));

    this.isSpinning = false;
    this.isClosing = false;
    this.currentSymbols = [0, 1, 2];

    if (!this.popup || !this.openBtn) return;

    this.preloadImages();
    this.renderIdle();
    this.setupEventListeners();
  }

  preloadImages() {
    this.symbols.forEach((src) => {
      const img = new Image();
      img.src = src;
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

    // Только цифры в поле ставки
    this.betInput.addEventListener("input", () => {
      this.betInput.value = this.betInput.value.replace(/\D/g, "");
    });
    this.betInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") this.spin();
    });

    this.spinBtn.addEventListener("click", () => this.spin());

    this.quickBtns.forEach((btn) => {
      btn.addEventListener("click", () => this.quickBet(btn.dataset.bet));
    });
  }

  // ---------- Баланс ----------
  getBalance() {
    return typeof clicker !== "undefined" && clicker ? clicker.count : 0;
  }

  setBalance(value) {
    if (typeof clicker === "undefined" || !clicker) return;
    clicker.count = value;
    clicker.saveCount();
    clicker.updateDisplay();
    if (window.storeManager) window.storeManager.updateBalance();
    this.updateBalanceDisplay();
  }

  updateBalanceDisplay() {
    const balance = this.getBalance();
    this.balanceEl.textContent =
      typeof clicker !== "undefined" && clicker
        ? clicker.addSeparators(String(balance))
        : String(balance);
  }

  // ---------- Открытие / закрытие ----------
  open() {
    if (this.isClosing) return;
    this.popup.classList.add("active");
    document.body.style.overflow = "hidden";
    this.resultEl.textContent = "";
    this.resultEl.className = "casino-result";
    this.slotsEl.classList.remove("win", "lose");
    this.updateBalanceDisplay();
  }

  close() {
    if (this.isClosing || this.isSpinning) return;
    this.isClosing = true;
    this.popup.classList.add("popup-closing");
    setTimeout(() => {
      this.popup.classList.remove("active", "popup-closing");
      document.body.style.overflow = "";
      this.isClosing = false;
    }, 400);
  }

  // ---------- Ставка ----------
  quickBet(type) {
    if (this.isSpinning) return;
    const balance = this.getBalance();
    const current = parseInt(this.betInput.value, 10) || 0;
    let bet = current;

    if (type === "half") bet = Math.floor(current / 2);
    else if (type === "double") bet = current * 2;
    else if (type === "max") bet = balance;

    bet = Math.max(1, Math.min(bet, balance));
    if (balance < 1) bet = 0;
    this.betInput.value = bet > 0 ? String(bet) : "";
  }

  // ---------- Слоты ----------
  randomSymbol() {
    return Math.floor(Math.random() * this.symbols.length);
  }

  buildStrip(reel, imageIndexes) {
    const strip = reel.querySelector(".casino-strip");
    strip.innerHTML = "";
    imageIndexes.forEach((idx) => {
      const img = document.createElement("img");
      img.src = this.symbols[idx];
      img.alt = "";
      img.draggable = false;
      strip.appendChild(img);
    });
    return strip;
  }

  renderIdle() {
    this.reels.forEach((reel, i) => {
      const strip = this.buildStrip(reel, [this.currentSymbols[i]]);
      strip.style.transition = "none";
      strip.style.transform = "translateY(0)";
    });
  }

  // Решаем исход: 30% - выигрыш (3 одинаковых), иначе - не все одинаковые
  rollOutcome() {
    const win = Math.random() < this.winChance;
    let result;

    if (win) {
      const s = this.randomSymbol();
      result = [s, s, s];
    } else {
      do {
        result = [this.randomSymbol(), this.randomSymbol(), this.randomSymbol()];
      } while (result[0] === result[1] && result[1] === result[2]);
    }
    return { win, result };
  }

  spinReel(reel, index, finalSymbol) {
    return new Promise((resolve) => {
      const cell = reel.offsetHeight;

      // Лента: текущая картинка, случайные картинки, финальная
      const items = [this.currentSymbols[index]];
      for (let i = 0; i < this.stripLength; i++) items.push(this.randomSymbol());
      items.push(finalSymbol);

      const strip = this.buildStrip(reel, items);
      strip.style.transition = "none";
      strip.style.transform = "translateY(0)";
      void strip.offsetHeight; // перезапуск анимации

      const duration = this.reelDurations[index];
      reel.classList.add("spinning");
      strip.style.transition = `transform ${duration}ms cubic-bezier(0.15, 0.6, 0.2, 1)`;
      strip.style.transform = `translateY(-${(items.length - 1) * cell}px)`;

      let finished = false;
      const done = () => {
        if (finished) return;
        finished = true;
        reel.classList.remove("spinning");
        this.currentSymbols[index] = finalSymbol;
        // Оставляем в ленте только итоговую картинку (визуально без скачка)
        const s = this.buildStrip(reel, [finalSymbol]);
        s.style.transition = "none";
        s.style.transform = "translateY(0)";
        resolve();
      };

      strip.addEventListener("transitionend", done, { once: true });
      setTimeout(done, duration + 150); // страховка
    });
  }

  setControlsDisabled(disabled) {
    this.spinBtn.disabled = disabled;
    this.betInput.disabled = disabled;
    this.closeBtn.disabled = disabled;
    this.quickBtns.forEach((b) => (b.disabled = disabled));
  }

  showResult(text, type) {
    this.resultEl.className = "casino-result";
    void this.resultEl.offsetWidth;
    this.resultEl.textContent = text;
    if (type) this.resultEl.classList.add(type);
  }

  async spin() {
    if (this.isSpinning) return;

    const balance = this.getBalance();
    const bet = parseInt(this.betInput.value, 10);

    if (!bet || bet < 1) {
      this.showResult("Введите ставку", "lose");
      return;
    }
    if (bet > balance) {
      this.showResult("Недостаточно средств", "lose");
      return;
    }

    this.isSpinning = true;
    this.setControlsDisabled(true);
    this.slotsEl.classList.remove("win", "lose");
    this.showResult("Крутим...", "");

    // Ставка списывается сразу
    this.setBalance(balance - bet);

    const { win, result } = this.rollOutcome();

    await Promise.all(
      this.reels.map((reel, i) => this.spinReel(reel, i, result[i])),
    );

    if (win) {
      const payout = bet * this.winMultiplier;
      this.setBalance(this.getBalance() + payout);
      this.slotsEl.classList.add("win");
      this.showResult(`🎉 Выигрыш! +${payout - bet}`, "win");
    } else {
      this.slotsEl.classList.add("lose");
      this.showResult(`Проигрыш: -${bet}`, "lose");
    }

    this.isSpinning = false;
    this.setControlsDisabled(false);

    // Если баланс стал меньше ставки - подгоняем ставку
    const newBalance = this.getBalance();
    if ((parseInt(this.betInput.value, 10) || 0) > newBalance) {
      this.betInput.value = newBalance > 0 ? String(newBalance) : "";
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  window.casinoManager = new CasinoManager();
});
