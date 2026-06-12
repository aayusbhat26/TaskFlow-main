import { useState, useCallback } from 'react';
import { useToast } from './use-toast';
import { useQueryClient } from '@tanstack/react-query';

interface Task {
  id: string;
  title: string;
  emoji: string;
  content?: any;
  createdAt: string;
  updatedAt: string;
  workspaceId: string;
  creator: {
    id: string;
    name: string;
    image?: string;
  };
  assignedToTask?: Array<{
    user: {
      id: string;
      name: string;
      image?: string;
    };
  }>;
  tags?: Array<{
    id: string;
    name: string;
    color: string;
  }>;
  taskDate?: {
    id?: string;
    from?: string | null;
    to?: string | null;
  };
  isCompleted?: boolean;
  priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
}

interface TasksState {
  tasks: Task[];
  loading: boolean;
  error: string | null;
}

interface UseTasksReturn {
  tasks: Task[];
  loading: boolean;
  error: string | null;
  fetchTasks: (params?: {
    workspaceId?: string;
    search?: string;
    filter?: 'all' | 'completed' | 'pending';
  }) => Promise<void>;
  completeTask: (taskId: string, workspaceId?: string) => Promise<void>;
  createTask: (taskData: {
    title: string;
    content?: any;
    workspaceId: string;
    emoji?: string;
    assignedUserIds?: string[];
    dueDate?: string;
  }) => Promise<void>;
  refreshTasks: () => Promise<void>;
}

export function useTasks(): UseTasksReturn {
  const [state, setState] = useState<TasksState>({
    tasks: [],
    loading: false,
    error: null
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const fetchTasks = useCallback(async (params?: {
    workspaceId?: string;
    search?: string;
    filter?: 'all' | 'completed' | 'pending';
  }) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      const searchParams = new URLSearchParams();
      if (params?.workspaceId) {
        searchParams.append('workspaceId', params.workspaceId);
      }
      if (params?.search) {
        searchParams.append('search', params.search);
      }
      if (params?.filter && params.filter !== 'all') {
        searchParams.append('filter', params.filter);
      }

      const response = await fetch(`/api/tasks?${searchParams}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch tasks');
      }

      if (data.success) {
        // Process tasks to ensure they have the isCompleted field
        const processedTasks = data.tasks.map((task: any) => ({
          ...task,
          // Use the database isCompleted field first, fallback to content if needed
          isCompleted: Boolean(task.isCompleted)
        }));

        setState(prev => ({
          ...prev,
          loading: false,
          error: null,
          tasks: processedTasks
        }));
      } else {
        throw new Error(data.error || 'Failed to fetch tasks');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch tasks';
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
        tasks: [] // Reset tasks on error
      }));
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  }, [toast]);

  const completeTask = useCallback(async (taskId: string, workspaceIdParam?: string) => {
    try {
      setState(prev => ({ 
        ...prev, 
        loading: true, 
        error: null 
      }));

      // Find the task to get workspaceId, but don't fail if not found locally
      const taskToUpdate = state.tasks.find(t => t.id === taskId);
      const workspaceId = workspaceIdParam || taskToUpdate?.workspaceId;

      // If we can't find the workspaceId from parameters or local state
      if (!workspaceId) {
        throw new Error('Unable to determine workspace for task completion');
      }

      // Use our new points-enabled task completion endpoint
      const response = await fetch(`/api/task/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          taskId: taskId,
          workspaceId: workspaceId
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to complete task');
      }

      if (data.success) {
        // Update local state immediately with the completed task
        setState(prev => ({
          ...prev,
          loading: false,
          error: null,
          tasks: prev.tasks.map(task =>
            task.id === taskId
              ? { 
                  ...task, 
                  isCompleted: true,
                  completedAt: new Date().toISOString(),
                  pointsEarned: data.pointsEarned || 5
                }
              : task
          )
        }));
        
        // Invalidate points query to update points display immediately
        queryClient.invalidateQueries({ queryKey: ['userPoints'] });
        
        toast({
          title: "🎉 Task Completed!",
          description: data.message || `Task completed! You earned ${data.pointsEarned || 5} points!`,
        });

        // Don't call fetchTasks() here - the optimistic update is sufficient
        // and prevents flickering between states
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to complete task';
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage
      }));
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  }, [toast, queryClient]); // Removed fetchTasks and state.tasks dependencies

  const createTask = useCallback(async (taskData: {
    title: string;
    content?: any;
    workspaceId: string;
    emoji?: string;
    assignedUserIds?: string[];
    dueDate?: string;
  }) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(taskData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create task');
      }

      if (data.success) {
        setState(prev => ({
          ...prev,
          loading: false,
          error: null,
          tasks: [data.task, ...prev.tasks] // Add new task to the beginning
        }));
        
        toast({
          title: "Task created!",
          description: "New task has been created successfully.",
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create task';
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage
      }));
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  }, [toast]);

  const refreshTasks = useCallback(async () => {
    // Re-fetch with the last used parameters or default to all tasks
    await fetchTasks();
  }, [fetchTasks]);

  return {
    tasks: state.tasks,
    loading: state.loading,
    error: state.error,
    fetchTasks,
    completeTask,
    createTask,
    refreshTasks
  };
}
