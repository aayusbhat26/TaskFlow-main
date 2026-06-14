"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import Picker from "@emoji-mart/react";
import data from "@emoji-mart/data";
import { useTheme } from "next-themes";
import { useLocale } from "next-intl";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";

interface Props {
  asChild?: boolean;
  className?: string;
  children: React.ReactNode;
  onSelectedEmoji: (emoji: string) => void;
  slide?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
  id?: string;
  onOpenChange?: (open: boolean) => void;
}

interface OnSelect {
  id: string;
  keywords: string[];
  name: string;
  native: string;
  shortcodes: string;
  unified: string;
}

export const EmojiSelector = ({
  asChild,
  className,
  children,
  onSelectedEmoji,
  slide,
  align,
  id,
}: Props) => {
  const { theme, setTheme, systemTheme } = useTheme();
  const locale = useLocale();
  const [open, setOpen] = useState(false);

  const emojiTheme = useMemo(() => {
    switch (theme) {
      case "dark":
        return "dark";
      case "light":
        return "light";
      case "system":
        return systemTheme;
    }
  }, [theme, systemTheme]);

  return (
    <DropdownMenu modal={false} open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        id={id}
        asChild={asChild}
        className={cn(
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background rounded-lg"
        )}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        {children}
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align={align || "center"} 
        side="bottom"
        sideOffset={8}
        className="z-[9999]"
      >
        <div className="emoji-picker">
          <Picker
            data={data}
            emojiSize={20}
            emojiButtonSize={32}
            theme={emojiTheme}
            locale={locale}
            onEmojiSelect={(e: OnSelect) => {
              onSelectedEmoji(e.unified);
              setOpen(false);
            }}
          />
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
