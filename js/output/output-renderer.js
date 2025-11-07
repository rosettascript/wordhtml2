/**
 * Output Renderer
 * Renders final HTML output reactively
 */

const OutputRenderer = {
    outputElement: null,
    customCSS: '',
    customCSSRaw: '',
    customCSSHasWrapper: false,
    customCSSWrapperStart: '<style>',
    customCSSWrapperEnd: '</style>',
    previewMode: false,
    currentHTML: '',
    editMode: false,
    manuallyEdited: false,
    editedHTML: '',

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
        this.customCSSRaw = '';
        this.customCSSHasWrapper = false;
        this.customCSSWrapperStart = '<style>';
        this.customCSSWrapperEnd = '</style>';
        this.editMode = false;
        this.manuallyEdited = false;
        this.editedHTML = '';
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
     * @param {boolean} fromInput - Whether this render is triggered by input change (resets manual edits)
     */
    render(html, customCSS = '', fromInput = false) {
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
        this.setCustomCSS(customCSS || '');
        this.currentHTML = html || '';
        
        // If this is from input change, reset manual edits
        if (fromInput) {
            this.manuallyEdited = false;
            this.editedHTML = '';
        }

        // Clear the output element
        this.outputElement.innerHTML = '';
        
        // Decide which HTML to render (edited or original)
        const htmlToRender = (this.manuallyEdited && this.editedHTML) ? this.editedHTML : this.currentHTML;
        
        // Render in preview mode or code mode
        const cssForRender = this.customCSSRaw;

        if (this.previewMode) {
            this.renderPreview(htmlToRender, cssForRender);
        } else {
            this.renderCode(htmlToRender, cssForRender);
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
        
        // If in edit mode, create an editable textarea
        if (this.editMode) {
            this.outputElement.classList.add('edit-mode');
            
            // Create textarea for editing
            const textarea = document.createElement('textarea');
            textarea.className = 'output-editor';
            textarea.spellcheck = false;
            
            // Add custom CSS at the top if provided
            if (customCSS && customCSS.trim()) {
                textarea.value = customCSS.trim() + '\n\n' + formattedHTML;
            } else {
                textarea.value = formattedHTML;
            }
            
            // Add input listener to track manual edits
            textarea.addEventListener('input', () => {
                this.manuallyEdited = true;
                this.editedHTML = textarea.value;
            });
            
            this.outputElement.appendChild(textarea);
        } else {
            // Read-only code view with syntax highlighting
            this.outputElement.classList.remove('edit-mode');
            
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
        
        // If in edit mode, add rich text editor toolbar
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
        contentDiv.className = 'preview-content';
        contentDiv.innerHTML = decodedHTML;
        
        // Make it editable if in edit mode
        if (this.editMode) {
            contentDiv.contentEditable = 'true';
            contentDiv.setAttribute('spellcheck', 'false');
            contentDiv.setAttribute('tabindex', '0');
            
            // Track changes
            contentDiv.addEventListener('input', () => {
                this.manuallyEdited = true;
                this.editedHTML = contentDiv.innerHTML;
                this.updateToolbarStates();
            });
            
            // Handle keyboard shortcuts for formatting
            contentDiv.addEventListener('keydown', (e) => {
                const modifier = e.ctrlKey || e.metaKey;
                
                // Allow Tab key to insert spaces (instead of changing focus)
                if (e.key === 'Tab') {
                    e.preventDefault();
                    document.execCommand('insertText', false, '  ');
                    return;
                }
                
                // Handle formatting shortcuts
                if (modifier) {
                    switch (e.key.toLowerCase()) {
                        case 'z':
                            // Undo (Ctrl+Z / Cmd+Z)
                            e.preventDefault();
                            document.execCommand('undo', false, null);
                            break;
                        case 'y':
                            // Redo (Ctrl+Y / Cmd+Y)
                            e.preventDefault();
                            document.execCommand('redo', false, null);
                            break;
                        case 'b':
                            // Bold (Ctrl+B / Cmd+B)
                            e.preventDefault();
                            document.execCommand('bold', false, null);
                            break;
                        case 'i':
                            // Italic (Ctrl+I / Cmd+I)
                            e.preventDefault();
                            document.execCommand('italic', false, null);
                            break;
                        case 'u':
                            // Underline (Ctrl+U / Cmd+U)
                            e.preventDefault();
                            document.execCommand('underline', false, null);
                            break;
                    }
                }
            });

            const scheduleUpdate = () => setTimeout(() => this.updateToolbarStates(), 0);
            contentDiv.addEventListener('mouseup', scheduleUpdate);
            contentDiv.addEventListener('keyup', scheduleUpdate);
            contentDiv.addEventListener('focus', scheduleUpdate);
        }
        
        previewContainer.appendChild(contentDiv);
        
        this.outputElement.appendChild(previewContainer);
        this.outputElement.classList.add('preview-mode');
        if (this.editMode) {
            this.outputElement.classList.add('edit-mode');
            this.renderToolbar();
        } else {
            this.outputElement.classList.remove('edit-mode');
            this.clearToolbar();
        }
    },

    renderToolbar() {
        const container = document.getElementById('output-toolbar-container');
        if (!container) return;

        container.innerHTML = '';
        const toolbar = this.createRichTextToolbar();
        container.appendChild(toolbar);
        this.updateToolbarStates();
    },

    clearToolbar() {
        const container = document.getElementById('output-toolbar-container');
        if (!container) return;
        container.innerHTML = '';
    },

    /**
     * Create rich text editor toolbar
     * @returns {HTMLElement} - Toolbar element
     */
    createRichTextToolbar() {
        const toolbar = document.createElement('div');
        toolbar.className = 'rich-text-toolbar';
        
        // Formatting buttons configuration
        const buttons = [
            { command: 'undo', icon: '↶', title: 'Undo (Ctrl+Z)', className: 'action-undo' },
            { command: 'redo', icon: '↷', title: 'Redo (Ctrl+Y)', className: 'action-redo' },
            { type: 'separator' },
            { command: 'bold', icon: 'B', title: 'Bold (Ctrl+B)', className: 'format-bold', toggleState: true },
            { command: 'italic', icon: 'I', title: 'Italic (Ctrl+I)', className: 'format-italic', toggleState: true },
            { command: 'underline', icon: 'U', title: 'Underline (Ctrl+U)', className: 'format-underline', toggleState: true },
            { type: 'separator' },
            { command: 'formatBlock', value: '<p>', icon: 'P', title: 'Paragraph', formatValue: '<p>' },
            { command: 'formatBlock', value: '<h1>', icon: 'H1', title: 'Heading 1', formatValue: '<h1>' },
            { command: 'formatBlock', value: '<h2>', icon: 'H2', title: 'Heading 2', formatValue: '<h2>' },
            { command: 'formatBlock', value: '<h3>', icon: 'H3', title: 'Heading 3', formatValue: '<h3>' },
            { command: 'formatBlock', value: '<h4>', icon: 'H4', title: 'Heading 4', formatValue: '<h4>' },
            { type: 'separator' },
            { command: 'insertUnorderedList', icon: '• List', title: 'Bullet List', toggleState: true },
            { command: 'insertOrderedList', icon: '1. List', title: 'Numbered List', toggleState: true },
            { type: 'separator' },
            { command: 'justifyLeft', icon: '≡', title: 'Align Left', toggleState: true },
            { command: 'justifyCenter', icon: '≣', title: 'Align Center', toggleState: true },
            { command: 'justifyRight', icon: '≢', title: 'Align Right', toggleState: true },
            { type: 'separator' },
            { command: 'removeFormat', icon: '✗', title: 'Clear Formatting' }
        ];
        
        buttons.forEach(btn => {
            if (btn.type === 'separator') {
                const separator = document.createElement('div');
                separator.className = 'toolbar-separator';
                toolbar.appendChild(separator);
            } else {
                const button = document.createElement('button');
                button.className = 'toolbar-button';
                if (btn.className) {
                    button.classList.add(btn.className);
                }
                button.textContent = btn.icon;
                button.title = btn.title;
                button.type = 'button';
                
                button.addEventListener('click', (e) => {
                    e.preventDefault();
                    if (btn.value) {
                        document.execCommand(btn.command, false, btn.value);
                    } else {
                        document.execCommand(btn.command, false, null);
                    }
                    this.updateToolbarStates();
                    const contentDiv = this.outputElement.querySelector('.preview-content');
                    if (contentDiv) {
                        contentDiv.focus();
                    }
                });

                if (btn.toggleState) {
                    button.dataset.commandName = btn.command;
                    button.classList.add('toggle-button');
                }

                if (btn.formatValue) {
                    button.dataset.formatBlock = btn.value;
                }

                toolbar.appendChild(button);
            }
        });
        
        return toolbar;
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
     * Toggle edit mode
     */
    toggleEdit() {
        this.editMode = !this.editMode;

        // Re-render with current HTML and CSS
        if (this.currentHTML !== undefined && this.currentHTML !== null) {
            this.render(this.currentHTML, this.customCSS);
        }
        
        if (this.editMode) {
            this.attachSelectionListeners();
        } else {
            this.detachSelectionListeners();
        }

        return this.editMode;
    },

    attachSelectionListeners() {
        const update = () => this.updateToolbarStates();
        document.addEventListener('selectionchange', update);
        this._selectionListener = update;
    },

    detachSelectionListeners() {
        if (this._selectionListener) {
            document.removeEventListener('selectionchange', this._selectionListener);
            this._selectionListener = null;
        }
    },

    updateToolbarStates() {
        if (!this.editMode || !this.outputElement) return;

        const toolbarContainer = document.getElementById('output-toolbar-container');
        if (!toolbarContainer) return;

        const toolbar = toolbarContainer.querySelector('.rich-text-toolbar');
        const contentDiv = this.outputElement.querySelector('.preview-content');
        if (!toolbar || !contentDiv) return;

        const selection = window.getSelection();
        const isActive = selection && selection.rangeCount > 0 && contentDiv.contains(selection.anchorNode);

        const toggleButtons = toolbar.querySelectorAll('.toggle-button');
        toggleButtons.forEach(button => {
            const command = button.dataset.commandName;
            let active = false;
            if (isActive && command) {
                try {
                    active = document.queryCommandState(command);
                } catch (_) {
                    active = false;
                }
            }
            button.classList.toggle('active', !!active);
        });

        const blockButtons = toolbar.querySelectorAll('[data-format-block]');
        let blockValue = '';
        if (isActive) {
            try {
                blockValue = document.queryCommandValue('formatBlock') || '';
            } catch (_) {
                blockValue = '';
            }
        }
        blockButtons.forEach(button => {
            const value = button.dataset.formatBlock || '';
            const normalize = (val) => val.replace(/[<>]/g, '').toLowerCase();
            button.classList.toggle('active', normalize(blockValue) === normalize(value));
        });
    },

    /**
     * Get current preview mode state
     */
    isPreviewMode() {
        return this.previewMode;
    },
    
    /**
     * Get current edit mode state
     */
    isEditMode() {
        return this.editMode;
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
        if (!css) {
            this.customCSS = '';
            this.customCSSRaw = '';
            this.customCSSHasWrapper = false;
            this.customCSSWrapperStart = '<style>';
            this.customCSSWrapperEnd = '</style>';
            return;
        }

        const trimmed = css.trim();
        const startMatch = trimmed.match(/^<style[^>]*>/i);
        const endMatch = trimmed.match(/<\/style>\s*$/i);
        const hasWrapper = !!(startMatch && endMatch);

        if (hasWrapper) {
            const start = startMatch[0];
            const end = endMatch[0];
            const inner = trimmed.substring(start.length, trimmed.length - end.length);
            const sanitizedInner = inner.replace(/<\/?style[^>]*>/gi, '').trim();
            this.customCSS = sanitizedInner;
            this.customCSSWrapperStart = start;
            this.customCSSWrapperEnd = end;
            this.customCSSRaw = `${start}${sanitizedInner}${end}`;
        } else {
            const sanitizedInner = trimmed.replace(/<\/?style[^>]*>/gi, '').trim();
            this.customCSS = sanitizedInner;
            this.customCSSWrapperStart = '<style>';
            this.customCSSWrapperEnd = '</style>';
            this.customCSSRaw = `${this.customCSSWrapperStart}${this.customCSS}${this.customCSSWrapperEnd}`;
        }

        this.customCSSHasWrapper = hasWrapper;
    },

    /**
     * Get formatted HTML (for copying)
     * @param {string} html - HTML string (optional, uses current if not provided)
     * @returns {string} - Formatted HTML with line breaks
     */
    getFormattedHTML(html) {
        // If manually edited, return the edited HTML
        if (this.manuallyEdited && this.editedHTML) {
            return this.editedHTML;
        }
        
        // Otherwise use provided HTML or current HTML
        const htmlToFormat = html || this.currentHTML;
        if (!htmlToFormat) return '';
        
        // Format HTML with line breaks for readability
        const formatted = this.formatHTMLWithLineBreaks(htmlToFormat);
        
        // Apply custom CSS wrapper if needed
        if (this.customCSS) {
            const cssBlock = `${this.customCSSWrapperStart}${this.customCSS}${this.customCSSWrapperEnd}`;
            return `${cssBlock}\n${formatted}`;
        }
        
        return formatted;
    },
    
    /**
     * Get plain text from HTML (for copying in preview mode)
     * @returns {string} - Plain text content
     */
    getPlainText() {
        if (this.previewMode && this.outputElement) {
            const contentDiv = this.outputElement.querySelector('.preview-content');
            if (contentDiv) {
                const text = contentDiv.innerText || contentDiv.textContent || '';
                return text.replace(/\u00a0/g, ' ');
            }
        }

        const htmlToConvert = (this.manuallyEdited && this.editedHTML) ? this.editedHTML : this.currentHTML;
        if (!htmlToConvert) return '';

        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = htmlToConvert;

        const text = tempDiv.innerText || tempDiv.textContent || '';
        return text.replace(/\u00a0/g, ' ');
    },

    /**
     * Get rendered HTML when in preview mode
     * @returns {string} - HTML string representing the preview content
     */
    getPreviewHTML() {
        if (!this.previewMode || !this.outputElement) return '';

        const contentDiv = this.outputElement.querySelector('.preview-content');
        if (!contentDiv) return '';

        const html = contentDiv.innerHTML.trim();
        if (!html) return '';

        const formatted = this.formatHTMLWithLineBreaks(html);

        if (this.customCSS) {
            const cssBlock = `${this.customCSSWrapperStart}${this.customCSS}${this.customCSSWrapperEnd}`;
            return `${cssBlock}\n${formatted}`;
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


