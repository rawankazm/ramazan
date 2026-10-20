(function () {
    const ORDER_CONTEXT_KEY = 'glass_design_order_context_2026';
    const PENDING_DESIGNS_KEY = 'glass_design_pending_2026';
    const ORDER_DRAFT_PREFIX = 'glass_order_draft_2026:';
    let captureTimer = null;
    let captureFailureAlerted = false;
    let draftFailureAlerted = false;

    function readInputValue(id) {
        const input = document.getElementById(id);
        return input ? input.value.trim() : '';
    }

    window.saveGlassDesignOrderContext = function (systemName, glassType) {
        const now = new Date();
        const localDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        const systemInput = document.getElementById('sys_name') || document.getElementById('texst');
        const context = {
            design_id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
            company: readInputValue('company_name') || 'نەزانراو',
            owner: readInputValue('owner_name') || 'نەزانراو',
            q_total: document.getElementById('q-total')?.innerText.trim() || '',
            m2_total: document.getElementById('grand-total')?.innerText.trim() || '',
            color: readInputValue('color_val'),
            glass_type: glassType || readInputValue('glass_type') || localStorage.getItem('jam_glass_type') || '',
            system: systemName || (systemInput && systemInput.value.trim()) || '',
            date: readInputValue('todayDate') || localDate
        };
        localStorage.setItem(ORDER_CONTEXT_KEY, JSON.stringify(context));
        return context;
    };

    function initializeOrderDraftPersistence() {
        const tableBody = document.getElementById('table-body');
        if (!tableBody || !document.getElementById('company_name')) return;

        const pageName = decodeURIComponent(window.location.pathname.split('/').pop() || 'order');
        const storageKey = `${ORDER_DRAFT_PREFIX}${pageName}`;
        const getFields = () => Array.from(document.querySelectorAll('input, textarea, select'));
        const getFieldKey = (field, index) => `${field.tagName}:${field.id || field.name || index}`;
        const reportDraftFailure = (message, error) => {
            console.error(message, error);
            if (!draftFailureAlerted) {
                draftFailureAlerted = true;
                alert('داتاکانی فۆڕمی داواکاری نەتوانرا خۆکارانە خەزن یان بگەڕێندرێنەوە.');
            }
        };
        const saveDraft = () => {
            const fields = getFields();
            const draft = {
                fields: fields.map((field, index) => ({
                    key: getFieldKey(field, index),
                    type: field.type || '',
                    value: field.value,
                    checked: field.checked
                })),
                totals: {
                    quantity: document.getElementById('q-total')?.textContent ?? '',
                    area: document.getElementById('grand-total')?.textContent ?? ''
                }
            };

            try {
                localStorage.setItem(storageKey, JSON.stringify(draft));
            } catch (error) {
                reportDraftFailure('Glass order draft could not be saved.', error);
            }
        };

        try {
            const savedDraft = localStorage.getItem(storageKey);
            if (savedDraft) {
                const draft = JSON.parse(savedDraft);
                const fields = getFields();
                const canRestore = Array.isArray(draft.fields)
                    && draft.fields.length === fields.length
                    && draft.fields.every((saved, index) =>
                        saved.key === getFieldKey(fields[index], index)
                        && saved.type === (fields[index].type || '')
                    );

                if (!canRestore) {
                    throw new Error('Saved glass order draft does not match the current form.');
                }

                draft.fields.forEach((saved, index) => {
                    const field = fields[index];
                    field.value = saved.value;
                    if (typeof saved.checked === 'boolean') field.checked = saved.checked;
                });
                const quantityTotal = document.getElementById('q-total');
                const areaTotal = document.getElementById('grand-total');
                if (quantityTotal && draft.totals) quantityTotal.textContent = draft.totals.quantity;
                if (areaTotal && draft.totals) areaTotal.textContent = draft.totals.area;
            }
        } catch (error) {
            reportDraftFailure('Glass order draft could not be restored.', error);
        }

        document.addEventListener('input', saveDraft);
        document.addEventListener('change', saveDraft);

        const clearDraft = () => {
            try {
                localStorage.removeItem(storageKey);
            } catch (error) {
                reportDraftFailure('Glass order draft could not be cleared.', error);
            }
        };
        const savePage = window.savePage;
        if (typeof savePage === 'function') {
            window.savePage = function (...args) {
                const result = savePage.apply(this, args);
                clearDraft();
                return result;
            };
        }

        document.addEventListener('click', event => {
            if (event.target instanceof Element
                && event.target.closest('a[href*="Dashboard.html"], button[onclick*="Dashboard.html"]')) {
                clearDraft();
            }
        });
    }

    function scheduleDesignCapture() {
        if (captureTimer) clearTimeout(captureTimer);
        captureTimer = setTimeout(captureDesign, 500);
    }

    async function captureDesign() {
        const pages = Array.from(document.querySelectorAll('#container .print-page'));
        if (!pages.length) return;
        if (typeof window.html2canvas !== 'function') {
            console.error('Automatic glass design capture is unavailable: html2canvas did not load.');
            if (!captureFailureAlerted) {
                captureFailureAlerted = true;
                alert('نەتوانرا وێنەی نەخشەکە خۆکارانە دروست بکرێت. پەڕەکە نوێ بکەرەوە و دووبارە هەوڵ بدە.');
            }
            return;
        }

        try {
            if (document.fonts && document.fonts.ready) await document.fonts.ready;
            const images = [];
            for (const page of pages) {
                const canvas = await window.html2canvas(page, {
                    backgroundColor: '#ffffff',
                    scale: 0.75,
                    useCORS: true,
                    logging: false
                });
                images.push(canvas.toDataURL('image/jpeg', 0.68));
            }

            const context = JSON.parse(localStorage.getItem(ORDER_CONTEXT_KEY) || 'null');
            const company = context?.company || localStorage.getItem('jam_company_name') || '';
            const owner = context?.owner || localStorage.getItem('jam_customer_name') || '';
            if (!company && !owner) throw new Error('The glass design has no order name to match.');

            const pending = JSON.parse(localStorage.getItem(PENDING_DESIGNS_KEY) || '[]');
            if (!Array.isArray(pending)) throw new Error('The saved glass designs list is invalid.');
            const designId = context?.design_id || `${Date.now()}-${company}-${owner}`;
            const design = {
                design_id: designId,
                company,
                owner,
                order: context,
                images,
                created_at: new Date().toISOString()
            };
            const existingIndex = pending.findIndex(item => item.design_id === designId);
            if (existingIndex >= 0) pending[existingIndex] = design;
            else pending.push(design);
            localStorage.setItem(PENDING_DESIGNS_KEY, JSON.stringify(pending));
        } catch (error) {
            console.error('Automatic glass design save failed:', error);
            if (!captureFailureAlerted) {
                captureFailureAlerted = true;
                alert('نەخشەکە خۆکارانە خەزن نەکرا. تکایە دووبارە هەوڵ بدە.');
            }
        }
    }

    function initializeDesignCapture() {
        const container = document.getElementById('container');
        if (!container) return;

        const undoButton = document.querySelector('.design-undo-button');
        const redoButton = document.querySelector('.design-redo-button');
        const undoHistory = [];
        const redoHistory = [];
        let previousState = null;
        const getDesignState = () => ({
            notes: Array.from(container.querySelectorAll('.footer-input'), input => input.value),
            drawings: Array.from(container.querySelectorAll('.glass-draw'), drawing => drawing.className)
        });
        const updateUndoButton = () => {
            if (undoButton) {
                undoButton.disabled = undoHistory.length === 0;
                undoButton.style.opacity = undoButton.disabled ? '0.45' : '1';
            }
            if (redoButton) {
                redoButton.disabled = redoHistory.length === 0;
                redoButton.style.opacity = redoButton.disabled ? '0.45' : '1';
            }
        };
        const recordDesignChange = () => {
            const currentState = getDesignState();
            if (!previousState) {
                previousState = currentState;
                return;
            }
            if (JSON.stringify(currentState) === JSON.stringify(previousState)) return;
            undoHistory.push(previousState);
            redoHistory.length = 0;
            previousState = currentState;
            updateUndoButton();
        };
        const applyDesignState = state => {
            if (!state) return;

            const notes = container.querySelectorAll('.footer-input');
            const drawings = container.querySelectorAll('.glass-draw');
            if (notes.length !== state.notes.length || drawings.length !== state.drawings.length) {
                undoHistory.length = 0;
                previousState = getDesignState();
                updateUndoButton();
                return;
            }

            notes.forEach((input, index) => { input.value = state.notes[index]; });
            drawings.forEach((drawing, index) => { drawing.className = state.drawings[index]; });
            container.querySelectorAll('.hole-toggle').forEach(button => {
                const drawing = button.previousElementSibling;
                button.textContent = drawing.classList.contains('hole-left') ? 'کون: چەپ' : 'کون: ڕاست';
            });
            previousState = getDesignState();
            updateUndoButton();
            scheduleDesignCapture();
        };
        const undoDesignChange = () => {
            if (!undoHistory.length) return;
            redoHistory.push(getDesignState());
            applyDesignState(undoHistory.pop());
        };
        const redoDesignChange = () => {
            if (!redoHistory.length) return;
            undoHistory.push(getDesignState());
            applyDesignState(redoHistory.pop());
        };

        const observer = new MutationObserver(records => {
            scheduleDesignCapture();
            if (records.some(record => record.type === 'childList')) {
                undoHistory.length = 0;
                redoHistory.length = 0;
                previousState = getDesignState();
                updateUndoButton();
            }
        });
        observer.observe(container, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['class']
        });
        document.addEventListener('input', event => {
            if (event.target instanceof Element && event.target.matches('.footer-input')) {
                recordDesignChange();
                scheduleDesignCapture();
            }
        });
        document.addEventListener('click', event => {
            if (!(event.target instanceof Element)) return;
            if (event.target.closest('.hole-toggle')) {
                recordDesignChange();
                scheduleDesignCapture();
            }
        });
        if (undoButton) undoButton.addEventListener('click', undoDesignChange);
        if (redoButton) redoButton.addEventListener('click', redoDesignChange);
        const refreshButton = document.querySelector('.design-refresh-button');
        if (refreshButton) refreshButton.addEventListener('click', () => window.location.reload());
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeOrderDraftPersistence, { once: true });
        document.addEventListener('DOMContentLoaded', initializeDesignCapture, { once: true });
    } else {
        initializeOrderDraftPersistence();
        initializeDesignCapture();
    }
})();
