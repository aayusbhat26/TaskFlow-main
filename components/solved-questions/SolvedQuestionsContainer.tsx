"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import Warning from '@/components/ui/warning';
import { 
  Code, 
  Trophy, 
  RefreshCw, 
  Search, 
  Filter,
  ExternalLink,
  Calendar,
  Clock,
  Target
} from 'lucide-react';
import Link from 'next/link';

interface SolvedQuestion {
  id: string;
  title: string;
  number?: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  topics: string[];
  solvedDate: string;
  url: string;
  platform: 'leetcode' | 'codeforces';
  rating?: number;
}

interface SolvedQuestionsData {
  leetcode: SolvedQuestion[];
  codeforces: SolvedQuestion[];
  lastUpdated: string;
  stats?: {
    totalSolved: number;
    leetcodeCount: number;
    codeforcesCount: number;
    topicsCount: number;
    difficultyBreakdown: {
      easy: number;
      medium: number;
      hard: number;
    };
  };
}

interface Props {}

// Simple loading skeleton component
const Skeleton = ({ className }: { className?: string }) => (
  <div className={`animate-pulse bg-muted rounded ${className}`} />
);

export const SolvedQuestionsContainer = ({}: Props) => {
  const [data, setData] = useState<SolvedQuestionsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefetching, setIsRefetching] = useState(false);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const questionsPerPage = 50;

  const fetchSolvedQuestions = async () => {
    try {
      setIsRefetching(true);
      // For now, set empty data since external services are removed
      setData({ leetcode: [], codeforces: [], lastUpdated: new Date().toISOString() });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
      setIsRefetching(false);
    }
  };

  useEffect(() => {
    fetchSolvedQuestions();
  }, []);

  if (isLoading) {
    return <SolvedQuestionsLoading />;
  }

  if (error) {
    return <SolvedQuestionsError error={error} onRetry={fetchSolvedQuestions} />;
  }

  if (!data) {
    return <NoQuestionsFound />;
  }

  const allQuestions = [...data.leetcode, ...data.codeforces];
  
  // Group questions by topics
  const questionsByTopic = allQuestions.reduce((acc, question) => {
    question.topics.forEach(topic => {
      if (!acc[topic]) acc[topic] = [];
      acc[topic].push(question);
    });
    return acc;
  }, {} as Record<string, SolvedQuestion[]>);

  // Filter questions based on difficulty and search
  const filterQuestions = (questions: SolvedQuestion[]) => {
    return questions.filter(q => {
      const matchesDifficulty = selectedDifficulty === 'all' || q.difficulty.toLowerCase() === selectedDifficulty;
      const matchesSearch = searchQuery === '' || 
        q.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.topics.some(topic => topic.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesDifficulty && matchesSearch;
    });
  };

  const filteredQuestionsByTopic = Object.entries(questionsByTopic).reduce((acc, [topic, questions]) => {
    const filtered = filterQuestions(questions);
    if (filtered.length > 0) acc[topic] = filtered;
    return acc;
  }, {} as Record<string, SolvedQuestion[]>);

  const totalQuestions = allQuestions.length;
  const leetcodeCount = data.leetcode.length;
  const codeforcesCount = data.codeforces.length;

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Solved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.stats?.totalSolved || totalQuestions}</div>
            <p className="text-xs text-muted-foreground">questions</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <div className="w-3 h-3 bg-orange-500 rounded"></div>
              LeetCode
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.stats?.leetcodeCount || leetcodeCount}</div>
            <p className="text-xs text-muted-foreground">problems</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded"></div>
              Codeforces
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.stats?.codeforcesCount || codeforcesCount}</div>
            <p className="text-xs text-muted-foreground">problems</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Topics Covered</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.stats?.topicsCount || Object.keys(questionsByTopic).length}</div>
            <p className="text-xs text-muted-foreground">topics</p>
          </CardContent>
        </Card>
      </div>

      {/* Difficulty Breakdown */}
      {data.stats && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Difficulty Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{data.stats.difficultyBreakdown.easy}</div>
                <p className="text-sm text-muted-foreground">Easy</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">{data.stats.difficultyBreakdown.medium}</div>
                <p className="text-sm text-muted-foreground">Medium</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{data.stats.difficultyBreakdown.hard}</div>
                <p className="text-sm text-muted-foreground">Hard</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <input
              type="text"
              placeholder="Search questions or topics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          
          <select
            value={selectedDifficulty}
            onChange={(e) => setSelectedDifficulty(e.target.value)}
            className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">All Difficulties</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-sm text-muted-foreground">
            Last updated: {new Date(data.lastUpdated).toLocaleString()}
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchSolvedQuestions}
            disabled={isRefetching}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Questions by Topic */}
      <div className="space-y-6">
        {Object.entries(filteredQuestionsByTopic)
          .sort(([, a], [, b]) => b.length - a.length) // Sort by number of questions
          .slice((currentPage - 1) * 10, currentPage * 10) // Paginate topics (10 per page)
          .map(([topic, questions]) => (
            <Card key={topic}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Target className="w-5 h-5" />
                    {topic}
                  </span>
                  <Badge variant="secondary">{questions.length} questions</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3">
                  {questions
                    .sort((a, b) => new Date(b.solvedDate).getTime() - new Date(a.solvedDate).getTime())
                    .slice(0, questionsPerPage) // Show first 50 questions per topic
                    .map((question) => (
                      <div 
                        key={`${question.platform}-${question.id}`}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded ${
                            question.platform === 'leetcode' ? 'bg-orange-500' : 'bg-blue-500'
                          }`} />
                          
                          <div>
                            <div className="flex items-center gap-2">
                              {question.number && (
                                <span className="text-sm font-mono text-muted-foreground">
                                  #{question.number}
                                </span>
                              )}
                              <span className="font-medium">{question.title}</span>
                              {question.rating && (
                                <Badge variant="outline" className="text-xs">
                                  {question.rating}
                                </Badge>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-2 mt-1">
                              <Badge 
                                variant={
                                  question.difficulty === 'Easy' ? 'default' :
                                  question.difficulty === 'Medium' ? 'secondary' : 'destructive'
                                }
                                className="text-xs"
                              >
                                {question.difficulty}
                              </Badge>
                              
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Calendar className="w-3 h-3" />
                                {new Date(question.solvedDate).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                        </div>

                        <Link href={question.url} target="_blank" rel="noopener noreferrer">
                          <Button variant="ghost" size="sm">
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                        </Link>
                      </div>
                    ))}
                </div>
                {questions.length > questionsPerPage && (
                  <div className="mt-4 text-sm text-muted-foreground text-center">
                    Showing first {Math.min(questionsPerPage, questions.length)} of {questions.length} questions
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
      </div>

      {/* Pagination Controls */}
      {Object.keys(filteredQuestionsByTopic).length > 10 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          <span className="flex items-center px-4 text-sm text-muted-foreground">
            Page {currentPage} of {Math.ceil(Object.keys(filteredQuestionsByTopic).length / 10)}
          </span>
          <Button
            variant="outline"
            onClick={() => setCurrentPage(currentPage + 1)}
            disabled={currentPage >= Math.ceil(Object.keys(filteredQuestionsByTopic).length / 10)}
          >
            Next
          </Button>
        </div>
      )}

      {Object.keys(filteredQuestionsByTopic).length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <Code className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No questions found</h3>
            <p className="text-muted-foreground">
              Try adjusting your search criteria or difficulty filter.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

const SolvedQuestionsLoading = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <Card key={i}>
          <CardHeader className="pb-2">
            <Skeleton className="h-4 w-24" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-16 mb-1" />
            <Skeleton className="h-3 w-20" />
          </CardContent>
        </Card>
      ))}
    </div>
    
    <div className="flex justify-between items-center">
      <div className="flex gap-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-10 w-32" />
      </div>
      <Skeleton className="h-8 w-24" />
    </div>

    <div className="space-y-4">
      {[...Array(3)].map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent className="space-y-3">
            {[...Array(5)].map((_, j) => (
              <div key={j} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-3 h-3 rounded" />
                  <div>
                    <Skeleton className="h-4 w-48 mb-1" />
                    <div className="flex gap-2">
                      <Skeleton className="h-3 w-16" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                </div>
                <Skeleton className="h-8 w-8" />
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  </div>
);

const SolvedQuestionsError = ({ error, onRetry }: { error: string; onRetry: () => void }) => (
  <Warning className="flex items-center justify-between">
    <span>Failed to load solved questions: {error}</span>
    <Button variant="outline" size="sm" onClick={onRetry}>
      <RefreshCw className="w-4 h-4 mr-2" />
      Retry
    </Button>
  </Warning>
);

const NoQuestionsFound = () => (
  <Card>
    <CardContent className="text-center py-8">
      <Code className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
      <h3 className="text-lg font-medium mb-2">No solved questions found</h3>
      <p className="text-muted-foreground mb-4">
        No solved questions found in your current data.
      </p>
    </CardContent>
  </Card>
);
