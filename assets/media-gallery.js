import { Component } from '@theme/component';
import { ThemeEvents, ZoomMediaSelectedEvent } from '@theme/events';
import { StandardEvents, ProductSelectEvent } from '@shopify/events';

/**
 * A custom element that renders a media gallery.
 *
 * @typedef {object} Refs
 * @property {import('./zoom-dialog').ZoomDialog} [zoomDialogComponent] - The zoom dialog component.
 * @property {import('./slideshow').Slideshow} [slideshow] - The slideshow component.
 * @property {HTMLElement[]} [media] - The media elements.
 *
 * @extends Component<Refs>
 */
export class MediaGallery extends Component {
  connectedCallback() {
    super.connectedCallback();

    const { signal } = this.#controller;
    const target = this.closest('.shopify-section, dialog');

    target?.addEventListener(StandardEvents.productSelect, this.#handleProductSelect, { signal });
    this.refs.zoomDialogComponent?.addEventListener(ThemeEvents.zoomMediaSelected, this.#handleZoomMediaSelected, {
      signal,
    });
  }

  #controller = new AbortController();

  disconnectedCallback() {
    super.disconnectedCallback();

    this.#controller.abort();
  }

  /**
   * Handles a product select event by replacing the current media gallery with a new one.
   *
   * @param {ProductSelectEvent} event - The product select event.
   */
  #handleProductSelect = (event) => {
    if (!(event.target instanceof Element) || event.target.closest('product-card')) return;

    event.promise
      .then(({ detail }) => {
        if (!detail?.html) return;

        const { html, productId, resource } = detail;
        const productComponent = productId
          ? html
              .querySelector(`variant-picker[data-product-id="${productId}"][data-template-product-match="true"]`)
              ?.closest('product-component')
          : null;
        const newMediaGallery = productComponent?.querySelector('media-gallery') ?? html.querySelector('media-gallery');
        if (!newMediaGallery) return;

        const selectedMediaId = resource?.featured_media?.id;
        if (selectedMediaId) {
          this.#promoteMedia(newMediaGallery, String(selectedMediaId));
        }

        const quickAddMediaContainer = this.closest('quick-add-dialog .product-information__media');
        this.replaceWith(newMediaGallery);

        // The quick-add media column is the scroll container, so replacing the gallery alone
        // preserves its previous scroll position. Return it to the first item, which the server
        // renders as the selected variant's featured media.
        quickAddMediaContainer?.scrollTo({ top: 0, behavior: 'instant' });
      })
      .catch((error) => {
        if (error?.name !== 'AbortError') console.warn('[media-gallery] Event promise rejected:', error);
      });
  };

  /**
   * Selects a product media item in both carousel and grid presentations.
   * Grid media is moved to the first position because quick add displays the grid vertically.
   * @param {string} mediaId - Shopify media ID.
   */
  selectMedia(mediaId) {
    const mediaSelector = `.product-media[data-media-id="${mediaId}"]`;
    const slides = this.slideshow?.slides;
    const slideIndex = slides?.findIndex((slide) => slide.querySelector(mediaSelector));

    if (slideIndex != null && slideIndex >= 0) {
      this.slideshow?.select(slideIndex, undefined, { animate: false });
    }

    this.#promoteMedia(this, mediaId);
  }

  /**
   * Moves a media item to the first position before a server-rendered gallery is connected.
   * @param {Element} gallery - Media gallery element to update.
   * @param {string} mediaId - Shopify media ID.
   */
  #promoteMedia(gallery, mediaId) {
    const mediaSelector = `.product-media[data-media-id="${mediaId}"]`;
    const collections = [gallery.querySelector('slideshow-slides'), gallery.querySelector('.media-gallery__grid')];

    for (const collection of collections) {
      const mediaItem = Array.from(collection?.children ?? []).find((item) => item.querySelector(mediaSelector));
      if (!mediaItem || collection?.firstElementChild === mediaItem) continue;

      if (mediaItem.matches('slideshow-slide')) {
        collection?.firstElementChild?.setAttribute('aria-hidden', 'true');
        mediaItem.setAttribute('aria-hidden', 'false');
      }

      collection?.prepend(mediaItem);
    }
  }

  /**
   * Handles the 'zoom-media:selected' event.
   * @param {ZoomMediaSelectedEvent} event - The zoom-media:selected event.
   */
  #handleZoomMediaSelected = async (event) => {
    this.slideshow?.select(event.detail.index, undefined, { animate: false });
  };

  /**
   * Zooms the media gallery.
   *
   * @param {number} index - The index of the media to zoom.
   * @param {PointerEvent} event - The pointer event.
   */
  zoom(index, event) {
    this.refs.zoomDialogComponent?.open(index, event);
  }

  /**
   * Preloads an image.
   * @param {number} index - The index of the media to preload.
   */
  preloadImage(index) {
    const zoomDialogMedia = this.refs.zoomDialogComponent?.refs.media[index];
    if (!zoomDialogMedia) return;

    this.refs.zoomDialogComponent?.loadHighResolutionImage(zoomDialogMedia);
  }

  get slideshow() {
    return this.refs.slideshow;
  }

  get media() {
    return this.refs.media;
  }

  get presentation() {
    return this.dataset.presentation;
  }
}

if (!customElements.get('media-gallery')) {
  customElements.define('media-gallery', MediaGallery);
}
