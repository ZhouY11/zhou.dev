export interface Project {
  id: string;
  title: string;
  description: string;

  role: string;
  year: string;

  tags: string[];

  highlights: string[];

  href?: string;
  repository?: string;

  featured: boolean;
}

export const projects: Project[] = [
  {
    id: 'personal-blog',
    title: 'Personal Blog',
    description: '基于 Astro 构建的个人技术博客与作品集，关注内容体验、性能、SEO 与渐进式交互。',

    role: 'Design & Development',
    year: '2026',

    tags: ['Astro', 'TypeScript', 'Tailwind CSS', 'React'],

    highlights: [
      'Astro-first 与 zero-JavaScript-by-default 架构',
      'Content Collection 驱动的博客内容系统',
      '渐进式 React Islands 交互模型',
    ],

    repository: 'https://github.com/ZhouY11/zhou.dev',

    featured: true,
  },

  {
    id: 'ai-agent-lab',
    title: 'AI Agent Lab',
    description: '用于记录和实践 AI Agent 工程化、工具调用、上下文管理与应用开发的实验项目。',

    role: 'Research & Development',
    year: '2026',

    tags: ['TypeScript', 'AI Agent', 'LLM'],

    highlights: [
      'Agent runtime 与 tool calling 实践',
      '结构化配置和运行时校验',
      '探索适合前端工程师的 AI 应用架构',
    ],

    featured: true,
  },
];

export function getFeaturedProjects(limit = 3) {
  return projects.filter((project) => project.featured).slice(0, limit);
}
