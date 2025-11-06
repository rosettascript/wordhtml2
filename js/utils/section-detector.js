/**
 * Section Detector
 * Detects different sections in HTML (Key Takeaways, Body, Read Also, FAQ, Sources)
 */

const SectionDetector = {
    /**
     * Detect all sections in HTML
     * @param {string} html - HTML string
     * @returns {Object} - Object with detected sections
     */
    detectSections(html) {
        if (!html) {
            return {
                keyTakeaways: null,
                body: null,
                readAlso: null,
                faq: null,
                sources: null,
                fullHTML: html
            };
        }

        const tempDiv = HtmlParser.parseHTML(html);
        const sections = {
            keyTakeaways: this.detectKeyTakeaways(tempDiv),
            readAlso: this.detectReadAlso(tempDiv),
            faq: this.detectFAQ(tempDiv),
            sources: this.detectSources(tempDiv),
            fullHTML: html
        };

        // Extract body (everything else)
        sections.body = this.extractBody(tempDiv, sections);

        return sections;
    },

    /**
     * Detect Key Takeaways section
     * @param {HTMLElement} container - Container element
     * @returns {Object|null} - Section object or null
     */
    detectKeyTakeaways(container) {
        // Look for headings with "Key Takeaways" text - only find the FIRST one
        const allHeadings = container.querySelectorAll('h1, h2, h3, h4, h5, h6');
        let heading = null;
        
        for (let h of allHeadings) {
            const text = HtmlParser.getTextContent(h.innerHTML).toLowerCase();
            if (text.includes('key takeaways')) {
                heading = h;
                break; // Only get the first one
            }
        }
        
        if (!heading) return null;

        // Find the section content (usually a ul following the heading)
        let current = heading.nextElementSibling;
        const content = [];
        content.push(heading.outerHTML);

        // Collect content until we hit another section
        while (current) {
            const tagName = current.tagName ? current.tagName.toLowerCase() : '';
            const text = HtmlParser.getTextContent(current.innerHTML).toLowerCase();
            
            // Stop if we hit another "Key Takeaways" section (duplicate)
            if (tagName.match(/^h[1-6]$/) && text.includes('key takeaways')) {
                break;
            }
            
            // Stop if we hit another major section heading (h1, h2) that's a section boundary
            // This ensures we don't include content from other sections
            if (tagName.match(/^h[12]$/) && this.isSectionBoundary(text) && !text.includes('key takeaways')) {
                break;
            }
            
            // Stop if we hit "Read also" paragraph (this is a section boundary)
            if (tagName === 'p' && (text.includes('read also') || text.includes('read also:'))) {
                break;
            }

            content.push(current.outerHTML);
            current = current.nextElementSibling;
        }

        return {
            heading: heading.outerHTML,
            content: content.join(''),
            startElement: heading
        };
    },

    /**
     * Detect Read Also section
     * @param {HTMLElement} container - Container element
     * @returns {Object|null} - Section object or null
     */
    detectReadAlso(container) {
        // Look for "Read also:" text - only find the FIRST one
        const paragraphs = container.querySelectorAll('p');
        
        for (let p of paragraphs) {
            const text = HtmlParser.getTextContent(p.innerHTML).toLowerCase().trim();
            if (text.includes('read also') || text.includes('read also:')) {
                const content = [];
                content.push(p.outerHTML);
                
                // Get the following ul
                let current = p.nextElementSibling;
                while (current && current.tagName.toLowerCase() === 'ul') {
                    content.push(current.outerHTML);
                    current = current.nextElementSibling;
                }

                return {
                    heading: p.outerHTML,
                    content: content.join(''),
                    startElement: p
                };
            }
        }

        return null;
    },

    /**
     * Detect FAQ section
     * @param {HTMLElement} container - Container element
     * @returns {Object|null} - Section object or null
     */
    detectFAQ(container) {
        // Look for "Frequently Asked Questions" heading - only find the FIRST one
        const allHeadings = container.querySelectorAll('h1, h2, h3, h4, h5, h6');
        let heading = null;
        
        for (let h of allHeadings) {
            const text = HtmlParser.getTextContent(h.innerHTML).toLowerCase();
            if (text.includes('frequently asked questions')) {
                heading = h;
                break; // Only get the first one
            }
        }
        
        if (!heading) return null;

        const content = [];
        content.push(heading.outerHTML);
        
        // Collect FAQ items (h3 questions followed by p answers)
        let current = heading.nextElementSibling;
        while (current) {
            const tagName = current.tagName ? current.tagName.toLowerCase() : '';
            const text = HtmlParser.getTextContent(current.innerHTML).toLowerCase();
            
            // Stop if we hit another "Frequently Asked Questions" section (duplicate)
            if (tagName.match(/^h[12]$/) && text.includes('frequently asked questions')) {
                break;
            }
            
            // Stop if we hit another major section (but allow h3 for FAQ sub-headings)
            if (tagName.match(/^h[12]$/) && this.isSectionBoundary(text) && !text.includes('frequently asked questions')) {
                break;
            }

            content.push(current.outerHTML);
            current = current.nextElementSibling;
        }

        return {
            heading: heading.outerHTML,
            content: content.join(''),
            startElement: heading
        };
    },

    /**
     * Detect Sources section
     * @param {HTMLElement} container - Container element
     * @returns {Object|null} - Section object or null
     */
    detectSources(container) {
        // Look for "Sources:" text - only find the FIRST one
        const paragraphs = container.querySelectorAll('p');
        
        for (let p of paragraphs) {
            const text = HtmlParser.getTextContent(p.innerHTML).toLowerCase().trim();
            // Only match if it's exactly "sources:" or starts with "sources:"
            if (text === 'sources:' || text.startsWith('sources:')) {
                // Check if there's actually a list following it
                let current = p.nextElementSibling;
                let hasList = false;
                
                while (current && (current.tagName.toLowerCase() === 'ul' || current.tagName.toLowerCase() === 'ol')) {
                    // Check if list has items
                    const listItems = current.querySelectorAll('li');
                    if (listItems.length > 0) {
                        hasList = true;
                        break;
                    }
                    current = current.nextElementSibling;
                }
                
                // Only return if there's actually a list with content
                if (hasList) {
                    const content = [];
                    content.push(p.outerHTML);
                    
                    // Get following ul or ol with sources
                    current = p.nextElementSibling;
                    while (current && (current.tagName.toLowerCase() === 'ul' || current.tagName.toLowerCase() === 'ol')) {
                        const listItems = current.querySelectorAll('li');
                        if (listItems.length > 0) {
                            content.push(current.outerHTML);
                        }
                        current = current.nextElementSibling;
                    }

                    return {
                        heading: p.outerHTML,
                        content: content.join(''),
                        startElement: p,
                        listElement: p.nextElementSibling
                    };
                }
            }
        }

        return null;
    },

    /**
     * Extract body content (everything not in other sections)
     * @param {HTMLElement} container - Container element
     * @param {Object} sections - Detected sections
     * @returns {string} - Body HTML
     */
    extractBody(container, sections) {
        const bodyElements = [];
        const excludedElements = new Set();
        
        // Mark excluded elements from detected sections
        if (sections.keyTakeaways?.startElement) {
            this.markSectionElements(sections.keyTakeaways.startElement, excludedElements);
        }
        if (sections.readAlso?.startElement) {
            this.markSectionElements(sections.readAlso.startElement, excludedElements);
        }
        if (sections.faq?.startElement) {
            this.markSectionElements(sections.faq.startElement, excludedElements);
        }
        if (sections.sources?.startElement) {
            this.markSectionElements(sections.sources.startElement, excludedElements);
        }

        // Also mark duplicate sections (sections of the same type that weren't detected)
        // This ensures duplicates are excluded from body
        this.markDuplicateSections(container, sections, excludedElements);

        // Collect body elements in document order (iterate through direct children)
        let current = container.firstElementChild;
        while (current) {
            if (!excludedElements.has(current)) {
                // Check if it's nested in excluded section
                let isExcluded = false;
                let parent = current.parentElement;
                while (parent && parent !== container) {
                    if (excludedElements.has(parent)) {
                        isExcluded = true;
                        break;
                    }
                    parent = parent.parentElement;
                }
                
                if (!isExcluded) {
                    bodyElements.push(current.outerHTML);
                }
            }
            current = current.nextElementSibling;
        }

        // If no specific sections detected, return everything in order
        if (bodyElements.length === 0 && !sections.keyTakeaways && !sections.readAlso && !sections.faq && !sections.sources) {
            // Return all direct children in order
            const allElements = [];
            let child = container.firstElementChild;
            while (child) {
                allElements.push(child.outerHTML);
                child = child.nextElementSibling;
            }
            return allElements.join('');
        }

        // Return body content (even if empty, so it can be processed)
        const bodyHTML = bodyElements.join('');
        return bodyHTML || '';
    },

    /**
     * Mark duplicate sections (same type as detected sections) as excluded
     * @param {HTMLElement} container - Container element
     * @param {Object} sections - Detected sections
     * @param {Set} excludedSet - Set to add excluded elements to
     */
    markDuplicateSections(container, sections, excludedSet) {
        const allHeadings = container.querySelectorAll('h1, h2, h3, h4, h5, h6');
        let foundFirstKeyTakeaways = false;
        let foundFirstFAQ = false;
        
        for (let h of allHeadings) {
            const tagName = h.tagName ? h.tagName.toLowerCase() : '';
            const text = HtmlParser.getTextContent(h.innerHTML).toLowerCase();
            
            // Mark duplicate Key Takeaways sections
            if (text.includes('key takeaways')) {
                if (!foundFirstKeyTakeaways && sections.keyTakeaways?.startElement === h) {
                    foundFirstKeyTakeaways = true;
                    continue; // Skip the first one (already marked)
                } else if (foundFirstKeyTakeaways || sections.keyTakeaways) {
                    // This is a duplicate, mark it and its content
                    excludedSet.add(h);
                    this.markSectionElements(h, excludedSet);
                }
            }
            
            // Mark duplicate FAQ sections
            if (text.includes('frequently asked questions')) {
                if (!foundFirstFAQ && sections.faq?.startElement === h) {
                    foundFirstFAQ = true;
                    continue; // Skip the first one (already marked)
                } else if (foundFirstFAQ || sections.faq) {
                    // This is a duplicate, mark it and its content
                    excludedSet.add(h);
                    this.markSectionElements(h, excludedSet);
                }
            }
        }
    },

    /**
     * Mark all elements in a section as excluded
     * @param {HTMLElement} startElement - Starting element of section
     * @param {Set} excludedSet - Set to add excluded elements to
     */
    markSectionElements(startElement, excludedSet) {
        excludedSet.add(startElement);
        let current = startElement.nextElementSibling;
        const startElementText = HtmlParser.getTextContent(startElement.innerHTML || startElement.textContent || '').toLowerCase();
        
        while (current) {
            const tagName = current.tagName ? current.tagName.toLowerCase() : '';
            const text = HtmlParser.getTextContent(current.innerHTML).toLowerCase();
            
            // For Read Also (paragraph), stop at next section
            if (startElementText.includes('read also')) {
                // Stop at next major heading (h1, h2) that's a section boundary
                if (tagName.match(/^h[12]$/) && this.isSectionBoundary(text)) {
                    break;
                }
            }
            
            // Stop if we hit another major section heading
            // Check for section boundaries on headings
            if (tagName.match(/^h[1-6]$/) && this.isSectionBoundary(text)) {
                // Don't break if it's h3 (could be FAQ sub-heading)
                if (tagName !== 'h3') {
                    // Check if it's the same section type (duplicate)
                    const isSameSection = (
                        (text.includes('key takeaways') && startElementText.includes('key takeaways')) ||
                        (text.includes('frequently asked questions') && startElementText.includes('frequently asked questions'))
                    );
                    if (!isSameSection) {
                        break;
                    }
                }
            }
            
            // For Key Takeaways, also stop at "Read also" paragraph
            if (tagName === 'p' && startElementText.includes('key takeaways') && (text.includes('read also') || text.includes('read also:'))) {
                break;
            }
            
            excludedSet.add(current);
            current = current.nextElementSibling;
        }
    },

    /**
     * Check if text indicates a section boundary
     * @param {string} text - Text to check
     * @returns {boolean} - True if section boundary
     */
    isSectionBoundary(text) {
        const boundaries = [
            'read also',
            'frequently asked questions',
            'faq',
            'sources:',
            'sources',
            'key takeaways'
        ];
        
        return boundaries.some(boundary => text.includes(boundary));
    }
};

