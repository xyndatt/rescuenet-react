import { ref, clean, toArr } from '../firebase.js';
import { notFound, forbidden, conflict, badRequest } from '../errors.js';
import { newFx, resetFx, note, audit, flush } from './effects.js';
import { UNIT_FLOW, PHOTOS_PER_REPORT } from '../domain.js';
import { savePhotos, deletePhotos, checkFiles } from './photos.js';
import { loadRescuers } from './rescuers.js';
import { residentKey, assertResidentValid, recordFalseReport } from './residents.js';

const tl = (r, by, text) => r.timeline.push({ at: Date.now(), by, text });
export const normalizeReport = r => ({
  priority: null, backupAlert: null, backup: null, completion: null, officerId: null,
  forwarded: false, officerSummary: '', rejectReason: '', ...r, dispatches: toArr(r.dispatches), timeline: toArr(r.timeline), photos: toArr(r.photos)
});

export async function loadOfficers() {
  const s = await ref('officers').get();
  return s.val() || {};
}
export const nameOf = (officers, id) => officers[id]?.name || 'Officer';

// Run `fn(report, fx)` atomically on one report. Retries safely if two people act at once.
// `fn` may throw an HttpError to abort. Side effects are written only after a successful commit.
export async function mutateReport(id, fn) {
  const fx = newFx(); let failure = null;
  const res = await ref(`reports/${id}`).transaction(cur => {
    if (cur === null) return cur;                       // first local guess; server retries with real data
    resetFx(fx); failure = null;                        // update fn can run more than once
    try { const r = normalizeReport(cur); fn(r, fx); return clean(r); }
    catch (e) { failure = e; return undefined; }        // abort
  });
  if (failure) throw failure;
  if (!res.snapshot.exists()) throw notFound('Report not found.');
  if (!res.committed) throw conflict('The report was changed by someone else. Please try again.');
  await flush(fx);
  return res.snapshot.val();
}

// ---------- resident / mobile submission ----------
export async function createReport(f, files = [], reporterUid = null) {
  await assertResidentValid(residentKey({ uid: reporterUid, phone: f.phone }));   // invalid residents cannot report
  checkFiles(files);                                   // reject bad files before using up a report number
  const c = await ref('meta/reportCounter').transaction(n => (n || 100) + 1);
  const id = 'DR-2026-' + String(c.snapshot.val()).padStart(4, '0');
  const now = Date.now();
  const src = f.source === 'web' ? 'Web' : 'Mobile', by = `Resident (${src})`;
  const photos = files.length ? await savePhotos(id, files, by) : [];
  const report = {
    id, ...f, ...(reporterUid ? { reporterUid } : {}), source: src.toLowerCase(), createdAt: now, verification: 'pending', priority: null, status: 'Submitted', officerId: null,
    dispatches: [], backupAlert: null, backup: null, completion: null, forwarded: false, officerSummary: '', rejectReason: '', photos,
    timeline: [{ at: now, by, text: 'Report submitted with location' + (photos.length ? ` and ${photos.length} photo(s)` : '') }]
  };
  try {
    const fx = newFx();
    note(fx, 'admin', `${id} · New ${f.type} report from ${f.address}` + (photos.length ? ` (${photos.length} photo${photos.length > 1 ? 's' : ''})` : ''), id);
    await ref(`reports/${id}`).set(clean(report));
    await flush(fx);
  } catch (e) { await deletePhotos(photos.map(p => p.path)); throw e; }
  return id;
}

// ---------- public status lookup for the reporter (needs report ID + the phone number used) ----------
const digits = v => String(v || '').replace(/\D/g, '');
export async function trackReport(id, phone) {
  const snap = await ref(`reports/${id}`).get();
  const r = snap.exists() ? normalizeReport(snap.val()) : null;
  const p = digits(phone);
  // same message for "no such report" and "wrong phone" so IDs cannot be probed
  if (!r || p.length < 7 || digits(r.phone) !== p) throw notFound('No report matches that ID and phone number.');
  return { id: r.id, type: r.type, address: r.address, createdAt: r.createdAt, verification: r.verification, status: r.status,
    rejectReason: r.verification === 'false' ? r.rejectReason : '', teamsDispatched: r.dispatches.length, rescued: r.completion ? r.completion.rescued : null };
}

