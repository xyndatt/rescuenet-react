// Server-side copy of the constants the business rules need (keep in sync with src/data.js).
export const TYPES = ['Flood', 'Fire', 'Earthquake', 'Landslide', 'Storm', 'Other'];
export const PRIORITIES = ['critical', 'high', 'medium', 'low'];
export const UNITS = ['BFP', 'SRR', 'AMBULANCE'];
export const UNIT_FLOW = ['Dispatched', 'En Route', 'On Scene', 'Completed'];
export const RANKS = ['Station Commander', 'Operations Officer', 'Field Commander'];
export const MUNI = {
  'Meycauayan': [14.7370, 120.9604], 'Marilao': [14.7581, 120.9494], 'Bocaue': [14.7986, 120.9264], 'Balagtas': [14.8150, 120.9094],
  'Guiguinto': [14.8333, 120.8800], 'Malolos': [14.8433, 120.8114], 'Plaridel': [14.8869, 120.8575], 'Calumpit': [14.9167, 120.7667],
  'Hagonoy': [14.8333, 120.7333], 'Obando': [14.7061, 120.9267], 'San Jose del Monte': [14.8139, 121.0453], 'Bulakan': [14.7957, 120.8794],
  'Baliuag': [14.9544, 120.8961], 'Pulilan': [14.8997, 120.8486], 'Norzagaray': [14.9167, 121.0333]
};
export const isActive = r => r.verification === 'verified' && !['Resolved', 'Closed', 'Rejected', 'Duplicate', 'Cancelled'].includes(r.status);
export const PHOTOS_PER_UPLOAD = 4;
export const PHOTOS_PER_REPORT = 12;
