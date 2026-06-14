'use client';

import { useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { PointType, StreakType, LeaderboardType } from '@prisma/client';

interface GamingAction {
  type: 'award_points' | 'award_experience' | 'update_streak' | 'check_achievements' | 'update_leaderboard';
  data: any;
}

export function useGaming() {
  const { toast } = useToast();
  const executeGamingAction = useCallback(async (action: GamingAction) => {
    try {
      const response = await fetch('/api/gaming/stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: action.type, data: action.data })
      });

      if (!response.ok) {
        throw new Error('Gaming action failed');
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Gaming action error:', error);
      return null;
    }
  }, []);

  const onTaskCompleted = useCallback(async (taskId: string, taskTitle: string) => {
    try {
      // Award points for task completion
      await executeGamingAction({
        type: 'award_points',
        data: {
          points: 20,
          type: PointType.TASK_COMPLETED,
          description: `Task completed: ${taskTitle}`
        }
      });

      // Award experience
      await executeGamingAction({
        type: 'award_experience',
        data: {
          experience: 15,
          description: `Experience for completing task: ${taskTitle}`
        }
      });

      // Update task completion streak
      await executeGamingAction({
        type: 'update_streak',
        data: { streakType: StreakType.TASK_COMPLETION }
      });

      // Update daily login streak
      await executeGamingAction({
        type: 'update_streak',
        data: { streakType: StreakType.DAILY_LOGIN }
      });

      // Check for achievement unlocks
      const achievementResult = await executeGamingAction({
        type: 'check_achievements',
        data: {}
      });

      // Show achievement notifications
      if (achievementResult?.unlockedAchievements?.length > 0) {
        toast({
          title: "🏆 Achievement Unlocked!",
          description: `You've unlocked ${achievementResult.unlockedAchievements.length} new achievement(s)!`,
          duration: 5000,
        });
      }

      // Show points earned notification
      toast({
        title: "✨ Points Earned!",
        description: `+20 points for completing "${taskTitle}"`,
        duration: 3000,
      });

    } catch (error) {
      console.error('Error processing task completion gaming actions:', error);
    }
  }, [executeGamingAction]);

  const onPomodoroCompleted = useCallback(async (sessionDuration: number, sessionType: string) => {
    try {
      const basePoints = 25;
      const bonusPoints = Math.floor(sessionDuration / 60) * 2; // 2 points per minute
      const totalPoints = basePoints + bonusPoints;

      // Award points for Pomodoro completion
      await executeGamingAction({
        type: 'award_points',
        data: {
          points: totalPoints,
          type: PointType.POMODORO_COMPLETED,
          description: `Pomodoro session completed (${sessionDuration} min)`
        }
      });

      // Award experience
      await executeGamingAction({
        type: 'award_experience',
        data: {
          experience: 20,
          description: `Experience for completing Pomodoro session`
        }
      });

      // Update Pomodoro streak
      await executeGamingAction({
        type: 'update_streak',
        data: { streakType: StreakType.POMODORO_SESSION }
      });

      // Update daily login streak
      await executeGamingAction({
        type: 'update_streak',
        data: { streakType: StreakType.DAILY_LOGIN }
      });

      // Check achievements
      const achievementResult = await executeGamingAction({
        type: 'check_achievements',
        data: {}
      });

      if (achievementResult?.unlockedAchievements?.length > 0) {
        toast({
          title: "🏆 Achievement Unlocked!",
          description: `You've unlocked ${achievementResult.unlockedAchievements.length} new achievement(s)!`,
          duration: 5000,
        });
      }

      toast({
        title: "🔥 Focus Completed!",
        description: `+${totalPoints} points for your ${sessionDuration}-minute focus session!`,
        duration: 3000,
      });

    } catch (error) {
      console.error('Error processing Pomodoro completion gaming actions:', error);
    }
  }, [executeGamingAction]);

  const onDSAQuestionCompleted = useCallback(async (questionTitle: string, difficulty: string) => {
    try {
      let points = 10; // Base points
      let experience = 8;

      // Bonus points based on difficulty
      switch (difficulty) {
        case 'EASY':
          points += 5;
          experience += 2;
          break;
        case 'MEDIUM':
          points += 15;
          experience += 5;
          break;
        case 'HARD':
          points += 30;
          experience += 10;
          break;
      }

      await executeGamingAction({
        type: 'award_points',
        data: {
          points,
          type: PointType.DSA_QUESTION_COMPLETED,
          description: `DSA question solved: ${questionTitle} (${difficulty})`
        }
      });

      await executeGamingAction({
        type: 'award_experience',
        data: {
          experience,
          description: `Experience for solving ${difficulty} DSA question`
        }
      });

      // Update DSA practice streak
      await executeGamingAction({
        type: 'update_streak',
        data: { streakType: StreakType.DSA_PRACTICE }
      });

      const achievementResult = await executeGamingAction({
        type: 'check_achievements',
        data: {}
      });

      if (achievementResult?.unlockedAchievements?.length > 0) {
        toast({
          title: "🏆 Achievement Unlocked!",
          description: `You've unlocked ${achievementResult.unlockedAchievements.length} new achievement(s)!`,
          duration: 5000,
        });
      }

      toast({
        title: "🧠 Problem Solved!",
        description: `+${points} points for solving "${questionTitle}" (${difficulty})`,
        duration: 3000,
      });

    } catch (error) {
      console.error('Error processing DSA question completion gaming actions:', error);
    }
  }, [executeGamingAction]);

  const onChatMessage = useCallback(async (messageContent: string) => {
    try {
      // Award small points for chat activity
      await executeGamingAction({
        type: 'award_points',
        data: {
          points: 2,
          type: PointType.COLLABORATION_BONUS,
          description: 'Chat message sent'
        }
      });

      // Update chat activity streak
      await executeGamingAction({
        type: 'update_streak',
        data: { streakType: StreakType.CHAT_ACTIVITY }
      });

    } catch (error) {
      console.error('Error processing chat message gaming actions:', error);
    }
  }, [executeGamingAction]);

  const onDailyLogin = useCallback(async () => {
    try {
      // Award daily login points
      await executeGamingAction({
        type: 'award_points',
        data: {
          points: 10,
          type: PointType.DAILY_LOGIN,
          description: 'Daily login bonus'
        }
      });

      // Update daily login streak
      const streakResult = await executeGamingAction({
        type: 'update_streak',
        data: { streakType: StreakType.DAILY_LOGIN }
      });

      // Check achievements
      await executeGamingAction({
        type: 'check_achievements',
        data: {}
      });

      if (streakResult?.updated) {
        toast({
          title: "🌟 Daily Login Bonus!",
          description: "+10 points for logging in today!",
          duration: 3000,
        });
      }

    } catch (error) {
      console.error('Error processing daily login gaming actions:', error);
    }
  }, [executeGamingAction]);

  const checkAndShowLevelUp = useCallback(async () => {
    try {
      const response = await fetch('/api/gaming/stats');
      const userData = await response.json();
      
      if (userData && userData.level) {
        // You could store the previous level in localStorage to detect level ups
        const previousLevel = localStorage.getItem('userLevel');
        const currentLevel = userData.level.toString();
        
        if (previousLevel && parseInt(previousLevel) < parseInt(currentLevel)) {
          toast({
            title: "🎊 LEVEL UP!",
            description: `Congratulations! You reached level ${currentLevel}!`,
            duration: 7000,
          });
        }
        
        localStorage.setItem('userLevel', currentLevel);
      }
    } catch (error) {
      console.error('Error checking level up:', error);
    }
  }, []);

  return {
    onTaskCompleted,
    onPomodoroCompleted,
    onDSAQuestionCompleted,
    onChatMessage,
    onDailyLogin,
    checkAndShowLevelUp,
    executeGamingAction
  };
}
