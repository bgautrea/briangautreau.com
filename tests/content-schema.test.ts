import { describe, it, expect } from 'vitest';
import { workSchema, patentsSchema, publicationsSchema, educationSchema } from '../src/content/schemas';

describe('CV schemas', () => {
  it('accepts a complete work entry', () => {
    const result = workSchema.safeParse([{
      company: 'F5',
      title: 'Senior Solutions Engineer',
      location: 'Cedar Park, TX',
      start: '2019-06',
      summary: 'Pre-sales lead for the United States Army account.',
      highlights: ['Delivered architectures across BIG-IP, NGINX, Distributed Cloud.'],
    }]);
    expect(result.success).toBe(true);
  });

  it('rejects work entry missing required fields', () => {
    const result = workSchema.safeParse([{ company: 'F5' }]);
    expect(result.success).toBe(false);
  });

  it('accepts a patent entry', () => {
    const result = patentsSchema.safeParse([{
      number: 'US 9,325,608',
      title: 'Methods for managing aggregated systems',
      issued: '2016-04',
    }]);
    expect(result.success).toBe(true);
  });

  it('accepts a publication entry', () => {
    const result = publicationsSchema.safeParse([{
      title: 'Hyper-V deployment reference architecture',
      publisher: 'Dell Inc.',
      year: 2014,
    }]);
    expect(result.success).toBe(true);
  });

  it('accepts an education entry', () => {
    const result = educationSchema.safeParse([{
      school: 'Texas A&M University',
      degree: 'B.S. Computer Engineering',
      years: '1992 to 1996',
    }]);
    expect(result.success).toBe(true);
  });
});
