import React, { useState } from 'react';
import { TYPES } from '../data';
import { Modal } from './ui';
import { LocationPicker } from './LocationPicker';
import { PhotoPicker } from './Photos';
import { useApp } from '../context';

export function NewReportModal({onClose}) {
  const {A} = useApp();
  const [f, setF] = useState({type: 'Flood', reporter: '', phone: '', address: '', people: 1, desc: ''});
  const [loc, setLoc] = useState(null); const [photos, setPhotos] = useState([]); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const set = k => e => setF({...f, [k]: e.target.value});
  const submit = async () => {
    if (!loc) return setErr('Pick a location: press "Use my GPS" or tap the map.');
    if (!f.reporter.trim() || !f.address.trim() || !f.desc.trim()) return setErr('Name, address and description are required.');
    setBusy(true); setErr('');
    try { await A.createReport({...f, people: Number(f.people) || 1, ...loc}, photos.map(p => p.file)); onClose(); } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };
  return <Modal title="New disaster report" onClose={onClose} footer={<><button className="btn btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={busy} onClick={submit}>{busy ? 'Sending…' : 'Submit report'}</button></>}>
    {err && <div className="err">{err}</div>}
    <div className="field"><label>Disaster type</label><select className="input" value={f.type} onChange={set('type')}>{Object.keys(TYPES).map(t => <option key={t}>{t}</option>)}</select></div>
    <div className="field"><label>Reporter name</label><input className="input" value={f.reporter} onChange={set('reporter')}/></div>
    <div className="field"><label>Phone</label><input className="input" value={f.phone} onChange={set('phone')}/></div>
    <div className="field"><label>Address / barangay</label><input className="input" value={f.address} onChange={set('address')} placeholder="Brgy. ..., Municipality"/></div>
    <div className="field"><label>People affected</label><input className="input" type="number" min="1" value={f.people} onChange={set('people')}/></div>
    <div className="field"><label>Description</label><textarea className="input" value={f.desc} onChange={set('desc')}/></div>
    <div className="field"><label>Photos (optional)</label><PhotoPicker value={photos} onChange={setPhotos}/></div>
    <div className="field"><label>Location (GPS)</label><LocationPicker value={loc} onChange={setLoc}/></div>
  </Modal>;
}
