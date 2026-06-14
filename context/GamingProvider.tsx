'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { useToast } from '@/hooks/use-toast';

interface GamingContextType {
  showAchievementUnlocked: (achievementName: string) => void;
  showLevelUp: (newLevel: number) => void;
  showPointsEarned: (points: number, reason: string) => void;
}

const GamingContext = createContext<GamingContextType | undefined>(undefined);

export function GamingProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const showAchievementUnlocked = useCallback((achievementName: string) => {
    toast({
      title: "🏆 Achievement Unlocked!",
      description: `You've unlocked: ${achievementName}`,
      duration: 5000,
    });
  }, []);

  const showLevelUp = useCallback((newLevel: number) => {
    toast({
      title: "🎊 LEVEL UP!",
      description: `Congratulations! You reached level ${newLevel}!`,
      duration: 7000,
    });
  }, []);

  const showPointsEarned = useCallback((points: number, reason: string) => {
    toast({
      title: "✨ Points Earned!",
      description: `+${points} points for ${reason}`,
      duration: 3000,
    });
  }, []);

  const value = {
    showAchievementUnlocked,
    showLevelUp,
    showPointsEarned,
  };

  return (
    <GamingContext.Provider value={value}>
      {children}
    </GamingContext.Provider>
  );
}

export function useGamingNotifications() {
  const context = useContext(GamingContext);
  if (context === undefined) {
    throw new Error('useGamingNotifications must be used within a GamingProvider');
  }
  return context;
}
