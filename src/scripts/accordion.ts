// Exclusive collapsibles with a smooth fold: opening one closes its
// siblings in the same group (same parent); accordions elsewhere on the
// page stay untouched. Always wired, no feature flag. When enabled via
// settings, sections under the configured heading level additionally
// collapse into <details> elements.
//
// The fold is driven by the Web Animations API: browsers hide closed
// <details> content via content-visibility, which snaps a pure CSS height
// transition shut, so CSS alone cannot fold reliably. Native semantics stay
// intact (keyboard and assistive tech use the summary as before) and
// prefers-reduced-motion falls back to an instant toggle.
const OPEN_MS = 300;
const CLOSE_MS = 240;

const flights = new Map<HTMLDetailsElement, Animation>();
const closing = new Set<HTMLDetailsElement>();

function accordionBody(details: HTMLDetailsElement): HTMLElement | null {
  return details.querySelector(':scope > .accordion-body');
}

function clearFlight(details: HTMLDetailsElement, body: HTMLElement): void {
  flights.delete(details);
  closing.delete(details);
  body.style.height = '';
  body.style.overflow = '';
}

function foldOpen(details: HTMLDetailsElement, body: HTMLElement, instant: boolean): void {
  if (instant) {
    details.open = true;
    return;
  }
  details.open = true;
  const endHeight = body.offsetHeight;
  body.style.height = '0px';
  body.style.overflow = 'hidden';
  const flight = body.animate([{ height: '0px' }, { height: `${endHeight}px` }], {
    duration: OPEN_MS,
    easing: 'ease-out',
  });
  flights.set(details, flight);
  flight.onfinish = () => clearFlight(details, body);
  flight.oncancel = () => clearFlight(details, body);
}

function foldClose(details: HTMLDetailsElement, body: HTMLElement, instant: boolean): void {
  if (instant || !details.open) {
    details.open = false;
    return;
  }
  closing.add(details);
  body.style.overflow = 'hidden';
  const startHeight = body.getBoundingClientRect().height;
  body.style.height = `${startHeight}px`;
  const flight = body.animate([{ height: `${startHeight}px` }, { height: '0px' }], {
    duration: CLOSE_MS,
    easing: 'ease-out',
  });
  flights.set(details, flight);
  flight.onfinish = () => {
    clearFlight(details, body);
    details.open = false;
  };
  flight.oncancel = () => clearFlight(details, body);
}

export function initAccordion(): void {
  const prose = document.querySelector('[data-prose]');
  if (!prose) return;
  if (document.body.dataset.accordion === 'true') {
    const level = document.body.dataset.accordionLevel === 'h2' ? 'H2' : 'H3';
    const headings = [...prose.querySelectorAll(level)].filter(
      (heading) => !heading.closest('details'),
    );
    for (const heading of headings) {
      const details = document.createElement('details');
      details.className = 'accordion';
      const summary = document.createElement('summary');
      summary.textContent = heading.textContent;
      details.append(summary);
      let node: Node | null = heading.nextSibling;
      const body = document.createElement('div');
      body.className = 'accordion-body';
      const content = document.createElement('div');
      content.className = 'accordion-content';
      while (node && !(node instanceof Element && node.tagName === level)) {
        const next: Node | null = node.nextSibling;
        content.append(node);
        node = next;
      }
      body.append(content);
      details.append(body);
      heading.replaceWith(details);
    }
  }
  // Mark JS-driven folding so CSS keeps its grid fold as a no-JS fallback only.
  document.documentElement.classList.add('js-fold');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  // Summary clicks cover mouse, touch, keyboard and assistive tech (all of
  // them dispatch click on the summary), so intercepting them takes over the
  // toggle completely; no toggle listener is needed.
  prose.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const summary = target.closest('summary');
    const details = summary?.parentElement;
    if (
      !summary ||
      !(details instanceof HTMLDetailsElement) ||
      !details.classList.contains('accordion') ||
      summary.parentElement !== details
    ) {
      return;
    }
    event.preventDefault();
    const body = accordionBody(details);
    if (!body) {
      details.open = !details.open;
      return;
    }
    const instant = reduceMotion.matches || typeof body.animate !== 'function';
    flights.get(details)?.cancel();
    // A cancelled close leaves the box open: treat it as an open box, i.e.
    // the click means close. Otherwise the click inverts the open state.
    const opening = closing.has(details) ? false : !details.open;
    closing.delete(details);
    const siblings = [...(details.parentElement?.children ?? [])].filter(
      (el): el is HTMLDetailsElement =>
        el instanceof HTMLDetailsElement &&
        el !== details &&
        el.classList.contains('accordion'),
    );
    if (opening) {
      for (const sibling of siblings) {
        const siblingBody = accordionBody(sibling);
        if (!siblingBody) {
          sibling.open = false;
          continue;
        }
        flights.get(sibling)?.cancel();
        foldClose(sibling, siblingBody, instant);
      }
      foldOpen(details, body, instant);
    } else {
      foldClose(details, body, instant);
    }
  });
}