// ---------- photos on an existing report (admin, or the assigned / backup officer) ----------
export async function addPhotos(id, user, files) {
  if (!files.length) throw badRequest('Choose at least one photo.');
  checkFiles(files);
  if (!(await ref(`reports/${id}/id`).get()).exists()) throw notFound('Report not found.');
  const by = user.role === 'admin' ? 'Admin' : user.role === 'rescuer' ? `${user.name || 'Rescuer'} (${user.unit})` : nameOf(await loadOfficers(), user.officerId);
  const saved = await savePhotos(id, files, by);
  try {
    return await mutateReport(id, r => {
      if (user.role === 'officer') assertOfficerOn(r, user.officerId);
      if (user.role === 'rescuer' && (r.officerId !== user.officerId || !r.dispatches.some(d => d.unit === user.unit))) throw forbidden('Your team is not dispatched to this report.');
      if (['Closed', 'Rejected'].includes(r.status)) throw conflict('Photos cannot be added to a closed or rejected report.');
      if (r.photos.length + saved.length > PHOTOS_PER_REPORT) throw conflict(`A report can have at most ${PHOTOS_PER_REPORT} photos.`);
      r.photos.push(...saved); tl(r, by, `Added ${saved.length} photo${saved.length > 1 ? 's' : ''}`);
    });
  } catch (e) { await deletePhotos(saved.map(p => p.path)); throw e; }
}

export async function deletePhoto(id, photoId) {
  let removed = null;
  await mutateReport(id, (r, fx) => {
    removed = null;
    const i = r.photos.findIndex(p => p.id === photoId);
    if (i < 0) throw notFound('Photo not found.');
    removed = r.photos.splice(i, 1)[0];
    tl(r, 'Admin', 'Removed a photo'); audit(fx, 'Admin', 'Removed a photo', id);
  });
  if (removed) await deletePhotos([removed.path]);
}

// ---------- admin actions ----------
export const startReview = id => mutateReport(id, (r, fx) => {
  if (r.status !== 'Submitted') throw conflict('Only newly submitted reports can start review.');
  r.status = 'Under Verification'; tl(r, 'Admin', 'Report is under verification');
});

export const verify = async (id, ok, reason) => {
  const rep = await verifyReport(id, ok, reason);
  if (!ok) await recordFalseReport(rep);          // FALSE information counts against the resident
  return rep;
};
const verifyReport = (id, ok, reason) => mutateReport(id, (r, fx) => {
  if (r.verification !== 'pending') throw conflict('This report was already reviewed.');
  if (ok) {
    r.verification = 'verified'; if (['Submitted', 'Under Verification'].includes(r.status)) r.status = 'Verified';
    tl(r, 'Admin', 'Report verified as TRUE information'); audit(fx, 'Admin', 'Verified report as true information', id);
  } else {
    r.verification = 'false'; r.status = 'Rejected'; r.rejectReason = reason;
    tl(r, 'Admin', 'Report marked as FALSE: ' + reason); audit(fx, 'Admin', 'Marked report as FALSE information', id);
  }
});

// Admin: the report repeats another one, or was cancelled (e.g. the reporter withdrew it). Only before a team is dispatched.
// Both end up as verification 'false' so they drop out of every pending / active list; the status tells them apart.
const closeOut = (r, fx, status, reason, label) => {
  if (r.dispatches.length) throw conflict('A team is already dispatched. Let the officer finish the mission instead.');
  if (['Resolved', 'Closed', 'Rejected', 'Duplicate', 'Cancelled'].includes(r.status)) throw conflict('This report is already finished.');
  r.verification = 'false'; r.status = status; r.rejectReason = reason; r.priority = r.priority || null;
  tl(r, 'Admin', label + ': ' + reason); audit(fx, 'Admin', label, r.id);
  if (r.officerId) note(fx, r.officerId, `${r.id} was ${status.toLowerCase()} by the Admin. No action needed.`, r.id);
};
export async function markDuplicate(id, ofId) {
  if (id === ofId) throw badRequest('A report cannot be a duplicate of itself.');
  if (!(await ref(`reports/${ofId}/id`).get()).exists()) throw badRequest('The original report was not found.');
  return mutateReport(id, (r, fx) => closeOut(r, fx, 'Duplicate', 'Duplicate of ' + ofId, 'Marked report as duplicate'));
}
export const cancelReport = (id, reason) => mutateReport(id, (r, fx) => closeOut(r, fx, 'Cancelled', reason, 'Cancelled report'));

export const setPriority = (id, p) => mutateReport(id, (r, fx) => {
  if (r.verification !== 'verified' || ['Resolved', 'Closed'].includes(r.status)) throw conflict('Priority can only be set on an open, verified report.');
  r.priority = p; tl(r, 'Admin', 'Priority set to ' + p.toUpperCase()); audit(fx, 'Admin', 'Set priority to ' + p.toUpperCase(), id);
});

