"use client";

import { UserAvatar } from "@/components/ui/user-avatar";
import { useTruncateText } from "@/hooks/useTruncateText";

interface Props {
  image: string | null;
  username: string;
  maxText?: number;
  active?: boolean;
}

export const UserStatus = ({ image, username, maxText, active }: Props) => {
  const name = useTruncateText(username, maxText!);
  return (
    <div
      className={`flex items-center bg-background gap-2 hover:bg-accent rounded-sm px-2 py-1 duration-200 transition-colors ${
        !active ? "opacity-50" : ""
      }`}
    >
      <div className="relative">
        <UserAvatar
          className="w-8 h-8 sm:w-10 sm:h-10"
          profileImage={image}
          fallbackText={username ? username[0].toUpperCase() : "?"}
          userId={username}
          size={14}
        />
        {active && (
          <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-border shadow-sm border-2 bg-primary"></div>
        )}
      </div>
      <p className="text-primary text-sm sm:text-base break-words">{name}</p>
    </div>
  );
};
