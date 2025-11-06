/**
 * Main Application
 * Wires up all components and initializes the application
 * 
 * DEBUGGING: To enable detailed debugging logs, open browser console and run:
 *   window.DEBUG_HTML_CLEANER = true;
 * Then paste your Word document content again.
 */

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
    // Get DOM elements
    const inputEditor = document.getElementById('input-editor');
    const outputDisplay = document.getElementById('output-display');
    const copyButton = document.getElementById('copy-output');
    const previewToggle = document.getElementById('preview-toggle');
    const modeSelect = document.getElementById('mode-select');
    const shopifyOptions = document.getElementById('shopify-options');
    const sop = document.getElementById('sop');
    const sopRemoveSpacing = document.getElementById('sop-remove-spacing');
    const sopSubOptions = document.getElementById('sop-sub-options');
    const customCSSInput = document.getElementById('custom-css');

    // Initialize Output Renderer
    OutputRenderer.init(outputDisplay);

    // Initialize Custom CSS Handler
    CustomCSSHandler.init(customCSSInput, (css) => {
        updateOutput();
    });

    // Initialize Toolbar Controller
    ToolbarController.init({
        modeSelect: modeSelect,
        shopifyOptions: shopifyOptions,
        sop: sop,
        sopRemoveSpacing: sopRemoveSpacing,
        sopSubOptions: sopSubOptions
    }, () => {
        updateOutput();
    });

    // Initialize Paste Handler
    PasteHandler.init(inputEditor, (html) => {
        updateOutput();
    });

    // Preview toggle handler
    if (previewToggle) {
        previewToggle.addEventListener('click', () => {
            const isPreview = OutputRenderer.togglePreview();
            if (isPreview) {
                previewToggle.classList.add('active');
            } else {
                previewToggle.classList.remove('active');
            }
        });
    }

    // Copy button handler
    if (copyButton) {
        copyButton.addEventListener('click', () => {
            const html = getOutputHTML();
            if (html) {
                navigator.clipboard.writeText(html).then(() => {
                    // Visual feedback - change icon briefly
                    copyButton.style.opacity = '0.6';
                    setTimeout(() => {
                        copyButton.style.opacity = '1';
                    }, 500);
                }).catch(err => {
                    console.error('Failed to copy:', err);
                    alert('Failed to copy to clipboard');
                });
            }
        });
    }

    /**
     * Update output based on current input and settings
     */
    function updateOutput() {
        // Get HTML in document order from contenteditable
        const inputHTML = getOrderedContent(inputEditor);
        
        // Get custom CSS first (always get it, even if input is empty)
        const customCSS = CustomCSSHandler.getCSS(customCSSInput);
        
        // If no input HTML, still show CSS if it exists
        if (!inputHTML || inputHTML.trim() === '') {
            if (customCSS && customCSS.trim()) {
                // Show just the CSS in the output
                OutputRenderer.render('', customCSS);
            } else {
                outputDisplay.textContent = '';
            }
            return;
        }

        // Convert Word HTML to clean HTML
        let cleanedHTML = HtmlConverter.convert(inputHTML);

        // Get mode and options
        const mode = ToolbarController.getMode();
        const options = ToolbarController.getOptions();

        // Apply transformations based on mode
        if (mode === 'shopify') {
            cleanedHTML = ShopifyTransformer.transform(cleanedHTML, options);
        }

        // Render output with custom CSS
        OutputRenderer.render(cleanedHTML, customCSS);
    }

    /**
     * Format HTML with line breaks between block elements for readability
     * @param {string} html - HTML string
     * @returns {string} - Formatted HTML with line breaks
     */
    function formatHTMLWithLineBreaks(html) {
        if (!html) return '';
        
        let formatted = html;
        
        // Add line breaks before opening tags of block elements
        formatted = formatted.replace(/(<(?:h[1-6]|p|ul|ol|li|div|blockquote)[^>]*>)/gi, '\n$1');
        
        // Add line breaks after closing tags of block elements
        formatted = formatted.replace(/(<\/(?:h[1-6]|p|ul|ol|li|div|blockquote)>)/gi, '$1\n');
        
        // Clean up multiple consecutive newlines (keep max 2)
        formatted = formatted.replace(/\n{3,}/g, '\n\n');
        
        // Clean up newlines between list items (they should be on separate lines)
        formatted = formatted.replace(/(<\/li>)\s*\n\s*(<li>)/gi, '$1\n$2');
        
        // Ensure proper spacing around headings
        formatted = formatted.replace(/(<\/h[1-6]>)\s*\n\s*(<h[1-6])/gi, '$1\n\n$2');
        
        // Ensure proper spacing after lists
        formatted = formatted.replace(/(<\/[uo]l>)\s*\n\s*(<[h1-6p])/gi, '$1\n\n$2');
        
        // Remove leading/trailing whitespace
        formatted = formatted.trim();
        
        return formatted;
    }

    /**
     * Get HTML content in document order from contenteditable
     * @param {HTMLElement} element - Contenteditable element
     * @returns {string} - HTML in document order
     */
    function getOrderedContent(element) {
        // Extract all child elements in document order
        // This preserves separate paragraphs and other block elements
        const elements = [];
        let node = element.firstChild;
        
        // Debug: Log extraction order
        if (window.DEBUG_HTML_CLEANER) {
            const children = Array.from(element.children);
            const order = children.map((el, idx) => ({
                index: idx,
                tag: el.tagName,
                text: el.textContent.substring(0, 30).replace(/\s+/g, ' ')
            }));
            console.log('📤 EXTRACTING FROM CONTENTEDITABLE:', order);
        }
        
        // Walk through all child nodes (including text nodes between elements)
        while (node) {
            if (node.nodeType === 1) { // Element node (P, H1, UL, etc.)
                // For paragraphs, check if they contain line breaks and split them
                if (node.tagName === 'P') {
                    const paraText = node.textContent;
                    // If paragraph contains newlines or <br>, split into separate paragraphs
                    if (paraText.includes('\n') || node.querySelectorAll('br').length > 0) {
                        // Split by newlines or <br> tags - each becomes separate <p>
                        // IMPORTANT: We need to preserve HTML structure (like <em>, <strong>)
                        // So we'll split the HTML content, not just text
                        const innerHTML = node.innerHTML;
                        const lines = innerHTML.split(/(?:\n|<br\s*\/?>)/i);
                        lines.forEach(line => {
                            const trimmed = line.trim();
                            if (trimmed) {
                                // Create a new paragraph for each line
                                // Use innerHTML to preserve inline formatting like <em>, <strong>
                                const p = document.createElement('p');
                                p.innerHTML = trimmed;
                                elements.push(p.outerHTML);
                            }
                        });
                    } else {
                        // No line breaks - just use the paragraph as-is (preserves all formatting)
                        elements.push(node.outerHTML);
                    }
                } else {
                    // Get the outerHTML to preserve the element and its contents
                    elements.push(node.outerHTML);
                }
            } else if (node.nodeType === 3) { // Text node
                // Only wrap text nodes if they have meaningful content
                const text = node.textContent;
                if (text.trim()) {
                    // If text contains newlines, split into separate paragraphs
                    if (text.includes('\n')) {
                        const lines = text.split('\n');
                        lines.forEach(line => {
                            const trimmed = line.trim();
                            if (trimmed) {
                                elements.push(`<p>${trimmed}</p>`);
                            }
                        });
                    } else {
                        elements.push(`<p>${text.trim()}</p>`);
                    }
                }
            }
            node = node.nextSibling;
        }
        
        // Join all elements with line breaks for readability
        if (elements.length > 0) {
            // Format with line breaks between block elements
            const html = elements.join('');
            return formatHTMLWithLineBreaks(html);
        }
        
        // Final fallback: use innerHTML and format it
        return formatHTMLWithLineBreaks(element.innerHTML);
    }

    /**
     * Get formatted output HTML for copying
     * @returns {string} - Formatted HTML
     */
    function getOutputHTML() {
        const inputHTML = getOrderedContent(inputEditor);
        
        if (!inputHTML || inputHTML.trim() === '') {
            return '';
        }

        // Convert Word HTML to clean HTML
        let cleanedHTML = HtmlConverter.convert(inputHTML);

        // Get mode and options
        const mode = ToolbarController.getMode();
        const options = ToolbarController.getOptions();

        // Apply transformations based on mode
        if (mode === 'shopify') {
            cleanedHTML = ShopifyTransformer.transform(cleanedHTML, options);
        }

        // Get custom CSS
        const customCSS = CustomCSSHandler.getCSS(customCSSInput);

        // Return formatted HTML
        return OutputRenderer.getFormattedHTML(cleanedHTML);
    }

    // Initial update
    updateOutput();
});

