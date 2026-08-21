export interface User {
  id: number;
  email: string;
  name: string | null;
  role: 'user' | 'admin';
  created_at: string;
}

export interface UserRow extends User {
  password_hash: string;
  role: 'user' | 'admin';
}

export interface Lesson {
  title: string;
  content: string;
}

export type ContentFormat = 'text' | 'html';

export type BookLanguage = 'ru' | 'uz';

export interface BookSummary {
  id: number;
  slug: string;
  title: string;
  author: string | null;
  description: string | null;
  category: string | null;
  preview: string | null;
  cover_url: string | null;
  content_format: ContentFormat;
  language: BookLanguage;
}

export interface Book extends BookSummary {
  content: string;
}

export interface CourseSummary {
  id: number;
  title: string;
  description: string | null;
  price_cents: number;
}

export interface Course extends CourseSummary {
  lessons: Lesson[];
}

export interface CourseWithProgress {
  id: number;
  title: string;
  description: string | null;
  price_cents: number;
  purchased: boolean;
  progress: number[];
  lessons: Lesson[] | null;
}

export interface SubscriptionRow {
  id: number;
  user_id: number;
  plan: string;
  active_until: string;
}

export interface CoursePurchaseRow {
  id: number;
  user_id: number;
  course_id: number;
  progress: string;
}

export interface ApiError {
  error?: string;
}

export interface BookListResponse {
  books: BookSummary[];
}

export interface SiteSettings {
  hero_image_url: string | null;
  hero_author_name: string | null;
  hero_author_role: string | null;
}

export interface CourseListResponse {
  courses: CourseSummary[];
}
