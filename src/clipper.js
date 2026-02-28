/**
 * Clipper content script
 * Handles rectangle selection overlay on the web page
 */

(function () {
    if (window.wildcardClipperInjected) return;
    window.wildcardClipperInjected = true;

    let isActive = false;
    let isDragging = false;
    let startX, startY;
    let overlay = null;
    let selection = null;

    function createOverlay() {
        if (overlay) return;
        overlay = document.createElement('div');
        overlay.id = 'wildcard-clipper-overlay';
        Object.assign(overlay.style, {
            position: 'fixed',
            top: '0',
            left: '0',
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.3)',
            zIndex: '2147483647',
            cursor: 'crosshair',
            pointerEvents: 'none',
            display: 'none'
        });

        selection = document.createElement('div');
        Object.assign(selection.style, {
            position: 'absolute',
            border: '2px dashed #007bff',
            backgroundColor: 'rgba(0, 123, 255, 0.1)',
            boxSizing: 'border-box',
            display: 'none'
        });

        overlay.appendChild(selection);
        document.body.appendChild(overlay);
    }

    function onMouseDown(e) {
        if (!isActive) return;
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;

        selection.style.left = `${startX}px`;
        selection.style.top = `${startY}px`;
        selection.style.width = '0px';
        selection.style.height = '0px';
        selection.style.display = 'block';
    }

    function onMouseMove(e) {
        if (!isDragging) return;

        const currentX = e.clientX;
        const currentY = e.clientY;

        const left = Math.min(startX, currentX);
        const top = Math.min(startY, currentY);
        const width = Math.abs(startX - currentX);
        const height = Math.abs(startY - currentY);

        selection.style.left = `${left}px`;
        selection.style.top = `${top}px`;
        selection.style.width = `${width}px`;
        selection.style.height = `${height}px`;
    }

    function onMouseUp(e) {
        if (!isDragging) return;
        isDragging = false;

        const rect = selection.getBoundingClientRect();
        if (rect.width > 5 && rect.height > 5) {
            chrome.runtime.sendMessage({
                type: 'CLIPPER_REGION_SELECTED',
                region: {
                    x: rect.left,
                    y: rect.top,
                    width: rect.width,
                    height: rect.height,
                    devicePixelRatio: window.devicePixelRatio
                }
            });
        }
        selection.style.display = 'none';
    }

    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.type === 'SET_CLIPPER_ACTIVE') {
            isActive = message.active;
            if (isActive) {
                createOverlay();
                overlay.style.display = 'block';
                overlay.style.pointerEvents = 'auto';
                document.addEventListener('mousedown', onMouseDown, true);
                document.addEventListener('mousemove', onMouseMove, true);
                document.addEventListener('mouseup', onMouseUp, true);
            } else {
                if (overlay) {
                    overlay.style.display = 'none';
                    overlay.style.pointerEvents = 'none';
                }
                document.removeEventListener('mousedown', onMouseDown, true);
                document.removeEventListener('mousemove', onMouseMove, true);
                document.removeEventListener('mouseup', onMouseUp, true);
                isDragging = false;
            }
        }
    });

    console.log('[WildcardCX] Clipper content script initialized');
})();
