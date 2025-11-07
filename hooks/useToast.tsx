import React, { useState, useCallback, createContext, useContext } from 'react';

// Toast structure
interface ToastMessage {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

// Context structure
interface ToastContextType {
  toasts: ToastMessage[];
  addToast: (message: string, type: ToastMessage['type']) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = (id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const addToast = useCallback((message: string, type: ToastMessage['type']) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      removeToast(id);
    }, 5000); // Remove toast after 5 seconds
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast }}>
      {children}
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context.addToast;
};

export const useToastMessages = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToastMessages must be used within a ToastProvider');
    }
    return context.toasts;
}