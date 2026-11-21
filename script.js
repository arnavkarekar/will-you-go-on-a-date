(() => {
  const scene = document.getElementById("scene");
  const envelope = document.getElementById("envelope");
  const letter = document.getElementById("letter");
  const flap = document.querySelector(".env-flap");
  const seal = document.querySelector(".wax-seal");
  const wrap = document.getElementById("envelope-wrap");
  const peekLines = document.querySelector(".letter-peek-lines");
  const salutation = document.querySelector(".letter-salutation");
  const yesBtn = document.getElementById("yes-btn");
  const noBtn = document.getElementById("no-btn");
  const buttonRow = document.getElementById("button-row");
  const coverSticker = document.getElementById("cover-sticker");
  const yesScreen = document.getElementById("yes-screen");
  const invitation = document.getElementById("invitation");

  let noClicks = 0;
  let opened = false;

  const DODGE_UNTIL = 3;

  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  function animate({ duration, update, done }) {
    const start = performance.now();
    let finished = false;

    function finish() {
      if (finished) return;
      finished = true;
      window.clearInterval(interval);
      update(1);
      if (done) done();
    }

    function tick(now) {
      const t = Math.min(1, (now - start) / duration);
      update(t);
      if (t >= 1) finish();
    }

    // Interval backup so motion still runs if rAF is throttled
    const interval = window.setInterval(() => tick(performance.now()), 32);
    requestAnimationFrame(function frame(now) {
      tick(now);
      if (!finished) requestAnimationFrame(frame);
    });
  }

  function openLetter() {
    if (opened) return;
    opened = true;

    envelope.setAttribute("aria-disabled", "true");
    envelope.tabIndex = -1;
    scene.classList.add("is-opening");

    // Phase 1: flap opens + seal lifts, letter peeks
    animate({
      duration: 700,
      update: (t) => {
        const e = easeOutCubic(t);
        flap.style.transform = `scaleY(${1 - e})`;
        flap.style.opacity = String(1 - e);
        seal.style.opacity = String(1 - e);
        seal.style.top = `${42 - 28 * e}%`;
        seal.style.transform = `translate(-${50 - 15 * e}%, -50%) scale(${1 - 0.1 * e}) rotate(${-22 * e}deg)`;
        letter.style.opacity = String(Math.min(1, t * 2.2));
        // Stay deep in the pocket while the flap opens
        letter.style.transform = `translateY(${72 - 30 * e}%)`;
        if (peekLines) peekLines.style.opacity = String(Math.min(1, t * 1.8));
        if (salutation) salutation.style.opacity = String(Math.min(1, t * 1.5));
      },
      done: () => {
        scene.classList.add("is-open");
        wrap.style.marginTop = `${Math.min(240, Math.max(150, window.innerHeight * 0.3))}px`;

        // Phase 2: letter slides out the top of the envelope
        animate({
          duration: 1300,
          update: (t) => {
            const e = easeInOutCubic(t);
            letter.style.opacity = "1";
            // From tucked in the pocket → sticking out above
            letter.style.transform = `translateY(${42 - 108 * e}%)`;
          },
          done: () => {
            // Phase 3: hold, then expand into the readable letter
            window.setTimeout(() => {
              letter.style.opacity = "";
              letter.style.transform = "";
              flap.style.transform = "";
              flap.style.opacity = "";
              seal.style.opacity = "";
              seal.style.top = "";
              seal.style.transform = "";
              wrap.style.marginTop = "";
              if (peekLines) peekLines.style.opacity = "";
              if (salutation) salutation.style.opacity = "";

              scene.classList.add("is-reading");
              letter.setAttribute("aria-hidden", "false");
              envelope.removeAttribute("role");
              envelope.removeAttribute("aria-label");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }, 450);
          },
        });
      },
    });
  }

  envelope.addEventListener("click", openLetter);
  envelope.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openLetter();
    }
  });

  function dodgeNo() {
    const rowRect = buttonRow.getBoundingClientRect();
    const btnRect = noBtn.getBoundingClientRect();
    const pad = 8;

    const currentLeft = btnRect.left - rowRect.left;
    const currentTop = btnRect.top - rowRect.top;

    // Pin at the current spot first so the first move slides instead of teleporting
    if (!noBtn.classList.contains("is-dodging")) {
      noBtn.classList.add("is-dodging");
      noBtn.style.left = `${currentLeft}px`;
      noBtn.style.top = `${currentTop}px`;
      void noBtn.offsetWidth;
    }

    const maxX = Math.max(pad, rowRect.width - btnRect.width - pad);
    const maxY = Math.max(pad, rowRect.height + 90);

    let x = Math.random() * maxX;
    let y = (Math.random() * maxY) - 30;

    const fromLeft = parseFloat(noBtn.style.left) || currentLeft;
    const fromTop = parseFloat(noBtn.style.top) || currentTop;
    if (Math.abs(x - fromLeft) < 70 && Math.abs(y - fromTop) < 40) {
      x = (x + maxX / 2) % maxX;
      y = (y + maxY / 2) % maxY - 20;
    }

    noBtn.style.left = `${x}px`;
    noBtn.style.top = `${y}px`;
  }

  function handleNoClick(e) {
    e.preventDefault();
    e.stopPropagation();
    noClicks += 1;

    if (noClicks <= DODGE_UNTIL) {
      dodgeNo();
      return;
    }

    if (noClicks === DODGE_UNTIL + 1) {
      noBtn.classList.remove("is-dodging");
      noBtn.style.left = "";
      noBtn.style.top = "";
      noBtn.textContent = "just say you hate me";
      noBtn.classList.add("is-hate-me");
      return;
    }

    if (noClicks === DODGE_UNTIL + 2) {
      noBtn.classList.add("is-covered");
      coverSticker.classList.add("is-visible");
      coverSticker.setAttribute("aria-hidden", "false");
      return;
    }

    coverSticker.classList.remove("is-visible");
    noBtn.classList.remove("is-covered", "is-hate-me", "is-dodging");
    noBtn.style.left = "";
    noBtn.style.top = "";
    noBtn.classList.add("is-tiny");
    noBtn.textContent = "no";
    yesBtn.classList.add("is-growing");

    window.setTimeout(showYes, 700);
  }

  function launchConfetti() {
    const canvas = document.getElementById("confetti");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const colors = ["#fff8ec", "#f3d5b5", "#c45a45", "#ffd27a", "#8b2e22", "#ffe8d6", "#f0a090"];
    let pieces = [];
    let running = true;
    let spawnBurst = 0;

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }

    function makePiece(fromCenter) {
      const w = canvas.width;
      const h = canvas.height;
      return {
        x: fromCenter ? w * 0.5 + (Math.random() - 0.5) * w * 0.35 : Math.random() * w,
        y: fromCenter ? h * 0.35 + (Math.random() - 0.5) * 40 : -20 - Math.random() * 40,
        w: 6 + Math.random() * 8,
        h: 8 + Math.random() * 12,
        color: colors[(Math.random() * colors.length) | 0],
        vx: (Math.random() - 0.5) * (fromCenter ? 14 : 4),
        vy: fromCenter ? -6 - Math.random() * 10 : 2 + Math.random() * 4,
        rot: Math.random() * Math.PI * 2,
        vr: (Math.random() - 0.5) * 0.25,
        opacity: 1,
      };
    }

    function burst() {
      for (let i = 0; i < 70; i++) pieces.push(makePiece(true));
    }

    function tick() {
      if (!running) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (spawnBurst < 3) {
        spawnBurst += 1;
        burst();
      } else if (pieces.length < 90 && Math.random() < 0.35) {
        pieces.push(makePiece(false));
      }

      pieces = pieces.filter((p) => p.y < canvas.height + 40 && p.opacity > 0.05);

      for (const p of pieces) {
        p.vy += 0.18;
        p.vx *= 0.99;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        if (p.y > canvas.height * 0.7) p.opacity *= 0.985;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.globalAlpha = p.opacity;
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }

      requestAnimationFrame(tick);
    }

    resize();
    window.addEventListener("resize", resize);
    burst();
    requestAnimationFrame(tick);

    window.setTimeout(() => {
      running = false;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }, 8000);
  }

  function showYes() {
    yesScreen.hidden = false;
    scene.setAttribute("aria-hidden", "true");
    launchConfetti();
  }

  noBtn.addEventListener("click", handleNoClick);
  coverSticker.addEventListener("click", handleNoClick);

  function canDodge() {
    return noClicks < DODGE_UNTIL;
  }

  // Run away as soon as the cursor gets near — no first click required
  noBtn.addEventListener("pointerenter", () => {
    if (canDodge()) dodgeNo();
  });

  yesBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    yesBtn.classList.add("is-growing");
    window.setTimeout(showYes, 550);
  });

  letter.addEventListener("click", (e) => {
    e.stopPropagation();
  });

  if (invitation && window.matchMedia("(pointer: fine)").matches) {
    let lastDodge = 0;
    invitation.addEventListener("mousemove", (e) => {
      if (!canDodge()) return;
      const noRect = noBtn.getBoundingClientRect();
      const distX = e.clientX - (noRect.left + noRect.width / 2);
      const distY = e.clientY - (noRect.top + noRect.height / 2);
      const dist = Math.hypot(distX, distY);
      const now = performance.now();
      if (dist < 90 && now - lastDodge > 180) {
        lastDodge = now;
        dodgeNo();
      }
    });
  }
})();
