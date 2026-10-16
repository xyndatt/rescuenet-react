export const KEY = 'rescuenet-ui-v1';
export const ADMIN = { name: 'Admin', title: 'Operations Administrator', email: 'admin@rescue.ph', password: 'admin123' };

export const TYPES = {
  Flood:{icon:'🌊',color:'#1D6FDB'}, Fire:{icon:'🔥',color:'#D92D20'}, Earthquake:{icon:'🏚️',color:'#8A5A2B'},
  Landslide:{icon:'⛰️',color:'#7A5C3E'}, Storm:{icon:'🌀',color:'#6B4FD3'}, Other:{icon:'⚠️',color:'#5B6B82'}
};
export const PRIORITY = {
  critical:{label:'Critical',color:'#D92D20',rank:0}, high:{label:'High',color:'#FF5B14',rank:1},
  medium:{label:'Medium',color:'#D49A00',rank:2}, low:{label:'Low',color:'#2E8B57',rank:3}
};
export const UNITS = {
  BFP:{full:'Bureau of Fire Protection',desc:'Fire suppression & rescue',icon:'🚒'},
  SRR:{full:'Search, Rescue & Retrieval',desc:'Water, collapse & rope rescue',icon:'🪢'},
  AMBULANCE:{full:'Emergency Medical Services',desc:'Medical aid & transport',icon:'🚑'}
};
export const RECOMMENDED = {Fire:['BFP','AMBULANCE'],Flood:['SRR','AMBULANCE'],Earthquake:['SRR','BFP','AMBULANCE'],Landslide:['SRR','AMBULANCE'],Storm:['SRR'],Other:['SRR']};
export const UNIT_FLOW = ['Dispatched','En Route','On Scene','Completed'];
export const FLOW = ['Submitted','Under Verification','Verified','Awaiting Assignment','Team Assigned','Rescue in Progress','Resolved','Closed'];
export const STATUS_COLOR = {
  'Submitted':'#5B6B82','Under Verification':'#D49A00','Verified':'#1D6FDB','Awaiting Assignment':'#FF5B14',
  'Team Assigned':'#6B4FD3','Rescue in Progress':'#D92D20','Resolved':'#12A150','Closed':'#0B1B33','Rejected':'#8A94A6','Duplicate':'#8A94A6','Cancelled':'#8A94A6'
};
export const MUNI = {
  'Meycauayan':[14.7370,120.9604],'Marilao':[14.7581,120.9494],'Bocaue':[14.7986,120.9264],'Balagtas':[14.8150,120.9094],
  'Guiguinto':[14.8333,120.8800],'Malolos':[14.8433,120.8114],'Plaridel':[14.8869,120.8575],'Calumpit':[14.9167,120.7667],
  'Hagonoy':[14.8333,120.7333],'Obando':[14.7061,120.9267],'San Jose del Monte':[14.8139,121.0453],'Bulakan':[14.7957,120.8794],
  'Baliuag':[14.9544,120.8961],'Pulilan':[14.8997,120.8486],'Norzagaray':[14.9167,121.0333]
};


