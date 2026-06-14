"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Hash, Volume2, Video, Mic, Plus, Keyboard } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { newChannelSchema, NewChannelSchema } from "@/schema/channelSchema";

interface Props {
  workspaceId: string;
  categoryId?: string | null;
  categories: { id: string; name: string }[];
  children?: React.ReactNode;
}

export const NewChannelModal = ({ workspaceId, categoryId, categories, children }: Props) => {
  const t = useTranslations("SIDEBAR.WORKSPACE_OPTIONS");
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();

  const form = useForm<NewChannelSchema>({
    resolver: zodResolver(newChannelSchema),
    defaultValues: {
      name: "",
      type: "VOICE" as any,
      workspaceId,
      categoryId: categoryId || undefined,
    },
  });

  const { mutate, isPending } = useMutation({
    mutationFn: async (data: NewChannelSchema) => {
      const res = await fetch("/api/channels/new", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create channel");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["getWorkspaceChannels", workspaceId] });
      toast({ title: "Success", description: "Channel created successfully" });
      setIsOpen(false);
      form.reset();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create channel", variant: "destructive" });
    },
  });

  const onSubmit = (data: NewChannelSchema) => {
    mutate(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="ghost" size="icon" className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity p-0">
            <Plus size={14} />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create Channel</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Channel Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type">
                          {field.value === "VOICE" && "Voice"}
                          {field.value === "VIDEO" && "Video"}
                          {field.value === "STAGE" && "Stage"}
                          {field.value === "TYPING_RACE" && "Typing Race"}
                        </SelectValue>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="VOICE">
                        <div className="flex items-center"><Volume2 className="mr-2 h-4 w-4" /> Voice</div>
                      </SelectItem>
                      <SelectItem value="VIDEO">
                        <div className="flex items-center"><Video className="mr-2 h-4 w-4" /> Video</div>
                      </SelectItem>
                      <SelectItem value="STAGE">
                        <div className="flex items-center"><Mic className="mr-2 h-4 w-4" /> Stage</div>
                      </SelectItem>
                      <SelectItem value="TYPING_RACE">
                        <div className="flex items-center"><Keyboard className="mr-2 h-4 w-4" /> Typing Race</div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Channel Name</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Hash className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input placeholder="new-channel" className="pl-9" {...field} onChange={e => field.onChange(e.target.value.toLowerCase().replace(/\s+/g, '-'))} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category (Optional)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || undefined} defaultValue={field.value || undefined}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="No category">
                          {categories.find(cat => cat.id === field.value)?.name || "No Category"}
                        </SelectValue>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">No Category</SelectItem>
                      {categories.map(cat => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end pt-4">
              <Button type="button" variant="ghost" className="mr-2" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                Create Channel
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
