import { defineCollection } from 'astro:content';
import { projectFrontmatter, noteFrontmatter } from './schemas';

// Re-export the CV schemas so callers can `import { workSchema } from '../content/config'` if convenient.
export { workSchema, patentsSchema, publicationsSchema, educationSchema } from './schemas';

const projects = defineCollection({
  type: 'content',
  schema: projectFrontmatter,
});

const notes = defineCollection({
  type: 'content',
  schema: noteFrontmatter,
});

export const collections = { projects, notes };
