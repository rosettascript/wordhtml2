/**
 * Custom CSS Handler
 * Handles custom CSS application to output
 */

const CustomCSSHandler = {
    lineNumbersElement: null,
    textareaElement: null,

    /**
     * Update line numbers display
     */
    updateLineNumbers() {
        if (!this.textareaElement || !this.lineNumbersElement) return;

        const lines = this.textareaElement.value.split('\n');
        const lineCount = lines.length || 1;
        
        // Generate line numbers
        const lineNumbers = Array.from({ length: lineCount }, (_, i) => i + 1)
            .join('\n');
        
        this.lineNumbersElement.textContent = lineNumbers;
        
        // Sync scroll position
        this.lineNumbersElement.scrollTop = this.textareaElement.scrollTop;
    },

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

        this.textareaElement = textareaElement;
        this.lineNumbersElement = document.getElementById('css-line-numbers');

        // Update line numbers on input
        const updateLines = () => {
            this.updateLineNumbers();
            const css = textareaElement.value;
            onChangeCallback(css);
        };

        // Listen for input changes - triggers immediately as user types
        textareaElement.addEventListener('input', updateLines);

        // Also listen for paste events
        textareaElement.addEventListener('paste', (e) => {
            // Let paste happen, then trigger callback
            setTimeout(() => {
                updateLines();
            }, 0);
        });
        
        // Listen for scroll to sync line numbers
        textareaElement.addEventListener('scroll', () => {
            if (this.lineNumbersElement) {
                this.lineNumbersElement.scrollTop = textareaElement.scrollTop;
            }
        });
        
        // Initial update
        this.updateLineNumbers();
        
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
        // Update line numbers after setting CSS
        if (this.textareaElement === textareaElement) {
            this.updateLineNumbers();
        }
    }
};



