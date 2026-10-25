export interface LiveTryInitOptions {
  shopId: string;
  productId?: string;
  variantId?: string;
  theme?: 'light' | 'dark' | 'auto';
  locale?: 'en' | 'hi' | 'te';
}

export class LiveTryWidget {
  private options: LiveTryInitOptions;
  private container: HTMLDivElement | null = null;
  private shadowRoot: ShadowRoot | null = null;

  constructor(options: LiveTryInitOptions) {
    this.options = options;
  }

  public getOptions(): LiveTryInitOptions {
    return this.options;
  }

  public getShadowRoot(): ShadowRoot | null {
    return this.shadowRoot;
  }

  public init(): void {
    if (typeof document === 'undefined') return;

    // Attach Shadow DOM for complete CSS/DOM isolation
    this.container = document.createElement('div');
    this.container.id = 'livetry-widget-root';
    this.shadowRoot = this.container.attachShadow({ mode: 'open' });
    document.body.appendChild(this.container);
  }

  public open(_productId?: string, _variantId?: string): void {
    // Modal open logic with focus trap and explicit camera consent
  }

  public close(): void {
    // Camera cut-off and modal dismissal
  }
}

// Global window registration
if (typeof window !== 'undefined') {
  (window as unknown as { LiveTry: typeof LiveTryWidget }).LiveTry = LiveTryWidget;
}

export default LiveTryWidget;
