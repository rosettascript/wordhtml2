/**
 * FAQ Processor
 * Formats FAQ section to Shopify SOP format
 */

const FAQProcessor = {
    /**
     * Process FAQ section
     * @param {Object} section - Section object from SectionDetector
     * @param {Object} options - Processing options
     * @param {boolean} options.sopRemoveSpacing - Remove spacing when SOP is enabled
     * @returns {string} - Processed HTML
     */
    process(section, options = {}) {
        if (!section || !section.content) {
            return '';
        }

        const tempDiv = HtmlParser.parseHTML(section.content);
        
        // Find the main FAQ heading (h2)
        const mainHeading = tempDiv.querySelector('h2');
        if (!mainHeading) return '';

        // Process main heading
        const headingHTML = mainHeading.outerHTML;
        const processedSections = [headingHTML];

        // Process FAQ items (h3 questions followed by p answers)
        let current = mainHeading.nextElementSibling;
        
        while (current && current !== tempDiv) {
            const tagName = current.tagName.toLowerCase();
            
            if (tagName === 'h3') {
                // Process question
                const questionHTML = current.outerHTML;
                processedSections.push(questionHTML);
            } else if (tagName === 'p') {
                // Process answer
                const answerHTML = current.outerHTML;
                
                // Remove spacing if option is enabled
                if (options.sopRemoveSpacing) {
                    const text = HtmlParser.getTextContent(answerHTML).trim();
                    if (text) {
                        processedSections.push(answerHTML);
                    }
                } else {
                    // Add spacing paragraph if needed
                    const nextSibling = current.nextElementSibling;
                    if (nextSibling && nextSibling.tagName.toLowerCase() === 'h3') {
                        processedSections.push(answerHTML);
                        processedSections.push('<p> </p>');
                    } else {
                        processedSections.push(answerHTML);
                    }
                }
            }
            
            current = current.nextElementSibling;
        }

        return processedSections.join('');
    }
};



