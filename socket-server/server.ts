import { createServer } from "http";
import { Server } from "socket.io";
import { PrismaClient } from "@prisma/client";
import { config } from "dotenv";
import { existsSync } from "fs";

if (existsSync(".env")) {
  config();
} else if (existsSync("../.env")) {
  config({ path: "../.env" });
} else {
  config();
}
const prisma = new PrismaClient();

const httpServer = createServer((req, res) => {
  if (req.url === "/healthz") {
    res.writeHead(200);
    res.end("OK");
  } else {
    // Handle other HTTP requests or return 404
    res.writeHead(404);
    res.end();
  }
});

const io = new Server(httpServer, {
  cors: {
    origin: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ["websocket", "polling"],
});

// Store active users and their workspaces
const activeUsers = new Map<
  string,
  { userId: string; username: string; socketId: string; workspaceId?: string }
>();

io.on("connection", (socket) => {
  console.log(`✅ User connected: ${socket.id}`);

  // Authenticate
  socket.on("authenticate", (data: { userId: string; username: string }) => {
    activeUsers.set(socket.id, {
      userId: data.userId,
      username: data.username,
      socketId: socket.id,
    });
    console.log(`🔐 Authenticated user ${data.username} (${data.userId})`);
  });

  // Join workspace
  socket.on("join-workspace", (data: { workspaceId: string }) => {
    const user = activeUsers.get(socket.id);
    console.log(`🔌 join-workspace requested for room workspace:${data.workspaceId} by user:`, user);
    if (!user) {
      socket.emit("error", { message: "User not authenticated" });
      return;
    }

    // If already in this workspace, do nothing
    if (user.workspaceId === data.workspaceId) {
      return;
    }

    if (user.workspaceId) {
      socket.leave(`workspace:${user.workspaceId}`);
    }

    socket.join(`workspace:${data.workspaceId}`);
    user.workspaceId = data.workspaceId;
    activeUsers.set(socket.id, user);

    socket.to(`workspace:${data.workspaceId}`).emit("user-joined", {
      userId: user.userId,
      username: user.username,
    });
  });

  // Leave workspace
  socket.on("leave-workspace", (data: { workspaceId: string }) => {
    const user = activeUsers.get(socket.id);
    if (!user) return;

    socket.leave(`workspace:${data.workspaceId}`);
    user.workspaceId = undefined;
    activeUsers.set(socket.id, user);

    socket.to(`workspace:${data.workspaceId}`).emit("user-left", {
      userId: user.userId,
      username: user.username,
    });
  });

  // Media presence
  socket.on("user-joined-media", (data: { room: string; userId: string; username: string; name: string; image?: string }) => {
    socket.to(`workspace:${data.room}`).emit("user-joined-media", data);
  });

  socket.on("user-left-media", (data: { room: string; userId: string }) => {
    socket.to(`workspace:${data.room}`).emit("user-left-media", data);
  });

  socket.on("request-media-presence", (data: { room: string }) => {
    socket.to(`workspace:${data.room}`).emit("request-media-presence", data);
  });

  // WebRTC Signaling
  socket.on("rtc-offer", (data: { targetUserId: string; callerUserId: string; sdp: any; room: string }) => {
    socket.to(`workspace:${data.room}`).emit("rtc-offer", data);
  });

  socket.on("rtc-answer", (data: { targetUserId: string; callerUserId: string; sdp: any; room: string }) => {
    socket.to(`workspace:${data.room}`).emit("rtc-answer", data);
  });

  socket.on("rtc-ice-candidate", (data: { targetUserId: string; senderUserId: string; candidate: any; room: string }) => {
    socket.to(`workspace:${data.room}`).emit("rtc-ice-candidate", data);
  });

  socket.on("media-state-change", (data: { userId: string; isMuted: boolean; isVideoOn: boolean; isScreenSharing: boolean; room: string }) => {
    socket.to(`workspace:${data.room}`).emit("media-state-change", data);
  });

  socket.on("rtc-ready", (data: { userId: string; room: string }) => {
    console.log(`📡 rtc-ready from ${data.userId} in room ${data.room}`);
    socket.to(`workspace:${data.room}`).emit("rtc-ready", data);
  });

  // Broadcast new message (without DB)
  socket.on(
    "message-created",
    (data: { workspaceId: string; message: any }) => {
      const user = activeUsers.get(socket.id);
      if (!user) return;

      io.to(`workspace:${data.workspaceId}`).emit("new-message", data.message);
    }
  );

  // Save & broadcast message (with DB)
  socket.on(
    "send-message",
    async (data: { workspaceId: string; content: string }) => {
      const user = activeUsers.get(socket.id);
      if (!user) {
        socket.emit("error", { message: "User not authenticated" });
        return;
      }

      try {
        const message = await prisma.chatMessage.create({
          data: {
            content: data.content,
            authorId: user.userId,
            workspaceId: data.workspaceId,
          },
          include: {
            author: {
              select: { id: true, name: true, username: true, image: true },
            },
          },
        });

        io.to(`workspace:${data.workspaceId}`).emit("new-message", message);
      } catch (error) {
        console.error("❌ Send message error:", error);
        socket.emit("error", { message: "Failed to send message" });
      }
    }
  );

  // Broadcast reactions
  socket.on("reaction-updated", (data: { workspaceId: string; messageId: string; emoji: string; user: any; status: string }) => {
    const user = activeUsers.get(socket.id);
    console.log(`⚡ reaction-updated received:`, data, `by authenticated user:`, user);
    if (!user) {
      console.log(`❌ reaction-updated blocked: User not authenticated for socket.id: ${socket.id}`);
      return;
    }

    io.to(`workspace:${data.workspaceId}`).emit("reaction-updated", data);
  });

  // Typing indicators
  socket.on("typing-start", (data: { workspaceId: string }) => {
    const user = activeUsers.get(socket.id);
    if (!user) return;
    io.to(`workspace:${data.workspaceId}`).emit("user-typing", {
      userId: user.userId,
      username: user.username,
      isTyping: true
    });
  });

  socket.on("typing-stop", (data: { workspaceId: string }) => {
    const user = activeUsers.get(socket.id);
    if (!user) return;
    io.to(`workspace:${data.workspaceId}`).emit("user-typing", {
      userId: user.userId,
      username: user.username,
      isTyping: false
    });
  });

  // Edit and Delete Messages
  socket.on("message-edited", (data: { workspaceId: string; message: any }) => {
    const user = activeUsers.get(socket.id);
    if (!user) return;
    io.to(`workspace:${data.workspaceId}`).emit("message-edited", data.message);
  });

  socket.on("message-deleted", (data: { workspaceId: string; messageId: string }) => {
    const user = activeUsers.get(socket.id);
    if (!user) return;
    io.to(`workspace:${data.workspaceId}`).emit("message-deleted", data.messageId);
  });

  socket.on("messages-read", (data: { workspaceId: string; messageIds: string[]; readByUserId: string }) => {
    const user = activeUsers.get(socket.id);
    console.log(`⚡ messages-read received:`, data, `by authenticated user:`, user);
    if (!user) {
      console.log(`❌ messages-read blocked: User not authenticated for socket.id: ${socket.id}`);
      return;
    }
    io.to(`workspace:${data.workspaceId}`).emit("messages-read", data);
  });

  // Note events
  socket.on("note-created", (data: { workspaceId: string; note: any }) => {
    const user = activeUsers.get(socket.id);
    if (!user) return;
    // Broadcast to others in the workspace/group
    socket.to(`workspace:${data.workspaceId}`).emit("note-created", data.note);
  });

  socket.on("note-updated", (data: { workspaceId: string; note: any }) => {
    const user = activeUsers.get(socket.id);
    if (!user) return;
    socket.to(`workspace:${data.workspaceId}`).emit("note-updated", data.note);
  });

  socket.on("note-deleted", (data: { workspaceId: string; noteId: string }) => {
    const user = activeUsers.get(socket.id);
    if (!user) return;
    socket
      .to(`workspace:${data.workspaceId}`)
      .emit("note-deleted", data.noteId);
  });

  // Mindmap Collaboration
  socket.on("mindmap-cursor-move", (data: { workspaceId: string; x: number; y: number; user: any }) => {
    socket.to(`workspace:${data.workspaceId}`).emit("mindmap-cursor-move", data);
  });

  socket.on("mindmap-nodes-change", (data: { workspaceId: string; changes: any[] }) => {
    socket.to(`workspace:${data.workspaceId}`).emit("mindmap-nodes-change", data.changes);
  });

  socket.on("mindmap-edges-change", (data: { workspaceId: string; changes: any[] }) => {
    socket.to(`workspace:${data.workspaceId}`).emit("mindmap-edges-change", data.changes);
  });

  socket.on("mindmap-sync", (data: { workspaceId: string; flow: any }) => {
    socket.to(`workspace:${data.workspaceId}`).emit("mindmap-sync", data.flow);
  });

  // Disconnect
  socket.on("disconnect", () => {
    const user = activeUsers.get(socket.id);
    if (user) {
      if (user.workspaceId) {
        socket.to(`workspace:${user.workspaceId}`).emit("user-left", {
          userId: user.userId,
          username: user.username,
        });
      }
      activeUsers.delete(socket.id);
    }
    console.log(`❌ User disconnected: ${socket.id}`);
  });

  socket.on("error", (error) => {
    console.error("❌ Socket error:", error);
  });
});

const PORT = process.env.PORT || process.env.SOCKET_PORT || 8080;

httpServer.listen(PORT, () => {
  console.log(`🚀 Chat server running on port ${PORT}`);
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("🛑 Shutting down...");
  await prisma.$disconnect();
  io.close();
  httpServer.close();
});

process.on("SIGINT", async () => {
  console.log("🛑 Interrupted, shutting down...");
  await prisma.$disconnect();
  io.close();
  httpServer.close();
});
