export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  color: string | null;
  created_at: string;
}

export interface Article {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  category_id: string | null;
  thumbnail_url: string | null;
  thumbnail_source: string | null;
  source_urls: string[];
  source_titles: string[];
  reading_time: number;
  is_featured: boolean;
  is_published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Tag {
  id: string;
  name: string;
  slug: string;
}

export interface ArticleTag {
  article_id: string;
  tag_id: string;
}

export interface ScrapedItem {
  id: string;
  source_url: string;
  title: string;
  description: string | null;
  source_name: string | null;
  scraped_at: string;
  is_processed: boolean;
}

// Joined types for frontend
export interface ArticleWithCategory extends Article {
  category: Category | null;
}

export interface ArticleWithCategoryAndTags extends ArticleWithCategory {
  tags: Tag[];
}

export interface ArticleFull extends Article {
  category: Category | null;
  article_tags: { tag: Tag }[];
}

export type Database = {
  public: {
    Tables: {
      categories: {
        Row: Category;
        Insert: Omit<Category, "id" | "created_at">;
        Update: Partial<Omit<Category, "id">>;
      };
      articles: {
        Row: Article;
        Insert: Omit<Article, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Article, "id">>;
      };
      tags: {
        Row: Tag;
        Insert: Omit<Tag, "id">;
        Update: Partial<Omit<Tag, "id">>;
      };
      article_tags: {
        Row: ArticleTag;
        Insert: ArticleTag;
        Update: Partial<ArticleTag>;
      };
      scraped_items: {
        Row: ScrapedItem;
        Insert: Omit<ScrapedItem, "id" | "scraped_at">;
        Update: Partial<Omit<ScrapedItem, "id">>;
      };
    };
  };
};
