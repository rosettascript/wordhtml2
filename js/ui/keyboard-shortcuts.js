/**
 * Keyboard Shortcuts Handler
 * Manages keyboard shortcuts for the application
 */

const KeyboardShortcuts = {
    /**
     * Initialize keyboard shortcuts
     * @param {Object} callbacks - Callback functions for each shortcut
     * @param {Function} callbacks.clearInput - Clear input callback
     * @param {Function} callbacks.downloadOutput - Download output callback
     * @param {Function} callbacks.copyOutput - Copy output callback
     */
    init(callbacks) {
        document.addEventListener('keydown', (e) => {
            // Check if user is typing in an input field or textarea
            const isInputFocused = e.target.tagName === 'INPUT' || 
                                  e.target.tagName === 'TEXTAREA' || 
                                  e.target.isContentEditable;
            
            // Get the modifier key (Ctrl on Windows/Linux, Cmd on Mac)
            const modifier = e.ctrlKey || e.metaKey;
            
            // Only handle shortcuts if modifier is pressed
            if (!modifier) return;
            
            // Handle shortcuts
            switch (e.key.toLowerCase()) {
                case 'k':
                    // Ctrl+K / Cmd+K: Clear input
                    if (callbacks.clearInput) {
                        e.preventDefault();
                        // Only trigger if not in a text input
                        if (!isInputFocused || e.target.id === 'input-editor') {
                            callbacks.clearInput();
                        }
                    }
                    break;
                    
                case 'd':
                    // Ctrl+D / Cmd+D: Download output
                    if (callbacks.downloadOutput) {
                        e.preventDefault();
                        callbacks.downloadOutput();
                    }
                    break;
                    
                case 'c':
                    // Ctrl+C / Cmd+C: Copy output (only if not in input field)
                    if (callbacks.copyOutput && !isInputFocused) {
                        // Don't prevent default if user is selecting text
                        if (window.getSelection().toString().length === 0) {
                            e.preventDefault();
                            callbacks.copyOutput();
                        }
                    }
                    break;
                    
                case 'p':
                    // Ctrl+P / Cmd+P: Toggle preview (only if not in input field)
                    if (callbacks.togglePreview && !isInputFocused) {
                        e.preventDefault();
                        callbacks.togglePreview();
                    }
                    break;
            }
        });
    }
};


