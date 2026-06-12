"use client";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { 
  Laptop, 
  Moon, 
  Sun, 
  Waves, 
  Trees, 
  Sunset, 
  StarIcon, 
  Cherry, 
  Zap, 
  Leaf, 
  Flower2, 
  Snowflake, 
  Flame,
  Crown
} from "lucide-react";

interface Props {
  theme: string;
  activeTheme?: string;
  onTheme: (theme: string) => void;
}

const getThemeIcon = (theme: string) => {
  switch (theme) {
    case "light": return Sun;
    case "dark": return Moon;
    case "system": return Laptop;
    case "ocean": return Waves;
    case "forest": return Trees;
    case "sunset": return Sunset;
    case "midnight": return StarIcon;
    case "cherry": return Cherry;
    case "cyber": return Zap;
    case "autumn": return Leaf;
    case "lavender": return Flower2;
    case "arctic": return Snowflake;
    case "volcano": return Flame;
    default: return Sun;
  }
};

const getThemeDescription = (theme: string) => {
  switch (theme) {
    case "light": return "Clean and bright interface";
    case "dark": return "Easy on the eyes";
    case "system": return "Follows your system preference";
    case "ocean": return "Cool blue ocean vibes";
    case "forest": return "Natural green forest tones";
    case "sunset": return "Warm orange sunset hues";
    case "midnight": return "Deep purple midnight mystery";
    case "cherry": return "Soft pink cherry blossom";
    case "cyber": return "Neon green cyberpunk energy";
    case "autumn": return "Warm earth autumn tones";
    case "lavender": return "Gentle purple lavender calm";
    case "arctic": return "Cool crystalline arctic blues";
    case "volcano": return "Fiery red volcanic passion";
    default: return "Custom theme";
  }
};

const getThemeColors = (theme: string) => {
  switch (theme) {
    case "light": 
      return { primary: "bg-blue-500", secondary: "bg-gray-100", accent: "bg-blue-100" };
    case "dark": 
      return { primary: "bg-blue-400", secondary: "bg-gray-800", accent: "bg-blue-900" };
    case "system": 
      return { primary: "bg-gray-600", secondary: "bg-gray-200", accent: "bg-gray-100" };
    case "ocean": 
      return { primary: "bg-cyan-500", secondary: "bg-cyan-50", accent: "bg-cyan-100" };
    case "forest": 
      return { primary: "bg-green-600", secondary: "bg-green-50", accent: "bg-green-100" };
    case "sunset": 
      return { primary: "bg-orange-500", secondary: "bg-orange-50", accent: "bg-purple-200" };
    case "midnight": 
      return { primary: "bg-purple-400", secondary: "bg-indigo-900", accent: "bg-purple-200" };
    case "cherry": 
      return { primary: "bg-pink-500", secondary: "bg-pink-50", accent: "bg-pink-100" };
    case "cyber": 
      return { primary: "bg-green-400", secondary: "bg-gray-900", accent: "bg-purple-400" };
    case "autumn": 
      return { primary: "bg-orange-600", secondary: "bg-orange-50", accent: "bg-yellow-200" };
    case "lavender": 
      return { primary: "bg-purple-400", secondary: "bg-purple-50", accent: "bg-purple-100" };
    case "arctic": 
      return { primary: "bg-blue-500", secondary: "bg-blue-50", accent: "bg-cyan-100" };
    case "volcano": 
      return { primary: "bg-red-500", secondary: "bg-red-50", accent: "bg-orange-200" };
    default: 
      return { primary: "bg-blue-500", secondary: "bg-gray-100", accent: "bg-blue-100" };
  }
};

export const ThemeCard = ({ theme, activeTheme, onTheme }: Props) => {
  const Icon = getThemeIcon(theme);
  const description = getThemeDescription(theme);
  const colors = getThemeColors(theme);
  
  return (
    <Card
      tabIndex={1}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          onTheme(theme);
        }
      }}
      onClick={() => onTheme(theme)}
      className={`${
        activeTheme === theme ? "ring-2 ring-primary border-primary" : "border-border"
      } hover:bg-accent hover:text-accent-foreground duration-200 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background transform hover:scale-105`}
    >
      <CardHeader className="flex flex-row items-center justify-between space-x-0 space-y-0 pb-3">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-full ${colors.primary} text-white`}>
            <Icon size={16} />
          </div>
          <CardTitle className="text-lg capitalize flex items-center gap-2">
            {theme === "system" ? "System" : theme}
            {!["light", "dark", "system"].includes(theme) && (
              <Crown size={16} className="text-yellow-500" />
            )}
          </CardTitle>
        </div>
        {activeTheme === theme && <Badge variant="default" className="text-xs">Active</Badge>}
      </CardHeader>
      <CardContent className="h-20 relative overflow-hidden">
        <div className="absolute inset-0 flex">
          <div className={`w-1/2 ${colors.secondary}`}></div>
          <div className={`w-1/4 ${colors.primary}`}></div>
          <div className={`w-1/4 ${colors.accent}`}></div>
        </div>
        <div className="absolute bottom-2 left-3 right-3">
          <div className={`h-2 ${colors.primary} rounded-full mb-1`}></div>
          <div className={`h-1 ${colors.accent} rounded-full w-3/4`}></div>
        </div>
      </CardContent>
      <CardFooter className="pt-3">
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardFooter>
    </Card>
  );
};
