import { useEffect, useState, useCallback } from 'react';
import { Plus, Pencil, Trash2, ExternalLink, Briefcase } from 'lucide-react';
import { jobsApi } from '../api/jobs.js';
import StatusBadge, { STATUS_MAP } from '../components/StatusBadge.jsx';
import Modal from '../components/Modal.jsx';
import { format } from 'date-fns';

const STATUSES  = Object.keys(STATUS_MAP);
const EMPTY_FORM = { company: '', role: '', status: 'applied', applied_date: '', notes: '', job_url: '', salary_range: '', location: '' };

export default function JobsPage() {
  const [jobs,     setJobs]     = useState([]);
  const [filter,   setFilter]   = useState('all');
  const [loading,  setLoading]  = useState(true);
  const [modal,    setModal]    = useState(null);  // null | 'add' | 'edit' | 'delete'
  const [selected, setSelected] = useState(null);
  const [form,     setForm]     = useState(EMPTY_FORM);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState('');

  const load = useCallback((status) => {
    setLoading(true);
    jobsApi.list(status === 'all' ? undefined : status)
      .then(({ data }) => setJobs(data.data))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(filter); }, [filter, load]);

  function openAdd() {
    setForm({ ...EMPTY_FORM, applied_date: new Date().toISOString().split('T')[0] });
    setSelected(null);
    setError('');
    setModal('add');
  }

  function openEdit(job) {
    setForm({
      company:      job.company,
      role:         job.role,
      status:       job.status,
      applied_date: job.appliedDate?.split('T')[0] ?? '',
      notes:        job.notes        ?? '',
      job_url:      job.jobUrl       ?? '',
      salary_range: job.salaryRange  ?? '',
      location:     job.location     ?? '',
    });
    setSelected(job);
    setError('');
    setModal('edit');
  }

  function openDelete(job) {
    setSelected(job);
    setModal('delete');
  }

  async function handleSave() {
    setSaving(true);
    setError('');
    try {
      if (modal === 'add') {
        await jobsApi.create(form);
      } else {
        await jobsApi.update(selected.id, form);
      }
      setModal(null);
      load(filter);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save. Please check your inputs.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setSaving(true);
    try {
      await jobsApi.delete(selected.id);
      setModal(null);
      load(filter);
    } finally {
      setSaving(false);
    }
  }

  const upd = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const inputCls = 'w-full bg-bg-input border border-border-default text-text-primary placeholder-text-muted rounded-xl px-3 py-2.5 text-sm outline-none focus:border-border-focus focus:ring-2 focus:ring-accent/20 transition-all';

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Job Applications</h1>
          <p className="text-sm text-text-muted mt-0.5">{jobs.length} application{jobs.length !== 1 ? 's' : ''}</p>
        </div>
        <button id="add-job-btn" onClick={openAdd} className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-accent/20">
          <Plus size={16} /> Add Application
        </button>
      </div>

      {/* Filter pills */}
      <div className="flex flex-wrap gap-2 mb-5">
        {['all', ...STATUSES].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all
              ${filter === s
                ? 'bg-accent-subtle border-accent text-accent-hover'
                : 'bg-bg-card border-border-default text-text-secondary hover:border-accent hover:text-accent'
              }`}
          >
            {s === 'all' ? 'All' : STATUS_MAP[s]?.label ?? s}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-bg-card border border-border-subtle rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-7 h-7 rounded-full border-2 border-border-default border-t-accent animate-spin-custom" />
          </div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-16 text-text-muted">
            <Briefcase size={36} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium text-text-secondary mb-1">No applications found</p>
            <p className="text-xs">Try a different filter or add a new application</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-bg-elevated border-b border-border-subtle">
                {['Company', 'Role', 'Status', 'Location', 'Applied', 'Actions'].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wide first:pl-5">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={job.id} className="border-t border-border-subtle hover:bg-bg-elevated/50 transition-colors group">
                  <td className="px-5 py-3.5 text-sm font-semibold text-text-primary">{job.company}</td>
                  <td className="px-5 py-3.5 text-sm text-text-secondary">
                    <div className="flex items-center gap-1.5">
                      {job.role}
                      {job.jobUrl && <a href={job.jobUrl} target="_blank" rel="noreferrer" className="text-text-muted hover:text-accent"><ExternalLink size={12} /></a>}
                    </div>
                  </td>
                  <td className="px-5 py-3.5"><StatusBadge status={job.status} /></td>
                  <td className="px-5 py-3.5 text-sm text-text-muted">{job.location || '—'}</td>
                  <td className="px-5 py-3.5 text-sm text-text-muted whitespace-nowrap">
                    {job.appliedDate ? format(new Date(job.appliedDate), 'MMM d, yyyy') : '—'}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEdit(job)} className="p-1.5 rounded-lg text-text-muted hover:text-accent hover:bg-accent-subtle transition-all">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => openDelete(job)} className="p-1.5 rounded-lg text-text-muted hover:text-error hover:bg-error-bg transition-all">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add / Edit Modal */}
      {(modal === 'add' || modal === 'edit') && (
        <Modal
          title={modal === 'add' ? 'Add Application' : 'Edit Application'}
          onClose={() => setModal(null)}
          footer={
            <>
              <button onClick={() => setModal(null)} className="px-4 py-2 rounded-xl text-sm text-text-secondary hover:bg-bg-elevated transition-all">Cancel</button>
              <button
                id="save-job-btn"
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-accent hover:bg-accent-hover text-white transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {saving ? <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin-custom" /> : null}
                {modal === 'add' ? 'Add' : 'Save'}
              </button>
            </>
          }
        >
          {error && <p className="text-xs text-error bg-error-bg border border-error/20 rounded-lg px-3 py-2">{error}</p>}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs text-text-secondary mb-1.5 font-medium">Company *</label>
              <input id="job-company" value={form.company} onChange={upd('company')} placeholder="Google" className={inputCls} required />
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-text-secondary mb-1.5 font-medium">Role *</label>
              <input id="job-role" value={form.role} onChange={upd('role')} placeholder="Software Engineer" className={inputCls} required />
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-1.5 font-medium">Status</label>
              <select id="job-status" value={form.status} onChange={upd('status')} className={inputCls}>
                {STATUSES.map((s) => <option key={s} value={s}>{STATUS_MAP[s].label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-1.5 font-medium">Applied Date</label>
              <input id="job-date" type="date" value={form.applied_date} onChange={upd('applied_date')} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-1.5 font-medium">Location</label>
              <input id="job-location" value={form.location} onChange={upd('location')} placeholder="Remote" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-1.5 font-medium">Salary Range</label>
              <input id="job-salary" value={form.salary_range} onChange={upd('salary_range')} placeholder="$100k–$130k" className={inputCls} />
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-text-secondary mb-1.5 font-medium">Job URL</label>
              <input id="job-url" value={form.job_url} onChange={upd('job_url')} placeholder="https://..." className={inputCls} />
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-text-secondary mb-1.5 font-medium">Notes</label>
              <textarea id="job-notes" value={form.notes} onChange={upd('notes')} rows={3} placeholder="Recruiter name, next steps..." className={`${inputCls} resize-y`} />
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirm Modal */}
      {modal === 'delete' && (
        <Modal
          title="Delete Application"
          onClose={() => setModal(null)}
          footer={
            <>
              <button onClick={() => setModal(null)} className="px-4 py-2 rounded-xl text-sm text-text-secondary hover:bg-bg-elevated transition-all">Cancel</button>
              <button
                id="confirm-delete-btn"
                onClick={handleDelete}
                disabled={saving}
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-error-bg text-error border border-error/20 hover:bg-error hover:text-white transition-all disabled:opacity-50"
              >
                {saving ? 'Deleting...' : 'Delete'}
              </button>
            </>
          }
        >
          <p className="text-sm text-text-secondary">
            Are you sure you want to delete your application to{' '}
            <span className="font-semibold text-text-primary">{selected?.company}</span>?
            This action cannot be undone.
          </p>
        </Modal>
      )}
    </div>
  );
}
