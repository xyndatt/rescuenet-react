import React, { useEffect, useRef, useState } from 'react';
import { compressImage } from '../image';
import { photoUrl } from '../firebase';
import { useApp } from '../context';

// Choose + compress photos. value = [{file, preview}]
export function PhotoPicker({value, onChange, max = 4}) {
  const inp = useRef(null); const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  const add = async e => {
    const picked = [...e.target.files].slice(0, max - value.length); e.target.value = ''; setErr('');
    if (!picked.length) return;
    setBusy(true);
    try {
      const out = [];
      for (const f of picked) { const file = await compressImage(f); out.push({file, preview: URL.createObjectURL(file)}); }
      onChange([...value, ...out]);
    } catch (x) { setErr(x.message); } finally { setBusy(false); }
  };
  const remove = i => { URL.revokeObjectURL(value[i].preview); onChange(value.filter((_, j) => j !== i)); };
  return <div>
    <div className="photo-grid">
      {value.map((p, i) => <div className="photo-t" key={p.preview}><img src={p.preview} alt=""/><button type="button" className="photo-x" onClick={() => remove(i)} aria-label="Remove photo">×</button></div>)}
      {value.length < max && <button type="button" className="photo-t photo-add" disabled={busy} onClick={() => inp.current.click()}>{busy ? '…' : '📷'}<span>{busy ? 'Processing' : 'Add photo'}</span></button>}
    </div>
    <input ref={inp} type="file" accept="image/*" multiple hidden onChange={add}/>
    {err && <div className="err" style={{marginTop:8}}>{err}</div>}
    <div className="hint" style={{marginTop:6}}>Up to {max} photos. They are resized automatically.</div>
  </div>;
}

function Thumb({p, onOpen}) {
  const [url, setUrl] = useState(null); const [bad, setBad] = useState(false);
  useEffect(() => { let on = true; photoUrl(p.path).then(u => on && setUrl(u)).catch(() => on && setBad(true)); return () => { on = false; }; }, [p.path]);
  return <button type="button" className="photo-t" disabled={!url} onClick={() => onOpen(url)}>{url ? <img src={url} alt="Report photo" loading="lazy"/> : <span style={{fontSize:12,color:'#8FA3C2'}}>{bad ? 'Unavailable' : '…'}</span>}</button>;
}

// Gallery for a saved report. canAdd -> upload more; canDelete (admin) -> remove from lightbox.
export function PhotoGallery({r, canAdd, canDelete}) {
  const {A} = useApp(); const inp = useRef(null); const [view, setView] = useState(null); const [busy, setBusy] = useState(false);
  const photos = r.photos || [];
  const add = async e => {
    const picked = [...e.target.files].slice(0, 4); e.target.value = '';
    if (!picked.length) return;
    setBusy(true);
    try { await A.addPhotos(r.id, await Promise.all(picked.map(f => compressImage(f)))); } catch (x) { alert(x.message); } finally { setBusy(false); }
  };
  if (!photos.length && !canAdd) return null;
  const sel = view && photos.find(p => p.id === view.id);
  return <div className="card"><div className="card-h"><h4>Photos ({photos.length})</h4><span className="sp"/>
    {canAdd && photos.length < 12 && <><button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => inp.current.click()}>{busy ? 'Uploading…' : '📷 Add photos'}</button><input ref={inp} type="file" accept="image/*" multiple hidden onChange={add}/></>}</div>
    <div className="card-b">{photos.length === 0 ? <div className="hint">No photos yet.</div> : <div className="photo-grid">{photos.map(p => <Thumb key={p.id} p={p} onOpen={url => setView({id: p.id, url})}/>)}</div>}</div>
    {sel && <div className="lightbox" onClick={() => setView(null)}>
      <img src={view.url} alt="Report photo" onClick={e => e.stopPropagation()}/>
      <div className="lb-bar" onClick={e => e.stopPropagation()}><span>Added by {sel.by}</span>
        {canDelete && <button className="btn btn-red btn-sm" onClick={() => { if (confirm('Remove this photo?')) { A.deletePhoto(r.id, sel.id); setView(null); } }}>Remove</button>}
        <button className="btn btn-ghost btn-sm" onClick={() => setView(null)}>Close</button></div></div>}
  </div>;
}
