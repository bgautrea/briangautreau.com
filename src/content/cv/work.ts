import { workSchema } from '../schemas';

const data = [
  {
    company: 'Gautreau Nahas Capital Partners',
    title: 'Founder',
    location: 'Cedar Park, TX',
    start: '2026',
    summary: 'Founded a trading firm after leaving F5. Full time on quantitative, swing, and intraday strategies.',
    highlights: [
      'Trade options on equities and futures.',
      'Build the research and execution stack in Rust and Python, with machine learning models and LLMs throughout the workflow.',
    ],
  },
  {
    company: 'F5',
    title: 'Senior Solutions Engineer',
    location: 'Cedar Park, TX',
    start: '2019',
    end: '2026',
    summary: 'Pre-sales technical lead across the F5 portfolio for the United States Army account.',
    highlights: [
      'Covered the full F5 catalog: BIG-IP, NGINX, Distributed Cloud, application security.',
      'Translated mission requirements into architectures spanning data center, edge, and cloud; partnered with program offices through procurement and rollout.',
      'Served as trusted advisor on application delivery, zero-trust patterns, and modernization paths for legacy workloads.',
    ],
  },
  {
    company: 'Brocade / Riverbed',
    title: 'Sales Engineer, Software Networking Business Unit',
    location: 'Cedar Park, TX',
    start: '2013',
    end: '2019',
    summary: 'Sales Engineer for the Brocade Software Networking business unit, supporting Cloud Service Providers across the Central and Eastern United States and Latin America.',
    highlights: [
      'Exceeded 210% of FY16 quota; $5M+ in Software Networking revenue.',
      'Covered the Software Networking portfolio: Virtual ADC, Virtual WAF, Virtual Router, SDN Controller, SDN applications.',
      'Drove customer-requested features into the product: Transparent Caching, Direct Server Return, phone-home improvements, HA timer tuning.',
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
