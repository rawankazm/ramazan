(function () {
    const dimensionProperties = ['width', 'min-width', 'max-width', 'height', 'min-height', 'max-height'];
    const originalDimensions = new Map();

    document.querySelectorAll('table.data-table').forEach(table => {
        [table, ...table.querySelectorAll('col, tr, th, td')].forEach(element => {
            originalDimensions.set(element, dimensionProperties.map(property => ({
                property,
                value: element.style.getPropertyValue(property),
                priority: element.style.getPropertyPriority(property)
            })));
        });
    });

    window.resetTableSizes = function () {
        if (!confirm('دڵنیایت دەتەوێت هەموو قەبارەی ستوون و ڕیزەکان بگەڕێنیتەوە بۆ باری سەرەتایی؟')) return;

        originalDimensions.forEach((properties, element) => {
            properties.forEach(({ property, value, priority }) => {
                if (value) {
                    element.style.setProperty(property, value, priority);
                } else {
                    element.style.removeProperty(property);
                }
            });
        });
    };
})();
