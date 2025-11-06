/**
 * Body Processor
 * Processes body content with spacing and header options
 */

const BodyProcessor = {
    /**
     * Process body content
     * @param {string} bodyHTML - Body HTML
     * @param {Object} options - Processing options
     * @param {boolean} options.sopRemoveSpacing - Remove spacing when SOP is enabled
     * @returns {string} - Processed HTML
     */
    process(bodyHTML, options = {}) {
        if (!bodyHTML) return '';

        let processed = bodyHTML;

        // Handle spacing
        if (options.sopRemoveSpacing) {
            processed = this.removeSpacing(processed);
        }

        // Clean up body content
        processed = this.cleanBodyContent(processed);

        return processed;
    },

    /**
     * Remove spacing (empty paragraphs, extra whitespace)
     * @param {string} html - HTML string
     * @returns {string} - HTML without spacing
     */
    removeSpacing(html) {
        const tempDiv = HtmlParser.parseHTML(html);
        
        // Remove empty paragraphs
        const paragraphs = tempDiv.querySelectorAll('p');
        paragraphs.forEach(p => {
            const text = HtmlParser.getTextContent(p.innerHTML).trim();
            if (!text || text === '' || text === ' ') {
                p.remove();
            }
        });

        // Remove multiple consecutive line breaks
        let cleaned = tempDiv.innerHTML;
        cleaned = cleaned.replace(/(<br\s*\/?>){2,}/gi, '');
        
        return cleaned;
    },

    /**
     * Clean body content
     * @param {string} html - HTML string
     * @returns {string} - Cleaned HTML
     */
    cleanBodyContent(html) {
        const tempDiv = HtmlParser.parseHTML(html);
        
        // Remove style attributes
        const allElements = tempDiv.querySelectorAll('*');
        allElements.forEach(el => {
            el.removeAttribute('style');
            el.removeAttribute('class');
        });

        // Ensure proper structure
        let cleaned = tempDiv.innerHTML;
        
        // Clean up whitespace
        cleaned = cleaned.replace(/>\s+</g, '><');
        cleaned = cleaned.replace(/^\s+|\s+$/g, '');
        
        return cleaned;
    }
};



