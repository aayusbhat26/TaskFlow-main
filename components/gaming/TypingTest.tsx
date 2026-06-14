"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useSocket } from "@/context/SocketProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Trophy, Keyboard, Play, Users, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface User {
  id: string;
  name: string;
  username: string;
  image?: string | null;
}

interface PlayerState {
  user: User;
  progress: number;
  wpm: number;
  finished: boolean;
  finishTime?: number;
}

const PARAGRAPHS = [
  "The quick brown fox jumps over the lazy dog. This sentence contains every letter of the alphabet, which makes it a pangram. Typing pangrams is a great way to warm up your fingers and improve your typing speed and accuracy.",
  "Programming is the art of telling another human what one wants the computer to do. It requires logical thinking, problem-solving skills, and a lot of patience. The best code is code that is easy to read and understand.",
  "In software engineering, continuous integration is the practice of merging all developers working copies to a shared mainline several times a day. It helps catch bugs early and improves the overall quality of the software.",
  "React is a JavaScript library for building user interfaces. It lets you compose complex UIs from small and isolated pieces of code called components. React makes it painless to create interactive UIs for every state in your application.",
  "TypeScript is a strongly typed programming language that builds on JavaScript, giving you better tooling at any scale. It adds optional static typing and class-based object-oriented programming to the language.",
];

const PLAYER_COLORS = ["#f783ac", "#8ce99a", "#74c0fc", "#ffa94d", "#b197fc", "#63e6be"];

