/**
 * Toolbar Controller
 * Manages toolbar state and interactions
 */

const ToolbarController = {
    mode: 'regular',
    options: {
        sop: false,
        sopRemoveSpacing: false,
        sopRemoveDomain: false,
        sopDisableSources: true,
        shoppablesSop: false,
        shoppablesBrReadAlso: false,
        shoppablesBrSources: false,
        shoppablesDisableSources: false,
        shoppablesRemoveDomain: false
    },
    onChangeCallback: null,

    /**
     * Format transformation descriptions
     */
    formatTransformations: {
        shopify: [
            'Remove H1 tags and content',
            'Combine lists into single UL tags',
            'Convert Sources lists to numbered paragraphs (optional)',
            'Add rel="noopener" to all links',
            'Remove em tags',
            'Add spacing between sections'
        ],
        shoppables: [
            'Preserve existing H1 heading content',
            'Auto-format Sources section with italicized numbered entries',
            'Insert optional <br> before Read also / Sources sections',
            'Add rel="noopener" / target="_blank" and optionally remove link domains',
            'Clean up extra spacing without spacer paragraphs'
        ],
        regular: []
    },

    /**
     * Initialize toolbar controller
     * @param {Object} elements - DOM elements
     * @param {HTMLElement} elements.modeSelect - Mode select dropdown
     * @param {HTMLElement} elements.shopifyOptions - Shopify options container
     * @param {HTMLElement} elements.shoppablesOptions - Shoppables options container
     * @param {HTMLElement} elements.sop - SOP radio button
     * @param {HTMLElement} elements.sopRemoveSpacing - SOP Remove Spacing radio button
     * @param {HTMLElement} elements.sopRemoveDomain - SOP Remove Domain radio button
     * @param {HTMLElement} elements.sopDisableSources - SOP Disable Sources formatting checkbox
     * @param {HTMLElement} elements.sopSubOptions - SOP sub-options container
     * @param {HTMLElement} elements.shoppablesSop - Shoppables SOP checkbox
     * @param {HTMLElement} elements.shoppablesSopSubOptions - Shoppables SOP sub-options container
     * @param {HTMLElement} elements.shoppablesBrReadAlso - Shoppables <br> before Read also checkbox
     * @param {HTMLElement} elements.shoppablesBrSources - Shoppables <br> before Sources checkbox
     * @param {HTMLElement} elements.shoppablesDisableSources - Shoppables disable sources formatting checkbox
     * @param {HTMLElement} elements.shoppablesRemoveDomain - Shoppables remove domain from links checkbox
     * @param {Function} onChangeCallback - Callback when options change
     * @param {Object} initialOptions - Saved options to initialize with
     */
    init(elements, onChangeCallback, initialOptions = null) {
        if (!elements || !onChangeCallback) {
            console.error('ToolbarController: elements and onChangeCallback are required');
            return;
        }

        this.onChangeCallback = onChangeCallback;

        if (initialOptions && typeof initialOptions === 'object') {
            this.options = {
                ...this.options,
                ...initialOptions
            };
        }

        // Initialize mode from select element
        if (elements.modeSelect) {
            this.mode = elements.modeSelect.value || 'regular';
        }

        // Mode select handler
        if (elements.modeSelect) {
            elements.modeSelect.addEventListener('change', (e) => {
                this.mode = e.target.value;
                this.updateModeOptionVisibility();
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
                    // Reset shoppables options when leaving mode
                    this.resetShoppablesOptions(elements);
                } else if (this.mode === 'shoppables') {
                    this.options.shoppablesSop = true;
                    const shoppablesSopCheckbox = document.getElementById('shoppables-sop');
                    if (shoppablesSopCheckbox) {
                        shoppablesSopCheckbox.checked = true;
                        shoppablesSopCheckbox.disabled = true;
                    }
                    if (elements.shoppablesSopSubOptions) {
                        this.updateShoppablesSubOptionsVisibility(elements.shoppablesSopSubOptions);
                    }
                    // Reset Shopify options when leaving mode
                    this.resetShopifyOptions(elements);
                } else {
                    // If Regular is selected, uncheck and enable SOP
                    this.options.sop = false;
                    this.options.sopRemoveSpacing = false;
                    this.options.sopRemoveDomain = false;
                    this.options.sopDisableSources = false;
                    this.resetShoppablesOptions(elements);
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
                    const sopDisableSourcesCheckbox = document.getElementById('sop-disable-sources');
                    if (sopDisableSourcesCheckbox) {
                        sopDisableSourcesCheckbox.checked = false;
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

        // SOP Disable Sources checkbox handler
        if (elements.sopDisableSources) {
            elements.sopDisableSources.addEventListener('change', (e) => {
                this.options.sopDisableSources = e.target.checked;
                this.notifyChange();
            });
        }

        // Shoppables SOP handler
        if (elements.shoppablesSop) {
            elements.shoppablesSop.addEventListener('change', (e) => {
                if (e.target.disabled && !e.target.checked) {
                    e.target.checked = true;
                    return;
                }
                this.options.shoppablesSop = e.target.checked;
                this.updateShoppablesSubOptionsVisibility(elements.shoppablesSopSubOptions);
                this.notifyChange();
            });
        }

        // Shoppables sub-option handlers
        if (elements.shoppablesBrReadAlso) {
            elements.shoppablesBrReadAlso.addEventListener('change', (e) => {
                this.options.shoppablesBrReadAlso = e.target.checked;
                this.notifyChange();
            });
        }

        if (elements.shoppablesBrSources) {
            elements.shoppablesBrSources.addEventListener('change', (e) => {
                this.options.shoppablesBrSources = e.target.checked;
                this.notifyChange();
            });
        }

        if (elements.shoppablesDisableSources) {
            elements.shoppablesDisableSources.addEventListener('change', (e) => {
                this.options.shoppablesDisableSources = e.target.checked;
                this.notifyChange();
            });
        }

        if (elements.shoppablesRemoveDomain) {
            elements.shoppablesRemoveDomain.addEventListener('change', (e) => {
                this.options.shoppablesRemoveDomain = e.target.checked;
                this.notifyChange();
            });
        }

        // Initialize format info toggle
        this.initFormatInfoToggle();

        // Initial state
        this.updateModeOptionVisibility();
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
        } else if (this.mode === 'shoppables') {
            this.options.shoppablesSop = true;
            const shoppablesSopCheckbox = document.getElementById('shoppables-sop');
            if (shoppablesSopCheckbox) {
                shoppablesSopCheckbox.checked = true;
                shoppablesSopCheckbox.disabled = true;
            }
            if (elements.shoppablesSopSubOptions) {
                this.updateShoppablesSubOptionsVisibility(elements.shoppablesSopSubOptions);
            }
        }
        
        if (elements.sopSubOptions) {
            this.updateSopSubOptionsVisibility(elements.sopSubOptions);
        }
        if (elements.shoppablesSopSubOptions) {
            this.updateShoppablesSubOptionsVisibility(elements.shoppablesSopSubOptions);
        }
    },

    /**
     * Update Shopify/Shoppables options visibility
     */
    updateModeOptionVisibility() {
        const shopifyOptions = document.getElementById('shopify-options');
        const shoppablesOptions = document.getElementById('shoppables-options');

        if (shopifyOptions) {
            shopifyOptions.style.display = this.mode === 'shopify' ? 'block' : 'none';
        }
        if (shoppablesOptions) {
            shoppablesOptions.style.display = this.mode === 'shoppables' ? 'block' : 'none';
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
            
            // Add collapsed class FIRST, before showing
            formatInfo.classList.add('collapsed');
            const toggle = formatInfo.querySelector('.format-info-toggle');
            if (toggle) {
                toggle.setAttribute('aria-expanded', 'false');
            }
            
            // Show format info with animation
            formatInfo.style.display = 'block';
            // Use setTimeout to trigger animation
            setTimeout(() => {
                formatInfo.classList.add('show');
            }, 10);
        } else {
            // Hide format info immediately without animation
            formatInfo.classList.remove('show');
            formatInfo.classList.remove('collapsed');
            formatInfo.style.display = 'none';
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
                const sopRemoveSpacingCheckbox = document.getElementById('sop-remove-spacing');
                if (sopRemoveSpacingCheckbox) {
                    sopRemoveSpacingCheckbox.checked = this.options.sopRemoveSpacing;
                }
                const sopRemoveDomainCheckbox = document.getElementById('sop-remove-domain');
                if (sopRemoveDomainCheckbox) {
                    sopRemoveDomainCheckbox.checked = this.options.sopRemoveDomain;
                }
                const sopDisableSourcesCheckbox = document.getElementById('sop-disable-sources');
                if (sopDisableSourcesCheckbox) {
                    sopDisableSourcesCheckbox.checked = this.options.sopDisableSources;
                }
            } else {
                sopSubOptions.style.display = 'none';
                // Uncheck sub-options when SOP is unchecked
                this.options.sopRemoveSpacing = false;
                this.options.sopRemoveDomain = false;
                this.options.sopDisableSources = false;
                const sopRemoveSpacingCheckbox = document.getElementById('sop-remove-spacing');
                if (sopRemoveSpacingCheckbox) {
                    sopRemoveSpacingCheckbox.checked = false;
                }
                const sopRemoveDomainCheckbox = document.getElementById('sop-remove-domain');
                if (sopRemoveDomainCheckbox) {
                    sopRemoveDomainCheckbox.checked = false;
                }
                const sopDisableSourcesCheckbox = document.getElementById('sop-disable-sources');
                if (sopDisableSourcesCheckbox) {
                    sopDisableSourcesCheckbox.checked = false;
                }
            }
        }
    },

    /**
     * Update Shoppables SOP sub-options visibility
     * @param {HTMLElement} shoppablesSopSubOptions - Shoppables SOP sub-options container
     */
    updateShoppablesSubOptionsVisibility(shoppablesSopSubOptions) {
        if (shoppablesSopSubOptions) {
            if (this.options.shoppablesSop) {
                shoppablesSopSubOptions.style.display = 'block';
                const brReadAlsoCheckbox = document.getElementById('shoppables-br-read-also');
                if (brReadAlsoCheckbox) {
                    brReadAlsoCheckbox.checked = this.options.shoppablesBrReadAlso;
                }
                const brSourcesCheckbox = document.getElementById('shoppables-br-sources');
                if (brSourcesCheckbox) {
                    brSourcesCheckbox.checked = this.options.shoppablesBrSources;
                }
                const disableSourcesCheckbox = document.getElementById('shoppables-disable-sources');
                if (disableSourcesCheckbox) {
                    disableSourcesCheckbox.checked = this.options.shoppablesDisableSources;
                }
                const removeDomainCheckbox = document.getElementById('shoppables-remove-domain');
                if (removeDomainCheckbox) {
                    removeDomainCheckbox.checked = this.options.shoppablesRemoveDomain;
                }
            } else {
                shoppablesSopSubOptions.style.display = 'none';
                this.options.shoppablesBrReadAlso = false;
                this.options.shoppablesBrSources = false;
                this.options.shoppablesDisableSources = false;
                this.options.shoppablesRemoveDomain = false;
                const brReadAlsoCheckbox = document.getElementById('shoppables-br-read-also');
                if (brReadAlsoCheckbox) {
                    brReadAlsoCheckbox.checked = false;
                }
                const brSourcesCheckbox = document.getElementById('shoppables-br-sources');
                if (brSourcesCheckbox) {
                    brSourcesCheckbox.checked = false;
                }
                const disableSourcesCheckbox = document.getElementById('shoppables-disable-sources');
                if (disableSourcesCheckbox) {
                    disableSourcesCheckbox.checked = false;
                }
                const removeDomainCheckbox = document.getElementById('shoppables-remove-domain');
                if (removeDomainCheckbox) {
                    removeDomainCheckbox.checked = false;
                }
            }
        }
    },

    /**
     * Reset Shopify-specific options when switching modes
     * @param {Object} elements - DOM elements
     */
    resetShopifyOptions(elements) {
        this.options.sop = false;
        this.options.sopRemoveSpacing = false;
        this.options.sopRemoveDomain = false;
        this.options.sopDisableSources = false;
        if (elements.sopSubOptions) {
            this.updateSopSubOptionsVisibility(elements.sopSubOptions);
        }
        const sopCheckbox = document.getElementById('sop');
        if (sopCheckbox) {
            sopCheckbox.checked = false;
            sopCheckbox.disabled = false;
        }
    },

    /**
     * Reset Shoppables-specific options when switching modes
     * @param {Object} elements - DOM elements
     */
    resetShoppablesOptions(elements) {
        this.options.shoppablesSop = false;
        this.options.shoppablesBrReadAlso = false;
        this.options.shoppablesBrSources = false;
        this.options.shoppablesDisableSources = false;
        this.options.shoppablesRemoveDomain = false;
        if (elements.shoppablesSopSubOptions) {
            this.updateShoppablesSubOptionsVisibility(elements.shoppablesSopSubOptions);
        }
        const shoppablesSopCheckbox = document.getElementById('shoppables-sop');
        if (shoppablesSopCheckbox) {
            shoppablesSopCheckbox.checked = false;
            shoppablesSopCheckbox.disabled = false;
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



