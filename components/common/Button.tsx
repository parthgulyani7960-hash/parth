import React from 'react';
import Icon from './Icon';
import Spinner from './Spinner';
import { useSound } from '../../hooks/useSound';

type BaseProps = {
  children?: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'tool' | 'icon' | 'avatar';
  isLoading?: boolean;
  icon?: React.ComponentProps<typeof Icon>['name'];
  className?: string;
};

type AsButton = BaseProps & { as?: 'button' } & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, keyof BaseProps>;
type AsAnchor = BaseProps & { as: 'a' } & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, keyof BaseProps>;
type AsSpan = BaseProps & { as: 'span' } & Omit<React.HTMLAttributes<HTMLSpanElement>, keyof BaseProps>;

type ButtonProps = AsButton | AsAnchor | AsSpan;

const Button: React.FC<ButtonProps> = (props) => {
  const { children, variant = 'primary', isLoading = false, icon, className, as, ...rest } = props;
  const Tag: React.ElementType = as || 'button';

  const { playSound } = useSound();

  const isDisabled = isLoading || ('disabled' in props && !!props.disabled);

  const baseClasses = 'rounded-xl font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-900 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transform-gpu hover:scale-105 active:scale-95';

  const variantClasses = {
    primary: 'px-6 py-3 bg-brand-primary text-white shadow-md hover:bg-violet-700 focus:ring-brand-primary button-glow',
    secondary: 'px-6 py-3 bg-white dark:bg-slate-700 text-brand-text dark:text-slate-200 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 focus:ring-brand-primary',
    tool: 'p-3 bg-slate-100 dark:bg-slate-700 text-brand-subtle dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 hover:text-brand-text dark:hover:text-white focus:ring-brand-primary',
    icon: 'p-2 rounded-full bg-white/50 dark:bg-slate-800/50 hover:bg-white/80 dark:hover:bg-slate-700/50 transition-colors shadow-sm focus:ring-brand-primary !hover:scale-110 !active:scale-100',
    avatar: 'p-0 w-10 h-10 rounded-full bg-gradient-to-br from-violet-200 to-sky-200 text-brand-primary font-bold shadow-sm focus:ring-brand-primary !hover:scale-110 !active:scale-100'
  };

  const handleClick = (e: React.MouseEvent<HTMLElement>) => {
      playSound('click');
      if ('onClick' in props && typeof props.onClick === 'function') {
        (props.onClick as React.MouseEventHandler<HTMLElement>)(e);
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

  const allProps: any = {
    className: `${baseClasses} ${variantClasses[variant]} ${className || ''}`,
    onClick: !isDisabled ? handleClick : (e: React.MouseEvent<HTMLElement>) => e.preventDefault(),
    'aria-disabled': isDisabled,
    ...rest,
  };

  if (Tag === 'button') {
    allProps.disabled = isDisabled;
  }

  return <Tag {...allProps}>{content}</Tag>;
};

export default Button;