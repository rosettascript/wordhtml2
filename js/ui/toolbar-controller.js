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
        sopStyleSourcesLi: true,
        sopAddBrBeforeSources: false,
        shoppablesSop: false,
        shoppablesBrReadAlso: false,
        shoppablesBrSources: false,
        shoppablesDisableSources: false,
        shoppablesStyleSourcesLi: true,
        shoppablesRemoveDomain: false
    },
    onChangeCallback: null,

    /**
     * Format transformation descriptions
     */
    formatTransformations: {
        shopify: [
            'Keep layout spacing consistent—no manual tweaks needed',
            'Open external links in new tabs with rel="noopener"',
            'Render superscripts correctly for prices and footnotes',
            'Toggle between markdown, HTML, or plain-text sources',
            'Convert Word markup into clean semantic HTML',
            'Format key takeaways with Shopify-friendly styling',
            'Optionally strip domains from links for relative paths',
            'Remove extra spaces before exclamation marks',
            'Merge multiline lists into a single UL or OL wrapper',
            'Normalize headings for Shopify accessibility guidelines',
            'Apply rel="nofollow" to outbound links when configured',
            'Preserve media embeds with Shopify-compatible markup',
            'Validate inline styles against Shopify rich-text allowances',
            'Generate preview snippets for theme editor testing'
        ],
        shoppables: [
            'Eliminate stray spacing for a tidy shoppable layout',
            'Convert Word content into semantic HTML without editor bloat',
            'Preserve shoppable modules, pricing blocks, and CTA elements',
            'Auto-detect product links and flag missing or invalid URLs',
            'Toggle between absolute and relative paths for product links',
            'Normalize list styling to match storefront components',
            'Preserve structured data fields like SKU and availability'
        ],
        regular: [
            'Remove stray spacing for a clean, readable layout',
            'Convert Word content into semantic HTML without leftover clutter',
            'Normalize headings and paragraphs to support accessibility best practices',
            'Preserve inline formatting such as bold, italics, and superscripts',
            'Streamline lists, quotes, and tables into consistent HTML structures',
            'Flag broken or missing links before exporting the output',
            'Strip inline styles that conflict with default site typography',
            'Preserve basic media embeds with lightweight, standards-based markup',
            'Provide quick source toggles for HTML, markdown, or plain-text views'
        ]
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
     * @param {HTMLElement} elements.sopStyleSourcesLi - SOP italicize sources checkbox
     * @param {HTMLElement} elements.sopAddBrBeforeSources - SOP Add <br> before Sources checkbox
     * @param {HTMLElement} elements.sopSubOptions - SOP sub-options container
     * @param {HTMLElement} elements.shoppablesSop - Shoppables SOP checkbox
     * @param {HTMLElement} elements.shoppablesSopSubOptions - Shoppables SOP sub-options container
     * @param {HTMLElement} elements.shoppablesBrReadAlso - Shoppables <br> before Read also checkbox
     * @param {HTMLElement} elements.shoppablesBrSources - Shoppables <br> before Sources checkbox
     * @param {HTMLElement} elements.shoppablesDisableSources - Shoppables disable sources formatting checkbox
     * @param {HTMLElement} elements.shoppablesStyleSourcesLi - Shoppables italicize sources checkbox
     * @param {HTMLElement} elements.shoppablesRemoveDomain - Shoppables remove domain from links checkbox
     * @param {Function} onChangeCallback - Callback when options change
     * @param {Object} initialOptions - Saved options to initialize with
     */
    init(elements, onChangeCallback, initialOptions = null) {
        if (!elements || !onChangeCallback) {
            console.error('ToolbarController: elements and onChangeCallback are required');
            return;
        }

        if (elements.sopAddBrBeforeSources) {
            elements.sopAddBrBeforeSources.addEventListener('change', (e) => {
                this.options.sopAddBrBeforeSources = e.target.checked;
                this.notifyChange();
            });
        }

        if (elements.sopStyleSourcesLi) {
            elements.sopStyleSourcesLi.addEventListener('change', (e) => {
                this.options.sopStyleSourcesLi = e.target.checked;
                this.notifyChange();
            });
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
                    this.options.sopRemoveSpacing = false;
                    this.options.sopRemoveDomain = false;
                    this.options.sopDisableSources = true;
                    this.options.sopAddBrBeforeSources = false;
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
                    this.options.sopStyleSourcesLi = false;
                    this.options.sopAddBrBeforeSources = false;
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
                    const sopStyleCheckbox = document.getElementById('sop-style-sources-li');
                    if (sopStyleCheckbox) {
                        sopStyleCheckbox.checked = false;
                        sopStyleCheckbox.disabled = true;
                    }
                    const sopAddBrCheckbox = document.getElementById('sop-add-br-before-sources');
                    if (sopAddBrCheckbox) {
                        sopAddBrCheckbox.checked = false;
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
                const checked = e.target.checked;
                this.options.sopDisableSources = checked;

                if (elements.sopStyleSourcesLi) {
                    elements.sopStyleSourcesLi.disabled = !checked;
                    if (!checked) {
                        elements.sopStyleSourcesLi.checked = false;
                        this.options.sopStyleSourcesLi = false;
                    } else {
                        elements.sopStyleSourcesLi.checked = this.options.sopStyleSourcesLi;
                    }
                }

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
                const checked = e.target.checked;
                this.options.shoppablesDisableSources = checked;

                if (elements.shoppablesStyleSourcesLi) {
                    elements.shoppablesStyleSourcesLi.disabled = !checked;
                    if (!checked) {
                        elements.shoppablesStyleSourcesLi.checked = false;
                        this.options.shoppablesStyleSourcesLi = false;
                    } else {
                        elements.shoppablesStyleSourcesLi.checked = this.options.shoppablesStyleSourcesLi;
                    }
                }

                this.notifyChange();
            });
        }

        if (elements.shoppablesStyleSourcesLi) {
            elements.shoppablesStyleSourcesLi.addEventListener('change', (e) => {
                this.options.shoppablesStyleSourcesLi = e.target.checked;
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
                const sopStyleCheckbox = document.getElementById('sop-style-sources-li');
                if (sopStyleCheckbox) {
                    sopStyleCheckbox.checked = this.options.sopDisableSources && this.options.sopStyleSourcesLi;
                    sopStyleCheckbox.disabled = !this.options.sopDisableSources;
                }
                const sopAddBrCheckbox = document.getElementById('sop-add-br-before-sources');
                if (sopAddBrCheckbox) {
                    sopAddBrCheckbox.checked = this.options.sopAddBrBeforeSources;
                }
            } else {
                sopSubOptions.style.display = 'none';
                // Uncheck sub-options when SOP is unchecked
                this.options.sopRemoveSpacing = false;
                this.options.sopRemoveDomain = false;
                this.options.sopDisableSources = false;
                this.options.sopStyleSourcesLi = false;
                this.options.sopAddBrBeforeSources = false;
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
                const sopStyleCheckbox = document.getElementById('sop-style-sources-li');
                if (sopStyleCheckbox) {
                    sopStyleCheckbox.checked = false;
                    sopStyleCheckbox.disabled = true;
                }
                const sopAddBrCheckbox = document.getElementById('sop-add-br-before-sources');
                if (sopAddBrCheckbox) {
                    sopAddBrCheckbox.checked = false;
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
                const styleSourcesCheckbox = document.getElementById('shoppables-style-sources-li');
                if (styleSourcesCheckbox) {
                    styleSourcesCheckbox.checked = this.options.shoppablesDisableSources && this.options.shoppablesStyleSourcesLi;
                    styleSourcesCheckbox.disabled = !this.options.shoppablesDisableSources;
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
                this.options.shoppablesStyleSourcesLi = false;
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
                const styleSourcesCheckbox = document.getElementById('shoppables-style-sources-li');
                if (styleSourcesCheckbox) {
                    styleSourcesCheckbox.checked = false;
                    styleSourcesCheckbox.disabled = true;
                }
                const removeDomainCheckbox = document.getElementById('shoppables-remove-domain');
                if (removeDomainCheckbox) {
                    removeDomainCheckbox.checked = false;
                }
                const shoppablesSopCheckbox = document.getElementById('shoppables-sop');
                if (shoppablesSopCheckbox) {
                    shoppablesSopCheckbox.checked = false;
                    shoppablesSopCheckbox.disabled = false;
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
        this.options.sopStyleSourcesLi = false;
        this.options.sopAddBrBeforeSources = false;
        if (elements.sopSubOptions) {
            this.updateSopSubOptionsVisibility(elements.sopSubOptions);
        }
        const sopCheckbox = document.getElementById('sop');
        if (sopCheckbox) {
            sopCheckbox.checked = false;
            sopCheckbox.disabled = false;
        }
        const sopStyleCheckbox = document.getElementById('sop-style-sources-li');
        if (sopStyleCheckbox) {
            sopStyleCheckbox.checked = false;
            sopStyleCheckbox.disabled = true;
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
        this.options.shoppablesStyleSourcesLi = false;
        this.options.shoppablesRemoveDomain = false;
        if (elements.shoppablesSopSubOptions) {
            this.updateShoppablesSubOptionsVisibility(elements.shoppablesSopSubOptions);
        }
        const shoppablesSopCheckbox = document.getElementById('shoppables-sop');
        if (shoppablesSopCheckbox) {
            shoppablesSopCheckbox.checked = false;
            shoppablesSopCheckbox.disabled = false;
        }
        const shoppablesStyleCheckbox = document.getElementById('shoppables-style-sources-li');
        if (shoppablesStyleCheckbox) {
            shoppablesStyleCheckbox.checked = false;
            shoppablesStyleCheckbox.disabled = true;
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



