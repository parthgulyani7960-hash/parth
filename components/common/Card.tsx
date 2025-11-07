import React, { useRef, MouseEvent } from 'react';
import { useSound } from '../../hooks/useSound';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: (event: React.MouseEvent<HTMLDivElement>) => void;
}

const Card: React.FC<CardProps> = ({ children, className, onClick }) => {
  const baseClasses = 'bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl rounded-2xl shadow-interactive border border-white/30 dark:border-slate-700/50 p-6 transition-all duration-300';
  
  const cardRef = useRef<HTMLDivElement>(null);
  const { playSound } = useSound();
  
  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!onClick || !cardRef.current) return;
    const { left, top, width, height } = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - left - width / 2) / (width / 2);
    const y = (e.clientY - top - height / 2) / (height / 2);
    
    const rotateX = -y * 8; // Max rotation 8 degrees
    const rotateY = x * 8;
    
    cardRef.current.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.05)`;
  };
  
  const handleMouseLeave = () => {
    if (!onClick || !cardRef.current) return;
    cardRef.current.style.transform = 'rotateX(0deg) rotateY(0deg) scale(1)';
  };
  
  const handleMouseEnter = () => {
    if (onClick) {
      playSound('hover');
    }
  };

  const interactiveClasses = onClick ? 'hover:shadow-interactive-lg card-tilt' : '';
  
  return (
    <div 
      ref={cardRef}
      className={`${baseClasses} ${interactiveClasses} ${className}`} 
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onMouseEnter={handleMouseEnter}
    >
      {children}
    </div>
  );
};

export default Card;
