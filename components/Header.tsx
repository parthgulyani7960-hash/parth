import React from 'react';
import { AppFeature } from '../types';
import Icon from './common/Icon';
import Button from './common/Button';

interface HeaderProps {
    activeFeature: AppFeature;
    onBackToDashboard: () => void;
    onOpenSettings: () => void;
    onOpenFeedback: () => void;
    onOpenProfile: () => void;
    onOpenCommandBar: () => void;
    user: { name: string; };
}

const featureNames: Record<string, string> = {
  [AppFeature.Dashboard]: 'Dashboard',
  [AppFeature.Photo]: 'Photo Lab',
  [AppFeature.Video]: 'Video Suite',
  [AppFeature.Audio]: 'Audio Studio',
  [AppFeature.Text]: 'Text Lab',
  [AppFeature.Templates]: 'Template Studio',
  [AppFeature.ImageGenerator]: 'Image Generator',
  [AppFeature.CreativeChat]: 'Creative Chat',
};


const Header: React.FC<HeaderProps> = ({ user, activeFeature, onBackToDashboard, onOpenSettings, onOpenFeedback, onOpenProfile, onOpenCommandBar }) => {
  const isDashboard = activeFeature === AppFeature.Dashboard;
  const title = featureNames[activeFeature] || 'Creative Studio';
  
  return (
    <header className="fixed top-0 left-0 right-0 z-40 p-4 sm:px-6 flex items-center justify-between bg-white/40 dark:bg-slate-800/40 backdrop-blur-xl border-b border-white/30 dark:border-slate-700/50 transition-all duration-300">
       <div className="flex items-center gap-4">
            {!isDashboard && (
                 <Button onClick={onBackToDashboard} variant="icon" aria-label="Back to Dashboard">
                    <Icon name="back" className="w-6 h-6 text-brand-subtle dark:text-slate-400" />
                </Button>
            )}
             <h1 className="text-xl font-bold text-brand-text dark:text-slate-200 tracking-tight flex items-center gap-2">
                {isDashboard && <Icon name="brand" className="w-7 h-7 text-brand-primary" />}
                {isDashboard ? 'Creative Studio' : title}
            </h1>
       </div>
       <div className="flex items-center gap-3">
            <Button onClick={onOpenCommandBar} variant="icon" aria-label="Open Command Bar">
                <Icon name="sparkles" className="w-6 h-6 text-brand-subtle dark:text-slate-400" />
            </Button>
            <Button onClick={onOpenFeedback} variant="icon" aria-label="Submit Feedback">
                <Icon name="feedback" className="w-6 h-6 text-brand-subtle dark:text-slate-400" />
            </Button>
            <Button onClick={onOpenSettings} variant="icon" aria-label="Open Settings">
                <Icon name="settings" className="w-6 h-6 text-brand-subtle dark:text-slate-400" />
            </Button>
            <Button onClick={onOpenProfile} variant="avatar" aria-label="User Profile">
                {user.name.split(' ').map(n => n[0]).join('')}
            </Button>
       </div>
    </header>
  );
};

export default Header;