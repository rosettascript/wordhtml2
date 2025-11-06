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

        // Save scroll position before updating (both absolute and percentage)
        const scrollTop = this.outputElement.scrollTop;
        const scrollLeft = this.outputElement.scrollLeft;
        const scrollHeight = this.outputElement.scrollHeight;
        const clientHeight = this.outputElement.clientHeight;
        const maxScrollTop = scrollHeight - clientHeight;
        // Calculate scroll percentage (0 to 1)
        const scrollPercentage = maxScrollTop > 0 ? scrollTop / maxScrollTop : 0;

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

        // Restore scroll position after content renders
        // Use a more robust approach with MutationObserver to catch when DOM is stable
        const restoreScroll = () => {
            const newScrollHeight = this.outputElement.scrollHeight;
            const newClientHeight = this.outputElement.clientHeight;
            const newMaxScrollTop = newScrollHeight - newClientHeight;
            const newMaxScrollLeft = this.outputElement.scrollWidth - this.outputElement.clientWidth;
            
            // Try to restore using percentage first (works better when content changes)
            let targetScrollTop;
            if (newMaxScrollTop > 0 && scrollPercentage > 0) {
                // Restore to same percentage position
                targetScrollTop = newMaxScrollTop * scrollPercentage;
            } else {
                // Fallback to absolute position if percentage doesn't work
                targetScrollTop = scrollTop;
            }
            
            // Clamp scroll position to valid range
            const clampedScrollTop = Math.min(targetScrollTop, Math.max(0, newMaxScrollTop));
            const clampedScrollLeft = Math.min(scrollLeft, Math.max(0, newMaxScrollLeft));
            
            this.outputElement.scrollTop = clampedScrollTop;
            this.outputElement.scrollLeft = clampedScrollLeft;
        };
        
        // Use MutationObserver to watch for DOM changes and restore scroll when stable
        let mutationTimeout;
        let restoreAttempts = 0;
        const maxRestoreAttempts = 10;
        
        const observer = new MutationObserver(() => {
            clearTimeout(mutationTimeout);
            mutationTimeout = setTimeout(() => {
                restoreScroll();
                restoreAttempts++;
                // Disconnect after successful restoration or max attempts
                if (restoreAttempts >= maxRestoreAttempts) {
                    observer.disconnect();
                }
            }, 100);
        });
        
        observer.observe(this.outputElement, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['class']
        });
        
        // Also try multiple times as fallback (more attempts for preview mode)
        requestAnimationFrame(() => {
            restoreScroll();
            setTimeout(restoreScroll, 100);
            setTimeout(restoreScroll, 200);
            setTimeout(restoreScroll, 300);
            setTimeout(restoreScroll, 500);
            setTimeout(restoreScroll, 700);
            setTimeout(restoreScroll, 1000);
        });
        
        // Cleanup observer after max wait time
        setTimeout(() => {
            observer.disconnect();
        }, 2000);
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
            // If no HTML, clear the output to show empty state
            this.outputElement.innerHTML = '';
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
        
        // Add custom CSS if provided (add it first, before HTML content)
        if (customCSS && customCSS.trim()) {
            let cssContent = customCSS.trim();
            
            // Extract CSS from all <style> tags if present, otherwise use the content as-is
            const styleTagRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi;
            const styleMatches = cssContent.match(styleTagRegex);
            
            if (styleMatches && styleMatches.length > 0) {
                // Extract content from all <style> tags
                cssContent = styleMatches.map(match => {
                    return match.replace(/<style[^>]*>/i, '').replace(/<\/style>/i, '').trim();
                }).join('\n\n');
            } else {
                // If no <style> tags, strip any single wrapping style tag if present
                cssContent = cssContent.replace(/^<style[^>]*>/i, '').replace(/<\/style>$/i, '').trim();
            }
            
            // Scope the CSS to .preview-container by prefixing each selector
            // Only apply rules that have !important - filter out rules without !important
            // This ensures custom CSS only overrides when explicitly marked with !important
            let scopedCSS = cssContent;
            
            // Match CSS rules (selector { properties })
            // This regex handles multi-line selectors and properties
            scopedCSS = scopedCSS.replace(/([^{}]+)\{([^{}]*)\}/g, (match, selector, properties) => {
                // Skip if already scoped or if it's a keyframe/media query
                if (selector.trim().startsWith('@') || selector.includes('.preview-container')) {
                    return match;
                }
                
                // Only process rules that contain !important
                // If properties don't have !important, skip this rule (return empty string)
                if (!properties.includes('!important')) {
                    return ''; // Filter out rules without !important
                }
                
                // Prefix each selector with .preview-container
                const prefixedSelectors = selector.split(',').map(s => {
                    const trimmed = s.trim();
                    // Skip comments, media queries, and already scoped selectors
                    if (trimmed.startsWith('@') || trimmed.startsWith('/*') || trimmed.includes('.preview-container')) {
                        return trimmed;
                    }
                    return `.preview-container ${trimmed}`;
                }).join(', ');
                
                return `${prefixedSelectors} {${properties}}`;
            });
            
            // Clean up any empty lines or extra whitespace left after filtering
            scopedCSS = scopedCSS.replace(/\n\s*\n\s*\n/g, '\n\n').trim();
            
            // Create a single style element with all the CSS
            const style = document.createElement('style');
            style.textContent = scopedCSS;
            previewContainer.appendChild(style);
        }
        
        // Create a content container for the HTML
        const contentDiv = document.createElement('div');
        contentDiv.innerHTML = decodedHTML;
        previewContainer.appendChild(contentDiv);
        
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


