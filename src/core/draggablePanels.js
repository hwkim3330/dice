const draggables = new Set();

const isInteractiveTarget = (el) => {
    if (!el || el.nodeType !== 1) return false;
    return !!el.closest('button, input, textarea, select, a');
};

export function makeDraggable({ panelEl, handleEl }) {
    if (!panelEl || !handleEl) return null;

    let offsetX = 0;
    let offsetY = 0;
    let startX = 0;
    let startY = 0;
    let active = false;

    const applyTransform = () => {
        panelEl.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
    };

    const onPointerDown = (e) => {
        if (isInteractiveTarget(e.target)) return;
        if (e.button !== undefined && e.button !== 0) return;

        active = true;
        startX = e.clientX;
        startY = e.clientY;
        handleEl.setPointerCapture?.(e.pointerId);
        panelEl.classList.add('drag-enabled');
        handleEl.style.touchAction = 'none';
        handleEl.style.userSelect = 'none';
    };

    const onPointerMove = (e) => {
        if (!active) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        offsetX += dx;
        offsetY += dy;
        startX = e.clientX;
        startY = e.clientY;
        applyTransform();
    };

    const onPointerUp = (e) => {
        if (!active) return;
        active = false;
        handleEl.releasePointerCapture?.(e.pointerId);
    };

    handleEl.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);

    const api = {
        reset() {
            offsetX = 0;
            offsetY = 0;
            panelEl.style.transform = '';
        },
        destroy() {
            handleEl.removeEventListener('pointerdown', onPointerDown);
            window.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('pointerup', onPointerUp);
            window.removeEventListener('pointercancel', onPointerUp);
            panelEl.classList.remove('drag-enabled');
        },
    };

    draggables.add(api);
    return api;
}

export function resetPanelPositions() {
    for (const d of draggables) {
        d.reset();
    }
}
