"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Target, Flame, CheckCircle2, Timer } from "lucide-react";
import { useTranslations } from "next-intl";

interface DailyGoalData {
  tasksCompleted: number;
  pomodorosCompleted: number;
  totalCompleted: number;
  dailyGoal: number;
  progress: number;
  currentStreak: number;
}

export function DailyGoalTracker() {
  const t = useTranslations("DASHBOARD");

  const { data, isLoading } = useQuery<DailyGoalData>({
    queryKey: ["dailyGoal"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard/daily-goal");
      return res.json();
    },
  });

  if (isLoading || !data) {
    return (
      <Card className="bg-background shadow-sm h-full flex flex-col border-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            Daily Goal
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex items-center justify-center">
          <div className="animate-pulse flex flex-col items-center">
            <div className="w-24 h-24 rounded-full bg-muted mb-4"></div>
            <div className="h-4 w-32 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { progress, totalCompleted, dailyGoal, tasksCompleted, pomodorosCompleted, currentStreak } = data;

  return (
    <Card className="bg-background shadow-sm h-full flex flex-col border-none">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Target className="w-5 h-5 text-primary" />
          Daily Goal
        </CardTitle>
        {currentStreak > 0 && (
          <div className="flex items-center gap-1 text-orange-500 font-semibold bg-orange-500/10 px-2 py-0.5 rounded-full text-sm">
            <Flame className="w-4 h-4 fill-orange-500" />
            {currentStreak}
          </div>
        )}
      </CardHeader>
      <CardContent className="flex-1 flex flex-col items-center justify-center p-6 pt-0">
        <div className="w-32 h-32 mb-6 relative flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            {/* Background track */}
            <circle
              cx="50"
              cy="50"
              r="40"
              fill="transparent"
              stroke="hsl(var(--muted))"
              strokeWidth="8"
            />
            {/* Progress trail */}
            <circle
              cx="50"
              cy="50"
              r="40"
              fill="transparent"
              stroke="hsl(var(--primary))"
              strokeWidth="8"
              strokeDasharray={`${2 * Math.PI * 40}`}
              strokeDashoffset={`${2 * Math.PI * 40 * (1 - progress / 100)}`}
              strokeLinecap="round"
              className="transition-all duration-1000 ease-out"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center font-bold text-xl">
            {totalCompleted}/{dailyGoal}
          </div>
        </div>

        <div className="w-full flex justify-between gap-4">
          <div className="flex-1 flex flex-col items-center p-3 rounded-lg bg-muted/50">
            <CheckCircle2 className="w-5 h-5 text-green-500 mb-1" />
            <span className="text-xl font-bold">{tasksCompleted}</span>
            <span className="text-xs text-muted-foreground text-center">Tasks</span>
          </div>
          <div className="flex-1 flex flex-col items-center p-3 rounded-lg bg-muted/50">
            <Timer className="w-5 h-5 text-blue-500 mb-1" />
            <span className="text-xl font-bold">{pomodorosCompleted}</span>
            <span className="text-xs text-muted-foreground text-center">Pomodoros</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
