import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  BookOpen, 
  Video, 
  HelpCircle, 
  FileText, 
  Clock, 
  Star, 
  Heart, 
  Bookmark,
  Eye,
  ThumbsUp,
  CheckCircle,
  Play,
  Pause,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useHelpContent } from '@/hooks/useHelpCenter';
import { ContentType, FAQItem, GuideStep } from '@/models/helpCenter';
import ReactMarkdown from 'react-markdown';

// Content type icons
const contentTypeIcons: Record<ContentType, any> = {
  video: Video,
  article: FileText,
  faq: HelpCircle,
  guide: BookOpen,
};

// Content type colors
const contentTypeColors: Record<ContentType, string> = {
  video: 'bg-blue-500',
  article: 'bg-green-500',
  faq: 'bg-orange-500',
  guide: 'bg-purple-500',
};

// Difficulty colors
const difficultyColors = {
  beginner: 'bg-green-100 text-green-800',
  intermediate: 'bg-yellow-100 text-yellow-800',
  advanced: 'bg-red-100 text-red-800',
};

export function HelpContentViewPage() {
  const { contentId } = useParams<{ contentId: string }>();
  const navigate = useNavigate();
  const { content, progress, loading, updateProgress, toggleBookmark, markAsCompleted, incrementLikes } = useHelpContent(contentId!);
  
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [hasLiked, setHasLiked] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [openFAQs, setOpenFAQs] = useState<Set<string>>(new Set());
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (progress) {
      setIsBookmarked(progress.bookmarked);
      setVideoProgress(progress.progress_percent);
      
      if (content?.type === 'guide' && content.guide_steps) {
        // Load completed steps from progress
        const stepsCompleted = Math.floor((progress.progress_percent / 100) * content.guide_steps.length);
        const completed = new Set(
          content.guide_steps.slice(0, stepsCompleted).map(step => step.id)
        );
        setCompletedSteps(completed);
      }
    }
  }, [progress, content]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando conteúdo...</p>
        </div>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold mb-4">Conteúdo não encontrado</h2>
        <p className="text-muted-foreground mb-6">O conteúdo solicitado não existe ou foi removido.</p>
        <Button onClick={() => navigate('/cmms/help')}>
          Voltar ao Centro de Ajuda
        </Button>
      </div>
    );
  }

  const Icon = contentTypeIcons[content.type];

  const handleBookmark = () => {
    const newBookmarkState = toggleBookmark();
    setIsBookmarked(newBookmarkState);
  };

  const handleLike = () => {
    if (!hasLiked) {
      incrementLikes();
      setHasLiked(true);
    }
  };

  const handleComplete = () => {
    markAsCompleted();
    updateProgress(100);
  };

  const handleVideoProgress = (progress: number) => {
    setVideoProgress(progress);
    updateProgress(progress);
  };

  const handleStepComplete = (stepId: string) => {
    const newCompleted = new Set(completedSteps);
    if (newCompleted.has(stepId)) {
      newCompleted.delete(stepId);
    } else {
      newCompleted.add(stepId);
    }
    setCompletedSteps(newCompleted);

    // Update overall progress based on completed steps
    if (content.guide_steps) {
      const progressPercent = (newCompleted.size / content.guide_steps.length) * 100;
      updateProgress(progressPercent);
    }
  };

  const toggleFAQ = (faqId: string) => {
    const newOpen = new Set(openFAQs);
    if (newOpen.has(faqId)) {
      newOpen.delete(faqId);
    } else {
      newOpen.add(faqId);
    }
    setOpenFAQs(newOpen);
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes}min`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}min`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          onClick={() => navigate('/cmms/help')}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Content Header */}
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-lg ${contentTypeColors[content.type]} text-white`}>
                  <Icon className="h-6 w-6" />
                </div>
                <div>
                  <Badge variant="secondary" className={difficultyColors[content.difficulty]}>
                    {content.difficulty === 'beginner' ? 'Iniciante' : 
                     content.difficulty === 'intermediate' ? 'Intermediário' : 'Avançado'}
                  </Badge>
                  <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                    {content.duration_minutes && (
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDuration(content.duration_minutes)}
                      </div>
                    )}
                    {content.read_time_minutes && (
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {content.read_time_minutes}min leitura
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      {content.views} visualizações
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBookmark}
                  className={isBookmarked ? 'text-blue-600' : ''}
                >
                  <Bookmark className={`h-4 w-4 ${isBookmarked ? 'fill-current' : ''}`} />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLike}
                  className={hasLiked ? 'text-red-600' : ''}
                  disabled={hasLiked}
                >
                  <Heart className={`h-4 w-4 ${hasLiked ? 'fill-current' : ''}`} />
                  {content.likes}
                </Button>
              </div>
            </div>

            <div>
              <h1 className="text-3xl font-bold mb-2">{content.title}</h1>
              <p className="text-lg text-muted-foreground">{content.description}</p>
            </div>

            {/* Tags */}
            {content.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {content.tags.map((tag) => (
                  <Badge key={tag} variant="outline">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Progress Bar */}
          {progress && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Progresso</span>
                  <span className="text-sm text-muted-foreground">
                    {Math.round(progress.progress_percent)}%
                  </span>
                </div>
                <Progress value={progress.progress_percent} className="mb-3" />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    {progress.completed ? (
                      <>
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        Concluído
                      </>
                    ) : (
                      <>
                        <Clock className="h-4 w-4" />
                        Em progresso
                      </>
                    )}
                  </div>
                  {!progress.completed && (
                    <Button size="sm" onClick={handleComplete}>
                      Marcar como Concluído
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Content Body */}
          <div className="space-y-6">
            {/* Video Content */}
            {content.type === 'video' && content.video_url && (
              <Card>
                <CardContent className="p-0">
                  <div className="aspect-video bg-black rounded-lg overflow-hidden relative">
                    {/* Placeholder for video player */}
                    <div className="flex items-center justify-center h-full text-white">
                      <div className="text-center">
                        <Play className="h-16 w-16 mx-auto mb-4" />
                        <p className="text-lg">Player de Vídeo</p>
                        <p className="text-sm opacity-75">URL: {content.video_url}</p>
                        <Button
                          variant="secondary"
                          className="mt-4"
                          onClick={() => setIsPlaying(!isPlaying)}
                        >
                          {isPlaying ? <Pause className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                          {isPlaying ? 'Pausar' : 'Reproduzir'}
                        </Button>
                      </div>
                    </div>
                    {/* Video progress overlay */}
                    {videoProgress > 0 && (
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent p-4">
                        <Progress value={videoProgress} className="mb-2" />
                        <p className="text-white text-sm">
                          Progresso: {Math.round(videoProgress)}%
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Article Content */}
            {content.type === 'article' && content.article_content && (
              <Card>
                <CardContent className="p-6 prose prose-gray max-w-none">
                  <ReactMarkdown>{content.article_content}</ReactMarkdown>
                </CardContent>
              </Card>
            )}

            {/* FAQ Content */}
            {content.type === 'faq' && content.faq_items && (
              <div className="space-y-4">
                <h2 className="text-2xl font-bold">Perguntas Frequentes</h2>
                {content.faq_items.map((faq: FAQItem) => (
                  <Card key={faq.id}>
                    <Collapsible
                      open={openFAQs.has(faq.id)}
                      onOpenChange={() => toggleFAQ(faq.id)}
                    >
                      <CollapsibleTrigger asChild>
                        <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-lg">{faq.question}</CardTitle>
                            {openFAQs.has(faq.id) ? (
                              <ChevronDown className="h-5 w-5" />
                            ) : (
                              <ChevronRight className="h-5 w-5" />
                            )}
                          </div>
                        </CardHeader>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <CardContent className="pt-0">
                          <p className="text-muted-foreground mb-4">{faq.answer}</p>
                          <div className="flex items-center gap-2 text-sm">
                            <ThumbsUp className="h-4 w-4" />
                            <span>{faq.helpful_count} pessoas acharam útil</span>
                          </div>
                        </CardContent>
                      </CollapsibleContent>
                    </Collapsible>
                  </Card>
                ))}
              </div>
            )}

            {/* Guide Content */}
            {content.type === 'guide' && content.guide_steps && (
              <div className="space-y-4">
                <h2 className="text-2xl font-bold">Guia Passo a Passo</h2>
                {content.guide_steps.map((step: GuideStep, index) => (
                  <Card key={step.id} className={`border-l-4 ${
                    completedSteps.has(step.id) ? 'border-l-green-500 bg-green-50' : 'border-l-gray-300'
                  }`}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
                            completedSteps.has(step.id) 
                              ? 'bg-green-500 text-white' 
                              : 'bg-gray-200 text-gray-600'
                          }`}>
                            {completedSteps.has(step.id) ? (
                              <CheckCircle className="h-4 w-4" />
                            ) : (
                              index + 1
                            )}
                          </div>
                          <div>
                            <CardTitle className="text-lg">{step.title}</CardTitle>
                            <CardDescription>{step.description}</CardDescription>
                          </div>
                        </div>
                        <Button
                          variant={completedSteps.has(step.id) ? 'secondary' : 'outline'}
                          size="sm"
                          onClick={() => handleStepComplete(step.id)}
                        >
                          {completedSteps.has(step.id) ? 'Concluído' : 'Marcar como Concluído'}
                        </Button>
                      </div>
                    </CardHeader>
                    {step.image_url && (
                      <CardContent>
                        <img
                          src={step.image_url}
                          alt={step.title}
                          className="w-full rounded-lg border"
                        />
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Content Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Estatísticas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Visualizações</span>
                <span className="font-medium">{content.views}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Curtidas</span>
                <span className="font-medium">{content.likes}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Tipo</span>
                <Badge variant="outline">
                  {content.type === 'video' ? 'Vídeo' :
                   content.type === 'article' ? 'Artigo' :
                   content.type === 'faq' ? 'FAQ' : 'Guia'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Nível</span>
                <Badge className={difficultyColors[content.difficulty]}>
                  {content.difficulty === 'beginner' ? 'Iniciante' : 
                   content.difficulty === 'intermediate' ? 'Intermediário' : 'Avançado'}
                </Badge>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Criado em</span>
                <span className="font-medium">
                  {new Date(content.created_at).toLocaleDateString('pt-BR')}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Ações Rápidas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={handleBookmark}
              >
                <Bookmark className={`h-4 w-4 mr-2 ${isBookmarked ? 'fill-current' : ''}`} />
                {isBookmarked ? 'Remover dos Favoritos' : 'Adicionar aos Favoritos'}
              </Button>
              {!progress?.completed && (
                <Button
                  className="w-full justify-start"
                  onClick={handleComplete}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Marcar como Concluído
                </Button>
              )}
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => navigator.share?.({ 
                  title: content.title, 
                  url: window.location.href 
                })}
              >
                <Star className="h-4 w-4 mr-2" />
                Compartilhar
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}