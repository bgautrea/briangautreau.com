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
    company: 'Brocade / Riverbed',
    title: 'Sales Engineer, Software Networking Business Unit',
    location: 'Cedar Park, TX',
    start: '2013',
    end: '2019',
    summary: "Worked closely with a peer Account Executive to support and grow the Software Networking business with Cloud Service Providers across the Central and Eastern United States and Latin America. Supported sales of Virtual ADC (load balancing), Virtual WAF (Web Application Firewall), Virtual Router, SDN Controller, and SDN applications.",
    highlights: [
      'Achieved over 210% of quota in FY16 with revenue exceeding $5M, by growing existing Service Providers and adding new ones.',
      'Delivered product presentations and demos to customers and prospects from the Brocade Software Networking portfolio.',
      'Worked closely with Product Management and Engineering to add features based on customer requests, including Transparent Caching and Direct Server Return, plus enhancements such as phone-home improvements and tuning of high-availability timers.',
    ],
  },
  {
    company: 'Dell, Junior Achievement, Exodus Communications',
    title: 'Engineering, Support, Management, Consulting',
    location: 'Various',
    start: '1996',
    end: '2010',
    summary: 'Earlier career across engineering, technical support, management, and consulting roles.',
    highlights: [],
  },
];

const parsed = workSchema.parse(data);
export default parsed;
