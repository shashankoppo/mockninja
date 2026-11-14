import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}

export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', destructive = false }: ConfirmDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} title={title} footer={
      <>
        <Button variant="outline" size="sm" onClick={onClose}>{cancelLabel}</Button>
        <Button
          variant={destructive ? 'destructive' : 'primary'}
          size="sm"
          onClick={() => {
            onClose();
            onConfirm();
          }}
          className="mt-3 sm:mt-0"
        >
          {confirmLabel}
        </Button>
      </>
    }>
      <p className="text-sm leading-relaxed text-navy-600">{message}</p>
    </Dialog>
  );
}
