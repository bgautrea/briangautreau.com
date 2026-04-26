import { educationSchema } from '../schemas';

const data = [
  { school: 'Texas A&M University',                degree: 'Agricultural Systems Management', years: '2006 to 2007' },
  { school: 'University of Southwestern Louisiana', degree: 'Mechanical Engineering',          years: '1994 to 1995' },
];

const parsed = educationSchema.parse(data);
export default parsed;
