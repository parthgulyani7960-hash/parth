import React from 'react';
import Icon from './Icon';
import Spinner from './Spinner';
import { useSound } from '../../hooks/useSound';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children?: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'tool' | 'icon' | 'avatar';
  isLoading?: boolean;
  icon?: React.ComponentProps<typeof Icon>['name'];
  as?: 'span';
}

const Button: React.FC<ButtonProps> = ({ children, variant = 'primary', isLoading = false, icon, className, as, ...props }) => {
  const baseClasses = 'rounded-xl font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-900 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transform-gpu hover:scale-105 active:scale-95';
  
  const { playSound } = useSound();

  const variantClasses = {
    primary: 'px-6 py-3 bg-brand-primary text-white shadow-md hover:bg-violet-700 focus:ring-brand-primary button-glow',
    secondary: 'px-6 py-3 bg-white dark:bg-slate-700 text-brand-text dark:text-slate-200 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 focus:ring-brand-primary',
    tool: 'p-3 bg-slate-100 dark:bg-slate-700 text-brand-subtle dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 hover:text-brand-text dark:hover:text-white focus:ring-brand-primary',
    icon: 'p-2 rounded-full bg-white/50 dark:bg-slate-800/50 hover:bg-white/80 dark:hover:bg-slate-700/50 transition-colors shadow-sm focus:ring-brand-primary !hover:scale-110 !active:scale-100',
    avatar: 'p-0 w-10 h-10 rounded-full bg-gradient-to-br from-violet-200 to-sky-200 text-brand-primary font-bold shadow-sm focus:ring-brand-primary !hover:scale-110 !active:scale-100'
  };

  const handleClick = (e: React.MouseEvent<HTMLButtonElement | HTMLSpanElement>) => {
      playSound('click');
      if (props.onClick && 'currentTarget' in e && e.currentTarget instanceof HTMLButtonElement) {
        (props.onClick as React.MouseEventHandler<HTMLButtonElement>)(e as React.MouseEvent<HTMLButtonElement>);
      }
  };

  const content = (
    <>
      {isLoading ? (
        <Spinner />
      ) : (
        <>
          {icon && <Icon name={icon} className="w-5 h-5" />}
          {children}
        </>
      )}
    </>
  );

  if (as === 'span') {
    // Destructure out button-specific props that are invalid on a span
    const { disabled, type, onClick, ...spanProps } = props;
    const isDisabled = isLoading || disabled;
    return (
      <span
        className={`${baseClasses} ${variantClasses[variant]} ${className} ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        onClick={!isDisabled ? handleClick : undefined}
        {...spanProps}
      >
        {content}
      </span>
    );
  }

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      disabled={isLoading || props.disabled}
      onClick={handleClick}
      {...props}
    >
      {content}
    </button>
  );
};

export default Button;
