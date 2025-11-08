import React from 'react';
import { AppFeature } from '../types';
import Icon from './common/Icon';
import { useSound } from '../hooks/useSound';

interface SidebarProps {
  activeFeature: AppFeature;
  onSelectFeature: (feature: AppFeature) => void;
  isCollapsed: boolean;
  onOpenSettings: () => void;
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
    isCollapsed,
    onOpenSettings,
}) => {
  const { playSound } = useSound();

  const handleFeatureClick = (feature: AppFeature) => {
    playSound('click');
    onSelectFeature(feature);
  };
  
  return (
    <aside className={`hidden md:flex flex-col p-4 bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl border-r border-white/30 dark:border-slate-800/50 transition-all duration-300 ${isCollapsed ? 'w-24' : 'w-72'}`}>
      <div className="flex-grow">
        <nav className="space-y-2 mt-16">
          {features.map(feature => (
            <button
              key={feature.id}
              onClick={() => handleFeatureClick(feature.id)}
              title={isCollapsed ? feature.name : undefined}
              className={`w-full flex items-center gap-4 px-3 py-2.5 rounded-lg text-left transition-colors ${isCollapsed ? 'justify-center' : ''} ${
                activeFeature === feature.id
                  ? 'bg-brand-primary/10 text-brand-primary font-semibold'
                  : 'text-brand-subtle dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              <Icon name={feature.icon} className="w-6 h-6 flex-shrink-0" />
              {!isCollapsed && <span>{feature.name}</span>}
            </button>
          ))}
        </nav>
      </div>
      <div className="flex-shrink-0">
         <button
            onClick={onOpenSettings}
            title={isCollapsed ? "Settings" : undefined}
            className={`w-full flex items-center gap-4 px-3 py-2.5 rounded-lg text-left transition-colors ${isCollapsed ? 'justify-center' : ''} text-brand-subtle dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700`}
          >
            <Icon name="settings" className="w-6 h-6 flex-shrink-0" />
            {!isCollapsed && <span>Settings</span>}
          </button>
      </div>
    </aside>
  );
};

export default Sidebar;