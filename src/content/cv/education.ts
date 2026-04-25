import { educationSchema } from '../schemas';

const data = [
  { school: 'Texas A&M University', degree: 'Engineering', years: '1992 to 1996' },
];

const parsed = educationSchema.parse(data);
export default parsed;
