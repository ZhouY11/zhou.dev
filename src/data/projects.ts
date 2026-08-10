export interface Project {
  title: string;
  description: string;
  tags: string[];
  href?: string;
  repository?: string;
  featured: boolean;
}

export const projects: Project[] = [
  {
    title: 'Personal Blog',
    description: '基于 Astro 构建的个人技术博客与作品集，关注内容体验、性能、SEO 与渐进式交互。',
    tags: ['Astro', 'TypeScript', 'Tailwind CSS'],
    repository: 'https://github.com/ZhouY11/zhou.dev',
    featured: true,
  },

  {
    title: 'Vue I18n Plugin',
    description: '构建过程中实现源码扫描、文本转换、cli 批量提取语言资源。',
    tags: ['Vue', 'Vite', 'TypeScript', 'I18n'],
    featured: true,
  },

  {
    title: 'AI Agent Lab',
    description: '用于记录和实践 AI Agent 工程化、工具调用、上下文管理与应用开发的实验项目。',
    tags: ['TypeScript', 'AI Agent', 'LLM'],
    featured: true,
  },
];

export function getFeaturedProjects(limit = 3) {
  return projects.filter((project) => project.featured).slice(0, limit);
}
