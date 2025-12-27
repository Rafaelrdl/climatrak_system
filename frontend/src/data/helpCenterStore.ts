import { 
  HelpCategory, 
  HelpContent, 
  HelpSearchResult, 
  UserProgress, 
  HelpAnalytics,
  ContentType,
  DifficultyLevel,
  HelpCategoryType 
} from '@/models/helpCenter';

// Mock data imports
import helpCategoriesData from '@/mocks/helpCategories.json';
import helpContentData from '@/mocks/helpContent.json';

const STORAGE_KEYS = {
  PROGRESS: 'help:progress',
  BOOKMARKS: 'help:bookmarks', 
  ANALYTICS: 'help:analytics',
  SEARCH_HISTORY: 'help:searchHistory'
};

// Utility functions for localStorage
function getFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function saveToStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn('Failed to save to localStorage:', error);
  }
}

// Initialize with mock data
function initializeData<T>(storageKey: string, mockData: T[]): T[] {
  const stored = getFromStorage(storageKey, []);
  if (stored.length === 0) {
    saveToStorage(storageKey, mockData);
    return mockData;
  }
  return stored;
}

export class HelpCenterStore {
  private categories: HelpCategory[];
  private content: HelpContent[];
  private userProgress: UserProgress[];
  private searchHistory: string[];

  constructor() {
    this.categories = initializeData('help:categories', helpCategoriesData as HelpCategory[]);
    this.content = initializeData('help:content', helpContentData as HelpContent[]);
    this.userProgress = getFromStorage(STORAGE_KEYS.PROGRESS, []);
    this.searchHistory = getFromStorage(STORAGE_KEYS.SEARCH_HISTORY, []);
  }

  // Categories
  getCategories(): HelpCategory[] {
    return this.categories.sort((a, b) => a.order - b.order);
  }

  getCategoryById(id: string): HelpCategory | undefined {
    return this.categories.find(cat => cat.id === id);
  }

  // Content
  getAllContent(): HelpContent[] {
    return this.content.filter(c => c.published);
  }

  getContentById(id: string): HelpContent | undefined {
    return this.content.find(c => c.id === id && c.published);
  }

  getContentByCategory(categoryId: string): HelpContent[] {
    return this.content.filter(c => c.category_id === categoryId && c.published);
  }

  getFeaturedContent(): HelpContent[] {
    return this.content.filter(c => c.featured && c.published);
  }

  getContentByType(type: ContentType): HelpContent[] {
    return this.content.filter(c => c.type === type && c.published);
  }

  getContentByDifficulty(difficulty: DifficultyLevel): HelpContent[] {
    return this.content.filter(c => c.difficulty === difficulty && c.published);
  }

  // Search functionality
  searchContent(query: string): HelpSearchResult[] {
    if (!query.trim()) return [];

    const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 2);
    const results: HelpSearchResult[] = [];

    this.content.filter(c => c.published).forEach(content => {
      let relevanceScore = 0;
      let highlightedText = '';

      // Search in title (high relevance)
      searchTerms.forEach(term => {
        if (content.title.toLowerCase().includes(term)) {
          relevanceScore += 10;
          highlightedText = content.title;
        }
      });

      // Search in description (medium relevance)
      searchTerms.forEach(term => {
        if (content.description.toLowerCase().includes(term)) {
          relevanceScore += 5;
          if (!highlightedText) highlightedText = content.description;
        }
      });

      // Search in tags (medium relevance)
      searchTerms.forEach(term => {
        if (content.tags.some(tag => tag.toLowerCase().includes(term))) {
          relevanceScore += 3;
        }
      });

      // Search in article content (low relevance)
      if (content.article_content) {
        searchTerms.forEach(term => {
          if (content.article_content!.toLowerCase().includes(term)) {
            relevanceScore += 1;
            if (!highlightedText) {
              const index = content.article_content!.toLowerCase().indexOf(term);
              const start = Math.max(0, index - 50);
              const end = Math.min(content.article_content!.length, index + 100);
              highlightedText = '...' + content.article_content!.slice(start, end) + '...';
            }
          }
        });
      }

      if (relevanceScore > 0) {
        results.push({
          content,
          relevance_score: relevanceScore,
          highlighted_text: highlightedText
        });
      }
    });

    // Update search history
    this.addToSearchHistory(query);

