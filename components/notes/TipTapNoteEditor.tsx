'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useEditor, BubbleMenu, EditorContent, FloatingMenu } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import { Color } from '@tiptap/extension-color';
import TextStyle from '@tiptap/extension-text-style';
import Image from '@tiptap/extension-image';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Placeholder from '@tiptap/extension-placeholder';
import { useAutosaveIndicator } from '@/context/AutosaveIndicator';
import { useDebouncedCallback } from 'use-debounce';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Trash2, Edit3, Type, List as ListIcon, ListOrdered, Code, Code2, Quote, Undo, Redo, Heading1, Heading2, Heading3, Minus } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import * as Y from 'yjs';
import { WebrtcProvider } from 'y-webrtc';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';

const USER_COLORS = ['#f783ac', '#8ce99a', '#74c0fc', '#ffa94d', '#d0ebff', '#ffc9c9'];

interface Note {
  id: string;
  title?: string | null;
  icon?: string | null;
  content: string;
}

interface TipTapNoteEditorProps {
  note: Note | null;
  onNoteUpdate: (noteId: string, updates: Partial<Note>) => Promise<void>;
  onNoteDelete: (noteId: string) => Promise<void>;
  isLoading?: boolean;
  currentUser?: { id: string; name: string; username: string; image?: string | null };
}