export function TypingTest({ workspaceId, currentUser }: { workspaceId: string; currentUser: User }) {
  const { socket, isConnected, joinWorkspace } = useSocket();
  const [gameState, setGameState] = useState<"lobby" | "countdown" | "playing" | "finished">("lobby");
  const [paragraph, setParagraph] = useState("");
  const [typedText, setTypedText] = useState("");
  const [players, setPlayers] = useState<Map<string, PlayerState>>(new Map());
  const [countdown, setCountdown] = useState(3);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [liveWpm, setLiveWpm] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const typedTextRef = useRef("");
  const startTimeRef = useRef<number | null>(null);

  // Keep refs in sync
  useEffect(() => { typedTextRef.current = typedText; }, [typedText]);
  useEffect(() => { startTimeRef.current = startTime; }, [startTime]);

  // Join workspace room
  useEffect(() => {
    if (workspaceId && isConnected) {
      joinWorkspace(workspaceId);
    }
  }, [workspaceId, isConnected, joinWorkspace]);

  // Socket events
  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleJoin = (user: User) => {
      setPlayers(prev => {
        const next = new Map(prev);
        if (!next.has(user.id)) {
          next.set(user.id, { user, progress: 0, wpm: 0, finished: false });
        }
        return next;
      });
    };

    const handleStart = (text: string) => {
      setParagraph(text);
      setTypedText("");
      typedTextRef.current = "";
      setGameState("countdown");
      setCountdown(3);
      setLiveWpm(0);
      // Reset all players
      setPlayers(prev => {
        const next = new Map(prev);
        for (const [id, player] of next) {
          next.set(id, { ...player, progress: 0, wpm: 0, finished: false, finishTime: undefined });
        }
        return next;
      });
    };

    const handleProgress = (data: { progress: number; wpm: number; user: User }) => {
      setPlayers(prev => {
        const next = new Map(prev);
        const player = next.get(data.user.id);
        if (player) {
          next.set(data.user.id, { ...player, progress: data.progress, wpm: data.wpm });
        } else {
          next.set(data.user.id, { user: data.user, progress: data.progress, wpm: data.wpm, finished: false });
        }
        return next;
      });
    };

    const handleEnd = (data: { finalWpm: number; user: User }) => {
      setPlayers(prev => {
        const next = new Map(prev);
        const player = next.get(data.user.id);
        if (player) {
          next.set(data.user.id, { ...player, wpm: data.finalWpm, progress: 100, finished: true, finishTime: Date.now() });
        }
        return next;
      });
    };

    const handleRequestPlayers = () => {
      socket.emit("typing-game-join", { workspaceId, user: currentUser });
    };

    socket.on("typing-game-join", handleJoin);
    socket.on("typing-game-start", handleStart);
    socket.on("typing-game-progress", handleProgress);
    socket.on("typing-game-end", handleEnd);
    socket.on("typing-game-request-players", handleRequestPlayers);

    // Announce ourselves
    socket.emit("typing-game-join", { workspaceId, user: currentUser });
    socket.emit("typing-game-request-players", { workspaceId });
    // Add ourselves locally
    setPlayers(prev => {
      const next = new Map(prev);
      if (!next.has(currentUser.id)) {
        next.set(currentUser.id, { user: currentUser, progress: 0, wpm: 0, finished: false });
      }
      return next;
    });

    return () => {
      socket.off("typing-game-join", handleJoin);
      socket.off("typing-game-start", handleStart);
      socket.off("typing-game-progress", handleProgress);
      socket.off("typing-game-end", handleEnd);
      socket.off("typing-game-request-players", handleRequestPlayers);
    };
  }, [socket, isConnected, workspaceId, currentUser]);

  // Countdown logic
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (gameState === "countdown") {
      if (countdown > 0) {
        timer = setTimeout(() => setCountdown(c => c - 1), 1000);
      } else {
        setGameState("playing");
        const now = Date.now();
        setStartTime(now);
        startTimeRef.current = now;
        // Focus the container for keydown events
        setTimeout(() => containerRef.current?.focus(), 50);
      }
    }
    return () => clearTimeout(timer);
  }, [gameState, countdown]);

  const startGame = () => {
    const randomText = PARAGRAPHS[Math.floor(Math.random() * PARAGRAPHS.length)];
    socket?.emit("typing-game-start", { workspaceId, paragraph: randomText });
  };

  const resetGame = () => {
    setGameState("lobby");
    setTypedText("");
    typedTextRef.current = "";
    setParagraph("");
    setStartTime(null);
    startTimeRef.current = null;
    setLiveWpm(0);
    setPlayers(prev => {
      const next = new Map(prev);
      for (const [id, player] of next) {
        next.set(id, { ...player, progress: 0, wpm: 0, finished: false, finishTime: undefined });
      }
      return next;
    });
  };

  // Handle keyboard input via keydown on the container div
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (gameState !== "playing") return;

    // Prevent browser shortcuts while typing
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    
    // Handle backspace
    if (e.key === "Backspace") {
      e.preventDefault();
      const newText = typedTextRef.current.slice(0, -1);
      setTypedText(newText);
      typedTextRef.current = newText;

      const progress = paragraph.length > 0 ? (newText.length / paragraph.length) * 100 : 0;
      const timeElapsed = (Date.now() - (startTimeRef.current || Date.now())) / 1000 / 60;
      const words = newText.length / 5;
      const wpm = timeElapsed > 0 ? Math.round(words / timeElapsed) : 0;
      setLiveWpm(wpm);
      socket?.emit("typing-game-progress", { workspaceId, progress, wpm, user: currentUser });
      return;
    }

    // Ignore non-printable keys
    if (e.key.length !== 1) return;
    e.preventDefault();

    const nextChar = paragraph[typedTextRef.current.length];
    if (!nextChar) return;

    // Only accept the correct character
    if (e.key === nextChar) {
      const newText = typedTextRef.current + e.key;
      setTypedText(newText);
      typedTextRef.current = newText;

      const progress = (newText.length / paragraph.length) * 100;
      const timeElapsed = (Date.now() - (startTimeRef.current || Date.now())) / 1000 / 60;
      const words = newText.length / 5;
      const wpm = timeElapsed > 0 ? Math.round(words / timeElapsed) : 0;
      setLiveWpm(wpm);

      // Update local player state immediately
      setPlayers(prev => {
        const next = new Map(prev);
        const me = next.get(currentUser.id);
        if (me) {
          next.set(currentUser.id, { ...me, progress, wpm });
        }
        return next;
      });

      // Emit progress
      socket?.emit("typing-game-progress", { workspaceId, progress, wpm, user: currentUser });

      // Check if finished
      if (newText === paragraph) {
        setGameState("finished");
        setPlayers(prev => {
          const next = new Map(prev);
          const me = next.get(currentUser.id);
          if (me) {
            next.set(currentUser.id, { ...me, progress: 100, wpm, finished: true, finishTime: Date.now() });
          }
          return next;
        });
        socket?.emit("typing-game-end", { workspaceId, finalWpm: wpm, user: currentUser });
      }
    }
  }, [gameState, paragraph, socket, workspaceId, currentUser]);

  // Render the paragraph with cursor indicators for all players
  const renderParagraph = () => {
    // Build a map of player positions (character index) => player info
    const playerPositions = new Map<number, { name: string; color: string }[]>();
    let colorIdx = 0;
    for (const [playerId, player] of players) {
      if (playerId === currentUser.id) continue;
      const charIdx = Math.floor((player.progress / 100) * paragraph.length);
      if (charIdx < paragraph.length) {
        const existing = playerPositions.get(charIdx) || [];
        existing.push({ name: player.user.name, color: PLAYER_COLORS[colorIdx % PLAYER_COLORS.length] });
        playerPositions.set(charIdx, existing);
      }
      colorIdx++;
    }

    return (
      <div
        ref={containerRef}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onClick={() => containerRef.current?.focus()}
        className={cn(
          "text-lg sm:text-xl leading-relaxed font-mono relative p-6 bg-muted/30 rounded-xl border border-border cursor-text select-none outline-none transition-all",
          gameState === "playing" && "ring-2 ring-primary/50 focus:ring-primary"
        )}
      >
        {gameState === "playing" && (
          <div className="absolute top-2 right-3 text-xs text-muted-foreground animate-pulse">
            Click here &amp; start typing
          </div>
        )}
        {paragraph.split("").map((char, index) => {
          let color = "text-muted-foreground/60";
          if (index < typedText.length) {
            color = "text-green-400 font-semibold";
          }
          const isCursor = index === typedText.length && gameState === "playing";
          const otherPlayers = playerPositions.get(index);

          return (
            <span key={index} className="relative inline">
              {/* Other players' cursors */}
              {otherPlayers && otherPlayers.map((p, i) => (
                <span
                  key={i}
                  className="absolute -top-5 left-0 text-[10px] font-sans font-bold px-1 rounded whitespace-nowrap z-10 pointer-events-none"
                  style={{ backgroundColor: p.color, color: '#000' }}
                >
                  {p.name}
                </span>
              ))}
              <span className={cn(
                color,
                isCursor && "bg-primary text-primary-foreground",
                otherPlayers && "border-b-2",
              )} style={otherPlayers ? { borderColor: otherPlayers[0]?.color } : undefined}>
                {char}
              </span>
            </span>
          );
        })}
      </div>
    );
  };

  // Sort players for leaderboard
  const sortedPlayers = Array.from(players.values()).sort((a, b) => {
    if (a.finished && !b.finished) return -1;
    if (!a.finished && b.finished) return 1;
    if (a.finished && b.finished) return (a.finishTime || 0) - (b.finishTime || 0);
    return b.progress - a.progress;
  });

  return (
    <div className="w-full h-full flex flex-col items-center justify-start p-4 sm:p-8 overflow-y-auto">
      <Card className="w-full max-w-4xl shadow-2xl border-border/50 bg-card/80 backdrop-blur">
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-3xl flex items-center justify-center gap-3">
            <Keyboard className="w-8 h-8 text-primary" />
            Typing Race
          </CardTitle>
          <CardDescription>Compete with your workspace members in real-time!</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          
          {/* LOBBY */}
          {gameState === "lobby" && (
            <div className="flex flex-col items-center py-12">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                <Users className="w-10 h-10 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Typing Race Lobby</h3>
              <p className="text-muted-foreground mb-8">
                {players.size} {players.size === 1 ? 'player' : 'players'} waiting
              </p>
              <div className="flex flex-wrap gap-3 justify-center mb-10">
                {Array.from(players.values()).map((p, i) => (
                  <div key={p.user.id} className="flex items-center gap-2 px-4 py-2 bg-accent rounded-full text-sm font-medium">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={p.user.image || ""} />
                      <AvatarFallback className="text-[10px] font-bold" style={{ backgroundColor: PLAYER_COLORS[i % PLAYER_COLORS.length] }}>
                        {p.user.name?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <span>{p.user.name}</span>
                    {p.user.id === currentUser.id && <span className="text-xs text-muted-foreground">(you)</span>}
                  </div>
                ))}
              </div>
              <Button size="lg" onClick={startGame} className="w-52 text-lg rounded-full gap-2 shadow-lg">
                <Play className="w-5 h-5" /> Start Race
              </Button>
            </div>
          )}

          {/* COUNTDOWN */}
          {gameState === "countdown" && (
            <div className="flex flex-col items-center justify-center py-20 min-h-[300px]">
              <div className="text-8xl font-black text-primary animate-bounce" key={countdown}>
                {countdown}
              </div>
              <p className="text-muted-foreground mt-6 text-xl">Get your fingers ready...</p>
            </div>
          )}

          {/* PLAYING & FINISHED */}
          {(gameState === "playing" || gameState === "finished") && (
            <div className="flex flex-col">
              {/* Live stats */}
              {gameState === "playing" && (
                <div className="flex items-center justify-between mb-4 px-2">
                  <div className="text-sm text-muted-foreground">
                    Progress: <span className="font-bold text-foreground">{Math.round((typedText.length / paragraph.length) * 100)}%</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Speed: <span className="font-bold text-primary text-lg">{liveWpm}</span> WPM
                  </div>
                </div>
              )}

              {/* Progress Bars */}
              <div className="space-y-3 mb-6 p-4 bg-accent/30 rounded-xl border border-border/50">
                {sortedPlayers.map((p, i) => (
                  <div key={p.user.id} className="flex items-center gap-3">
                    <div className="flex items-center gap-2 w-28 shrink-0">
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={p.user.image || ""} />
                        <AvatarFallback className="text-[8px] font-bold" style={{ backgroundColor: PLAYER_COLORS[i % PLAYER_COLORS.length] }}>
                          {p.user.name?.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium truncate">
                        {p.user.name}
                        {p.user.id === currentUser.id && <span className="text-muted-foreground text-[10px] ml-0.5">(you)</span>}
                      </span>
                    </div>
                    <div className="flex-1 h-4 bg-secondary rounded-full overflow-hidden relative">
                      <div 
                        className={cn(
                          "h-full rounded-full transition-all duration-300 ease-out",
                          p.finished ? "bg-green-500" : "bg-primary"
                        )}
                        style={{ width: `${p.progress}%` }}
                      />
                    </div>
                    <span className="w-20 text-right text-sm font-bold text-muted-foreground tabular-nums">
                      {p.wpm} WPM
                    </span>
                    {p.finished && <Trophy className="w-4 h-4 text-yellow-500 shrink-0" />}
                  </div>
                ))}
              </div>

              {/* Paragraph */}
              {renderParagraph()}

              {/* Finished screen */}
              {gameState === "finished" && (
                <div className="text-center py-8 mt-4 border-t border-border">
                  <Trophy className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
                  <h2 className="text-3xl font-bold mb-2">Race Finished!</h2>
                  <p className="text-xl text-muted-foreground mb-8">
                    Your speed: <span className="text-primary font-bold">{players.get(currentUser.id)?.wpm || 0} WPM</span>
                  </p>
                  <Button onClick={resetGame} variant="outline" size="lg" className="gap-2">
                    <RotateCcw className="w-4 h-4" /> Play Again
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
