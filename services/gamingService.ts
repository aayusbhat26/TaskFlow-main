import { db } from '@/lib/db';
import { 
  AchievementCategory, 
  AchievementType, 
  AchievementRarity,
  ChallengeType,
  ChallengeCategory,
  ChallengeDifficulty,
  StreakType,
  LeaderboardType,
  LeaderboardPeriod,
  PointType
} from '@prisma/client';

export class GamingService {
  // Level System
  static async calculateLevel(experience: number): Promise<number> {
    const settings = await this.getGameSettings();
    const baseXp = settings.experiencePerLevel;
    const multiplier = settings.experienceMultiplier;
    
    let level = 1;
    let requiredXp = baseXp;
    
    while (experience >= requiredXp && level < settings.maxLevel) {
      level++;
      requiredXp = Math.floor(baseXp * Math.pow(multiplier, level - 1));
    }
    
    return level;
  }

  static async getExperienceForLevel(level: number): Promise<number> {
    const settings = await this.getGameSettings();
    const baseXp = settings.experiencePerLevel;
    const multiplier = settings.experienceMultiplier;
    
    let totalXp = 0;
    for (let i = 1; i < level; i++) {
      totalXp += Math.floor(baseXp * Math.pow(multiplier, i - 1));
    }
    
    return totalXp;
  }

  static async levelUp(userId: string, newExperience: number): Promise<boolean> {
    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) return false;

    const newLevel = await this.calculateLevel(newExperience);
    
    if (newLevel > user.level) {
      const levelDifference = newLevel - user.level;
      const bonusPoints = levelDifference * 100; // 100 points per level

      await db.user.update({
        where: { id: userId },
        data: {
          level: newLevel,
          experience: newExperience,
          points: { increment: bonusPoints }
        }
      });

      // Award level up points
      await this.awardPoints(userId, bonusPoints, PointType.LEVEL_UP_BONUS, 
        `Level up bonus for reaching level ${newLevel}`);

      return true;
    }

