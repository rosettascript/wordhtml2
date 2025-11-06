/**
 * Read Also Processor
 * Formats Read Also section to Shopify SOP format
 */

const ReadAlsoProcessor = {
    /**
     * Process Read Also section
     * @param {Object} section - Section object from SectionDetector
     * @param {Object} options - Processing options
     * @returns {string} - Processed HTML
     */
    process(section, options = {}) {
        if (!section || !section.content) {
            return '';
        }

        const tempDiv = HtmlParser.parseHTML(section.content);
        
        // Find the "Read also:" paragraph
        const paragraphs = tempDiv.querySelectorAll('p');
        let readAlsoParagraph = null;
        
        for (let p of paragraphs) {
            const text = HtmlParser.getTextContent(p.innerHTML).toLowerCase();
            if (text.includes('read also')) {
                readAlsoParagraph = p;
                break;
            }
        }

        if (!readAlsoParagraph) return '';

        // Format paragraph: <p><strong>Read also:</strong></p>
        const formattedParagraph = '<p><strong>Read also:</strong></p>';

        // Find the following ul
        const list = tempDiv.querySelector('ul');
        if (!list) return formattedParagraph;

        // Process list items
        const listItems = list.querySelectorAll('li');
        const processedItems = [];
        
        listItems.forEach(li => {
            // Clean up list item, ensure links have proper attributes
            let itemHTML = li.innerHTML;
            
            // Ensure links have rel="noopener" and target="_blank"
            const linkTemp = HtmlParser.parseHTML(itemHTML);
            const links = linkTemp.querySelectorAll('a');
            links.forEach(link => {
                link.setAttribute('rel', 'noopener');
                link.setAttribute('target', '_blank');
            });
            
            itemHTML = linkTemp.innerHTML;
            processedItems.push(`<li>${itemHTML}</li>`);
        });

        const formattedList = `<ul>${processedItems.join('')}</ul>`;

        return formattedParagraph + formattedList;
    }
};



