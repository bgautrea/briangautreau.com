import { defineCollection } from 'astro:content';
import { projectFrontmatter, noteFrontmatter } from './schemas';

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
