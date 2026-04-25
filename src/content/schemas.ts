import { z } from 'zod';

// CV schemas — pure Zod, no Astro dependency, so tests can import them.
// config.ts re-exports these and uses defineCollection() for the Markdown collections.

export const workSchema = z.array(z.object({
  company: z.string(),
  title: z.string(),
  location: z.string(),
  start: z.string(),                                            // YYYY or YYYY-MM
  end: z.string().optional(),                                   // omit = current
  summary: z.string(),
  highlights: z.array(z.string()),
  url: z.string().url().optional(),
}));

export const patentsSchema = z.array(z.object({
  number: z.string(),
  title: z.string(),
  issued: z.string(),                                           // YYYY-MM
  url: z.string().url().optional(),
}));

export const publicationsSchema = z.array(z.object({
  title: z.string(),
  publisher: z.string(),
  year: z.number().int(),
  url: z.string().url().optional(),
}));

export const educationSchema = z.array(z.object({
  school: z.string(),
  degree: z.string(),
  years: z.string(),
}));

// Frontmatter schemas (defined in pure Zod here; defineCollection wraps them)
export const projectFrontmatter = z.object({
  title: z.string(),
  blurb: z.string(),
  status: z.enum(['shipping', 'active', 'archived', 'experiment']),
  repo: z.string().url().optional(),
  url: z.string().url().optional(),
  stack: z.array(z.string()),
  order: z.number().default(100),
});

export const noteFrontmatter = z.object({
  title: z.string(),
  date: z.coerce.date(),
  summary: z.string(),
  draft: z.boolean().default(false),
});
