import type { Clock } from '../sim/clock';
import { dateToJd } from '../sim/time';
import { formatUtc, parseDateInput, toDateInputValue } from './format';

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
  // Nächstliegendes Preset wählen und die Uhr darauf setzen, damit Anzeige und Uhr nie auseinanderlaufen
  const distance = (rate: number) => Math.abs(Math.log(rate / clock.rate));
  const initial = SPEEDS.reduce((best, s, i) => (distance(s.daysPerSecond) < distance(SPEEDS[best].daysPerSecond) ? i : best), 0);
  clock.rate = SPEEDS[initial].daysPerSecond;
  SPEEDS.forEach(({ label }, i) => speed.add(new Option(label, String(i), false, i === initial)));
  const dateInput = el('input', { type: 'date', title: 'Zu Datum springen (UTC)', min: '0001-01-01', max: '9999-12-31' });
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
    const jd = parseDateInput(dateInput.value);
    if (jd !== null) jumpTo(jd);
  });
  today.addEventListener('click', () => jumpTo(dateToJd(new Date())));
  window.addEventListener('keydown', (e) => {
    const t = e.target;
    const isControl = t instanceof HTMLInputElement || t instanceof HTMLSelectElement || t instanceof HTMLButtonElement;
    if (e.code === 'Space' && !isControl) {
      e.preventDefault();
      if (e.repeat) return;
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
      // Datumsfeld folgt der Uhr (außer während der Eingabe), damit jede Auswahl ein change-Event auslöst
      if (document.activeElement !== dateInput) {
        const value = toDateInputValue(clock.jd);
        if (dateInput.value !== value) dateInput.value = value;
      }
    },
  };
}
