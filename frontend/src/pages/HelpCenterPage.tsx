import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, BookOpen, Video, HelpCircle, FileText, Star, Clock, TrendingUp, Bookmark, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useHelpCenter } from '@/hooks/useHelpCenter';
import { HelpContent, HelpCategory, ContentType } from '@/models/helpCenter';
import { PageHeader } from '@/components/PageHeader';
import { HelpCenterTour, useHelpCenterTour, QuickStartCard } from '@/components/tour/HelpCenterTour';

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

export function HelpCenterPage() {
  const {
    categories,
    loading,
    searchResults,
    searchQuery,
    search,
    clearSearch,
    getFeaturedContent,
    getPopularContent,
    getRecentContent,
    getBookmarkedContent,
    getCompletionStats,
    getSearchHistory,
    getContentByCategory,
  } = useHelpCenter();

  const { isOpen: isTourOpen, hasSeenTour, startTour, closeTour, completeTour } = useHelpCenterTour();

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('browse');

  // Auto-start tour for new users (but don't auto-show quick start)
  // Quick start is now independent and controlled by its own component
  useEffect(() => {
    if (!hasSeenTour && !loading && categories.length > 0) {
      // Remove auto-start to prevent interference with quick start card
      // Users can manually start the tour via the button or quick start card
    }
  }, [hasSeenTour, loading, categories, startTour]);

  const featuredContent = getFeaturedContent();
  const popularContent = getPopularContent(6);
  const recentContent = getRecentContent(6);
  const bookmarkedContent = getBookmarkedContent();
  const completionStats = getCompletionStats();
  const searchHistory = getSearchHistory();

  // Handle search
  const handleSearch = (query: string) => {
    search(query);
    if (query.trim()) {
      setActiveTab('search');
    }
  };

  // Format duration
  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes}min`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}min`;
  };

  // Content card component
  const ContentCard = ({ content, showCategory = true }: { content: HelpContent; showCategory?: boolean }) => {
    const Icon = contentTypeIcons[content.type];
    const category = categories.find(c => c.id === content.category_id);

    return (
      <Link to={`/help/${content.id}`}>
        <Card className="group hover:shadow-lg transition-all duration-300 cursor-pointer h-full">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div className={`p-2 rounded-lg ${contentTypeColors[content.type]} text-white`}>
                  <Icon className="h-4 w-4" />
                </div>
                <Badge variant="secondary" className={difficultyColors[content.difficulty]}>
                  {content.difficulty === 'beginner' ? 'Iniciante' : 
                   content.difficulty === 'intermediate' ? 'Intermediário' : 'Avançado'}
                </Badge>
              </div>
              {content.featured && (
                <Star className="h-4 w-4 text-yellow-500 fill-current" />
              )}
            </div>
            <CardTitle className="text-lg group-hover:text-primary transition-colors">
              {content.title}
            </CardTitle>
            <CardDescription className="line-clamp-2">
              {content.description}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <div className="flex items-center gap-4">
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
                  <TrendingUp className="h-3 w-3" />
                  {content.views} visualizações
                </div>
              </div>
            </div>
            {showCategory && category && (
              <div className="mt-3">
                <Badge variant="outline">{category.name}</Badge>
              </div>
            )}
          </CardContent>
        </Card>
      </Link>
    );
  };

  // Category card component
  const CategoryCard = ({ category }: { category: HelpCategory }) => {
    return (
      <Card 
        className="group hover:shadow-lg transition-all duration-300 cursor-pointer"
        onClick={() => {
          setSelectedCategory(category.id);
          setActiveTab('category');
        }}
      >
        <CardHeader className="text-center">
          <div className="mx-auto p-4 rounded-full bg-primary/10 w-16 h-16 flex items-center justify-center mb-3">
            <div 
              className="w-8 h-8 rounded-full"
              style={{ backgroundColor: category.color }}
            />
          </div>
          <CardTitle className="group-hover:text-primary transition-colors">
            {category.name}
          </CardTitle>
          <CardDescription>
            {category.description}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando centro de ajuda...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-tour="welcome">
      <PageHeader
        title="Centro de Ajuda"
        description="Encontre tutoriais, guias e respostas para suas dúvidas sobre o TrakNor CMMS"
      >
        <Button onClick={startTour} variant="outline" className="flex items-center gap-2">
          <Play className="h-4 w-4" />
          Tour Guiado
        </Button>
      </PageHeader>

      {/* Search Bar */}
      <div className="relative max-w-2xl mx-auto" data-tour="search">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="Pesquisar artigos, vídeos, guias..."
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          className="pl-10 pr-4 py-3 text-lg"
        />
        {searchQuery && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              clearSearch();
              setActiveTab('browse');
            }}
            className="absolute right-2 top-1/2 transform -translate-y-1/2"
          >
            Limpar
          </Button>
        )}
      </div>

      {/* Progress Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4" data-tour="progress">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Progresso Total</p>
                <p className="text-2xl font-bold">{Math.round(completionStats.percentage)}%</p>
              </div>
              <BookOpen className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {completionStats.completed} de {completionStats.total} concluídos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Favoritos</p>
                <p className="text-2xl font-bold">{bookmarkedContent.length}</p>
              </div>
              <Bookmark className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Conteúdos salvos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Histórico</p>
                <p className="text-2xl font-bold">{searchHistory.length}</p>
              </div>
              <Search className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Pesquisas recentes
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="browse">Navegar</TabsTrigger>
          <TabsTrigger value="search" disabled={!searchQuery}>
            Pesquisar{searchResults.length > 0 && ` (${searchResults.length})`}
          </TabsTrigger>
          <TabsTrigger value="bookmarks">
            Favoritos{bookmarkedContent.length > 0 && ` (${bookmarkedContent.length})`}
          </TabsTrigger>
          <TabsTrigger value="category" disabled={!selectedCategory}>
            Categoria
          </TabsTrigger>
        </TabsList>

        {/* Browse Tab */}
        <TabsContent value="browse" className="space-y-8">
          {/* Featured Content */}
          {featuredContent.length > 0 && (
            <section data-tour="featured">
              <h2 className="text-2xl font-bold mb-4">Conteúdo em Destaque</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {featuredContent.map((content) => (
                  <ContentCard key={content.id} content={content} />
                ))}
              </div>
            </section>
          )}

          {/* Categories */}
          <section data-tour="categories">
            <h2 className="text-2xl font-bold mb-4">Categorias</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {categories.map((category) => (
                <CategoryCard key={category.id} category={category} />
              ))}
            </div>
          </section>

          {/* Popular Content */}
          <section>
            <h2 className="text-2xl font-bold mb-4">Mais Populares</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {popularContent.map((content) => (
                <ContentCard key={content.id} content={content} />
              ))}
            </div>
          </section>

          {/* Recent Content */}
          <section>
            <h2 className="text-2xl font-bold mb-4">Adicionados Recentemente</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recentContent.map((content) => (
                <ContentCard key={content.id} content={content} />
              ))}
            </div>
          </section>
        </TabsContent>

        {/* Search Results Tab */}
        <TabsContent value="search" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">
              Resultados da Pesquisa "{searchQuery}"
            </h2>
            <p className="text-muted-foreground">
              {searchResults.length} {searchResults.length === 1 ? 'resultado' : 'resultados'}
            </p>
          </div>

          {searchResults.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {searchResults.map((result) => (
                <ContentCard key={result.content.id} content={result.content} />
              ))}
            </div>
          ) : searchQuery ? (
            <div className="text-center py-12">
              <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum resultado encontrado</h3>
              <p className="text-muted-foreground mb-4">
                Tente pesquisar com palavras-chave diferentes
              </p>
              {searchHistory.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Pesquisas recentes:</p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {searchHistory.slice(0, 5).map((query, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        onClick={() => handleSearch(query)}
                      >
                        {query}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </TabsContent>

        {/* Bookmarks Tab */}
        <TabsContent value="bookmarks" className="space-y-6">
          <h2 className="text-2xl font-bold">Conteúdo Favorito</h2>
          
          {bookmarkedContent.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {bookmarkedContent.map((content) => (
                <ContentCard key={content.id} content={content} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Bookmark className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum favorito ainda</h3>
              <p className="text-muted-foreground">
                Adicione conteúdos aos favoritos para acessá-los facilmente
              </p>
            </div>
          )}
        </TabsContent>

        {/* Category Tab */}
        <TabsContent value="category" className="space-y-6">
          {selectedCategory && (() => {
            const category = categories.find(c => c.id === selectedCategory);
            const categoryContent = category ? getContentByCategory(selectedCategory) : [];
            
            return (
              <>
                <div className="flex items-center gap-4">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setSelectedCategory(null);
                      setActiveTab('browse');
                    }}
                  >
                    ← Voltar
                  </Button>
                  <div>
                    <h2 className="text-2xl font-bold">{category?.name}</h2>
                    <p className="text-muted-foreground">{category?.description}</p>
                  </div>
                </div>

                {categoryContent.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {categoryContent.map((content) => (
                      <ContentCard key={content.id} content={content} showCategory={false} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Nenhum conteúdo encontrado</h3>
                    <p className="text-muted-foreground">
                      Esta categoria ainda não possui conteúdo disponível
                    </p>
                  </div>
                )}
              </>
            );
          })()}
        </TabsContent>
      </Tabs>

      {/* Help Center Tour */}
      <HelpCenterTour
        isOpen={isTourOpen}
        onClose={closeTour}
        onComplete={completeTour}
      />

      {/* Quick Start Card - independent of tour */}
      <QuickStartCard onStartTour={startTour} />
    </div>
  );
}