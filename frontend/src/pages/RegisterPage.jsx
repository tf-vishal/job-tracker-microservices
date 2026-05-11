import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Zap, Mail, Lock, User, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.jsx';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate     = useNavigate();
  const [form,    setForm]    = useState({ name: '', email: '', password: '' });
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const update = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(form.name, form.email, form.password);
      navigate('/dashboard');
    } catch (err) {
      const msgs = err.response?.data?.errors;
      setError(msgs?.map((e) => e.message).join(' ') || err.response?.data?.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  }

  const inputCls = 'w-full bg-bg-input border border-border-default text-text-primary placeholder-text-muted rounded-xl pl-9 pr-4 py-2.5 text-sm outline-none focus:border-border-focus focus:ring-2 focus:ring-accent/20 transition-all';

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-[-200px] right-[-200px] w-[500px] h-[500px] rounded-full bg-accent opacity-10 blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-sm animate-slide-up">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-purple flex items-center justify-center accent-glow">
            <Zap size={20} className="text-white" />
          </div>
          <span className="text-xl font-bold gradient-text">JobTracker</span>
        </div>

        <div className="bg-bg-card border border-border-default rounded-2xl p-8 shadow-2xl">
          <h1 className="text-xl font-bold text-text-primary text-center mb-1">Create account</h1>
          <p className="text-sm text-text-muted text-center mb-7">Start tracking your applications</p>

          {error && (
            <div className="flex items-center gap-2 bg-error-bg border border-error/20 text-error text-sm rounded-xl px-4 py-3 mb-5">
              <AlertCircle size={15} className="flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {[
              { id: 'reg-name',     key: 'name',     type: 'text',     icon: User, placeholder: 'Full name' },
              { id: 'reg-email',    key: 'email',     type: 'email',    icon: Mail, placeholder: 'you@example.com' },
              { id: 'reg-password', key: 'password',  type: 'password', icon: Lock, placeholder: 'Min 8 chars, 1 uppercase, 1 number' },
            ].map(({ id, key, type, icon: Icon, placeholder }) => (
              <div key={key}>
                <label className="block text-xs font-medium text-text-secondary mb-1.5 capitalize">{key}</label>
                <div className="relative">
                  <Icon size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input
                    id={id}
                    type={type}
                    required
                    placeholder={placeholder}
                    value={form[key]}
                    onChange={update(key)}
                    className={inputCls}
                  />
                </div>
              </div>
            ))}

            <button
              id="register-submit"
              type="submit"
              disabled={loading}
              className="w-full bg-accent hover:bg-accent-hover text-white font-semibold py-2.5 rounded-xl text-sm transition-all hover:shadow-lg hover:shadow-accent/25 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-1"
            >
              {loading ? <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin-custom" /> : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-sm text-text-muted mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-accent hover:text-accent-hover font-medium">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
