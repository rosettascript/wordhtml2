/**
 * Custom CSS Handler
 * Handles custom CSS application to output
 */

const CustomCSSHandler = {
    /**
     * Initialize custom CSS handler
     * @param {HTMLElement} textareaElement - Textarea element for custom CSS
     * @param {Function} onChangeCallback - Callback when CSS changes
     */
    init(textareaElement, onChangeCallback) {
        if (!textareaElement || !onChangeCallback) {
            console.error('CustomCSSHandler: textareaElement and onChangeCallback are required');
            return;
        }

        // Listen for input changes - triggers immediately as user types
        textareaElement.addEventListener('input', () => {
            const css = textareaElement.value;
            onChangeCallback(css);
        });

        // Also listen for paste events
        textareaElement.addEventListener('paste', (e) => {
            // Let paste happen, then trigger callback
            setTimeout(() => {
                const css = textareaElement.value;
                onChangeCallback(css);
            }, 0);
        });
        
        // Listen for keyup as backup (in case input event doesn't fire)
        textareaElement.addEventListener('keyup', () => {
            const css = textareaElement.value;
            onChangeCallback(css);
        });
        
        // Initial trigger to ensure CSS is applied if there's already content
        const initialCSS = textareaElement.value;
        if (initialCSS) {
            onChangeCallback(initialCSS);
        }
    },

    /**
     * Get current custom CSS
     * @param {HTMLElement} textareaElement - Textarea element
     * @returns {string} - Custom CSS
     */
    getCSS(textareaElement) {
        if (!textareaElement) return '';
        return textareaElement.value || '';
    },

    /**
     * Set custom CSS
     * @param {HTMLElement} textareaElement - Textarea element
     * @param {string} css - CSS to set
     */
    setCSS(textareaElement, css) {
        if (!textareaElement) return;
        textareaElement.value = css || '';
    }
};



