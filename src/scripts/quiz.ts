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
    });
  }
}
