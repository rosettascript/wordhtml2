/**
 * Toolbar Controller
 * Manages toolbar state and interactions
 */

const ToolbarController = {
    mode: 'regular',
    options: {
        sop: false,
        sopRemoveSpacing: false
    },
    onChangeCallback: null,

    /**
     * Initialize toolbar controller
     * @param {Object} elements - DOM elements
     * @param {HTMLElement} elements.modeSelect - Mode select dropdown
     * @param {HTMLElement} elements.shopifyOptions - Shopify options container
     * @param {HTMLElement} elements.sop - SOP radio button
     * @param {HTMLElement} elements.sopRemoveSpacing - SOP Remove Spacing radio button
     * @param {HTMLElement} elements.sopSubOptions - SOP sub-options container
     * @param {Function} onChangeCallback - Callback when options change
     */
    init(elements, onChangeCallback) {
        if (!elements || !onChangeCallback) {
            console.error('ToolbarController: elements and onChangeCallback are required');
            return;
        }

        this.onChangeCallback = onChangeCallback;

        // Mode select handler
        if (elements.modeSelect) {
            elements.modeSelect.addEventListener('change', (e) => {
                this.mode = e.target.value;
                this.updateShopifyOptionsVisibility();
                
                // If Shopify Blogs is selected, automatically check and lock SOP
                if (this.mode === 'shopify') {
                    this.options.sop = true;
                    const sopCheckbox = document.getElementById('sop');
                    if (sopCheckbox) {
                        sopCheckbox.checked = true;
                        sopCheckbox.disabled = true;
                    }
                    // Show SOP sub-options
                    if (elements.sopSubOptions) {
                        this.updateSopSubOptionsVisibility(elements.sopSubOptions);
                    }
                } else {
                    // If Regular is selected, uncheck and enable SOP
                    this.options.sop = false;
                    this.options.sopRemoveSpacing = false;
                    const sopCheckbox = document.getElementById('sop');
                    if (sopCheckbox) {
                        sopCheckbox.checked = false;
                        sopCheckbox.disabled = false;
                    }
                    const sopRemoveSpacingCheckbox = document.getElementById('sop-remove-spacing');
                    if (sopRemoveSpacingCheckbox) {
                        sopRemoveSpacingCheckbox.checked = false;
                    }
                    if (elements.sopSubOptions) {
                        this.updateSopSubOptionsVisibility(elements.sopSubOptions);
                    }
                }
                
                this.notifyChange();
            });
        }

        // SOP checkbox handler (only if not disabled)
        if (elements.sop) {
            elements.sop.addEventListener('change', (e) => {
                // Don't allow unchecking if disabled (Shopify Blogs mode)
                if (e.target.disabled && !e.target.checked) {
                    e.target.checked = true;
                    return;
                }
                this.options.sop = e.target.checked;
                this.updateSopSubOptionsVisibility(elements.sopSubOptions);
                this.notifyChange();
            });
        }

        // SOP Remove Spacing checkbox handler
        if (elements.sopRemoveSpacing) {
            elements.sopRemoveSpacing.addEventListener('change', (e) => {
                this.options.sopRemoveSpacing = e.target.checked;
                this.notifyChange();
            });
        }

        // Initial state
        this.updateShopifyOptionsVisibility();
        
        // If Shopify Blogs is initially selected, auto-check SOP
        if (this.mode === 'shopify') {
            this.options.sop = true;
            const sopCheckbox = document.getElementById('sop');
            if (sopCheckbox) {
                sopCheckbox.checked = true;
                sopCheckbox.disabled = true;
            }
            if (elements.sopSubOptions) {
                this.updateSopSubOptionsVisibility(elements.sopSubOptions);
            }
        }
        
        if (elements.sopSubOptions) {
            this.updateSopSubOptionsVisibility(elements.sopSubOptions);
        }
    },

    /**
     * Update Shopify options visibility
     */
    updateShopifyOptionsVisibility() {
        const shopifyOptions = document.getElementById('shopify-options');
        if (shopifyOptions) {
            if (this.mode === 'shopify') {
                shopifyOptions.style.display = 'block';
            } else {
                shopifyOptions.style.display = 'none';
            }
        }
    },

    /**
     * Update SOP sub-options visibility
     * @param {HTMLElement} sopSubOptions - SOP sub-options container
     */
    updateSopSubOptionsVisibility(sopSubOptions) {
        if (sopSubOptions) {
            if (this.options.sop) {
                sopSubOptions.style.display = 'block';
            } else {
                sopSubOptions.style.display = 'none';
                // Uncheck sub-option when SOP is unchecked
                this.options.sopRemoveSpacing = false;
                const sopRemoveSpacingCheckbox = document.getElementById('sop-remove-spacing');
                if (sopRemoveSpacingCheckbox) {
                    sopRemoveSpacingCheckbox.checked = false;
                }
            }
        }
    },

    /**
     * Notify change callback
     */
    notifyChange() {
        if (this.onChangeCallback) {
            this.onChangeCallback({
                mode: this.mode,
                options: { ...this.options }
            });
        }
    },

    /**
     * Get current mode
     * @returns {string} - Current mode ('regular' or 'shopify')
     */
    getMode() {
        return this.mode;
    },

    /**
     * Get current options
     * @returns {Object} - Current options
     */
    getOptions() {
        return { ...this.options };
    }
};



