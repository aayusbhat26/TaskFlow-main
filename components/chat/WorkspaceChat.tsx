'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  MessageSquare,
  Users,
  Settings,
  ChevronLeft,
  ChevronRight,
  Hash
} from 'lucide-react';
import { cn, getRandomColor } from '@/lib/utils';
import { ChatArea } from './ChatArea';

interface Workspace {
  id: string;
  name: string;
  image?: string | null;
  color: string;
  _count: {
    subscribers: number;
  };
  subscribers: Array<{
    user: {
      id: string;
      name: string;
      username: string;
      image?: string | null;
    };
  }>;
}

interface CurrentUser {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  username: string;
}

interface WorkspaceChatProps {
  workspaces: Workspace[];
  currentUser: CurrentUser;
}

const colorMap = {
  BLUE: 'bg-blue-500',
  GREEN: 'bg-green-500',
  YELLOW: 'bg-yellow-500',
  RED: 'bg-red-500',
  PURPLE: 'bg-purple-500',
  PINK: 'bg-pink-500',
  INDIGO: 'bg-indigo-500',
  GRAY: 'bg-gray-500',
};

export function WorkspaceChat({ workspaces, currentUser }: WorkspaceChatProps) {
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(
    workspaces.length > 0 ? workspaces[0] : null
  );
  const [selectedDmUser, setSelectedDmUser] = useState<any | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string | undefined>(undefined);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isStartingDm, setIsStartingDm] = useState(false);

  const startDirectMessage = async (targetUserId: string, targetUser: any) => {
    if (!selectedWorkspace || isStartingDm) return;
    setIsStartingDm(true);
    try {
      const response = await fetch('/api/chat/dms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId, workspaceId: selectedWorkspace.id })
      });
      if (response.ok) {
        const data = await response.json();
        setSelectedDmUser(targetUser);
        setSelectedGroupId(data.groupId);
        setMobileMenuOpen(false);
      }
    } catch (error) {
      console.error('Failed to start DM:', error);
    } finally {
      setIsStartingDm(false);
    }
  };

  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* Mobile Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={cn(
        "bg-background border-r border-border flex flex-col relative z-50 transition-all duration-300",
        // Desktop behavior
        "hidden lg:flex",
        sidebarCollapsed ? "lg:w-16" : "lg:w-80",
        // Mobile behavior
        mobileMenuOpen ? "fixed inset-y-0 left-0 w-80 flex shadow-2xl" : "hidden"
      )}>
        {/* Header */}
        <div className="p-4 border-b border-border bg-muted/30 flex-shrink-0">
          <div className="flex items-center justify-between">
            {!sidebarCollapsed && (
              <div className="min-w-0 flex-1">
                <div className="flex items-center mb-1">
                  <div className="w-6 h-6 bg-primary rounded-lg flex items-center justify-center mr-2 flex-shrink-0">
                    <MessageSquare className="w-3 h-3 text-primary-foreground" />
                  </div>
                  <h1 className="text-lg font-semibold text-foreground truncate">Chat</h1>
                </div>
                <p className="text-sm text-muted-foreground truncate">
                  {currentUser.name || currentUser.username}
                </p>
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="text-muted-foreground hover:text-foreground hover:bg-accent hidden lg:flex p-1 flex-shrink-0"
            >
              {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </Button>
            {/* Mobile close button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMobileMenuOpen(false)}
              className="text-muted-foreground hover:text-foreground hover:bg-accent lg:hidden p-1 flex-shrink-0"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Workspaces List */}
        <ScrollArea className="flex-1 p-3">
          <div className="space-y-2">
            {(!sidebarCollapsed || mobileMenuOpen) && (
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-2">
                Workspaces
              </h3>
            )}
            {workspaces.map((workspace) => (
              <button
                key={workspace.id}
                onClick={() => {
                  setSelectedWorkspace(workspace);
                  setSelectedDmUser(null);
                  setSelectedGroupId(undefined);
                  setMobileMenuOpen(false);
                }}
                className={cn(
                  "w-full flex items-center p-3 rounded-lg transition-all duration-200",
                  selectedWorkspace?.id === workspace.id && !selectedGroupId
                    ? "bg-primary/10 border border-primary/20"
                    : "hover:bg-accent border border-transparent"
                )}
              >
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center text-primary-foreground font-semibold text-sm mr-3 flex-shrink-0",
                  colorMap[workspace.color as keyof typeof colorMap] || colorMap.BLUE
                )}>
                  {workspace.image ? (
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={workspace.image} alt={workspace.name} />
                      <AvatarFallback>{workspace.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                  ) : (
                    <Hash className="w-4 h-4" />
                  )}
                </div>
                {(!sidebarCollapsed || mobileMenuOpen) && (
                  <div className="flex-1 text-left min-w-0">
                    <p className={cn(
                      "font-medium truncate text-sm",
                      selectedWorkspace?.id === workspace.id ? "text-primary" : "text-foreground"
                    )}>
                      {workspace.name}
                    </p>
                    <p className="text-xs text-muted-foreground truncate flex items-center">
                      <Users className="w-3 h-3 mr-1" />
                      {workspace._count.subscribers} members
                    </p>
                  </div>
                )}
              </button>
            ))}
            
            {/* Direct Messages Section */}
            {selectedWorkspace && (
              <div className="mt-6">
                {(!sidebarCollapsed || mobileMenuOpen) && (
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-2">
                    Direct Messages
                  </h3>
                )}
                {selectedWorkspace.subscribers
                  .filter(sub => sub.user.id !== currentUser.id)
                  .map((sub) => (
                  <button
                    key={sub.user.id}
                    onClick={() => startDirectMessage(sub.user.id, sub.user)}
                    className={cn(
                      "w-full flex items-center p-2 rounded-lg transition-all duration-200",
                      selectedDmUser?.id === sub.user.id
                        ? "bg-primary/10 border border-primary/20"
                        : "hover:bg-accent border border-transparent"
                    )}
                  >
                    <div className="relative flex-shrink-0 mr-3">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={sub.user.image || ''} alt={sub.user.name} />
                        <AvatarFallback className={cn("text-primary-foreground font-semibold text-xs", getRandomColor(sub.user.id))}>
                          {sub.user.name?.charAt(0) || sub.user.username?.charAt(0) || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-background"></div>
                    </div>
                    {(!sidebarCollapsed || mobileMenuOpen) && (
                      <div className="flex-1 text-left min-w-0">
                        <p className={cn(
                          "font-medium truncate text-sm",
                          selectedDmUser?.id === sub.user.id ? "text-primary" : "text-foreground"
                        )}>
                          {sub.user.name || sub.user.username}
                        </p>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>

        {/* User Info */}
        <div className="p-3 border-t border-border bg-muted/30 flex-shrink-0">
          <div className="flex items-center p-2 rounded-lg bg-background border border-border">
            <div className="relative flex-shrink-0">
              <Avatar className="w-8 h-8">
                <AvatarImage src={currentUser.image || ''} alt={currentUser.name} />
                <AvatarFallback className={cn("text-primary-foreground font-semibold", getRandomColor(currentUser.id))}>
                  {currentUser.name?.charAt(0) || currentUser.username?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-background"></div>
            </div>
            {(!sidebarCollapsed || mobileMenuOpen) && (
              <div className="ml-2 min-w-0 flex-1">
                <p className="text-sm font-medium truncate text-foreground">
                  {currentUser.name || currentUser.username}
                </p>
                <p className="text-xs text-green-600 dark:text-green-400 truncate flex items-center">
                  <div className="w-2 h-2 bg-green-500 dark:bg-green-400 rounded-full mr-1"></div>
                  Online
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {selectedWorkspace ? (
          <>
            {/* Direct Message Header Overlay (if DM selected) */}
            {selectedGroupId && selectedDmUser && (
              <div className="p-4 border-b border-border bg-background flex-shrink-0 flex items-center">
                <Avatar className="w-8 h-8 mr-3">
                  <AvatarImage src={selectedDmUser.image || ''} alt={selectedDmUser.name} />
                  <AvatarFallback className={cn("text-primary-foreground font-semibold", getRandomColor(selectedDmUser.id))}>
                    {selectedDmUser.name?.charAt(0) || selectedDmUser.username?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="text-lg font-semibold text-foreground leading-tight">{selectedDmUser.name || selectedDmUser.username}</h2>
                  <p className="text-xs text-muted-foreground">Direct Message</p>
                </div>
              </div>
            )}
            {/* If NO DM selected, show Workspace Header Overlay */}
            {!selectedGroupId && (
              <div className="p-4 border-b border-border bg-background flex-shrink-0 flex items-center">
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center mr-3">
                  <Hash className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground leading-tight"># {selectedWorkspace.name}</h2>
                  <p className="text-xs text-muted-foreground">Workspace general chat</p>
                </div>
              </div>
            )}
            
            {/* Unique key forces ChatArea to completely remount when switching between Workspace Chat and DM Chat */}
            <ChatArea
              key={selectedGroupId || selectedWorkspace.id}
              workspace={selectedWorkspace}
              currentUser={currentUser}
              groupId={selectedGroupId}
              onOpenMobileMenu={() => setMobileMenuOpen(true)}
            />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-background">
            <div className="text-center max-w-md mx-auto p-8">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-xl font-semibold text-foreground mb-2">
                Welcome to Chat
              </h2>
              <p className="text-muted-foreground text-sm leading-relaxed mb-4">
                Select a workspace from the sidebar to start chatting with your team members.
              </p>
              {/* Mobile workspace selector button */}
              <Button
                onClick={() => setMobileMenuOpen(true)}
                className="mt-4 lg:hidden"
                variant="outline"
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                Select Workspace
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
