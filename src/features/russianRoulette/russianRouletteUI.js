// russianRouletteUI.js - Russian Roulette iframe modal wrapper

export class RussianRouletteUI {
    constructor(opts) {
        this.input = opts.input;
        this.modal = document.getElementById(opts.modalId);
        this.backdrop = opts.backdropId ? document.getElementById(opts.backdropId) : null;
        this.closeBtn = opts.closeBtnId ? document.getElementById(opts.closeBtnId) : null;
        this.iframe = document.getElementById(opts.iframeId);
        this.isOpen = false;

        this._onBackdrop = () => this.close();
        this._onCloseBtn = () => this.close();

        this._bind();
    }

    _bind() {
        if (this.backdrop) this.backdrop.addEventListener('click', this._onBackdrop);
        if (this.closeBtn) this.closeBtn.addEventListener('click', this._onCloseBtn);
    }

    open() {
        if (!this.modal || !this.iframe) return;
        if (this.isOpen && !this.modal.classList.contains('hidden')) return;
        this.isOpen = true;

        this.iframe.src = './Russianroulette/_legacy_html/russianroulette.html';
        this.modal.classList.remove('hidden');
        this.modal.setAttribute('aria-hidden', 'false');
    }

    close() {
        if (!this.modal || !this.iframe || !this.isOpen) return;
        this.isOpen = false;

        this.modal.classList.add('hidden');
        this.modal.setAttribute('aria-hidden', 'true');
        this.iframe.src = 'about:blank';
    }

    destroy() {
        if (this.backdrop) this.backdrop.removeEventListener('click', this._onBackdrop);
        if (this.closeBtn) this.closeBtn.removeEventListener('click', this._onCloseBtn);
    }
}
