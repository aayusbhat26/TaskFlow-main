import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

interface UserSettings {
  soundsEnabled: boolean;
  soundVolume: number;
  taskCompletionSound: string;
  questionCompletionSound: string;
}

export function useUserSettings() {
  const { data: userSettings, isLoading, error } = useQuery({
    queryKey: ['userSettings'],
    queryFn: async (): Promise<UserSettings> => {
      try {
        const response = await axios.get('/api/user/settings');
        return response.data;
      } catch (error) {
        console.error('Failed to fetch user settings:', error);
        // Return default settings if fetch fails
        return {
          soundsEnabled: true,
          soundVolume: 0.5,
          taskCompletionSound: 'TASK_COMPLETE',
          questionCompletionSound: 'QUESTION_COMPLETE',
        };
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  return {
    userSettings,
    isLoading,
    error,
  };
}
