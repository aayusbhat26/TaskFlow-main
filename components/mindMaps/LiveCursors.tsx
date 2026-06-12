import React from "react";
import { motion } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ReactFlowInstance } from "reactflow";

interface Cursor {
  x: number;
  y: number;
  user: {
    id: string;
    name: string;
    image: string;
  };
}

export const LiveCursors = ({ cursors, rfInstance }: { cursors: Map<string, Cursor>, rfInstance: ReactFlowInstance | null }) => {
  if (!rfInstance) return null;
  const { x: vx, y: vy, zoom } = rfInstance.getViewport();

  return (
    <>
      {Array.from(cursors.entries()).map(([socketId, cursor]) => {
        // Transform graph coordinates back to screen coordinates
        const screenX = cursor.x * zoom + vx;
        const screenY = cursor.y * zoom + vy;

        return (
          <motion.div
            key={socketId}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{
              opacity: 1,
              scale: 1,
              x: screenX,
              y: screenY,
            }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{
              type: "spring",
              damping: 25,
              stiffness: 300,
              mass: 0.5,
            }}
            className="absolute top-0 left-0 pointer-events-none z-50 flex flex-col items-start justify-start"
          >
            {/* Custom SVG pointer */}
            <svg
              width="24"
              height="36"
              viewBox="0 0 24 36"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="drop-shadow-md text-primary fill-primary"
              style={{ transform: "translate(-2px, -2px)" }}
            >
              <path
                d="M5.65376 12.3673H5.46026L5.31717 12.4976L0.500002 16.8829L0.500002 1.19841L11.7841 12.3673H5.65376Z"
                fill="currentColor"
              />
            </svg>

            {/* User profile picture */}
            <div className="absolute top-6 left-4 flex flex-col items-center">
              <Avatar className="w-8 h-8 border-2 border-primary shadow-sm bg-background">
                <AvatarImage src={cursor.user.image} alt={cursor.user.name} />
                <AvatarFallback className="text-[10px] font-bold">
                  {cursor.user.name ? cursor.user.name.slice(0, 2).toUpperCase() : "??"}
                </AvatarFallback>
              </Avatar>
              <div className="mt-1 bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded-sm font-semibold shadow-sm whitespace-nowrap">
                {cursor.user.name}
              </div>
            </div>
          </motion.div>
        );
      })}
    </>
  );
};
