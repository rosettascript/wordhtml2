/**
 * Sources Processor
 * Converts sources list to numbered paragraph format
 */

const SourcesProcessor = {
    /**
     * Process Sources section
     * @param {Object} section - Section object from SectionDetector
     * @param {Object} options - Processing options
     * @returns {string} - Processed HTML
     */
    process(section, options = {}) {
        if (!section || !section.content) {
            return '';
        }

        const tempDiv = HtmlParser.parseHTML(section.content);
        
        // Find the "Sources:" paragraph
        const paragraphs = tempDiv.querySelectorAll('p');
        let sourcesParagraph = null;
        
        for (let p of paragraphs) {
            const text = HtmlParser.getTextContent(p.innerHTML).toLowerCase();
            if (text.includes('sources')) {
                sourcesParagraph = p;
                break;
            }
        }

        if (!sourcesParagraph) return '';

        // Find the following ul or ol
        const list = tempDiv.querySelector('ul, ol');
        if (!list) return '';

        // Check if list has any items
        const listItems = list.querySelectorAll('li');
        if (listItems.length === 0) return '';

        // Format paragraph: <p><em><strong>Sources:</strong></em></p>
        const formattedParagraph = '<p><em><strong>Sources:</strong></em></p>';

        // Convert list items to numbered paragraphs
        const processedItems = [];
        
        listItems.forEach((li, index) => {
            // Get text content, preserving emphasis
            let itemHTML = li.innerHTML;
            
            // Clean up but preserve <em> tags
            const itemTemp = HtmlParser.parseHTML(itemHTML);
            const allElements = itemTemp.querySelectorAll('*');
            allElements.forEach(el => {
                el.removeAttribute('style');
                el.removeAttribute('class');
            });
            
            itemHTML = itemTemp.innerHTML;
            
            // Format as numbered paragraph: <p><em>1. ...</em></p>
            const number = index + 1;
            processedItems.push(`<p><em>${number}. ${itemHTML}</em></p>`);
        });

        return formattedParagraph + processedItems.join('');
    }
};



