"use client";

import { useTheme } from "next-themes";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Moon, Sun, Crown } from "lucide-react";
import { useTranslations } from "next-intl";
import { HoverCard } from "../ui/hover-card";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

// Simple hover content component
const HoverCardContent = ({ children, align }: { children: React.ReactNode; align?: "center" | "start" | "end" }) => (
  <div className="absolute z-50 rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95">
    {children}
  </div>
);

interface Props {
  variant?:
    | "default"
    | "destructive"
    | "outline"
    | "secondary"
    | "ghost"
    | "link"
    | null;
  size?: "default" | "sm" | "lg" | "icon" | null;
  alignHover?: "center" | "start" | "end";
  alignDropdown?: "center" | "start" | "end";
}

export const ThemeSwitcher = ({
  size = "default",
  variant = "default",
  alignHover = "center",
  alignDropdown = "center",
}: Props) => {
  const { setTheme } = useTheme();
  const t = useTranslations("COMMON");
  const { data: session } = useSession();
  const router = useRouter();

  const handleThemeChange = (theme: string) => {
    const freeThemes = ['light', 'dark', 'system'];
    const plan = session?.user?.plan || 'FREE';
    
    if (!freeThemes.includes(theme) && plan === 'FREE') {
      alert("This theme is only available on the Pro or Business plans.");
      router.push('/upgrade');
      return;
    }
    setTheme(theme);
  };

  return (
    <HoverCard openDelay={250} closeDelay={250}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant={variant} size={size}>
            <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:-rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle Theme</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align={alignDropdown} className="max-h-80 overflow-y-auto">
          <DropdownMenuItem onClick={() => handleThemeChange("light")}>
            Light
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleThemeChange("dark")}>
            Dark
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleThemeChange("system")}>
            System
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleThemeChange("ocean")}>
            Ocean <Crown className="w-4 h-4 ml-auto text-yellow-500" />
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleThemeChange("forest")}>
            Forest <Crown className="w-4 h-4 ml-auto text-yellow-500" />
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleThemeChange("sunset")}>
            Sunset <Crown className="w-4 h-4 ml-auto text-yellow-500" />
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleThemeChange("midnight")}>
            Midnight <Crown className="w-4 h-4 ml-auto text-yellow-500" />
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleThemeChange("cherry")}>
            Cherry <Crown className="w-4 h-4 ml-auto text-yellow-500" />
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleThemeChange("cyber")}>
            Cyber <Crown className="w-4 h-4 ml-auto text-yellow-500" />
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleThemeChange("autumn")}>
            Autumn <Crown className="w-4 h-4 ml-auto text-yellow-500" />
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleThemeChange("lavender")}>
            Lavender <Crown className="w-4 h-4 ml-auto text-yellow-500" />
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleThemeChange("arctic")}>
            Arctic <Crown className="w-4 h-4 ml-auto text-yellow-500" />
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleThemeChange("volcano")}>
            Volcano <Crown className="w-4 h-4 ml-auto text-yellow-500" />
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <HoverCardContent align={alignHover}>
        <span>{t("THEME_HOVER")}</span>
      </HoverCardContent>
    </HoverCard>
  );
};
