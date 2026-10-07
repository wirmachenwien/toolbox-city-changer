// Self-grading quizzes and single questions.
export function initQuiz(): void {
  for (const form of document.querySelectorAll<HTMLFormElement>('[data-quiz]')) {
    const feedback = form.querySelector('[data-feedback]');
    if (!feedback || form.dataset.wired) continue;
    form.dataset.wired = 'true';
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const inputs = [...form.querySelectorAll<HTMLInputElement>('input[type="checkbox"], input[type="radio"]')];
      const checked = inputs.filter((input) => input.checked);
      const single = form.dataset.single === 'true';
      let state: 'correct' | 'incorrect' | 'unfinished';
      if (checked.length === 0) {
        state = 'unfinished';
      } else if (single) {
        state = checked[0]?.hasAttribute('data-correct') ? 'correct' : 'incorrect';
      } else {
        const wanted = inputs.filter((input) => input.hasAttribute('data-correct'));
        state =
          checked.length === wanted.length && checked.every((input) => input.hasAttribute('data-correct'))
            ? 'correct'
            : checked.some((input) => !input.hasAttribute('data-correct'))
              ? 'incorrect'
              : 'unfinished';
      }
      const key =
        state === 'correct' ? 'feedbackCorrect' : state === 'incorrect' ? 'feedbackIncorrect' : 'feedbackUnfinished';
      feedback.textContent = form.dataset[key] ?? '';
      feedback.setAttribute('data-state', state);
      markOptions(form, inputs);
    });
  }
}

/** Stamp proper check/cross icons onto the options: every correct option gets
 *  a check, wrongly selected options get a cross. Icons are cloned from the
 *  templates rendered with the form, so the SVG markup stays in Icon.astro
 *  (decorative only; the result is announced via the live feedback line). */
function markOptions(form: HTMLFormElement, inputs: HTMLInputElement[]): void {
  const correctTemplate = form.querySelector<HTMLTemplateElement>('[data-icon-correct]');
  const incorrectTemplate = form.querySelector<HTMLTemplateElement>('[data-icon-incorrect]');
  for (const input of inputs) {
    const label = input.closest('label');
    label?.querySelector('[data-mark]')?.remove();
    const isCorrect = input.hasAttribute('data-correct');
    if (!isCorrect && !input.checked) continue;
    const icon = (isCorrect ? correctTemplate : incorrectTemplate)?.content.firstElementChild?.cloneNode(true);
    if (!label || !icon) continue;
    const mark = document.createElement('span');
    mark.setAttribute('data-mark', isCorrect ? 'correct' : 'incorrect');
    mark.className = `quiz-mark is-${isCorrect ? 'correct' : 'incorrect'}`;
    mark.appendChild(icon);
    label.appendChild(mark);
  }
}
