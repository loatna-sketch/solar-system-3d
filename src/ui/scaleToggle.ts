import { el, isFormControl } from './dom';

/** Umschalter komprimiert ↔ real (Button + Taste M). Hängt eine Zeile an root an. */
export function createScaleToggle(root: HTMLElement, onToggle: () => void): { setReal(real: boolean): void } {
  const button = el('button', { type: 'button', title: 'Maßstab umschalten (Taste M)' });
  const row = el('div', { className: 'tc-row' });
  row.append(button);
  root.append(row);

  button.addEventListener('click', onToggle);
  window.addEventListener('keydown', (e) => {
    if (isFormControl(e.target) || e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
    if (e.key === 'm' || e.key === 'M') onToggle();
  });

  return {
    setReal(real) {
      button.textContent = real ? 'Maßstab: real' : 'Maßstab: komprimiert';
    },
  };
}
