(function () {
    const printCopies = [];
    let originalColumnStyles = [];
    let resizingStyle;

    function getPrintRoot() {
        return document.querySelector('#pdf-area, #printable-area, .a4-container');
    }

    function getResizableTables() {
        return Array.from(document.querySelectorAll('table.data-table, .a4-container table'));
    }

    function getStorageKey(table, suffix) {
        const tableIndex = getResizableTables().indexOf(table);
        return `worksheet_${encodeURIComponent(location.pathname)}_${tableIndex}_${suffix}`;
    }

    function addResizeStyles() {
        if (resizingStyle) return;
        resizingStyle = document.createElement('style');
        resizingStyle.textContent = `
            .worksheet-col-resizer {
                position: absolute;
                z-index: 20;
                top: 0;
                right: -7px;
                width: 14px;
                height: 100%;
                cursor: col-resize;
                user-select: none;
                background: transparent;
            }
            .worksheet-col-resizer::after {
                content: '';
                position: absolute;
                left: 6px;
                top: 0;
                width: 2px;
                height: 100%;
                background: #107c41;
                opacity: 0;
            }
            .worksheet-col-resizer:hover::after,
            .worksheet-col-resizer.active::after { opacity: 1; }
            .worksheet-row-resizer {
                position: absolute;
                z-index: 20;
                bottom: -7px;
                left: 0;
                width: 100%;
                height: 14px;
                cursor: row-resize;
                user-select: none;
                background: transparent;
            }
            .worksheet-row-resizer::after {
                content: '';
                position: absolute;
                top: 6px;
                left: 0;
                width: 100%;
                height: 2px;
                background: #107c41;
                opacity: 0;
            }
            .worksheet-row-resizer:hover::after,
            .worksheet-row-resizer.active::after { opacity: 1; }
            @media print {
                .worksheet-col-resizer,
                .worksheet-row-resizer { display: none !important; }
                table.data-table,
                .a4-container table {
                    max-width: 100% !important;
                    min-width: 0 !important;
                    table-layout: fixed !important;
                }
                .print-copy {
                    break-before: page !important;
                    page-break-before: always !important;
                }
            }
        `;
        document.head.appendChild(resizingStyle);
    }

    function applyTableWidth(table, width) {
        const wrapper = table.closest('.table-scroll-wrapper') || table.parentElement;
        const wrapperWidth = wrapper.clientWidth || window.innerWidth;
        if (width > wrapperWidth) {
            table.style.width = `${Math.round(width)}px`;
            table.style.minWidth = `${Math.round(width)}px`;
        } else {
            table.style.width = '100%';
            table.style.minWidth = '100%';
        }
    }

    function saveColumnWidths(table, ths) {
        const widths = ths.map(th => Math.round(th.getBoundingClientRect().width));
        localStorage.setItem(getStorageKey(table, 'columns'), JSON.stringify(widths));
        localStorage.setItem(getStorageKey(table, 'table-width'), table.style.width);
    }

    function saveRowHeights(table) {
        const rows = Array.from(table.querySelectorAll('tbody tr'));
        const heights = rows.map(row => Math.round(row.getBoundingClientRect().height));
        localStorage.setItem(getStorageKey(table, 'rows'), JSON.stringify(heights));
    }

    function attachRowResizers(table) {
        const rows = Array.from(table.querySelectorAll('thead tr, tbody tr'));
        rows.forEach((row, rowIndex) => {
            Array.from(row.children).forEach(cell => {
                if (cell.querySelector('.worksheet-row-resizer')) return;
                cell.style.position = 'relative';
                const handle = document.createElement('div');
                handle.className = 'worksheet-row-resizer';
                handle.title = 'ڕاکێشان بۆ گۆڕینی بەرزی ڕیز';
                cell.appendChild(handle);
                handle.addEventListener('mousedown', event => {
                    event.preventDefault();
                    event.stopPropagation();
                    const startY = event.clientY;
                    const startHeight = row.getBoundingClientRect().height;
                    const move = moveEvent => {
                        const height = Math.max(25, Math.round(startHeight + moveEvent.clientY - startY));
                        row.style.height = `${height}px`;
                        Array.from(row.children).forEach(rowCell => {
                            rowCell.style.height = `${height}px`;
                        });
                    };
                    const up = () => {
                        window.removeEventListener('mousemove', move);
                        window.removeEventListener('mouseup', up);
                        if (row.parentElement.tagName === 'TBODY') saveRowHeights(table);
                    };
                    window.addEventListener('mousemove', move);
                    window.addEventListener('mouseup', up);
                });
            });
        });

        let savedHeights = [];
        try {
            savedHeights = JSON.parse(localStorage.getItem(getStorageKey(table, 'rows')) || '[]');
        } catch (error) {
            console.error('Unable to read saved worksheet row heights.', error);
        }
        Array.from(table.querySelectorAll('tbody tr')).forEach((row, index) => {
            if (!savedHeights[index]) return;
            row.style.height = `${savedHeights[index]}px`;
            Array.from(row.children).forEach(cell => {
                cell.style.height = `${savedHeights[index]}px`;
            });
        });
    }

    function attachColumnResizers(table) {
        const ths = Array.from(table.querySelectorAll('thead th'));
        if (!ths.length) return;

        let savedWidths = [];
        try {
            savedWidths = JSON.parse(localStorage.getItem(getStorageKey(table, 'columns')) || '[]');
        } catch (error) {
            console.error('Unable to read saved worksheet column widths.', error);
        }
        if (savedWidths.length === ths.length) {
            ths.forEach((th, index) => {
                th.style.width = `${savedWidths[index]}px`;
            });
            const savedTableWidth = parseFloat(localStorage.getItem(getStorageKey(table, 'table-width')));
            if (savedTableWidth) applyTableWidth(table, savedTableWidth);
        }

        ths.forEach((th, index) => {
            th.style.position = 'relative';
            if (th.querySelector('.worksheet-col-resizer')) return;
            const handle = document.createElement('div');
            handle.className = 'worksheet-col-resizer';
            handle.title = 'ڕاکێشان بۆ گۆڕینی پانی ستوون';
            th.appendChild(handle);
            handle.addEventListener('mousedown', event => {
                event.preventDefault();
                event.stopPropagation();
                ths.forEach(header => {
                    header.style.width = `${Math.round(header.getBoundingClientRect().width)}px`;
                });
                const startX = event.clientX;
                const startWidth = th.getBoundingClientRect().width;
                const startTableWidth = Math.max(
                    ths.reduce((sum, header) => sum + header.getBoundingClientRect().width, 0),
                    (table.closest('.table-scroll-wrapper') || table.parentElement).clientWidth
                );
                handle.classList.add('active');

                const move = moveEvent => {
                    const newWidth = Math.max(30, Math.round(startWidth + moveEvent.clientX - startX));
                    th.style.width = `${newWidth}px`;
                    applyTableWidth(table, startTableWidth + newWidth - startWidth);
                };
                const up = () => {
                    handle.classList.remove('active');
                    window.removeEventListener('mousemove', move);
                    window.removeEventListener('mouseup', up);
                    saveColumnWidths(table, ths);
                };
                window.addEventListener('mousemove', move);
                window.addEventListener('mouseup', up);
            });
        });
    }

    function initializeResizing() {
        addResizeStyles();
        getResizableTables().forEach(table => {
            attachColumnResizers(table);
            attachRowResizers(table);
            const body = table.tBodies[0];
            if (body && !body.dataset.resizeObserverAttached) {
                body.dataset.resizeObserverAttached = 'true';
                new MutationObserver(() => attachRowResizers(table)).observe(body, { childList: true });
            }
        });
    }

    function copyCurrentValues(source, copy) {
        const sourceControls = source.querySelectorAll('input, textarea, select');
        const copyControls = copy.querySelectorAll('input, textarea, select');
        sourceControls.forEach((control, index) => {
            const target = copyControls[index];
            if (!target) return;
            if (control.type === 'checkbox' || control.type === 'radio') {
                target.checked = control.checked;
            } else {
                target.value = control.value;
            }
        });
        source.querySelectorAll('[contenteditable="true"]').forEach((element, index) => {
            const target = copy.querySelectorAll('[contenteditable="true"]')[index];
            if (target) target.innerHTML = element.innerHTML;
        });
    }

    function removeIds(element) {
        if (element.id) element.removeAttribute('id');
        element.querySelectorAll('[id]').forEach(child => child.removeAttribute('id'));
    }

    function createPrintCopies() {
        if (printCopies.length) return;
        const root = getPrintRoot();
        if (!root) return;

        for (let index = 0; index < 4; index++) {
            const copy = root.cloneNode(true);
            copy.classList.add('print-copy');
            removeIds(copy);
            copyCurrentValues(root, copy);
            document.body.appendChild(copy);
            printCopies.push(copy);
        }
    }

    function prepareTableWidthsForPrint() {
        const records = [];
        getResizableTables().forEach(table => {
            const ths = Array.from(table.querySelectorAll('thead th'));
            if (!ths.length) return;
            const widths = ths.map(th => {
                const inlineWidth = parseFloat(th.style.width);
                return th.style.width.endsWith('%') || !inlineWidth
                    ? th.getBoundingClientRect().width
                    : inlineWidth;
            });
            const total = widths.reduce((sum, width) => sum + width, 0);
            records.push({
                table,
                ths,
                originalWidths: ths.map(th => th.style.width),
                originalTableStyles: ['width', 'min-width', 'max-width'].map(property => ({
                    property,
                    value: table.style.getPropertyValue(property),
                    priority: table.style.getPropertyPriority(property)
                })),
                widths,
                total
            });
            if (total) {
                ths.forEach((th, index) => {
                    th.style.width = `${(widths[index] / total) * 100}%`;
                });
            }
            table.style.setProperty('width', '100%', 'important');
            table.style.setProperty('min-width', '0', 'important');
            table.style.setProperty('max-width', '100%', 'important');
        });
        originalColumnStyles = records;
    }

    function restoreAfterPrint() {
        originalColumnStyles.forEach(({ table, ths, originalWidths, originalTableStyles }) => {
            ths.forEach((th, index) => {
                th.style.width = originalWidths[index];
            });
            originalTableStyles.forEach(({ property, value, priority }) => {
                if (value) table.style.setProperty(property, value, priority);
                else table.style.removeProperty(property);
            });
        });
        originalColumnStyles = [];
        printCopies.forEach(copy => copy.remove());
        printCopies.length = 0;
    }

    initializeResizing();
    window.addEventListener('beforeprint', () => {
        createPrintCopies();
        prepareTableWidthsForPrint();
    });
    window.addEventListener('afterprint', restoreAfterPrint);
})();
