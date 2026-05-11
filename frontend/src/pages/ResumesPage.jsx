import { useEffect, useState, useCallback } from 'react';
import { Plus, Pencil, Trash2, Star, FileText } from 'lucide-react';
import { resumesApi } from '../api/resumes.js';
import Modal from '../components/Modal.jsx';

const EMPTY_FORM = { version_name: '', file_name: '', file_size: '', notes: '', tags: '' };

export default function ResumesPage() {
  const [resumes,  setResumes]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [modal,    setModal]    = useState(null);
  const [selected, setSelected] = useState(null);
  const [form,     setForm]     = useState(EMPTY_FORM);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState('');

  const load = useCallback(() => {
    setLoading(true);
    resumesApi.list()
      .then(({ data }) => setResumes(data.data))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => { setForm(EMPTY_FORM); setSelected(null); setError(''); setModal('add'); };
  const openEdit = (r) => {
    setForm({ version_name: r.versionName, file_name: r.fileName, file_size: r.fileSize ?? '', notes: r.notes ?? '', tags: (r.tags || []).join(', ') });
    setSelected(r);
    setError('');
    setModal('edit');
  };

  async function handleSave() {
    setSaving(true); setError('');
    try {
      const payload = {
        version_name: form.version_name,
        file_name:    form.file_name,
        file_size:    form.file_size ? parseInt(form.file_size, 10) : undefined,
        notes:        form.notes || undefined,
        tags:         form.tags ? form.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
      };
      if (modal === 'add') await resumesApi.create(payload);
      else await resumesApi.update(selected.id, { version_name: payload.version_name, notes: payload.notes, tags: payload.tags });
      setModal(null); load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save.');
    } finally { setSaving(false); }
  }

  async function handleDelete() {
    setSaving(true);
    try { await resumesApi.delete(selected.id); setModal(null); load(); }
    finally { setSaving(false); }
  }

  async function handleSetActive(id) {
    await resumesApi.setActive(id); load();
  }

  const upd = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const inputCls = 'w-full bg-bg-input border border-border-default text-text-primary placeholder-text-muted rounded-xl px-3 py-2.5 text-sm outline-none focus:border-border-focus focus:ring-2 focus:ring-accent/20 transition-all';

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Resumes</h1>
          <p className="text-sm text-text-muted mt-0.5">{resumes.length} version{resumes.length !== 1 ? 's' : ''}</p>
        </div>
        <button id="add-resume-btn" onClick={openAdd} className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-accent/20">
          <Plus size={16} /> Add Version
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-7 h-7 rounded-full border-2 border-border-default border-t-accent animate-spin-custom" />
        </div>
      ) : resumes.length === 0 ? (
        <div className="text-center py-20 text-text-muted">
          <FileText size={40} className="mx-auto mb-3 opacity-25" />
          <p className="text-sm font-medium text-text-secondary mb-1">No resume versions yet</p>
          <p className="text-xs">Add your first resume version to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {resumes.map((r) => (
            <div
              key={r.id}
              className={`bg-bg-card border rounded-xl p-5 flex flex-col gap-3 hover:-translate-y-1 hover:shadow-lg transition-all
                ${r.isActive ? 'border-accent/40 shadow-sm shadow-accent/10' : 'border-border-subtle hover:border-border-default'}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-text-primary text-sm truncate">{r.versionName}</h3>
                  <p className="text-xs text-text-muted mt-0.5 truncate">{r.fileName}</p>
                  {r.fileSize && <p className="text-xs text-text-muted">{(r.fileSize / 1024).toFixed(0)} KB</p>}
                </div>
                {r.isActive && (
                  <span className="inline-flex items-center gap-1 bg-success-bg text-success text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0">
                    <Star size={10} /> Active
                  </span>
                )}
              </div>

              {r.notes && <p className="text-xs text-text-muted leading-relaxed border-t border-border-subtle pt-3">{r.notes}</p>}

              {r.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {r.tags.map((t) => (
                    <span key={t} className="px-2 py-0.5 bg-bg-elevated border border-border-subtle rounded-full text-xs text-text-muted">{t}</span>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-2 mt-auto pt-2 border-t border-border-subtle">
                {!r.isActive && (
                  <button
                    onClick={() => handleSetActive(r.id)}
                    className="flex-1 text-xs font-medium text-accent hover:text-accent-hover bg-accent-subtle hover:bg-accent/20 py-1.5 rounded-lg transition-all"
                  >
                    Set Active
                  </button>
                )}
                <button onClick={() => openEdit(r)} className="p-1.5 rounded-lg text-text-muted hover:text-accent hover:bg-accent-subtle transition-all">
                  <Pencil size={14} />
                </button>
                <button onClick={() => { setSelected(r); setModal('delete'); }} className="p-1.5 rounded-lg text-text-muted hover:text-error hover:bg-error-bg transition-all">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {(modal === 'add' || modal === 'edit') && (
        <Modal title={modal === 'add' ? 'Add Resume Version' : 'Edit Resume'} onClose={() => setModal(null)}
          footer={
            <>
              <button onClick={() => setModal(null)} className="px-4 py-2 rounded-xl text-sm text-text-secondary hover:bg-bg-elevated transition-all">Cancel</button>
              <button id="save-resume-btn" onClick={handleSave} disabled={saving} className="px-4 py-2 rounded-xl text-sm font-semibold bg-accent hover:bg-accent-hover text-white transition-all disabled:opacity-50">
                {saving ? 'Saving...' : modal === 'add' ? 'Add' : 'Save'}
              </button>
            </>
          }
        >
          {error && <p className="text-xs text-error bg-error-bg border border-error/20 rounded-lg px-3 py-2">{error}</p>}
          <div>
            <label className="block text-xs text-text-secondary mb-1.5 font-medium">Version Name *</label>
            <input id="resume-version" value={form.version_name} onChange={upd('version_name')} placeholder='e.g. "Backend Engineer v2"' className={inputCls} />
          </div>
          {modal === 'add' && (
            <>
              <div>
                <label className="block text-xs text-text-secondary mb-1.5 font-medium">File Name *</label>
                <input id="resume-file" value={form.file_name} onChange={upd('file_name')} placeholder="resume_v2.pdf" className={inputCls} />
              </div>
              <div>
                <label className="block text-xs text-text-secondary mb-1.5 font-medium">File Size (bytes)</label>
                <input id="resume-size" type="number" value={form.file_size} onChange={upd('file_size')} placeholder="153600" className={inputCls} />
              </div>
            </>
          )}
          <div>
            <label className="block text-xs text-text-secondary mb-1.5 font-medium">Tags (comma-separated)</label>
            <input id="resume-tags" value={form.tags} onChange={upd('tags')} placeholder="backend, react, devops" className={inputCls} />
          </div>
          <div>
            <label className="block text-xs text-text-secondary mb-1.5 font-medium">Notes</label>
            <textarea id="resume-notes" value={form.notes} onChange={upd('notes')} rows={3} placeholder="Tailored for SWE roles..." className={`${inputCls} resize-y`} />
          </div>
        </Modal>
      )}

      {modal === 'delete' && (
        <Modal title="Delete Resume Version" onClose={() => setModal(null)}
          footer={
            <>
              <button onClick={() => setModal(null)} className="px-4 py-2 rounded-xl text-sm text-text-secondary hover:bg-bg-elevated transition-all">Cancel</button>
              <button id="confirm-delete-resume-btn" onClick={handleDelete} disabled={saving} className="px-4 py-2 rounded-xl text-sm font-semibold bg-error-bg text-error border border-error/20 hover:bg-error hover:text-white transition-all disabled:opacity-50">
                {saving ? 'Deleting...' : 'Delete'}
              </button>
            </>
          }
        >
          <p className="text-sm text-text-secondary">
            Delete <span className="font-semibold text-text-primary">"{selected?.versionName}"</span>?
            {selected?.isActive && <span className="text-warning"> This is your active resume.</span>}
          </p>
        </Modal>
      )}
    </div>
  );
}
