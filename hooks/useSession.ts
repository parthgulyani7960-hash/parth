import React, { createContext, useContext, useState, useMemo, FC, ReactNode } from 'react';
import { AppFeature } from '../types';

type LastAction = {
    feature: AppFeature;
    prompt: string;
};

interface SessionContextType {
  lastAction: LastAction | null;
  setLastAction: (action: LastAction) => void;
  themeOfTheDay: string;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

const creativeThemes = [
    "Enchanted Forest", "Cyberpunk Megacity", "Cosmic Ocean",
    "Steampunk Workshop", "Underwater Kingdom", "Haunted Mansion",
    "Post-Apocalyptic Wasteland", "Solarpunk Utopia", "Ancient Desert Ruins"
];

export const SessionProvider: FC<{ children: ReactNode }> = ({ children }) => {
    const [lastAction, setLastAction] = useState<LastAction | null>(null);
    
    const themeOfTheDay = useMemo(() => {
        return creativeThemes[Math.floor(Math.random() * creativeThemes.length)];
    }, []);

    const value = {
        lastAction,
        setLastAction,
        themeOfTheDay
    };

    // FIX: Replaced JSX syntax with React.createElement to avoid parsing errors in a .ts file.
    // JSX syntax should only be used in .tsx files.
    return React.createElement(
        SessionContext.Provider,
        { value: value },
        children
      );
};

export const useSession = () => {
    const context = useContext(SessionContext);
    if (context === undefined) {
        throw new Error('useSession must be used within a SessionProvider');
    }
    return context;
};