export function TipTapNoteEditor({
  note,
  onNoteUpdate,
  onNoteDelete,
  isLoading = false,
  currentUser,
}: TipTapNoteEditorProps) {
  const { toast } = useToast();
  const { onSetStatus, status } = useAutosaveIndicator();
  const [title, setTitle] = useState(note?.title || 'Untitled');
  
  // Track original content to properly detect changes
  const originalTitle = useRef<string>(note?.title || 'Untitled');

  const [yProvider] = useState(() => {
    if (!note?.id) return null;
    const ydoc = new Y.Doc();
    const provider = new WebrtcProvider(`taskflow-note-${note.id}`, ydoc, {
      signaling: ['wss://signaling.yjs.dev']
    });
    return { ydoc, provider };
  });

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
      }),
      Color,
      TextStyle,
      Image,
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Placeholder.configure({
        emptyNodeClass: 'before:text-muted-foreground',
        placeholder: 'Press / for commands or start typing...',
      }),
      ...(yProvider ? [
        Collaboration.configure({
          document: yProvider.ydoc,
        }),
        CollaborationCursor.configure({
          provider: yProvider.provider,
          user: {
            name: currentUser?.name || 'Anonymous',
            color: USER_COLORS[Math.floor(Math.random() * USER_COLORS.length)],
          },
        }),
      ] : []),
    ],
    editorProps: {
      attributes: {
        class:
          'prose prose-sm sm:prose-base dark:prose-invert prose-headings:font-bold prose-a:text-primary focus:outline-none max-w-none min-h-[500px] pb-32',
      },
    },
    onUpdate: ({ editor, transaction }) => {
      // Ignore remote transactions (e.g. from Yjs synchronization) to prevent circular database saves
      if (transaction.getMeta('y-sync$')) {
        return;
      }
      onSetStatus('unsaved');
      if (note?.id) {
        debouncedSave(note.id, editor.getHTML(), title);
      }
    },
  });

  // Cleanup WebRTC Provider
  useEffect(() => {
    return () => {
      if (yProvider) {
        yProvider.provider.destroy();
        yProvider.ydoc.destroy();
      }
    };
  }, [yProvider]);

  // Load initial content from database if the document is empty on sync
  useEffect(() => {
    if (!editor || !yProvider || !note) return;

    let isSubscribed = true;

    const handleSync = (syncState: { synced: boolean } | boolean) => {
      const isSynced = typeof syncState === "boolean" ? syncState : syncState.synced;
      if (!isSubscribed) return;
      if (isSynced) {
        // Wait a small moment to ensure that active peer discovery finishes
        setTimeout(() => {
          if (!isSubscribed) return;
          const xmlFragment = yProvider.ydoc.getXmlFragment('default');
          const connectedPeersCount = yProvider.provider.awareness.getStates().size;
          
          // If we are the only user in the room (connectedPeersCount <= 1)
          // and the Yjs document is empty, initialize it with the database content
          if (connectedPeersCount <= 1 && xmlFragment.length === 0 && note.content) {
            editor.commands.setContent(note.content);
          }
        }, 500);
      }
    };

    yProvider.provider.on('synced', handleSync);
    
    // In case the provider was already synced
    // @ts-ignore
    if (yProvider.provider.synced) {
      handleSync(true);
    }

    return () => {
      isSubscribed = false;
      yProvider.provider.off('synced', handleSync);
    };
  }, [editor, yProvider, note?.id]);

  // Handle title updates from other clients
  useEffect(() => {
    if (!note || !editor) return;

    if (note.title && originalTitle.current !== note.title) {
      setTitle(note.title);
      originalTitle.current = note.title;
    }
  }, [note?.title, editor]);

  const debouncedSave = useDebouncedCallback(async (noteId: string, htmlContent: string, currentTitle: string) => {
    try {
      onSetStatus('pending');
      
      await onNoteUpdate(noteId, {
        title: currentTitle,
        content: htmlContent,
      });

      // Only update originalTitle if we're still on the same note
      if (note?.id === noteId) {
        originalTitle.current = currentTitle;
      }
      onSetStatus('saved');
    } catch (error) {
      onSetStatus('unsaved');
      toast({
        title: 'Error',
        description: 'Failed to save changes. Please try again.',
        variant: 'destructive',
      });
    }
  }, 1500);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    onSetStatus('unsaved');
    if (editor && note?.id) {
      debouncedSave(note.id, editor.getHTML(), newTitle);
    }
  };

  if (!editor) {
    return (
      <div className="flex-1 flex flex-col p-8 bg-background animate-pulse">
        <div className="h-10 bg-muted rounded w-1/3 mb-8"></div>
        <div className="space-y-4">
          <div className="h-4 bg-muted rounded w-full"></div>
          <div className="h-4 bg-muted rounded w-5/6"></div>
          <div className="h-4 bg-muted rounded w-4/6"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-background h-full overflow-hidden relative">
      {/* Top Bar */}
      <div className="border-b w-full">
        <div className="flex items-center justify-between px-8 py-4 max-w-4xl w-full mx-auto">
          <div className="flex-1 min-w-0 pr-4">
            <Input
              value={title}
              onChange={handleTitleChange}
              className="text-3xl font-bold border-none bg-transparent shadow-none px-0 focus-visible:ring-0 w-full"
              placeholder="Note Title"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => note && onNoteDelete(note.id)}
              className="text-destructive hover:text-destructive/90 hover:bg-destructive/10"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>
      </div>

      {/* Editor Content Area */}
      <div className="flex-1 overflow-y-auto px-8 py-6 max-w-4xl w-full mx-auto">
        <FloatingMenu editor={editor} tippyOptions={{ duration: 100 }} className="flex overflow-hidden rounded-md border bg-popover p-1 shadow-md">
          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            className={`p-2 hover:bg-accent rounded-sm ${editor.isActive('heading', { level: 1 }) ? 'bg-accent' : ''}`}
            title="Heading 1"
          >
            <Heading1 className="w-4 h-4" />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={`p-2 hover:bg-accent rounded-sm ${editor.isActive('heading', { level: 2 }) ? 'bg-accent' : ''}`}
            title="Heading 2"
          >
            <Heading2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            className={`p-2 hover:bg-accent rounded-sm ${editor.isActive('heading', { level: 3 }) ? 'bg-accent' : ''}`}
            title="Heading 3"
          >
            <Heading3 className="w-4 h-4" />
          </button>
          <Separator orientation="vertical" className="mx-1 h-8" />
          <button
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`p-2 hover:bg-accent rounded-sm ${editor.isActive('bulletList') ? 'bg-accent' : ''}`}
            title="Bullet List"
          >
            <ListIcon className="w-4 h-4" />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={`p-2 hover:bg-accent rounded-sm ${editor.isActive('orderedList') ? 'bg-accent' : ''}`}
            title="Numbered List"
          >
            <ListOrdered className="w-4 h-4" />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleTaskList().run()}
            className={`p-2 hover:bg-accent rounded-sm ${editor.isActive('taskList') ? 'bg-accent' : ''}`}
            title="Task List"
          >
            <span className="text-xs font-bold font-mono">[]</span>
          </button>
          <Separator orientation="vertical" className="mx-1 h-8" />
          <button
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className={`p-2 hover:bg-accent rounded-sm ${editor.isActive('blockquote') ? 'bg-accent' : ''}`}
            title="Quote"
          >
            <Quote className="w-4 h-4" />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            className={`p-2 hover:bg-accent rounded-sm ${editor.isActive('codeBlock') ? 'bg-accent' : ''}`}
            title="Code Block"
          >
            <Code2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            className="p-2 hover:bg-accent rounded-sm"
            title="Divider"
          >
            <Minus className="w-4 h-4" />
          </button>
        </FloatingMenu>

        <BubbleMenu editor={editor} tippyOptions={{ duration: 100 }} className="flex overflow-hidden rounded-md border bg-popover p-1 shadow-md">
          <button
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`p-2 hover:bg-accent rounded-sm ${editor.isActive('bold') ? 'bg-accent font-bold' : 'font-bold'}`}
          >
            B
          </button>
          <button
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`p-2 hover:bg-accent rounded-sm ${editor.isActive('italic') ? 'bg-accent italic' : 'italic'}`}
          >
            I
          </button>
          <button
            onClick={() => editor.chain().focus().toggleStrike().run()}
            className={`p-2 hover:bg-accent rounded-sm ${editor.isActive('strike') ? 'bg-accent line-through' : 'line-through'}`}
          >
            S
          </button>
          <Separator orientation="vertical" className="mx-1 h-8" />
          <button
            onClick={() => editor.chain().focus().toggleCode().run()}
            className={`p-2 hover:bg-accent rounded-sm ${editor.isActive('code') ? 'bg-accent' : ''}`}
          >
            <Code className="w-4 h-4" />
          </button>
        </BubbleMenu>

        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
