interface CommentsConfig {
  repo: string;
  repoId: string;

  category: string;
  categoryId: string;
}

export const commentsConfig = {
  repo: 'ZhouY11/zhou.dev',
  repoId: 'R_kgDOTz1Zjw',

  category: 'Comments',
  categoryId: 'DIC_kwDOTz1Zj84DDk0k',
} satisfies CommentsConfig;

export function validateCommentsConfig() {
  const missing = Object.entries(commentsConfig)
    .filter(([, value]) => {
      return !value || value.startsWith('REPLACE_WITH_');
    })
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(`Missing giscus configuration: ${missing.join(', ')}`);
  }
}
