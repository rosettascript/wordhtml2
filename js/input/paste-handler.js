/**
 * Paste Handler
 * Handles Word paste events, removes images, preserves structure
 */

const PasteHandler = {
    /**
     * Initialize paste handler for an input element
     * @param {HTMLElement} inputElement - Contenteditable input element
     * @param {Function} callback - Callback function called with cleaned HTML
     */
    init(inputElement, callback) {
        if (!inputElement || !callback) {
            console.error('PasteHandler: inputElement and callback are required');
            return;
        }

        // DISABLED: MutationObserver that reformats content
        // User wants exact formatting preserved - no reformatting
        // If needed in the future, can re-enable for specific cases only
        /*
        const observer = new MutationObserver((mutations) => {
            // Disabled to preserve exact formatting
        });
        observer.observe(inputElement, {
            attributes: true,
            attributeFilter: ['style'],
            childList: true,
            subtree: true
        });
        */

        inputElement.addEventListener('paste', (e) => {
            e.preventDefault();
            
            // Get clipboard data - prioritize HTML to preserve structure
            const clipboardData = e.clipboardData || window.clipboardData;
            let pastedData = clipboardData.getData('text/html');
            let isPlainText = false;
            
            // If no HTML, try plain text and convert to structured HTML
            if (!pastedData || pastedData.trim() === '') {
                pastedData = clipboardData.getData('text/plain');
                if (!pastedData) {
                    return;
                }
                isPlainText = true;
                // For plain text, preserve line breaks exactly as they are
                // Convert newlines to <br> tags and wrap in pre-wrap div
                const lines = pastedData.split('\n');
                pastedData = lines.map(line => {
                    // Escape HTML but preserve line structure
                    const escaped = line
                        .replace(/&/g, '&amp;')
                        .replace(/</g, '&lt;')
                        .replace(/>/g, '&gt;');
                    return escaped;
                }).join('<br>');
                // Wrap in a div to preserve structure
                pastedData = `<div>${pastedData}</div>`;
            }

            // Minimal processing: ONLY remove images, preserve everything else exactly
            const cleanedHTML = this.processPasteMinimal(pastedData);

            // Insert cleaned HTML at cursor position
            this.insertAtCursor(inputElement, cleanedHTML);

            // Normalize editor content so lists and formatting stay visible in the input UI
            const normalizedHTML = this.normalizeEditorContent(inputElement);

            // Call callback with the normalized content (fallback to current editor content if needed)
            const fullHTML = normalizedHTML || this.getOrderedContentFromEditable(inputElement);
            callback(fullHTML);
        });

        // Also handle input events for real-time updates
        inputElement.addEventListener('input', () => {
            // Don't reformat - just get the content as-is
            const html = this.getOrderedContentFromEditable(inputElement);
            callback(html);
        });
    },

    /**
     * Normalize contenteditable markup so the source matches the cleaned output structure
     * Converts Word list paragraphs into semantic lists and reapplies max-width guards
     * @param {HTMLElement} element - Contenteditable element
     * @returns {string} - Normalized HTML (formatted with line breaks)
     */
    normalizeEditorContent(element) {
        if (!element) return '';

        const originalHTML = this.getOrderedContentFromEditable(element);
        if (!originalHTML) {
            return '';
        }

        let cleanedHTML = originalHTML;

        if (typeof HtmlConverter !== 'undefined' && HtmlConverter && typeof HtmlConverter.convert === 'function') {
            try {
                cleanedHTML = HtmlConverter.convert(originalHTML);
            } catch (error) {
                console.error('PasteHandler: failed to normalize pasted content', error);
                cleanedHTML = originalHTML;
            }
        }

        // Replace editor contents with normalized markup so UI mirrors rendered output
        if (cleanedHTML && element.innerHTML !== cleanedHTML) {
            element.innerHTML = cleanedHTML;
        }

        // Reapply max-width safeguards to every node
        this.applyMaxWidthStyles(element);

        // Move caret to the end of the inserted content
        this.placeCursorAtEnd(element);

        return cleanedHTML;
    },

    /**
     * Ensure every element inside the editor respects the max-width guard
     * @param {HTMLElement} element - Contenteditable element
     */
    applyMaxWidthStyles(element) {
        if (!element) return;

        const allNodes = element.querySelectorAll('*');
        allNodes.forEach(node => {
            const existingStyle = node.getAttribute('style');
            const hasMaxWidth = (node.style && node.style.maxWidth) || (existingStyle && /max-width\s*:/i.test(existingStyle));

            if (hasMaxWidth) {
                return;
            }

            if (existingStyle && existingStyle.trim() !== '') {
                const needsSemicolon = existingStyle.trim().endsWith(';');
                node.setAttribute('style', `${existingStyle}${needsSemicolon ? ' ' : '; '}max-width: 100%`);
            } else {
                node.setAttribute('style', 'max-width: 100%');
            }
        });
    },

    /**
     * Place caret at the end of the contenteditable element
     * @param {HTMLElement} element - Contenteditable element
     */
    placeCursorAtEnd(element) {
        if (!element) return;
        const selection = window.getSelection();
        if (!selection) return;

        const range = document.createRange();
        range.selectNodeContents(element);
        range.collapse(false);

        selection.removeAllRanges();
        selection.addRange(range);
    },

    /**
     * Clean style attribute: remove Word-specific values but preserve layout properties
     * @param {string} styleValue - Original style attribute value
     * @returns {string} - Cleaned style value with layout properties preserved
     */
    cleanStyleAttribute(styleValue) {
        if (!styleValue) return '';
        
        // Parse style declarations
        const declarations = styleValue.split(';').map(decl => decl.trim()).filter(decl => decl);
        const preservedStyles = [];
        
        declarations.forEach(decl => {
            const colonIndex = decl.indexOf(':');
            if (colonIndex === -1) return;
            
            const property = decl.substring(0, colonIndex).trim().toLowerCase();
            const value = decl.substring(colonIndex + 1).trim();
            
            // Skip empty values
            if (!value) {
                return;
            }
            
            // Remove Word-specific properties (mso-*, o:*, etc.)
            if (property.startsWith('mso-') || property.startsWith('o:')) {
                return;
            }
            
            // Remove Word-specific text properties
            if (property.startsWith('text-autospace') || 
                property.startsWith('text-underline') ||
                property === 'tab-stops' ||
                property === 'line-break') {
                return;
            }
            
            // Handle white-space property: convert 'pre' and 'nowrap' to 'pre-wrap'
            // Keep 'pre-wrap' as-is (it preserves line breaks while allowing wrapping)
            if (property === 'white-space') {
                if (value === 'pre' || value === 'nowrap') {
                    // Convert non-wrapping whitespace to pre-wrap
                    preservedStyles.push('white-space: pre-wrap');
                    return;
                }
                // For 'pre-wrap', 'normal', or any other value, preserve it
            }
            
            // Preserve all other styles including:
            // - Layout: width, height, min-width, max-width, min-height, max-height
            // - Spacing: margin, padding, margin-top, margin-bottom, etc.
            // - Display: display, position, float, clear
            // - Typography: font-size, font-weight, font-style, color, line-height
            // - Borders: border, border-width, border-color, border-style
            // - Background: background, background-color
            // - And any other standard CSS properties
            preservedStyles.push(`${property}: ${value}`);
        });
        
        return preservedStyles.join('; ');
    },

    /**
     * Minimal paste processing: ONLY remove images, preserve everything else exactly
     * This function preserves the exact formatting, line breaks, and structure
     * @param {string} html - Pasted HTML content
     * @returns {string} - HTML with only images removed
     */
    processPasteMinimal(html) {
        if (!html) return '';
        
        // Parse the HTML
        const tempDiv = HtmlParser.parseHTML(html);
        
        // ONLY remove images - preserve everything else exactly
        const images = tempDiv.querySelectorAll('img');
        images.forEach(img => img.remove());
        
        // Return the HTML exactly as it was, just without images
        return tempDiv.innerHTML;
    },

    /**
     * Process pasted content: remove images, preserve structure
     * Clean Word HTML but keep semantic structure intact
     * @param {string} html - Pasted HTML content
     * @returns {string} - Cleaned HTML with structure preserved
     */
    processPaste(html) {
        if (!html) return '';
        
        // Parse the HTML to preserve structure
        const tempDiv = HtmlParser.parseHTML(html);
        
        // Remove images
        const images = tempDiv.querySelectorAll('img');
        images.forEach(img => img.remove());
        
        // Remove Apple-specific <br> tags (class="Apple-interchange-newline")
        const appleBrTags = tempDiv.querySelectorAll('br[class*="Apple-interchange"], br[class*="apple-interchange"]');
        appleBrTags.forEach(br => br.remove());
        
        // Check if entire document is wrapped in a single element (like <b> or <strong>)
        // This is a common Word issue that breaks structure
        const children = Array.from(tempDiv.children);
        if (children.length === 1) {
            const firstChild = children[0];
            // If it's an inline element wrapping everything, unwrap it
            const inlineTags = ['B', 'STRONG', 'I', 'EM', 'U', 'SPAN'];
            if (inlineTags.includes(firstChild.tagName)) {
                const fragment = document.createDocumentFragment();
                while (firstChild.firstChild) {
                    fragment.appendChild(firstChild.firstChild);
                }
                tempDiv.innerHTML = '';
                tempDiv.appendChild(fragment);
            }
            // If content is in a single P or DIV but contains <br> tags or newlines, split into separate paragraphs
            // Each line becomes its own <p> tag instead of using <br>
            if (firstChild.tagName === 'P' || firstChild.tagName === 'DIV') {
                const textContent = firstChild.textContent;
                // Check if there are multiple lines that should be separate paragraphs
                if (textContent.includes('\n') || firstChild.querySelectorAll('br').length > 0) {
                    // Split by <br> tags or newlines - each becomes a separate <p> tag
                    const fragment = document.createDocumentFragment();
                    // Clone nodes to avoid modifying the original while iterating
                    const nodes = Array.from(firstChild.childNodes).map(n => n.cloneNode(true));
                    let currentParagraph = document.createElement('p');
                    let currentText = '';
                    
                    nodes.forEach(node => {
                        if (node.nodeType === 1 && node.tagName === 'BR') {
                            // <br> tag means new paragraph - close current and start new
                            if (currentText.trim() || currentParagraph.children.length > 0) {
                                if (currentText.trim()) {
                                    currentParagraph.appendChild(document.createTextNode(currentText.trim()));
                                    currentText = '';
                                }
                                fragment.appendChild(currentParagraph);
                                currentParagraph = document.createElement('p');
                            }
                        } else if (node.nodeType === 3) {
                            // Text node - check if it contains newlines
                            const text = node.textContent;
                            if (text.includes('\n')) {
                                const lines = text.split('\n');
                                lines.forEach((line, index) => {
                                    if (line.trim()) {
                                        // If we have accumulated text, add it first
                                        if (currentText.trim()) {
                                            currentParagraph.appendChild(document.createTextNode(currentText.trim()));
                                            currentText = '';
                                        }
                                        // Add current line
                                        currentParagraph.appendChild(document.createTextNode(line.trim()));
                                    } else if (line.length > 0) {
                                        // Empty line - save as space
                                        currentText += line;
                                    }
                                    // Create new paragraph after each line (except the last)
                                    if (index < lines.length - 1) {
                                        if (currentParagraph.textContent.trim() || currentParagraph.children.length > 0) {
                                            fragment.appendChild(currentParagraph);
                                            currentParagraph = document.createElement('p');
                                        }
                                    }
                                });
                            } else {
                                // No newlines - accumulate text
                                currentText += text;
                            }
                        } else {
                            // Element node (like <strong>, <em>, etc.) - add to current paragraph
                            // But if we have accumulated text, add it first
                            if (currentText.trim()) {
                                currentParagraph.appendChild(document.createTextNode(currentText.trim()));
                                currentText = '';
                            }
                            currentParagraph.appendChild(node);
                        }
                    });
                    
                    // Add any remaining accumulated text
                    if (currentText.trim()) {
                        currentParagraph.appendChild(document.createTextNode(currentText.trim()));
                    }
                    
                    // Append the last paragraph if it has content
                    if (currentParagraph.textContent.trim() || currentParagraph.children.length > 0) {
                        fragment.appendChild(currentParagraph);
                    }
                    
                    // Replace the single element with the fragment
                    if (fragment.children.length > 0) {
                        tempDiv.innerHTML = '';
                        tempDiv.appendChild(fragment);
                    }
                }
            }
        }
        
        // Remove Word-specific attributes but preserve structure and visual styles
        // Keep style attributes but clean out Word-specific style values
        // This preserves width, height, and other layout properties
        const allElements = tempDiv.querySelectorAll('*');
        allElements.forEach(el => {
            // Clean style attribute: remove Word-specific values but keep layout properties
            if (el.hasAttribute('style')) {
                const originalStyle = el.getAttribute('style');
                const cleanedStyle = this.cleanStyleAttribute(originalStyle);
                if (cleanedStyle) {
                    el.setAttribute('style', cleanedStyle);
                } else {
                    el.removeAttribute('style');
                }
            }
            
            // Preserve width/height attributes and convert them to style if needed
            // Word sometimes uses width="..." and height="..." attributes
            if (el.hasAttribute('width') && !el.style.width) {
                const width = el.getAttribute('width');
                el.style.width = width.includes('px') ? width : width + 'px';
            }
            if (el.hasAttribute('height') && !el.style.height) {
                const height = el.getAttribute('height');
                el.style.height = height.includes('px') ? height : height + 'px';
            }
            
            // DO NOT remove white-space: pre-wrap - it's needed to preserve line breaks!
            // Only remove white-space: pre (non-wrapping) and nowrap, but keep pre-wrap
            if (el.style.whiteSpace === 'pre' || el.style.whiteSpace === 'nowrap') {
                el.style.whiteSpace = 'pre-wrap'; // Change to pre-wrap to preserve breaks but allow wrapping
            }
            // Also check style attribute directly
            if (el.hasAttribute('style')) {
                const styleAttr = el.getAttribute('style');
                // Replace 'white-space: pre' and 'white-space: nowrap' with 'pre-wrap', but keep 'pre-wrap'
                if (styleAttr.includes('white-space: pre') && !styleAttr.includes('white-space: pre-wrap')) {
                    // Only replace if it's 'pre' (not 'pre-wrap')
                    const cleaned = styleAttr.replace(/white-space\s*:\s*pre\s*;/gi, 'white-space: pre-wrap;')
                                             .replace(/white-space\s*:\s*nowrap\s*;/gi, 'white-space: pre-wrap;');
                    el.setAttribute('style', cleaned);
                }
            }
            
            // Remove Word-specific attributes (but keep style which we just cleaned)
            // Also keep width/height attributes if they exist (for img, table, etc.)
            const attrsToRemove = [];
            Array.from(el.attributes).forEach(attr => {
                const name = attr.name.toLowerCase();
                // Remove class (Mso classes), and Word-specific attributes
                // Don't remove 'style', 'width', or 'height' - preserve layout
                if (name === 'class' || 
                    name.startsWith('mso-') || 
                    name.startsWith('o:') ||
                    name === 'lang' || 
                    name === 'dir' || 
                    name === 'aria-level' || 
                    name === 'role' ||
                    (name === 'id' && !el.id)) { // Only remove id if it's not meaningful
                    attrsToRemove.push(name);
                }
            });
            attrsToRemove.forEach(attr => el.removeAttribute(attr));
        });
        
        // Unwrap invalid inline wrappers (like <strong><h1>...</h1></strong>)
        this.unwrapInvalidInlineWrappers(tempDiv);
        
        // Remove span wrappers inside block elements (like <h2><span>text</span></h2>)
        // This helps headings and other block elements display correctly
        this.unwrapSpansInsideBlocks(tempDiv);
        
        // Remove meta tags
        const metaTags = tempDiv.querySelectorAll('meta');
        metaTags.forEach(meta => meta.remove());
        
        // Get the cleaned HTML - preserve structure
        return tempDiv.innerHTML;
    },

    /**
     * Convert plain text to structured HTML (preserve line breaks and paragraphs)
     * @param {string} text - Plain text content
     * @returns {string} - Structured HTML
     */
    convertPlainTextToHTML(text) {
        if (!text) return '';
        
        // Escape HTML special characters
        let escaped = text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
        
        // Split by double newlines (paragraph separation)
        const paragraphs = escaped.split(/\n\s*\n/);
        
        // If we only have one paragraph (no double newlines), treat each line as a separate paragraph
        // This handles cases where content is pasted with single line breaks between paragraphs
        if (paragraphs.length === 1 && escaped.includes('\n')) {
            const lines = escaped.split(/\n/);
            return lines.map(line => {
                const trimmed = line.trim();
                if (!trimmed) {
                    return '<p>&nbsp;</p>'; // Empty paragraph for spacing
                }
                return `<p>${trimmed}</p>`;
            }).join('\n');
        }
        
        // Convert each paragraph
        const html = paragraphs.map(para => {
            const trimmed = para.trim();
            if (!trimmed) {
                return '<p>&nbsp;</p>'; // Empty paragraph for spacing
            }
            // Convert single line breaks inside paragraphs to <br>
            const withBreaks = trimmed.replace(/\n/g, '<br>');
            return `<p>${withBreaks}</p>`;
        }).join('\n');
        
        return html;
    },

    /**
     * Unwrap span tags inside block elements (headings, paragraphs, list items)
     * This helps ensure proper visual display in contenteditable
     * @param {HTMLElement} container - Container element
     */
    unwrapSpansInsideBlocks(container) {
        const blockTags = ['H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'P', 'LI', 'TD', 'TH'];
        const spans = Array.from(container.querySelectorAll('span')).reverse();
        
        spans.forEach(span => {
            const parent = span.parentNode;
            // Remove empty spans
            if (!span.textContent.trim() && span.children.length === 0) {
                span.remove();
                return;
            }
            
            // Unwrap spans inside block elements
            if (parent && blockTags.includes(parent.tagName)) {
                // Unwrap the span - move its children up to the parent
                while (span.firstChild) {
                    parent.insertBefore(span.firstChild, span);
                }
                span.remove();
            }
        });
        
        // Also remove font tags (they're deprecated and interfere with display)
        const fonts = Array.from(container.querySelectorAll('font')).reverse();
        fonts.forEach(font => {
            while (font.firstChild) {
                font.parentNode.insertBefore(font.firstChild, font);
            }
            font.remove();
        });
    },

    /**
     * Unwrap invalid inline wrappers that contain block elements
     * @param {HTMLElement} container - Container element
     */
    unwrapInvalidInlineWrappers(container) {
        const inlineTags = ['B', 'STRONG', 'I', 'EM', 'U', 'SPAN'];
        const blockTags = ['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'UL', 'OL', 'LI', 'DIV', 'BLOCKQUOTE'];
        
        // Process in reverse to handle nested cases
        inlineTags.forEach(inlineTag => {
            const inlineElements = Array.from(container.querySelectorAll(inlineTag)).reverse();
            inlineElements.forEach(inlineEl => {
                // Check if this inline element directly contains block elements
                const directBlockChildren = Array.from(inlineEl.children).filter(child => 
                    blockTags.includes(child.tagName)
                );
                
                if (directBlockChildren.length > 0) {
                    // Unwrap: move block children out of the inline element
                    const parent = inlineEl.parentNode;
                    if (parent) {
                        directBlockChildren.forEach(blockEl => {
                            parent.insertBefore(blockEl, inlineEl);
                        });
                        
                        // If inline element is now empty, remove it
                        if (!inlineEl.firstChild || inlineEl.textContent.trim() === '') {
                            inlineEl.remove();
                        }
                    }
                }
            });
        });
    },

    /**
     * Apply visual styles to all elements in contenteditable
     * Only applies styles if they don't already exist (preserves original styles)
     * @param {HTMLElement} element - Contenteditable element
     */
    applyVisualStyles(element) {
        // Helper function to set style only if not already set
        const setStyleIfNotSet = (el, property, value) => {
            const currentValue = el.style.getPropertyValue(property);
            if (!currentValue || currentValue.trim() === '') {
                el.style.setProperty(property, value);
            }
        };
        
        // Force all elements to wrap properly - override white-space: pre from Word
        const allElements = element.querySelectorAll('*');
        allElements.forEach(el => {
            // Remove white-space: pre from inline styles by parsing and rebuilding the style attribute
            if (el.hasAttribute('style')) {
                const currentStyle = el.getAttribute('style');
                // Parse style declarations
                const declarations = currentStyle.split(';').map(decl => decl.trim()).filter(decl => decl);
                const cleanedDeclarations = declarations.filter(decl => {
                    const colonIndex = decl.indexOf(':');
                    if (colonIndex === -1) return true;
                    const property = decl.substring(0, colonIndex).trim().toLowerCase();
                    const value = decl.substring(colonIndex + 1).trim();
                    // Remove white-space properties that prevent wrapping
                    if (property === 'white-space' && (value === 'pre' || value === 'pre-wrap' || value === 'nowrap')) {
                        return false;
                    }
                    return true;
                });
                // Rebuild style attribute
                if (cleanedDeclarations.length > 0) {
                    el.setAttribute('style', cleanedDeclarations.join('; ') + '; white-space: normal; word-wrap: break-word; word-break: break-word; overflow-wrap: break-word; max-width: 100%; box-sizing: border-box;');
                } else {
                    el.setAttribute('style', 'white-space: normal; word-wrap: break-word; word-break: break-word; overflow-wrap: break-word; max-width: 100%; box-sizing: border-box;');
                }
            } else {
                // No style attribute, add wrapping styles
                el.setAttribute('style', 'white-space: normal; word-wrap: break-word; word-break: break-word; overflow-wrap: break-word; max-width: 100%; box-sizing: border-box;');
            }
        });
        
        // Ensure all headings have proper styling (only if not already set)
        const headings = element.querySelectorAll('h1, h2, h3, h4, h5, h6');
        headings.forEach(h => {
            // Force block display - this is critical for visual separation
            h.style.setProperty('display', 'block', 'important');
            h.style.setProperty('width', '100%', 'important');
            setStyleIfNotSet(h, 'font-weight', 'bold');
            setStyleIfNotSet(h, 'margin', '1em 0 0.5em 0');
            if (h.tagName === 'H1') {
                setStyleIfNotSet(h, 'font-size', '2em');
                setStyleIfNotSet(h, 'line-height', '1.2');
            } else if (h.tagName === 'H2') {
                setStyleIfNotSet(h, 'font-size', '1.5em');
                setStyleIfNotSet(h, 'line-height', '1.3');
            } else if (h.tagName === 'H3') {
                setStyleIfNotSet(h, 'font-size', '1.3em');
                setStyleIfNotSet(h, 'line-height', '1.4');
            } else if (h.tagName === 'H4') {
                setStyleIfNotSet(h, 'font-size', '1.1em');
            } else if (h.tagName === 'H5') {
                setStyleIfNotSet(h, 'font-size', '1em');
            } else if (h.tagName === 'H6') {
                setStyleIfNotSet(h, 'font-size', '0.9em');
            }
        });
        
        // Style paragraphs (only if not already set)
        const paragraphs = element.querySelectorAll('p');
        paragraphs.forEach(p => {
            // Force block display - this is critical for visual separation
            p.style.setProperty('display', 'block', 'important');
            p.style.setProperty('width', '100%', 'important');
            setStyleIfNotSet(p, 'margin', '0.5em 0');
        });
        
        // Style lists (only if not already set)
        const lists = element.querySelectorAll('ul, ol');
        lists.forEach(list => {
            // Force block display
            list.style.setProperty('display', 'block', 'important');
            list.style.setProperty('width', '100%', 'important');
            setStyleIfNotSet(list, 'padding-left', '2em');
            setStyleIfNotSet(list, 'margin', '0.5em 0');
            if (list.tagName === 'UL') {
                list.style.setProperty('list-style-type', 'disc', 'important');
            } else if (list.tagName === 'OL') {
                list.style.setProperty('list-style-type', 'decimal', 'important');
            }
            list.style.setProperty('list-style-position', 'outside', 'important');
        });
        
        // Style list items (only if not already set)
        const listItems = element.querySelectorAll('li');
        listItems.forEach(li => {
            li.style.setProperty('display', 'list-item', 'important');
            li.style.setProperty('width', '100%', 'important');
            li.style.setProperty('list-style-position', 'outside', 'important');
            const parentList = li.parentElement;
            if (parentList && parentList.tagName === 'UL') {
                li.style.setProperty('list-style-type', 'disc', 'important');
            } else if (parentList && parentList.tagName === 'OL') {
                li.style.setProperty('list-style-type', 'decimal', 'important');
            }
            setStyleIfNotSet(li, 'margin', '0.25em 0');
        });
    },

    /**
     * Insert HTML at cursor position
     * Preserves structure by inserting DOM nodes directly (not using execCommand)
     * @param {HTMLElement} element - Contenteditable element
     * @param {string} html - HTML to insert
     */
    insertAtCursor(element, html) {
        const selection = window.getSelection();
        
        // Focus the element first
        element.focus();
        
        // Parse HTML into a temporary container
        const tempDiv = HtmlParser.parseHTML(html);
        
        // Create a document fragment to hold all nodes
        const fragment = document.createDocumentFragment();
        const nodesToInsert = [];
        while (tempDiv.firstChild) {
            const node = tempDiv.firstChild;
            nodesToInsert.push(node); // Track nodes before moving
            fragment.appendChild(node); // Move to fragment
        }
        
        // Store reference to last node for cursor positioning
        const lastNodeToInsert = nodesToInsert.length > 0 ? nodesToInsert[nodesToInsert.length - 1] : null;
        
        if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            
            // Check if we're inserting block elements
            const hasBlockElements = nodesToInsert.some(node => 
                node.nodeType === 1 && ['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'UL', 'OL', 'LI', 'DIV', 'BLOCKQUOTE'].includes(node.tagName)
            );
            
            // Find the nearest block element ancestor
            let container = range.startContainer;
            if (container.nodeType === 3) {
                container = container.parentNode;
            }
            let blockAncestor = null;
            while (container && container !== element) {
                if (container.nodeType === 1 && ['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'UL', 'OL', 'LI', 'DIV', 'BLOCKQUOTE'].includes(container.tagName)) {
                    blockAncestor = container;
                    break;
                }
                container = container.parentNode;
            }
            
            // If inserting block elements and cursor is inside a block, insert after the block
            // This prevents block elements from being nested inside other blocks
            if (hasBlockElements && blockAncestor && blockAncestor !== element) {
                // Insert after the block ancestor
                if (blockAncestor.nextSibling) {
                    blockAncestor.parentNode.insertBefore(fragment, blockAncestor.nextSibling);
                } else {
                    blockAncestor.parentNode.appendChild(fragment);
                }
            } else {
                // Handle case where cursor is inside a text node - we need to split it
                if (range.startContainer.nodeType === 3) { // Text node
                    const textNode = range.startContainer;
                    const offset = range.startOffset;
                    const parent = textNode.parentNode;
                    
                    // Split the text node at the cursor position
                    const afterText = textNode.splitText(offset);
                    const beforeText = textNode;
                    
                    // Insert the fragment after the split
                    parent.insertBefore(fragment, afterText);
                    
                    // Clean up empty text nodes
                    if (beforeText.textContent.trim() === '' && beforeText.parentNode) {
                        beforeText.remove();
                    }
                    if (afterText.textContent.trim() === '' && afterText.parentNode) {
                        afterText.remove();
                    }
                } else {
                    // Normal case: cursor is at element boundary
                    range.deleteContents();
                    
                    // Find the insertion point
                    let insertPoint = range.startContainer;
                    let insertOffset = range.startOffset;
                    
                    if (insertPoint.nodeType === 1) { // Element node
                        // If inserting block elements into a block, insert after it instead
                        if (hasBlockElements && ['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(insertPoint.tagName) && insertPoint !== element) {
                            if (insertPoint.nextSibling) {
                                insertPoint.parentNode.insertBefore(fragment, insertPoint.nextSibling);
                            } else {
                                insertPoint.parentNode.appendChild(fragment);
                            }
                        } else {
                            // Insert at the specified offset
                            if (insertOffset < insertPoint.childNodes.length) {
                                insertPoint.insertBefore(fragment, insertPoint.childNodes[insertOffset]);
                            } else {
                                insertPoint.appendChild(fragment);
                            }
                        }
                    } else {
                        // Fallback: insert at range
                        range.insertNode(fragment);
                    }
                }
            }
            
            // Position cursor after inserted content
            // Since fragment is now empty, we use the reference to lastNodeToInsert
            // But that node is now in the DOM, so we need to find it
            if (lastNodeToInsert && lastNodeToInsert.parentNode) {
                const newRange = document.createRange();
                
                if (lastNodeToInsert.nodeType === 1) {
                    // Element node - place cursor at end
                    if (lastNodeToInsert.lastChild && lastNodeToInsert.lastChild.nodeType === 3) {
                        newRange.setStart(lastNodeToInsert.lastChild, lastNodeToInsert.lastChild.length);
                    } else {
                        // Create a text node at the end if needed
                        const textNode = document.createTextNode('');
                        lastNodeToInsert.appendChild(textNode);
                        newRange.setStart(textNode, 0);
                    }
                } else {
                    // Text node
                    newRange.setStart(lastNodeToInsert, lastNodeToInsert.length);
                }
                
                newRange.collapse(true);
                selection.removeAllRanges();
                selection.addRange(newRange);
            }
        } else {
            // If no selection, append to end
            while (fragment.firstChild) {
                element.appendChild(fragment.firstChild);
            }
            
            // Position cursor at end
            if (lastNodeToInsert && lastNodeToInsert.parentNode) {
                const newRange = document.createRange();
                if (lastNodeToInsert.nodeType === 1) {
                    if (lastNodeToInsert.lastChild && lastNodeToInsert.lastChild.nodeType === 3) {
                        newRange.setStart(lastNodeToInsert.lastChild, lastNodeToInsert.lastChild.length);
                    } else {
                        const textNode = document.createTextNode('');
                        lastNodeToInsert.appendChild(textNode);
                        newRange.setStart(textNode, 0);
                    }
                } else {
                    newRange.setStart(lastNodeToInsert, lastNodeToInsert.length);
                }
                newRange.collapse(true);
                selection.removeAllRanges();
                selection.addRange(newRange);
            }
        }
        
        // Force a reflow to ensure structure is rendered
        element.offsetHeight;
    },

    /**
     * Get ordered content from contenteditable (similar to main.js getOrderedContent)
     * Preserves structure by extracting elements in document order
     * @param {HTMLElement} element - Contenteditable element
     * @returns {string} - HTML in document order with proper formatting
     */
    getOrderedContentFromEditable(element) {
        const elements = [];
        let node = element.firstChild;
        
        // Walk through all child nodes in document order
        while (node) {
            if (node.nodeType === 1) { // Element node (P, H1, UL, etc.)
                // Get the outerHTML to preserve the element and its contents
                elements.push(node.outerHTML);
            } else if (node.nodeType === 3) { // Text node
                // Only wrap text nodes if they have meaningful content
                const text = node.textContent.trim();
                if (text) {
                    elements.push(`<p>${text}</p>`);
                }
            }
            node = node.nextSibling;
        }
        
        // Join all elements with line breaks for readability
        if (elements.length > 0) {
            return this.formatHTMLWithLineBreaks(elements.join(''));
        }
        
        // Final fallback: use innerHTML and format it
        return this.formatHTMLWithLineBreaks(element.innerHTML);
    },
    
    /**
     * Format HTML with line breaks between block elements for readability
     * @param {string} html - HTML string
     * @returns {string} - Formatted HTML with line breaks
     */
    formatHTMLWithLineBreaks(html) {
        if (!html) return '';
        
        // Parse to check structure
        const tempDiv = HtmlParser.parseHTML(html);
        const children = Array.from(tempDiv.children);
        
        // If we have multiple block elements, add line breaks between them
        if (children.length > 1) {
            const formatted = children.map((child, idx) => {
                const html = child.outerHTML;
                // Add newline after each block element except the last
                return idx < children.length - 1 ? html + '\n' : html;
            }).join('\n');
            return formatted;
        }
        
        // For single element or complex nested structures, use regex formatting
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
        
        // Remove leading/trailing whitespace
        formatted = formatted.trim();
        
        return formatted;
    }
};


