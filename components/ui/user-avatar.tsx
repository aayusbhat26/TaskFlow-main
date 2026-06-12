"use client";

import { cn, getRandomColor } from "@/lib/utils";
import { User } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

interface Props {
  size?: number;
  className?: string;
  profileImage?: string | null;
  fallbackText?: string;
  userId?: string;
}

export const UserAvatar = ({
  className,
  profileImage,
  size = 16,
  fallbackText,
  userId
}: Props) => {
  const [imageError, setImageError] = useState(false);

  return (
    <div
      className={cn(
        "h-16 w-16 bg-muted rounded-full flex justify-center items-center text-muted-foreground relative overflow-hidden",
        className
      )}
    >
      {profileImage && !imageError ? (
        <Image src={profileImage} fill alt="Profile Avatar" priority onError={() => setImageError(true)} />
      ) : fallbackText ? (
        <span className={cn(
          "text-sm font-medium text-white w-full h-full flex items-center justify-center rounded-full",
          userId ? getRandomColor(userId) : "bg-primary"
        )}>
          {fallbackText}
        </span>
      ) : (
        <User size={size} />
      )}
    </div>
  );
};
