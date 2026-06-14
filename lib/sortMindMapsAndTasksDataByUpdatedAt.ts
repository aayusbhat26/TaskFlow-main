import {
  AssignedToMeTaskAndMindMaps,
  AssignedToMeTaskAndMindMapsWorkspaceRecentActivity,
  HomeRecentTasksAndMindMapsActivity,
} from "@/types/extended";

export const sortMindMapsAndTasksDataByUpdatedAt = (
  data:
    | AssignedToMeTaskAndMindMaps
    | HomeRecentTasksAndMindMapsActivity
    | AssignedToMeTaskAndMindMapsWorkspaceRecentActivity
) => {
  const sortedArray = [
    ...data.mindMaps, 
    ...data.tasks,
    ...(data.notes || []),
    ...(data.pomodoros || []),
    ...(data.dsa || []),
    ...(data.groups || []),
    ...(data.channels || [])
  ].sort((a, b) => {
    return new Date(b.updated.at).getTime() - new Date(a.updated.at).getTime();
  });

  return sortedArray;
};
