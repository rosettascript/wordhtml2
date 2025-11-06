/**
 * Feedback Handler
 * Manages toast notifications and visual feedback for user actions
 */

const FeedbackHandler = {
    /**
     * Show a toast notification
     * @param {string} message - Message to display
     * @param {string} type - Type of notification ('success', 'error', 'info')
     * @param {number} duration - Duration in milliseconds (default: 3000)
     */
    showToast(message, type = 'success', duration = 3000) {
        // Remove existing toasts
        const existingToasts = document.querySelectorAll('.toast-notification');
        existingToasts.forEach(toast => toast.remove());

        // Create toast element
        const toast = document.createElement('div');
        toast.className = `toast-notification toast-${type}`;
        toast.setAttribute('role', 'alert');
        toast.setAttribute('aria-live', 'polite');
        
        // Create icon based on type
        let icon = '';
        if (type === 'success') {
            icon = `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 6L9 17l-5-5"></path>
            </svg>`;
        } else if (type === 'error') {
            icon = `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>`;
        } else {
            icon = `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
            </svg>`;
        }
        
        toast.innerHTML = `${icon}<span class="toast-message">${message}</span>`;
        
        // Append to body
        document.body.appendChild(toast);
        
        // Trigger animation
        requestAnimationFrame(() => {
            toast.classList.add('toast-show');
        });
        
        // Remove after duration
        setTimeout(() => {
            toast.classList.remove('toast-show');
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.remove();
                }
            }, 300); // Wait for fade-out animation
        }, duration);
        
        // Announce to screen readers
        const announcement = document.createElement('div');
        announcement.setAttribute('role', 'status');
        announcement.setAttribute('aria-live', 'polite');
        announcement.className = 'sr-only';
        announcement.textContent = message;
        document.body.appendChild(announcement);
        setTimeout(() => announcement.remove(), 1000);
    },

    /**
     * Show success toast
     * @param {string} message - Success message
     */
    success(message) {
        this.showToast(message, 'success');
    },

    /**
     * Show error toast
     * @param {string} message - Error message
     */
    error(message) {
        this.showToast(message, 'error', 5000);
    },

    /**
     * Show info toast
     * @param {string} message - Info message
     */
    info(message) {
        this.showToast(message, 'info');
    },

    /**
     * Update button to show success state
     * @param {HTMLElement} button - Button element
     * @param {number} duration - Duration in milliseconds
     */
    showButtonSuccess(button, duration = 2000) {
        if (!button) return;
        
        const originalHTML = button.innerHTML;
        const originalTitle = button.title;
        
        // Change to checkmark icon
        button.innerHTML = `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20 6L9 17l-5-5"></path>
        </svg>`;
        button.title = 'Copied!';
        button.classList.add('button-success');
        
        // Restore after duration
        setTimeout(() => {
            button.innerHTML = originalHTML;
            button.title = originalTitle;
            button.classList.remove('button-success');
        }, duration);
    }
};


