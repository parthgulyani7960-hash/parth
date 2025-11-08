import React from 'react';
import Icon from './Icon';

interface SuggestionChipProps {
    text: string;
    icon: React.ComponentProps<typeof Icon>['name'];
    onClick: () => void;
    onClose: () => void;
}

const SuggestionChip: React.FC<SuggestionChipProps> = ({ text, icon, onClick, onClose }) => {
    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 animate-slide-in-up">
            <div className="flex items-center gap-2 bg-white/70 dark:bg-slate-800/70 backdrop-blur-lg rounded-full shadow-lg p-1 pr-2">
                <button 
                    onClick={onClick}
                    className="flex items-center gap-2 text-sm font-semibold text-brand-text dark:text-slate-200 px-4 py-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                    <Icon name={icon} className="w-5 h-5 text-brand-primary" />
                    {text}
                </button>
                <button
                    onClick={onClose}
                    className="p-1 rounded-full text-brand-subtle dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                    <Icon name="x" className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
};

export default SuggestionChip;
