import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function splitWords(el: Element): HTMLElement[] {
  const text = el.textContent?.trim() ?? '';
  el.innerHTML = '';
  const frag = document.createDocumentFragment();
  text.split(/\s+/).forEach((w) => {
    const span = document.createElement('span');
    span.className = 'w';
    span.textContent = w;
    frag.appendChild(span);
    frag.appendChild(document.createTextNode(' '));
  });
  el.appendChild(frag);
  return [...el.querySelectorAll<HTMLElement>('.w')];
}

function heroIn() {
  const inners = document.querySelectorAll('.hero h1 .inner');
  gsap.set(inners, { yPercent: 110 });
  gsap.to(inners, { yPercent: 0, duration: 1.1, ease: 'power4.out', stagger: 0.09 });
  gsap.from('.nav', { yPercent: -100, opacity: 0, duration: 0.9, ease: 'power3.out' });
  gsap.from('.hero .meta-top .col', { opacity: 0, y: 16, duration: 0.8, stagger: 0.12, delay: 0.4 });
  gsap.from('.hero .sub > *', { opacity: 0, y: 20, duration: 0.8, stagger: 0.12, delay: 0.6 });
}

function init() {
  const loader = document.querySelector<HTMLElement>('.loader');
  const barI = document.querySelector<HTMLElement>('.loader .barline i');
  const pct = document.querySelector<HTMLElement>('.loader .big');
  let heroDone = false;
  const safeHeroIn = () => { if (heroDone) return; heroDone = true; heroIn(); };

  if (reduce) {
    gsap.set('.hero h1 .inner', { yPercent: 0 });
    if (loader) gsap.set(loader, { display: 'none' });
    safeHeroIn();
  } else {
    const tlLoad = gsap.timeline();
    const counter = { v: 0 };
    tlLoad
      .to(counter, {
        v: 100, duration: 1.5, ease: 'power2.inOut',
        onUpdate() {
          const n = Math.round(counter.v);
          if (pct) pct.textContent = String(n).padStart(3, '0');
          if (barI) barI.style.width = n + '%';
        },
      })
      .to(loader, { yPercent: -100, duration: 0.9, ease: 'power4.inOut' }, '+=0.15')
      .set(loader, { display: 'none' })
      .add(safeHeroIn, '-=0.45');

    setTimeout(() => {
      if (loader && getComputedStyle(loader).display !== 'none') {
        gsap.set(loader, { display: 'none', clearProps: 'transform' });
        safeHeroIn();
      }
    }, 4500);
  }

  gsap.to('.progress', {
    width: '100%', ease: 'none',
    scrollTrigger: { trigger: document.body, start: 'top top', end: 'bottom bottom', scrub: 0.3 },
  });

  const counterEl = document.querySelector<HTMLElement>('.counter b');
  const labelEl = document.querySelector<HTMLElement>('.counter .lab');
  document.querySelectorAll<HTMLElement>('section[data-index]').forEach((sec) => {
    ScrollTrigger.create({
      trigger: sec, start: 'top center', end: 'bottom center',
      onToggle: (self) => {
        if (self.isActive) {
          if (counterEl) counterEl.textContent = sec.dataset.index ?? '';
          if (labelEl) labelEl.textContent = sec.dataset.label ?? '';
        }
      },
    });
  });

  const statement = document.querySelector<HTMLElement>('.statement');
  if (statement) {
    const keys = (statement.dataset.keys ?? '').split(',').map((s) => s.trim().toLowerCase());
    const words = splitWords(statement);
    words.forEach((w) => {
      if (keys.includes(w.textContent?.toLowerCase().replace(/[^\w]/g, '') ?? '')) {
        w.classList.add('isKey');
      }
    });
    ScrollTrigger.create({
      trigger: statement, start: 'top 80%', end: 'bottom 55%', scrub: true,
      onUpdate: (self) => {
        const n = Math.floor(self.progress * words.length * 1.15);
        words.forEach((w, i) => {
          const on = i < n;
          w.classList.toggle('lit', on && !w.classList.contains('isKey'));
          w.classList.toggle('key', on && w.classList.contains('isKey'));
        });
      },
    });
  }

  gsap.utils.toArray<Element>('[data-reveal]').forEach((el) => {
    gsap.from(el, {
      opacity: 0, y: 28, duration: 0.9, ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 86%' },
    });
  });

  const featured = document.querySelector('.featured');
  if (featured) {
    gsap.from(featured, {
      opacity: 0, y: 50, duration: 1, ease: 'power3.out',
      scrollTrigger: { trigger: featured, start: 'top 82%' },
    });
    gsap.from(featured.querySelectorAll('.badge, h3, .desc, .tags span, .open'), {
      opacity: 0, y: 22, duration: 0.7, stagger: 0.06, ease: 'power3.out',
      scrollTrigger: { trigger: featured, start: 'top 72%' },
    });
  }

  gsap.utils.toArray<Element>('.proj').forEach((row) => {
    gsap.from(row, {
      opacity: 0, y: 40, duration: 0.8, ease: 'power3.out',
      scrollTrigger: { trigger: row, start: 'top 90%' },
    });
  });

  document.querySelectorAll<HTMLElement>('.marquee').forEach((m) => {
    m.innerHTML += m.innerHTML;
    const dir = m.classList.contains('alt') ? 1 : -1;
    const w = m.scrollWidth / 2;
    gsap.set(m, { x: dir < 0 ? 0 : -w });
    gsap.to(m, {
      x: dir < 0 ? -w : 0,
      duration: 26, ease: 'none', repeat: -1,
      modifiers: { x: gsap.utils.unitize((x: number) => x % w) },
    });
    gsap.to(m, {
      x: `+=${dir * 220}`, ease: 'none',
      scrollTrigger: { trigger: '.stack', start: 'top bottom', end: 'bottom top', scrub: 1 },
    });
  });

  const contactH = document.querySelector('.contact h2');
  if (contactH) {
    gsap.from(contactH.querySelectorAll('.inner'), {
      yPercent: 110, opacity: 0, duration: 1, ease: 'power4.out', stagger: 0.12,
      scrollTrigger: { trigger: contactH, start: 'top 80%' },
    });
  }
  gsap.from('.contact .email, .contact .social a, .footer', {
    opacity: 0, y: 24, duration: 0.8, stagger: 0.06, ease: 'power3.out',
    scrollTrigger: { trigger: '.contact', start: 'top 60%' },
  });

  ScrollTrigger.refresh();

  window.addEventListener('pointcloud:ready', () => {
    document.fonts.ready.then(() => ScrollTrigger.refresh());
  }, { once: true } as EventListenerOptions);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
