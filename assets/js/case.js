class CaseManager {
  constructor() {
    this.popup = document.getElementById("casePopup");
    this.roulette = document.getElementById("caseRoulette");
    this.track = document.getElementById("caseTrack");
    this.hintEl = document.getElementById("caseHint");
    this.titleEl = document.getElementById("caseTitle");
    this.resultEl = document.getElementById("caseResult");

    this.rarityNames = {
      consumer: "Обычный",
      industrial: "Необычный",
      milspec: "Редкий",
      restricted: "Эпический",
      classified: "Мифический",
      covert: "Легендарный",
      gold: "Золотой",
    };

    this.item = null; // текущий кейс из storeItems
    this.isSpinning = false;
    this.isFinished = false;
    this.isClosing = false;

    this.spinDuration = 6500; // мс
    this.stripLength = 60; // сколько карточек в ленте
    this.winnerIndex = 48; // на какой карточке остановимся
    this.startIndex = 3; // с какой карточки стартуем

    this.onClose = null; // колбэк после закрытия

    this.anim = null; // Web Animation прокрутки ленты
    this.jitterRatio = 0; // небольшой сдвиг внутри рамки (в долях шага)
    this.finalOffset = null; // где лента остановилась (для пересчёта при ресайзе)
    this.mobileMq = window.matchMedia("(max-width: 768px)");

    if (!this.popup) return;
    this.setupEventListeners();
    this.setupResizeHandling();
  }

  // На мобильных рулетка вертикальная (карточки едут сверху вниз)
  isVertical() {
    return this.mobileMq.matches;
  }

  tf(offset) {
    return this.isVertical()
      ? `translateY(${-offset}px)`
      : `translateX(${-offset}px)`;
  }

  // Смена размера окна / поворот экрана / переключение мобильного режима:
  // пересчитываем смещение ленты, чтобы выигрышная карточка оставалась
  // строго под указателем (раньше смещение считалось один раз в пикселях)
  setupResizeHandling() {
    let raf = 0;
    const schedule = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        this.relayout();
      });
    };
    window.addEventListener("resize", schedule);
    window.addEventListener("orientationchange", schedule);
    if (this.mobileMq.addEventListener) {
      this.mobileMq.addEventListener("change", schedule);
    }
    if (window.ResizeObserver && this.roulette) {
      new ResizeObserver(schedule).observe(this.roulette);
    }
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(schedule);
    }
  }

  endOffset() {
    return this.offsetFor(
      this.winnerIndex,
      this.jitterRatio * this.getStep(),
    );
  }

  keyframes() {
    return [
      { transform: this.tf(this.offsetFor(this.startIndex, 0)) },
      { transform: this.tf(this.endOffset()) },
    ];
  }

  relayout() {
    if (!this.popup || !this.popup.classList.contains("active")) return;
    if (!this.track || !this.track.children.length) return;
    if (this.anim && this.isSpinning) {
      // Прокрутка идёт: меняем только геометрию, прогресс (currentTime) сохраняется
      try {
        this.anim.effect.setKeyframes(this.keyframes());
      } catch (e) {
        /* ничего: лента доедет по старым ключевым кадрам */
      }
      return;
    }
    if (this.finalOffset !== null) {
      // Остановились: заново ставим ленту на выигрышную карточку
      this.finalOffset = this.endOffset();
      this.track.style.transform = this.tf(this.finalOffset);
    } else {
      this.track.style.transform = this.tf(
        this.offsetFor(this.startIndex, 0),
      );
    }
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
      <div class="case-card-rarity">${this.rarityNames[drop.rarity] || ""}</div>
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
    return this.isVertical()
      ? b.offsetTop - a.offsetTop
      : b.offsetLeft - a.offsetLeft;
  }

  // Смещение ленты, чтобы центр карточки index (+jitter) был под указателем
  offsetFor(index, jitter) {
    const step = this.getStep();
    const center =
      (this.isVertical() ? this.roulette.clientHeight : this.roulette.clientWidth) / 2;
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

    if (this.anim) {
      this.anim.cancel();
      this.anim = null;
    }
    this.finalOffset = null;
    this.jitterRatio = 0;

    this.hintEl.textContent = "";
    this.hintEl.classList.remove("show");
    this.resultEl.innerHTML = "";
    this.resultEl.className = "case-result";
    if (this.titleEl) {
      this.titleEl.innerHTML = "";
      const img = document.createElement("img");
      img.src = `assets/images/${item.image}`;
      img.alt = "";
      img.draggable = false;
      if (item.imageFilter) img.style.filter = item.imageFilter;
      this.titleEl.appendChild(img);
      this.titleEl.appendChild(document.createTextNode(item.name));
    }

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
      this.track.style.transform = this.tf(this.offsetFor(this.startIndex, 0));
      void this.track.offsetWidth; // фиксируем стартовую позицию

      // Небольшая пауза, чтобы успела появиться рулетка
      setTimeout(() => this.run(prize), 500);
    });

    return true;
  }

  async run(prize) {
    // Рамка-выделение стоит по центру, поэтому сдвиг небольшой — карточка остаётся внутри рамки
    this.jitterRatio = (Math.random() - 0.5) * 0.16;
    this.track.style.transition = "none";

    // Быстрый старт и резкое замедление без долгого «доползания» в конце.
    // Web Animations: при смене размера окна ключевые кадры обновляются на лету.
    const instant =
      document.body.classList.contains("no-animations") ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.anim = this.track.animate(this.keyframes(), {
      duration: instant ? 1 : this.spinDuration,
      easing: "cubic-bezier(0.165, 0.84, 0.44, 1)",
      fill: "forwards",
    });
    try {
      await this.anim.finished;
    } catch (e) {
      /* отменена (закрыли/пересчитали) */
    }
    this.anim = null;

    // Точно фиксируем ленту на выигрышной карточке
    this.finalOffset = this.endOffset();
    this.track.getAnimations().forEach((a) => a.cancel());
    this.track.style.transition = "none";
    this.track.style.transform = this.tf(this.finalOffset);
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

    // Плашка с выигрышем
    this.resultEl.className = `case-result r-${prize.rarity}`;
    this.resultEl.innerHTML = `<div class="case-result-chip"><span class="coin coin-mid"></span><span>+${this.fmt(prize.coins)}</span><small>${this.rarityNames[prize.rarity] || ""}</small></div>`;

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
      this.finalOffset = null;

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
