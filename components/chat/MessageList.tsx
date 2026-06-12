'use client';

import React, { useEffect, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn, getRandomColor } from '@/lib/utils';

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
  attachments?: Array<{
    url: string;
    filename?: string;
    name?: string;
    mimeType?: string;
    type?: string;
  }>;
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
  isOptimistic?: boolean;
  isEdited?: boolean;
  isDeleted?: boolean;
  readByIds?: string[];
}
import { FileIcon, ImageIcon, FileTextIcon, Reply, Smile, Edit2, Trash2, X, Check, CheckCheck } from 'lucide-react';

interface CurrentUser {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  username: string;
}

interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
  currentUser: CurrentUser;
  onReply?: (message: Message) => void;
  onReactionToggle?: (messageId: string, emoji: string) => void;
  onMessageEdit?: (message: Message) => void;
  onMessageDelete?: (messageId: string) => void;
  onMessagesRead?: (messageIds: string[]) => void;
}

export function MessageList({ messages, isLoading, currentUser, onReply, onReactionToggle, setMessages, onMessageEdit, onMessageDelete, onMessagesRead }: MessageListProps & { setMessages?: any }) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editContent, setEditContent] = React.useState('');
  const [firstUnreadId, setFirstUnreadId] = React.useState<string | null>(null);

  useEffect(() => {
    if (isLoading) {
      setFirstUnreadId(null);
    } else if (!firstUnreadId && messages.length > 0) {
      const firstUnread = messages.find(m => 
        m.author.id !== currentUser.id && 
        !(m.readByIds || []).includes(currentUser.id)
      );
      if (firstUnread) {
        setFirstUnreadId(firstUnread.id);
      }
    }
  }, [messages, isLoading, currentUser.id, firstUnreadId]);

  const handleDeleteMessage = async (messageId: string) => {
    if (!setMessages) return;
    
    // Optimistic delete
    setMessages((prev: Message[]) => prev.map(m => 
      m.id === messageId ? { ...m, content: "This message was deleted.", isDeleted: true } : m
    ));
    onMessageDelete?.(messageId);

    try {
      await fetch(`/api/chat/messages/${messageId}`, { method: 'DELETE' });
    } catch (error) {
      console.error('Failed to delete message', error);
    }
  };

  const handleEditMessage = async (messageId: string) => {
    if (!setMessages || !editContent.trim()) return;

    // Optimistic edit
    let editedMsg: Message | undefined;
    setMessages((prev: Message[]) => prev.map(m => {
      if (m.id === messageId) {
        editedMsg = { ...m, content: editContent, isEdited: true };
        return editedMsg;
      }
      return m;
    }));
    
    if (editedMsg) {
      onMessageEdit?.(editedMsg);
    }
    
    setEditingId(null);

    try {
      await fetch(`/api/chat/messages/${messageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editContent })
      });
    } catch (error) {
      console.error('Failed to edit message', error);
    }
  };

  const toggleReaction = async (messageId: string, emoji: string) => {
    // Optimistic UI update via parent
    onReactionToggle?.(messageId, emoji);
    
    try {
      await fetch('/api/chat/messages/react', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId, emoji })
      });
    } catch (e) {
      console.error(e);
      // Revert if failed (optional, simplified here)
    }
  };

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Intersection Observer for Read Receipts
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      const visibleIds = entries.filter(e => e.isIntersecting).map(e => e.target.getAttribute('data-message-id')).filter(Boolean) as string[];
      if (visibleIds.length > 0 && onMessagesRead) {
        // Filter out messages that we authored, or that we've already read
        const unreadByMe = messages.filter(m => 
          visibleIds.includes(m.id) && 
          m.author.id !== currentUser.id && 
          !(m.readByIds || []).includes(currentUser.id)
        );

        if (unreadByMe.length > 0) {
          const idsToMark = unreadByMe.map(m => m.id);
          // Call parent to emit socket and API
          onMessagesRead(idsToMark);
          
          // Optimistically update them locally
          if (setMessages) {
            setMessages((prev: Message[]) => prev.map(m => 
              idsToMark.includes(m.id) ? { ...m, readByIds: [...(m.readByIds || []), currentUser.id] } : m
            ));
          }
        }
      }
    }, { threshold: 0.1, rootMargin: '50px' });

    observerRef.current = observer;
    return () => observer.disconnect();
  }, [messages, currentUser.id, onMessagesRead, setMessages]);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString();
    }
  };

  // Group messages by date
  const groupMessagesByDate = (messages: Message[]) => {
    const groups: { [key: string]: Message[] } = {};

    messages.forEach(message => {
      const date = new Date(message.createdAt).toDateString();
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(message);
    });

    return groups;
  };

  const renderMessageContent = (content: string, isCurrentUser: boolean) => {
    const parts = content.split(/(@[a-zA-Z0-9_]+)/g);
    return parts.map((part, i) => {
      if (part.startsWith('@')) {
        return (
          <span key={i} className={cn("font-semibold px-1 rounded mx-0.5", isCurrentUser ? "text-primary-foreground bg-primary-foreground/20" : "text-primary bg-primary/10")}>
            {part}
          </span>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading messages...</p>
        </div>
      </div>
    );
  }

  const messageGroups = groupMessagesByDate(messages);

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-background">
      <ScrollArea className="flex-1">
        <div className="py-4 px-4 overflow-x-hidden">
          {Object.keys(messageGroups).length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                <span className="text-2xl">💬</span>
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                No messages yet
              </h3>
              <p className="text-muted-foreground max-w-sm px-4">
                Be the first to start the conversation in this workspace!
              </p>
            </div>
          ) : (
          Object.entries(messageGroups).map(([date, dayMessages]) => (
            <div key={date} className="mb-6">
              {/* Date separator */}
              <div className="flex items-center my-4">
                <div className="flex-1 border-t border-border"></div>
                <div className="px-3 py-1 text-xs text-muted-foreground bg-muted rounded-full">
                  {formatDate(dayMessages[0].createdAt)}
                </div>
                <div className="flex-1 border-t border-border"></div>
              </div>

              {/* Messages */}
              <div className="space-y-3">
                {dayMessages.map((message, index) => {
                  const isCurrentUser = message.author.id === currentUser.id;
                  const prevMessage = index > 0 ? dayMessages[index - 1] : null;
                  const showAvatar = !prevMessage || prevMessage.author.id !== message.author.id;
                  const isFirstUnread = message.id === firstUnreadId;

                  return (
                    <React.Fragment key={message.id}>
                      {isFirstUnread && (
                        <div className="flex items-center my-4">
                          <div className="flex-1 border-t border-red-500/50"></div>
                          <div className="px-3 py-1 text-xs text-red-500 font-medium tracking-wider uppercase bg-red-500/10 rounded-full">
                            New Messages
                          </div>
                          <div className="flex-1 border-t border-red-500/50"></div>
                        </div>
                      )}
                      <div
                        data-message-id={message.id}
                      ref={(el) => { if (el && observerRef.current) observerRef.current.observe(el); }}
                      className={cn(
                        "flex items-start space-x-3 hover:bg-muted/50 -mx-2 px-2 py-2 rounded-lg transition-colors group",
                        isCurrentUser && "flex-row-reverse space-x-reverse"
                      )}
                    >
                      {showAvatar ? (
                        <Avatar className="w-8 h-8 flex-shrink-0">
                          <AvatarImage
                            src={message.author.image || ''}
                            alt={message.author.name}
                          />
                          <AvatarFallback className={cn("text-primary-foreground font-semibold", getRandomColor(message.author.id))}>
                            {message.author.name?.charAt(0) ||
                             message.author.username?.charAt(0) || 'U'}
                          </AvatarFallback>
                        </Avatar>
                      ) : (
                        <div className="w-8 h-8 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                            {formatTime(message.createdAt)}
                          </span>
                        </div>
                      )}

                      <div className={cn("flex-1 min-w-0 group/message", isCurrentUser && "flex flex-col items-end")}>
                        {showAvatar && (
                          <div className={cn("flex items-center space-x-2 mb-1", isCurrentUser && "flex-row-reverse space-x-reverse")}>
                            <span className="font-semibold text-sm text-foreground truncate">
                              {message.author.name || message.author.username}
                              {isCurrentUser && (
                                <span className="text-primary font-normal ml-1 text-xs">(you)</span>
                              )}
                            </span>
                            <span className="text-xs text-muted-foreground hidden sm:inline">
                              {formatTime(message.createdAt)}
                            </span>
                          </div>
                        )}

                        <div className="relative flex items-center gap-2 w-fit max-w-full">
                          {/* Hover Actions Menu */}
                          {isCurrentUser && !message.isDeleted && (
                            <div className={cn(
                              "opacity-0 group-hover/message:opacity-100 transition-opacity flex gap-1 -top-4 right-2 bg-popover border border-border rounded shadow-sm absolute p-1 z-10"
                            )}>
                              <button onClick={() => toggleReaction(message.id, '👍')} className="p-1 hover:bg-muted rounded text-sm">👍</button>
                              <button onClick={() => toggleReaction(message.id, '❤️')} className="p-1 hover:bg-muted rounded text-sm">❤️</button>
                              <button onClick={() => onReply?.(message)} className="p-1 hover:bg-muted rounded text-muted-foreground"><Reply className="w-4 h-4"/></button>
                              <button onClick={() => { setEditingId(message.id); setEditContent(message.content || ''); }} className="p-1 hover:bg-muted rounded text-muted-foreground"><Edit2 className="w-4 h-4"/></button>
                              <button onClick={() => handleDeleteMessage(message.id)} className="p-1 hover:bg-muted rounded text-red-500"><Trash2 className="w-4 h-4"/></button>
                            </div>
                          )}

                        <div className={cn(
                          "rounded-lg px-3 py-2 max-w-full lg:max-w-2xl border flex flex-col gap-2 relative",
                          isCurrentUser
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-card border-border",
                          !showAvatar && "mt-1",
                          message.isOptimistic && "opacity-70"
                        )}>
                          {message.replyTo && (
                            <div className={cn(
                              "text-xs p-2 rounded mb-1 border-l-2",
                              isCurrentUser ? "bg-primary-foreground/20 border-primary-foreground text-primary-foreground" : "bg-muted border-border text-muted-foreground"
                            )}>
                              <div className="font-semibold">{message.replyTo.author.name || message.replyTo.author.username}</div>
                              <div className="truncate opacity-80">{message.replyTo.content || 'Attachment'}</div>
                            </div>
                          )}
                          {editingId === message.id ? (
                            <div className="flex flex-col gap-2 min-w-[200px]">
                              <textarea
                                autoFocus
                                value={editContent}
                                onChange={(e) => setEditContent(e.target.value)}
                                className="w-full text-sm rounded bg-background/50 border border-border p-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                                rows={3}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleEditMessage(message.id);
                                  } else if (e.key === 'Escape') {
                                    setEditingId(null);
                                  }
                                }}
                              />
                              <div className="flex justify-end gap-1">
                                <button onClick={() => setEditingId(null)} className="p-1 rounded bg-muted/50 hover:bg-muted text-muted-foreground"><X className="w-4 h-4" /></button>
                                <button onClick={() => handleEditMessage(message.id)} className="p-1 rounded bg-primary/80 hover:bg-primary text-primary-foreground"><Check className="w-4 h-4" /></button>
                              </div>
                            </div>
                          ) : (
                            message.content && (
                              <p className={cn(
                                "text-sm whitespace-pre-wrap break-words",
                                isCurrentUser ? "text-primary-foreground" : "text-card-foreground",
                                message.isDeleted && "italic opacity-70"
                              )}>
                                {renderMessageContent(message.content, isCurrentUser)}
                                {message.isEdited && !message.isDeleted && (
                                  <span className="text-[10px] ml-2 opacity-50">(edited)</span>
                                )}
                                <span className="inline-flex items-center gap-1 ml-3 mt-1 float-right text-[10px] opacity-70">
                                  {formatTime(message.createdAt)}
                                  {isCurrentUser && !message.isOptimistic && !message.isDeleted && (
                                    (message.readByIds && message.readByIds.some(id => id !== currentUser.id)) 
                                      ? <CheckCheck className="w-4 h-4 text-green-400 font-semibold drop-shadow-sm" /> 
                                      : <Check className="w-3 h-3 text-white/70" />
                                  )}
                                </span>
                              </p>
                            )
                          )}
                          
                          {/* Render Attachments */}
                          {message.attachments && message.attachments.length > 0 && (
                            <div className="flex flex-col gap-2 mt-1">
                              {message.attachments.map((file, idx) => {
                                const isImage = (file.mimeType || file.type || '').startsWith('image/');
                                const fileName = file.filename || file.name || 'Attachment';
                                
                                if (isImage) {
                                  return (
                                    <a key={idx} href={file.url} target="_blank" rel="noopener noreferrer" className="block max-w-sm rounded-md overflow-hidden border border-black/10">
                                      <img src={file.url} alt={fileName} className="w-full h-auto object-cover max-h-60 hover:opacity-90 transition-opacity" />
                                    </a>
                                  );
                                }
                                
                                return (
                                  <a key={idx} href={file.url} target="_blank" rel="noopener noreferrer" 
                                    className={cn(
                                      "flex items-center gap-2 p-2 rounded-md border transition-colors",
                                      isCurrentUser ? "bg-primary border-primary/80 hover:bg-primary/90 text-primary-foreground" : "bg-muted border-border hover:bg-muted/80 text-foreground"
                                    )}>
                                    <FileIcon className="w-5 h-5 flex-shrink-0" />
                                    <span className="text-sm font-medium truncate max-w-[200px]">{fileName}</span>
                                  </a>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {!isCurrentUser && !message.isDeleted && (
                          <div className="opacity-0 group-hover/message:opacity-100 transition-opacity flex gap-1 -mt-4 bg-popover border border-border rounded shadow-sm absolute left-[100%] ml-2 p-1 z-10">
                            <button onClick={() => toggleReaction(message.id, '👍')} className="p-1 hover:bg-muted rounded text-sm">👍</button>
                            <button onClick={() => toggleReaction(message.id, '❤️')} className="p-1 hover:bg-muted rounded text-sm">❤️</button>
                            <button onClick={() => onReply?.(message)} className="p-1 hover:bg-muted rounded text-muted-foreground"><Reply className="w-4 h-4"/></button>
                          </div>
                        )}
                        </div>

                        {message.reactions && message.reactions.length > 0 && (
                          <div className={cn("flex flex-wrap gap-1 mt-1", isCurrentUser && "justify-end")}>
                            {Array.from(new Set(message.reactions.map(r => r.emoji))).map(emoji => {
                              const count = message.reactions!.filter(r => r.emoji === emoji).length;
                              const hasReacted = message.reactions!.some(r => r.emoji === emoji && r.user.username === currentUser.username);
                              return (
                                <button
                                  key={emoji}
                                  onClick={() => toggleReaction(message.id, emoji)}
                                  className={cn(
                                    "px-1.5 py-0.5 rounded-full text-xs flex items-center gap-1 border",
                                    hasReacted ? "bg-primary/20 border-primary/30 text-primary" : "bg-muted border-border text-muted-foreground hover:bg-muted/80"
                                  )}
                                >
                                  <span>{emoji}</span>
                                  <span>{count}</span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
    </ScrollArea>
    </div>
  );
}
