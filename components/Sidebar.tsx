import React from 'react';
import { AppFeature } from '../types';
import Icon from './common/Icon';
import { useSound } from '../hooks/useSound';
import Button from './common/Button';

interface SidebarProps {
  activeFeature: AppFeature;
  onSelectFeature: (feature: AppFeature) => void;
  user: { name: string };
  onOpenSettings: () => void;
  onOpenFeedback: () => void;
  onOpenProfile: () => void;
  onOpenCommandBar: () => void;
}

const features = [
  { id: AppFeature.Dashboard, name: 'Dashboard', icon: 'layout-dashboard' as const },
  { id: AppFeature.Photo, name: 'Photo Lab', icon: 'photo' as const },
  { id: AppFeature.Video, name: 'Video Suite', icon: 'video' as const },
  { id: AppFeature.ImageGenerator, name: 'Image Generator', icon: 'sparkles' as const },
  { id: AppFeature.Audio, name: 'Audio Studio', icon: 'sound-wave' as const },
  { id: AppFeature.Text, name: 'Text Lab', icon: 'text' as const },
  { id: AppFeature.Templates, name: 'Templates', icon: 'template' as const },
  { id: AppFeature.CreativeChat, name: 'Creative Chat', icon: 'chat' as const },
];

const Sidebar: React.FC<SidebarProps> = ({ 
    activeFeature, 
    onSelectFeature, 
    user, 
    onOpenSettings,
    onOpenFeedback,
    onOpenProfile,
    onOpenCommandBar
}) => {
  const { playSound } = useSound();

  const handleFeatureClick = (feature: AppFeature) => {
    playSound('click');
    onSelectFeature(feature);
  };
  
  return (
    <aside className="w-72 bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl border-r border-white/30 dark:border-slate-800/50 flex flex-col p-4">
      <div className="flex items-center gap-2 mb-8 px-2">
        <Icon name="brand" className="w-8 h-8 text-brand-primary" />
        <h1 className="text-xl font-bold text-brand-text dark:text-slate-200 tracking-tight">
          Creative Studio
        </h1>
      </div>
      <nav className="flex-1 space-y-2">
        {features.map(feature => (
          <button
            key={feature.id}
            onClick={() => handleFeatureClick(feature.id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
              activeFeature === feature.id
                ? 'bg-brand-primary/10 text-brand-primary font-semibold'
                : 'text-brand-subtle dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            <Icon name={feature.icon} className="w-5 h-5" />
            <span>{feature.name}</span>
          </button>
        ))}
      </nav>
      <div className="mt-auto space-y-2">
        <button
            onClick={onOpenCommandBar}
            className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-left text-brand-subtle dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
        >
            <div className="flex items-center gap-3">
              <Icon name="sparkles" className="w-5 h-5" />
              <span>Command Bar</span>
            </div>
            <div className="text-xs font-mono text-brand-subtle dark:text-slate-500 bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded">⌘K</div>
        </button>
         <button
            onClick={onOpenFeedback}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-brand-subtle dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
        >
            <Icon name="feedback" className="w-5 h-5" />
            <span>Feedback</span>
        </button>
         <button
            onClick={onOpenSettings}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-brand-subtle dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
        >
            <Icon name="settings" className="w-5 h-5" />
            <span>Settings</span>
        </button>
        <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
            <button
                onClick={onOpenProfile}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-brand-subtle dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
               <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-200 to-sky-200 flex items-center justify-center text-brand-primary font-bold shadow-sm">
                    {user.name.split(' ').map(n => n[0]).join('')}
                </div>
                <span className="font-semibold">{user.name}</span>
            </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
