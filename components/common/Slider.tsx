import React from 'react';

interface SliderProps {
  label: string;
  value: number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  min?: number;
  max?: number;
  step?: number;
}

const Slider: React.FC<SliderProps> = ({ label, value, onChange, min = -100, max = 100, step = 1 }) => {
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <label className="text-sm font-medium text-brand-subtle dark:text-slate-400">{label}</label>
        <span className="text-sm font-mono text-brand-text dark:text-slate-200 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded">{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={onChange}
        className="w-full h-2 bg-slate-200 dark:bg-slate-600 rounded-lg appearance-none cursor-pointer accent-brand-primary"
      />
    </div>
  );
};

export default Slider;