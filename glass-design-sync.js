(function () {
    const ORDER_CONTEXT_KEY = 'glass_design_order_context_2026';
    const PENDING_DESIGNS_KEY = 'glass_design_pending_2026';
    let captureTimer = null;
    let captureFailureAlerted = false;

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

        const observer = new MutationObserver(scheduleDesignCapture);
        observer.observe(container, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['class']
        });
        document.addEventListener('input', event => {
            if (event.target.classList.contains('footer-input')) scheduleDesignCapture();
        });
        document.addEventListener('click', event => {
            if (event.target.closest('.hole-toggle')) scheduleDesignCapture();
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeDesignCapture, { once: true });
    } else {
        initializeDesignCapture();
    }
})();
