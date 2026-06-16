export function showToast(message: string, type: 'success' | 'error' | 'info' = 'success') {
  // Ensure styles exist
  let styles = document.getElementById('toast-styles');
  if (!styles) {
    styles = document.createElement('style');
    styles.id = 'toast-styles';
    styles.textContent = `
      .toast-container {
        position: fixed;
        top: 24px;
        right: 24px;
        z-index: 10000;
        display: flex;
        flex-direction: column;
        gap: 12px;
        pointer-events: none;
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      }
      .toast-item {
        pointer-events: auto;
        min-width: 280px;
        max-width: 400px;
        background: rgba(21, 28, 44, 0.92);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 12px;
        padding: 14px 18px;
        display: flex;
        align-items: center;
        gap: 12px;
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 16px -6px rgba(0, 0, 0, 0.4);
        transform: translateX(120%);
        opacity: 0;
        animation: toast-fade-in 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        cursor: pointer;
      }
      .toast-item.success {
        border-left: 4px solid #10b981;
      }
      .toast-item.error {
        border-left: 4px solid #ef4444;
      }
      .toast-item.info {
        border-left: 4px solid #06b6d4;
      }
      .toast-item.removing {
        animation: toast-fade-out 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      }
      .toast-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        width: 20px;
        height: 20px;
      }
      .toast-content {
        color: #f3f4f6;
        font-size: 13.5px;
        font-weight: 500;
        line-height: 1.4;
      }
      @keyframes toast-fade-in {
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
      @keyframes toast-fade-out {
        to {
          transform: translateY(-20px);
          opacity: 0;
          margin-bottom: -60px; /* Collapse space nicely */
        }
      }
    `;
    document.head.appendChild(styles);
  }

  // Ensure container exists
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  // Create toast element
  const toast = document.createElement('div');
  toast.className = `toast-item ${type}`;

  // Select icon based on type
  let iconHtml = '';
  if (type === 'success') {
    iconHtml = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
  } else if (type === 'error') {
    iconHtml = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`;
  } else {
    iconHtml = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
  }

  toast.innerHTML = `
    <div class="toast-icon">${iconHtml}</div>
    <div class="toast-content">${message}</div>
  `;

  // Click to dismiss
  toast.addEventListener('click', () => {
    dismissToast(toast);
  });

  container.appendChild(toast);

  // Auto dismiss
  const autoTimeout = setTimeout(() => {
    dismissToast(toast);
  }, 4000);

  function dismissToast(el: HTMLElement) {
    if (el.classList.contains('removing')) return;
    el.classList.add('removing');
    el.addEventListener('animationend', () => {
      el.remove();
      // Remove container if empty
      if (container && container.childNodes.length === 0) {
        container.remove();
      }
    });
  }
}
