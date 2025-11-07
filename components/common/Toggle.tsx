import React from 'react';

interface ToggleProps {
  label: React.ReactNode;
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  disabled?: boolean;
}

const Toggle: React.FC<ToggleProps> = ({ label, enabled, onChange, disabled = false }) => {
  return (
    <div className="flex items-center justify-between">
      <span className={`text-sm font-medium text-brand-text dark:text-slate-200 flex items-center gap-2 ${disabled ? 'opacity-50' : ''}`}>{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        className={`${enabled ? 'bg-brand-primary' : 'bg-slate-300 dark:bg-slate-600'} relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2 dark:focus:ring-offset-slate-800 disabled:opacity-50 disabled:cursor-not-allowed`}
        onClick={() => onChange(!enabled)}
        disabled={disabled}
      >
        <span
          className={`${enabled ? 'translate-x-5' : 'translate-x-0'} inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
        />
      </button>
    </div>
  );
};

export default Toggle;