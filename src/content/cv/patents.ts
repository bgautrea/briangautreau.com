import { patentsSchema } from '../schemas';

const data = [
  {
    number: 'US 9,325,608',
    title: 'Methods and apparatus for managing aggregated systems',
    issued: '2016-04',
    url: 'https://patents.google.com/patent/US9325608',
  },
  {
    number: 'US 9,270,791',
    title: 'Methods and apparatus for network device discovery and configuration',
    issued: '2016-02',
    url: 'https://patents.google.com/patent/US9270791',
  },
];

const parsed = patentsSchema.parse(data);
export default parsed;
