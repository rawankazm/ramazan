(function () {
    const glassTypeInput = document.getElementById('glass_type');
    let analysis = null;
    let currentMode = true;

    function hasGlassText(part) {
        const cleaned = part.replace(/[\d\s\.\,\-\+\/\\mmملمcmسم]/gi, '').trim();
        return cleaned.length > 0;
    }

    function analyzeGlassTypes(input) {
        if (!input || !input.trim()) {
            return { count: 0, types: [], mode: 'unknown', raw: '' };
        }

        const raw = input.trim();
        const delimiterRegex = /\s*(?:[+/\\,*;،\n؛]|(?:\s+-\s+)|(?:\s+[و]\s+)|(?:\s+مع\s+)|(?:\s+لەگەڵ\s+))\s*/;
        const parts = raw.split(delimiterRegex).map(part => part.trim()).filter(Boolean);

        if (parts.length >= 2) {
            const firstHasGlassText = hasGlassText(parts[0]);
            const secondHasGlassText = hasGlassText(parts[1]);

            if (firstHasGlassText && secondHasGlassText) {
                if (parts[0].toLowerCase() === parts[1].toLowerCase()) {
                    return { count: 1, types: [parts[0]], mode: 'single', raw };
                }
                return { count: 2, types: [parts[0], parts[1]], mode: 'double', raw };
            }
            if (!firstHasGlassText && !secondHasGlassText) {
                if (parts[0] === parts[1]) {
                    return { count: 1, types: [raw], mode: 'single', raw };
                }
                return { count: 2, types: [parts[0], parts[1]], mode: 'double', raw };
            }
            return { count: 1, types: [raw], mode: 'single', raw };
        }

        const keywords = [
            'شفاف', 'سوپەر کلیر', 'سوبر کلير', 'کلیر',
            'رصاصي', 'ڕەساسی', 'ڕەساسى', 'رصاصى', 'سەوز', 'اخضر', 'شین', 'ازرق',
            'فامی', 'فامێ', 'فامى', 'عسلي', 'عسلى', 'هەنگوینی', 'برۆنز',
            'سکلێت', 'سیکوریت', 'مرايا', 'ئاوێنە', 'مسنفر', 'ساندبلاست',
            'اسود', 'ڕەش', 'قاوەیی', 'بني', 'مات'
        ];
        let found = [];
        for (const keyword of keywords) {
            if (!raw.includes(keyword)) continue;
            if (!found.some(value => value.includes(keyword))) {
                found = found.filter(value => !keyword.includes(value));
                found.push(keyword);
            }
        }

        if (found.length >= 2) {
            return { count: 2, types: [found[0], found[1]], mode: 'double', raw };
        }
        return { count: 1, types: [raw], mode: 'single', raw };
    }

    function addInputRecognition() {
        if (!glassTypeInput) return;
        const styles = document.createElement('style');
        styles.textContent = `
            .glass-type-recognition-badge {
                position: absolute;
                z-index: 2;
                bottom: 1px;
                left: 2px;
                display: none;
                padding: 1px 4px;
                border-radius: 3px;
                font: bold 9px 'Segoe UI', Tahoma, sans-serif;
                pointer-events: none;
                white-space: nowrap;
            }
            .smart-glass-banner {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 12px;
                margin: 8px auto;
                padding: 8px 12px;
                max-width: 900px;
                border-radius: 6px;
                background: #e8f8f5;
                color: #176b45;
                font: bold 13px 'Segoe UI', Tahoma, sans-serif;
                direction: rtl;
            }
            .smart-glass-banner button {
                border: 0;
                border-radius: 4px;
                padding: 6px 10px;
                color: white;
                background: #2980b9;
                font-weight: bold;
                cursor: pointer;
                white-space: nowrap;
            }
            .smart-glass-label {
                color: #c0392b;
                font-size: 11px;
                font-weight: bold;
            }
            @media print {
                .smart-glass-banner,
                .glass-type-recognition-badge { display: none !important; }
            }
        `;
        document.head.appendChild(styles);

        const cell = glassTypeInput.closest('td');
        const badge = document.createElement('span');
        badge.className = 'glass-type-recognition-badge';
        badge.setAttribute('aria-live', 'polite');
        if (cell) {
            cell.style.position = 'relative';
            cell.appendChild(badge);
        }

        let datalist = document.getElementById('glass_suggestions');
        if (!datalist) {
            datalist = document.createElement('datalist');
            datalist.id = 'glass_suggestions';
            [
                '6ملم شفاف حراري',
                '6ملم رصاصي حراري',
                '6ملم فامي حراري',
                '6ملم عسلي حراري',
                '6ملم برۆنز حراري',
                'دبل شفاف 6+6'
            ].forEach(value => {
                const option = document.createElement('option');
                option.value = value;
                datalist.appendChild(option);
            });
            document.body.appendChild(datalist);
        }
        glassTypeInput.setAttribute('list', datalist.id);

        const updateBadge = () => {
            analysis = analyzeGlassTypes(glassTypeInput.value);
            if (analysis.mode === 'unknown') {
                badge.style.display = 'none';
                return;
            }
            badge.textContent = analysis.mode === 'double' ? '٢ جۆر' : '١ جۆر';
            badge.style.display = 'inline-block';
            badge.style.background = analysis.mode === 'double' ? '#fef5e7' : '#e8f8f5';
            badge.style.color = analysis.mode === 'double' ? '#d35400' : '#27ae60';
            badge.style.border = `1px solid ${analysis.mode === 'double' ? '#e67e22' : '#27ae60'}`;
        };
        ['input', 'change'].forEach(eventName => glassTypeInput.addEventListener(eventName, updateBadge));
        updateBadge();
    }

    function addDesignerRecognition() {
        const overlay = document.getElementById('selection-overlay');
        const container = document.getElementById('container');
        if (!overlay || !container || typeof window.startRendering !== 'function') return;

        const rawType = localStorage.getItem('jam_glass_type') || '';
        analysis = analyzeGlassTypes(rawType);
        if (analysis.mode === 'unknown') return;

        const startRendering = window.startRendering;
        window.startRendering = function (isSame) {
            currentMode = isSame;
            const result = startRendering.apply(this, arguments);
            showDesignerState();
            return result;
        };

        function addGlassLabels() {
            const pages = Array.from(container.querySelectorAll('.print-page'));
            if (!pages.length) return;
            let orderCount = 0;
            try {
                const orders = JSON.parse(localStorage.getItem('glass_orders_2026') || '[]');
                orderCount = Array.isArray(orders) ? orders.length : 0;
            } catch (error) {
                console.error('Unable to read glass orders for type labels.', error);
            }
            const pagesPerGroup = Math.max(1, Math.ceil(orderCount / 8));

            pages.forEach((page, index) => {
                const header = page.querySelector('.page-header');
                if (!header) return;
                let label = analysis.raw;
                if (!currentMode && analysis.mode === 'double') {
                    label = index < pagesPerGroup
                        ? `${analysis.types[0]} (کوندار)`
                        : `${analysis.types[1]} (سادە)`;
                } else if (!currentMode) {
                    label = index < pagesPerGroup
                        ? `${analysis.types[0]} (کوندار)`
                        : `${analysis.types[0]} (سادە)`;
                } else if (analysis.mode === 'double') {
                    label = analysis.types.join(' / ');
                }

                const labelElement = document.createElement('div');
                labelElement.className = 'smart-glass-label';
                labelElement.textContent = `جۆری جام: ${label}`;
                header.appendChild(labelElement);
            });
        }

        let banner = document.getElementById('smart-glass-banner');
        if (!banner) {
            banner = document.createElement('div');
            banner.id = 'smart-glass-banner';
            banner.className = 'smart-glass-banner';
            const printArea = document.getElementById('pdf-area') || container;
            printArea.parentElement.insertBefore(banner, printArea);
        }

        function showDesignerState() {
            const message = analysis.mode === 'double'
                ? `سیستەمی زیرەک: دوو جۆری جام ناسرایەوە (${analysis.types.join(' و ')}).`
                : `سیستەمی زیرەک: جۆری جام ناسرایەوە (${analysis.raw}).`;
            banner.replaceChildren(document.createTextNode(message));

            const toggle = document.createElement('button');
            toggle.type = 'button';
            toggle.textContent = currentMode ? 'گۆڕین بۆ پەڕەی جیاواز' : 'گۆڕین بۆ یەک پەڕە';
            toggle.addEventListener('click', () => window.startRendering(!currentMode));
            banner.appendChild(toggle);
            addGlassLabels();
        }

        window.startRendering(analysis.mode === 'single');
    }

    if (glassTypeInput) {
        const originalOrderGlass = window.orderGlass;
        if (typeof originalOrderGlass === 'function') {
            window.orderGlass = function () {
                localStorage.setItem('jam_glass_type', glassTypeInput.value.trim());
                return originalOrderGlass.apply(this, arguments);
            };
        }
        addInputRecognition();
    } else {
        addDesignerRecognition();
    }
})();
