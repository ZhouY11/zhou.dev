import type { Project } from '@/data/projects';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Props {
  projects: Project[];
}

export default function ProjectShowcase({ projects }: Props) {
  const defaultProject = projects[0];

  if (!defaultProject) {
    return null;
  }

  return (
    <Tabs
      defaultSelectedKey={defaultProject.id}
      orientation="vertical"
      className="grid gap-6 lg:grid-cols-[0.75fr_1.25fr]"
    >
      <TabsList
        aria-label="精选项目"
        className="h-auto w-full flex-col items-stretch gap-2 bg-transparent p-0"
      >
        {projects.map((project, index) => (
          <TabsTrigger
            key={project.id}
            id={project.id}
            className="min-w-52 rounded-xl border text-left transition duration-300 ease-fluid motion-reduce:transition-none lg:min-w-0"
          >
            <span className="flex w-full flex-col items-start p-2">
              <span className="text-xs text-fg-subtle">{String(index + 1).padStart(2, '0')}</span>

              <span className="mt-2 font-medium">{project.title}</span>

              <span className="mt-1 text-sm text-fg-muted">{project.role}</span>
            </span>
          </TabsTrigger>
        ))}
      </TabsList>

      <div>
        {projects.map((project) => (
          <TabsContent
            key={project.id}
            id={project.id}
            className="relative isolate overflow-hidden rounded-2xl border border-border bg-bg-elevated p-6 sm:p-8"
          >
            <div
              className="pointer-events-none absolute -top-32 -right-32 -z-10 size-72 rounded-full bg-brand-soft blur-3xl"
              aria-hidden="true"
            />

            <header>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-fg-subtle">
                <span>{project.role}</span>

                <span aria-hidden="true">·</span>

                <span>{project.year}</span>
              </div>

              <h3 className="mt-4 text-3xl font-semibold tracking-tight text-fg">
                {project.title}
              </h3>

              <p className="mt-5 max-w-2xl text-base leading-7 text-fg-muted">
                {project.description}
              </p>
            </header>

            <div className="mt-7 flex flex-wrap gap-2">
              {project.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-border bg-bg-muted px-3 py-1 text-xs text-fg-muted"
                >
                  {tag}
                </span>
              ))}
            </div>

            <div className="mt-8">
              <p className="text-xs font-medium tracking-widest text-fg-subtle uppercase">
                Highlights
              </p>

              <ul className="mt-4 space-y-3">
                {project.highlights.map((highlight) => (
                  <li key={highlight} className="flex gap-3 text-sm leading-6 text-fg-muted">
                    <span
                      aria-hidden="true"
                      className="mt-2 size-1.5 shrink-0 rounded-full bg-brand"
                    />

                    <span>{highlight}</span>
                  </li>
                ))}
              </ul>
            </div>

            {(project.href || project.repository) && (
              <footer className="mt-10 flex flex-wrap gap-4 border-t border-border pt-6">
                {project.href && (
                  <a
                    href={project.href}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-lg focus-ring text-sm font-medium text-fg transition-colors hover:text-brand"
                  >
                    View Project ↗
                  </a>
                )}

                {project.repository && (
                  <a
                    href={project.repository}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-lg focus-ring text-sm text-fg-muted transition-colors hover:text-fg"
                  >
                    Source ↗
                  </a>
                )}
              </footer>
            )}
          </TabsContent>
        ))}
      </div>
    </Tabs>
  );
}
