/**
 * Key Takeaways Processor
 * Formats Key Takeaways section to Shopify SOP format
 */

const KeyTakeawaysProcessor = {
    /**
     * Process Key Takeaways section
     * @param {Object} section - Section object from SectionDetector
     * @param {Object} options - Processing options
     * @returns {string} - Processed HTML
     */
    process(section, options = {}) {
        if (!section || !section.content) {
            return '';
        }

        const tempDiv = HtmlParser.parseHTML(section.content);
        
        // Find the heading
        const heading = tempDiv.querySelector('h1, h2, h3, h4, h5, h6');
        if (!heading) return '';

        // Process heading: remove italic, and if only "Key Takeaways" add ':'
        let headingText = this.processHeadingText(heading);
        const formattedHeading = `<h2><strong>${headingText}</strong></h2>`;

        // Find the list (ul or ol)
        const list = tempDiv.querySelector('ul, ol');
        if (!list) return formattedHeading;

        // Remove H1 header under the list (after the list)
        // This handles H1 headers that appear after the key takeaways list
        const allElements = Array.from(tempDiv.children);
        const listIndex = allElements.indexOf(list);
        
        // Find and remove H1 headers that come after the list
        for (let i = listIndex + 1; i < allElements.length; i++) {
            const element = allElements[i];
            if (element.tagName && element.tagName.toLowerCase() === 'h1') {
                element.remove();
            }
        }

        // Process list items
        const listItems = list.querySelectorAll('li');
        const processedItems = [];
        
        listItems.forEach(li => {
            // Clean up the list item, remove italic
            let itemHTML = li.innerHTML;
            
            // Remove italic tags and clean up
            itemHTML = this.removeItalicFromListItem(itemHTML);
            itemHTML = this.cleanListItem(itemHTML);
            
            processedItems.push(`<li>${itemHTML}</li>`);
        });

        const formattedList = `<ul>${processedItems.join('')}</ul>`;

        return formattedHeading + formattedList;
    },

    /**
     * Process heading text: remove italic, and if only "Key Takeaways" add ':'
     * @param {HTMLElement} heading - Heading element
     * @returns {string} - Processed heading text
     */
    processHeadingText(heading) {
        // Clone the heading to avoid modifying the original
        const headingClone = heading.cloneNode(true);
        
        // Remove all italic tags from the cloned heading
        const italicTags = headingClone.querySelectorAll('em, i');
        italicTags.forEach(tag => {
            const parent = tag.parentNode;
            while (tag.firstChild) {
                parent.insertBefore(tag.firstChild, tag);
            }
            parent.removeChild(tag);
        });
        
        // Get the processed HTML
        let headingText = headingClone.innerHTML;
        
        // Get plain text to check if it's only "Key Takeaways"
        const plainText = headingClone.textContent.trim();
        
        // If it's exactly "Key Takeaways" (case insensitive), add ':'
        if (plainText.toLowerCase() === 'key takeaways') {
            // Add ':' after the text content, preserving HTML structure
            // If there's a <strong> tag, add ':' before the closing </strong>
            if (headingText.includes('<strong>')) {
                headingText = headingText.replace(/(<\/strong>)/, ':$1');
            } else {
                // If no <strong>, add ':' at the end
                headingText = headingText + ':';
            }
        }
        
        return headingText;
    },

    /**
     * Remove italic tags from list item HTML
     * @param {string} html - List item HTML
     * @returns {string} - HTML without italic tags
     */
    removeItalicFromListItem(html) {
        // Remove italic tags (<em>, <i>)
        let cleaned = html.replace(/<\/?em>/gi, '');
        cleaned = cleaned.replace(/<\/?i>/gi, '');
        
        return cleaned;
    },

    /**
     * Check if an element comes after another element in the DOM
     * @param {HTMLElement} element - Element to check
     * @param {HTMLElement} referenceElement - Reference element
     * @returns {boolean} - True if element comes after referenceElement
     */
    isAfterElement(element, referenceElement) {
        // Check if element is a sibling that comes after referenceElement
        let current = referenceElement.nextSibling;
        
        while (current) {
            if (current === element) {
                return true;
            }
            // If we hit another block element, check if element is within it
            if (current.nodeType === 1) { // Element node
                if (current.contains(element)) {
                    return true;
                }
            }
            current = current.nextSibling;
        }
        
        // Also check if element is a descendant of a sibling that comes after
        let parent = referenceElement.parentElement;
        if (parent) {
            let currentSibling = referenceElement.nextElementSibling;
            while (currentSibling) {
                if (currentSibling.contains(element)) {
                    return true;
                }
                currentSibling = currentSibling.nextElementSibling;
            }
        }
        
        return false;
    },

    /**
     * Clean list item HTML
     * @param {string} html - List item HTML
     * @returns {string} - Cleaned HTML
     */
    cleanListItem(html) {
        const tempDiv = HtmlParser.parseHTML(html);
        
        // Remove <br> tags from list items (invalid HTML)
        const brTags = Array.from(tempDiv.querySelectorAll('br'));
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
        
        // Remove style attributes but preserve semantic tags
        const allElements = tempDiv.querySelectorAll('*');
        allElements.forEach(el => {
            el.removeAttribute('style');
            el.removeAttribute('class');
        });

        return tempDiv.innerHTML;
    }
};



