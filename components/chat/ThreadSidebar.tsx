'use client';

import React, { useEffect, useState, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { X, Loader2 } from 'lucide-react';
import { cn, getRandomColor } from '@/lib/utils';
import { useSocket } from '@/context/SocketProvider';
import { ChatInput } from './ChatInput';

interface ThreadSidebarProps {
  parentMessage: any;
  workspaceId: string;
  groupId?: string;
  channelId?: string;
  currentUser: any;
  onClose: () => void;
}

export function ThreadSidebar({
  parentMessage,
  workspaceId,
  groupId,
  channelId,
  currentUser,
  onClose
}: ThreadSidebarProps) {
  const { socket } = useSocket();
  const [replies, setReplies] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchReplies = async () => {
      try {
        setIsLoading(true);
        const url = new URL('/api/chat/messages', window.location.origin);
        if (channelId) url.searchParams.append('channelId', channelId);
        else if (groupId) url.searchParams.append('groupId', groupId);
        else if (workspaceId) url.searchParams.append('workspaceId', workspaceId);
        url.searchParams.append('threadId', parentMessage.id);

        const res = await fetch(url.toString());
        if (res.ok) {
          const data = await res.json();
          setReplies(data);
        }
      } catch (error) {
        console.error('Failed to fetch replies:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchReplies();
  }, [parentMessage.id, workspaceId, groupId]);

  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (message: any) => {
      if (message.replyToId === parentMessage.id) {
        setReplies(prev => {
          if (prev.some(m => m.id === message.id || m.id === message.tempId)) {
            return prev.map(m => m.id === message.tempId ? message : m);
          }
          return [...prev, message];
        });
      }
    };

    socket.on('new-message', handleNewMessage);
    return () => {
      socket.off('new-message', handleNewMessage);
    };
  }, [socket, parentMessage.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [replies]);

  const handleOptimisticReply = (message: any) => {
    setReplies(prev => [...prev, message]);
  };

  const handleReplyConfirmed = (tempId: string, realMessage: any) => {
    setReplies(prev => prev.map(m => m.id === tempId ? realMessage : m));
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderMessageContent = (content: string) => {
    if (!content) return null;
    const parts = content.split(/(@[a-zA-Z0-9_]+)/g);
    return parts.map((part, i) => {
      if (part.startsWith('@')) {
        return <span key={i} className="font-semibold px-1 rounded mx-0.5 text-primary bg-primary/10">{part}</span>;
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div className="w-80 border-l border-border bg-background flex flex-col h-full absolute right-0 top-0 bottom-0 z-20 sm:relative shadow-xl sm:shadow-none transition-all duration-300 transform">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-muted/20">
        <h3 className="font-semibold text-foreground">Thread</h3>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1 p-4">
        {/* Parent Message */}
        <div className="mb-6">
          <div className="flex items-start gap-3">
            <Avatar className="w-8 h-8 flex-shrink-0">
              <AvatarImage src={parentMessage.author?.image || ''} />
              <AvatarFallback className={cn("text-white font-semibold", getRandomColor(parentMessage.author?.id))}>
                {parentMessage.author?.name?.charAt(0) || parentMessage.author?.username?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="font-semibold text-sm truncate">{parentMessage.author?.name || parentMessage.author?.username}</span>
                <span className="text-xs text-muted-foreground">{formatTime(parentMessage.createdAt)}</span>
              </div>
              <div className="text-sm text-foreground mt-1 whitespace-pre-wrap break-words">
                {renderMessageContent(parentMessage.content)}
              </div>
              {/* Attachments for Parent */}
              {parentMessage.attachments?.length > 0 && (
                <div className="mt-2 space-y-2">
                  {parentMessage.attachments.map((file: any, idx: number) => {
                     const isImage = (file.mimeType || file.type || '').startsWith('image/');
                     if (isImage) {
                       return <img key={idx} src={file.url} alt="attachment" className="max-w-full rounded border border-border" />;
                     }
                     return (
                       <a key={idx} href={file.url} target="_blank" className="text-xs text-blue-500 hover:underline flex items-center gap-1">
                         📎 {file.name || 'Attachment'}
                       </a>
                     );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs font-medium text-muted-foreground">
            {replies.length} {replies.length === 1 ? 'Reply' : 'Replies'}
          </span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Replies */}
        {isLoading ? (
          <div className="flex justify-center p-4">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            {replies.map(reply => (
              <div key={reply.id} className={cn("flex items-start gap-3", reply.isOptimistic && "opacity-70")}>
                <Avatar className="w-8 h-8 flex-shrink-0">
                  <AvatarImage src={reply.author?.image || ''} />
                  <AvatarFallback className={cn("text-white font-semibold", getRandomColor(reply.author?.id))}>
                    {reply.author?.name?.charAt(0) || reply.author?.username?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="font-semibold text-sm truncate">{reply.author?.name || reply.author?.username}</span>
                    <span className="text-xs text-muted-foreground">{formatTime(reply.createdAt)}</span>
                  </div>
                  <div className="text-sm text-foreground mt-0.5 whitespace-pre-wrap break-words">
                    {renderMessageContent(reply.content)}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <div className="mt-auto">
        <ChatInput 
          workspaceId={workspaceId}
          groupId={groupId}
          channelId={channelId}
          currentUser={currentUser}
          replyingTo={parentMessage}
          onOptimisticMessage={handleOptimisticReply}
          onMessageConfirmed={handleReplyConfirmed}
        />
      </div>
    </div>
  );
}
