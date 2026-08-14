import type { ProjectSummary } from '@/types/project';

import { getCollection } from 'astro:content';

function toProjectSummary(
  project: Awaited<ReturnType<typeof getCollection<'projects'>>>[number],
): ProjectSummary {
  const { id, data } = project;

  return {
    id,
    title: data.title,
    description: data.description,
    role: data.role,
    year: data.year,
    tags: data.tags,
    highlights: data.highlights,
    href: `/projects/${id}`,
    repository: data.repository,
    website: data.website,
  };
}

export async function getPublishedProjects() {
  const projects = await getCollection('projects', ({ data }) => !data.draft);

  return projects.sort((a, b) => a.data.order - b.data.order);
}

export async function getProjectSummaries(): Promise<ProjectSummary[]> {
  const projects = await getPublishedProjects();

  return projects.map(toProjectSummary);
}

export async function getFeaturedProjects(limit = 3): Promise<ProjectSummary[]> {
  const projects = await getPublishedProjects();

  return projects
    .filter(({ data }) => data.featured)
    .slice(0, limit)
    .map(toProjectSummary);
}
