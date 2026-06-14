import { useState, useEffect, useCallback } from 'react';
// import { LeetCodeStats } from '@/services/external/leetcode';
type LeetCodeStats = any;
import axios from 'axios';

interface UseLeetCodeStatsResult {
  data: LeetCodeStats | null;
  isLoading: boolean;
  isError: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  lastUpdated: Date | null;
}

export const useLeetCodeStats = (
  initialData?: LeetCodeStats | null,
  autoFetch = true
): UseLeetCodeStatsResult => {
  const [data, setData] = useState<LeetCodeStats | null>(initialData || null);
  const [isLoading, setIsLoading] = useState(!initialData && autoFetch);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setIsError(false);
      setError(null);

      const response = await axios.get('/api/leetcode');
      
      if (response.data.success && response.data.data) {
        setData(response.data.data);
        setLastUpdated(new Date());
      } else if (response.data.message === "No LeetCode username configured") {
        setData(null);
        setError("No LeetCode username configured");
      } else {
        setIsError(true);
        setError("Failed to fetch LeetCode data");
      }
    } catch (error) {
      setIsError(true);
      setError(error instanceof Error ? error.message : "Unknown error occurred");
      console.error("Error fetching LeetCode data:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!initialData && autoFetch) {
      fetchData();
    }
  }, [initialData, autoFetch, fetchData]);

  return {
    data,
    isLoading,
    isError,
    error,
    refetch: fetchData,
    lastUpdated
  };
};