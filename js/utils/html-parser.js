/**
 * HTML Parser Utilities
 * Provides helper functions for parsing and manipulating HTML
 */

const HtmlParser = {
    /**
     * Creates a temporary DOM element to parse HTML
     * @param {string} html - HTML string to parse
     * @returns {DocumentFragment} - Parsed DOM fragment
     */
    parseHTML(html) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        return tempDiv;
    },

    /**
     * Removes all image elements from HTML
     * @param {string} html - HTML string
     * @returns {string} - HTML without images
     */
    removeImages(html) {
        const tempDiv = this.parseHTML(html);
        const images = tempDiv.querySelectorAll('img');
        images.forEach(img => img.remove());
        return tempDiv.innerHTML;
    },

    /**
     * Extracts text content from HTML
     * @param {string} html - HTML string
     * @returns {string} - Plain text content
     */
    getTextContent(html) {
        const tempDiv = this.parseHTML(html);
        return tempDiv.textContent || tempDiv.innerText || '';
    },

    /**
     * Checks if HTML contains specific text
     * @param {string} html - HTML string
     * @param {string} searchText - Text to search for
     * @returns {boolean} - True if text is found
     */
    containsText(html, searchText) {
        const text = this.getTextContent(html).toLowerCase();
        return text.includes(searchText.toLowerCase());
    },

    /**
     * Finds element by text content
     * @param {string} html - HTML string
     * @param {string} tagName - Tag name to search
     * @param {string} searchText - Text to search for
     * @returns {HTMLElement|null} - Found element or null
     */
    findElementByText(html, tagName, searchText) {
        const tempDiv = this.parseHTML(html);
        const elements = tempDiv.querySelectorAll(tagName);
        for (let element of elements) {
            if (this.getTextContent(element.innerHTML).toLowerCase().includes(searchText.toLowerCase())) {
                return element;
            }
        }
        return null;
    },

    /**
     * Gets all elements of a specific tag
     * @param {string} html - HTML string
     * @param {string} tagName - Tag name
     * @returns {NodeList} - List of elements
     */
    getElementsByTag(html, tagName) {
        const tempDiv = this.parseHTML(html);
        return tempDiv.querySelectorAll(tagName);
    }
};



