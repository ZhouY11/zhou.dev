export interface ProjectSummary {
  id: string;
  title: string;
  description: string;
  role: string;
  year: string;
  tags: string[];
  highlights: string[];

  href: string;

  repository?: string;
  website?: string;
}
