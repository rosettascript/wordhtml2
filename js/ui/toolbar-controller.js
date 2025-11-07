/**
 * Toolbar Controller
 * Manages toolbar state and interactions
 */

const ToolbarController = {
    mode: 'regular',
    options: {
        sop: false,
        sopRemoveSpacing: false,
        sopRemoveDomain: false
    },
    onChangeCallback: null,

    /**
     * Format transformation descriptions
     */
    formatTransformations: {
        shopify: [
            'Remove H1 tags and content',
            'Combine lists into single UL tags',
            'Convert Sources lists to numbered paragraphs',
            'Add rel="noopener" to all links',
            'Remove em tags',
            'Add spacing between sections'
        ],
        regular: []
    },

    /**
     * Initialize toolbar controller
     * @param {Object} elements - DOM elements
     * @param {HTMLElement} elements.modeSelect - Mode select dropdown
     * @param {HTMLElement} elements.shopifyOptions - Shopify options container
     * @param {HTMLElement} elements.sop - SOP radio button
     * @param {HTMLElement} elements.sopRemoveSpacing - SOP Remove Spacing radio button
     * @param {HTMLElement} elements.sopRemoveDomain - SOP Remove Domain radio button
     * @param {HTMLElement} elements.sopSubOptions - SOP sub-options container
     * @param {Function} onChangeCallback - Callback when options change
     */
    init(elements, onChangeCallback) {
        if (!elements || !onChangeCallback) {
            console.error('ToolbarController: elements and onChangeCallback are required');
            return;
        }

        this.onChangeCallback = onChangeCallback;

        // Initialize mode from select element
        if (elements.modeSelect) {
            this.mode = elements.modeSelect.value || 'regular';
        }

        // Mode select handler
        if (elements.modeSelect) {
            elements.modeSelect.addEventListener('change', (e) => {
                this.mode = e.target.value;
                this.updateShopifyOptionsVisibility();
                this.updateFormatInfo();
                
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
                    this.options.sopRemoveDomain = false;
                    const sopCheckbox = document.getElementById('sop');
                    if (sopCheckbox) {
                        sopCheckbox.checked = false;
                        sopCheckbox.disabled = false;
                    }
                    const sopRemoveSpacingCheckbox = document.getElementById('sop-remove-spacing');
                    if (sopRemoveSpacingCheckbox) {
                        sopRemoveSpacingCheckbox.checked = false;
                    }
                    const sopRemoveDomainCheckbox = document.getElementById('sop-remove-domain');
                    if (sopRemoveDomainCheckbox) {
                        sopRemoveDomainCheckbox.checked = false;
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

        // SOP Remove Domain checkbox handler
        if (elements.sopRemoveDomain) {
            elements.sopRemoveDomain.addEventListener('change', (e) => {
                this.options.sopRemoveDomain = e.target.checked;
                this.notifyChange();
            });
        }

        // Initialize format info toggle
        this.initFormatInfoToggle();

        // Initial state
        this.updateShopifyOptionsVisibility();
        this.updateFormatInfo();
        
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
     * Initialize format info toggle functionality
     */
    initFormatInfoToggle() {
        // Use a small delay to ensure DOM is ready
        setTimeout(() => {
            const formatInfo = document.getElementById('format-info');
            if (!formatInfo) return;
            
            const formatInfoHeader = formatInfo.querySelector('.format-info-header');
            const formatInfoToggle = formatInfo.querySelector('.format-info-toggle');
            
            if (!formatInfoHeader || !formatInfoToggle) return;

            // Toggle on header click
            formatInfoHeader.addEventListener('click', () => {
                formatInfo.classList.toggle('collapsed');
                const isCollapsed = formatInfo.classList.contains('collapsed');
                formatInfoToggle.setAttribute('aria-expanded', !isCollapsed);
            });

            // Also toggle on button click (to prevent double-trigger)
            formatInfoToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                formatInfo.classList.toggle('collapsed');
                const isCollapsed = formatInfo.classList.contains('collapsed');
                formatInfoToggle.setAttribute('aria-expanded', !isCollapsed);
            });
        }, 100);
    },

    /**
     * Update format info display
     */
    updateFormatInfo() {
        const formatInfo = document.getElementById('format-info');
        const formatInfoList = document.getElementById('format-info-list');
        
        if (!formatInfo || !formatInfoList) return;

        const transformations = this.formatTransformations[this.mode] || [];
        
        if (transformations.length > 0) {
            // Clear existing items
            formatInfoList.innerHTML = '';
            
            // Add transformation items
            transformations.forEach(transformation => {
                const li = document.createElement('li');
                li.textContent = transformation;
                formatInfoList.appendChild(li);
            });
            
            // Show format info with animation
            formatInfo.style.display = 'block';
            // Use setTimeout to trigger animation
            setTimeout(() => {
                formatInfo.classList.add('show');
                // Reset collapsed state when showing
                formatInfo.classList.remove('collapsed');
                const toggle = formatInfo.querySelector('.format-info-toggle');
                if (toggle) {
                    toggle.setAttribute('aria-expanded', 'true');
                }
            }, 10);
        } else {
            // Hide format info with animation
            formatInfo.classList.remove('show');
            setTimeout(() => {
                formatInfo.style.display = 'none';
            }, 300);
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
                // Uncheck sub-options when SOP is unchecked
                this.options.sopRemoveSpacing = false;
                this.options.sopRemoveDomain = false;
                const sopRemoveSpacingCheckbox = document.getElementById('sop-remove-spacing');
                if (sopRemoveSpacingCheckbox) {
                    sopRemoveSpacingCheckbox.checked = false;
                }
                const sopRemoveDomainCheckbox = document.getElementById('sop-remove-domain');
                if (sopRemoveDomainCheckbox) {
                    sopRemoveDomainCheckbox.checked = false;
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



