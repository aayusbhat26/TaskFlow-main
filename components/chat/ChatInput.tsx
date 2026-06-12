'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import {
  Send,
  Smile,
  Paperclip,
  Plus
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSocket } from '@/context/SocketProvider';
import { useUploadThing } from '@/lib/uploadthing';
import { X, Loader2 } from 'lucide-react';

interface CurrentUser {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  username: string;
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
  isOptimistic?: boolean;
  readByIds?: string[];
}

interface ChatInputProps {
  workspaceId: string;
  groupId?: string;
  channelId?: string;
  currentUser: CurrentUser;
  replyingTo?: Message | null;
  onCancelReply?: () => void;
  onOptimisticMessage?: (message: Message) => void;
  onMessageConfirmed?: (tempId: string, realMessage: Message) => void;
}

export function ChatInput({ workspaceId, groupId, channelId, currentUser, replyingTo, onCancelReply, onOptimisticMessage, onMessageConfirmed }: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState<any[]>([]);
  const [isSending, setIsSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { socket } = useSocket();

  const [workspaceUsers, setWorkspaceUsers] = useState<CurrentUser[]>([]);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionIndex, setMentionIndex] = useState(0);

  useEffect(() => {
    if (workspaceId) {
      fetch(`/api/workspace/users/${workspaceId}?_t=${Date.now()}`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setWorkspaceUsers(data);
          }
        })
        .catch(console.error);
    }
  }, [workspaceId]);

  const filteredUsers = workspaceUsers.filter(u => 
    u.username.toLowerCase().includes(mentionQuery.toLowerCase()) || 
    (u.name && u.name.toLowerCase().includes(mentionQuery.toLowerCase()))
  );

  const { startUpload, isUploading } = useUploadThing("chatFileUpload", {
    onClientUploadComplete: (res) => {
      if (res && res.length > 0) {
        setAttachments(prev => [...prev, ...res]);
      }
    },
    onUploadError: (error: Error) => {
      console.error(error);
      alert("Error uploading file: " + error.message);
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      startUpload(Array.from(e.target.files));
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = ''; // reset input
    }
  };

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    }
  }, [message]);

  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setMessage(val);

    // Handle typing indicators
    if (socket && (workspaceId || groupId)) {
      socket.emit('typing-start', { workspaceId: groupId || workspaceId });
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('typing-stop', { workspaceId: groupId || workspaceId });
      }, 2000);
    }

    const cursorPosition = e.target.selectionStart;
    const textBeforeCursor = val.slice(0, cursorPosition);
    const match = textBeforeCursor.match(/(?:^|\s)@([a-zA-Z0-9_]*)$/);
    
    if (match) {
      setShowMentions(true);
      setMentionQuery(match[1]);
      setMentionIndex(0);
    } else {
      setShowMentions(false);
      setMentionQuery('');
    }
  };

  const insertMention = (username: string) => {
    const cursorPosition = textareaRef.current?.selectionStart || message.length;
    const textBeforeCursor = message.slice(0, cursorPosition);
    const textAfterCursor = message.slice(cursorPosition);
    
    const match = textBeforeCursor.match(/(?:^|\s)@([a-zA-Z0-9_]*)$/);
    if (match) {
      // Find the actual start index of the match to preserve leading spaces
      const matchIndex = match.index === 0 ? 0 : match.index! + 1; // +1 if there was a leading space
      
      const newTextBefore = textBeforeCursor.slice(0, matchIndex) + `@${username} `;
      setMessage(newTextBefore + textAfterCursor);
      setShowMentions(false);
      setMentionQuery('');
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          const newCursorPos = newTextBefore.length;
          textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
        }
      }, 0);
    }
  };

  const sendMessage = async () => {
    const trimmedMessage = message.trim();
    if ((!trimmedMessage && attachments.length === 0) || (!workspaceId && !groupId && !channelId)) return;

    const tempId = `temp-${Date.now()}`;
    const optimisticMessage: Message = {
      id: tempId,
      content: trimmedMessage || null,
      createdAt: new Date().toISOString(),
      author: {
        id: currentUser.id,
        name: currentUser.name,
        username: currentUser.username,
        image: currentUser.image,
      },
      attachments,
      replyTo: replyingTo ? {
        id: replyingTo.id,
        content: replyingTo.content,
        author: { name: replyingTo.author.name, username: replyingTo.author.username }
      } : undefined,
      isOptimistic: true,
    };

    // Optimistic update
    onOptimisticMessage?.(optimisticMessage);
    setMessage(''); // Clear input immediately
    const currentAttachments = [...attachments];
    setAttachments([]); // Clear attachments
    const currentReplyId = replyingTo?.id;
    onCancelReply?.(); // Clear reply state

    // Stop typing indicator
    if (socket) {
      socket.emit('typing-stop', { workspaceId: channelId || groupId || workspaceId });
    }

    // Reset height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    try {
      setIsSending(true);

      const response = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: trimmedMessage,
          workspaceId: (groupId || channelId) ? undefined : workspaceId,
          groupId,
          channelId,
          attachments: currentAttachments,
          replyToId: currentReplyId,
        }),
      });

      if (response.ok) {
        const newMessage = await response.json();

        // Confirm message
        onMessageConfirmed?.(tempId, newMessage);

        // Emit to socket for real-time updates (broadcast the created message)
        if (socket) {
          socket.emit('message-created', {
            workspaceId: channelId || groupId || workspaceId, // Use channelId or groupId as room ID if present
            message: { ...newMessage, tempId },
          });
        }
      } else {
        console.error('Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showMentions && filteredUsers.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionIndex(prev => (prev + 1) % filteredUsers.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionIndex(prev => (prev - 1 + filteredUsers.length) % filteredUsers.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        insertMention(filteredUsers[mentionIndex].username);
        return;
      }
      if (e.key === 'Escape') {
        setShowMentions(false);
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const canSend = (message.trim().length > 0 || attachments.length > 0) && !isUploading && !isSending;

  return (
    <div className="border-t border-border bg-background flex-shrink-0">
      {replyingTo && (
        <div className="px-4 py-2 bg-muted/50 border-b border-border flex items-center justify-between">
          <div className="flex flex-col text-sm truncate pr-4">
            <span className="font-semibold text-foreground">Replying to {replyingTo.author.name || replyingTo.author.username}</span>
            <span className="text-muted-foreground truncate">{replyingTo.content || 'Attachment'}</span>
          </div>
          <button onClick={onCancelReply} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      <div className="px-4 py-3">
        {/* Attachments Preview */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {attachments.map((file, idx) => (
              <div key={idx} className="relative group flex items-center bg-muted rounded p-1 pr-2">
                {file.url && file.type?.startsWith('image/') ? (
                  <img src={file.url} alt={file.name} className="w-10 h-10 object-cover rounded mr-2" />
                ) : (
                  <div className="w-10 h-10 bg-muted-foreground/20 rounded flex items-center justify-center mr-2">
                    <Paperclip className="w-4 h-4 text-muted-foreground" />
                  </div>
                )}
                <span className="text-xs max-w-[150px] truncate">{file.name}</span>
                <button
                  onClick={() => setAttachments(prev => prev.filter((_, i) => i !== idx))}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="flex items-end space-x-3">


          {/* Message input */}
          <div className="flex-1 relative">
            {/* Mention Dropdown */}
            {showMentions && filteredUsers.length > 0 && (
              <div className="absolute bottom-full left-0 mb-2 w-64 max-h-48 overflow-y-auto bg-popover text-popover-foreground rounded-md border border-border shadow-md z-50">
                {filteredUsers.map((user, i) => (
                  <button
                    key={user.id}
                    onClick={() => insertMention(user.username)}
                    onMouseEnter={() => setMentionIndex(i)}
                    className={cn(
                      "w-full text-left px-3 py-2 flex items-center space-x-2 text-sm hover:bg-accent hover:text-accent-foreground",
                      mentionIndex === i ? "bg-accent text-accent-foreground" : ""
                    )}
                  >
                    {user.image ? (
                      <img src={user.image} alt={user.username} className="w-6 h-6 rounded-full" />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs text-primary">
                        {user.username.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="flex flex-col overflow-hidden">
                      <span className="font-medium truncate">{user.name || user.username}</span>
                      <span className="text-xs text-muted-foreground truncate">@{user.username}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}

            <Textarea
              ref={textareaRef}
              value={message}
              onChange={handleMessageChange}
              onKeyDown={handleKeyDown}
              placeholder="Type your message..."
              className={cn(
                "min-h-[40px] max-h-[120px] resize-none border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-lg bg-background text-foreground placeholder-muted-foreground",
                "pr-20 py-2 pl-3 text-sm" // Space for buttons
              )}
            />

            {/* Input actions */}
            <div className="absolute right-2 bottom-2 flex items-center space-x-1">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                className="hidden"
                multiple
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="text-gray-400 hover:text-gray-600 p-1 h-7 w-7 rounded-md hover:bg-gray-100 transition-colors"
              >
                {isUploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Paperclip className="w-3 h-3" />}
              </Button>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-gray-400 hover:text-gray-600 p-1 h-7 w-7 rounded-md hover:bg-gray-100 transition-colors"
                  >
                    <Smile className="w-3 h-3" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent side="top" align="end" className="p-0 border-none bg-transparent shadow-none w-auto">
                  <Picker 
                    data={data} 
                    onEmojiSelect={(emoji: any) => {
                      const cursorPosition = textareaRef.current?.selectionStart || message.length;
                      const textBeforeCursor = message.slice(0, cursorPosition);
                      const textAfterCursor = message.slice(cursorPosition);
                      setMessage(textBeforeCursor + emoji.native + textAfterCursor);
                      // Set focus back to textarea
                      setTimeout(() => {
                        textareaRef.current?.focus();
                      }, 0);
                    }} 
                    theme="light" 
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Send button */}
          <Button
            onClick={sendMessage}
            disabled={!canSend}
            size="sm"
            className={cn(
              "px-3 py-2 h-9 rounded-lg font-medium transition-colors",
              canSend
                ? "bg-blue-600 hover:bg-blue-700 text-white"
                : "bg-gray-200 text-gray-400 cursor-not-allowed"
            )}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>

        {/* Character count or other info */}
        {message.length > 0 && (
          <div className="mt-2 flex items-center justify-between text-xs">
            <div className="text-gray-500 hidden sm:block">
              <span>Press Enter to send • Shift+Enter for new line</span>
            </div>
            <span className={cn(
              "font-medium ml-auto",
              message.length > 1800 ? "text-red-500" : "text-gray-500"
            )}>
              {message.length}/2000
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
