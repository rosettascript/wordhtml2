/**
 * HTML Converter
 * Main conversion logic from Word paste to clean HTML
 */

const HtmlConverter = {
    /**
     * Convert Word HTML to clean HTML
     * @param {string} wordHTML - HTML from Word paste
     * @returns {string} - Clean HTML
     */
    convert(wordHTML) {
        if (!wordHTML) return '';

        // Debug: Log input order
        const inputDiv = HtmlParser.parseHTML(wordHTML);
        const inputOrder = Array.from(inputDiv.children).map((el, idx) => ({
            index: idx,
            tag: el.tagName,
            text: el.textContent.substring(0, 50).replace(/\s+/g, ' ')
        }));
        console.group('🔍 HTML Conversion Debug');
        console.log('📥 INPUT ORDER:', inputOrder);
        console.log('📥 INPUT HTML (first 500 chars):', wordHTML.substring(0, 500));

        // Clean the HTML (this now handles MSO removal, semantic conversion, etc.)
        let cleaned = HtmlCleaner.clean(wordHTML);
        
        // Debug: Log after cleaning
        const afterCleanDiv = HtmlParser.parseHTML(cleaned);
        const afterCleanOrder = Array.from(afterCleanDiv.children).map((el, idx) => ({
            index: idx,
            tag: el.tagName,
            text: el.textContent.substring(0, 50).replace(/\s+/g, ' ')
        }));
        console.log('🧹 AFTER CLEAN ORDER:', afterCleanOrder);
        
        // Final cleanup (spacing, empty lists, etc.)
        cleaned = this.finalCleanup(cleaned);

        // Debug: Log final output
        const finalDiv = HtmlParser.parseHTML(cleaned);
        const finalOrder = Array.from(finalDiv.children).map((el, idx) => ({
            index: idx,
            tag: el.tagName,
            text: el.textContent.substring(0, 50).replace(/\s+/g, ' ')
        }));
        console.log('✅ FINAL ORDER:', finalOrder);
        console.log('✅ FINAL HTML (first 500 chars):', cleaned.substring(0, 500));
        
        // Compare first and last elements
        if (inputOrder.length > 0 && finalOrder.length > 0) {
            const inputFirst = inputOrder[0];
            const inputLast = inputOrder[inputOrder.length - 1];
            const finalFirst = finalOrder[0];
            const finalLast = finalOrder[finalOrder.length - 1];
            
            console.log('🔍 ORDER COMPARISON:');
            console.log('  Input First:', inputFirst);
            console.log('  Final First:', finalFirst);
            console.log('  Input Last:', inputLast);
            console.log('  Final Last:', finalLast);
            
            if (inputFirst.tag === finalLast.tag && inputLast.tag === finalFirst.tag) {
                console.warn('⚠️ ORDER APPEARS REVERSED!');
            }
        }
        
        console.groupEnd();

        return cleaned;
    },

    // Note: Semantic conversion is now handled in HtmlCleaner
    // This method is kept for backwards compatibility but is no longer used

    /**
     * Get HTML in document order
     * @param {HTMLElement} container - Container element
     * @returns {string} - HTML in document order
     */
    getOrderedHTML(container) {
        // Use cloneNode to avoid modifying original
        const clone = container.cloneNode(true);
        const elements = [];
        
        // Use children array to ensure proper order (only element nodes)
        const children = Array.from(clone.children);
        
        // Debug: Log order extraction
        if (window.DEBUG_HTML_CLEANER) {
            const order = children.map((el, idx) => ({
                index: idx,
                tag: el.tagName,
                text: el.textContent.substring(0, 30).replace(/\s+/g, ' ')
            }));
            console.log('  📋 HtmlConverter.getOrderedHTML - Children order:', order);
        }
        
        if (children.length > 0) {
            children.forEach((child, idx) => {
                if (window.DEBUG_HTML_CLEANER) {
                    console.log(`  📋 Processing child ${idx}:`, child.tagName, child.textContent.substring(0, 30));
                }
                elements.push(child.outerHTML);
            });
        } else {
            // Fallback: check for any nodes (including text nodes)
            let child = clone.firstChild;
            while (child) {
                if (child.nodeType === 1) { // Element node
                    elements.push(child.outerHTML);
                }
                child = child.nextSibling;
            }
        }
        
        // If we have elements, return them in order
        if (elements.length > 0) {
            return elements.join('');
        }
        
        // Fallback to innerHTML
        return clone.innerHTML;
    },

    /**
     * Ensure proper paragraph structure
     * @param {HTMLElement} container - Container element
     */
    ensureParagraphStructure(container) {
        // Wrap text nodes that are direct children in paragraphs
        // This is a simplified version - in practice, Word usually provides paragraphs
        
        const walker = document.createTreeWalker(
            container,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );

        let node;
        const textNodes = [];
        while (node = walker.nextNode()) {
            if (node.textContent.trim() && node.parentNode === container) {
                textNodes.push(node);
            }
        }

        textNodes.forEach(textNode => {
            const p = document.createElement('p');
            p.textContent = textNode.textContent;
            container.replaceChild(p, textNode);
        });
    },

    /**
     * Final cleanup
     * @param {string} html - HTML string
     * @returns {string} - Final cleaned HTML
     */
    finalCleanup(html) {
        const tempDiv = HtmlParser.parseHTML(html);
        
        // Final pass: remove any remaining empty lists
        const lists = Array.from(tempDiv.querySelectorAll('ul, ol'));
        lists.forEach(list => {
            const items = Array.from(list.querySelectorAll('li'));
            if (items.length === 0) {
                list.remove();
            } else {
                // Check if all items are truly empty
                const allEmpty = items.every(li => {
                    const text = HtmlParser.getTextContent(li.innerHTML).trim();
                    return !text || text === '';
                });
                if (allEmpty) {
                    list.remove();
                }
            }
        });
        
        // Convert <br> tags between block elements to proper spacing
        this.fixBrTags(tempDiv);
        
        // Ensure links have proper spacing
        this.fixLinkSpacing(tempDiv);
        
        // Use getOrderedHTML to preserve document order
        let cleaned = this.getOrderedHTML(tempDiv);
        
        // Remove Apple-specific <br> tags (class="Apple-interchange-newline")
        cleaned = cleaned.replace(/<br\s+[^>]*class\s*=\s*["'][^"']*Apple-interchange[^"']*["'][^>]*>/gi, '');
        cleaned = cleaned.replace(/<br\s+[^>]*class\s*=\s*["'][^"']*apple-interchange[^"']*["'][^>]*>/gi, '');
        
        // Remove <strong> tags that only contain <br> tags (no meaningful content)
        // Pattern: <strong> followed by only <br> tags (and optional whitespace/newlines) then </strong>
        // Match repeatedly to catch all instances
        let previousLength = cleaned.length;
        let iterations = 0;
        while (iterations < 5) {
            cleaned = cleaned.replace(/<strong(?:\s[^>]*)?>[\s\n\r]*(?:<br\s*\/?>[\s\n\r]*)+<\/strong>/gi, (match) => {
                // Extract all <br> tags from the match
                const brMatches = match.match(/<br\s*\/?>/gi);
                return brMatches ? brMatches.join('') : '';
            });
            
            // If no more changes, break
            if (cleaned.length === previousLength) break;
            previousLength = cleaned.length;
            iterations++;
        }
        
        // Remove <br> tags between block-level elements (they're not needed)
        // BUT preserve <br> tags WITHIN paragraphs and other block elements
        // Pattern: </block-element><br><block-element> - only remove <br> that's directly between closing and opening block tags
        cleaned = cleaned.replace(/(<\/(?:p|ul|ol|li|div|h[1-6]|blockquote)>)\s*<br\s*\/?>\s*(<(?:p|ul|ol|li|div|h[1-6]|blockquote)[^>]*>)/gi, '$1$2');
        cleaned = cleaned.replace(/(<\/(?:p|ul|ol|li|div|h[1-6]|blockquote)>)\s*<br\s*\/?>\s*(<\/(?:p|ul|ol|li|div|h[1-6]|blockquote)>)/gi, '$1$2');
        
        // Remove excessive consecutive line breaks (4+), but keep up to 2 consecutive <br> tags within paragraphs
        // This allows for paragraph breaks while removing excessive spacing
        cleaned = cleaned.replace(/(<br\s*\/?>){4,}/gi, '<br><br>');
        
        // Remove any remaining standalone Apple <br> tags at the end
        cleaned = cleaned.replace(/<br\s+[^>]*class\s*=\s*["'][^"']*Apple-interchange[^"']*["'][^>]*>/gi, '');
        cleaned = cleaned.replace(/<br\s+[^>]*class\s*=\s*["'][^"']*apple-interchange[^"']*["'][^>]*>/gi, '');
        
        // Clean up whitespace around tags (but preserve &nbsp;)
        // Be more careful - only remove whitespace between tags, not content
        cleaned = cleaned.replace(/>\s{2,}(?!&nbsp;)</g, '><');
        cleaned = cleaned.replace(/^\s+|\s+$/g, '');
        
        return cleaned.trim();
    },

    /**
     * Fix <br> tags - remove them only when between block elements, preserve within paragraphs
     * @param {HTMLElement} container - Container element
     */
    fixBrTags(container) {
        const brTags = Array.from(container.querySelectorAll('br'));
        brTags.forEach(br => {
            const parent = br.parentNode;
            const nextSibling = br.nextSibling;
            const prevSibling = br.previousSibling;
            
            // PRESERVE <br> tags within paragraphs - they represent line breaks
            if (parent && parent.tagName === 'P') {
                // Only remove trailing <br> at the very end of paragraph (after all content)
                // Check if this is the last meaningful content
                let hasContentAfter = false;
                let node = nextSibling;
                while (node) {
                    if (node.nodeType === 3 && node.textContent.trim()) {
                        hasContentAfter = true;
                        break;
                    }
                    if (node.nodeType === 1 && node.tagName !== 'BR') {
                        hasContentAfter = true;
                        break;
                    }
                    node = node.nextSibling;
                }
                // Only remove if it's truly at the end with no content after
                if (!hasContentAfter && (!nextSibling || (nextSibling.nodeType === 1 && nextSibling.tagName === 'BR'))) {
                    // Check if there's any content before this br
                    let hasContentBefore = false;
                    node = prevSibling;
                    while (node) {
                        if (node.nodeType === 3 && node.textContent.trim()) {
                            hasContentBefore = true;
                            break;
                        }
                        if (node.nodeType === 1 && node.tagName !== 'BR') {
                            hasContentBefore = true;
                            break;
                        }
                        node = node.previousSibling;
                    }
                    // Only remove trailing br if there's content before it
                    if (hasContentBefore) {
                        br.remove();
                    }
                }
                // Otherwise, preserve the <br> - it's a line break within the paragraph
                return;
            }
            
            // If br is between block elements (as siblings), remove it
            if (prevSibling && nextSibling) {
                const prevTag = prevSibling.nodeType === 1 ? prevSibling.tagName : null;
                const nextTag = nextSibling.nodeType === 1 ? nextSibling.tagName : null;
                
                const blockTags = ['H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'P', 'UL', 'OL', 'DIV'];
                
                if (prevTag && blockTags.includes(prevTag) && nextTag && blockTags.includes(nextTag)) {
                    br.remove();
                    return;
                }
            }
            
            // If br is at end of heading (not paragraph), remove it
            if (parent && parent.tagName.match(/^H[1-6]$/)) {
                if (!nextSibling || (nextSibling.nodeType === 1 && nextSibling.tagName === 'BR')) {
                    br.remove();
                }
            }
        });
    },

    /**
     * Fix link spacing - ensure links have space before/after if needed
     * @param {HTMLElement} container - Container element
     */
    fixLinkSpacing(container) {
        const links = container.querySelectorAll('a');
        links.forEach(link => {
            const parent = link.parentNode;
            const prevSibling = link.previousSibling;
            const nextSibling = link.nextSibling;
            
            // Add space before link if it's directly after text
            if (prevSibling && prevSibling.nodeType === 3 && !prevSibling.textContent.endsWith(' ')) {
                const space = document.createTextNode(' ');
                parent.insertBefore(space, link);
            }
            
            // Add space after link if it's directly before text
            if (nextSibling && nextSibling.nodeType === 3 && !nextSibling.textContent.startsWith(' ')) {
                const space = document.createTextNode(' ');
                parent.insertBefore(space, link.nextSibling);
            }
        });
    }
};