    return false;
  }

  // Points System
  static async awardPoints(
    userId: string, 
    points: number, 
    type: PointType, 
    description: string
  ): Promise<void> {
    await db.$transaction(async (tx) => {
      // Update user points
      await tx.user.update({
        where: { id: userId },
        data: { points: { increment: points } }
      });

      // Record transaction
      await tx.pointTransaction.create({
        data: {
          userId,
          points,
          type,
          description
        }
      });
    });
  }

  static async awardExperience(
    userId: string, 
    experience: number, 
    description: string
  ): Promise<boolean> {
    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) return false;

    const newExperience = user.experience + experience;
    
    await db.user.update({
      where: { id: userId },
      data: { experience: newExperience }
    });

    // Check for level up
    return await this.levelUp(userId, newExperience);
  }

  // Achievement System
  static async checkAchievements(userId: string): Promise<string[]> {
    const user = await db.user.findUnique({
      where: { id: userId },
      include: {
        userAchievements: {
          include: { achievement: true }
        }
      }
    });

    if (!user) return [];

    const unlockedAchievements: string[] = [];
    const achievements = await db.achievement.findMany();

    for (const achievement of achievements) {
      const userAchievement = user.userAchievements.find(
        ua => ua.achievementId === achievement.id
      );

      // Skip if achievement is already completed
      if (userAchievement && userAchievement.isCompleted) continue;

      let currentProgress = 0;
      let shouldUnlock = false;

      // Calculate progress based on achievement category and specific achievement name
      switch (achievement.category) {
        case AchievementCategory.PRODUCTIVITY:
          if (achievement.name.includes('Task')) {
            currentProgress = user.totalTasksCompleted;
          } else if (achievement.name.includes('Pomodoro') || achievement.name.includes('Focus')) {
            currentProgress = user.totalPomodoroCompleted;
          } else if (achievement.name.includes('Note')) {
            // Use the totalNotesCreated field from user
            currentProgress = user.totalNotesCreated || 0;
          }
          break;
        
        case AchievementCategory.CONSISTENCY:
          if (achievement.name.includes('Streak')) {
            currentProgress = user.longestStreak;
          }
          break;

        case AchievementCategory.MASTERY:
          if (achievement.name.includes('Code') || achievement.name.includes('Algorithm') || achievement.name.includes('Data Structure')) {
            // DSA-related achievements - count completed DSA questions
            const dsaCompletedCount = await db.dSAProgress.count({
              where: {
                userId: user.id,
                status: 'COMPLETED'
              }
            });
            currentProgress = dsaCompletedCount;
          } else if (achievement.name.includes('Level')) {
            currentProgress = user.level;
          }
          break;

        case AchievementCategory.COLLABORATION:
          if (achievement.name.includes('Team Player')) {
            // Count workspaces user is part of
            const workspaceCount = await db.subscription.count({
              where: { userId: user.id }
            });
            currentProgress = workspaceCount;
          }
          break;

        case AchievementCategory.SOCIAL:
          if (achievement.name.includes('Social Butterfly')) {
            // Count chat messages sent by user
            const messageCount = await db.chatMessage.count({
              where: { authorId: user.id }
            });
            currentProgress = messageCount;
          }
          break;

        case AchievementCategory.SPECIAL:
          // Special achievements need custom logic
          if (achievement.name === 'Early Bird' || achievement.name === 'Night Owl') {
            // These are event-based, check if already unlocked
            currentProgress = userAchievement ? userAchievement.progress : 0;
          } else if (achievement.name === 'Weekend Warrior') {
            // For weekend warrior, we'll track this via the userAchievement progress
            currentProgress = userAchievement ? userAchievement.progress : 0;
          }
          break;

        default:
          currentProgress = 0;
      }

      shouldUnlock = currentProgress >= achievement.requirement;

      if (shouldUnlock) {
        await this.unlockAchievement(userId, achievement.id);
        unlockedAchievements.push(achievement.id);
      } else {
        // Update progress
        await db.userAchievement.upsert({
          where: {
            userId_achievementId: {
              userId,
              achievementId: achievement.id
            }
          },
          update: { progress: currentProgress },
          create: {
            userId,
            achievementId: achievement.id,
            progress: currentProgress
          }
        });
      }
    }

    return unlockedAchievements;
  }

  static async unlockAchievement(userId: string, achievementId: string): Promise<void> {
    const achievement = await db.achievement.findUnique({
      where: { id: achievementId }
    });

    if (!achievement) return;

    await db.$transaction(async (tx) => {
      // Mark achievement as completed
      await tx.userAchievement.upsert({
        where: {
          userId_achievementId: {
            userId,
            achievementId
          }
        },
        update: {
          isCompleted: true,
          progress: achievement.requirement,
          unlockedAt: new Date()
        },
        create: {
          userId,
          achievementId,
          isCompleted: true,
          progress: achievement.requirement,
          unlockedAt: new Date()
        }
      });

      // Award points
      await tx.user.update({
        where: { id: userId },
        data: { points: { increment: achievement.pointsReward } }
      });

      // Record point transaction
      await tx.pointTransaction.create({
        data: {
          userId,
          points: achievement.pointsReward,
          type: PointType.ACHIEVEMENT_UNLOCKED,
          description: `Achievement unlocked: ${achievement.name}`
        }
      });

      // Add badge if applicable
      if (achievement.badgeId) {
        const user = await tx.user.findUnique({ where: { id: userId } });
        if (user && !user.profileBadges.includes(achievement.badgeId)) {
          await tx.user.update({
            where: { id: userId },
            data: {
              profileBadges: {
                push: achievement.badgeId
              }
            }
          });
        }
      }
    });
  }

  // Streak System
  static async updateStreak(userId: string, streakType: StreakType): Promise<boolean> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const userStreak = await db.userStreak.findUnique({
      where: {
        userId_streakType: {
          userId,
          streakType
        }
      }
    });

    if (!userStreak) {
      // Create new streak
      await db.userStreak.create({
        data: {
          userId,
          streakType,
          currentCount: 1,
          longestCount: 1,
          lastActiveDate: today
        }
      });
      return true;
    }

    const lastActive = userStreak.lastActiveDate;
    if (!lastActive) {
      // First time updating this streak
      await db.userStreak.update({
        where: { id: userStreak.id },
        data: {
          currentCount: 1,
          longestCount: 1,
          lastActiveDate: today
        }
      });
      return true;
    }

    const daysDiff = Math.floor((today.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24));

    if (daysDiff === 0) {
      // Already updated today
      return false;
    } else if (daysDiff === 1) {
      // Continue streak
      const newCount = userStreak.currentCount + 1;
      const newLongest = Math.max(newCount, userStreak.longestCount);

      await db.userStreak.update({
        where: { id: userStreak.id },
        data: {
          currentCount: newCount,
          longestCount: newLongest,
          lastActiveDate: today
        }
      });

      // Update user's current and longest streak
      await db.user.update({
        where: { id: userId },
        data: {
          currentStreak: newCount,
          longestStreak: newLongest,
          lastActivityDate: today
        }
      });

      // Award streak bonus points
      if (newCount % 7 === 0) { // Weekly streak bonus
        const bonusPoints = Math.floor(newCount / 7) * 50;
        await this.awardPoints(userId, bonusPoints, PointType.STREAK_BONUS,
          `${newCount}-day streak bonus`);
      }

      return true;
    } else {
      // Streak broken, reset
      await db.userStreak.update({
        where: { id: userStreak.id },
        data: {
          currentCount: 1,
          lastActiveDate: today
        }
      });

      await db.user.update({
        where: { id: userId },
        data: {
          currentStreak: 1,
          lastActivityDate: today
        }
      });

      return true;
    }
  }

  // Leaderboard System
  static async updateLeaderboard(
    userId: string, 
    type: LeaderboardType, 
    score: number
  ): Promise<void> {
    const periods = [
      LeaderboardPeriod.DAILY,
      LeaderboardPeriod.WEEKLY,
      LeaderboardPeriod.MONTHLY,
      LeaderboardPeriod.ALL_TIME
    ];

    for (const period of periods) {
      const { start, end } = this.getPeriodDates(period);

      await db.leaderboardEntry.upsert({
        where: {
          userId_leaderboardType_period_periodStart: {
            userId,
            leaderboardType: type,
            period,
            periodStart: start
          }
        },
        update: {
          score: { increment: score },
          periodEnd: end
        },
        create: {
          userId,
          leaderboardType: type,
          period,
          score,
          rank: 0, // Will be calculated separately
          periodStart: start,
          periodEnd: end
        }
      });
    }

    // Recalculate rankings
    await this.recalculateRankings(type);
  }

  private static getPeriodDates(period: LeaderboardPeriod): { start: Date; end: Date } {
    const now = new Date();
    const start = new Date();
    const end = new Date();

    switch (period) {
      case LeaderboardPeriod.DAILY:
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      
      case LeaderboardPeriod.WEEKLY:
        const dayOfWeek = start.getDay();
        start.setDate(start.getDate() - dayOfWeek);
        start.setHours(0, 0, 0, 0);
        end.setDate(start.getDate() + 6);
        end.setHours(23, 59, 59, 999);
        break;
      
      case LeaderboardPeriod.MONTHLY:
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        end.setMonth(end.getMonth() + 1, 0);
        end.setHours(23, 59, 59, 999);
        break;
      
      case LeaderboardPeriod.ALL_TIME:
        start.setFullYear(2024, 0, 1);
        start.setHours(0, 0, 0, 0);
        end.setFullYear(2099, 11, 31);
        end.setHours(23, 59, 59, 999);
        break;
    }

    return { start, end };
  }

  private static async recalculateRankings(type: LeaderboardType): Promise<void> {
    const periods = [
      LeaderboardPeriod.DAILY,
      LeaderboardPeriod.WEEKLY,
      LeaderboardPeriod.MONTHLY,
      LeaderboardPeriod.ALL_TIME
    ];

    for (const period of periods) {
      const { start } = this.getPeriodDates(period);

      const entries = await db.leaderboardEntry.findMany({
        where: {
          leaderboardType: type,
          period,
          periodStart: start
        },
        orderBy: { score: 'desc' }
      });

      for (let i = 0; i < entries.length; i++) {
        await db.leaderboardEntry.update({
          where: { id: entries[i].id },
          data: { rank: i + 1 }
        });
      }
    }
  }

  // Special Achievement Tracking
  static async checkSpecialAchievements(userId: string, context: {
    action?: 'TASK_COMPLETED' | 'POMODORO_COMPLETED' | 'MESSAGE_SENT';
    timestamp?: Date;
    isWeekend?: boolean;
  }): Promise<void> {
    const { action, timestamp = new Date(), isWeekend } = context;
    
    if (action === 'TASK_COMPLETED') {
      const hour = timestamp.getHours();
      
      // Early Bird achievement (before 6 AM)
      if (hour < 6) {
        await this.unlockSpecialAchievement(userId, 'Early Bird');
      }
      
      // Night Owl achievement (after 10 PM)
      if (hour >= 22) {
        await this.unlockSpecialAchievement(userId, 'Night Owl');
      }
      
      // Weekend Warrior (if it's weekend)
      if (isWeekend) {
        await this.incrementSpecialAchievement(userId, 'Weekend Warrior');
      }
    }
  }

  private static async unlockSpecialAchievement(userId: string, achievementName: string): Promise<void> {
    const achievement = await db.achievement.findFirst({
      where: { name: achievementName }
    });
    
    if (!achievement) return;

    const userAchievement = await db.userAchievement.findUnique({
      where: {
        userId_achievementId: {
          userId,
          achievementId: achievement.id
        }
      }
    });

    if (!userAchievement || !userAchievement.isCompleted) {
      await this.unlockAchievement(userId, achievement.id);
    }
  }

  private static async incrementSpecialAchievement(userId: string, achievementName: string): Promise<void> {
    const achievement = await db.achievement.findFirst({
      where: { name: achievementName }
    });
    
    if (!achievement) return;

    const userAchievement = await db.userAchievement.findUnique({
      where: {
        userId_achievementId: {
          userId,
          achievementId: achievement.id
        }
      }
    });

    if (userAchievement && userAchievement.isCompleted) return;

    const newProgress = (userAchievement?.progress || 0) + 1;

    await db.userAchievement.upsert({
      where: {
        userId_achievementId: {
          userId,
          achievementId: achievement.id
        }
      },
      update: { progress: newProgress },
      create: {
        userId,
        achievementId: achievement.id,
        progress: newProgress
      }
    });

    if (newProgress >= achievement.requirement) {
      await this.unlockAchievement(userId, achievement.id);
    }
  }

  // Utility Methods
  static async getGameSettings() {
    let settings = await db.gameSettings.findFirst();
    
    if (!settings) {
      settings = await db.gameSettings.create({
        data: {}
      });
    }
    
    return settings;
  }

  static async getUserStats(userId: string) {
    const user = await db.user.findUnique({
      where: { id: userId },
      include: {
        userAchievements: {
          include: { achievement: true },
          where: { isCompleted: true }
        },
        userStreaks: true,
        leaderboardEntries: {
          where: {
            period: LeaderboardPeriod.ALL_TIME
          },
          orderBy: { rank: 'asc' }
        }
      }
    });

    if (!user) return null;

    const nextLevelXp = await this.getExperienceForLevel(user.level + 1);
    const currentLevelXp = await this.getExperienceForLevel(user.level);
    const progressToNextLevel = ((user.experience - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100;

    return {
      ...user,
      progressToNextLevel: Math.max(0, Math.min(100, progressToNextLevel)),
      nextLevelXp,
      currentLevelXp
    };
  }
}
