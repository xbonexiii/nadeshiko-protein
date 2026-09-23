/**
 * Shared compact purchase panel used by Quick Add and the product-page sticky bar.
 * Variant data is rendered by Liquid on each <option>, so changing a flavour does
 * not require another network request.
 */
class PurchasePanel extends HTMLElement {
  #abortController = new AbortController();

  connectedCallback() {
    const select = this.querySelector('[data-purchase-variant-select]');
    select?.addEventListener('change', this.#handleVariantChange, {
      signal: this.#abortController.signal,
    });

    this.querySelector('[data-purchase-quantity-minus]')?.addEventListener('click', this.#decreaseQuantity, {
      signal: this.#abortController.signal,
    });
    this.querySelector('[data-purchase-quantity-plus]')?.addEventListener('click', this.#increaseQuantity, {
      signal: this.#abortController.signal,
    });
    this.querySelector('[data-purchase-quantity]')?.addEventListener('change', this.#normaliseQuantity, {
      signal: this.#abortController.signal,
    });

    this.#updateFromSelectedVariant();
  }

  disconnectedCallback() {
    this.#abortController.abort();
  }

  #handleVariantChange = () => {
    this.#updateFromSelectedVariant();
  };

  #decreaseQuantity = () => this.#changeQuantity(-1);
  #increaseQuantity = () => this.#changeQuantity(1);
  #normaliseQuantity = () => this.#changeQuantity(0);

  #changeQuantity(direction) {
    const input = /** @type {HTMLInputElement | null} */ (this.querySelector('[data-purchase-quantity]'));
    if (!input || input.disabled) return;

    const min = Number(input.min) || 1;
    const max = input.max ? Number(input.max) : Infinity;
    const step = Number(input.step) || 1;
    const current = Number(input.value) || min;
    const next = Math.min(max, Math.max(min, current + direction * step));
    input.value = String(next);
    this.#updateQuantityButtons();
  }

  #updateQuantityButtons() {
    const input = /** @type {HTMLInputElement | null} */ (this.querySelector('[data-purchase-quantity]'));
    const minus = /** @type {HTMLButtonElement | null} */ (this.querySelector('[data-purchase-quantity-minus]'));
    const plus = /** @type {HTMLButtonElement | null} */ (this.querySelector('[data-purchase-quantity-plus]'));
    if (!input) return;

    const value = Number(input.value) || Number(input.min) || 1;
    minus?.toggleAttribute('disabled', input.disabled || value <= Number(input.min || 1));
    plus?.toggleAttribute('disabled', input.disabled || Boolean(input.max && value >= Number(input.max)));
  }

  #updateFromSelectedVariant() {
    const select = /** @type {HTMLSelectElement | null} */ (
      this.querySelector('[data-purchase-variant-select]')
    );
    const option = select?.selectedOptions[0];
    if (!select || !option) return;

    const variantId = option.value;
    const available = option.dataset.available === 'true';
    const imageUrl = option.dataset.imageUrl || this.dataset.fallbackImage || '';
    const imageAlt = option.dataset.imageAlt || this.dataset.productTitle || '';

    const variantInput = /** @type {HTMLInputElement | HTMLSelectElement | null} */ (
      this.querySelector('[name="id"]')
    );
    if (variantInput) {
      variantInput.value = variantId;
    }

    const image = /** @type {HTMLImageElement | null} */ (this.querySelector('[data-purchase-image]'));
    if (image && imageUrl) {
      image.src = imageUrl;
      image.alt = imageAlt;
      image.removeAttribute('srcset');
    }

    const price = this.querySelector('[data-purchase-price]');
    if (price) price.textContent = option.dataset.price || '';

    const comparePrice = this.querySelector('[data-purchase-compare-price]');
    if (comparePrice) {
      comparePrice.textContent = option.dataset.comparePrice || '';
      comparePrice.toggleAttribute('hidden', !option.dataset.comparePrice);
    }

    const quantityInput = /** @type {HTMLInputElement | null} */ (
      this.querySelector('[data-purchase-quantity]')
    );
    const min = option.dataset.min || '1';
    const max = option.dataset.max || null;
    const step = option.dataset.step || '1';

    if (quantityInput) {
      quantityInput.dataset.cartQuantity = option.dataset.cartQuantity || '0';
      quantityInput.disabled = !available;
      quantityInput.value = min;
      quantityInput.min = min;
      quantityInput.step = step;
      if (max) quantityInput.max = max;
      else quantityInput.removeAttribute('max');
      this.#updateQuantityButtons();
    }

    const button = /** @type {HTMLButtonElement | null} */ (this.querySelector('[data-purchase-submit]'));
    if (button) {
      button.disabled = !available;
      const label = button.querySelector('[data-purchase-submit-label]');
      if (label) {
        label.textContent = available ? button.dataset.availableText || '' : button.dataset.soldOutText || '';
      }
    }

    const addToCart = /** @type {HTMLElement | null} */ (this.querySelector('add-to-cart-component'));
    if (addToCart) addToCart.dataset.productVariantMedia = imageUrl;

    this.dataset.variantId = variantId;
    this.dataset.variantAvailable = String(available);
  }
}

if (!customElements.get('purchase-panel')) {
  customElements.define('purchase-panel', PurchasePanel);
}
