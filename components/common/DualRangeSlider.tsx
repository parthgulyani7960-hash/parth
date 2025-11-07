import React, { useCallback } from 'react';

interface DualRangeSliderProps {
  min: number;
  max: number;
  step?: number;
  value: [number, number];
  onChange: (value: [number, number]) => void;
}

const DualRangeSlider: React.FC<DualRangeSliderProps> = ({ min, max, step = 0.1, value, onChange }) => {
  const [minVal, maxVal] = value;

  const handleMinChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newMinVal = Math.min(Number(e.target.value), maxVal - step);
    onChange([newMinVal, maxVal]);
  }, [maxVal, onChange, step]);

  const handleMaxChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newMaxVal = Math.max(Number(e.target.value), minVal + step);
    onChange([minVal, newMaxVal]);
  }, [minVal, onChange, step]);

  const minPos = max > min ? ((minVal - min) / (max - min)) * 100 : 0;
  const maxPos = max > min ? ((maxVal - min) / (max - min)) * 100 : 100;

  return (
    <div className="relative w-full h-12 flex items-center">
      <div className="absolute w-full h-1.5 bg-slate-200 dark:bg-slate-600 rounded-full" />
      <div
        className="absolute h-1.5 bg-brand-primary rounded-full"
        style={{ left: `${minPos}%`, right: `${100 - maxPos}%` }}
      />
      <style>{`
        .thumb-input {
          -webkit-appearance: none;
          appearance: none;
          width: 100%;
          background: transparent;
          position: absolute;
          height: 1.5rem;
          pointer-events: none;
        }

        .thumb-input::-webkit-slider-thumb {
          -webkit-appearance: none;
          pointer-events: all;
          width: 24px;
          height: 24px;
          background: white;
          border: 3px solid #7C3AED;
          border-radius: 50%;
          cursor: pointer;
          box-shadow: 0 1px 3px rgba(0,0,0,0.2);
        }

        .thumb-input::-moz-range-thumb {
          pointer-events: all;
          width: 24px;
          height: 24px;
          background: white;
          border: 3px solid #7C3AED;
          border-radius: 50%;
          cursor: pointer;
          box-shadow: 0 1px 3px rgba(0,0,0,0.2);
        }
      `}</style>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={minVal}
        onChange={handleMinChange}
        className="thumb-input"
        style={{ zIndex: 3 }}
      />
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={maxVal}
        onChange={handleMaxChange}
        className="thumb-input"
        style={{ zIndex: 4 }}
      />
    </div>
  );
};

export default DualRangeSlider;