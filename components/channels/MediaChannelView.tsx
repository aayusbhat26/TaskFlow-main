"use client";

import { useSocket } from "@/context/SocketProvider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Video, VideoOff, MonitorUp, PhoneOff, Users, X, MonitorOff } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { cn, getRandomColor } from "@/lib/utils";
import { Channel, Workspace } from "@prisma/client";
import { useWebRTC } from "@/hooks/useWebRTC";

interface CurrentUser {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  username: string;
}

interface MediaChannelViewProps {
  channel: Channel;
  workspace: Workspace & { _count: { subscribers: number } };
  currentUser: CurrentUser;
  onOpenMobileMenu?: () => void;
}

// Video renderer
function VideoRenderer({ stream, muted, className }: { stream: MediaStream; muted: boolean; className?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = stream;
  }, [stream]);
  return <video ref={videoRef} autoPlay playsInline muted={muted} className={cn("w-full h-full object-cover", className)} />;
}

// Audio renderer (invisible)
function AudioRenderer({ stream }: { stream: MediaStream }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  useEffect(() => {
    if (audioRef.current) audioRef.current.srcObject = stream;
  }, [stream]);
  return <audio ref={audioRef} autoPlay />;
}

export function MediaChannelView({ channel, workspace, currentUser, onOpenMobileMenu }: MediaChannelViewProps) {
  const { socket, isConnected, joinWorkspace, leaveWorkspace } = useSocket();
  const [participants, setParticipants] = useState<CurrentUser[]>([]);
  const [showParticipantsPanel, setShowParticipantsPanel] = useState(false);
  const roomKey = `media:${channel.id}`;

  const {
    localStream,
    remoteStreams,
    peerStates,
    isMuted,
    isVideoOn,
    isScreenSharing,
    toggleMute,
    toggleVideo,
    toggleScreenShare
  } = useWebRTC(socket, roomKey, currentUser.id);

  // Detect if anyone (including self) is screen sharing
  const screenSharingUserId = isScreenSharing
    ? currentUser.id
    : Object.entries(peerStates).find(([, s]) => s.isScreenSharing)?.[0] || null;

  // Presence tracking
  useEffect(() => {
    if (!isConnected || !socket) return;
    joinWorkspace(roomKey);
    setParticipants([currentUser]);

    const handleUserJoined = (data: { userId: string; username: string; name: string; image?: string }) => {
      setParticipants(prev => {
        if (prev.some(p => p.id === data.userId)) return prev;
        return [...prev, { id: data.userId, username: data.username, name: data.name, email: "", image: data.image }];
      });
    };
    const handleUserLeft = (data: { userId: string }) => {
      setParticipants(prev => prev.filter(p => p.id !== data.userId));
    };
    const handlePresenceRequest = () => {
      socket.emit("user-joined-media", {
        room: roomKey, userId: currentUser.id, username: currentUser.username,
        name: currentUser.name, image: currentUser.image
      });
    };

    socket.on("user-joined-media", handleUserJoined);
    socket.on("user-left-media", handleUserLeft);
    socket.on("request-media-presence", handlePresenceRequest);
    socket.emit("user-joined-media", {
      room: roomKey, userId: currentUser.id, username: currentUser.username,
      name: currentUser.name, image: currentUser.image
    });
    socket.emit("request-media-presence", { room: roomKey });

    return () => {
      socket.emit("user-left-media", { room: roomKey, userId: currentUser.id });
      leaveWorkspace(roomKey);
      socket.off("user-joined-media", handleUserJoined);
      socket.off("user-left-media", handleUserLeft);
      socket.off("request-media-presence", handlePresenceRequest);
    };
  }, [isConnected, socket, channel.id]);

  // Render a single participant tile
  const renderParticipantTile = (user: CurrentUser, size: 'sm' | 'lg' = 'lg') => {
    const isLocal = user.id === currentUser.id;
    const stream = isLocal ? localStream : remoteStreams[user.id];
    const state = isLocal
      ? { isMuted, isVideoOn, isScreenSharing }
      : peerStates[user.id] || { isMuted: true, isVideoOn: false, isScreenSharing: false };

    const avatarSize = size === 'sm' ? 'h-12 w-12' : 'h-24 w-24';
    const textSize = size === 'sm' ? 'text-lg' : 'text-3xl';
    const nameSize = size === 'sm' ? 'text-xs' : 'text-sm';
    const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5';
    const iconPad = size === 'sm' ? 'p-1' : 'p-1.5';

    return (
      <div key={user.id} className={cn(
        "relative bg-card border border-border rounded-xl shadow-lg overflow-hidden flex items-center justify-center group transition-shadow",
        size === 'sm' ? 'aspect-video' : 'aspect-video'
      )}>
        {(state.isVideoOn || state.isScreenSharing) && stream ? (
          <VideoRenderer stream={stream} muted={isLocal} className={isLocal && !state.isScreenSharing ? "transform scale-x-[-1]" : ""} />
        ) : (
          <div className="flex flex-col items-center justify-center z-10">
            <Avatar className={cn(
              avatarSize, size === 'lg' ? 'mb-4' : 'mb-2', "ring-4 transition-all duration-300",
              !state.isMuted ? "ring-green-500 shadow-[0_0_20px_rgba(34,197,94,0.3)]" : "ring-muted-foreground/20"
            )}>
              <AvatarImage src={user.image || ""} />
              <AvatarFallback className={cn(textSize, "font-bold", getRandomColor(user.id))}>
                {user.name?.charAt(0) || user.username?.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className={cn("bg-background/80 backdrop-blur px-2 py-0.5 rounded-full font-medium", nameSize)}>
              {user.name || user.username}
              {isLocal && <span className="text-muted-foreground text-[10px] ml-1">(you)</span>}
            </div>
          </div>
        )}

        {!isLocal && stream && <AudioRenderer stream={stream} />}

        {(state.isVideoOn || state.isScreenSharing) && stream && (
          <div className="absolute bottom-2 left-2 z-20">
            <div className={cn("bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded-md font-medium text-white", nameSize)}>
              {user.name || user.username}
              {isLocal && <span className="text-white/60 text-[10px] ml-1">(you)</span>}
            </div>
          </div>
        )}

        <div className="absolute top-2 right-2 flex gap-1 z-20">
          {state.isMuted && (
            <div className={cn("bg-red-500/90 text-white rounded-full shadow-sm", iconPad)}>
              <MicOff className={iconSize} />
            </div>
          )}
          {state.isScreenSharing && (
            <div className={cn("bg-blue-500/90 text-white rounded-full shadow-sm", iconPad)}>
              <MonitorUp className={iconSize} />
            </div>
          )}
        </div>
      </div>
    );
  };

  // The main shared screen view (large)
  const renderScreenShareMain = () => {
    if (!screenSharingUserId) return null;
    const isLocal = screenSharingUserId === currentUser.id;
    const stream = isLocal ? localStream : remoteStreams[screenSharingUserId];
    const sharer = participants.find(p => p.id === screenSharingUserId);

    return (
      <div className="relative w-full h-full bg-black rounded-xl overflow-hidden border border-border shadow-xl">
        {stream ? (
          <VideoRenderer stream={stream} muted={isLocal} className="object-contain" />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <MonitorUp className="w-12 h-12 mr-3 opacity-30" />
            <span>Waiting for screen share stream...</span>
          </div>
        )}
        <div className="absolute bottom-4 left-4 z-20 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-lg flex items-center gap-2">
          <MonitorUp className="w-4 h-4 text-blue-400" />
          <span className="text-sm text-white font-medium">
            {sharer?.name || sharer?.username || 'Someone'}{isLocal ? ' (you)' : ''} is sharing
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-background">
      {/* Header */}
      <div className="h-14 border-b border-border flex items-center justify-between px-4 shrink-0 shadow-sm bg-muted/20">
        <div className="flex items-center gap-3">
          {onOpenMobileMenu && (
            <Button variant="ghost" size="sm" onClick={onOpenMobileMenu} className="lg:hidden text-muted-foreground">
              <Users className="w-5 h-5" />
            </Button>
          )}
          <h1 className="text-lg font-bold flex items-center gap-2 text-foreground">
            {channel.type === "VOICE" ? <Mic className="w-5 h-5 text-green-500" /> : channel.type === "VIDEO" ? <Video className="w-5 h-5 text-blue-500" /> : <Video className="w-5 h-5 text-blue-500" />}
            {channel.name}
          </h1>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            {participants.length} {participants.length === 1 ? 'person' : 'people'}
          </span>
        </div>
        <Button
          variant={showParticipantsPanel ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setShowParticipantsPanel(!showParticipantsPanel)}
          className="flex items-center gap-1.5"
        >
          <Users className="w-4 h-4" />
          <span className="text-xs">{participants.length}</span>
        </Button>
      </div>

      {/* Main Area */}
      <div className="flex-1 overflow-hidden flex relative">
        {/* Content Area */}
        <div className="flex-1 overflow-hidden p-3 flex">
          {screenSharingUserId ? (
            /* ─── Screen Share Layout ─── */
            <div className="flex gap-3 w-full h-full">
              {/* Large screen share area */}
              <div className="flex-1 min-w-0">
                {renderScreenShareMain()}
              </div>
              {/* Small participant tiles on the right */}
              <div className="w-48 shrink-0 flex flex-col gap-2 overflow-y-auto scrollbar-thin">
                {participants.map(user => renderParticipantTile(user, 'sm'))}
              </div>
            </div>
          ) : (
            /* ─── Normal Grid Layout ─── */
            <div className="w-full h-full flex items-center justify-center">
              <div className={cn(
                "w-full max-w-6xl grid gap-4",
                participants.length === 1 ? "grid-cols-1 max-w-2xl" :
                participants.length === 2 ? "grid-cols-1 md:grid-cols-2" :
                participants.length <= 4 ? "grid-cols-2" :
                "grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
              )}>
                {participants.map(user => renderParticipantTile(user, 'lg'))}
              </div>

              {participants.length === 1 && (
                <p className="absolute bottom-8 text-muted-foreground animate-pulse text-sm">
                  Waiting for others to join...
                </p>
              )}
            </div>
          )}
        </div>

        {/* Participants Panel (slide-in from right) */}
        {showParticipantsPanel && (
          <div className="w-72 border-l border-border bg-card shrink-0 flex flex-col animate-in slide-in-from-right duration-200">
            <div className="h-12 border-b border-border flex items-center justify-between px-4 shrink-0">
              <h3 className="font-semibold text-sm">Participants ({participants.length})</h3>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowParticipantsPanel(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              {participants.map(user => {
                const isLocal = user.id === currentUser.id;
                const state = isLocal
                  ? { isMuted, isVideoOn, isScreenSharing }
                  : peerStates[user.id] || { isMuted: true, isVideoOn: false, isScreenSharing: false };
                return (
                  <div key={user.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                    <Avatar className={cn("h-8 w-8 ring-2", !state.isMuted ? "ring-green-500" : "ring-transparent")}>
                      <AvatarImage src={user.image || ""} />
                      <AvatarFallback className={cn("text-xs font-bold", getRandomColor(user.id))}>
                        {user.name?.charAt(0) || user.username?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {user.name || user.username}
                        {isLocal && <span className="text-muted-foreground text-xs ml-1">(you)</span>}
                      </p>
                    </div>
                    <div className="flex gap-1 items-center">
                      {state.isMuted && <MicOff className="w-3.5 h-3.5 text-red-500" />}
                      {!state.isMuted && <Mic className="w-3.5 h-3.5 text-green-500" />}
                      {state.isScreenSharing && <MonitorUp className="w-3.5 h-3.5 text-blue-500" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Control Bar */}
      <div className="h-20 border-t border-border bg-background flex items-center justify-center gap-4 px-4 shrink-0">
        <Button
          variant={isMuted ? "destructive" : "secondary"}
          size="icon"
          className="h-12 w-12 rounded-full shadow-sm transition-all"
          onClick={toggleMute}
        >
          {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
        </Button>

        <Button
          variant={isVideoOn ? "secondary" : "outline"}
          size="icon"
          className={cn("h-12 w-12 rounded-full shadow-sm transition-all", !isVideoOn && "text-muted-foreground")}
          onClick={toggleVideo}
        >
          {isVideoOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
        </Button>

        <Button
          variant={isScreenSharing ? "destructive" : "outline"}
          size="icon"
          className={cn("h-12 w-12 rounded-full shadow-sm transition-all", isScreenSharing && "animate-pulse")}
          onClick={toggleScreenShare}
          title={isScreenSharing ? "Stop sharing" : "Share screen"}
        >
          {isScreenSharing ? <MonitorOff className="h-5 w-5" /> : <MonitorUp className="h-5 w-5" />}
        </Button>

        <div className="w-px h-8 bg-border mx-2" />

        <Button
          variant="destructive"
          size="icon"
          className="h-12 w-16 rounded-2xl shadow-sm hover:bg-red-600 transition-colors"
          onClick={() => window.history.back()}
        >
          <PhoneOff className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
