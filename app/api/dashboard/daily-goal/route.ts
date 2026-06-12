import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    
    // Get beginning of today
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    // Get end of today
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    // 1. Fetch completed tasks today
    const completedTasksCount = await db.task.count({
      where: {
        updatedAt: {
          gte: startOfToday,
          lte: endOfToday,
        },
        status: "DONE",
        workspace: {
          subscribers: {
            some: {
              userId,
            },
          },
        },
      },
    });

    // 2. Fetch completed pomodoros today
    const completedPomodorosCount = await db.pomodoroSession.count({
      where: {
        userId,
        completedAt: {
          gte: startOfToday,
          lte: endOfToday,
        },
      },
    });

    // 3. Fetch user's current streak
    const userStreak = await db.userStreak.findFirst({
      where: { userId },
    });

    const totalCompletedToday = completedTasksCount + completedPomodorosCount;
    // Default goal is 3 items
    const dailyGoal = 3;
    const progress = Math.min((totalCompletedToday / dailyGoal) * 100, 100);

    return NextResponse.json({
      tasksCompleted: completedTasksCount,
      pomodorosCompleted: completedPomodorosCount,
      totalCompleted: totalCompletedToday,
      dailyGoal,
      progress,
      currentStreak: userStreak?.streak || 0,
    });
  } catch (error) {
    console.error("Error fetching daily goal stats:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
