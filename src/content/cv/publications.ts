import { publicationsSchema } from '../schemas';

const data = [
  { title: 'Microsoft Hyper-V cluster reference architecture',          publisher: 'Dell Inc.', year: 2014 },
  { title: 'Citrix XenServer networking reference architecture',        publisher: 'Dell Inc.', year: 2013 },
  { title: 'Blade and storage configuration guide for private cloud',   publisher: 'Dell Inc.', year: 2013 },
  { title: 'Private cloud infrastructure deployment guide',             publisher: 'Dell Inc.', year: 2014 },
];

const parsed = publicationsSchema.parse(data);
export default parsed;
