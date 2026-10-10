import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../app/providers/AuthContext';
import { SafeImage } from '../components/ui/CommonUi';
import { STITCH_ASSETS } from '../mock/mockData';
import { DEMO_DEV_PASSWORD } from '../services/auth/authService';
import { Role } from '../types';
import { ROLE_LABELS } from '../utils/rbac';

export const LoginPage: React.FC = () => {
  const { login, loginByRole, isLoading, demoAccounts } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('controlroom@smarttourist.demo');
  const [password, setPassword] = useState(DEMO_DEV_PASSWORD);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [forgotModalOpen, setForgotModalOpen] = useState(false);
  const [forgotSubmitted, setForgotSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!email.trim()) {
      setErrorMsg('Operator email / username is required.');
      return;
    }
    if (!password.trim()) {
      setErrorMsg('Password is required.');
      return;
    }

    try {
      await login({ email, password });
      navigate('/dashboard');
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Authentication failed. Please check credentials.'
      );
    }
  };

  const handleQuickDemoLogin = async (role: Role, accountEmail: string) => {
    setEmail(accountEmail);
    setPassword(DEMO_DEV_PASSWORD);
    setErrorMsg(null);
    try {
      await loginByRole(role);
      navigate('/dashboard');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to sign in with demo role.');
    }
  };

  return (
    <div className="min-h-screen bg-surface-container-lowest text-on-surface flex flex-col justify-between p-space-lg">
      {/* Top Bar */}
      <div className="flex items-center justify-between max-w-6xl w-full mx-auto py-2">
        <div className="flex items-center gap-3">
          <SafeImage
            src={STITCH_ASSETS.emblem}
            alt="Smart Tourist Safety Emblem"
            className="w-9 h-9 object-contain"
          />
          <div>
            <span className="font-headline-md text-headline-md tracking-wider text-on-surface uppercase block">
              SMART TOURIST SAFETY
            </span>
            <span className="font-label-sm text-label-sm text-primary tracking-widest uppercase block">
              POLICE &amp; AUTHORIZED RESPONDER OPERATIONS — EOC CONSOLE
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-surface-container-high font-label-sm text-label-sm text-primary">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span>DEVELOPMENT DEMO AUTHENTICATION LAYER</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-space-xl my-auto py-8 items-center">
        {/* Left: Login Form */}
        <div className="lg:col-span-6 bg-surface-container-low p-space-xl rounded-xl shadow-2xl border border-outline-variant/30 space-y-space-md">
          <div>
            <span className="px-2 py-0.5 rounded bg-primary-container/20 text-primary font-label-sm text-label-sm font-bold uppercase tracking-wider">
              EOC OPERATOR SIGN-IN
            </span>
            <h1 className="font-headline-xl text-headline-xl text-on-surface font-bold mt-2">
              Authorized Responder Console
            </h1>
            <p className="font-body-sm text-body-sm text-outline mt-1">
              Sign in with your assigned EOC credentials or select a pre-configured Demo Role on the
              right.
            </p>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-lg bg-secondary-container/25 border border-secondary/40 text-secondary font-body-sm text-body-sm flex items-start gap-2">
              <span className="material-symbols-outlined text-[18px] shrink-0">error</span>
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4" noValidate>
            <div className="space-y-1">
              <label
                htmlFor="login-email"
                className="font-label-sm text-label-sm text-outline uppercase font-semibold block"
              >
                Operator Email / Username *
              </label>
              <input
                id="login-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-10 px-3 rounded-lg bg-surface-container-high text-on-surface font-body-md text-body-md focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="controlroom@smarttourist.demo"
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="login-password"
                  className="font-label-sm text-label-sm text-outline uppercase font-semibold"
                >
                  Development Demo Password *
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setForgotModalOpen(true);
                    setForgotSubmitted(false);
                  }}
                  className="font-label-sm text-label-sm text-primary hover:underline"
                >
                  Forgot Password?
                </button>
              </div>
              <input
                id="login-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-10 px-3 rounded-lg bg-surface-container-high text-on-surface font-mono text-body-md focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="Enter demo password"
              />
              <span className="font-label-sm text-[10px] text-outline block font-mono">
                Development-Only Password: <strong className="text-primary">{DEMO_DEV_PASSWORD}</strong> (Pre-filled)
              </span>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-10 rounded-lg bg-primary-container hover:opacity-90 disabled:opacity-50 text-on-primary-container font-headline-md text-headline-md font-bold flex items-center justify-center gap-2 shadow-lg transition-opacity"
            >
              <span className="material-symbols-outlined text-[18px]">
                {isLoading ? 'hourglass_top' : 'login'}
              </span>
              <span>{isLoading ? 'Authenticating Operator...' : 'Login to Command Center'}</span>
            </button>
          </form>

          <div className="p-3 rounded-lg bg-surface-container-lowest text-outline font-body-sm text-[11px] space-y-1">
            <div className="flex items-center gap-1.5 text-tertiary font-label-sm text-label-sm font-bold uppercase">
              <span className="material-symbols-outlined text-[14px]">info</span>
              <span>Development Demo Authentication Notice</span>
            </div>
            <p>
              This authentication layer is a temporary frontend demo abstraction (`authService` +
              `AuthContext`) for project presentation. Role permissions are enforced in the UI for
              UX demonstration and will connect to the MERN backend JWT/session endpoints in
              production.
            </p>
          </div>
        </div>

        {/* Right: 5 Demo Accounts for Instant Role Inspection */}
        <div className="lg:col-span-6 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider font-bold">
              SELECT DEMO ACCOUNT BY ROLE (1-CLICK LOGIN)
            </span>
            <span className="font-label-sm text-[10px] text-primary font-mono">5 ROLES CONFIGURED</span>
          </div>

          <div className="space-y-2.5">
            {demoAccounts.map((acc) => {
              const roleMeta = ROLE_LABELS[acc.role];
              const isSelected = email.toLowerCase() === acc.email.toLowerCase();
              return (
                <div
                  key={acc.id}
                  onClick={() => {
                    setEmail(acc.email);
                    setPassword(DEMO_DEV_PASSWORD);
                  }}
                  className={`p-space-md rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    isSelected
                      ? 'bg-surface-container-high border-primary shadow-md'
                      : 'bg-surface-container-low border-outline-variant/20 hover:bg-surface-container'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <SafeImage
                      src={acc.avatarUrl}
                      alt={acc.name}
                      className="w-10 h-10 rounded-full object-cover shrink-0 ring-1 ring-primary/40"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-headline-md text-body-md font-bold text-on-surface">
                          {acc.name}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-primary-container/20 text-primary font-label-sm text-[10px] font-mono font-bold">
                          {acc.role}
                        </span>
                      </div>
                      <span className="font-mono text-label-sm text-outline block">
                        {acc.email}
                      </span>
                      <span className="font-body-sm text-[11px] text-on-surface-variant block mt-0.5">
                        {roleMeta.description}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      void handleQuickDemoLogin(acc.role, acc.email);
                    }}
                    className="px-3 py-1.5 rounded bg-primary-container text-on-primary-container font-label-sm text-label-sm font-bold shrink-0 hover:opacity-90"
                  >
                    Sign In
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="max-w-6xl w-full mx-auto text-center font-label-sm text-label-sm text-outline py-2">
        SMART TOURIST SAFETY — Final-Year Major Project • AI Anomaly Detection, Geo-Fencing &amp;
        Digital Tourist Identity
      </div>

      {/* Forgot Password Modal */}
      {forgotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface-container-lowest/80 backdrop-blur-sm p-4">
          <div className="bg-surface-container-low p-space-lg rounded-xl max-w-md w-full border border-outline-variant/40 space-y-3 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="font-headline-lg text-headline-lg font-bold text-on-surface">
                Reset Operator Credentials
              </h3>
              <button
                type="button"
                onClick={() => setForgotModalOpen(false)}
                className="text-outline hover:text-on-surface"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
            {forgotSubmitted ? (
              <div className="p-3 rounded bg-primary/15 text-primary font-body-sm text-body-sm">
                In Demo Mode, all accounts use the development password{' '}
                <code className="font-mono font-bold">{DEMO_DEV_PASSWORD}</code>. It has been
                automatically filled into the login form for you.
              </div>
            ) : (
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Enter your assigned EOC email address to request a supervisor credential reset token,
                or restore the default demo password.
              </p>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setForgotModalOpen(false)}
                className="px-3 py-1.5 rounded bg-surface-container-high text-on-surface font-label-sm text-label-sm"
              >
                Close
              </button>
              {!forgotSubmitted && (
                <button
                  type="button"
                  onClick={() => {
                    setPassword(DEMO_DEV_PASSWORD);
                    setForgotSubmitted(true);
                  }}
                  className="px-3 py-1.5 rounded bg-primary-container text-on-primary-container font-label-sm text-label-sm font-bold"
                >
                  Auto-Fill Demo Password
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
