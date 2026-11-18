import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';
import './ModalDialog.css';

interface ModalDialogProps {
  open: boolean;
  title: string;
  onClose: () => void;
  maxWidth?: number;
  children: ReactNode;
}

/**
 * Accessible framework-native dialog that renders as a native slide-up bottom sheet
 * on mobile phones and a centered modal on larger screens.
 * Replaces browser-blocking alert()/confirm()/prompt().
 */
export function ModalDialog({
  open,
  title,
  onClose,
  maxWidth,
  children,
}: ModalDialogProps) {
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

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
      <div
        className="curio-modal stack-md"
        style={maxWidth ? { maxWidth } : undefined}
      >
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
