import React, { createContext, useContext, useState, useCallback, useRef, FC, ReactNode } from 'react';

type SoundType = 'click' | 'hover' | 'toggle' | 'open' | 'close';

interface SoundContextType {
  isSoundEnabled: boolean;
  setIsSoundEnabled: (enabled: boolean) => void;
  playSound: (type: SoundType) => void;
}

const SoundContext = createContext<SoundContextType | undefined>(undefined);

let audioContext: AudioContext | null = null;
const getAudioContext = () => {
  if (!audioContext || audioContext.state === 'closed') {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioContext;
};


export const SoundProvider: FC<{children: ReactNode}> = ({ children }) => {
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);
  const gainNodeRef = useRef<GainNode | null>(null);

  const playSound = useCallback((type: SoundType) => {
    if (!isSoundEnabled) return;
    try {
      const ctx = getAudioContext();
       if (ctx.state === 'suspended') {
        ctx.resume();
      }
      
      if (!gainNodeRef.current) {
        gainNodeRef.current = ctx.createGain();
        gainNodeRef.current.connect(ctx.destination);
      }
      const gainNode = gainNodeRef.current;
      
      const oscillator = ctx.createOscillator();
      oscillator.connect(gainNode);

      switch (type) {
        case 'click':
          gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
          oscillator.type = 'sine';
          oscillator.frequency.setValueAtTime(880, ctx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.1);
          oscillator.start(ctx.currentTime);
          oscillator.stop(ctx.currentTime + 0.1);
          break;
        case 'hover':
          gainNode.gain.setValueAtTime(0.05, ctx.currentTime);
          oscillator.type = 'square';
          oscillator.frequency.setValueAtTime(1500, ctx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.05);
          oscillator.start(ctx.currentTime);
          oscillator.stop(ctx.currentTime + 0.05);
          break;
        default:
          break;
      }
    } catch (e) {
        console.error("Could not play sound", e);
    }
  }, [isSoundEnabled]);

  // FIX: Replaced JSX with React.createElement to be compatible with a .ts file extension.
  // JSX syntax is not supported in .ts files by default.
  return React.createElement(
    SoundContext.Provider,
    { value: { isSoundEnabled, setIsSoundEnabled, playSound } },
    children
  );
};

export const useSound = () => {
  const context = useContext(SoundContext);
  if (context === undefined) {
    throw new Error('useSound must be used within a SoundProvider');
  }
  return context;
};
