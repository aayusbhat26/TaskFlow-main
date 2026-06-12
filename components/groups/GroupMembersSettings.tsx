'use client';

import React, { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { UserPlus, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { getRandomColor, cn } from '@/lib/utils';

interface User {
  id: string;
  name: string | null;
  username: string | null;
  image: string | null;
}

interface GroupMembersSettingsProps {
  groupId: string;
  currentMembers: User[];
  potentialMembers: User[];
}

export function GroupMembersSettings({
  groupId,
  currentMembers,
  potentialMembers,
}: GroupMembersSettingsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const filteredPotentialMembers = potentialMembers.filter((user) => {
    const query = searchQuery.toLowerCase();
    return (
      user.name?.toLowerCase().includes(query) ||
      user.username?.toLowerCase().includes(query)
    );
  });

  const handleToggleUser = (userId: string) => {
    setSelectedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const handleAddMembers = async () => {
    if (selectedUsers.length === 0) return;

    try {
      setIsLoading(true);
      const response = await fetch(`/api/groups/${groupId}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userIds: selectedUsers }),
      });

      if (!response.ok) {
        throw new Error('Failed to add members');
      }

      toast({
        title: 'Success',
        description: `Added ${selectedUsers.length} members to the group.`,
      });

      setIsOpen(false);
      setSelectedUsers([]);
      router.refresh();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to add members. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-foreground">Group Members</h2>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
              <UserPlus className="w-4 h-4 mr-2" />
              Add Members
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add Members to Group</DialogTitle>
              <DialogDescription>
                Select users from the workspace to add to this group.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4">
              <div className="relative mb-4">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>

              <ScrollArea className="h-[300px] pr-4">
                {filteredPotentialMembers.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    No users found to add.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredPotentialMembers.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center space-x-3 p-2 rounded-lg hover:bg-muted transition-colors cursor-pointer"
                        onClick={() => handleToggleUser(user.id)}
                      >
                        <Checkbox
                          checked={selectedUsers.includes(user.id)}
                          onCheckedChange={() => handleToggleUser(user.id)}
                        />
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={user.image || ''} alt={user.name || ''} />
                          <AvatarFallback className={cn("text-primary-foreground font-semibold", getRandomColor(user.id))}>
                            {user.name?.charAt(0) || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {user.name || user.username}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            @{user.username}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsOpen(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddMembers}
                disabled={selectedUsers.length === 0 || isLoading}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {isLoading ? 'Adding...' : `Add ${selectedUsers.length} Members`}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <ScrollArea className="flex-1 -mx-6 px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-6">
          {currentMembers.map((member) => (
            <div
              key={member.id}
              className="flex items-center p-4 bg-card border border-border rounded-lg shadow-sm"
            >
              <Avatar className="w-10 h-10 mr-4">
                <AvatarImage src={member.image || ''} alt={member.name || ''} />
                <AvatarFallback className={cn("text-primary-foreground font-semibold", getRandomColor(member.id))}>
                  {member.name?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-foreground">
                  {member.name || member.username}
                </p>
                <p className="text-sm text-muted-foreground">@{member.username}</p>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
