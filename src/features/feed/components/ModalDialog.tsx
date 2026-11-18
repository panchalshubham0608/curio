import type { ReactNode } from 'react';
import { X } from 'lucide-react';

interface ModalDialogProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}

/**
 * Accessible framework-native dialog that renders as a native slide-up bottom sheet
 * on mobile phones and a centered modal on larger screens.
 * Replaces browser-blocking alert()/confirm()/prompt().
 */
export function ModalDialog({ open, title, onClose, children }: ModalDialogProps) {
  if (!open) return null;

  return (
    <div
      className="curio-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="curio-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="curio-modal stack-md">
        <div className="sheet-handle" aria-hidden="true" />
        <div className="row-between">
          <h2 id="curio-modal-title" style={{ fontSize: '1.22rem' }}>
            {title}
          </h2>
          <button
            type="button"
            className="curio-btn curio-btn--ghost curio-btn--sm"
            aria-label="Close modal"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
