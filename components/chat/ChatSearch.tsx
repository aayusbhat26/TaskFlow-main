'use client';

import React, { useState, useEffect } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';

interface ChatSearchProps {
  workspaceId?: string;
  groupId?: string;
  currentUser?: any;
}

export function ChatSearch({ workspaceId, groupId, currentUser }: ChatSearchProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({ query });
        if (workspaceId) params.append('workspaceId', workspaceId);
        if (groupId) params.append('groupId', groupId);

        const res = await fetch(`/api/chat/search?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    }, 300); // debounce

    return () => clearTimeout(timer);
  }, [query, workspaceId, groupId]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-muted-foreground hover:text-foreground hover:bg-accent p-1"
        >
          <Search className="w-4 h-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-2" align="end">
        <div className="flex items-center border-b px-2 pb-2">
          <Search className="w-4 h-4 mr-2 text-muted-foreground" />
          <Input 
            value={query} 
            onChange={(e) => setQuery(e.target.value)} 
            placeholder="Search messages..." 
            className="h-8 border-0 shadow-none focus-visible:ring-0" 
            autoFocus
          />
        </div>
        <ScrollArea className="h-64 mt-2">
          {isLoading && (
            <div className="flex justify-center py-4">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          )}
          {!isLoading && query && results.length === 0 && (
            <p className="text-sm text-center text-muted-foreground py-4">No messages found.</p>
          )}
          {!isLoading && results.map((msg) => (
            <div key={msg.id} className="p-2 hover:bg-muted rounded-md mb-1 cursor-pointer" onClick={() => {
              // Usually we would jump to the message, but for now we just close the popover
              // and let the user see it. True jumping requires scrolling to message ID.
              setOpen(false);
              const el = document.querySelector(`[data-message-id="${msg.id}"]`);
              if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold">{msg.author.name || msg.author.username}</span>
                <span className="text-[10px] text-muted-foreground">{new Date(msg.createdAt).toLocaleDateString()}</span>
              </div>
              <p className="text-sm text-muted-foreground line-clamp-2">{msg.content}</p>
            </div>
          ))}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