export const uid = () => Math.random().toString(36).slice(2, 9);
export const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function km(a, b, c, d) {
  const R = 6371, r = x => x * Math.PI / 180;
  const dLat = r(c - a), dLon = r(d - b);
  const h = Math.sin(dLat/2)**2 + Math.cos(r(a)) * Math.cos(r(c)) * Math.sin(dLon/2)**2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
export const fmtTime = ts => new Date(ts).toLocaleString('en-PH', {month:'short', day:'numeric', hour:'numeric', minute:'2-digit'});
export function ago(ts) {
  const m = Math.max(0, Math.round((Date.now() - ts) / 60000));
  if (m < 1) return 'just now'; if (m < 60) return m + ' min ago';
  const h = Math.floor(m / 60); if (h < 24) return h + ' hr ago';
  return Math.floor(h / 24) + ' d ago';
}
export const initials = n => n.replace(/^(Capt\.|Lt\.|Insp\.|Dir\.|Maj\.|Col\.)\s*/,'').split(' ').map(w => w[0]).slice(0,2).join('').toUpperCase();
export const getR = (d, id) => d.reports.find(r => r.id === id);
export const offName = (db, id) => { const o = db.officers.find(x => x.id === id); return o ? o.name : '—'; };
export const EXTRA_STATUS = ['Rejected','Duplicate','Cancelled'];
export const isActive = r => r.verification === 'verified' && !['Resolved','Closed',...EXTRA_STATUS].includes(r.status);
export const prioSort = (a, b) => (a.priority ? PRIORITY[a.priority].rank : 9) - (b.priority ? PRIORITY[b.priority].rank : 9) || b.createdAt - a.createdAt;
export function activeTasksOf(db, oid) {
  return db.reports.filter(r => isActive(r) && (r.officerId === oid || (r.backup && r.backup.status === 'assigned' && r.backup.officerId === oid)));
}
export function dupesOf(db, r) {
  return db.reports.filter(o => o.id !== r.id && o.type === r.type && o.verification !== 'false' &&
    km(o.lat, o.lng, r.lat, r.lng) < 1.5 && Math.abs(o.createdAt - r.createdAt) < 864e5);
}


export function seed() {
  const now = Date.now(), m = x => now - x * 60000;
  const base = {verification:'pending', priority:null, status:'Submitted', officerId:null, dispatches:[], backupAlert:null, backup:null, completion:null, forwarded:false, officerSummary:'', rejectReason:'', timeline:[]};
  const tl = (t, by, text) => ({at:m(t), by, text});
  const officers = [];   // no demo officers: the Administrator creates them
  const reports = [
    {...base, id:'DR-2026-0101', type:'Flood', reporter:'Juan Dela Cruz', phone:'0917 555 0142', address:'Brgy. Calvario, Meycauayan', lat:14.7405, lng:120.9570, people:12, createdAt:m(6),
      desc:'Waist-deep floodwater entering homes along the creek. 3 elderly residents stranded on the 2nd floor.', timeline:[tl(6,'Resident (Mobile)','Report submitted with GPS location and 2 photos')]},
    {...base, id:'DR-2026-0102', type:'Fire', reporter:'Maria Clara Reyes', phone:'0928 555 0188', address:'Brgy. Lambakin, Marilao', lat:14.7650, lng:120.9580, people:20, createdAt:m(11),
      desc:'Residential fire spreading to adjacent houses near the public market. Heavy smoke visible.', timeline:[tl(11,'Resident (Mobile)','Report submitted with GPS location and 1 photo')]},
    {...base, id:'DR-2026-0103', type:'Landslide', reporter:'Roberto Aquino', phone:'0915 555 0170', address:'Brgy. Tungkong Mangga, San Jose del Monte', lat:14.8260, lng:121.0610, people:6, createdAt:m(38),
      verification:'verified', priority:'critical', officerId:'o4', status:'Awaiting Assignment', desc:'Hillside collapsed onto 2 houses. Family members trapped under debris.',
      timeline:[tl(38,'Resident (Mobile)','Report submitted'), tl(31,'Admin','Report verified as TRUE information'), tl(30,'Admin','Priority set to CRITICAL'), tl(29,'Admin','Task assigned to Lt. Ana Villanueva (nearest officer)')]},
    {...base, id:'DR-2026-0104', type:'Flood', reporter:'Liza Mendoza', phone:'0932 555 0121', address:'Brgy. San Pedro, Hagonoy', lat:14.8420, lng:120.7450, people:30, createdAt:m(95),
      verification:'verified', priority:'high', officerId:'o5', status:'Rescue in Progress', desc:'Rising river water. Families on rooftops requesting boat rescue.',
      dispatches:[{unit:'SRR',status:'On Scene',at:m(60)},{unit:'AMBULANCE',status:'En Route',at:m(60)}],
      backupAlert:{unit:'SRR',message:'Water level still rising. Need additional rescue boats and personnel.',at:m(8),handled:false},
      timeline:[tl(95,'Resident (Mobile)','Report submitted'), tl(88,'Admin','Report verified as TRUE information'), tl(86,'Admin','Task assigned to Capt. Pedro Bautista'), tl(60,'Capt. Pedro Bautista','Dispatched SRR, AMBULANCE'), tl(8,'Rescue Team (SRR)','Requested backup from the field')]},
    {...base, id:'DR-2026-0105', type:'Earthquake', reporter:'Anonymous', phone:'0900 555 0000', address:'Brgy. Santo Rosario, Malolos', lat:14.8500, lng:120.8200, people:100, createdAt:m(120),
      verification:'false', status:'Rejected', rejectReason:'No seismic event recorded; repeated prank submissions from the same number.', desc:'Strong earthquake destroyed many buildings.',
      timeline:[tl(120,'Resident (Mobile)','Report submitted'), tl(110,'Admin','Report marked as FALSE information')]},
    {...base, id:'DR-2026-0106', type:'Fire', reporter:'Carlo Domingo', phone:'0945 555 0177', address:'Brgy. Turo, Bocaue', lat:14.8010, lng:120.9300, people:9, createdAt:m(210),
      verification:'verified', priority:'high', officerId:'o3', status:'Resolved', forwarded:true, desc:'Warehouse fire with workers inside.',
      dispatches:[{unit:'BFP',status:'Completed',at:m(190)},{unit:'AMBULANCE',status:'Completed',at:m(190)}],
      completion:{rescued:9, notes:'All workers evacuated. 2 treated for smoke inhalation. Fire fully out.', at:m(70)},
      officerSummary:'Mission successful. 9 rescued, 2 minor injuries, no casualties. Area handed to barangay for cleanup.',
      timeline:[tl(210,'Resident (Mobile)','Report submitted'), tl(200,'Admin','Report verified as TRUE information'), tl(192,'Insp. Jose Reyes','Dispatched BFP, AMBULANCE'), tl(70,'Rescue Team','Mission completed: 9 rescued'), tl(55,'Insp. Jose Reyes','Completion report forwarded to Admin')]},
    {...base, id:'DR-2026-0107', type:'Storm', reporter:'Edna Pascual', phone:'0966 555 0133', address:'Brgy. Poblacion, Calumpit', lat:14.9150, lng:120.7700, people:4, createdAt:m(25),
      desc:'Uprooted tree blocking the road and power lines down near the school.', timeline:[tl(25,'Resident (Mobile)','Report submitted with GPS location')]},
    {...base, id:'DR-2026-0108', type:'Flood', reporter:'Mark Bernardo', phone:'0977 555 0166', address:'Brgy. Paliwas, Obando', lat:14.7100, lng:120.9300, people:8, createdAt:m(52),
      verification:'verified', priority:'medium', status:'Verified', desc:'Knee-deep flood, residents asking for evacuation assistance.',
      timeline:[tl(52,'Resident (Mobile)','Report submitted'), tl(45,'Admin','Report verified as TRUE information'), tl(44,'Admin','Priority set to MEDIUM')]},
    {...base, id:'DR-2026-0109', type:'Flood', reporter:'Grace Lim', phone:'0955 555 0199', address:'Brgy. Bambang, Bulakan', lat:14.7900, lng:120.8700, people:45, createdAt:m(150),
      verification:'verified', priority:'critical', officerId:'o2', status:'Rescue in Progress', desc:'Large area submerged. Many residents stranded, including children.',
      dispatches:[{unit:'SRR',status:'On Scene',at:m(120)}],
      backup:{reason:'Large number of stranded residents; one SRR team is not enough. Need extra boats and an ambulance.', requestedBy:'o2', requestedAt:m(14), status:'requested', officerId:null},
      timeline:[tl(150,'Resident (Mobile)','Report submitted'), tl(140,'Admin','Report verified as TRUE information'), tl(138,'Admin','Task assigned to Lt. Maria Santos'), tl(120,'Lt. Maria Santos','Dispatched SRR'), tl(14,'Lt. Maria Santos','Backup requested via Admin')]}
  ];
  // Only 4 fresh, unverified starter reports are kept (Flood, Fire, Landslide, Storm); everything else was removed.
  const KEEP = ['DR-2026-0101', 'DR-2026-0102', 'DR-2026-0103', 'DR-2026-0107'];
  const starter = reports.filter(r => KEEP.includes(r.id)).map(r => ({...r, verification:'pending', priority:null, status:'Submitted', officerId:null, dispatches:[], backupAlert:null, backup:null, completion:null, forwarded:false, officerSummary:'', rejectReason:'', timeline:[r.timeline[0]]}));
  const notifs = starter.map(r => ({id:uid(), to:'admin', text:r.id + ' · New ' + r.type + ' report from ' + r.address, reportId:r.id, kind:'info', at:r.createdAt, read:false}));
  const audit = [];
  return {officers, reports:starter, notifs, audit};
}
export function loadDb() { try { const s = localStorage.getItem(KEY + '-db'); if (s) return JSON.parse(s); } catch (e) {} return seed(); }
export function loadSession() { try { const s = localStorage.getItem(KEY + '-session'); if (s) return JSON.parse(s); } catch (e) {} return null; }
