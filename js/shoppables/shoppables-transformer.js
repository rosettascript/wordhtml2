/**
 * Shoppables Transformer
 * Applies Shopify-style tweaks tailored for Shoppable content
 * - Keeps Shopify link handling (rel="noopener", target="_blank")
 * - Uses <br> based spacing controls instead of spacer paragraphs
 * - Provides optional automatic Sources formatting
 */

const ShoppablesTransformer = {
    /**
     * Transform HTML to Shoppables format
     * @param {string} html - Input HTML
     * @param {Object} options - Transformation options
     * @param {boolean} options.shoppablesSop - Whether SOP is enabled (always true for Shoppables)
     * @param {boolean} options.shoppablesBrReadAlso - Insert <br> before Read also section
     * @param {boolean} options.shoppablesBrSources - Insert <br> before Sources section
     * @param {boolean} options.shoppablesDisableSources - Disable automatic sources formatting
     * @returns {string} - Transformed HTML
     */
    transform(html, options = {}) {
        if (!html) return '';

        const shoppablesOptions = {
            shoppablesSop: options.shoppablesSop !== false,
            shoppablesBrReadAlso: !!options.shoppablesBrReadAlso,
            shoppablesBrSources: !!options.shoppablesBrSources,
            shoppablesDisableSources: !!options.shoppablesDisableSources,
            shoppablesRemoveDomain: !!options.shoppablesRemoveDomain
        };

        // Base cleanup borrowed from Shopify transformer helpers
        let result = html;
        result = ShopifyTransformer.removeBrFromHeadings(result);
        result = ShopifyTransformer.removeEmTags(result);
        result = this.convertSourcesListToParagraphs(result, shoppablesOptions);
        result = ShopifyTransformer.fixKeyTakeawaysColon(result);
        result = ShopifyTransformer.fixAllLinks(result, { sopRemoveDomain: !!shoppablesOptions.shoppablesRemoveDomain });

        // Apply SOP-specific tweaks (line breaks instead of spacer paragraphs)
        if (shoppablesOptions.shoppablesSop) {
            result = this.applyLineBreakPreferences(result, shoppablesOptions);
        }

        // Always remove spacer paragraphs for Shoppables
        result = ShopifyTransformer.removeExtraSpacing(result);

        return HtmlCleaner.removeSpaceBeforePunctuationHTML(result);
    },

    /**
     * Convert Sources list to numbered paragraphs or italicized list items
     * Mirrors Shopify formatting but skips spacer paragraphs
     * @param {string} html - HTML string
     * @param {Object} options - Shoppables options
     * @returns {string} - HTML with formatted sources
     */
    convertSourcesListToParagraphs(html, options = {}) {
        const disableSources = !!options.shoppablesDisableSources;
        const tempDiv = HtmlParser.parseHTML(html);

        const paragraphs = tempDiv.querySelectorAll('p');

        for (let p of paragraphs) {
            const text = HtmlParser.getTextContent(p.innerHTML).toLowerCase().trim();
            if (!text.includes('sources')) continue;

            // Normalize Sources heading
            const sourcesText = HtmlParser.getTextContent(p.innerHTML).trim();
            if (sourcesText.toLowerCase().includes('sources')) {
                p.innerHTML = '<em><strong>Sources:</strong></em>';
            }

            // Locate following list
            let current = p.nextElementSibling;
            while (current) {
                const tagName = current.tagName ? current.tagName.toLowerCase() : '';

                if (tagName === 'ol' || tagName === 'ul') {
                    const listItems = current.querySelectorAll('li');
                    if (listItems.length === 0) break;

                    if (disableSources) {
                        listItems.forEach(li => {
                            ShopifyTransformer.removeBrFromListItem(li);
                            const originalHTML = li.innerHTML.trim();
                            if (!originalHTML) {
                                li.remove();
                                return;
                            }
                            if (li.style) {
                                li.style.fontStyle = 'italic';
                            } else {
                                li.setAttribute('style', 'font-style: italic;');
                            }
                            if (!/^<em[\s>]/i.test(originalHTML) || !/<\/em>\s*$/i.test(originalHTML)) {
                                li.innerHTML = `<em>${originalHTML}</em>`;
                            }
                        });

                        ShopifyTransformer.removeBrFromList(current);
                        ShopifyTransformer.removeTrailingBrNodes(current);
                        break;
                    } else {
                        let number = 0;
                        listItems.forEach((li, index) => {
                            ShopifyTransformer.removeBrFromListItem(li);
                            number = index + 1;
                            const itemHTML = li.innerHTML.trim();
                            if (!itemHTML) {
                                li.remove();
                                return;
                            }

                            const paragraph = document.createElement('p');
                            paragraph.innerHTML = `<em>${number}. ${itemHTML}</em>`;
                            current.parentNode.insertBefore(paragraph, current);
                        });

                        ShopifyTransformer.removeTrailingBrNodes(current);
                        current.remove();
                        break;
                    }
                }

                if (tagName === 'p' || tagName.match(/^h[1-6]$/)) {
                    break;
                }

                current = current.nextElementSibling;
            }
        }

        return tempDiv.innerHTML;
    },

    /**
     * Apply <br> customizations before specific sections
     * @param {string} html - HTML string
     * @param {Object} options - Shoppables options
     * @returns {string} - HTML with updated spacing
     */
    applyLineBreakPreferences(html, options = {}) {
        if (!options.shoppablesBrReadAlso && !options.shoppablesBrSources) {
            return html;
        }

        const tempDiv = HtmlParser.parseHTML(html);

        const ensureBrBefore = (element) => {
            if (!element || !element.parentNode) return;

            let prev = element.previousSibling;
            while (prev && prev.nodeType === 3 && (!prev.textContent || prev.textContent.trim() === '')) {
                prev = prev.previousSibling;
            }

            if (prev && prev.nodeType === 1 && prev.tagName.toLowerCase() === 'br') {
                return;
            }

            const br = document.createElement('br');
            element.parentNode.insertBefore(br, element);
        };

        if (options.shoppablesBrReadAlso) {
            const paragraphs = tempDiv.querySelectorAll('p');
            paragraphs.forEach(p => {
                const text = HtmlParser.getTextContent(p.innerHTML).toLowerCase().trim();
                if (
                    text.startsWith('read also') ||
                    text.startsWith('read more')
                ) {
                    ensureBrBefore(p);
                }
            });
        }

        if (options.shoppablesBrSources) {
            const paragraphs = tempDiv.querySelectorAll('p');
            paragraphs.forEach(p => {
                const text = HtmlParser.getTextContent(p.innerHTML).toLowerCase().trim();
                if (text === 'sources:' || text === 'sources') {
                    ensureBrBefore(p);
                }
            });
        }

        return tempDiv.innerHTML;
    }
};


