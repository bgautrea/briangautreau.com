import { workSchema } from '../schemas';

const data = [
  {
    company: 'F5',
    title: 'Senior Solutions Engineer',
    location: 'Cedar Park, TX',
    start: '2019',
    summary: 'Pre-sales technical lead across the F5 portfolio for the United States Army account.',
    highlights: [
      'Cover the full F5 catalog: BIG-IP, NGINX, Distributed Cloud, application security.',
      'Translate mission requirements into architectures spanning data center, edge, and cloud; partner with program offices through procurement and rollout.',
      'Trusted advisor on application delivery, zero-trust patterns, and modernization paths for legacy workloads.',
    ],
  },
  {
    company: 'Dell',
    title: 'Technical Architect, Solutions Engineering',
    location: 'Round Rock, TX',
    start: '2009',
    end: '2019',
    summary: 'Solutions architect on the enterprise infrastructure side, focused on virtualization, private cloud, and reference designs.',
    highlights: [
      'Authored eight reference architectures spanning Hyper-V, Xen, blade and storage, and private cloud. Used as field deployment blueprints.',
      'Co-inventor on two issued US patents covering network device discovery and aggregated-system observability.',
    ],
  },
];

const parsed = workSchema.parse(data);
export default parsed;
