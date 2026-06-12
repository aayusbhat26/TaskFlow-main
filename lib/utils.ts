import { clsx, type ClassValue } from "clsx";
import {
  CalendarDays,
  Clock,
  Home,
  Star,
  User,
  FileText,
  Code,
  Target,
  Trophy,
} from "lucide-react";
import { twMerge } from "tailwind-merge";
import dayjs from "dayjs";
import { array } from "zod";

export function truncateText(text: string, maxLength: number) {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "...";
}

export function unifiedToNative(unified: string) {
  const codePoints = unified.split("-").map((u) => parseInt(u, 16));
  return String.fromCodePoint(...codePoints);
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const pathsToSoundEffects = {
  ANALOG: "/music/analog.mp3",
  BELL: "/music/bell.mp3",
  BIRD: "/music/bird.mp3",
  CHURCH_BELL: "/music/churchBell.mp3",
  DIGITAL: "/music/digital.mp3",
  FANCY: "/music/fancy.mp3",
} as const;

export const topSidebarLinks = [
  {
    href: "/dashboard",
    Icon: Home,
    hoverTextKey: "HOME_HOVER",
    prefetch: true,
  },
  {
    href: "/dashboard/notes",
    Icon: FileText,
    hoverTextKey: "NOTES_HOVER",
    prefetch: true,
  },
  {
    href: "/dashboard/pomodoro",
    include: "/dashboard/pomodoro",
    Icon: Clock,
    hoverTextKey: "POMODORO_HOVER",
    prefetch: true,
  },
  {
    href: "/dashboard/calendar",
    Icon: CalendarDays,
    hoverTextKey: "CALENDAR_HOVER",
    prefetch: true,
  },
  {
    href: "/dashboard/starred",
    Icon: Star,
    hoverTextKey: "STARRED_HOVER",
    prefetch: true,
  },
  {
    href: "/dsa",
    Icon: Target,
    hoverTextKey: "DSA_HOVER",
    prefetch: true,
  },
  {
    href: "/gaming",
    Icon: Trophy,
    hoverTextKey: "GAMING_HOVER",
    prefetch: true,
  },
  {
    href: "/dashboard/assigned-to-me",
    Icon: User,
    hoverTextKey: "ASSIGNED_TO_ME_HOVER",
    prefetch: true,
  },
];

export const getMonth = (month = dayjs().month()) => {
  const year = dayjs().year();

  const firstDayOfMonth = dayjs(new Date(year, month, 1)).day();

  let currentMonthCount = 1 - firstDayOfMonth;

  const daysMatrix = new Array(5).fill([]).map((_, weekIdx) => {
    return new Array(7).fill(null).map((_, dayIdx) => {
      currentMonthCount++;
      const date = dayjs(new Date(year, month, currentMonthCount));
      return {
        date,
        mapIndex: { weekIdx, dayIdx },
      };
    });
  });

  if (firstDayOfMonth === 1) {
    const firstWeek = daysMatrix[0];
    const previousMonth = month === 0 ? 11 : month - 1;
    const previousYear = month === 0 ? year - 1 : year;
    const lastDayOfPreviousMonth = dayjs(
      new Date(year, previousMonth + 1, 0)
    ).date();

    for (let i = 7 - firstWeek.length; i > 0; i--) {
      const day = lastDayOfPreviousMonth - i + 1;
      // Always return an object with date and mapIndex
      firstWeek.unshift({
        date: dayjs(new Date(previousYear, previousMonth, day)),
        mapIndex: { weekIdx: 0, dayIdx: i - 1 },
      });
    }
  }

  return daysMatrix;
};

export const scrollToHash = (elementId: string) => {
  const element = document.getElementById(elementId);
  element?.scrollIntoView({
    behavior: "smooth",
    block: "center",
    inline: "nearest",
  });
};

export const getRandomColor = (id: string) => {
  const colors = [
    "bg-red-500",
    "bg-orange-500",
    "bg-amber-500",
    "bg-yellow-500",
    "bg-lime-500",
    "bg-green-500",
    "bg-emerald-500",
    "bg-teal-500",
    "bg-cyan-500",
    "bg-sky-500",
    "bg-blue-500",
    "bg-indigo-500",
    "bg-violet-500",
    "bg-purple-500",
    "bg-fuchsia-500",
    "bg-pink-500",
    "bg-rose-500",
  ];

  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }

  return colors[Math.abs(hash) % colors.length];
};
