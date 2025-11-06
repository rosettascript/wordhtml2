/**
 * Output Renderer
 * Renders final HTML output reactively
 */

const OutputRenderer = {
    outputElement: null,
    customCSS: '',
    previewMode: false,
    currentHTML: '',

    /**
     * Initialize output renderer
     * @param {HTMLElement} outputElement - Output display element
     */
    init(outputElement) {
        if (!outputElement) {
            console.error('OutputRenderer: outputElement is required');
            return;
        }

        this.outputElement = outputElement;
        this.previewMode = false;
        this.currentHTML = '';
        this.customCSS = '';
    },

    /**
     * Decode HTML entities (if HTML is already escaped)
     * @param {string} html - HTML string that may contain entities
     * @returns {string} - Decoded HTML
     */
    decodeHTMLEntities(html) {
        // Use a textarea element to decode HTML entities properly
        // Setting innerHTML on a textarea will decode entities, then we can read the value
        const textarea = document.createElement('textarea');
        textarea.innerHTML = html;
        let decoded = textarea.value;
        
        // If textarea didn't decode it (some browsers), manually decode
        if (decoded === html && html.includes('&lt;')) {
            // Manual decoding - handle &amp; last to avoid double-decoding
            decoded = html
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&quot;/g, '"')
                .replace(/&#39;/g, "'")
                .replace(/&nbsp;/g, ' ')
                .replace(/&amp;/g, '&'); // Do &amp; last
        }
        
        return decoded;
    },

    /**
     * Render HTML output
     * @param {string} html - HTML to render
     * @param {string} customCSS - Custom CSS to apply
     */
    render(html, customCSS = '') {
        if (!this.outputElement) {
            console.error('OutputRenderer: not initialized');
            return;
        }

        // Store HTML and CSS (even if empty)
        this.customCSS = customCSS || '';
        this.currentHTML = html || '';

        // Clear the output element
        this.outputElement.innerHTML = '';
        
        // Render in preview mode or code mode
        if (this.previewMode) {
            this.renderPreview(this.currentHTML, this.customCSS);
        } else {
            this.renderCode(this.currentHTML, this.customCSS);
        }
    },

    /**
     * Render HTML as code with syntax highlighting
     * @param {string} html - HTML to render
     * @param {string} customCSS - Custom CSS to apply
     */
    renderCode(html, customCSS = '') {
        // Remove preview mode class
        this.outputElement.classList.remove('preview-mode');
        
        // Decode HTML entities if the HTML is already escaped
        let decodedHTML = html;
        if (html.includes('&lt;') || html.includes('&gt;') || html.includes('&amp;')) {
            decodedHTML = this.decodeHTMLEntities(html);
        }
        
        // Format HTML with line breaks (same as what gets copied)
        let formattedHTML = this.formatHTMLWithLineBreaks(decodedHTML);
        
        // Create <pre><code> block to display HTML with syntax highlighting
        const pre = document.createElement('pre');
        const code = document.createElement('code');
        
        // Add language class for Prism.js syntax highlighting
        code.className = 'language-markup';
        
        // Add custom CSS at the top if provided (without <style> tags in display)
        if (customCSS && customCSS.trim()) {
            // Display CSS without <style> tags
            code.textContent = customCSS.trim() + '\n\n' + formattedHTML;
        } else {
            code.textContent = formattedHTML;
        }
        
        pre.appendChild(code);
        this.outputElement.appendChild(pre);
        
        // Apply Prism.js syntax highlighting
        if (window.Prism) {
            Prism.highlightElement(code);
        }
    },

    /**
     * Render HTML as preview (rendered HTML)
     * @param {string} html - HTML to render
     * @param {string} customCSS - Custom CSS to apply
     */
    renderPreview(html, customCSS = '') {
        // Remove preview mode class first to reset
        this.outputElement.classList.remove('preview-mode');
        
        if (!html || html.trim() === '') {
            // If no HTML, just show empty preview
            const previewContainer = document.createElement('div');
            previewContainer.className = 'preview-container';
            previewContainer.innerHTML = '<p style="color: #9CA3AF; font-style: italic;">No content to preview</p>';
            this.outputElement.appendChild(previewContainer);
            this.outputElement.classList.add('preview-mode');
            return;
        }

        // Decode HTML entities if needed
        let decodedHTML = html;
        if (html.includes('&lt;') || html.includes('&gt;') || html.includes('&amp;')) {
            decodedHTML = this.decodeHTMLEntities(html);
        }

        // Create a container for the preview
        const previewContainer = document.createElement('div');
        previewContainer.className = 'preview-container';
        
        // Add custom CSS if provided
        if (customCSS && customCSS.trim()) {
            const style = document.createElement('style');
            style.textContent = customCSS.trim();
            previewContainer.appendChild(style);
        }
        
        // Set the HTML content (this will render it)
        // Use innerHTML assignment, not += to avoid issues
        previewContainer.innerHTML = decodedHTML;
        
        this.outputElement.appendChild(previewContainer);
        this.outputElement.classList.add('preview-mode');
    },

    /**
     * Toggle between preview and code mode
     */
    togglePreview() {
        this.previewMode = !this.previewMode;
        
        // Re-render with current HTML and CSS
        // Always re-render, even if currentHTML is empty string
        if (this.currentHTML !== undefined && this.currentHTML !== null) {
            this.render(this.currentHTML, this.customCSS);
        }
        
        return this.previewMode;
    },

    /**
     * Get current preview mode state
     */
    isPreviewMode() {
        return this.previewMode;
    },

    /**
     * Escape HTML for display
     * @param {string} html - HTML string
     * @returns {string} - Escaped HTML
     */
    escapeHTML(html) {
        const div = document.createElement('div');
        div.textContent = html;
        return div.innerHTML;
    },

    /**
     * Set custom CSS
     * @param {string} css - CSS string
     */
    setCustomCSS(css) {
        this.customCSS = css;
    },

    /**
     * Get formatted HTML (for copying)
     * @param {string} html - HTML string
     * @returns {string} - Formatted HTML with line breaks
     */
    getFormattedHTML(html) {
        if (!html) return '';
        
        // Format HTML with line breaks for readability
        const formatted = this.formatHTMLWithLineBreaks(html);
        
        // Apply custom CSS wrapper if needed
        if (this.customCSS) {
            return `<style>${this.customCSS}</style>\n${formatted}`;
        }
        
        return formatted;
    },
    
    /**
     * Format HTML with line breaks between block elements for readability
     * @param {string} html - HTML string
     * @returns {string} - Formatted HTML with line breaks
     */
    formatHTMLWithLineBreaks(html) {
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
};


