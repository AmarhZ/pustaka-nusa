const INTERVAL_MS = 5000;

/** Slider hero: scroll-snap (swipe native) + tombol, titik, autoplay, jeda, keyboard. */
export function initSlider(root: HTMLElement): void {
  const track = root.querySelector<HTMLElement>('.track');
  const dotsBox = root.querySelector<HTMLElement>('.dots');
  const prev = root.querySelector<HTMLButtonElement>('.snav.prev');
  const next = root.querySelector<HTMLButtonElement>('.snav.next');
  const pauseBtn = root.querySelector<HTMLButtonElement>('.spause');
  if (!track || !dotsBox || !prev || !next || !pauseBtn) return;

  const slides = Array.from(track.children) as HTMLElement[];
  const total = slides.length;
  if (total < 2) return;

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let userPaused = reduced; // pengguna dengan reduced-motion: tanpa autoplay
  let hovering = false;
  let focusing = false;
  let offscreen = false;
  let timer: number | undefined;

  const current = (): number =>
    Math.min(total - 1, Math.max(0, Math.round(track.scrollLeft / track.clientWidth)));

  const dots = slides.map((_, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('aria-label', `Slide ${i + 1}`);
    b.addEventListener('click', () => { go(i); restart(); });
    dotsBox.append(b);
    return b;
  });

  function paintDots(): void {
    const c = current();
    dots.forEach((d, i) => d.setAttribute('aria-current', String(i === c)));
  }

  function go(i: number): void {
    const target = (i + total) % total;
    track!.scrollTo({ left: target * track!.clientWidth, behavior: reduced ? 'auto' : 'smooth' });
  }

  const shouldRun = (): boolean =>
    !userPaused && !hovering && !focusing && !offscreen && !document.hidden;

  function stop(): void {
    window.clearInterval(timer);
    timer = undefined;
  }
  function restart(): void {
    stop();
    track!.setAttribute('aria-live', shouldRun() ? 'off' : 'polite');
    if (shouldRun()) timer = window.setInterval(() => go(current() + 1), INTERVAL_MS);
  }

  function paintPause(): void {
    pauseBtn!.textContent = userPaused ? '▶ Putar' : '⏸ Jeda';
    pauseBtn!.setAttribute('aria-pressed', String(userPaused));
  }

  let ticking = false;
  track.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { paintDots(); ticking = false; });
  }, { passive: true });

  prev.addEventListener('click', () => { go(current() - 1); restart(); });
  next.addEventListener('click', () => { go(current() + 1); restart(); });
  pauseBtn.addEventListener('click', () => { userPaused = !userPaused; paintPause(); restart(); });

  root.addEventListener('pointerenter', () => { hovering = true; restart(); });
  root.addEventListener('pointerleave', () => { hovering = false; restart(); });
  root.addEventListener('focusin', () => { focusing = true; restart(); });
  root.addEventListener('focusout', () => { focusing = false; restart(); });
  root.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'ArrowLeft') { go(current() - 1); restart(); }
    if (e.key === 'ArrowRight') { go(current() + 1); restart(); }
  });
  document.addEventListener('visibilitychange', restart);
  new IntersectionObserver(([entry]) => {
    offscreen = !(entry?.isIntersecting ?? true);
    restart();
  }, { threshold: 0.4 }).observe(root);
  addEventListener('resize', () => track.scrollTo({ left: current() * track.clientWidth }));

  paintDots();
  paintPause();
  restart();
}
