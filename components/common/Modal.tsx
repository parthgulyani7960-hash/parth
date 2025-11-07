import React, { useEffect, FC } from 'react';
import Card from './Card';
import Icon from './Icon';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'medium' | 'large' | 'extra-large';
}

const Modal: FC<ModalProps> = ({ isOpen, onClose, title, children, size = 'medium' }) => {
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleEsc);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClasses = {
    medium: 'max-w-lg',
    large: 'max-w-3xl',
    'extra-large': 'max-w-5xl',
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <Card
        className={`w-full ${sizeClasses[size]} mx-4 !p-0 animate-slide-in-up`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-6 border-b border-slate-200 dark:border-slate-700">
          <h3 id="modal-title" className="text-xl font-semibold text-brand-text dark:text-slate-200">{title}</h3>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-brand-subtle dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            aria-label="Close modal"
          >
            <Icon name="x" className="w-6 h-6" />
          </button>
        </div>
        <div className="p-6">
          {children}
        </div>
      </Card>
    </div>
  );
};

export default Modal;