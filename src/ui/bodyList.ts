import { el, isFormControl } from './dom';

export interface BodyListItem {
  id: string;
  name: string;
}

/**
 * Körperliste mit Tastenkürzeln: 0/Esc = Übersicht, S = Sonne, 1–9 = n-ter Planet.
 * onSelect(null) steht für die Übersicht.
 */
export function createBodyList(
  root: HTMLElement,
  sun: BodyListItem,
  planets: BodyListItem[],
  onSelect: (id: string | null) => void,
): { setActive(id: string | null): void } {
  const buttons = new Map<string | null, HTMLButtonElement>();
  const add = (id: string | null, label: string, hint: string) => {
    const button = el('button', { type: 'button', textContent: label, title: `${label} (Taste ${hint})` });
    button.addEventListener('click', () => onSelect(id));
    buttons.set(id, button);
    root.append(button);
  };

  add(null, 'Übersicht', '0');
  add(sun.id, sun.name, 'S');
  planets.forEach((p, i) => add(p.id, p.name, String(i + 1)));

  window.addEventListener('keydown', (e) => {
    if (isFormControl(e.target) || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === 'Escape' || e.key === '0') onSelect(null);
    else if (e.key === 's' || e.key === 'S') onSelect(sun.id);
    else if (/^[1-9]$/.test(e.key) && planets[Number(e.key) - 1]) onSelect(planets[Number(e.key) - 1].id);
  });

  return {
    setActive(id) {
      for (const [key, button] of buttons) button.classList.toggle('active', key === id);
    },
  };
}
