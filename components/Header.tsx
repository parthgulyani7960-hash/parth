import React, { useState, useRef, useEffect } from 'react';
import Icon from './common/Icon';
import Button from './common/Button';

interface HeaderProps {
  user: { name: string; avatar: string; email: string; };
  onOpenSettings: () => void;
  onOpenFeedback: () => void;
  onOpenProfile: () => void;
  onLogout: () => void;
  onOpenCommandBar: () => void;
  installPrompt: any;
  onInstallApp: () => void;
  isSidebarCollapsed: boolean;
  onToggleSidebar: () => void;
}

const Header: React.FC<HeaderProps> = ({ user, onOpenSettings, onOpenFeedback, onOpenProfile, onLogout, onOpenCommandBar, installPrompt, onInstallApp, isSidebarCollapsed, onToggleSidebar }) => {
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  const createMenuAction = (action: () => void, text: string, icon: React.ComponentProps<typeof Icon>['name'], options: {className?: string, isCommand?: boolean} = {}) => {
      const {className, isCommand} = options;
      return (
         <li>
            <button 
                onClick={() => { action(); setIsProfileMenuOpen(false); }} 
                className={`w-full text-left flex items-center justify-between gap-3 px-4 py-2.5 text-brand-subtle dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors ${className}`}
            >
                <div className="flex items-center gap-3">
                    <Icon name={icon} className="w-5 h-5" /> {text}
                </div>
                {isCommand && <div className="text-xs font-mono text-brand-subtle dark:text-slate-500 bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded">⌘K</div>}
            </button>
        </li>
      );
  };

  return (
    <header className="flex items-center justify-between p-4 bg-white/40 dark:bg-slate-900/40 backdrop-blur-lg border-b border-white/30 dark:border-slate-800/50 h-20 flex-shrink-0">
      <div className="flex items-center gap-4">
        <Button variant="icon" onClick={onToggleSidebar} className="hidden md:flex">
          <Icon name={isSidebarCollapsed ? 'redo' : 'undo'} className={`transition-transform duration-300 ${isSidebarCollapsed ? '' : 'transform -scale-x-100'}`} />
        </Button>
        <div className="flex items-center gap-2">
            <Icon name="brand" className="w-8 h-8 text-brand-primary" />
            <h1 className="hidden sm:block text-xl font-bold text-brand-text dark:text-slate-200 tracking-tight">
            Creative Studio Pro
            </h1>
        </div>
      </div>
      <div className="relative" ref={menuRef}>
        <Button variant="avatar" onClick={() => setIsProfileMenuOpen(prev => !prev)}>
          {user.avatar}
        </Button>
        {isProfileMenuOpen && (
          <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-800 rounded-xl shadow-lg border dark:border-slate-700 animate-fade-in py-2 z-30">
            <div className="px-4 py-3 border-b dark:border-slate-700">
                <p className="font-semibold text-brand-text dark:text-slate-200 truncate">{user.name}</p>
                <p className="text-sm text-brand-subtle dark:text-slate-400 truncate">{user.email}</p>
            </div>
            <ul className="mt-2 text-sm">
              {createMenuAction(onOpenProfile, "View Profile", 'user')}
              {createMenuAction(onOpenCommandBar, "Command Bar", 'sparkles', { isCommand: true })}
              {installPrompt && !isStandalone && createMenuAction(onInstallApp, "Install App", 'download-cloud')}
              {createMenuAction(onOpenSettings, "Settings", 'settings')}
              {createMenuAction(onOpenFeedback, "Feedback & Support", 'feedback')}
              {createMenuAction(onLogout, "Log Out", 'log-out', { className: 'text-red-500 hover:bg-red-50 dark:hover:bg-red-900/40 mt-2 border-t dark:border-slate-700' })}
            </ul>
          </div>
        )}
      </div>
    </header>
  );
};
export default Header;
