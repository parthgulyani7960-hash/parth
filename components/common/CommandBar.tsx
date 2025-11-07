import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { AppFeature } from '../../types';
import Icon from './Icon';
import { useSound } from '../../hooks/useSound';

interface Command {
  id: string;
  name: string;
  category: string;
  icon: React.ComponentProps<typeof Icon>['name'];
  action: () => void;
  keywords?: string;
}

interface CommandBarProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectFeature: (feature: AppFeature) => void;
}

const CommandBar: React.FC<CommandBarProps> = ({ isOpen, onClose, onSelectFeature }) => {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const { playSound } = useSound();

  const commands: Command[] = useMemo(() => [
    { id: 'nav-photo', name: 'Go to Photo Lab', category: 'Navigation', icon: 'photo', action: () => onSelectFeature(AppFeature.Photo), keywords: 'image edit picture' },
    { id: 'nav-video', name: 'Go to Video Suite', category: 'Navigation', icon: 'video', action: () => onSelectFeature(AppFeature.Video), keywords: 'movie clip' },
    { id: 'nav-image-gen', name: 'Go to Image Generator', category: 'Navigation', icon: 'sparkles', action: () => onSelectFeature(AppFeature.ImageGenerator), keywords: 'create art' },
    { id: 'nav-audio', name: 'Go to Audio Studio', category: 'Navigation', icon: 'sound-wave', action: () => onSelectFeature(AppFeature.Audio), keywords: 'sound music' },
    { id: 'nav-text', name: 'Go to Text Lab', category: 'Navigation', icon: 'text', action: () => onSelectFeature(AppFeature.Text), keywords: 'write proofread' },
    { id: 'nav-templates', name: 'Go to Templates', category: 'Navigation', icon: 'template', action: () => onSelectFeature(AppFeature.Templates), keywords: 'design logo' },
    { id: 'action-new-image', name: 'Create new image', category: 'Action', icon: 'sparkles', action: () => onSelectFeature(AppFeature.ImageGenerator), keywords: 'generate art' },
    { id: 'action-summarize', name: 'Summarize text', category: 'Action', icon: 'text', action: () => onSelectFeature(AppFeature.Text), keywords: 'tl;dr tl dr' },
  ], [onSelectFeature]);

  const filteredCommands = useMemo(() => {
    if (!query) return commands;
    return commands.filter(cmd =>
      cmd.name.toLowerCase().includes(query.toLowerCase()) ||
      cmd.category.toLowerCase().includes(query.toLowerCase()) ||
      cmd.keywords?.toLowerCase().includes(query.toLowerCase())
    );
  }, [query, commands]);

  const executeCommand = useCallback((command: Command) => {
    playSound('click');
    command.action();
    onClose();
  }, [onClose, playSound]);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setActiveIndex(0);
    }
  }, [isOpen]);
  
  useEffect(() => {
      setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex(prev => (prev + 1) % filteredCommands.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex(prev => (prev - 1 + filteredCommands.length) % filteredCommands.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const command = filteredCommands[activeIndex];
        if (command) {
          executeCommand(command);
        }
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, activeIndex, filteredCommands, executeCommand, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-start justify-center pt-20" onClick={onClose}>
      <div
        className="w-full max-w-lg bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl shadow-interactive-lg border border-white/30 dark:border-slate-700/50 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-3 border-b border-slate-200 dark:border-slate-700 flex items-center gap-3">
          <Icon name="sparkles" className="w-6 h-6 text-brand-primary" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Type a command or search..."
            className="w-full bg-transparent focus:outline-none text-brand-text dark:text-slate-200 text-lg"
            autoFocus
          />
           <div className="text-xs font-mono text-brand-subtle dark:text-slate-400 bg-slate-200 dark:bg-slate-700 px-2 py-1 rounded">ESC</div>
        </div>
        <div className="max-h-[400px] overflow-y-auto">
          {filteredCommands.length > 0 ? (
            <ul className="p-2">
              {filteredCommands.map((cmd, index) => (
                <li key={cmd.id}>
                  <button
                    onClick={() => executeCommand(cmd)}
                    onMouseEnter={() => setActiveIndex(index)}
                    className={`w-full text-left flex items-center gap-4 p-3 rounded-lg transition-colors ${activeIndex === index ? 'bg-brand-primary/10 text-brand-primary' : 'hover:bg-slate-200/50 dark:hover:bg-slate-700/50'}`}
                  >
                    <Icon name={cmd.icon} className="w-5 h-5" />
                    <div className="flex-grow">
                      <p className="font-medium text-brand-text dark:text-slate-200">{cmd.name}</p>
                    </div>
                    <span className="text-xs font-medium text-brand-subtle dark:text-slate-400">{cmd.category}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-center p-8 text-brand-subtle dark:text-slate-400">No commands found.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default CommandBar;
