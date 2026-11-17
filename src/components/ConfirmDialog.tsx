import { useRef } from 'react';
import { Dialog } from './Dialog';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  isDangerous?: boolean;
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  isDangerous = false,
}: ConfirmDialogProps) {
  // #203: built on the Dialog block (native modal <dialog>, top layer — no portal needed
  // any more to escape a .glass-effect card). Focus starts on Cancel: the safe choice, so a
  // reflex Enter never confirms a deletion.
  const cancelRef = useRef<HTMLButtonElement>(null);

  const handleConfirmClick = async () => {
    try {
      await onConfirm();
    } catch (err) {
      console.error('Error in confirm callback:', err);
    }
  };

  return (
    <Dialog open={isOpen} onClose={onCancel} title={title} initialFocus={cancelRef}>
      <p className="text-gray-700 dark:text-gray-300 mb-6">{message}</p>
      <div className="flex gap-3 justify-end">
        <button ref={cancelRef} type="button" className="btn-secondary" onClick={onCancel}>
          {cancelText}
        </button>
        <button type="button" className={isDangerous ? 'btn-danger' : 'btn-primary'} onClick={handleConfirmClick}>
          {confirmText}
        </button>
      </div>
    </Dialog>
  );
}