export async function assign(id, officerId) {
  const officers = await loadOfficers();
  if (!officers[officerId]) throw badRequest('Officer not found.');
  const name = nameOf(officers, officerId);
  return mutateReport(id, (r, fx) => {
    if (r.verification !== 'verified' || !r.priority) throw conflict('Verify the report and set a priority before assigning.');
    if (r.dispatches.length) throw conflict('A team was already dispatched, so reassignment is locked.');
    if (['Resolved', 'Closed'].includes(r.status)) throw conflict('This case is already finished.');
    r.officerId = officerId; r.status = 'Awaiting Assignment';
    tl(r, 'Admin', 'Task assigned to ' + name); audit(fx, 'Admin', 'Assigned task to ' + name, id);
    note(fx, officerId, `NEW TASK · ${r.priority.toUpperCase()} ${r.type} at ${r.address}. Dispatch a rescue team.`, id, 'alert');
  });
}

export async function assignBackup(id, backupId) {
  const officers = await loadOfficers();
  if (!officers[backupId]) throw badRequest('Officer not found.');
  const bn = nameOf(officers, backupId);
  return mutateReport(id, (r, fx) => {
    if (!r.backup || r.backup.status !== 'requested') throw conflict('There is no pending backup request on this report.');
    if (backupId === r.officerId) throw badRequest('The backup officer must be a different officer.');
    r.backup.status = 'assigned'; r.backup.officerId = backupId;
    tl(r, 'Admin', 'Backup assigned: ' + bn); audit(fx, 'Admin', 'Assigned backup officer ' + bn, id);
    note(fx, backupId, `BACKUP TASK · Reinforce ${nameOf(officers, r.officerId)} at ${r.address}`, id, 'alert');
    note(fx, r.officerId, `Backup approved: ${bn} will reinforce ${r.id}`, id);
  });
}

export const close = id => mutateReport(id, (r, fx) => {
  if (r.status !== 'Resolved') throw conflict('Only resolved cases can be closed.');
  r.status = 'Closed'; tl(r, 'Admin', 'Case closed'); audit(fx, 'Admin', 'Closed case', id);
  if (r.officerId) note(fx, r.officerId, `${r.id} was closed by the Admin. Good work!`, id);
});

// ---------- officer actions (caller must be the assigned / backup officer) ----------
const assertOfficerOn = (r, officerId, { primaryOnly = false } = {}) => {
  const primary = r.officerId === officerId;
  const backup = r.backup?.status === 'assigned' && r.backup.officerId === officerId;
  if (!(primary || (!primaryOnly && backup))) throw forbidden('This report is not assigned to you.');
};

export async function dispatch(id, officerId, units, instructions) {
  const officers = await loadOfficers(); const me = nameOf(officers, officerId);
  const crew = (await loadRescuers()).filter(x => x.officerId === officerId && units.includes(x.unit));
  return mutateReport(id, (r, fx) => {
    assertOfficerOn(r, officerId);
    if (!['Awaiting Assignment', 'Team Assigned', 'Rescue in Progress', 'Verified'].includes(r.status)) throw conflict('This report cannot receive teams right now.');
    const used = r.dispatches.map(d => d.unit);
    if (units.some(u => used.includes(u))) throw conflict('One of those teams is already deployed.');
    units.forEach(u => r.dispatches.push({ unit: u, status: 'Dispatched', at: Date.now() }));
    if (['Verified', 'Awaiting Assignment'].includes(r.status)) r.status = 'Team Assigned';
    tl(r, me, 'Dispatched ' + units.join(', ') + (instructions ? ` — "${instructions}"` : '')); audit(fx, me, 'Dispatched ' + units.join(', '), id);
    note(fx, 'admin', `${me} dispatched ${units.join(', ')} to ${r.id}`, id);
    if (r.officerId === officerId) crew.forEach(x => note(fx, x.id, `NEW MISSION · ${r.type} at ${r.address}. Your ${x.unit} team is dispatched.`, id, 'alert'));
  });
}

export async function requestBackup(id, officerId, reason) {
  const officers = await loadOfficers(); const me = nameOf(officers, officerId);
  return mutateReport(id, (r, fx) => {
    assertOfficerOn(r, officerId, { primaryOnly: true });
    if (r.backup && r.backup.status === 'requested') throw conflict('Backup was already requested.');
    r.backup = { reason, requestedBy: officerId, requestedAt: Date.now(), status: 'requested', officerId: null };
    if (r.backupAlert) r.backupAlert.handled = true;
    tl(r, me, 'Backup requested via Admin'); audit(fx, me, 'Requested backup via Admin', id);
    note(fx, 'admin', `BACKUP REQUEST · ${me} needs backup for ${r.id}`, id, 'alert');
  });
}

export async function forwardCompletion(id, officerId, summary) {
  const officers = await loadOfficers(); const me = nameOf(officers, officerId);
  return mutateReport(id, (r, fx) => {
    assertOfficerOn(r, officerId, { primaryOnly: true });
    if (!r.completion) throw conflict('The rescue team has not reported mission completion yet.');
    if (['Resolved', 'Closed'].includes(r.status)) throw conflict('Already forwarded.');
    r.forwarded = true; r.officerSummary = summary; r.status = 'Resolved';
    tl(r, me, 'Completion report forwarded to Admin'); audit(fx, me, 'Forwarded completion report', id);
    note(fx, 'admin', `${r.id} · Completion report forwarded by ${me}`, id);
  });
}

