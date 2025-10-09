import { createPortal } from 'react-dom';

export const MODAL_SECONDARY_BUTTON_CLASS = 'modal-button modal-button--secondary';

export const MODAL_PRIMARY_BUTTON_CLASS = 'modal-button modal-button--primary';

const modalRoot = typeof document !== 'undefined' ? document.body : null;

export function Modal({ open, onClose, title, children, footer }) {
  if (!open || !modalRoot) {
    return null;
  }

  const handleBackdropClick = (event) => {
    if (event.target === event.currentTarget) {
      onClose?.();
    }
  };

  return createPortal(
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div className="modal-content">
        <div className="modal-header">
          <h2>{title}</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close dialog">
            ×
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer ? <div className="modal-footer">{footer}</div> : null}
      </div>
    </div>,
    modalRoot
  );
}
