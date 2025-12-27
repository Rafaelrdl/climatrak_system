export type HelpCategoryType = 'getting-started' | 'assets' | 'work-orders' | 'maintenance' | 'inventory' | 'reports' | 'troubleshooting';

export type ContentType = 'video' | 'article' | 'faq' | 'guide';

export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced';

export interface HelpCategory {
  id: string;
  name: string;
  type: HelpCategoryType;
  description: string;
  icon: string;
  color: string;
  order: number;
}

export interface HelpContent {
  id: string;
  title: string;
  description: string;
  category_id: string;
  type: ContentType;
  difficulty: DifficultyLevel;
  duration_minutes?: number; // Para vídeos
  read_time_minutes?: number; // Para artigos
  tags: string[];
  featured: boolean;
  published: boolean;
  views: number;
  likes: number;
  created_at: string;
  updated_at: string;
  // Conteúdo específico por tipo
  video_url?: string;
  video_thumbnail?: string;
  article_content?: string;
  faq_items?: FAQItem[];
  guide_steps?: GuideStep[];
}

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
  helpful_count: number;
}

export interface GuideStep {
  id: string;
  title: string;
  description: string;
  image_url?: string;
  order: number;
}

export interface HelpSearchResult {
  content: HelpContent;
  relevance_score: number;
  highlighted_text?: string;
}

export interface UserProgress {
  user_id: string;
  content_id: string;
  completed: boolean;
  progress_percent: number;
  last_accessed_at: string;
  bookmarked: boolean;
}

export interface HelpAnalytics {
  popular_content: Array<{ content: HelpContent; views: number }>;
  recent_searches: string[];
  completion_rates: Record<string, number>;
  user_feedback: Array<{
    content_id: string;
    rating: number;
    comment?: string;
    user_id: string;
    created_at: string;
  }>;
}