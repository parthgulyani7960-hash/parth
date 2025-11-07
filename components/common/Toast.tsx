import React from 'react';
import { useToastMessages } from '../../hooks/useToast';
import Icon from './Icon';

const toastIcons = {
  success: <Icon name="face-smile" className="w-6 h-6 text-emerald-500" />,
  error: <Icon name="x" className="w-6 h-6 text-red-500" />,
  info: <Icon name="feedback" className="w-6 h-6 text-sky-500" />,
};

const ToastContainer: React.FC = () => {
  const toasts = useToastMessages();

  return (
    <div className="fixed bottom-4 right-4 z-[100] w-full max-w-sm space-y-3">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className="bg-white dark:bg-slate-800 shadow-lg rounded-xl pointer-events-auto ring-1 ring-black dark:ring-white ring-opacity-5 dark:ring-opacity-10 overflow-hidden animate-slide-in-up"
        >
          <div className="p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">{toastIcons[toast.type]}</div>
              <div className="ml-3 w-0 flex-1 pt-0.5">
                <p className="text-sm font-medium text-brand-text dark:text-slate-200">{toast.message}</p>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ToastContainer;