import { useState, useEffect, useMemo } from 'react';
import { helpCenterStore } from '@/data/helpCenterStore';
import { 
  HelpCategory, 
  HelpContent, 
  HelpSearchResult, 
  UserProgress,
  ContentType,
  DifficultyLevel
} from '@/models/helpCenter';

// Mock user ID - in a real app this would come from auth context
const MOCK_USER_ID = 'user-1';

export function useHelpCenter() {
  const [categories, setCategories] = useState<HelpCategory[]>([]);
  const [content, setContent] = useState<HelpContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchResults, setSearchResults] = useState<HelpSearchResult[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Load initial data
  useEffect(() => {
    setLoading(true);
    try {
      setCategories(helpCenterStore.getCategories());
      setContent(helpCenterStore.getAllContent());
    } finally {
      setLoading(false);
    }
  }, []);

  // Search functionality
  const search = (query: string) => {
    setSearchQuery(query);
    if (query.trim()) {
      const results = helpCenterStore.searchContent(query);
      setSearchResults(results);
    } else {
      setSearchResults([]);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
  };

  // Content retrieval
  const getContentByCategory = (categoryId: string) => {
    return helpCenterStore.getContentByCategory(categoryId);
  };

  const getContentById = (id: string) => {
    return helpCenterStore.getContentById(id);
  };

  const getFeaturedContent = () => {
    return helpCenterStore.getFeaturedContent();
  };

  const getPopularContent = (limit?: number) => {
    return helpCenterStore.getPopularContent(limit);
  };

  const getRecentContent = (limit?: number) => {
    return helpCenterStore.getRecentContent(limit);
  };

  // Filtering
  const filterContent = (filters: {
    category?: string;
    type?: ContentType;
    difficulty?: DifficultyLevel;
    tags?: string[];
  }) => {
    return helpCenterStore.filterContent(filters);
  };

  // User progress
  const getUserProgress = () => {
    return helpCenterStore.getUserProgress(MOCK_USER_ID);
  };

  const getContentProgress = (contentId: string) => {
    return helpCenterStore.getContentProgress(MOCK_USER_ID, contentId);
  };

  const updateProgress = (contentId: string, progressPercent: number) => {
    helpCenterStore.updateProgress(MOCK_USER_ID, contentId, progressPercent);
  };

  const markAsCompleted = (contentId: string) => {
    helpCenterStore.markAsCompleted(MOCK_USER_ID, contentId);
  };

  // Bookmarks
  const toggleBookmark = (contentId: string) => {
    return helpCenterStore.toggleBookmark(MOCK_USER_ID, contentId);
  };

  const getBookmarkedContent = () => {
    return helpCenterStore.getBookmarkedContent(MOCK_USER_ID);
  };

  // Analytics
  const incrementViews = (contentId: string) => {
    helpCenterStore.incrementViews(contentId);
  };

  const incrementLikes = (contentId: string) => {
    helpCenterStore.incrementLikes(contentId);
  };

  const getCompletionStats = () => {
    return helpCenterStore.getCompletionStats(MOCK_USER_ID);
  };

  // Search history
  const getSearchHistory = () => {
    return helpCenterStore.getSearchHistory();
  };

  const clearSearchHistory = () => {
    helpCenterStore.clearSearchHistory();
  };

  // Tags
  const getAllTags = () => {
    return helpCenterStore.getAllTags();
  };

  return {
    // Data
    categories,
    content,
    loading,
    searchResults,
    searchQuery,
    
    // Search
    search,
    clearSearch,
    getSearchHistory,
    clearSearchHistory,
    
    // Content
    getContentByCategory,
    getContentById,
    getFeaturedContent,
    getPopularContent,
    getRecentContent,
    filterContent,
    getAllTags,
    
    // Progress
    getUserProgress,
    getContentProgress,
    updateProgress,
    markAsCompleted,
    getCompletionStats,
    
    // Bookmarks
    toggleBookmark,
    getBookmarkedContent,
    
    // Analytics
    incrementViews,
    incrementLikes
  };
}

export function useHelpContent(contentId: string) {
  const [content, setContent] = useState<HelpContent | null>(null);
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    
    const contentData = helpCenterStore.getContentById(contentId);
    const progressData = helpCenterStore.getContentProgress(MOCK_USER_ID, contentId);
    
    setContent(contentData || null);
    setProgress(progressData || null);
    
    if (contentData) {
      // Increment view count
      helpCenterStore.incrementViews(contentId);
    }
    
    setLoading(false);
  }, [contentId]);

  const updateProgress = (progressPercent: number) => {
    helpCenterStore.updateProgress(MOCK_USER_ID, contentId, progressPercent);
    setProgress(helpCenterStore.getContentProgress(MOCK_USER_ID, contentId) || null);
  };

  const toggleBookmark = () => {
    const isBookmarked = helpCenterStore.toggleBookmark(MOCK_USER_ID, contentId);
    setProgress(helpCenterStore.getContentProgress(MOCK_USER_ID, contentId) || null);
    return isBookmarked;
  };

  const markAsCompleted = () => {
    helpCenterStore.markAsCompleted(MOCK_USER_ID, contentId);
    setProgress(helpCenterStore.getContentProgress(MOCK_USER_ID, contentId) || null);
  };

  const incrementLikes = () => {
    helpCenterStore.incrementLikes(contentId);
    // Refresh content to get updated like count
    setContent(helpCenterStore.getContentById(contentId) || null);
  };

  return {
    content,
    progress,
    loading,
    updateProgress,
    toggleBookmark,
    markAsCompleted,
    incrementLikes
  };
}