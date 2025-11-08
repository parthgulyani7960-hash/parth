import React, { createContext, useContext, useState, useMemo, FC, ReactNode } from 'react';
import { AppFeature, ScriptScene } from '../types';

type LastAction = {
    feature: AppFeature;
    prompt: string;
};

interface SessionContextType {
  lastAction: LastAction | null;
  setLastAction: (action: LastAction) => void;
  themeOfTheDay: string;
  scriptForVideo: ScriptScene[] | null;
  setScriptForVideo: (scenes: ScriptScene[] | null) => void;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

const creativeThemes = [
    "Enchanted Forest", "Cyberpunk Megacity", "Cosmic Ocean",
    "Steampunk Workshop", "Underwater Kingdom", "Haunted Mansion",
    "Post-Apocalyptic Wasteland", "Solarpunk Utopia", "Ancient Desert Ruins"
];

export const SessionProvider: FC<{ children: ReactNode }> = ({ children }) => {
    const [lastAction, setLastAction] = useState<LastAction | null>(null);
    const [scriptForVideo, setScriptForVideo] = useState<ScriptScene[] | null>(null);
    
    const themeOfTheDay = useMemo(() => {
        return creativeThemes[Math.floor(Math.random() * creativeThemes.length)];
    }, []);

    const value = {
        lastAction,
        setLastAction,
        themeOfTheDay,
        scriptForVideo,
        setScriptForVideo,
    };

    // FIX: Replaced JSX with React.createElement to be compatible with a .ts file extension.
    // JSX syntax is not supported in .ts files by default.
    return React.createElement(SessionContext.Provider, { value: value }, children);
};

export const useSession = () => {
    const context = useContext(SessionContext);
    if (context === undefined) {
        throw new Error('useSession must be used within a SessionProvider');
    }
    return context;
};
