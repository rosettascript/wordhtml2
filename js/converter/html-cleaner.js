/**
 * HTML Cleaner
 * Removes Word-specific styles, attributes, and normalizes formatting
 */

const HtmlCleaner = {
    /**
     * Clean HTML from Word-specific markup
     * Follows the wordhtml.com approach: single DOM parse, mutate in place, preserve order
     * @param {string} html - HTML string from Word
     * @returns {string} - Cleaned HTML
     */
    clean(html) {
        if (!html) return '';

        console.log('🧹 HtmlCleaner.clean() called - Starting cleaning pipeline');
        
        // Step 0: Pre-clean MSO tags using string replacement (before parsing)
        // This removes invalid tags that the browser parser would "correct"
        let preCleaned = this.removeMSOTags(html);
        console.log('✅ Step 0: Pre-removed MSO tags (string-based)');

        // Step 1: Parse once into DOM - this is our source of truth for order
        const container = HtmlParser.parseHTML(preCleaned);
        
        // Step 1.5: Check if entire document is wrapped in strong (common Word issue)
        // If container has a single strong child that wraps everything, unwrap it first
        const children = Array.from(container.children);
        if (children.length === 1 && children[0].tagName === 'STRONG') {
            const strongWrapper = children[0];
            const fragment = document.createDocumentFragment();
            while (strongWrapper.firstChild) {
                fragment.appendChild(strongWrapper.firstChild);
            }
            container.innerHTML = '';
            container.appendChild(fragment);
            console.log('✅ Step 1.5: Unwrapped document-level strong wrapper');
        }
        
        // Debug: Log original order
        const originalOrder = Array.from(container.children).map((el, idx) => ({
            index: idx,
            tag: el.tagName,
            text: el.textContent.substring(0, 30).replace(/\s+/g, ' ')
        }));
        console.log('📋 Original DOM order:', originalOrder);

        // Step 2: Convert spans with styles to semantic tags FIRST (before removing styles!)
        // This is critical - we need style attributes to detect italic/bold
        this.convertSpansToSemanticDOM(container);
        console.log('✅ Step 2: Converted spans to semantic tags');

        // Step 3: Remove Word-specific attributes (mutate in place)
        // Now we can safely remove style attributes since we've converted them to semantic tags
        this.removeWordAttributes(container);
        console.log('✅ Step 3: Removed Word attributes');

        // Step 4: Remove meaningless spans and fonts (mutate in place)
        this.removeSpanWrappersDOM(container);
        console.log('✅ Step 4: Removed span/font wrappers');

        // Step 5: Normalize tags (<b> → <strong>, <i> → <em>) - mutate in place
        this.normalizeTagsDOM(container);
        console.log('✅ Step 5: Normalized tags');

        // Step 6: Remove empty semantic tags (mutate in place)
        this.removeEmptySemanticTags(container);
        console.log('✅ Step 6: Removed empty semantic tags');

        // Step 7: Unwrap invalid inline wrappers (mutate in place)
        this.unwrapBlockWrappingInlineTags(container);
        console.log('✅ Step 7: Unwrapped invalid wrappers');
        
        // Step 7.5: Fix strong tags wrapping block elements (mutate in place)
        this.fixStrongWrappingBlocks(container);
        console.log('✅ Step 7.5: Fixed strong tags wrapping blocks');
        
        // Step 7.6: Remove redundant <strong> inside headings (headings are already bold)
        this.removeStrongInsideHeadings(container);
        console.log('✅ Step 7.6: Removed redundant strong inside headings');

        // Step 7.7: Normalize whitespace in anchor tags (mutate in place)
        this.normalizeAnchorWhitespace(container);
        console.log('✅ Step 7.7: Normalized anchor tag whitespace');

        // Step 7.8: Normalize spacing before punctuation (mutate in place)
        this.normalizePunctuationSpacing(container);
        console.log('✅ Step 7.8: Normalized punctuation spacing');

        // Step 8: Check and fix reversed document order (if needed)
        const fixedContainer = this.fixReversedDocumentOrderDOM(container);
        
        // Step 9: Final cleanup (empty lists, paragraphs, etc.) - mutate in place
        this.cleanStructureDOM(fixedContainer);
        console.log('✅ Step 9: Final structure cleanup');
        
        // Step 10: Get HTML preserving order - use getOrderedHTML to ensure proper order
        let cleaned = this.getOrderedHTML(fixedContainer);
        
        // Step 11: Format HTML with line breaks for readability
        cleaned = this.formatHTML(cleaned);

        // Step 12: Remove stray spaces before punctuation in final HTML string
        cleaned = this.removeSpaceBeforePunctuationHTML(cleaned);
        
        // Debug: Log final order
        const finalDiv = HtmlParser.parseHTML(cleaned);
        const finalOrder = Array.from(finalDiv.children).map((el, idx) => ({
            index: idx,
            tag: el.tagName,
            text: el.textContent.substring(0, 30).replace(/\s+/g, ' ')
        }));
        console.log('📋 Final DOM order:', finalOrder);
        console.log('✅ HtmlCleaner.clean() complete - Output length:', cleaned.length);

        return cleaned;
    },

    /**
     * Remove Word-specific attributes from all elements (DOM-based, mutates in place)
     * Preserves border, padding, and margin styles ONLY for div, table, td, and th elements while removing Word-specific styles
     * @param {HTMLElement} container - Container element
     */
    removeWordAttributes(container) {
        const allElements = container.querySelectorAll('*');
        allElements.forEach(el => {
            // Remove Word-specific attributes
            const attrsToRemove = [];
            const isDiv = el.tagName === 'DIV';
            const isTable = el.tagName === 'TABLE';
            const isTableCell = el.tagName === 'TD' || el.tagName === 'TH';
            const shouldPreserveLayoutStyles = isDiv || isTable || isTableCell;
            
            // Debug: Log div/table/td/th elements with style attributes
            if (shouldPreserveLayoutStyles && el.hasAttribute('style')) {
                const originalStyle = el.getAttribute('style');
                if (originalStyle && (originalStyle.includes('margin') || originalStyle.includes('padding') || originalStyle.includes('border'))) {
                    console.log(`🔍 Processing ${el.tagName.toLowerCase()} with style:`, originalStyle);
                }
            }
            
            Array.from(el.attributes).forEach(attr => {
                const name = attr.name.toLowerCase();
                const value = attr.value.toLowerCase();
                
                // Handle style attributes - preserve borders, padding, and margin ONLY for divs while removing Word-specific styles
                if (name === 'style') {
                    const styleValue = el.getAttribute('style') || '';
                    if (styleValue) {
                        // Filter style properties: keep borders, padding, margin ONLY for divs; remove Word-specific styles
                        const preservedStyles = [];
                        // Split by semicolon, but preserve empty declarations to handle edge cases
                        const styleDeclarations = styleValue.split(';').map(s => s.trim()).filter(s => s.length > 0);
                        
                        styleDeclarations.forEach(declaration => {
                            const colonIndex = declaration.indexOf(':');
                            if (colonIndex === -1) {
                                // No colon found, skip this declaration
                                return;
                            }
                            
                            const property = declaration.substring(0, colonIndex).trim().toLowerCase();
                            const propValue = declaration.substring(colonIndex + 1).trim();
                            
                            // Preserve border, padding, and margin-related properties ONLY for div and table elements
                            // Note: property is already lowercase from line 144
                            if (shouldPreserveLayoutStyles) {
                                if (property.startsWith('border') || 
                                    property.startsWith('padding') || 
                                    property.startsWith('margin')) {
                                    // Preserve the original declaration format (with original spacing/casing)
                                    preservedStyles.push(declaration);
                                    if (window.DEBUG_HTML_CLEANER) {
                                        console.log(`✅ Preserving ${property} style for ${el.tagName.toLowerCase()}:`, declaration);
                                    }
                                    return; // Skip to next declaration
                                }
                            }
                            
                            // Remove Word-specific styles (mso-*, page-break, etc.)
                            // Note: property is already lowercase from line 144
                            if (property.startsWith('mso-') || 
                                property.startsWith('o:') ||
                                property.includes('page-break') ||
                                property.includes('tab-stops') ||
                                (property.includes('text-indent') && propValue.toLowerCase().includes('mso'))) {
                                // Skip Word-specific styles
                                return;
                            }
                            // Remove other formatting styles that should be semantic (font-weight, font-style)
                            // These should have been converted to <strong>/<em> tags already
                            if (property === 'font-weight' || property === 'font-style') {
                                // Skip - should have been converted to semantic tags
                                return;
                            }
                            // Remove all other styles (they're Word-specific formatting)
                            // For non-div elements, all styles are removed
                            // For div elements, only border/padding/margin are preserved (already handled above)
                        });
                        
                        // If we have preserved styles, update the style attribute
                        if (preservedStyles.length > 0) {
                            // Join with semicolon and space, but don't add trailing semicolon
                            const finalStyle = preservedStyles.join('; ');
                            el.setAttribute('style', finalStyle);
                            
                            // Debug: Log preserved styles for divs/tables
                            if (shouldPreserveLayoutStyles && window.DEBUG_HTML_CLEANER) {
                                console.log(`✅ ${el.tagName} style preserved: "${finalStyle}" (from original: "${styleValue}")`);
                            }
                        } else {
                            // No preserved styles, remove the style attribute entirely
                            attrsToRemove.push(name);
                            
                            // Debug: Log when style is removed from div/table
                            if (shouldPreserveLayoutStyles && window.DEBUG_HTML_CLEANER) {
                                console.log(`⚠️ ${el.tagName} style removed (no border/padding/margin found): "${styleValue}"`);
                            }
                        }
                    } else {
                        attrsToRemove.push(name);
                    }
                }
                // Remove Word classes
                else if (name === 'class' && (value.includes('mso') || value.includes('mso'))) {
                    attrsToRemove.push(name);
                }
                // Remove Word-specific attributes
                else if (name.startsWith('mso-') || name.startsWith('o:') || 
                         name === 'lang' || name === 'dir' || name === 'aria-level' || 
                         name === 'role' || name === 'id') {
                    attrsToRemove.push(name);
                }
            });
            
            attrsToRemove.forEach(attr => el.removeAttribute(attr));
        });
    },

    /**
     * Convert spans with styles to semantic tags (DOM-based, mutates in place)
     * @param {HTMLElement} container - Container element
     */
    convertSpansToSemanticDOM(container) {
        // Process in reverse to handle nested spans
        const spans = Array.from(container.querySelectorAll('span[style]')).reverse();
        
        spans.forEach(span => {
            const style = span.getAttribute('style') || '';
            const parent = span.parentNode;
            if (!parent) return;
            
            // Check if span contains block elements - if so, don't convert, just unwrap later
            const blockElements = ['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'UL', 'OL', 'LI', 'DIV', 'BLOCKQUOTE'];
            let hasBlockElement = false;
            for (let blockTag of blockElements) {
                if (span.querySelector(blockTag)) {
                    hasBlockElement = true;
                    break;
                }
            }
            
            // Check for font-weight and font-style FIRST (before checking for block elements)
            // This ensures we convert italic/bold spans even if they contain block elements
            // Also check for Word-specific italic formats like 'font-style:italic' (no space) or 'font-style:italic;'
            const fontWeightMatch = style.match(/font-weight\s*:\s*(?:700|bold)/i);
            const fontStyleMatch = style.match(/font-style\s*:\s*italic/i) || 
                                   style.match(/font-style\s*:\s*oblique/i) ||
                                   style.match(/font-style\s*:\s*italic\s*;/i);
            const verticalAlignMatch = style.match(/vertical-align\s*:\s*(super|sub)/i);
            
            let replacement = null;
            
            if (verticalAlignMatch && !hasBlockElement) {
                const tagName = verticalAlignMatch[1].toLowerCase() === 'super' ? 'sup' : 'sub';
                replacement = document.createElement(tagName);
                while (span.firstChild) {
                    replacement.appendChild(span.firstChild);
                }
            } else if (fontWeightMatch && fontStyleMatch) {
                // Both bold and italic
                replacement = document.createElement('strong');
                const em = document.createElement('em');
                while (span.firstChild) {
                    em.appendChild(span.firstChild);
                }
                replacement.appendChild(em);
            } else if (fontWeightMatch) {
                // Just bold
                replacement = document.createElement('strong');
                while (span.firstChild) {
                    replacement.appendChild(span.firstChild);
                }
            } else if (fontStyleMatch) {
                // Just italic - convert to <em> tag
                replacement = document.createElement('em');
                while (span.firstChild) {
                    replacement.appendChild(span.firstChild);
                }
            }
            
            // If we created a replacement, use it regardless of block elements
            // The replacement will preserve the structure
            if (replacement) {
                parent.replaceChild(replacement, span);
                return; // Done with this span
            }
            
            // If no style conversion happened and span contains block elements, will be handled by removeSpanWrappersDOM
            if (hasBlockElement) {
                return;
            }
        });
    },

    /**
     * Remove span and font wrappers (DOM-based, mutates in place)
     * @param {HTMLElement} container - Container element
     */
    removeSpanWrappersDOM(container) {
        const blockElements = ['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'UL', 'OL', 'LI', 'DIV', 'BLOCKQUOTE'];
        
        // Process spans in reverse to handle nested cases
        const spans = Array.from(container.querySelectorAll('span')).reverse();
        spans.forEach(span => {
            const parent = span.parentNode;
            if (!parent) return;
            
            // Check if span has style with italic/bold - convert to semantic tags BEFORE unwrapping
            const style = span.getAttribute('style') || '';
            const fontWeightMatch = style.match(/font-weight\s*:\s*(?:700|bold)/i);
            const fontStyleMatch = style.match(/font-style\s*:\s*italic/i) || 
                                   style.match(/font-style\s*:\s*oblique/i) ||
                                   style.match(/font-style\s*:\s*italic\s*;/i);
            const verticalAlignMatch = style.match(/vertical-align\s*:\s*(super|sub)/i);
            
            // Check if span contains block elements
            let hasBlockElement = false;
            for (let blockTag of blockElements) {
                if (span.querySelector(blockTag)) {
                    hasBlockElement = true;
                    break;
                }
            }
            
            if (hasBlockElement) {
                // If span has italic/bold styling, we need to wrap the content appropriately
                // For now, just unwrap - the styling should have been converted earlier
                // But if it wasn't, we'll preserve any existing <em>/<strong> tags inside
                while (span.firstChild) {
                    parent.insertBefore(span.firstChild, span);
                }
                parent.removeChild(span);
            } else {
                // If span has style but wasn't converted earlier, convert it now before removing
                if (style && (fontWeightMatch || fontStyleMatch || verticalAlignMatch)) {
                    let wrapper = null;
                    if (verticalAlignMatch) {
                        const tagName = verticalAlignMatch[1].toLowerCase() === 'super' ? 'sup' : 'sub';
                        wrapper = document.createElement(tagName);
                        while (span.firstChild) {
                            wrapper.appendChild(span.firstChild);
                        }
                    } else if (fontWeightMatch && fontStyleMatch) {
                        // Both bold and italic
                        wrapper = document.createElement('strong');
                        const em = document.createElement('em');
                        while (span.firstChild) {
                            em.appendChild(span.firstChild);
                        }
                        wrapper.appendChild(em);
                    } else if (fontWeightMatch) {
                        // Just bold
                        wrapper = document.createElement('strong');
                        while (span.firstChild) {
                            wrapper.appendChild(span.firstChild);
                        }
                    } else if (fontStyleMatch) {
                        // Just italic
                        wrapper = document.createElement('em');
                        while (span.firstChild) {
                            wrapper.appendChild(span.firstChild);
                        }
                    }
                    
                    if (wrapper) {
                        parent.replaceChild(wrapper, span);
                        return; // Already replaced, don't continue with unwrapping
                    }
                }
                
                // Just remove the span wrapper - preserve all children including semantic tags like <em>, <strong>
                // This preserves italic, bold, and other formatting that might be inside the span
                const fragment = document.createDocumentFragment();
                while (span.firstChild) {
                    fragment.appendChild(span.firstChild);
                }
                parent.replaceChild(fragment, span);
            }
        });
        
        // Remove font tags
        const fonts = Array.from(container.querySelectorAll('font')).reverse();
        fonts.forEach(font => {
            const parent = font.parentNode;
            if (!parent) return;
            const fragment = document.createDocumentFragment();
            while (font.firstChild) {
                fragment.appendChild(font.firstChild);
            }
            parent.replaceChild(fragment, font);
        });
    },

    /**
     * Normalize tags (DOM-based, mutates in place)
     * <b> → <strong>, <i> → <em>
     * @param {HTMLElement} container - Container element
     */
    normalizeTagsDOM(container) {
        // Convert <b> to <strong>
        const bTags = Array.from(container.querySelectorAll('b')).reverse();
        bTags.forEach(b => {
            const strong = document.createElement('strong');
            while (b.firstChild) {
                strong.appendChild(b.firstChild);
            }
            b.parentNode.replaceChild(strong, b);
        });
        
        // Convert <i> to <em>
        const iTags = Array.from(container.querySelectorAll('i')).reverse();
        iTags.forEach(i => {
            const em = document.createElement('em');
            while (i.firstChild) {
                em.appendChild(i.firstChild);
            }
            i.parentNode.replaceChild(em, i);
        });
    },

    /**
     * Fix reversed document order (DOM-based, returns new container if reversed)
     * @param {HTMLElement} container - Container element
     * @returns {HTMLElement} - Container (original or fixed)
     */
    fixReversedDocumentOrderDOM(container) {
        const children = Array.from(container.children);
        
        if (children.length < 2) return container;
        
        const h1Index = children.findIndex(el => el.tagName === 'H1');
        if (h1Index === -1) return container;
        
        // Count content elements
        const contentBeforeH1 = children.slice(0, h1Index).filter(el => {
            const tag = el.tagName;
            return tag === 'P' || tag === 'H2' || tag === 'H3' || tag === 'H4' || 
                   tag === 'H5' || tag === 'H6' || tag === 'UL' || tag === 'OL';
        }).length;
        
        const h2Index = children.findIndex(el => el.tagName === 'H2');
        const h3Index = children.findIndex(el => el.tagName === 'H3');
        const hasLowerHeadingsBefore = (h2Index !== -1 && h2Index < h1Index) || 
                                      (h3Index !== -1 && h3Index < h1Index);
        
        const last10Percent = Math.max(Math.floor(children.length * 0.9), children.length - 10);
        const isNearEnd = h1Index >= last10Percent;
        
        let shouldReverse = false;
        
        if (h1Index === children.length - 1 && contentBeforeH1 >= 5) {
            shouldReverse = true;
            console.log('🔄 Detected reversed order: H1 is last element with substantial content before it');
        } else if (isNearEnd && hasLowerHeadingsBefore) {
            shouldReverse = true;
            console.log('🔄 Detected reversed order: H1 near end with lower headings before it');
        } else if (isNearEnd && contentBeforeH1 > Math.max(children.length * 0.3, 10)) {
            shouldReverse = true;
            console.log('🔄 Detected reversed order: H1 near end with substantial content before it');
        }
        
        if (shouldReverse) {
            console.log(`🔄 Reversing document order (H1 at index ${h1Index} of ${children.length})`);
            // Create a new container with reversed children
            const newContainer = document.createElement('div');
            const reversed = [...children].reverse();
            reversed.forEach(child => {
                newContainer.appendChild(child);
            });
            return newContainer;
        }
        
        return container;
    },

    /**
     * Fix strong tags wrapping block elements (like <strong><h2>...</h2></strong>)
     * Moves strong inside the block element instead
     * @param {HTMLElement} container - Container element
     */
    fixStrongWrappingBlocks(container) {
        // Check if container itself is wrapped in strong (entire document)
        // This happens when Word wraps everything in a strong tag
        if (container.tagName === 'STRONG' || container.firstElementChild?.tagName === 'STRONG') {
            // If container's first child is a strong that wraps everything, unwrap it
            const children = Array.from(container.children);
            if (children.length === 1 && children[0].tagName === 'STRONG') {
                const strongWrapper = children[0];
                const fragment = document.createDocumentFragment();
                while (strongWrapper.firstChild) {
                    fragment.appendChild(strongWrapper.firstChild);
                }
                container.innerHTML = '';
                container.appendChild(fragment);
            }
        }
        
        // Find strong tags that directly contain block elements
        const strongTags = Array.from(container.querySelectorAll('strong')).reverse();
        
        strongTags.forEach(strong => {
            const parent = strong.parentNode;
            if (!parent) return;
            
            // Check if strong directly contains block elements
            const blockElements = ['H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'P', 'UL', 'OL', 'LI', 'DIV', 'BLOCKQUOTE'];
            const directBlockChildren = Array.from(strong.children).filter(child => 
                blockElements.includes(child.tagName)
            );
            
            if (directBlockChildren.length > 0) {
                // For headings, move strong inside if it contains text
                // For other blocks, just unwrap
                directBlockChildren.forEach(blockEl => {
                    if (['H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(blockEl.tagName)) {
                        // For headings, check if we should wrap the text in strong
                        const firstChild = blockEl.firstChild;
                        
                        if (firstChild && firstChild.nodeType === 3) {
                            // Has text node - wrap it in strong
                            const text = firstChild.textContent.trim();
                            if (text) {
                                const strongInner = document.createElement('strong');
                                strongInner.textContent = text;
                                blockEl.replaceChild(strongInner, firstChild);
                                // Move remaining text nodes
                                let nextSibling = firstChild.nextSibling;
                                while (nextSibling && nextSibling.nodeType === 3) {
                                    const nextText = nextSibling.textContent.trim();
                                    if (nextText) {
                                        strongInner.appendChild(document.createTextNode(' ' + nextText));
                                    }
                                    const toRemove = nextSibling;
                                    nextSibling = nextSibling.nextSibling;
                                    blockEl.removeChild(toRemove);
                                }
                            }
                        } else if (firstChild && firstChild.tagName !== 'STRONG') {
                            // Has other elements but no strong - wrap first text node if exists
                            let textNode = null;
                            for (let child of Array.from(blockEl.childNodes)) {
                                if (child.nodeType === 3 && child.textContent.trim()) {
                                    textNode = child;
                                    break;
                                }
                            }
                            if (textNode) {
                                const strongInner = document.createElement('strong');
                                const text = textNode.textContent.trim();
                                strongInner.textContent = text;
                                blockEl.replaceChild(strongInner, textNode);
                            }
                        }
                    }
                });
                
                // Remove the wrapping strong tag by unwrapping its children
                const fragment = document.createDocumentFragment();
                while (strong.firstChild) {
                    fragment.appendChild(strong.firstChild);
                }
                parent.replaceChild(fragment, strong);
            }
        });
    },

    /**
     * Remove redundant <strong> tags inside headings (headings are already bold)
     * @param {HTMLElement} container - Container element
     */
    removeStrongInsideHeadings(container) {
        const headings = Array.from(container.querySelectorAll('h1, h2, h3, h4, h5, h6'));
        headings.forEach(heading => {
            const strongTags = Array.from(heading.querySelectorAll('strong'));
            strongTags.forEach(strong => {
                // Unwrap the strong tag, keeping its content
                const parent = strong.parentNode;
                const fragment = document.createDocumentFragment();
                while (strong.firstChild) {
                    fragment.appendChild(strong.firstChild);
                }
                parent.replaceChild(fragment, strong);
            });
        });
    },

    /**
     * Normalize whitespace in anchor tag content
     * Removes leading/trailing whitespace and collapses multiple spaces to single spaces
     * @param {HTMLElement} container - Container element
     */
    normalizeAnchorWhitespace(container) {
        const anchors = Array.from(container.querySelectorAll('a'));
        anchors.forEach(anchor => {
            // Check if anchor has only text nodes (no nested elements)
            const hasOnlyText = Array.from(anchor.childNodes).every(node => node.nodeType === 3);
            
            if (hasOnlyText) {
                // Simple case: anchor contains only text, normalize the entire text content
                const text = anchor.textContent || anchor.innerText || '';
                const normalized = text
                    .trim()
                    .replace(/\s+/g, ' ')
                    .replace(/\s+([.,!?;:])/g, '$1');
                anchor.textContent = normalized;
            } else {
                // Anchor has nested elements (like <strong>, <em>), normalize text nodes individually
                // Get all text nodes within the anchor
                const walker = document.createTreeWalker(
                    anchor,
                    NodeFilter.SHOW_TEXT,
                    null,
                    false
                );
                
                const textNodes = [];
                let node;
                while (node = walker.nextNode()) {
                    textNodes.push(node);
                }
                
                // Normalize each text node, but preserve single spaces between elements
                textNodes.forEach((textNode, index) => {
                    let text = textNode.textContent;
                    
                    // For first text node, trim leading whitespace
                    if (index === 0) {
                        text = text.replace(/^\s+/, '');
                    }
                    
                    // For last text node, trim trailing whitespace
                    if (index === textNodes.length - 1) {
                        text = text.replace(/\s+$/, '');
                    }
                    
                    // Collapse multiple spaces to single space
                    text = text.replace(/\s+/g, ' ');
                    
                    textNode.textContent = text.replace(/\s+([.,!?;:])/g, '$1');
                });
            }
        });
    },

    /**
     * Normalize spaces that appear immediately before punctuation marks
     * Converts patterns like "word ." to "word." and handles non-breaking spaces
     * @param {HTMLElement} container - Container element
     */
    normalizePunctuationSpacing(container) {
        const punctuationRegex = /(\S)[\s\u00A0]+([.,!?;:])/g;
        const punctuationStartRegex = /^[\s\u00A0]*([.,!?;:])/;
        const walker = document.createTreeWalker(
            container,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );

        const textNodes = [];
        let node;
        while ((node = walker.nextNode())) {
            textNodes.push(node);
        }

        textNodes.forEach((textNode, index) => {
            const original = textNode.textContent;
            let normalized = original.replace(punctuationRegex, '$1$2');

            const nextNode = textNodes[index + 1];
            if (nextNode) {
                const nextText = nextNode.textContent;
                if (punctuationStartRegex.test(nextText)) {
                    const trimmedCurrent = normalized.replace(/[\s\u00A0]+$/g, '');
                    if (trimmedCurrent !== normalized) {
                        normalized = trimmedCurrent;
                    }

                    const adjustedNext = nextText.replace(/^[\s\u00A0]*([.,!?;:])/, '$1');
                    if (adjustedNext !== nextText) {
                        nextNode.textContent = adjustedNext;
                    }
                }
            }

            normalized = normalized.replace(/^[\s\u00A0]+([.,!?;:])/g, '$1');
            normalized = normalized.replace(/[\s\u00A0]+([.,!?;:])/g, '$1');

            if (normalized !== original) {
                textNode.textContent = normalized;
            }
        });
    },

    /**
     * Clean structure (DOM-based, mutates in place)
     * @param {HTMLElement} container - Container element
     */
    cleanStructureDOM(container) {
        // Step 1: Remove meta tags
        const metaTags = Array.from(container.querySelectorAll('meta'));
        metaTags.forEach(meta => meta.remove());
        
        // Step 2: Remove paragraphs from list items (invalid HTML)
        this.removeParagraphsFromListItems(container);
        
        // Step 2.5: Remove <br> tags from list items (invalid HTML)
        this.removeBrFromListItems(container);
        // Step 2.6: Remove <br> tags directly under lists (ul/ol)
        this.removeBrFromLists(container);
        // Step 2.7: Remove stray <br> siblings around lists
        this.removeBrAroundLists(container);
        // Step 2.8: Fold trailing source entries back into lists
        this.appendTrailingSourcesToLists(container);
        
        // Step 3: Fix invalid nesting (inline tags wrapping block elements)
        this.fixInvalidNesting(container);
        
        // Step 4: Remove empty lists
        const lists = Array.from(container.querySelectorAll('ul, ol'));
        lists.forEach(list => {
            const items = Array.from(list.querySelectorAll('li'));
            if (items.length === 0) {
                list.remove();
            } else {
                const allEmpty = items.every(li => {
                    const text = HtmlParser.getTextContent(li.innerHTML).trim();
                    return !text || text === '';
                });
                if (allEmpty) {
                    list.remove();
                }
            }
        });
        
        // Step 5: Remove <br> tags between block elements, but PRESERVE within paragraphs
        // First, remove Apple-specific <br> tags (they're not needed)
        const appleBrTags = Array.from(container.querySelectorAll('br[class*="Apple-interchange"], br[class*="apple-interchange"]'));
        appleBrTags.forEach(br => br.remove());
        
        const brTags = Array.from(container.querySelectorAll('br'));
        brTags.forEach(br => {
            const parent = br.parentNode;
            const prevSibling = br.previousSibling;
            const nextSibling = br.nextSibling;
            
            // Remove any <br> tags with Apple-interchange class (already removed above, but double-check)
            if (br.className && (br.className.includes('Apple-interchange') || br.className.includes('apple-interchange'))) {
                br.remove();
                return;
            }
            
            // PRESERVE <br> tags within paragraphs - they represent line breaks
            if (parent && parent.tagName === 'P') {
                return; // Keep all <br> tags within paragraphs
            }
            
            // Check if br is between block elements
            const blockTags = ['H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'P', 'UL', 'OL', 'LI', 'DIV', 'BLOCKQUOTE'];
            
            // If br is at the end of a block element (not paragraph) and followed by another block element
            if (parent && blockTags.includes(parent.tagName)) {
                // Check if next sibling is a block element
                let nextBlock = nextSibling;
                while (nextBlock && nextBlock.nodeType === 3 && !nextBlock.textContent.trim()) {
                    nextBlock = nextBlock.nextSibling;
                }
                if (nextBlock && nextBlock.nodeType === 1 && blockTags.includes(nextBlock.tagName)) {
                    br.remove();
                    return;
                }
            }
            
            // If br is between two block elements as siblings
            if (prevSibling && nextSibling) {
                const prevTag = prevSibling.nodeType === 1 ? prevSibling.tagName : null;
                const nextTag = nextSibling.nodeType === 1 ? nextSibling.tagName : null;
                
                if (prevTag && blockTags.includes(prevTag) && nextTag && blockTags.includes(nextTag)) {
                    br.remove();
                    return;
                }
            }
        });
        
        // Step 6: Remove empty paragraphs (but preserve &nbsp; spacing)
        const paragraphs = Array.from(container.querySelectorAll('p'));
        paragraphs.forEach(p => {
            const text = HtmlParser.getTextContent(p.innerHTML).trim();
            const innerHTML = p.innerHTML.trim();
            
            // Keep paragraphs with &nbsp; for spacing
            if (innerHTML === '&nbsp;' || innerHTML === '<span>&nbsp;</span>') {
                return;
            }
            
            // Remove truly empty paragraphs (single space or completely empty)
            if (!text || text === '' || text === ' ') {
                if (!innerHTML || innerHTML === '' || innerHTML === '<br>' || innerHTML === '<br/>' || innerHTML === ' ') {
                    p.remove();
                }
            }
        });
    },

    /**
     * Pre-process invalid HTML structures using string manipulation
     * This fixes issues BEFORE the browser parser can "correct" them
     * @param {string} html - HTML string
     * @returns {string} - Pre-processed HTML
     */
    preprocessInvalidHTML(html) {
        let cleaned = html;
        
        // Remove empty tags first (before other processing) - be more aggressive
        // Match: <tag></tag> or <tag> </tag> or <tag attributes></tag>
        cleaned = cleaned.replace(/<(strong|em|b|i|u|span)(?:\s[^>]*)?>\s*<\/(strong|em|b|i|u|span)>/gi, '');
        
        // Also remove empty tags that might have whitespace/newlines
        cleaned = cleaned.replace(/<(strong|em|b|i|u|span)(?:\s[^>]*)?>\s*[\r\n\s]*<\/(strong|em|b|i|u|span)>/gi, '');
        
        // Fix: <em><p>content</p></em> -> <p>content</p> (remove invalid wrapper)
        // Fix: <strong><p>content</p></strong> -> <p>content</p>
        // The browser may have already "corrected" this to <p><em>content</em></p>
        // But if we still have <em><p>, we need to unwrap it
        
        const inlineTags = ['em', 'strong', 'b', 'i', 'u'];
        
        inlineTags.forEach(inlineTag => {
            // Pattern: <inline><p>content</p></inline> -> <p>content</p>
            // Use a more reliable pattern that handles attributes
            const pattern = new RegExp(
                `<${inlineTag}(?:\\s[^>]*)?>\\s*<p(?:\\s[^>]*)?>([\\s\\S]*?)<\\/p>\\s*<\\/${inlineTag}>`,
                'gi'
            );
            
            cleaned = cleaned.replace(pattern, (match, content) => {
                // Just unwrap - remove the inline wrapper
                return `<p>${content}</p>`;
            });
        });
        
        return cleaned;
    },

    /**
     * Remove MSO-specific tags and attributes (Step 1)
     * String-based replacement - preserves order
     * @param {string} html - HTML string
     * @returns {string} - HTML without MSO tags
     */
    removeMSOTags(html) {
        let cleaned = html;
        
        // Remove MS conditional comments
        cleaned = cleaned.replace(/<!--\[if.*?endif\]-->/gis, '');
        
        // Remove MSO class names (MsoNormal, MsoList, etc.)
        cleaned = cleaned.replace(/class=(")?Mso[a-zA-Z]+(")?/gi, '');
        
        // Remove mso-* inline styles (but keep the style attribute if it has other styles)
        cleaned = cleaned.replace(/mso-[^;]*;?/gi, '');
        
        // Remove empty o:p tags
        cleaned = cleaned.replace(/<o:p>\s*<\/o:p>/gi, '');
        
        // Replace filled o:p with space
        cleaned = cleaned.replace(/<o:p>.*?<\/o:p>/gi, '&nbsp;');
        
        // Remove any remaining o: tags
        cleaned = cleaned.replace(/<\/?o:[^>]*>/gi, '');
        
        // Remove MSO-specific attributes
        cleaned = cleaned.replace(/\s+(?:mso-|o:)[a-z-]+(?:="[^"]*")?/gi, '');
        
        // Remove xmlns and other XML namespaces
        cleaned = cleaned.replace(/\s+xmlns(?::\w+)?="[^"]*"/gi, '');
        
        return cleaned;
    },

    /**
     * Convert inline styles to semantic tags (Step 2)
     * String-based replacement - converts font-weight:700 to <strong>, font-style:italic to <em>
     * @param {string} html - HTML string
     * @returns {string} - HTML with semantic tags
     */
    convertStylesToSemantic(html) {
        let cleaned = html;
        let previousLength = 0;
        let iterations = 0;
        const maxIterations = 10; // Prevent infinite loops
        
        // Process multiple times to handle nested spans
        while (cleaned.length !== previousLength && iterations < maxIterations) {
            previousLength = cleaned.length;
            iterations++;
            
            // Handle both bold and italic FIRST (before individual conversions)
            // Pattern: <span style="...font-weight: 700...font-style: italic..."> -> <strong><em>
            cleaned = cleaned.replace(/<span[^>]*style="[^"]*font-weight\s*:\s*(?:700|bold)[^"]*font-style\s*:\s*italic[^"]*"[^>]*>(.*?)<\/span>/gis, '<strong><em>$1</em></strong>');
            cleaned = cleaned.replace(/<span[^>]*style="[^"]*font-style\s*:\s*italic[^"]*font-weight\s*:\s*(?:700|bold)[^"]*"[^>]*>(.*?)<\/span>/gis, '<strong><em>$1</em></strong>');
            
            // Convert font-weight:700 or font-weight:bold to <strong>
            // Pattern: <span style="font-weight: 700">content</span> -> <strong>content</strong>
            cleaned = cleaned.replace(/<span[^>]*style="[^"]*font-weight\s*:\s*(?:700|bold)[^"]*"[^>]*>(.*?)<\/span>/gis, '<strong>$1</strong>');
            
            // Convert font-style:italic to <em>
            // Pattern: <span style="font-style: italic">content</span> -> <em>content</em>
            cleaned = cleaned.replace(/<span[^>]*style="[^"]*font-style\s*:\s*italic[^"]*"[^>]*>(.*?)<\/span>/gis, '<em>$1</em>');

            // Convert vertical-align: super/sub to <sup>/<sub>
            cleaned = cleaned.replace(/<span[^>]*style="[^"]*vertical-align\s*:\s*super[^"]*"[^>]*>(.*?)<\/span>/gis, '<sup>$1</sup>');
            cleaned = cleaned.replace(/<span[^>]*style="[^"]*vertical-align\s*:\s*sub[^"]*"[^>]*>(.*?)<\/span>/gis, '<sub>$1</sub>');
        }
        
        return cleaned;
    },

    /**
     * Remove all span and font wrappers (Step 3)
     * String-based replacement - preserves order, simple and reliable
     * @param {string} html - HTML string
     * @returns {string} - HTML without span/font wrappers
     */
    removeSpansAndFonts(html) {
        // Simple string replacement - preserves order
        let cleaned = html;
        
        // Remove opening span tags
        cleaned = cleaned.replace(/<span[^>]*>/gi, '');
        
        // Remove closing span tags
        cleaned = cleaned.replace(/<\/span>/gi, '');
        
        // Remove font tags
        cleaned = cleaned.replace(/<font[^>]*>/gi, '');
        cleaned = cleaned.replace(/<\/font>/gi, '');
        
        return cleaned;
    },

    /**
     * Remove empty tags early (Step 3.5)
     * Removes empty semantic tags that were created during style conversion
     * @param {string} html - HTML string
     * @returns {string} - HTML without empty tags
     */
    removeEmptyTagsEarly(html) {
        let cleaned = html;
        
        // Remove empty semantic tags (strong, em, b, i, u, span)
        // Match: <tag></tag> or <tag> </tag> or <tag attributes></tag>
        // Process multiple times to catch nested cases
        let previousLength = 0;
        let iterations = 0;
        while (cleaned.length !== previousLength && iterations < 5) {
            previousLength = cleaned.length;
            iterations++;
            
            // Remove empty tags (more comprehensive pattern)
            cleaned = cleaned.replace(/<(strong|em|b|i|u|span)(?:\s[^>]*)?>\s*<\/(?:strong|em|b|i|u|span)>/gi, '');
            
            // Remove empty tags with whitespace/newlines
            cleaned = cleaned.replace(/<(strong|em|b|i|u|span)(?:\s[^>]*)?>\s*[\r\n\s]*<\/(?:strong|em|b|i|u|span)>/gi, '');
            
            // Remove tags that only contain whitespace or other empty tags
            cleaned = cleaned.replace(/<(strong|em|b|i|u|span)(?:\s[^>]*)?>\s*(?:&nbsp;|\s)*<\/(?:strong|em|b|i|u|span)>/gi, '');
        }
        
        return cleaned;
    },

    /**
     * Remove all inline styles and Word-specific attributes (Step 4)
     * String-based replacement - preserves href for links
     * @param {string} html - HTML string
     * @returns {string} - HTML without inline styles and Word attributes
     */
    removeInlineStyles(html) {
        let cleaned = html;
        
        // Remove style attributes completely
        cleaned = cleaned.replace(/\s+style="[^"]*"/gi, '');
        
        // Remove Word-specific attributes (but preserve href for links)
        cleaned = cleaned.replace(/\s+class="[^"]*"/gi, '');
        cleaned = cleaned.replace(/\s+id="[^"]*"/gi, '');
        cleaned = cleaned.replace(/\s+lang="[^"]*"/gi, '');
        cleaned = cleaned.replace(/\s+dir="[^"]*"/gi, '');
        cleaned = cleaned.replace(/\s+aria-level="[^"]*"/gi, '');
        cleaned = cleaned.replace(/\s+role="[^"]*"/gi, '');
        
        // Remove any remaining attributes that start with mso- or o:
        // But preserve href, target, rel for links
        cleaned = cleaned.replace(/\s+(?:mso-|o:)[a-z-]+(?:="[^"]*")?/gi, '');
        
        // Note: href, target, rel attributes are preserved for <a> tags
        // They will be cleaned up later if needed, but typically we want to keep them
        
        return cleaned;
    },

    /**
     * Normalize tags using string replacement (Step 5)
     * <b> → <strong>, <i> → <em>
     * @param {string} html - HTML string
     * @returns {string} - HTML with normalized tags
     */
    normalizeTagsString(html) {
        let cleaned = html;
        
        // Convert <b> to <strong>
        cleaned = cleaned.replace(/<b\b([^>]*)>(.*?)<\/b>/gis, '<strong$1>$2</strong>');
        
        // Convert <i> to <em>
        cleaned = cleaned.replace(/<i\b([^>]*)>(.*?)<\/i>/gis, '<em$1>$2</em>');
        
        return cleaned;
    },

    /**
     * Whitelist only valid semantic tags (Step 6)
     * Removes any tags not in the whitelist (like Word-specific tags)
     * Preserves important attributes like href for links
     * @param {string} html - HTML string
     * @returns {string} - HTML with only whitelisted tags
     */
    whitelistTags(html) {
        // Allowed semantic tags (like wordhtml.com keeps)
        const allowedTags = ['p', 'a', 'ul', 'ol', 'li', 'strong', 'em', 'b', 'i', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'br', 'blockquote', 'code', 'sup', 'sub'];
        
        // Remove any tags not in the whitelist
        // This regex matches opening or closing tags and checks if they're allowed
        return html.replace(/<\/?([a-z][a-z0-9]*)\b[^>]*>/gi, (match, tag) => {
            const tagLower = tag.toLowerCase();
            // If tag is in whitelist, keep it; otherwise remove it
            if (allowedTags.includes(tagLower)) {
                // For links, preserve href attribute
                if (tagLower === 'a' && match.includes('href=')) {
                    // Keep the full match (includes href)
                    return match;
                }
                // For other allowed tags, keep them but clean attributes
                // (attributes were already cleaned in removeInlineStyles, but keep the tag)
                return match;
            }
            // Remove disallowed tags
            return '';
        });
    },

    /**
     * Unwrap wrapper elements (Step 2)
     * @param {string} html - HTML string
     * @returns {string} - HTML with wrappers unwrapped
     */
    unwrapWrappers(html) {
        let unwrappedHTML = html.trim();
        
        // Remove <meta> tags
        unwrappedHTML = unwrappedHTML.replace(/<meta[^>]*>/gi, '');
        
        // Unwrap <b> wrapper - find the opening <b> tag and its matching closing </b>
        const bTagStart = unwrappedHTML.match(/<b[^>]*>/i);
        if (bTagStart) {
            const startIndex = bTagStart.index;
            const tagLength = bTagStart[0].length;
            let contentStart = startIndex + tagLength;
            let depth = 1;
            let pos = contentStart;
            
            // Find the matching closing </b> tag by counting nested <b> tags
            while (pos < unwrappedHTML.length && depth > 0) {
                const openMatch = unwrappedHTML.substring(pos).match(/<b[^>]*>/i);
                const closeMatch = unwrappedHTML.substring(pos).match(/<\/b>/i);
                
                let nextOpen = openMatch ? pos + openMatch.index : Infinity;
                let nextClose = closeMatch ? pos + closeMatch.index : Infinity;
                
                if (nextClose < nextOpen) {
                    depth--;
                    if (depth === 0) {
                        // Found matching closing tag
                        let bContent = unwrappedHTML.substring(contentStart, pos + closeMatch.index);
                        const beforeB = unwrappedHTML.substring(0, startIndex);
                        const afterB = unwrappedHTML.substring(pos + closeMatch.index + closeMatch[0].length);
                        
                        // If there's very little content before/after the <b>, it's likely a wrapper
                        if (beforeB.trim().length < 50 && afterB.trim().length < 50 && bContent.length > 100) {
                            // Check if content inside <b> appears reversed (H1 at end, H2/H3 at start)
                            const tempCheck = HtmlParser.parseHTML(bContent);
                            const checkChildren = Array.from(tempCheck.children);
                            const h1Index = checkChildren.findIndex(el => el.tagName === 'H1');
                            const h2Index = checkChildren.findIndex(el => el.tagName === 'H2');
                            const h3Index = checkChildren.findIndex(el => el.tagName === 'H3');
                            
                            // If H1 is near the end and we have lower headings before it, reverse
                            if (h1Index !== -1 && h1Index > checkChildren.length / 2 && 
                                ((h2Index !== -1 && h2Index < h1Index) || (h3Index !== -1 && h3Index < h1Index))) {
                                console.log('🔄 Content inside <b> wrapper appears reversed - fixing order...');
                                console.log('  H1 index:', h1Index, 'of', checkChildren.length, 'children');
                                // Reverse the content
                                const reversed = checkChildren.reverse();
                                tempCheck.innerHTML = '';
                                reversed.forEach(child => {
                                    tempCheck.appendChild(child);
                                });
                                bContent = tempCheck.innerHTML;
                                console.log('✅ Reversed content inside <b> wrapper');
                            }
                            
                            unwrappedHTML = beforeB + bContent + afterB;
                            console.log('📦 Unwrapped <b> wrapper');
                        }
                        break;
                    }
                    pos = nextClose + closeMatch[0].length;
                } else if (nextOpen < nextClose) {
                    depth++;
                    pos = nextOpen + openMatch[0].length;
                } else {
                    break;
                }
            }
        }
        
        return unwrappedHTML;
    },

    /**
     * Convert spans with styles to semantic tags (Step 3)
     * Only convert inline spans (not ones wrapping block elements)
     * @param {string} html - HTML string
     * @returns {string} - HTML with semantic tags
     */
    convertSpansToSemantic(html) {
        const tempDiv = HtmlParser.parseHTML(html);
        
        // Block elements that shouldn't be inside inline semantic tags
        const blockElements = ['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'UL', 'OL', 'LI', 'DIV', 'BLOCKQUOTE'];
        
        // Find all spans with style attributes
        // Process in reverse to handle nested spans
        const spansWithStyles = Array.from(tempDiv.querySelectorAll('span[style]')).reverse();
        
        spansWithStyles.forEach(span => {
            const style = span.getAttribute('style');
            const parent = span.parentNode;
            if (!parent || !style) return;
            
            // Check if span contains block elements - if so, don't convert, just unwrap later
            let hasBlockElement = false;
            for (let blockTag of blockElements) {
                if (span.querySelector(blockTag)) {
                    hasBlockElement = true;
                    break;
                }
            }
            
            // Only convert if it's truly inline (no block elements inside)
            if (!hasBlockElement) {
                const fontWeightMatch = style.match(/font-weight\s*:\s*(\d+|bold|normal)/i);
                const fontWeightValue = fontWeightMatch ? fontWeightMatch[1].toLowerCase() : null;
                const fontStyleMatch = style.match(/font-style\s*:\s*(italic|normal)/i);
                const fontStyleValue = fontStyleMatch ? fontStyleMatch[1].toLowerCase() : null;
                
                // Determine what semantic tag to create
                let semanticTag = null;
                if (fontWeightValue === '700' || fontWeightValue === 'bold') {
                    if (fontStyleValue === 'italic') {
                        // Both bold and italic - create <strong><em>
                        semanticTag = document.createElement('strong');
                        const em = document.createElement('em');
                        while (span.firstChild) {
                            em.appendChild(span.firstChild);
                        }
                        semanticTag.appendChild(em);
                    } else {
                        // Just bold
                        semanticTag = document.createElement('strong');
                        while (span.firstChild) {
                            semanticTag.appendChild(span.firstChild);
                        }
                    }
                } else if (fontStyleValue === 'italic') {
                    // Just italic
                    semanticTag = document.createElement('em');
                    while (span.firstChild) {
                        semanticTag.appendChild(span.firstChild);
                    }
                }
                
                if (semanticTag) {
                    parent.replaceChild(semanticTag, span);
                }
            }
            // If span has block elements, leave it - it will be removed in removeSpanWrappers
        });
        
        return this.getOrderedHTML(tempDiv);
    },

    /**
     * Remove all span and font wrappers (Step 4)
     * @param {string} html - HTML string
     * @returns {string} - HTML without span/font wrappers
     */
    removeSpanWrappers(html) {
        const tempDiv = HtmlParser.parseHTML(html);
        
        // Block elements that shouldn't be inside spans
        const blockElements = ['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'UL', 'OL', 'LI', 'DIV', 'BLOCKQUOTE'];
        
        // First, unwrap spans that contain block elements (invalid HTML)
        const spans = Array.from(tempDiv.querySelectorAll('span'));
        spans.forEach(span => {
            const parent = span.parentNode;
            if (!parent) return;
            
            // Check if span contains block elements
            let hasBlockElement = false;
            for (let blockTag of blockElements) {
                if (span.querySelector(blockTag)) {
                    hasBlockElement = true;
                    break;
                }
            }
            
            if (hasBlockElement) {
                // Unwrap: move all children out of span
                while (span.firstChild) {
                    parent.insertBefore(span.firstChild, span);
                }
                parent.removeChild(span);
            }
        });
        
        // Now remove all remaining spans and fonts using string replacement
        let cleaned = this.getOrderedHTML(tempDiv);
        cleaned = cleaned.replace(/<span[^>]*>/gi, '');
        cleaned = cleaned.replace(/<\/span>/gi, '');
        cleaned = cleaned.replace(/<font[^>]*>/gi, '');
        cleaned = cleaned.replace(/<\/font>/gi, '');
        
        return cleaned;
    },

    /**
     * Remove all inline styles (Step 5)
     * @param {string} html - HTML string
     * @returns {string} - HTML without inline styles
     */
    removeAllStyles(html) {
        const tempDiv = HtmlParser.parseHTML(html);
        
        // Remove all style attributes
        const allElements = tempDiv.querySelectorAll('*');
        allElements.forEach(el => {
            el.removeAttribute('style');
            
            // Remove Word-specific attributes
            el.removeAttribute('class');
            el.removeAttribute('id');
            el.removeAttribute('lang');
            el.removeAttribute('dir');
            el.removeAttribute('aria-level');
            el.removeAttribute('role');
            
            // Remove any remaining MSO attributes
            Array.from(el.attributes).forEach(attr => {
                if (attr.name.startsWith('mso-') || attr.name.startsWith('o:')) {
                    el.removeAttribute(attr.name);
                }
            });
        });
        
        return this.getOrderedHTML(tempDiv);
    },

    /**
     * Normalize tags (Step 6) - <b> → <strong>, <i> → <em>
     * @param {string} html - HTML string
     * @returns {string} - HTML with normalized tags
     */
    normalizeTags(html) {
        const tempDiv = HtmlParser.parseHTML(html);
        
        // Convert <b> to <strong>
        const bTags = Array.from(tempDiv.querySelectorAll('b'));
        bTags.forEach(b => {
            const strong = document.createElement('strong');
            while (b.firstChild) {
                strong.appendChild(b.firstChild);
            }
            b.parentNode.replaceChild(strong, b);
        });
        
        // Convert <i> to <em>
        const iTags = Array.from(tempDiv.querySelectorAll('i'));
        iTags.forEach(i => {
            const em = document.createElement('em');
            while (i.firstChild) {
                em.appendChild(i.firstChild);
            }
            i.parentNode.replaceChild(em, i);
        });
        
        return this.getOrderedHTML(tempDiv);
    },

    /**
     * Clean up structure (Step 7)
     * @param {string} html - HTML string
     * @returns {string} - HTML with cleaned structure
     */
    cleanStructure(html) {
        let cleaned = html;
        
        // Parse for DOM manipulation
        const tempDiv = HtmlParser.parseHTML(cleaned);
        
        // Remove empty semantic tags (<strong></strong>, <em></em>, etc.)
        this.removeEmptySemanticTags(tempDiv);
        
        // Unwrap inline tags that wrap entire block elements
        this.unwrapBlockWrappingInlineTags(tempDiv);
        
        // Check if document order appears reversed (H1 at bottom, lower headings at top)
        cleaned = this.getOrderedHTML(tempDiv);
        cleaned = this.fixReversedDocumentOrder(cleaned);
        
        // Parse again after potential reordering
        tempDiv.innerHTML = cleaned;
        
        // Remove empty lists
        cleaned = this.removeEmptyLists(cleaned);
        
        // Normalize whitespace
        cleaned = this.normalizeWhitespace(cleaned);
        
        // Remove empty paragraphs
        cleaned = this.removeEmptyParagraphs(cleaned);
        
        // Clean up nested tags
        cleaned = this.cleanNestedTags(cleaned);
        
        // Final pass: Remove any remaining empty tags (process multiple times)
        let previousLength = cleaned.length;
        let iterations = 0;
        while (cleaned.length !== previousLength && iterations < 5) {
            previousLength = cleaned.length;
            iterations++;
            cleaned = cleaned.replace(/<(strong|em|b|i|u|span)(?:\s[^>]*)?>\s*<\/(?:strong|em|b|i|u|span)>/gi, '');
            cleaned = cleaned.replace(/<(strong|em|b|i|u|span)(?:\s[^>]*)?>\s*[\r\n\s]*<\/(?:strong|em|b|i|u|span)>/gi, '');
            cleaned = cleaned.replace(/<(strong|em|b|i|u|span)(?:\s[^>]*)?>\s*(?:&nbsp;|\s)*<\/(?:strong|em|b|i|u|span)>/gi, '');
        }
        
        return cleaned;
    },

    /**
     * Fix reversed document order (when H1 is at bottom instead of top)
     * @param {string} html - HTML string
     * @returns {string} - HTML with corrected order
     */
    fixReversedDocumentOrder(html) {
        const tempDiv = HtmlParser.parseHTML(html);
        const children = Array.from(tempDiv.children);
        
        if (children.length < 2) return html;
        
        // Find H1 and lower level headings
        const h1Index = children.findIndex(el => el.tagName === 'H1');
        const h2Index = children.findIndex(el => el.tagName === 'H2');
        const h3Index = children.findIndex(el => el.tagName === 'H3');
        
        // If no H1 found, don't reverse
        if (h1Index === -1) return html;
        
        // Count content elements (paragraphs, headings, lists)
        const contentElements = children.filter(el => {
            const tag = el.tagName;
            return tag === 'P' || tag === 'H1' || tag === 'H2' || tag === 'H3' || 
                   tag === 'H4' || tag === 'H5' || tag === 'H6' || tag === 'UL' || tag === 'OL';
        }).length;
        
        // If we have an H1 and it's in the last 10% of elements OR in the last 10 elements, 
        // and there are other content elements, it's likely reversed
        const last10Percent = Math.max(Math.floor(children.length * 0.9), children.length - 10);
        const isNearEnd = h1Index >= last10Percent;
        
        // Count content before H1
        const contentBeforeH1 = children.slice(0, h1Index).filter(el => {
            const tag = el.tagName;
            return tag === 'P' || tag === 'H2' || tag === 'H3' || tag === 'H4' || 
                   tag === 'H5' || tag === 'H6' || tag === 'UL' || tag === 'OL';
        }).length;
        
        // Check if there are lower headings before H1
        const hasLowerHeadingsBefore = (h2Index !== -1 && h2Index < h1Index) || 
                                      (h3Index !== -1 && h3Index < h1Index);
        
        // Determine if we should reverse
        let shouldReverse = false;
        
        // Case 1: H1 is the very last element and there's substantial content before it
        if (h1Index === children.length - 1 && contentBeforeH1 >= 5) {
            shouldReverse = true;
            console.log('🔄 Detected reversed order: H1 is last element with substantial content before it');
        }
        // Case 2: H1 is near the end (last 10%) and there are lower headings before it
        else if (isNearEnd && hasLowerHeadingsBefore) {
            shouldReverse = true;
            console.log('🔄 Detected reversed order: H1 near end with lower headings before it');
        }
        // Case 3: H1 is near the end and there's a lot of content before it (more than 30% of total)
        else if (isNearEnd && contentBeforeH1 > Math.max(children.length * 0.3, 10)) {
            shouldReverse = true;
            console.log('🔄 Detected reversed order: H1 near end with substantial content before it');
        }
        // Case 4: H1 is after the midpoint and there are lower headings before it
        else if (h1Index > children.length / 2 && hasLowerHeadingsBefore && contentBeforeH1 > 5) {
            shouldReverse = true;
            console.log('🔄 Detected reversed order: H1 after midpoint with lower headings and content before it');
        }
        
        if (shouldReverse) {
            console.log(`🔄 Reversing document order (H1 at index ${h1Index} of ${children.length}, ${contentBeforeH1} content elements before it)`);
            // Reverse the children array
            const reversed = [...children].reverse(); // Use spread to avoid mutating original
            tempDiv.innerHTML = '';
            reversed.forEach(child => {
                tempDiv.appendChild(child);
            });
            return this.getOrderedHTML(tempDiv);
        }
        
        return html;
    },

    /**
     * Remove empty semantic tags like <strong></strong>, <em></em>
     * @param {HTMLElement} container - Container element
     */
    removeEmptySemanticTags(container) {
        const emptyTags = ['strong', 'em', 'b', 'i', 'u', 'span'];
        
        // Process in reverse to handle nested empty tags
        emptyTags.forEach(tagName => {
            let tags = Array.from(container.querySelectorAll(tagName));
            tags = tags.reverse(); // Process in reverse to avoid index shifting
            
            tags.forEach(tag => {
                const text = HtmlParser.getTextContent(tag.innerHTML).trim();
                const hasOnlyWhitespace = !text || text === '' || /^\s+$/.test(text);
                
                if (hasOnlyWhitespace) {
                    // Unwrap empty tag
                    const parent = tag.parentNode;
                    if (parent) {
                        while (tag.firstChild) {
                            parent.insertBefore(tag.firstChild, tag);
                        }
                        parent.removeChild(tag);
                    }
                }
            });
        });
    },

    /**
     * Unwrap inline tags that wrap entire block elements (invalid HTML)
     * Example: <em><p>content</p></em> -> <p>content</p> (remove inline wrapper)
     * @param {HTMLElement} container - Container element
     */
    unwrapBlockWrappingInlineTags(container) {
        const inlineTags = ['strong', 'em', 'b', 'i', 'u', 'span'];
        const blockTags = ['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'UL', 'OL', 'LI', 'DIV'];
        
        // Process in reverse to handle nested cases
        inlineTags.forEach(inlineTag => {
            const tags = Array.from(container.querySelectorAll(inlineTag)).reverse();
            tags.forEach(inlineEl => {
                // Check if this inline tag directly contains ONLY block elements
                const children = Array.from(inlineEl.children);
                const hasOnlyBlockChildren = children.length > 0 && 
                    children.every(child => blockTags.includes(child.tagName));
                
                // IMPORTANT: Only unwrap if it contains ONLY block elements
                // If it contains ANY text nodes or inline elements, preserve it
                // This ensures <em> tags inside paragraphs are NOT removed
                if (hasOnlyBlockChildren) {
                    // Check if there are any text nodes or inline elements mixed in
                    let hasTextOrInline = false;
                    for (let child of inlineEl.childNodes) {
                        if (child.nodeType === 3 && child.textContent.trim()) {
                            // Text node with content
                            hasTextOrInline = true;
                            break;
                        }
                        if (child.nodeType === 1 && !blockTags.includes(child.tagName)) {
                            // Inline element
                            hasTextOrInline = true;
                            break;
                        }
                    }
                    
                    // Only unwrap if it's truly only block elements (no text/inline)
                    if (!hasTextOrInline) {
                        // Unwrap: move all block children out of the inline tag
                        const parent = inlineEl.parentNode;
                        if (parent) {
                            // Move all children before the inline element
                            while (inlineEl.firstChild) {
                                parent.insertBefore(inlineEl.firstChild, inlineEl);
                            }
                            // Remove the now-empty inline tag
                            parent.removeChild(inlineEl);
                        }
                    }
                    // Otherwise, preserve the inline tag (it contains text or inline elements)
                }
            });
        });
    },

    /**
     * Remove Word-specific inline styles and attributes (DEPRECATED - use new pipeline)
     * @param {string} html - HTML string
     * @returns {string} - HTML without Word styles
     */
    removeWordStyles(html) {
        // First, handle wrapper unwrapping using string manipulation to preserve source order
        // This avoids browser parser reordering issues with invalid HTML (block elements in inline tags)
        let unwrappedHTML = html.trim();
        
        // Remove <meta> tags (they're not needed)
        unwrappedHTML = unwrappedHTML.replace(/<meta[^>]*>/gi, '');
        
        // Unwrap <b> wrapper - find the opening <b> tag and its matching closing </b>
        // We need to handle nested tags properly by counting opening/closing tags
        const bTagStart = unwrappedHTML.match(/<b[^>]*>/i);
        if (bTagStart) {
            const startIndex = bTagStart.index;
            const tagLength = bTagStart[0].length;
            let contentStart = startIndex + tagLength;
            let depth = 1;
            let pos = contentStart;
            
            // Find the matching closing </b> tag by counting nested <b> tags
            while (pos < unwrappedHTML.length && depth > 0) {
                const openMatch = unwrappedHTML.substring(pos).match(/<b[^>]*>/i);
                const closeMatch = unwrappedHTML.substring(pos).match(/<\/b>/i);
                
                let nextOpen = openMatch ? pos + openMatch.index : Infinity;
                let nextClose = closeMatch ? pos + closeMatch.index : Infinity;
                
                if (nextClose < nextOpen) {
                    depth--;
                    if (depth === 0) {
                        // Found matching closing tag
                        const bContent = unwrappedHTML.substring(contentStart, pos + closeMatch.index);
                        const beforeB = unwrappedHTML.substring(0, startIndex);
                        const afterB = unwrappedHTML.substring(pos + closeMatch.index + closeMatch[0].length);
                        
                        // If there's very little content before/after the <b>, it's likely a wrapper
                        if (beforeB.trim().length < 50 && afterB.trim().length < 50 && bContent.length > 100) {
                            // This is a wrapper - extract its content (preserves source order)
                            unwrappedHTML = beforeB + bContent + afterB;
                            console.log('📦 Unwrapped <b> wrapper using string matching (preserves source order)');
                        }
                        break;
                    }
                    pos = nextClose + closeMatch[0].length;
                } else if (nextOpen < nextClose) {
                    depth++;
                    pos = nextOpen + openMatch[0].length;
                } else {
                    break; // No more tags found
                }
            }
        }
        
        // Now parse the unwrapped HTML
        const tempDiv = HtmlParser.parseHTML(unwrappedHTML);
        
        // FIRST: Convert font-weight:700 to <strong> and font-style:italic to <em> BEFORE removing styles
        // Process in reverse to handle nested spans
        const spansWithStyles = Array.from(tempDiv.querySelectorAll('span[style]')).reverse();
        spansWithStyles.forEach(span => {
            const style = span.getAttribute('style');
            const parent = span.parentNode;
            if (!parent || !style) return;
            
            const fontWeightMatch = style.match(/font-weight\s*:\s*(\d+|bold|normal)/i);
            const fontWeightValue = fontWeightMatch ? fontWeightMatch[1].toLowerCase() : null;
            const fontStyleMatch = style.match(/font-style\s*:\s*(italic|normal)/i);
            const fontStyleValue = fontStyleMatch ? fontStyleMatch[1].toLowerCase() : null;
            
            // Determine what semantic tag to create
            let semanticTag = null;
            if (fontWeightValue === '700' || fontWeightValue === 'bold') {
                if (fontStyleValue === 'italic') {
                    // Both bold and italic - create <strong><em>
                    semanticTag = document.createElement('strong');
                    const em = document.createElement('em');
                    while (span.firstChild) {
                        em.appendChild(span.firstChild);
                    }
                    semanticTag.appendChild(em);
                } else {
                    // Just bold
                    semanticTag = document.createElement('strong');
                    while (span.firstChild) {
                        semanticTag.appendChild(span.firstChild);
                    }
                }
            } else if (fontStyleValue === 'italic') {
                // Just italic
                semanticTag = document.createElement('em');
                while (span.firstChild) {
                    semanticTag.appendChild(span.firstChild);
                }
            }
            
            if (semanticTag) {
                parent.replaceChild(semanticTag, span);
            }
        });
        
        // NOW remove all style attributes and Word-specific attributes
        const allElements = tempDiv.querySelectorAll('*');
        allElements.forEach(el => {
            // Remove ALL inline styles (we've already converted font-weight:700 to <strong>)
            el.removeAttribute('style');
            
            // Remove Word-specific attributes
            el.removeAttribute('class');
            el.removeAttribute('id');
            el.removeAttribute('lang');
            el.removeAttribute('dir');
            el.removeAttribute('aria-level');
            el.removeAttribute('role');
            
            // Remove any remaining MSO-specific attributes (should be handled by string replacement, but double-check)
            Array.from(el.attributes).forEach(attr => {
                if (attr.name.startsWith('mso-') || attr.name.startsWith('o:')) {
                    el.removeAttribute(attr.name);
                }
            });
        });

        // Order preservation: We do NOT rearrange content
        // The order from the input HTML should be preserved exactly as-is

        // Preserve order by getting direct children
        return this.getOrderedHTML(tempDiv);
    },

    /**
     * Format HTML with line breaks for readability
     * Adds newlines between block-level elements
     * @param {string} html - HTML string
     * @returns {string} - Formatted HTML with line breaks
     */
    formatHTML(html) {
        let formatted = html;
        
        // Add line breaks before opening tags of block elements (but not if already has newline)
        formatted = formatted.replace(/(<(?:h[1-6]|p|ul|ol|li|div|blockquote)[^>]*>)/gi, '\n$1');
        
        // Add line breaks after closing tags of block elements (but not if already has newline)
        formatted = formatted.replace(/(<\/(?:h[1-6]|p|ul|ol|li|div|blockquote)>)/gi, '$1\n');
        
        // Add line breaks after self-closing tags like <br>
        formatted = formatted.replace(/(<br[^>]*>)/gi, '$1\n');
        
        // Clean up multiple consecutive newlines (keep max 2)
        formatted = formatted.replace(/\n{3,}/g, '\n\n');
        
        // Clean up newlines between list items (they should be on separate lines)
        formatted = formatted.replace(/(<\/li>)\s*\n\s*(<li>)/gi, '$1\n$2');
        
        // Clean up newlines between list tags
        formatted = formatted.replace(/(<\/ul>)\s*\n\s*(<ul>)/gi, '$1\n\n$2');
        formatted = formatted.replace(/(<\/ol>)\s*\n\s*(<ol>)/gi, '$1\n\n$2');
        
        // Ensure proper spacing around headings
        formatted = formatted.replace(/(<\/h[1-6]>)\s*\n\s*(<h[1-6])/gi, '$1\n\n$2');
        
        // Remove leading/trailing whitespace
        formatted = formatted.trim();
        
        return formatted;
    },

    /**
     * Remove extra spaces before punctuation in the final HTML string
     * Handles cases like "</a> ." or "word ." that may persist after DOM cleanup
     * @param {string} html - HTML string
     * @returns {string} - HTML without spaces before punctuation
     */
    removeSpaceBeforePunctuationHTML(html) {
        if (!html) return html;

        return html
            // Remove spaces (including nbsp) between non-space chars and punctuation
            .replace(/(\S)(?:\s|&nbsp;|&#160;)+([.,!?;:])/gi, '$1$2')
            // Remove spaces between closing tags and punctuation (e.g., </a> .)
            .replace(/>\s+([.,!?;:])/g, '>$1')
            // Remove standalone &nbsp; (or numeric equivalent) before punctuation
            .replace(/(&nbsp;|&#160;)+([.,!?;:])/gi, '$2');
    },

    /**
     * Get HTML in document order
     * @param {HTMLElement} container - Container element
     * @returns {string} - HTML in document order
     */
    getOrderedHTML(container) {
        // Use children array to ensure proper order (only element nodes, in document order)
        const elements = [];
        const children = Array.from(container.children);
        
        // Debug: Log order extraction
        if (window.DEBUG_HTML_CLEANER) {
            const order = children.map((el, idx) => ({
                index: idx,
                tag: el.tagName,
                text: el.textContent.substring(0, 30).replace(/\s+/g, ' ')
            }));
            console.log('  📋 getOrderedHTML - Children order:', order);
        }
        
        // If no children elements, check for text nodes
        if (children.length === 0) {
            let child = container.firstChild;
            while (child) {
                if (child.nodeType === 1) { // Element node
                    elements.push(child.outerHTML);
                } else if (child.nodeType === 3) { // Text node
                    const text = child.textContent.trim();
                    if (text) {
                        elements.push(`<p>${text}</p>`);
                    }
                }
                child = child.nextSibling;
            }
        } else {
            // Process all element children in order
            children.forEach((child, idx) => {
                if (window.DEBUG_HTML_CLEANER) {
                    console.log(`  📋 Processing child ${idx}:`, child.tagName, child.textContent.substring(0, 30));
                }
                elements.push(child.outerHTML);
            });
        }
        
        if (elements.length > 0) {
            return elements.join('');
        }
        
        // Fallback: use innerHTML
        return container.innerHTML;
    },

    /**
     * Normalize whitespace
     * @param {string} html - HTML string
     * @returns {string} - HTML with normalized whitespace
     */
    normalizeWhitespace(html) {
        // Keep &nbsp; for spacing (like wordhtml.com does)
        // Only clean up excessive &nbsp; sequences
        let cleaned = html.replace(/(&nbsp;\s*){3,}/g, '&nbsp;');
        
        // Clean up multiple regular spaces between tags
        cleaned = cleaned.replace(/>\s{2,}</g, '><');
        
        return cleaned;
    },

    /**
     * Remove empty list elements
     * @param {string} html - HTML string
     * @returns {string} - HTML without empty lists
     */
    removeEmptyLists(html) {
        const tempDiv = HtmlParser.parseHTML(html);
        
        // First, remove empty list items
        const listItems = Array.from(tempDiv.querySelectorAll('li'));
        listItems.forEach(li => {
            const text = HtmlParser.getTextContent(li.innerHTML).trim();
            const innerHTML = li.innerHTML.trim();
            
            // Remove list items that are empty or only contain whitespace/styles
            // Check if it's truly empty (no text, no meaningful content)
            if (!text || text === '' || innerHTML === '' || innerHTML === '&nbsp;' || innerHTML === '<span>&nbsp;</span>') {
                // Also check if it only has style attributes and nothing else
                const hasOnlyStyle = li.attributes.length > 0 && 
                    Array.from(li.attributes).every(attr => attr.name === 'style') &&
                    (!text || text === '');
                
                if (hasOnlyStyle || (!text && innerHTML === '')) {
                    li.remove();
                }
            }
        });
        
        // Now check and remove empty lists
        const lists = Array.from(tempDiv.querySelectorAll('ul, ol'));
        
        lists.forEach(list => {
            const remainingItems = Array.from(list.querySelectorAll('li'));
            
            if (remainingItems.length === 0) {
                // List has no items, remove it
                list.remove();
            } else {
                // Check if all remaining list items are empty
                let allEmpty = true;
                remainingItems.forEach(li => {
                    const text = HtmlParser.getTextContent(li.innerHTML).trim();
                    const innerHTML = li.innerHTML.trim();
                    if (text && text !== '' && innerHTML !== '&nbsp;' && innerHTML !== '<span>&nbsp;</span>') {
                        allEmpty = false;
                    }
                });
                
                if (allEmpty) {
                    // All items are empty, remove the list
                    list.remove();
                }
            }
        });

        return this.getOrderedHTML(tempDiv);
    },

    /**
     * Remove empty paragraphs
     * @param {string} html - HTML string
     * @returns {string} - HTML without empty paragraphs
     */
    removeEmptyParagraphs(html) {
        const tempDiv = HtmlParser.parseHTML(html);
        // Use Array.from to avoid live collection issues
        const paragraphs = Array.from(tempDiv.querySelectorAll('p'));
        
        paragraphs.forEach(p => {
            const text = HtmlParser.getTextContent(p.innerHTML).trim();
            const innerHTML = p.innerHTML.trim();
            
            // Keep paragraphs with &nbsp; (for spacing like wordhtml.com)
            // Also check for various &nbsp; patterns
            if (innerHTML === '&nbsp;' || 
                innerHTML === '<span>&nbsp;</span>' ||
                innerHTML === '<span style="font-weight: 400;">&nbsp;</span>' ||
                /^(&nbsp;|\s|&nbsp;)+$/.test(innerHTML)) {
                // Keep these - they're intentional spacing
                // But ensure they have proper &nbsp; content
                if (innerHTML.trim() === '' || innerHTML === '<br>') {
                    p.innerHTML = '&nbsp;';
                }
                return;
            }
            
            // Remove truly empty paragraphs (no text, no content, just whitespace)
            if (!text || text === '' || text === ' ') {
                if (!innerHTML || innerHTML === '' || innerHTML === '<br>' || innerHTML === '<br/>') {
                    p.remove();
                }
            }
        });

        return this.getOrderedHTML(tempDiv);
    },

    /**
     * Normalize formatting attributes
     * @param {string} html - HTML string
     * @returns {string} - HTML with normalized formatting
     */
    normalizeFormatting(html) {
        const tempDiv = HtmlParser.parseHTML(html);
        
        // Remove all empty spans (styles are already removed)
        // This runs before convertToSemanticHTML which handles font-weight conversion
        const spans = Array.from(tempDiv.querySelectorAll('span'));
        spans.forEach(span => {
            const text = span.textContent;
            const parent = span.parentNode;
            
            if (!parent) return;
            
            // Remove empty spans (all styles should already be removed)
            if (!text || text.trim() === '') {
                parent.removeChild(span);
            } else {
                // Unwrap spans - they shouldn't have styles anymore, so just unwrap them
                while (span.firstChild) {
                    parent.insertBefore(span.firstChild, span);
                }
                parent.removeChild(span);
            }
        });

        return this.getOrderedHTML(tempDiv);
    },

    /**
     * Clean up nested tags
     * @param {string} html - HTML string
     * @returns {string} - HTML with cleaned nested tags
     */
    cleanNestedTags(html) {
        const tempDiv = HtmlParser.parseHTML(html);
        
        // Fix invalid nesting: unwrap block elements from inline elements
        this.fixInvalidNesting(tempDiv);
        
        // Remove paragraphs from inside list items
        this.removeParagraphsFromListItems(tempDiv);
        
        // Remove empty nested tags (but preserve structure)
        // Process in reverse to avoid issues with modifying while iterating
        const allElements = Array.from(tempDiv.querySelectorAll('*')).reverse();
        allElements.forEach(el => {
            // Skip certain elements that should be preserved even if empty
            if (el.tagName === 'BR' || el.tagName === 'IMG' || el.tagName === 'LI') {
                return;
            }
            
            const text = HtmlParser.getTextContent(el.innerHTML).trim();
            const innerHTML = el.innerHTML.trim();
            
            // Keep elements that contain &nbsp; (spacing)
            if (innerHTML === '&nbsp;' || innerHTML === '<span>&nbsp;</span>') {
                return;
            }
            
            // Remove truly empty elements (no text, no children, no meaningful content)
            if (!text && el.children.length === 0 && innerHTML === '') {
                const parent = el.parentNode;
                if (parent) {
                    parent.removeChild(el);
                }
            }
        });

        return this.getOrderedHTML(tempDiv);
    },

    /**
     * Fix invalid nesting (e.g., block elements inside inline elements)
     * @param {HTMLElement} container - Container element
     */
    fixInvalidNesting(container) {
        // Block elements that shouldn't be inside inline elements
        const blockElements = ['H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'P', 'DIV', 'UL', 'OL', 'LI', 'BLOCKQUOTE'];
        const inlineElements = ['B', 'STRONG', 'I', 'EM', 'U', 'SPAN', 'A', 'CODE', 'SUP', 'SUB'];
        
        // Process multiple times to handle nested cases
        let changed = true;
        let iterations = 0;
        while (changed && iterations < 10) {
            changed = false;
            iterations++;
            
            // Find inline elements that contain block elements
            inlineElements.forEach(inlineTag => {
                const inlineEls = Array.from(container.querySelectorAll(inlineTag));
                inlineEls.forEach(inlineEl => {
                    // Check if this inline element contains any block elements
                    let hasBlockElement = false;
                    blockElements.forEach(blockTag => {
                        if (inlineEl.querySelector(blockTag)) {
                            hasBlockElement = true;
                        }
                    });
                    
                    if (hasBlockElement) {
                        const parent = inlineEl.parentNode;
                        if (parent) {
                            // Move all block elements out of the inline element
                            blockElements.forEach(blockTag => {
                                const blockEls = Array.from(inlineEl.querySelectorAll(blockTag));
                                blockEls.forEach(blockEl => {
                                    // Insert block element after the inline element
                                    parent.insertBefore(blockEl, inlineEl.nextSibling);
                                    changed = true;
                                });
                            });
                            
                            // If inline element is now empty or only has whitespace, remove it
                            const remainingContent = inlineEl.innerHTML.trim();
                            if (!remainingContent || remainingContent === '') {
                                inlineEl.remove();
                                changed = true;
                            }
                        }
                    }
                });
            });
        }

        // Remove empty <b> tags and convert <b> to <strong>
        const bTags = Array.from(container.querySelectorAll('b'));
        bTags.forEach(b => {
            if (!b.textContent.trim() && b.children.length === 0) {
                const parent = b.parentNode;
                if (parent) {
                    parent.removeChild(b);
                }
            } else if (b.children.length === 0 && b.textContent.trim()) {
                // If <b> only contains text, replace with <strong>
                const strong = document.createElement('strong');
                strong.textContent = b.textContent;
                const parent = b.parentNode;
                if (parent) {
                    parent.replaceChild(strong, b);
                }
            } else {
                // If <b> contains other elements, unwrap them
                const parent = b.parentNode;
                if (parent) {
                    while (b.firstChild) {
                        parent.insertBefore(b.firstChild, b);
                    }
                    parent.removeChild(b);
                }
            }
        });
    },

    /**
     * Remove paragraphs from inside list items
     * Preserves strong/em tags inside list items
     * @param {HTMLElement} container - Container element
     */
    removeParagraphsFromListItems(container) {
        const listItems = Array.from(container.querySelectorAll('li'));
        listItems.forEach(li => {
            const paragraphs = Array.from(li.querySelectorAll('p'));
            paragraphs.forEach(p => {
                // Move paragraph content to list item (preserves formatting)
                const parent = p.parentNode;
                while (p.firstChild) {
                    parent.insertBefore(p.firstChild, p);
                }
                p.remove();
            });
        });
    },

    /**
     * Remove <br> tags from inside list items (invalid HTML)
     * @param {HTMLElement} container - Container element
     */
    removeBrFromListItems(container) {
        const listItems = Array.from(container.querySelectorAll('li'));
        listItems.forEach(li => {
            const brTags = Array.from(li.querySelectorAll('br'));
            brTags.forEach(br => {
                // Remove the <br> tag and replace with a space if it's between text nodes
                const parent = br.parentNode;
                const prevSibling = br.previousSibling;
                const nextSibling = br.nextSibling;
                
                // Check if there's text before and after the br
                const hasTextBefore = prevSibling && prevSibling.nodeType === 3 && prevSibling.textContent.trim();
                const hasTextAfter = nextSibling && nextSibling.nodeType === 3 && nextSibling.textContent.trim();
                
                // If br is between text nodes, replace with space
                if (hasTextBefore && hasTextAfter) {
                    // Add space before removing br
                    if (!prevSibling.textContent.endsWith(' ')) {
                        prevSibling.textContent += ' ';
                    }
                }
                
                // Remove the <br> tag
                br.remove();
            });
        });
    },

    /**
     * Remove <br> tags that remain inside lists (ul/ol) after item cleanup
     * @param {HTMLElement} container - Container element
     */
    removeBrFromLists(container) {
        const lists = Array.from(container.querySelectorAll('ul, ol'));
        lists.forEach(list => {
            const brTags = Array.from(list.querySelectorAll('br'));
            brTags.forEach(br => {
                const parent = br.parentNode;
                if (!parent) {
                    br.remove();
                    return;
                }

                const prevSibling = br.previousSibling;
                const nextSibling = br.nextSibling;
                const hasContent = (node) => {
                    if (!node) return false;
                    if (node.nodeType === 3) {
                        return node.textContent && node.textContent.trim() !== '';
                    }
                    if (node.nodeType === 1) {
                        const text = HtmlParser.getTextContent(node.innerHTML || node.textContent || '').trim();
                        return text !== '';
                    }
                    return false;
                };

                if (hasContent(prevSibling) && hasContent(nextSibling)) {
                    if (prevSibling.nodeType === 3) {
                        if (!prevSibling.textContent.endsWith(' ')) {
                            prevSibling.textContent += ' ';
                        }
                    } else {
                        parent.insertBefore(document.createTextNode(' '), br);
                    }
                }

                br.remove();
            });
        });
    },

    /**
     * Remove stray <br> siblings immediately before or after lists (ul/ol)
     * @param {HTMLElement} container - Container element
     */
    removeBrAroundLists(container) {
        const lists = Array.from(container.querySelectorAll('ul, ol'));
        lists.forEach(list => {
            const cleanWhitespaceNode = (node, direction) => {
                while (node) {
                    const current = node;
                    node = direction === 'next' ? current.nextSibling : current.previousSibling;
                    if (current.nodeType === 3) {
                        if (!current.textContent || current.textContent.trim() === '') {
                            current.remove();
                            continue;
                        }
                        break;
                    }
                    if (current.nodeType === 1 && current.tagName.toLowerCase() === 'br') {
                        current.remove();
                        continue;
                    }
                    break;
                }
            };

            // Clean preceding siblings
            cleanWhitespaceNode(list.previousSibling, 'prev');
            // Clean following siblings
            cleanWhitespaceNode(list.nextSibling, 'next');
        });
    },

    /**
     * Append trailing sibling nodes (typically citations broken out by <br>) back into Sources lists
     * @param {HTMLElement} container - Container element
     */
    appendTrailingSourcesToLists(container) {
        const lists = Array.from(container.querySelectorAll('ul, ol'));

        const isSourcesParagraph = (element) => {
            if (!element) return false;
            const tag = element.tagName ? element.tagName.toLowerCase() : '';
            if (tag !== 'p') return false;
            const text = HtmlParser.getTextContent(element.innerHTML || element.textContent || '').toLowerCase().trim();
            return text.startsWith('sources');
        };

        const isStopNode = (node) => {
            if (!node || node.nodeType !== 1) return false;
            const tag = node.tagName.toLowerCase();
            return tag === 'p' ||
                   tag.match(/^h[1-6]$/) ||
                   tag === 'ul' ||
                   tag === 'ol' ||
                   tag === 'div' ||
                   tag === 'section';
        };

        lists.forEach(list => {
            // Only process lists that belong to a Sources section
            let prevElement = list.previousSibling;
            while (prevElement && prevElement.nodeType === 3 && (!prevElement.textContent || prevElement.textContent.trim() === '')) {
                prevElement = prevElement.previousSibling;
            }
            if (!prevElement || prevElement.nodeType !== 1 || !isSourcesParagraph(prevElement)) {
                return;
            }

            const nodesToMove = [];
            let sibling = list.nextSibling;

            while (sibling) {
                const next = sibling.nextSibling;

                if (sibling.nodeType === 3) {
                    if (!sibling.textContent || sibling.textContent.trim() === '') {
                        sibling.remove();
                        sibling = next;
                        continue;
                    }
                }

                if (sibling.nodeType === 1) {
                    const tag = sibling.tagName.toLowerCase();
                    if (tag === 'br') {
                        sibling.remove();
                        sibling = next;
                        continue;
                    }
                    if (isStopNode(sibling)) {
                        break;
                    }
                }

                nodesToMove.push(sibling);
                sibling = next;
            }

            if (nodesToMove.length === 0) {
                return;
            }

            const hasContent = (node) => {
                if (!node) return false;
                if (node.nodeType === 3) {
                    return node.textContent && node.textContent.trim() !== '';
                }
                if (node.nodeType === 1) {
                    const text = HtmlParser.getTextContent(node.innerHTML || node.textContent || '').trim();
                    return text !== '';
                }
                return false;
            };

            const groups = [];
            let currentGroup = [];
            const flushGroup = () => {
                if (currentGroup.length > 0) {
                    groups.push(currentGroup);
                    currentGroup = [];
                }
            };

            nodesToMove.forEach(node => {
                const next = node.nextSibling;
                currentGroup.push(node);
                if (next && next.nodeType === 1 && next.tagName.toLowerCase() === 'br') {
                    next.remove();
                    flushGroup();
                }
            });
            flushGroup();

            groups.forEach(group => {
                if (!group.some(hasContent)) {
                    group.forEach(node => node.remove());
                    return;
                }

                const li = document.createElement('li');
                const fragment = document.createDocumentFragment();
                group.forEach(node => fragment.appendChild(node));
                li.appendChild(fragment);

                // Normalize whitespace inside the new list item
                const textNodes = document.createTreeWalker(li, NodeFilter.SHOW_TEXT, null);
                let current;
                while ((current = textNodes.nextNode())) {
                    current.textContent = current.textContent.replace(/\s+/g, ' ');
                }

                list.appendChild(li);
            });
        });
    }
};

