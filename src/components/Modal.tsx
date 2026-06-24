import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../utils/cn';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  variant?: 'center' | 'bottom-sheet';
  children: React.ReactNode;
}

export function Modal({ isOpen, onClose, title, variant = 'center', children }: ModalProps) {
  const titleId = useRef(`modal-title-${Math.random().toString(36).slice(2, 9)}`);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  const centerVariants = {
    initial: { scale: 0.9, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    exit: { scale: 0.9, opacity: 0 },
  };

  const bottomVariants = {
    initial: { y: '100%' },
    animate: { y: 0 },
    exit: { y: '100%' },
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className={cn(
            'fixed inset-0 z-50 flex justify-center bg-black/40 backdrop-blur-sm p-4',
            variant === 'bottom-sheet' ? 'items-end' : 'items-center'
          )}
          onClick={onClose}
        >
          <motion.div
            variants={variant === 'bottom-sheet' ? bottomVariants : centerVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId.current}
            className={cn(
              'bg-white w-full shadow-2xl',
              variant === 'bottom-sheet'
                ? 'max-w-md rounded-t-[40px] p-6 pb-8 max-h-[90vh] max-h-[90dvh] flex flex-col'
                : 'max-w-sm rounded-[32px] p-6'
            )}
            onClick={e => e.stopPropagation()}
          >
            {variant === 'bottom-sheet' && (
              <div className="w-12 h-1.5 bg-stone-200 rounded-full mx-auto mb-6 shrink-0" />
            )}
            <h3 id={titleId.current} className={cn(
              'font-black', variant === 'bottom-sheet' ? 'text-2xl mb-6' : 'text-xl mb-6'
            )}>
              {title}
            </h3>
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
