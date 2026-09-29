export class TerminalTypewriter {
  private element: HTMLElement;
  private speed: number;
  private cursorBlink: number;
  private onComplete?: () => void;
  private currentText = '';
  private targetText = '';
  private index = 0;
  private timerId: number | null = null;
  private blinkInterval: number | null = null;

  constructor(
    element: HTMLElement,
    options: { speed?: number; cursorBlink?: number; onComplete?: () => void } = {}
  ) {
    this.element = element;
    this.speed = options.speed ?? 30;
    this.cursorBlink = options.cursorBlink ?? 530;
    this.onComplete = options.onComplete;
    this.init();
  }

  private init(): void {
    this.element.style.overflow = 'hidden';
    this.element.style.whiteSpace = 'nowrap';
    this.element.style.borderRight = '2px solid var(--brand)';
    this.startBlink();
  }

  private startBlink(): void {
    this.blinkInterval = window.setInterval(() => {
      this.element.style.borderRightColor =
        this.element.style.borderRightColor === 'transparent' ? 'var(--brand)' : 'transparent';
    }, this.cursorBlink);
  }

  private stopBlink(): void {
    if (this.blinkInterval) {
      clearInterval(this.blinkInterval);
      this.blinkInterval = null;
    }
    this.element.style.borderRight = 'none';
  }

  type(text: string): void {
    this.targetText = text;
    this.currentText = '';
    this.index = 0;
    this.element.textContent = '';
    this.element.classList.add('typing');
    this.tick();
  }

  private tick(): void {
    if (this.index < this.targetText.length) {
      this.currentText += this.targetText[this.index++];
      this.element.textContent = this.currentText;
      this.timerId = window.setTimeout(() => this.tick(), this.speed);
    } else {
      this.finish();
    }
  }

  private finish(): void {
    this.element.classList.remove('typing');
    this.element.classList.add('done');
    this.stopBlink();
    this.element.style.whiteSpace = 'normal';
    this.onComplete?.();
  }

  stop(): void {
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
    this.stopBlink();
  }
}

export function initTypewriters(selector = '.terminal-typewriter:not(.done)'): void {
  document.querySelectorAll<HTMLElement>(selector).forEach((el) => {
    const text = el.textContent || '';
    new TerminalTypewriter(el, { speed: 30 }).type(text);
  });
}
