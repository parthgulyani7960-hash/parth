import React from 'react';
import { AppFeature } from '../../types';
import Icon from './Icon';
import { useSound } from '../../hooks/useSound';

interface BottomNavBarProps {
  activeFeature: AppFeature;
  onSelectFeature: (feature: AppFeature) => void;
}

const navItems = [
  { id: AppFeature.Dashboard, icon: 'layout-dashboard' as const, name: 'Home' },
  { id: AppFeature.Photo, icon: 'photo' as const, name: 'Photo' },
  { id: AppFeature.Video, icon: 'video' as const, name: 'Video' },
  { id: AppFeature.ImageGenerator, icon: 'sparkles' as const, name: 'Generate' },
  { id: AppFeature.CreativeChat, icon: 'chat' as const, name: 'Chat' },
];

const BottomNavBar: React.FC<BottomNavBarProps> = ({ activeFeature, onSelectFeature }) => {
  const { playSound } = useSound();

  const handleSelect = (feature: AppFeature) => {
    playSound('click');
    onSelectFeature(feature);
  };
  
  return (
    <footer className="md:hidden fixed bottom-0 left-0 right-0 bg-white/70 dark:bg-slate-900/70 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800 z-20">
      <nav className="flex justify-around items-center h-20">
        {navItems.map(item => (
          <button
            key={item.id}
            onClick={() => handleSelect(item.id)}
            className={`flex flex-col items-center justify-center gap-1 w-full h-full transition-colors ${
              activeFeature === item.id
                ? 'text-brand-primary'
                : 'text-brand-subtle dark:text-slate-400'
            }`}
          >
            <Icon name={item.icon} className="w-6 h-6" />
            <span className="text-xs font-medium">{item.name}</span>
          </button>
        ))}
      </nav>
    </footer>
  );
};

export default BottomNavBar;
