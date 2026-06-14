"use client";

import { Check, Globe, LogOut, Moon, Settings2, Sun } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { UserAvatar } from "../ui/user-avatar";
import { useTheme } from "next-themes";
import { useChangeLocale } from "@/hooks/useChangeLocale";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { signOut } from "next-auth/react";
import Image from "next/image";
import { getUserDisplayName } from "@/lib/userUtils";
import { cn, getRandomColor } from "@/lib/utils";

interface Props {
  profileImage?: string | null;
  username: string;
  email: string;
  name?: string | null;
  surname?: string | null;
}

export const User = ({ profileImage, username, email, name, surname }: Props) => {
  const { theme, setTheme } = useTheme();
  const { onSelectChange } = useChangeLocale();
  const lang = useLocale();
  const t = useTranslations("COMMON");

  const user = { name, surname, username, email, image: profileImage };
  const displayName = getUserDisplayName(user);
  const initials = displayName.charAt(0).toUpperCase();

  const logOutHandler = () => {
    signOut({
      callbackUrl: `${window.location.origin}/${lang}`,
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background ml-2">
        <UserAvatar
          className="w-10 h-10"
          profileImage={profileImage}
          fallbackText={initials}
          userId={user.username || user.email}
        />
      </DropdownMenuTrigger>
             <DropdownMenuContent align="end" sideOffset={10} className="w-64 z-50 relative">
        <div className="flex items-center gap-3 p-3">
          {profileImage ? (
            <Image
              src={profileImage}
              alt="profile image"
              className="w-10 h-10 rounded-full object-cover"
              width={40}
              height={40}
            />
          ) : (
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium text-white",
              getRandomColor(user.username || user.email)
            )}>
              {initials}
            </div>
          )}

          <div className="flex-1 min-w-0">
            <DropdownMenuLabel className="text-sm font-medium truncate">
              {displayName}
            </DropdownMenuLabel>
            <DropdownMenuLabel className="text-xs text-muted-foreground font-normal truncate">
              {email}
            </DropdownMenuLabel>
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="cursor-pointer gap-2 px-3 py-2">
              <Moon size={16} className="hidden dark:inline-block" />
              <Sun size={16} className="dark:hidden" />
              <span>{t("THEME_HOVER")}</span>
            </DropdownMenuSubTrigger>
                         <DropdownMenuPortal>
               <DropdownMenuSubContent sideOffset={10} className="w-48" align="start" side="right">
                 <DropdownMenuItem
                   onClick={() => {
                     setTheme("dark");
                   }}
                   className="flex justify-between items-center cursor-pointer px-3 py-2"
                 >
                   <span>{t("DARK")}</span>
                   {theme === "dark" && <Check size={14} />}
                 </DropdownMenuItem>
                 <DropdownMenuItem
                   onClick={() => {
                     setTheme("light");
                   }}
                   className="flex justify-between items-center cursor-pointer px-3 py-2"
                 >
                   <span>{t("LIGHT")}</span>
                   {theme === "light" && <Check size={14} />}
                 </DropdownMenuItem>
                 <DropdownMenuItem
                   onClick={() => {
                     setTheme("system");
                   }}
                   className="flex justify-between items-center cursor-pointer px-3 py-2"
                 >
                   <span>{t("SYSTEM")}</span>
                   {theme === "system" && <Check size={14} />}
                 </DropdownMenuItem>
               </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="cursor-pointer gap-2 px-3 py-2">
              <Globe size={16} />
              <span>{t("LANG_HOVER")}</span>
            </DropdownMenuSubTrigger>
                         <DropdownMenuPortal>
               <DropdownMenuSubContent sideOffset={10} className="w-48" align="start" side="right">
                 <DropdownMenuItem
                   onClick={() => {
                     onSelectChange("en");
                   }}
                   className="flex justify-between items-center cursor-pointer px-3 py-2"
                 >
                   <span>English</span>
                   {lang === "en" && <Check size={14} />}
                 </DropdownMenuItem>
                 <DropdownMenuItem
                   onClick={() => {
                     onSelectChange("te");
                   }}
                   className="flex justify-between items-center cursor-pointer px-3 py-2"
                 >
                   <span>Telugu</span>
                   {lang === "te" && <Check size={14} />}
                 </DropdownMenuItem>
               </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>
          <DropdownMenuItem className="cursor-pointer gap-2 px-3 py-2">
            <Link href={"/dashboard/settings"} className="flex gap-2 items-center w-full">
              <Settings2 size={16} /> {t("SETTINGS")}
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={logOutHandler}
          className="cursor-pointer gap-2 px-3 py-2"
        >
          <LogOut size={16} />
          {t("LOG_OUT")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
