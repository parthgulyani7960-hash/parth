import React from 'react';
import Icon from './Icon';

const Loader: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-[60vh] text-center text-brand-subtle dark:text-slate-400 animate-fade-in">
    <div className="relative flex items-center justify-center w-24 h-24">
      <div className="absolute inset-0 bg-brand-primary rounded-full animate-ping opacity-50"></div>
      <Icon name="sparkles" className="w-12 h-12 text-white" />
    </div>
    <p className="mt-4 text-lg font-semibold text-brand-text dark:text-slate-200">Loading Studio...</p>
  </div>
);

export default Loader;