    return results.sort((a, b) => b.relevance_score - a.relevance_score);
  }

  private addToSearchHistory(query: string): void {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return;

    this.searchHistory = [
      trimmedQuery,
      ...this.searchHistory.filter(q => q !== trimmedQuery)
    ].slice(0, 10); // Keep only last 10 searches

    saveToStorage(STORAGE_KEYS.SEARCH_HISTORY, this.searchHistory);
  }

  getSearchHistory(): string[] {
    return this.searchHistory;
  }

  clearSearchHistory(): void {
    this.searchHistory = [];
    saveToStorage(STORAGE_KEYS.SEARCH_HISTORY, []);
  }

  // User Progress
  getUserProgress(userId: string): UserProgress[] {
    return this.userProgress.filter(p => p.user_id === userId);
  }

  getContentProgress(userId: string, contentId: string): UserProgress | undefined {
    return this.userProgress.find(p => p.user_id === userId && p.content_id === contentId);
  }

  updateProgress(userId: string, contentId: string, progressPercent: number): void {
    const existingIndex = this.userProgress.findIndex(
      p => p.user_id === userId && p.content_id === contentId
    );

    const progressData: UserProgress = {
      user_id: userId,
      content_id: contentId,
      completed: progressPercent >= 100,
      progress_percent: progressPercent,
      last_accessed_at: new Date().toISOString(),
      bookmarked: existingIndex >= 0 ? this.userProgress[existingIndex].bookmarked : false
    };

    if (existingIndex >= 0) {
      this.userProgress[existingIndex] = progressData;
    } else {
      this.userProgress.push(progressData);
    }

    saveToStorage(STORAGE_KEYS.PROGRESS, this.userProgress);
  }

  markAsCompleted(userId: string, contentId: string): void {
    this.updateProgress(userId, contentId, 100);
  }

  // Bookmarks
  toggleBookmark(userId: string, contentId: string): boolean {
    const existingIndex = this.userProgress.findIndex(
      p => p.user_id === userId && p.content_id === contentId
    );

    if (existingIndex >= 0) {
      this.userProgress[existingIndex].bookmarked = !this.userProgress[existingIndex].bookmarked;
    } else {
      this.userProgress.push({
        user_id: userId,
        content_id: contentId,
        completed: false,
        progress_percent: 0,
        last_accessed_at: new Date().toISOString(),
        bookmarked: true
      });
    }

    saveToStorage(STORAGE_KEYS.PROGRESS, this.userProgress);
    return this.userProgress.find(p => p.user_id === userId && p.content_id === contentId)?.bookmarked || false;
  }

  getBookmarkedContent(userId: string): HelpContent[] {
    const bookmarked = this.userProgress
      .filter(p => p.user_id === userId && p.bookmarked)
      .map(p => p.content_id);

    return this.content.filter(c => bookmarked.includes(c.id) && c.published);
  }

  // Analytics
  incrementViews(contentId: string): void {
    const content = this.content.find(c => c.id === contentId);
    if (content) {
      content.views++;
      saveToStorage('help:content', this.content);
    }
  }

  incrementLikes(contentId: string): void {
    const content = this.content.find(c => c.id === contentId);
    if (content) {
      content.likes++;
      saveToStorage('help:content', this.content);
    }
  }

  getPopularContent(limit: number = 5): HelpContent[] {
    return this.content
      .filter(c => c.published)
      .sort((a, b) => b.views - a.views)
      .slice(0, limit);
  }

  getRecentContent(limit: number = 5): HelpContent[] {
    return this.content
      .filter(c => c.published)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, limit);
  }

  getCompletionStats(userId: string): { total: number; completed: number; percentage: number } {
    const total = this.content.filter(c => c.published).length;
    const completed = this.userProgress.filter(p => p.user_id === userId && p.completed).length;
    const percentage = total > 0 ? (completed / total) * 100 : 0;

    return { total, completed, percentage };
  }

  // Filter helpers
  filterContent(filters: {
    category?: string;
    type?: ContentType;
    difficulty?: DifficultyLevel;
    tags?: string[];
  }): HelpContent[] {
    let filtered = this.content.filter(c => c.published);

    if (filters.category) {
      filtered = filtered.filter(c => c.category_id === filters.category);
    }

    if (filters.type) {
      filtered = filtered.filter(c => c.type === filters.type);
    }

    if (filters.difficulty) {
      filtered = filtered.filter(c => c.difficulty === filters.difficulty);
    }

    if (filters.tags && filters.tags.length > 0) {
      filtered = filtered.filter(c => 
        filters.tags!.some(tag => c.tags.includes(tag))
      );
    }

    return filtered;
  }

  // Get all unique tags
  getAllTags(): string[] {
    const allTags = this.content.flatMap(c => c.tags);
    return [...new Set(allTags)].sort();
  }
}

// Export singleton instance
export const helpCenterStore = new HelpCenterStore();