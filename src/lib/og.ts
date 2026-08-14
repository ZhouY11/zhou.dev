export interface OgPage {
  title: string;
  description: string;
  type: 'site' | 'blog' | 'project';
  eyebrow?: string;
}
