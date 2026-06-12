'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Users,
  Hash,
  Send,
  Smile,
  Paperclip,
  MoreVertical,
  Menu,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSocket } from '@/context/SocketProvider';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { ChatSearch } from './ChatSearch';
import { ThreadSidebar } from './ThreadSidebar';

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
  plan?: string;
}

interface Message {
  id: string;
  content: string | null;
  createdAt: string;
  author: {
    id: string;
    name: string;
    username: string;
    image?: string | null;
  };
  attachments?: Array<{ url: string; name?: string; type?: string; size?: number; key?: string }>;
  replyTo?: {
    id: string;
    content: string | null;
    author: { name: string; username: string; };
  };
  reactions?: Array<{
    id: string;
    emoji: string;
    user: { name: string; username: string; };
  }>;
  isEdited?: boolean;
  isDeleted?: boolean;
  isOptimistic?: boolean;
  readByIds?: string[];
  replyToId?: string | null;
}

interface ChatAreaProps {
  workspace: Workspace;
  currentUser: CurrentUser;
  groupId?: string;
  channelId?: string;
  onOpenMobileMenu?: () => void;
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

export function ChatArea({ workspace, currentUser, groupId, channelId, onOpenMobileMenu }: ChatAreaProps) {
  const { socket, isConnected, joinWorkspace, leaveWorkspace } = useSocket();
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [activeThread, setActiveThread] = useState<Message | null>(null);
  const [typingUsers, setTypingUsers] = useState<{ userId: string; username: string }[]>([]);

  // Use refs to store socket functions to prevent infinite re-renders
  const joinWorkspaceRef = useRef(joinWorkspace);
  const leaveWorkspaceRef = useRef(leaveWorkspace);

  // Update refs when functions change
  useEffect(() => {
    joinWorkspaceRef.current = joinWorkspace;
  }, [joinWorkspace]);

  useEffect(() => {
    leaveWorkspaceRef.current = leaveWorkspace;
  }, [leaveWorkspace]);

  // Join workspace when component mounts, workspace changes, or socket reconnects
  useEffect(() => {
    const roomId = channelId || groupId || workspace.id;
    if (roomId && isConnected) {
      console.log('🔗 ChatArea: Joining room:', roomId);
      joinWorkspaceRef.current(roomId);
    }

    return () => {
      if (roomId && isConnected) {
        console.log('🔗 ChatArea: Leaving room:', roomId);
        leaveWorkspaceRef.current(roomId);
      }
    };
  }, [workspace.id, groupId, channelId, isConnected]); // Depend on isConnected to rejoin on reconnect

  // Load initial messages
  useEffect(() => {
    const loadMessages = async () => {
      try {
        setIsLoading(true);
        const url = channelId 
          ? `/api/chat/messages?channelId=${channelId}&workspaceId=${workspace.id}`
          : groupId
            ? `/api/chat/messages?groupId=${groupId}`
            : `/api/chat/messages?workspaceId=${workspace.id}`;
        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          setMessages(data);
        }
      } catch (error) {
        console.error('Failed to load messages:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (workspace.id || groupId || channelId) {
      loadMessages();
    }
  }, [workspace.id, groupId, channelId]);

  // Listen for new messages
  useEffect(() => {
    if (!socket) return;

    console.log('🔌 ChatArea socket listener registered for current user:', currentUser.username, 'in room:', groupId || workspace.id);

    const handleNewMessage = (message: Message & { tempId?: string }) => {
      console.log('📩 ChatArea received new-message:', message);
      setMessages(prev => {
        // If this real message is replacing an optimistic broadcast
        if (message.tempId) {
            const hasTemp = prev.some(m => m.id === message.tempId);
            if (hasTemp) {
                return prev.map(m => m.id === message.tempId ? message : m);
            }
        }
        if (prev.some(m => m.id === message.id)) {
            return prev;
        }
        return [...prev, message];
      });
    };

    const handleReactionUpdated = (data: { messageId: string; emoji: string; user: { id: string; name: string; username: string }; status: string }) => {
      console.log('📩 ChatArea received reaction-updated:', data, 'current user ID:', currentUser.id);
      if (data.user.id === currentUser.id) {
        console.log('📩 ChatArea: reaction-updated ignored (own reaction broadcast)');
        return; // Ignore our own broadcast
      }

      setMessages(prev => prev.map(m => {
        if (m.id !== data.messageId) return m;

        const currentReactions = m.reactions || [];
        const hasReacted = currentReactions.some(r => r.emoji === data.emoji && r.user.username === data.user.username);

        if (data.status === 'added' && !hasReacted) {
          console.log(`📩 ChatArea: Adding reaction ${data.emoji} by ${data.user.username} to message ${data.messageId}`);
          return {
            ...m,
            reactions: [...currentReactions, { id: `temp-${Date.now()}`, emoji: data.emoji, user: data.user }]
          };
        } else if (data.status === 'removed' && hasReacted) {
          console.log(`📩 ChatArea: Removing reaction ${data.emoji} by ${data.user.username} from message ${data.messageId}`);
          return {
            ...m,
            reactions: currentReactions.filter(r => !(r.emoji === data.emoji && r.user.username === data.user.username))
          };
        }
        return m;
      }));
    };

    const handleUserTyping = (data: { userId: string; username: string; isTyping: boolean }) => {
      console.log('📩 ChatArea received user-typing:', data, 'current user ID:', currentUser.id);
      if (data.userId === currentUser.id) return; // Ignore our own typing indicator

      setTypingUsers(prev => {
        if (data.isTyping) {
          if (!prev.some(u => u.userId === data.userId)) {
            return [...prev, { userId: data.userId, username: data.username }];
          }
          return prev;
        } else {
          return prev.filter(u => u.userId !== data.userId);
        }
      });
    };

    const handleMessageEdited = (editedMessage: Message) => {
      console.log('📩 ChatArea received message-edited:', editedMessage);
      setMessages(prev => prev.map(m => m.id === editedMessage.id ? editedMessage : m));
    };

    const handleMessageDeleted = (messageId: string) => {
      console.log('📩 ChatArea received message-deleted:', messageId);
      setMessages(prev => prev.map(m => {
        if (m.id === messageId) {
          return { ...m, isDeleted: true, content: "This message was deleted." };
        }
        return m;
      }));
    };

    const handleMessagesRead = (data: { messageIds: string[]; readByUserId: string }) => {
      console.log('📩 ChatArea received messages-read:', data, 'current user ID:', currentUser.id);
      if (data.readByUserId === currentUser.id) {
        console.log('📩 ChatArea: messages-read ignored (own read receipt broadcast)');
        return; // Ignore our own read receipt
      }

      setMessages(prev => prev.map(m => {
        if (data.messageIds.includes(m.id)) {
          const currentReads = m.readByIds || [];
          if (!currentReads.includes(data.readByUserId)) {
            console.log(`📩 ChatArea: Marking message ${m.id} as read by user ${data.readByUserId}`);
            return { ...m, readByIds: [...currentReads, data.readByUserId] };
          }
        }
        return m;
      }));
    };

    socket.on('new-message', handleNewMessage);
    socket.on('reaction-updated', handleReactionUpdated);
    socket.on('user-typing', handleUserTyping);
    socket.on('message-edited', handleMessageEdited);
    socket.on('message-deleted', handleMessageDeleted);
    socket.on('messages-read', handleMessagesRead);

    return () => {
      console.log('🔌 ChatArea socket listener cleaning up');
      socket.off('new-message', handleNewMessage);
      socket.off('reaction-updated', handleReactionUpdated);
      socket.off('user-typing', handleUserTyping);
      socket.off('message-edited', handleMessageEdited);
      socket.off('message-deleted', handleMessageDeleted);
      socket.off('messages-read', handleMessagesRead);
    };
  }, [socket, currentUser.id, currentUser.username, groupId, workspace.id]);

  // Instantly mark live messages as read when received
  useEffect(() => {
    const unreadMessages = messages.filter(m => m.author.id !== currentUser.id && !(m.readByIds || []).includes(currentUser.id));
    if (unreadMessages.length > 0) {
      const idsToMark = unreadMessages.map(m => m.id);
      
      console.log('⚡ ChatArea auto-reading messages:', idsToMark);
      
      // Emit socket event and call API
      socket?.emit('messages-read', { workspaceId: groupId || workspace.id, messageIds: idsToMark, readByUserId: currentUser.id });
      fetch('/api/chat/messages/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageIds: idsToMark })
      }).catch(console.error);

      // Optimistically update locally
      setMessages(prev => prev.map(m => 
        idsToMark.includes(m.id) ? { ...m, readByIds: [...(m.readByIds || []), currentUser.id] } : m
      ));
    }
  }, [messages, currentUser.id, socket, groupId, workspace.id]);

  const handleReactionToggle = (messageId: string, emoji: string) => {
    const message = messages.find(m => m.id === messageId);
    if (!message) return;

    const currentReactions = message.reactions || [];
    const hasReacted = currentReactions.some(r => r.emoji === emoji && r.user.username === currentUser.username);

    const roomId = groupId || workspace.id;
    const status = hasReacted ? 'removed' : 'added';

    console.log(`⚡ ChatArea emitting reaction-updated:`, { workspaceId: roomId, messageId, emoji, status });
    socket?.emit('reaction-updated', { workspaceId: roomId, messageId, emoji, user: currentUser, status });

    setMessages(prev => prev.map(m => {
      if (m.id !== messageId) return m;

      let newReactions;
      if (hasReacted) {
        newReactions = currentReactions.filter(r => !(r.emoji === emoji && r.user.username === currentUser.username));
      } else {
        newReactions = [...currentReactions, { id: `temp-${Date.now()}`, emoji, user: { name: currentUser.name || currentUser.username, username: currentUser.username } }];
      }

      return {
        ...m,
        reactions: newReactions
      };
    }));
  };

  const handleOptimisticMessage = (message: Message) => {
    setMessages(prev => [...prev, message]);
  };

  const handleMessageConfirmed = (tempId: string, realMessage: Message) => {
    setMessages(prev => {
      // Check if the real message already exists (e.g. came from socket before API response)
      const exists = prev.some(m => m.id === realMessage.id);

      if (exists) {
          // If real message exists, just remove the optimistic one to avoid duplicates
          return prev.filter(m => m.id !== tempId);
      }

      // Otherwise, replace optimistic with real
      return prev.map(m => m.id === tempId ? realMessage : m);
    });
  };

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-background">
      {/* Header */}
      <div className="bg-background border-b border-border px-4 py-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center min-w-0 flex-1">
            {/* Mobile menu button */}
            {onOpenMobileMenu && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onOpenMobileMenu}
                className="mr-3 lg:hidden text-muted-foreground hover:text-foreground hover:bg-accent p-1 flex-shrink-0"
              >
                <Menu className="w-4 h-4" />
              </Button>
            )}

            <div className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center text-primary-foreground mr-3 flex-shrink-0",
              colorMap[workspace.color as keyof typeof colorMap] || colorMap.BLUE
            )}>
              <Hash className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-lg font-semibold text-foreground truncate">
                {workspace.name}
              </h1>
              <p className="text-sm text-muted-foreground flex items-center">
                <Users className="w-3 h-3 mr-1 flex-shrink-0" />
                <span className="truncate">{workspace._count.subscribers} members</span>
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 flex-shrink-0">
            <ChatSearch workspaceId={workspace.id} groupId={groupId} currentUser={currentUser} />
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground hover:bg-accent p-1"
            >
              <MoreVertical className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Main Chat */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <MessageList 
            messages={messages.filter(m => !m.replyToId)} 
            isLoading={isLoading} 
            currentUser={currentUser}
            onReply={(msg) => {
              if (currentUser.plan === 'FREE') {
                alert("Threaded replies are a premium feature! Please upgrade your plan to access this feature.");
                // Redirect to upgrade page if possible, or show a custom modal.
                // For now, an alert followed by navigation using window.location
                window.location.href = '/upgrade';
                return;
              }
              setActiveThread(msg);
            }}
            onReactionToggle={handleReactionToggle}
            setMessages={setMessages}
            onMessageEdit={(msg) => {
              socket?.emit('message-edited', { workspaceId: groupId || workspace.id, message: msg });
            }}
            onMessageDelete={(msgId) => {
              socket?.emit('message-deleted', { workspaceId: groupId || workspace.id, messageId: msgId });
            }}
            onMessagesRead={(msgIds) => {
              socket?.emit('messages-read', { workspaceId: groupId || workspace.id, messageIds: msgIds, readByUserId: currentUser.id });
              fetch('/api/chat/messages/read', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messageIds: msgIds })
              }).catch(console.error);
            }}
          />

          {/* Typing Indicator */}
          {typingUsers.length > 0 && (
            <div className="px-4 py-1 text-xs text-muted-foreground italic flex items-center gap-1">
              <div className="flex space-x-1 items-center">
                <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span className="ml-2">
                {typingUsers.length === 1
                  ? `${typingUsers[0].username} is typing...`
                  : `${typingUsers.length} people are typing...`}
              </span>
            </div>
          )}

          <ChatInput 
            workspaceId={workspace.id} 
            groupId={groupId}
            channelId={channelId}
            currentUser={currentUser} 
            replyingTo={replyingTo}
            onCancelReply={() => setReplyingTo(null)}
            onOptimisticMessage={handleOptimisticMessage}
            onMessageConfirmed={handleMessageConfirmed}
          />
        </div>
        {activeThread && (
          <div className="w-80 flex-shrink-0 border-l border-border bg-background shadow-lg">
            <ThreadSidebar
              parentMessage={activeThread}
              workspaceId={workspace.id}
              groupId={groupId}
              channelId={channelId}
              currentUser={currentUser}
              onClose={() => setActiveThread(null)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
