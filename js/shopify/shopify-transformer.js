/**
 * Shopify Transformer
 * Applies simple tweaks to regular output for Shopify Blogs format
 */

const ShopifyTransformer = {
    /**
     * Transform HTML to Shopify Blogs format (tweaks regular output)
     * @param {string} html - Input HTML (already processed by regular converter)
     * @param {Object} options - Transformation options
     * @param {boolean} options.sop - Apply SOP formatting (if true, use complex section detection)
     * @param {boolean} options.sopRemoveSpacing - Remove spacing when SOP is enabled
     * @param {boolean} options.sopRemoveDomain - Remove domain from links when SOP is enabled
     * @param {boolean} options.sopDisableSources - Keep original Sources list formatting
     * @returns {string} - Transformed HTML
     */
    transform(html, options = {}) {
        if (!html) return '';

        // If SOP is enabled, use complex section detection
        if (options.sop) {
            return this.applySOPFormatting(html, options);
        }

        // Otherwise, just apply simple tweaks to regular output (the full regular output)
        // No section detection, no filtering - just tweak the entire regular output
        let result = html;

        // 0. Clean up malformed headings with br tags (from Word)
        result = this.removeBrFromHeadings(result);

        // 1. Remove <em> tags (but preserve sources for special handling)
        result = this.removeEmTags(result);

        // 1.5 Optionally wrap headings with <strong>
        if (options.shopifyAddStrongHeaders !== false) {
            result = this.wrapHeadersWithStrong(result);
        }

        // 2. Convert Sources list to numbered paragraphs (after removing em tags, so we can add fresh em tags)
        result = this.convertSourcesListToParagraphs(result, options);

        // 3. Add ':' to Key Takeaways if it doesn't have one
        result = this.fixKeyTakeawaysColon(result);

        // 4. Remove <h1> tags
        result = this.removeH1Tags(result);

        // 5. Add rel="noopener" to all links and optionally remove domain
        result = this.fixAllLinks(result, options);

        // 6. Add spacer after Key Takeaways list and before Read also
        result = this.addSpacersForKeyTakeawaysAndReadAlso(result);

        // 7. Add spacer before headers (except Key Takeaways and first header after FAQ)
        result = this.addSpacerBeforeHeaders(result);

        // If Remove Spacing option is enabled (even without SOP), remove extra spacing
        if (options.sopRemoveSpacing) {
            result = this.removeExtraSpacing(result);
        }

        return HtmlCleaner.removeSpaceBeforePunctuationHTML(result);
    },

    /**
     * Apply SOP formatting 
     * Since SOP is now the default for Shopify Blogs, it should use simple tweaks
     * to preserve all content (just like non-SOP mode)
     * @param {string} html - Input HTML
     * @param {Object} options - Options
     * @returns {string} - Processed HTML
     */
    applySOPFormatting(html, options = {}) {
        // SOP mode should use the same simple tweaks approach to preserve all content
        // The user wants the full regular output with tweaks, not filtered sections
        let result = this.applyBasicTweaks(html, options);
        
        // If Remove Spacing option is enabled, remove extra spacing
        if (options.sopRemoveSpacing) {
            result = this.removeExtraSpacing(result);
        }
        
        return HtmlCleaner.removeSpaceBeforePunctuationHTML(result);
    },

    /**
     * Clean up br tags from headings (malformed HTML from Word)
     * @param {string} html - HTML string
     * @returns {string} - HTML with br tags removed from headings
     */
    removeBrFromHeadings(html) {
        const tempDiv = HtmlParser.parseHTML(html);
        const headings = tempDiv.querySelectorAll('h1, h2, h3, h4, h5, h6');
        
        headings.forEach(heading => {
            // Remove all br tags from the heading
            const brTags = heading.querySelectorAll('br');
            brTags.forEach(br => br.remove());
            
            // Clean up any extra whitespace
            const text = heading.textContent || heading.innerText || '';
            if (text.trim() === '') {
                // If heading is empty after removing br tags, remove the heading
                heading.remove();
            }
        });
        
        return tempDiv.innerHTML;
    },

    /**
     * Wrap headings with <strong> tags, avoiding duplicate nesting
     * @param {string} html - HTML string
     * @returns {string} - HTML with headings wrapped in <strong>
     */
    wrapHeadersWithStrong(html) {
        const tempDiv = HtmlParser.parseHTML(html);
        const headings = tempDiv.querySelectorAll('h1, h2, h3, h4, h5, h6');

        headings.forEach(heading => {
            if (!heading) return;
            const textContent = heading.textContent || heading.innerText || '';
            if (!textContent.trim()) {
                return;
            }

            const elementChildren = Array.from(heading.children || []);
            if (elementChildren.length === 1 && elementChildren[0].tagName && elementChildren[0].tagName.toLowerCase() === 'strong') {
                const onlyChild = elementChildren[0];
                const hasOtherContent = Array.from(heading.childNodes || []).some(node => {
                    if (node === onlyChild) {
                        return false;
                    }
                    if (node.nodeType === 3) {
                        return node.textContent && node.textContent.trim() !== '';
                    }
                    if (node.nodeType === 1) {
                        return true;
                    }
                    return false;
                });
                if (!hasOtherContent) {
                    return;
                }
            }

            const strongWrapper = document.createElement('strong');

            while (heading.firstChild) {
                const child = heading.firstChild;
                if (child.nodeType === 1 && child.tagName && child.tagName.toLowerCase() === 'strong') {
                    while (child.firstChild) {
                        strongWrapper.appendChild(child.firstChild);
                    }
                    heading.removeChild(child);
                    continue;
                }
                strongWrapper.appendChild(child);
            }

            heading.appendChild(strongWrapper);
        });

        return tempDiv.innerHTML;
    },

    /**
     * Apply basic tweaks to HTML
     * @param {string} html - Input HTML
     * @param {Object} options - Options
     * @returns {string} - Processed HTML
     */
    applyBasicTweaks(html, options = {}) {
        let result = html;
        // First, clean up malformed headings with br tags (from Word)
        result = this.removeBrFromHeadings(result);
        // Remove <em> tags first
        result = this.removeEmTags(result);
        if (options.shopifyAddStrongHeaders !== false) {
            result = this.wrapHeadersWithStrong(result);
        }
        // Convert Sources list to numbered paragraphs (after removing em tags)
        result = this.convertSourcesListToParagraphs(result, options);
        result = this.fixKeyTakeawaysColon(result);
        result = this.removeH1Tags(result);
        result = this.fixAllLinks(result, options);
        result = this.addSpacersForKeyTakeawaysAndReadAlso(result);
        result = this.addSpacerBeforeHeaders(result);
        return result;
    },

    /**
     * Remove <em> tags (keep content)
     * @param {string} html - HTML string
     * @returns {string} - HTML without <em> tags
     */
    removeEmTags(html) {
        // Remove opening and closing <em> tags
        let cleaned = html.replace(/<\/?em>/gi, '');
        // Also remove <i> tags (italic)
        cleaned = cleaned.replace(/<\/?i>/gi, '');
        return cleaned;
    },

    /**
     * Add ':' to Key Takeaways if it doesn't have one
     * @param {string} html - HTML string
     * @returns {string} - HTML with fixed Key Takeaways
     */
    fixKeyTakeawaysColon(html) {
        // Use DOM parsing approach for reliable handling
        // Note: br tags should already be removed by removeBrFromHeadings
        const tempDiv = HtmlParser.parseHTML(html);
        const headings = tempDiv.querySelectorAll('h1, h2, h3, h4, h5, h6');
        
        headings.forEach(heading => {
            // Get text content
            const text = heading.textContent || heading.innerText || '';
            const trimmedText = text.trim().toLowerCase();
            
            // Check if it's Key Takeaways
            if (trimmedText === 'key takeaways' || trimmedText === 'key takeaways:') {
                // Get the cleaned innerHTML
                let innerHTML = heading.innerHTML.trim();
                
                // Check if it already has ':'
                if (!trimmedText.includes(':')) {
                    // Add ':'
                    if (innerHTML.includes('<strong>')) {
                        heading.innerHTML = innerHTML.replace(/(<\/strong>)/, ':$1');
                    } else {
                        heading.innerHTML = innerHTML + ':';
                    }
                }
            }
        });
        
        return tempDiv.innerHTML;
    },

    /**
     * Add spacing between paragraphs (<p></p>)
     * @param {string} html - HTML string
     * @returns {string} - HTML with spacing between paragraphs
     */
    addSpacingBetweenParagraphs(html) {
        // Simple regex approach - add <p></p> after every </p> that's not already followed by empty paragraph
        // Use a more careful regex that preserves all content
        let result = html;
        
        // Split by </p> tags, process each, and rejoin
        const parts = result.split(/(<\/p>)/gi);
        const newParts = [];
        
        for (let i = 0; i < parts.length; i++) {
            newParts.push(parts[i]);
            
            // If this is a </p> tag and not the last part
            if (parts[i].toLowerCase() === '</p>' && i < parts.length - 1) {
                // Get the next part (after whitespace)
                const nextPart = parts.slice(i + 1).join('').trim();
                
                // Check if next part starts with empty paragraph
                if (!nextPart.match(/^<p>\s*<\/p>/i) && nextPart !== '') {
                    // Add spacing
                    newParts.push('<p></p>');
                }
            }
        }
        
        return newParts.join('');
    },

    /**
     * Remove <h1> tags completely (remove tag and content)
     * @param {string} html - HTML string
     * @returns {string} - HTML without <h1> tags
     */
    removeH1Tags(html) {
        // Use regex to completely remove <h1> tags and their content
        let result = html;
        
        // Remove <h1>...</h1> completely, including all content inside
        result = result.replace(/<h1[^>]*>.*?<\/h1>/gi, '');
        
        return result;
    },

    /**
     * Add spacer after Key Takeaways list and before Read also
     * @param {string} html - HTML string
     * @returns {string} - HTML with spacers added
     */
    addSpacersForKeyTakeawaysAndReadAlso(html) {
        const tempDiv = HtmlParser.parseHTML(html);
        
        // Find Key Takeaways section
        const allHeaders = Array.from(tempDiv.querySelectorAll('h1, h2, h3, h4, h5, h6'));
        let keyTakeawaysHeader = null;
        let keyTakeawaysIndex = -1;
        
        for (let i = 0; i < allHeaders.length; i++) {
            const text = HtmlParser.getTextContent(allHeaders[i].innerHTML).toLowerCase().trim();
            if (text.includes('key takeaways')) {
                keyTakeawaysHeader = allHeaders[i];
                keyTakeawaysIndex = i;
                break;
            }
        }
        
        // Add spacer after Key Takeaways list
        if (keyTakeawaysHeader) {
            // Find the list (ul) that follows the Key Takeaways header
            let current = keyTakeawaysHeader.nextElementSibling;
            while (current) {
                if (current.tagName && current.tagName.toLowerCase() === 'ul') {
                    // Check if there's already a spacer after this list
                    const nextSibling = current.nextElementSibling;
                    const hasSpacer = nextSibling && 
                                      nextSibling.tagName && 
                                      nextSibling.tagName.toLowerCase() === 'p' &&
                                      (!nextSibling.textContent || nextSibling.textContent.trim() === '');
                    
                    // Only add spacer if one doesn't already exist
                    if (!hasSpacer) {
                        // Add spacer after the list
                        // Use &nbsp; to ensure it's not removed as empty
                        const spacer = document.createElement('p');
                        spacer.innerHTML = '&nbsp;';
                        current.parentNode.insertBefore(spacer, current.nextSibling);
                    }
                    break;
                }
                current = current.nextElementSibling;
            }
        }
        
        // Find "Read also:" or "Read more:" paragraph and add spacer before it
        const paragraphs = tempDiv.querySelectorAll('p');
        for (let p of paragraphs) {
            const text = HtmlParser.getTextContent(p.innerHTML).toLowerCase().trim();
            // Match both "read also" and "read more" patterns
            if (text.includes('read also') || text.includes('read also:') || 
                text.includes('read more') || text.includes('read more:')) {
                // Check if there's already a spacer before this paragraph
                const prevSibling = p.previousElementSibling;
                const hasSpacer = prevSibling && 
                                  prevSibling.tagName && 
                                  prevSibling.tagName.toLowerCase() === 'p' &&
                                  (!prevSibling.textContent || prevSibling.textContent.trim() === '');
                
                // Only add spacer if one doesn't already exist
                if (!hasSpacer) {
                    // Add spacer before Read also/Read more paragraph
                    // Use &nbsp; to ensure it's not removed as empty
                    const spacer = document.createElement('p');
                    spacer.innerHTML = '&nbsp;';
                    p.parentNode.insertBefore(spacer, p);
                }
                break; // Only first one
            }
        }
        
        return tempDiv.innerHTML;
    },

    /**
     * Fix all links to add rel="noopener"
     * Ensures rel="noopener" comes before href attribute
     * Optionally removes domain from links (keeps only pathname and search/hash)
     * @param {string} html - HTML string
     * @param {Object} options - Options object
     * @param {boolean} options.sopRemoveDomain - If true, remove domain from links
     * @returns {string} - HTML with all links having rel="noopener"
     */
    fixAllLinks(html, options = {}) {
        // Use regex to replace anchor tags and ensure attribute order
        return html.replace(/<a\s+([^>]*)>/gi, (match, attrs) => {
            // Parse attributes
            const attrMap = {};
            
            // Extract all attribute pairs (handles both quoted and unquoted values)
            const attrRegex = /(\w+)(?:=(["'])(.*?)\2|=([^\s>]+))?/g;
            let attrMatch;
            while ((attrMatch = attrRegex.exec(attrs)) !== null) {
                const name = attrMatch[1];
                const quote = attrMatch[2] || '';
                const value = attrMatch[3] || attrMatch[4] || '';
                attrMap[name.toLowerCase()] = { name, value, quote: quote || '"' };
            }
            
            // Process href to remove domain if option is enabled
            if (attrMap['href'] && options.sopRemoveDomain) {
                const hrefValue = attrMap['href'].value;
                try {
                    // Try to parse as URL - if it has a protocol and host, extract just the path
                    const url = new URL(hrefValue);
                    // Get pathname + search + hash (everything after the domain)
                    const relativePath = url.pathname + url.search + url.hash;
                    attrMap['href'].value = relativePath;
                } catch (e) {
                    // If URL parsing fails, it might already be a relative URL or invalid
                    // Keep it as is
                }
            }
            
            // Build new attributes in desired order: rel, target, href, then others
            const orderedAttrs = [];
            
            // 1. rel="noopener" (always first)
            orderedAttrs.push('rel="noopener"');
            
            // 2. target (preserve original if present, otherwise default to _blank)
            let targetValue = '_blank';
            if (attrMap['target'] && attrMap['target'].value) {
                targetValue = attrMap['target'].value;
            }
            orderedAttrs.push(`target="${targetValue}"`);

            // 3. href (if exists)
            if (attrMap['href']) {
                orderedAttrs.push(`href="${attrMap['href'].value}"`);
            }
            
            // 4. Other attributes (preserve existing order for non-standard attrs)
            Object.keys(attrMap).forEach(key => {
                const lowerKey = key.toLowerCase();
                if (lowerKey !== 'rel' && lowerKey !== 'target' && lowerKey !== 'href') {
                    const attr = attrMap[key];
                    orderedAttrs.push(`${attr.name}="${attr.value}"`);
                }
            });
            
            return `<a ${orderedAttrs.join(' ')}>`;
        });
    },

    /**
     * Add spacer (<p></p>) before headers, except Key Takeaways and first header after FAQ
     * FAQ header itself SHOULD have a spacer
     * First header after FAQ should NOT have a spacer, but subsequent ones should
     * @param {string} html - HTML string
     * @returns {string} - HTML with spacers before headers
     */
    addSpacerBeforeHeaders(html) {
        const tempDiv = HtmlParser.parseHTML(html);
        
        // Helper function to check if previous sibling is already an empty paragraph spacer
        const hasSpacerBefore = (header) => {
            const prevSibling = header.previousElementSibling;
            if (!prevSibling || prevSibling.tagName.toLowerCase() !== 'p') {
                return false;
            }
            const text = prevSibling.textContent || prevSibling.innerText || '';
            const innerHTML = prevSibling.innerHTML.trim();
            // Check if it's an empty paragraph (empty, whitespace only, or just &nbsp;)
            return text.trim() === '' && (innerHTML === '' || innerHTML === '&nbsp;');
        };
        
        // Find all headers in document order
        const allHeaders = Array.from(tempDiv.querySelectorAll('h1, h2, h3, h4, h5, h6'));
        
        // Find the FAQ header index
        let faqIndex = -1;
        for (let i = 0; i < allHeaders.length; i++) {
            const text = HtmlParser.getTextContent(allHeaders[i].innerHTML).toLowerCase().trim();
            if (text.includes('frequently asked questions')) {
                faqIndex = i;
                break; // Found first FAQ header
            }
        }
        
        // Process headers in reverse order to avoid index shifting issues when inserting
        for (let i = allHeaders.length - 1; i >= 0; i--) {
            const header = allHeaders[i];
            const text = HtmlParser.getTextContent(header.innerHTML).toLowerCase().trim();
            
            // Skip Key Takeaways headers
            if (text.includes('key takeaways')) {
                continue;
            }
            
            // Check if there's already a spacer before this header
            if (hasSpacerBefore(header)) {
                continue; // Skip adding another spacer
            }
            
            // Handle FAQ section
            if (faqIndex >= 0) {
                // Skip FAQ header itself - we'll handle it separately
                if (i === faqIndex) {
                    // Add spacer before FAQ header
                    const spacer = document.createElement('p');
                    spacer.innerHTML = '&nbsp;';
                    header.parentNode.insertBefore(spacer, header);
                    continue;
                }
                
                // Skip the FIRST header immediately after FAQ (index faqIndex + 1)
                if (i === faqIndex + 1) {
                    continue; // No spacer for first header after FAQ
                }
                
                // For headers after FAQ (but not the first one), add spacers
                if (i > faqIndex) {
                    const spacer = document.createElement('p');
                    spacer.innerHTML = '&nbsp;';
                    header.parentNode.insertBefore(spacer, header);
                    continue;
                }
            }
            
            // Add spacer before all other headers (before FAQ section)
            const spacer = document.createElement('p');
            spacer.innerHTML = '&nbsp;';
            header.parentNode.insertBefore(spacer, header);
        }

        return tempDiv.innerHTML;
    },

    /**
     * Convert Sources list to numbered paragraphs
     * Finds "Sources:" paragraph followed by an ordered list and converts it to numbered paragraphs with italic
     * @param {string} html - HTML string
     * @returns {string} - HTML with sources list converted to paragraphs
     */
    convertSourcesListToParagraphs(html, options = {}) {
        const tempDiv = HtmlParser.parseHTML(html);
        const disableSources = !!options.sopDisableSources;
        const applyInlineItalic = !!options.sopStyleSourcesLi;
        const addBrBeforeSources = !!options.sopAddBrBeforeSources;
        const isReadAlsoList = (node) => {
            if (!node) return false;
            const prev = node.previousElementSibling;
            if (!prev) return false;
            const text = HtmlParser.getTextContent(prev.innerHTML || prev.textContent || '').toLowerCase().trim();
            return text.startsWith('read also') || text.startsWith('read more');
        };
        
        // Find all paragraphs
        const paragraphs = tempDiv.querySelectorAll('p');

        for (let i = paragraphs.length - 1; i >= 0; i--) {
            const p = paragraphs[i];
            const text = HtmlParser.getTextContent(p.innerHTML).toLowerCase().trim();
            
            // Check if this is a "Sources:" paragraph
            if (text.includes('sources') && (text === 'sources' || text === 'sources:' || text.includes('sources:'))) {
                // Add spacer before Sources paragraph
                const spacer = document.createElement('p');
                spacer.innerHTML = addBrBeforeSources ? '<br>' : '&nbsp;';
                p.parentNode.insertBefore(spacer, p);
                
                // Format the Sources paragraph
                const sourcesText = HtmlParser.getTextContent(p.innerHTML).trim();
                if (sourcesText.toLowerCase().includes('sources')) {
                    p.innerHTML = '<em><strong>Sources:</strong></em>';
                }
                
                // Find the next sibling that is an ordered list
                let current = p.nextElementSibling;
                while (current) {
                    const tagName = current.tagName ? current.tagName.toLowerCase() : '';
                    
                    // If we found an ordered list right after Sources
                    if (tagName === 'ol' || (disableSources && tagName === 'ul')) {
                        if (tagName === 'ul' && isReadAlsoList(current)) {
                            current = current.nextElementSibling;
                            continue;
                        }
                        const listItems = current.querySelectorAll('li');
                        
                        if (listItems.length > 0) {
                            if (disableSources) {
                                listItems.forEach(li => {
                                    this.removeBrFromListItem(li);
                                    const originalHTML = li.innerHTML.trim();
                                    if (!originalHTML) {
                                        li.remove();
                                        return;
                                    }

                                    if (!/^<em[\s>]/i.test(originalHTML) || !/<\/em>\s*$/i.test(originalHTML)) {
                                        li.innerHTML = `<em>${originalHTML}</em>`;
                                    }

                                    if (applyInlineItalic) {
                                        li.style.fontStyle = 'italic';
                                    } else {
                                        li.style.removeProperty('font-style');
                                        if (!li.getAttribute('style')) {
                                            li.removeAttribute('style');
                                        }
                                    }
                                });

                                this.removeBrFromList(current);
                                let number = listItems.length;
                                number = this.appendTrailingSourcesToList(current, number, { italicizeListItem: applyInlineItalic });
                                this.removeTrailingBrNodes(current);
                                break;
                            } else {
                                let number = 0;
                                listItems.forEach((li, index) => {
                                    this.removeBrFromListItem(li);
                                    number = index + 1;
                                    const itemHTML = li.innerHTML.trim();
                                    if (!itemHTML) {
                                        li.remove();
                                        return;
                                    }

                                    const paragraph = document.createElement('p');
                                    paragraph.innerHTML = `<em>${number}. ${itemHTML}</em>`;
                                    current.parentNode.insertBefore(paragraph, current);
                                });

                                number = this.processTrailingSourceNodes(current, number);
                                this.removeTrailingBrNodes(current);
                                current.remove();
                                break;
                            }
                        }
                    }
                    
                    // If we hit another paragraph or heading, stop looking
                    if (tagName === 'p' || tagName.match(/^h[1-6]$/)) {
                        break;
                    }
                    
                    current = current.nextElementSibling;
                }
            }

            if (text.includes('sources') && (text === 'sources' || text === 'sources:' || text.includes('sources:'))) {
                break;
            }
        }
        
        return tempDiv.innerHTML;
    },

    /**
     * Remove <br> tags from a list item while preserving spacing
     * @param {HTMLElement} li - List item element
     */
    removeBrFromListItem(li) {
        if (!li) return;
        const brTags = Array.from(li.querySelectorAll('br'));
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
                    return node.textContent && node.textContent.trim() !== '';
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
    },

    /**
     * Append trailing nodes after a list into the list as additional sources (when disableSources is true)
     * @param {HTMLElement} listNode - List element to append to
     * @param {number} currentNumber - Current count of sources processed
     * @returns {number} - Updated count after appending nodes
     */
    appendTrailingSourcesToList(listNode, currentNumber = 0, options = {}) {
        const italicizeListItem = !!options.italicizeListItem;
        if (!listNode || !listNode.parentNode) return currentNumber;
        const parent = listNode.parentNode;
        const nodesToProcess = [];

        let sibling = listNode.nextSibling;
        const isStopNode = (node) => {
            if (!node || node.nodeType !== 1) return false;
            const tag = node.tagName.toLowerCase();
            return tag === 'p' || tag.match(/^h[1-6]$/) || tag === 'ul' || tag === 'ol' || tag === 'div' || tag === 'section';
        };

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
            nodesToProcess.push(sibling);
            sibling = next;
        }

        const segments = [];
        let currentSegment = [];
        const flushSegment = () => {
            if (currentSegment.length > 0) {
                segments.push(currentSegment);
                currentSegment = [];
            }
        };
        nodesToProcess.forEach(node => {
            const next = node.nextSibling;
            currentSegment.push(node);
            if (next && next.nodeType === 1 && next.tagName.toLowerCase() === 'br') {
                next.remove();
                flushSegment();
            }
        });
        flushSegment();

        const hasContent = (segment) => segment.some(node => {
            if (!node) return false;
            if (node.nodeType === 3) {
                return node.textContent && node.textContent.trim() !== '';
            }
            if (node.nodeType === 1) {
                const text = HtmlParser.getTextContent(node.innerHTML || node.textContent || '').trim();
                return text !== '';
            }
            return false;
        });

        segments.forEach(segment => {
            if (!hasContent(segment)) {
                segment.forEach(node => node.remove());
                return;
            }

            const li = document.createElement('li');

            if (italicizeListItem) {
                const em = document.createElement('em');
                li.appendChild(em);
                segment.forEach(node => {
                    em.appendChild(node);
                });
            } else {
                segment.forEach(node => {
                    li.appendChild(node);
                });
            }

            this.removeBrFromListItem(li);

            if (italicizeListItem) {
                li.style.fontStyle = 'italic';
                const originalHTML = li.innerHTML.trim();
                if (!/^<em[\s>]/i.test(originalHTML) || !/<\/em>\s*$/i.test(originalHTML)) {
                    li.innerHTML = `<em>${originalHTML}</em>`;
                }
            } else {
                li.style.fontStyle = '';
                if (li.getAttribute('style') && li.getAttribute('style').trim() === '') {
                    li.removeAttribute('style');
                }
            }

            listNode.appendChild(li);
            currentNumber += 1;
        });

        return currentNumber;
    },

    /**
     * Remove all <br> tags inside a list element while preserving spacing where needed
     * @param {HTMLElement} listElement - List element (<ul> or <ol>)
     */
    removeBrFromList(listElement) {
        if (!listElement) return;
        const brTags = Array.from(listElement.querySelectorAll('br'));
        brTags.forEach(br => {
            const parent = br.parentNode;
            if (!parent) {
                br.remove();
                return;
            }

            const prevSibling = br.previousSibling;
            const nextSibling = br.nextSibling;
            const hasText = (node) => {
                if (!node) return false;
                if (node.nodeType === 3) {
                    return node.textContent && node.textContent.trim() !== '';
                }
                if (node.nodeType === 1) {
                    return node.textContent && node.textContent.trim() !== '';
                }
                return false;
            };

            if (hasText(prevSibling) && hasText(nextSibling)) {
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
    },

    /**
     * Remove trailing <br> nodes immediately following the list
     * @param {HTMLElement} listNode - List element
     */
    removeTrailingBrNodes(listNode) {
        if (!listNode || !listNode.parentNode) return;
        let next = listNode.nextSibling;
        while (next) {
            const nodeToCheck = next;
            next = next.nextSibling;
            if (nodeToCheck.nodeType === 3) {
                if (!nodeToCheck.textContent || !nodeToCheck.textContent.trim()) {
                    nodeToCheck.remove();
                    continue;
                }
                break;
            }
            if (nodeToCheck.nodeType === 1) {
                const tag = nodeToCheck.tagName.toLowerCase();
                if (tag === 'br') {
                    nodeToCheck.remove();
                    continue;
                }
            }
            break;
        }
    },

    /**
     * Convert trailing nodes after the list into numbered paragraphs (Sources formatting)
     * @param {HTMLElement} listNode - Original list element
     * @param {number} currentNumber - Current source count (from list items)
     * @returns {number} - Updated source count after processing trailing nodes
     */
    processTrailingSourceNodes(listNode, currentNumber = 0) {
        if (!listNode || !listNode.parentNode) return currentNumber;
        const parent = listNode.parentNode;
        const nodesToProcess = [];

        let sibling = listNode.nextSibling;
        while (sibling) {
            const next = sibling.nextSibling;
            if (sibling.nodeType === 1) {
                const tag = sibling.tagName.toLowerCase();
                if (tag === 'p' || tag.match(/^h[1-6]$/) || tag === 'ul' || tag === 'ol' || tag === 'div') {
                    break;
                }
            }
            nodesToProcess.push(sibling);
            sibling = next;
        }

        const flushSegment = (segment) => {
            if (!segment || segment.length === 0) return currentNumber;
            const hasContent = segment.some(node => {
                if (node.nodeType === 3) {
                    return node.textContent && node.textContent.trim() !== '';
                }
                if (node.nodeType === 1) {
                    const text = HtmlParser.getTextContent(node.innerHTML || node.textContent || '').trim();
                    return text !== '';
                }
                return false;
            });

            if (!hasContent) {
                segment.forEach(node => node.remove());
                return currentNumber;
            }

            const referenceNode = segment[0];
            const paragraph = document.createElement('p');
            const em = document.createElement('em');
            const numberingText = `${currentNumber + 1}. `;

            em.appendChild(document.createTextNode(numberingText));
            paragraph.appendChild(em);
            parent.insertBefore(paragraph, referenceNode);

            segment.forEach(node => {
                em.appendChild(node);
            });

            return currentNumber + 1;
        };

        let segmentNodes = [];
        nodesToProcess.forEach(node => {
            if (node.nodeType === 1 && node.tagName.toLowerCase() === 'br') {
                node.remove();
                currentNumber = flushSegment(segmentNodes);
                segmentNodes = [];
            } else {
                segmentNodes.push(node);
            }
        });

        currentNumber = flushSegment(segmentNodes);
        return currentNumber;
    },

    /**
     * Remove extra spacing (all spacers we added)
     * This removes:
     * - Spacers before headers (<p></p> before headers)
     * - Spacer after Key Takeaways list
     * - Spacer before "Read also:"
     * @param {string} html - HTML string
     * @returns {string} - HTML with all added spacers removed
     */
    removeExtraSpacing(html) {
        const tempDiv = HtmlParser.parseHTML(html);
        
        // Remove all empty paragraph spacers (<p></p> or <p> </p> or <p>&nbsp;</p>)
        const emptyParagraphs = tempDiv.querySelectorAll('p');
        emptyParagraphs.forEach(p => {
            const text = p.textContent || p.innerText || '';
            const innerHTML = p.innerHTML.trim();
            // If paragraph is empty, only whitespace, or only &nbsp;, remove it
            // This will remove spacers we added before "Read also" and after Key Takeaways
            if (text.trim() === '' || innerHTML === '' || innerHTML === '&nbsp;' || innerHTML === '<br>') {
                p.remove();
            }
        });
        
        return tempDiv.innerHTML;
    }
};

