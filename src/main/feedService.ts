import axios from 'axios';

export interface FeedItem {
  id: string;
  title: string;
  url: string;
  score: number;
  source: 'hackernews' | 'reddit' | 'github' | 'dev.to';
  author?: string;
  comments: number;
  timestamp: number;
  description?: string;
  tags?: string[];
}

export interface FeedResponse {
  success: boolean;
  feeds?: FeedItem[];
  error?: string;
}

class FeedService {
  private cache: Map<string, { data: FeedItem[]; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 10 * 60 * 1000; // 10 minutos

  async getHackerNewsFeeds(limit: number = 10): Promise<FeedItem[]> {
    try {
      // Buscar top stories do Hacker News
      const topStoriesResponse = await axios.get('https://hacker-news.firebaseio.com/v0/topstories.json?print=pretty');
      const topStoryIds = topStoriesResponse.data.slice(0, limit);

      // Buscar detalhes de cada story
      const storyPromises = topStoryIds.map(async (id: number) => {
        const storyResponse = await axios.get(`https://hacker-news.firebaseio.com/v0/item/${id}.json?print=pretty`);
        const story = storyResponse.data;
        
        return {
          id: `hn_${story.id}`,
          title: story.title,
          url: story.url || `https://news.ycombinator.com/item?id=${story.id}`,
          score: story.score || 0,
          source: 'hackernews' as const,
          author: story.by,
          comments: story.descendants || 0,
          timestamp: story.time * 1000,
          description: story.text || ''
        };
      });

      const stories = await Promise.all(storyPromises);
      return stories.filter(story => story.title && story.url);
    } catch (error) {
      console.error('Erro ao buscar feeds do Hacker News:', error);
      return [];
    }
  }

  async getRedditFeeds(limit: number = 10): Promise<FeedItem[]> {
    try {
      const response = await axios.get(`https://www.reddit.com/r/programming/hot.json?limit=${limit}`, {
        headers: {
          'User-Agent': 'Duckduki/1.0'
        }
      });

      const posts = response.data.data.children;
      
      return posts.map((post: any) => {
        const data = post.data;
        return {
          id: `reddit_${data.id}`,
          title: data.title,
          url: data.url.startsWith('/') ? `https://reddit.com${data.url}` : data.url,
          score: data.score,
          source: 'reddit' as const,
          author: data.author,
          comments: data.num_comments,
          timestamp: data.created_utc * 1000,
          description: data.selftext ? data.selftext.slice(0, 200) + '...' : ''
        };
      }).filter((item: FeedItem) => item.title && item.url);
    } catch (error) {
      console.error('Erro ao buscar feeds do Reddit:', error);
      return [];
    }
  }

  async getGitHubTrending(limit: number = 10): Promise<FeedItem[]> {
    try {
      const response = await axios.get('https://api.github.com/search/repositories', {
        params: {
          q: 'created:>2024-01-01 stars:>50',
          sort: 'stars',
          order: 'desc',
          per_page: limit
        }
      });

      const repos = response.data.items;
      
      return repos.map((repo: any) => ({
        id: `github_${repo.id}`,
        title: repo.full_name,
        url: repo.html_url,
        score: repo.stargazers_count,
        source: 'github' as const,
        author: repo.owner.login,
        comments: repo.open_issues_count,
        timestamp: new Date(repo.created_at).getTime(),
        description: repo.description || '',
        tags: repo.topics || []
      }));
    } catch (error) {
      console.error('Erro ao buscar repositórios do GitHub:', error);
      return [];
    }
  }

  async getDevToFeeds(limit: number = 10): Promise<FeedItem[]> {
    try {
      const response = await axios.get('https://dev.to/api/articles', {
        params: {
          top: '7', // Artigos mais populares da semana
          per_page: limit
        }
      });

      const articles = response.data;
      
      return articles.map((article: any) => ({
        id: `devto_${article.id}`,
        title: article.title,
        url: article.url,
        score: article.positive_reactions_count,
        source: 'dev.to' as const,
        author: article.user.name,
        comments: article.comments_count,
        timestamp: new Date(article.published_timestamp).getTime(),
        description: article.description || '',
        tags: article.tag_list || []
      }));
    } catch (error) {
      console.error('Erro ao buscar feeds do Dev.to:', error);
      return [];
    }
  }

  private isCacheValid(key: string): boolean {
    const cached = this.cache.get(key);
    if (!cached) return false;
    
    return Date.now() - cached.timestamp < this.CACHE_DURATION;
  }

  async getAllFeeds(limitPerSource: number = 8): Promise<FeedResponse> {
    try {
      const cacheKey = `all_feeds_${limitPerSource}`;
      
      // Verificar cache
      if (this.isCacheValid(cacheKey)) {
        return {
          success: true,
          feeds: this.cache.get(cacheKey)!.data
        };
      }

      // Buscar feeds de todas as fontes em paralelo
      const [hackerNews, reddit, github, devTo] = await Promise.all([
        this.getHackerNewsFeeds(limitPerSource),
        this.getRedditFeeds(limitPerSource),
        this.getGitHubTrending(limitPerSource),
        this.getDevToFeeds(limitPerSource)
      ]);

      // Combinar e ordenar por score/popularidade
      const allFeeds = [...hackerNews, ...reddit, ...github, ...devTo]
        .sort((a, b) => b.score - a.score)
        .slice(0, limitPerSource * 3); // Limitar total

      // Atualizar cache
      this.cache.set(cacheKey, {
        data: allFeeds,
        timestamp: Date.now()
      });

      return {
        success: true,
        feeds: allFeeds
      };
    } catch (error) {
      console.error('Erro ao buscar feeds:', error);
      return {
        success: false,
        error: error.message || 'Erro desconhecido ao buscar feeds'
      };
    }
  }

  async getFilteredFeeds(sources: string[], keywords?: string[]): Promise<FeedResponse> {
    try {
      const allFeedsResponse = await this.getAllFeeds();
      
      if (!allFeedsResponse.success || !allFeedsResponse.feeds) {
        return allFeedsResponse;
      }

      let filteredFeeds = allFeedsResponse.feeds;

      // Filtrar por fonte
      if (sources.length > 0) {
        filteredFeeds = filteredFeeds.filter(feed => sources.includes(feed.source));
      }

      // Filtrar por palavras-chave
      if (keywords && keywords.length > 0) {
        filteredFeeds = filteredFeeds.filter(feed => {
          const text = `${feed.title} ${feed.description} ${feed.tags?.join(' ') || ''}`.toLowerCase();
          return keywords.some(keyword => text.includes(keyword.toLowerCase()));
        });
      }

      return {
        success: true,
        feeds: filteredFeeds
      };
    } catch (error) {
      console.error('Erro ao filtrar feeds:', error);
      return {
        success: false,
        error: error.message || 'Erro ao filtrar feeds'
      };
    }
  }

  clearCache(): void {
    this.cache.clear();
  }
}

export const feedService = new FeedService(); 