// ---------- rescuer (field team member) updates ----------
export const fieldUpdate = (id, user, action, { rescued = 0, notes = '' } = {}) => mutateReport(id, (r, fx) => {
  if (r.officerId !== user.officerId) throw forbidden('This report is not assigned to your officer.');
  const d = r.dispatches.find(x => x.unit === user.unit);
  if (!d) throw forbidden('Your team has not been dispatched to this report.');
  if (['Resolved', 'Closed', 'Rejected'].includes(r.status)) throw conflict('This mission is already finished.');
  const who = `${user.name || 'Rescuer'} (${user.unit})`;
  if (action === 'advance') {
    const i = UNIT_FLOW.indexOf(d.status);
    if (i < 0 || i >= 2) throw conflict('Your team is already on scene. Use "Mission completed" when you are done.');
    d.status = UNIT_FLOW[i + 1]; r.status = 'Rescue in Progress';
    tl(r, who, 'Status update: ' + d.status); note(fx, r.officerId, `Team update on ${r.id}: ${user.unit} ${d.status}`, id);
  } else if (action === 'complete') {
    if (d.status !== 'On Scene') throw conflict('Mark your team as On Scene before completing.');
    d.status = 'Completed'; d.rescued = rescued; d.notes = notes;
    tl(r, who, `Mission completed: ${rescued} people rescued` + (notes ? ' — ' + notes : ''));
    if (r.dispatches.every(x => x.status === 'Completed')) {
      const total = r.dispatches.reduce((n, x) => n + (x.rescued || 0), 0);
      r.completion = { rescued: total, notes: r.dispatches.filter(x => x.notes).map(x => `${x.unit}: ${x.notes}`).join(' · ') || 'All teams completed.', at: Date.now() };
      note(fx, r.officerId, `MISSION COMPLETED · ${r.id}: ${total} people rescued. Forward the report to Admin.`, id, 'alert');
    } else note(fx, r.officerId, `${user.unit} team finished on ${r.id} (${rescued} rescued). Waiting for the other team(s).`, id);
  } else if (action === 'backup') {
    if (d.status === 'Completed') throw conflict('Your team already completed this mission.');
    r.backupAlert = { unit: user.unit, message: notes || 'Situation is getting worse. Requesting additional personnel and equipment.', at: Date.now(), handled: false };
    tl(r, who, 'Requested backup from the field');
    note(fx, r.officerId, `BACKUP ALERT · ${user.unit} team on ${r.id} is requesting backup`, id, 'alert');
  } else throw badRequest('Unknown action.');
});

// ---------- DEMO ONLY: stand-ins for the separate rescue-team mobile app ----------
export const teamUpdate = (id, officerId, action) => mutateReport(id, (r, fx) => {
  assertOfficerOn(r, officerId);
  if (!r.dispatches.length) throw conflict('No team has been dispatched yet.');
  if (action === 'advance') {
    r.dispatches.forEach(x => { const i = UNIT_FLOW.indexOf(x.status); if (i < 2) x.status = UNIT_FLOW[i + 1]; });
    r.status = 'Rescue in Progress';
    const s = r.dispatches.map(x => `${x.unit} ${x.status}`).join(', ');
    tl(r, 'Rescue Team (Mobile)', 'Status update: ' + s); note(fx, r.officerId, `Team update on ${r.id}: ${s}`, id);
  } else if (action === 'backup') {
    const u = r.dispatches.find(x => x.status !== 'Completed') || r.dispatches[0];
    r.backupAlert = { unit: u.unit, message: 'Situation is getting worse. Requesting additional personnel and equipment.', at: Date.now(), handled: false };
    tl(r, `Rescue Team (${u.unit})`, 'Requested backup from the field');
    note(fx, r.officerId, `BACKUP ALERT · ${u.unit} team on ${r.id} is requesting backup`, id, 'alert');
  } else if (action === 'complete') {
    r.dispatches.forEach(x => { x.status = 'Completed'; });
    const n = 4 + Math.floor(Math.random() * 12);
    r.completion = { rescued: n, notes: 'Area cleared. All affected residents accounted for.', at: Date.now() };
    tl(r, 'Rescue Team (Mobile)', `Mission completed: ${n} people rescued`);
    note(fx, r.officerId, `MISSION COMPLETED · ${r.id}: ${n} people rescued. Forward the report to Admin.`, id, 'alert');
  } else throw badRequest('Unknown action.');
});

