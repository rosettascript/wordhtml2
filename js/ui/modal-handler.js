/**
 * Modal Handler
 * Handles custom modal dialogs
 */

const ModalHandler = {
    modal: null,
    modalTitle: null,
    modalMessage: null,
    modalCancel: null,
    modalConfirm: null,
    modalOverlay: null,
    resolveCallback: null,
    previousActiveElement: null,

    /**
     * Initialize modal handler
     */
    init() {
        this.modal = document.getElementById('custom-modal');
        this.modalTitle = document.getElementById('modal-title');
        this.modalMessage = document.getElementById('modal-message');
        this.modalCancel = document.getElementById('modal-cancel');
        this.modalConfirm = document.getElementById('modal-confirm');
        this.modalOverlay = this.modal?.querySelector('.modal-overlay');

        if (!this.modal || !this.modalTitle || !this.modalMessage || !this.modalCancel || !this.modalConfirm) {
            console.error('ModalHandler: Required modal elements not found');
            return;
        }

        // Setup event listeners
        this.modalCancel.addEventListener('click', () => this.close(false));
        this.modalConfirm.addEventListener('click', () => this.close(true));
        
        if (this.modalOverlay) {
            this.modalOverlay.addEventListener('click', () => this.close(false));
        }

        // Handle keyboard navigation
        this.modal.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.close(false);
            } else if (e.key === 'Enter' && e.target === this.modalConfirm) {
                this.close(true);
            }
        });

        // Focus trap - keep focus within modal
        this.modal.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                const focusableElements = this.modal.querySelectorAll(
                    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
                );
                const firstElement = focusableElements[0];
                const lastElement = focusableElements[focusableElements.length - 1];

                if (e.shiftKey && document.activeElement === firstElement) {
                    e.preventDefault();
                    lastElement.focus();
                } else if (!e.shiftKey && document.activeElement === lastElement) {
                    e.preventDefault();
                    firstElement.focus();
                }
            }
        });
    },

    /**
     * Show modal with custom message
     * @param {string} title - Modal title
     * @param {string} message - Modal message
     * @param {string} confirmText - Confirm button text (default: "Confirm")
     * @param {string} cancelText - Cancel button text (default: "Cancel")
     * @returns {Promise<boolean>} - Promise that resolves to true if confirmed, false if cancelled
     */
    show(title, message, confirmText = 'Confirm', cancelText = 'Cancel') {
        return new Promise((resolve) => {
            this.resolveCallback = resolve;
            
            // Store the element that had focus before modal opened
            this.previousActiveElement = document.activeElement;
            
            // Set modal content
            this.modalTitle.textContent = title;
            this.modalMessage.textContent = message;
            this.modalConfirm.textContent = confirmText;
            this.modalCancel.textContent = cancelText;

            // Prevent body scrolling
            document.body.style.overflow = 'hidden';

            // Show modal with animation
            this.modal.style.display = 'flex';
            requestAnimationFrame(() => {
                this.modal.classList.add('show');
            });
            
            // Focus on cancel button for accessibility
            setTimeout(() => {
                this.modalCancel.focus();
            }, 100);
        });
    },

    /**
     * Close modal
     * @param {boolean} confirmed - Whether user confirmed
     */
    close(confirmed) {
        if (!this.modal) return;

        // Restore body scrolling
        document.body.style.overflow = '';

        // Remove show class to trigger fade out
        this.modal.classList.remove('show');

        // Resolve promise after animation
        setTimeout(() => {
            if (this.resolveCallback) {
                this.resolveCallback(confirmed);
                this.resolveCallback = null;
            }
            
            // Hide modal completely
            this.modal.style.display = 'none';
            
            // Restore focus to previous element
            if (this.previousActiveElement && typeof this.previousActiveElement.focus === 'function') {
                this.previousActiveElement.focus();
            }
        }, 300);
    }
};

