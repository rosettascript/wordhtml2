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
    const editOutputButton = document.getElementById('edit-output');
    const modeSelect = document.getElementById('mode-select');
    const shopifyOptions = document.getElementById('shopify-options');
    const sop = document.getElementById('sop');
    const sopRemoveSpacing = document.getElementById('sop-remove-spacing');
    const sopRemoveDomain = document.getElementById('sop-remove-domain');
    const sopDisableSources = document.getElementById('sop-disable-sources');
    const sopSubOptions = document.getElementById('sop-sub-options');
    const customCSSInput = document.getElementById('custom-css');
    const inputEmptyState = document.getElementById('input-empty-state');
    const outputEmptyState = document.getElementById('output-empty-state');
    const clearInputButton = document.getElementById('clear-input');
    const downloadButton = document.getElementById('download-output');
    const inputCount = document.getElementById('input-count');
    const darkModeToggle = document.getElementById('dark-mode-toggle');

    const SHOPIFY_OPTIONS_STORAGE_KEY = 'wordhtml2-shopify-options';
    let savedShopifyOptions = null;

    // Dark mode functions
    function getThemePreference() {
        // Check localStorage first
        const savedTheme = localStorage.getItem('wordhtml2-theme');
        if (savedTheme) {
            return savedTheme;
        }
        // Then check system preference
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return 'dark';
        }
        return 'light';
    }

    function setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('wordhtml2-theme', theme);
        
        // Update input editor text colors to override inline styles
        updateInputEditorColors(theme);
    }
    
    function updateInputEditorColors(theme) {
        const inputEditor = document.getElementById('input-editor');
        if (!inputEditor) return;
        
        // Get all elements with inline color styles
        const elementsWithColor = inputEditor.querySelectorAll('[style*="color"]');
        
        if (theme === 'dark') {
            // In dark mode, remove or update black/dark colors
            elementsWithColor.forEach(el => {
                const style = el.getAttribute('style') || '';
                // Check if color is black or very dark
                const colorMatch = style.match(/color\s*:\s*([^;]+)/i);
                if (colorMatch) {
                    const colorValue = colorMatch[1].trim().toLowerCase();
                    // Check if it's black, rgb(0,0,0), or similar
                    if (colorValue === 'black' || 
                        colorValue === '#000' || 
                        colorValue === '#000000' ||
                        colorValue.startsWith('rgb(0,0,0') ||
                        colorValue.startsWith('rgba(0,0,0')) {
                        // Remove the color style to let CSS take over
                        const newStyle = style.replace(/color\s*:\s*[^;]+;?/gi, '').trim();
                        if (newStyle) {
                            el.setAttribute('style', newStyle);
                        } else {
                            el.removeAttribute('style');
                        }
                    }
                }
            });
        }
    }

    function initTheme() {
        const theme = getThemePreference();
        setTheme(theme);
    }

    // Load saved settings from localStorage
    function loadSettings() {
        try {
            const savedMode = localStorage.getItem('wordhtml2-mode');
            const savedCSS = localStorage.getItem('wordhtml2-custom-css');
            const savedShopify = localStorage.getItem(SHOPIFY_OPTIONS_STORAGE_KEY);
            
            if (savedMode && modeSelect) {
                modeSelect.value = savedMode;
            }
            
            if (savedCSS && customCSSInput) {
                customCSSInput.value = savedCSS;
            }

            if (savedShopify) {
                try {
                    const parsed = JSON.parse(savedShopify);
                    if (parsed && typeof parsed === 'object') {
                        savedShopifyOptions = {
                            sopRemoveSpacing: !!parsed.sopRemoveSpacing,
                            sopRemoveDomain: !!parsed.sopRemoveDomain,
                            sopDisableSources: !!parsed.sopDisableSources
                        };
                    }
                } catch (err) {
                    console.warn('Failed to parse saved Shopify options:', err);
                }
            }

            if (sopRemoveSpacing) {
                sopRemoveSpacing.checked = savedShopifyOptions ? savedShopifyOptions.sopRemoveSpacing : false;
            }
            if (sopRemoveDomain) {
                sopRemoveDomain.checked = savedShopifyOptions ? savedShopifyOptions.sopRemoveDomain : false;
            }
            if (sopDisableSources) {
                sopDisableSources.checked = savedShopifyOptions ? savedShopifyOptions.sopDisableSources : true;
            }
        } catch (e) {
            console.warn('Failed to load settings from localStorage:', e);
        }
    }

    // Save settings to localStorage
    function saveSettings() {
        try {
            if (modeSelect) {
                localStorage.setItem('wordhtml2-mode', modeSelect.value);
            }
            if (customCSSInput) {
                localStorage.setItem('wordhtml2-custom-css', customCSSInput.value);
            }

            const optionsToSave = {
                sopRemoveSpacing: !!(sopRemoveSpacing && sopRemoveSpacing.checked),
                sopRemoveDomain: !!(sopRemoveDomain && sopRemoveDomain.checked),
                sopDisableSources: !!(sopDisableSources && sopDisableSources.checked)
            };
            localStorage.setItem(SHOPIFY_OPTIONS_STORAGE_KEY, JSON.stringify(optionsToSave));
        } catch (e) {
            console.warn('Failed to save settings to localStorage:', e);
        }
    }

    // Initialize theme
    initTheme();

    // Dark mode toggle handler
    function toggleDarkMode() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        setTheme(newTheme);
    }
    
    if (darkModeToggle) {
        darkModeToggle.addEventListener('click', toggleDarkMode);
    }

    // Listen for system theme changes
    if (window.matchMedia) {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        mediaQuery.addEventListener('change', (e) => {
            // Only update if user hasn't manually set a preference
            if (!localStorage.getItem('wordhtml2-theme')) {
                setTheme(e.matches ? 'dark' : 'light');
            }
        });
    }

    // Load settings on init
    loadSettings();

    // Initialize Output Renderer
    OutputRenderer.init(outputDisplay);

    // Initialize Modal Handler
    ModalHandler.init();

    // Initialize Custom CSS Handler
    CustomCSSHandler.init(customCSSInput, (css) => {
        saveSettings();
        updateOutput();
    });

    // CSS Editor Modal functionality
    const cssMaximizeBtn = document.getElementById('css-maximize-btn');
    const cssMinimizeBtn = document.getElementById('css-minimize-btn');
    const cssEditorModal = document.getElementById('css-editor-modal');
    const customCSSModal = document.getElementById('custom-css-modal');
    const cssLineNumbersModal = document.getElementById('css-line-numbers-modal');
    const cssModalOverlay = cssEditorModal?.querySelector('.css-editor-modal-overlay');

    // Initialize modal CSS editor line numbers
    function updateModalLineNumbers() {
        if (!customCSSModal || !cssLineNumbersModal) return;
        const lines = customCSSModal.value.split('\n');
        const lineCount = lines.length || 1;
        const lineNumbers = Array.from({ length: lineCount }, (_, i) => i + 1).join('\n');
        cssLineNumbersModal.textContent = lineNumbers;
        cssLineNumbersModal.scrollTop = customCSSModal.scrollTop;
    }

    // Sync modal textarea with sidebar textarea
    function syncToModal() {
        if (customCSSModal && customCSSInput) {
            customCSSModal.value = customCSSInput.value;
            updateModalLineNumbers();
        }
    }

    // Sync sidebar textarea with modal textarea
    function syncFromModal() {
        if (customCSSInput && customCSSModal) {
            customCSSInput.value = customCSSModal.value;
            // Trigger update
            const event = new Event('input', { bubbles: true });
            customCSSInput.dispatchEvent(event);
        }
    }

    // Open modal
    function openCSSModal() {
        if (!cssEditorModal) return;
        syncToModal();
        // Don't prevent body scrolling - modal is now a left sidebar, preview should remain accessible
        cssEditorModal.style.display = 'flex';
        requestAnimationFrame(() => {
            cssEditorModal.classList.add('show');
            if (customCSSModal) {
                customCSSModal.focus();
            }
        });
    }

    // Close modal
    function closeCSSModal() {
        if (!cssEditorModal) return;
        syncFromModal();
        cssEditorModal.classList.remove('show');
        setTimeout(() => {
            cssEditorModal.style.display = 'none';
        }, 300);
    }

    // Event listeners
    if (cssMaximizeBtn) {
        cssMaximizeBtn.addEventListener('click', openCSSModal);
    }

    if (cssMinimizeBtn) {
        cssMinimizeBtn.addEventListener('click', closeCSSModal);
    }

    // Close on overlay click
    if (cssModalOverlay) {
        cssModalOverlay.addEventListener('click', closeCSSModal);
    }

    // Handle Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && cssEditorModal?.classList.contains('show')) {
            closeCSSModal();
        }
    });

    // Update modal line numbers on input and scroll
    if (customCSSModal) {
        customCSSModal.addEventListener('input', () => {
            updateModalLineNumbers();
            syncFromModal();
        });

        customCSSModal.addEventListener('scroll', () => {
            if (cssLineNumbersModal) {
                cssLineNumbersModal.scrollTop = customCSSModal.scrollTop;
            }
        });

        customCSSModal.addEventListener('paste', () => {
            setTimeout(() => {
                updateModalLineNumbers();
                syncFromModal();
            }, 0);
        });
    }


    // Initialize Toolbar Controller
    ToolbarController.init({
        modeSelect: modeSelect,
        shopifyOptions: shopifyOptions,
        sop: sop,
        sopRemoveSpacing: sopRemoveSpacing,
        sopRemoveDomain: sopRemoveDomain,
        sopDisableSources: sopDisableSources,
        sopSubOptions: sopSubOptions
    }, () => {
        saveSettings();
        updateOutput();
    }, savedShopifyOptions);

    // Save settings when mode changes
    if (modeSelect) {
        modeSelect.addEventListener('change', () => {
            saveSettings();
        });
    }

    // Save settings when custom CSS changes
    if (customCSSInput) {
        customCSSInput.addEventListener('input', () => {
            saveSettings();
        });
    }

    // Initialize Paste Handler
    PasteHandler.init(inputEditor, (html) => {
        updateEmptyStates();
        updateOutput();
    });

    function isNodeEmpty(node) {
        if (!node) return true;

        if (node.nodeType === Node.TEXT_NODE) {
            const text = (node.textContent || '')
                .replace(/\u200B/g, '')
                .replace(/\u00A0/g, ' ')
                .trim();
            return text.length === 0;
        }

        if (node.nodeType === Node.ELEMENT_NODE) {
            const tag = node.tagName.toLowerCase();

            if (tag === 'br') {
                return true;
            }

            if (tag === 'img' || tag === 'iframe' || tag === 'svg') {
                return false;
            }

            const childNodes = node.childNodes;
            if (!childNodes || childNodes.length === 0) {
                const text = (node.textContent || '')
                    .replace(/\u200B/g, '')
                    .replace(/\u00A0/g, ' ')
                    .trim();
                return text.length === 0;
            }

            return Array.from(childNodes).every(isNodeEmpty);
        }

        return true;
    }

    function isInputEffectivelyEmpty(element) {
        if (!element) return true;
        return Array.from(element.childNodes || []).every(isNodeEmpty);
    }

    // Update character/word count
    function updateInputCount() {
        if (!inputEditor || !inputCount) return;
        
        const text = inputEditor.textContent || '';
        const trimmedText = text.trim();
        const charCount = trimmedText.length;
        const wordCount = trimmedText.length > 0 
            ? trimmedText.split(/\s+/).filter(word => word.length > 0).length 
            : 0;
        
        if (charCount > 0) {
            inputCount.textContent = `${charCount.toLocaleString()} ${charCount === 1 ? 'character' : 'characters'}, ${wordCount.toLocaleString()} ${wordCount === 1 ? 'word' : 'words'}`;
            inputCount.classList.remove('hidden');
        } else {
            inputCount.textContent = '';
            inputCount.classList.add('hidden');
        }
    }

    // Update empty states visibility
    function updateEmptyStates() {
        // Check input area
        if (inputEditor && inputEmptyState) {
            const hasContent = inputEditor.textContent.trim().length > 0 || 
                             inputEditor.innerHTML.trim().length > 0 && 
                             inputEditor.innerHTML.trim() !== '<br>' &&
                             inputEditor.innerHTML.trim() !== '<p><br></p>';
            
            if (hasContent) {
                inputEmptyState.classList.add('hidden');
            } else {
                inputEmptyState.classList.remove('hidden');
            }
        }

        // Check output area
        if (outputDisplay && outputEmptyState) {
            // Check for actual content (not just whitespace or empty elements)
            const textContent = outputDisplay.textContent.trim();
            const hasChildren = outputDisplay.children.length > 0;
            const innerHTML = outputDisplay.innerHTML.trim();
            
            // Consider it empty if no text, no children, or only whitespace/empty tags
            const hasContent = (textContent.length > 0 || hasChildren) && 
                             innerHTML !== '' && 
                             innerHTML !== '<br>' &&
                             innerHTML !== '<p></p>' &&
                             innerHTML !== '<p><br></p>';
            
            if (hasContent) {
                outputEmptyState.classList.add('hidden');
            } else {
                outputEmptyState.classList.remove('hidden');
            }
        }
        
        // Update count
        updateInputCount();
    }

    // Clear input button handler
    if (clearInputButton && inputEditor) {
        clearInputButton.addEventListener('click', async () => {
            const hasContent = inputEditor.textContent.trim().length > 0 || 
                             inputEditor.innerHTML.trim().length > 0 && 
                             inputEditor.innerHTML.trim() !== '<br>' &&
                             inputEditor.innerHTML.trim() !== '<p><br></p>';
            
            if (hasContent) {
                const confirmed = await ModalHandler.show(
                    'Clear Input',
                    'Are you sure you want to clear the input? This action cannot be undone.',
                    'Clear',
                    'Cancel'
                );
                
                if (confirmed) {
                    inputEditor.innerHTML = '';
                    inputEditor.textContent = '';
                    updateEmptyStates();
                    updateOutput();
                    inputEditor.focus();
                    FeedbackHandler.info('Input cleared');
                }
            } else {
                FeedbackHandler.info('Input is already empty');
            }
        });
    }

    // Listen for input changes
    if (inputEditor) {
        inputEditor.addEventListener('input', () => {
            updateEmptyStates();
            updateOutput();
            // Update colors after input in case new content was added
            const currentTheme = document.documentElement.getAttribute('data-theme');
            if (currentTheme === 'dark') {
                setTimeout(() => updateInputEditorColors('dark'), 50);
            }
        });
        
        inputEditor.addEventListener('paste', () => {
            setTimeout(() => {
                updateEmptyStates();
                updateOutput();
                // Update colors after paste to handle Word's inline styles
                const currentTheme = document.documentElement.getAttribute('data-theme');
                if (currentTheme === 'dark') {
                    updateInputEditorColors('dark');
                }
            }, 100);
        });
    }

    const updateEditButtonState = (isEditing) => {
        if (!editOutputButton) return;
        editOutputButton.classList.toggle('active', isEditing);
        editOutputButton.setAttribute('aria-pressed', isEditing ? 'true' : 'false');
        editOutputButton.setAttribute('title', isEditing ? 'Exit edit mode (Ctrl+E)' : 'Edit output (Ctrl+E)');
        editOutputButton.setAttribute('aria-label', isEditing ? 'Exit edit mode' : 'Edit output');
    };

    const focusOutputEditor = () => {
        if (!outputDisplay) return;
        if (typeof OutputRenderer.isPreviewMode === 'function' && OutputRenderer.isPreviewMode()) {
            const previewContent = outputDisplay.querySelector('.preview-content');
            if (previewContent) {
                previewContent.focus();
            }
        } else {
            const editor = outputDisplay.querySelector('.output-editor');
            if (editor) {
                editor.focus();
            }
        }
    };

    const toggleEditMode = () => {
        if (typeof OutputRenderer.toggleEdit !== 'function') return false;
        const isEditing = OutputRenderer.toggleEdit();
        updateEditButtonState(isEditing);
        if (isEditing) {
            // Wait for render cycle before focusing
            setTimeout(() => {
                focusOutputEditor();
                if (outputDisplay) {
                    outputDisplay.scrollTo({ top: 0, left: 0, behavior: 'auto' });
                }
            }, 0);
        }
        return isEditing;
    };

    if (editOutputButton) {
        editOutputButton.addEventListener('click', () => {
            toggleEditMode();
        });
    }

    updateEditButtonState(typeof OutputRenderer.isEditMode === 'function' && OutputRenderer.isEditMode());

    if (outputDisplay) {
        outputDisplay.addEventListener('click', (e) => {
            const isEditing = typeof OutputRenderer.isEditMode === 'function' && OutputRenderer.isEditMode();
            const isPreview = typeof OutputRenderer.isPreviewMode === 'function' && OutputRenderer.isPreviewMode();

            if (isEditing && isPreview) {
                return; // let the browser handle caret placement inside the editable content
            }

            if (e.target === outputDisplay && document.activeElement !== outputDisplay) {
                outputDisplay.focus({ preventScroll: true });
            }
        });

        outputDisplay.addEventListener('keydown', (e) => {
            const modifier = e.ctrlKey || e.metaKey;
            if (!modifier || e.key.toLowerCase() !== 'a') {
                return;
            }

            const target = e.target;
            if (!target) return;

            // Allow default behaviour inside editable/content elements
            if (target.isContentEditable || target.tagName === 'TEXTAREA' || target.tagName === 'INPUT') {
                return;
            }

            e.preventDefault();

            const selection = window.getSelection();
            if (!selection) return;

            const range = document.createRange();
            let container = outputDisplay.querySelector('.preview-container');
            if (!container || !(typeof OutputRenderer.isPreviewMode === 'function' && OutputRenderer.isPreviewMode())) {
                container = outputDisplay.querySelector('pre, code') || outputDisplay;
            }
            range.selectNodeContents(container);
            selection.removeAllRanges();
            selection.addRange(range);
        });
    }

    // Preview toggle handler
    if (previewToggle) {
        previewToggle.addEventListener('click', () => {
            const isPreview = OutputRenderer.togglePreview();
            if (isPreview) {
                previewToggle.classList.add('active');
                previewToggle.setAttribute('aria-pressed', 'true');
                previewToggle.setAttribute('aria-label', 'Switch to code view (Ctrl+P)');
            } else {
                previewToggle.classList.remove('active');
                previewToggle.setAttribute('aria-pressed', 'false');
                previewToggle.setAttribute('aria-label', 'Switch to preview view (Ctrl+P)');
            }
        });
    }

    // Download button handler
    if (downloadButton) {
        downloadButton.addEventListener('click', () => {
            const html = getOutputHTML();
            if (html) {
                // Create a blob with the HTML content
                const blob = new Blob([html], { type: 'text/html' });
                const url = URL.createObjectURL(blob);
                
                // Create a temporary anchor element
                const a = document.createElement('a');
                a.href = url;
                
                // Generate filename with timestamp
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
                a.download = `wordhtml2-output-${timestamp}.html`;
                
                // Trigger download
                document.body.appendChild(a);
                a.click();
                
                // Cleanup
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                
                FeedbackHandler.success('HTML file downloaded!');
            } else {
                FeedbackHandler.info('No content to download');
            }
        });
    }

    // Copy button handler
    if (copyButton) {
        copyButton.addEventListener('click', () => {
            const isPreview = typeof OutputRenderer.isPreviewMode === 'function' && OutputRenderer.isPreviewMode();
            let content = '';
            let successMessage = 'HTML copied to clipboard!';

            if (isPreview) {
                content = (typeof OutputRenderer.getPreviewHTML === 'function' ? OutputRenderer.getPreviewHTML() : '') || '';
                content = content.trim();

                if (content) {
                    successMessage = 'Preview HTML copied to clipboard!';
                } else {
                    content = getOutputHTML();
                }
            } else {
                content = getOutputHTML();
            }

            if (content) {
                navigator.clipboard.writeText(content).then(() => {
                    FeedbackHandler.showButtonSuccess(copyButton);
                    FeedbackHandler.success(successMessage);
                }).catch(err => {
                    console.error('Failed to copy:', err);
                    FeedbackHandler.error('Failed to copy to clipboard');
                });
            } else {
                FeedbackHandler.info('No content to copy');
            }
        });
    }

    /**
     * Update output based on current input and settings
     */
    function updateOutput() {
        // Get HTML in document order from contenteditable
        const editorIsEmpty = isInputEffectivelyEmpty(inputEditor);
        const inputHTML = editorIsEmpty ? '' : getOrderedContent(inputEditor);
        
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
            updateEmptyStates();
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
        updateEmptyStates();
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

    // Initialize Keyboard Shortcuts
    KeyboardShortcuts.init({
        clearInput: () => {
            if (clearInputButton) {
                clearInputButton.click();
            }
        },
        downloadOutput: () => {
            if (downloadButton) {
                downloadButton.click();
            }
        },
        copyOutput: () => {
            if (copyButton) {
                copyButton.click();
            }
        },
        togglePreview: () => {
            if (previewToggle) {
                previewToggle.click();
            }
        },
        toggleEdit: () => {
            if (editOutputButton) {
                editOutputButton.click();
            } else {
                toggleEditMode();
            }
        }
    });

    // Initial update
    updateEmptyStates();
    updateOutput();
});

