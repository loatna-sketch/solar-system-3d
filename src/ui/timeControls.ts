import type { Clock } from '../sim/clock';
import { dateToJd, jdToDate } from '../sim/time';

const SPEEDS: { label: string; daysPerSecond: number }[] = [
  { label: 'Echtzeit', daysPerSecond: 1 / 86_400 },
  { label: '1 Stunde/s', daysPerSecond: 1 / 24 },
  { label: '1 Tag/s', daysPerSecond: 1 },
  { label: '1 Woche/s', daysPerSecond: 7 },
  { label: '1 Monat/s', daysPerSecond: 30.436875 },
  { label: '1 Jahr/s', daysPerSecond: 365.2425 },
];

/** Gültigkeitsbereich der JPL-Elemente (Tabelle 1) */
const VALID_FROM = dateToJd(new Date('1800-01-01T00:00:00Z'));
const VALID_TO = dateToJd(new Date('2051-01-01T00:00:00Z'));

function formatUtc(jd: number): string {
  const d = jdToDate(jd);
  return Number.isNaN(d.getTime()) ? '–' : `${d.toISOString().slice(0, 16).replace('T', ' ')} UTC`;
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Partial<HTMLElementTagNameMap[K]> = {},
): HTMLElementTagNameMap[K] {
  return Object.assign(document.createElement(tag), props);
}

/**
 * Zeitsteuerung als HTML-Overlay. Schreibt direkt in die Clock;
 * onJump wird nach Datumssprüngen aufgerufen (z. B. um Bahnlinien neu zu berechnen).
 */
export function createTimeControls(root: HTMLElement, clock: Clock, onJump: () => void): { update(): void } {
  const date = el('div', { className: 'tc-date' });
  const warning = el('div', { className: 'tc-warning', textContent: 'Außerhalb 1800–2050: Genauigkeit reduziert' });

  const play = el('button', { type: 'button', title: 'Start/Pause (Leertaste)' });
  const dir = el('button', { type: 'button', title: 'Zeitrichtung umkehren' });
  const speed = el('select', { title: 'Geschwindigkeit' });
  SPEEDS.forEach(({ label, daysPerSecond }, i) => {
    speed.add(new Option(label, String(i), false, daysPerSecond === clock.rate));
  });
  const dateInput = el('input', { type: 'date', title: 'Zu Datum springen (UTC)' });
  const today = el('button', { type: 'button', textContent: 'Heute' });

  const row = el('div', { className: 'tc-row' });
  row.append(play, dir, speed);
  const row2 = el('div', { className: 'tc-row' });
  row2.append(dateInput, today);
  root.append(date, row, row2, warning);

  const jumpTo = (jd: number) => {
    clock.jd = jd;
    onJump();
  };

  play.addEventListener('click', () => (clock.paused = !clock.paused));
  dir.addEventListener('click', () => (clock.direction = clock.direction === 1 ? -1 : 1));
  speed.addEventListener('change', () => (clock.rate = SPEEDS[Number(speed.value)].daysPerSecond));
  dateInput.addEventListener('change', () => {
    if (dateInput.value) jumpTo(dateToJd(new Date(`${dateInput.value}T00:00:00Z`)));
  });
  today.addEventListener('click', () => jumpTo(dateToJd(new Date())));
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement)) {
      e.preventDefault();
      clock.paused = !clock.paused;
    }
  });

  let lastText = '';
  return {
    update() {
      const text = formatUtc(clock.jd);
      if (text !== lastText) {
        date.textContent = lastText = text;
      }
      play.textContent = clock.paused ? '▶' : '⏸';
      dir.textContent = clock.direction === 1 ? '⏩' : '⏪';
      warning.hidden = clock.jd >= VALID_FROM && clock.jd < VALID_TO;
    },
  };
}
