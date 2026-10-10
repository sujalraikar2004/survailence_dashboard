import React, { useState } from 'react';
import { ToastItem } from '../../app/providers/OperationalContext';
import { IncidentSeverity, IncidentStatus, Permission } from '../../types';
import { INCIDENT_STATUS_LABELS } from '../../utils/incidentStateMachine';

interface SafeImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallbackText?: string;
  fallbackIcon?: string;
}

export const SafeImage: React.FC<SafeImageProps> = ({
  src,
  alt,
  className = '',
  fallbackText = 'EOC',
  fallbackIcon = 'shield_person',
  ...rest
}) => {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={`inline-flex flex-col items-center justify-center bg-surface-container-highest text-primary font-label-sm select-none overflow-hidden ${className}`}
        title={alt}
      >
        <span className="material-symbols-outlined text-[18px] text-primary">{fallbackIcon}</span>
        {fallbackText && (
          <span className="text-[9px] font-mono font-bold uppercase tracking-wider mt-0.5">
            {fallbackText.slice(0, 4)}
          </span>
        )}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt || 'Operational visual'}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
      {...rest}
    />
  );
};

export const SeverityBadge: React.FC<{ severity: IncidentSeverity; labelOverride?: string }> = ({
  severity,
  labelOverride,
}) => {
  if (severity === 'CRITICAL') {
    return (
      <span className="px-2 py-0.5 rounded bg-secondary-container text-on-secondary-container font-label-sm text-label-sm font-bold tracking-wider inline-flex items-center gap-1.5 uppercase whitespace-nowrap">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-secondary"></span>
        </span>
        {labelOverride || 'CRITICAL SOS'}
      </span>
    );
  }

  if (severity === 'HIGH' || severity === 'CONCERN') {
    return (
      <span className="px-2 py-0.5 rounded bg-tertiary-container/30 text-tertiary font-label-sm text-label-sm font-bold tracking-wider inline-flex items-center gap-1.5 uppercase whitespace-nowrap">
        <span className="h-1.5 w-1.5 rounded-full bg-tertiary"></span>
        {labelOverride || severity}
      </span>
    );
  }

  if (severity === 'VERIFICATION' || severity === 'WARNING') {
    return (
      <span className="px-2 py-0.5 rounded bg-surface-container-high text-tertiary-fixed-dim font-label-sm text-label-sm font-bold tracking-wider inline-flex items-center gap-1.5 uppercase whitespace-nowrap">
        <span className="h-1.5 w-1.5 rounded-full bg-tertiary-fixed-dim"></span>
        {labelOverride || severity}
      </span>
    );
  }

  return (
    <span className="px-2 py-0.5 rounded bg-primary/15 text-primary font-label-sm text-label-sm font-bold tracking-wider inline-flex items-center gap-1.5 uppercase whitespace-nowrap">
      <span className="h-1.5 w-1.5 rounded-full bg-primary"></span>
      {labelOverride || 'NORMAL'}
    </span>
  );
};

export const StatusBadge: React.FC<{ status: IncidentStatus }> = ({ status }) => {
  const label = INCIDENT_STATUS_LABELS[status] || status;
  if (status === 'ACTIVE' || status === 'NEW') {
    return (
      <span className="font-label-sm text-label-sm px-2 py-0.5 rounded bg-secondary-container/30 text-secondary uppercase font-semibold whitespace-nowrap">
        {label}
      </span>
    );
  }
  if (status === 'VERIFYING') {
    return (
      <span className="font-label-sm text-label-sm px-2 py-0.5 rounded bg-tertiary-container/30 text-tertiary uppercase font-semibold whitespace-nowrap">
        {label}
      </span>
    );
  }
  if (status === 'ASSIGNED' || status === 'EN_ROUTE' || status === 'ON_SCENE') {
    return (
      <span className="font-label-sm text-label-sm px-2 py-0.5 rounded bg-primary-container/25 text-primary uppercase font-bold whitespace-nowrap">
        {label}
      </span>
    );
  }
  if (status === 'RESOLVED') {
    return (
      <span className="font-label-sm text-label-sm px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 uppercase font-bold whitespace-nowrap">
        {label}
      </span>
    );
  }
  return (
    <span className="font-label-sm text-label-sm px-2 py-0.5 rounded bg-surface-container-high text-on-surface-variant uppercase font-semibold whitespace-nowrap">
      {label}
    </span>
  );
};

export const Modal: React.FC<{
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: string;
  maxWidthClass?: string;
  children: React.ReactNode;
}> = ({
  open,
  onClose,
  title,
  subtitle,
  icon = 'verified',
  maxWidthClass = 'max-w-xl',
  children,
}) => {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-surface-container-lowest/80 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`w-full ${maxWidthClass} bg-surface-container-low rounded-xl p-space-lg shadow-2xl border border-outline-variant/40 flex flex-col gap-space-md max-h-[90vh] overflow-y-auto`}
      >
        <div className="flex items-center justify-between pb-2 border-b border-outline-variant/30">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-primary text-[22px]">{icon}</span>
            <div className="flex flex-col">
              <h3 className="font-headline-lg text-headline-lg font-bold text-on-surface">
                {title}
              </h3>
              {subtitle && (
                <span className="font-label-sm text-label-sm text-outline font-mono">
                  {subtitle}
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded bg-surface-container-high hover:bg-surface-variant flex items-center justify-center text-outline hover:text-on-surface transition-colors"
            aria-label="Close modal"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

export const Drawer: React.FC<{
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: string;
  children: React.ReactNode;
}> = ({ open, onClose, title, subtitle, icon = 'description', children }) => {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-end bg-surface-container-lowest/80 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-2xl h-full bg-surface-container-low p-space-lg shadow-2xl border-l border-outline-variant/40 flex flex-col justify-between overflow-y-auto">
        <div className="flex flex-col gap-space-md">
          <div className="flex items-center justify-between pb-3 border-b border-outline-variant/30">
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-primary text-[22px]">{icon}</span>
              <div className="flex flex-col">
                <h3 className="font-headline-lg text-headline-lg font-bold text-on-surface">
                  {title}
                </h3>
                {subtitle && (
                  <span className="font-label-sm text-label-sm text-outline font-mono">
                    {subtitle}
                  </span>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded bg-surface-container-high hover:bg-surface-variant flex items-center justify-center text-outline hover:text-on-surface transition-colors"
              aria-label="Close drawer"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
};

export const EmptyState: React.FC<{
  icon?: string;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}> = ({ icon = 'inbox', title, description, actionLabel, onAction }) => (
  <div className="p-space-xl rounded-xl bg-surface-container-low border border-outline-variant/20 flex flex-col items-center justify-center text-center gap-2 my-2">
    <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center text-outline">
      <span className="material-symbols-outlined text-[20px]">{icon}</span>
    </div>
    <h4 className="font-headline-md text-headline-md text-on-surface font-semibold">{title}</h4>
    <p className="font-body-sm text-body-sm text-outline max-w-md">{description}</p>
    {actionLabel && onAction && (
      <button
        type="button"
        onClick={onAction}
        className="mt-2 px-3 py-1.5 rounded bg-primary-container text-on-primary-container font-label-md text-label-md font-bold hover:opacity-90 transition-opacity"
      >
        {actionLabel}
      </button>
    )}
  </div>
);

export const ErrorState: React.FC<{
  message: string;
  onRetry: () => void;
}> = ({ message, onRetry }) => (
  <div className="p-space-lg rounded-xl bg-secondary-container/15 border border-secondary/30 flex items-center justify-between gap-4 my-2">
    <div className="flex items-center gap-3">
      <span className="material-symbols-outlined text-secondary text-[22px]">error</span>
      <div>
        <h4 className="font-headline-md text-headline-md text-on-surface font-bold">
          Operational Feed Interrupted
        </h4>
        <p className="font-body-sm text-body-sm text-outline">{message}</p>
      </div>
    </div>
    <button
      type="button"
      onClick={onRetry}
      className="px-3.5 py-1.5 rounded bg-secondary-container text-on-secondary-container font-label-md text-label-md font-bold hover:opacity-90 transition-opacity shrink-0"
    >
      Retry
    </button>
  </div>
);

export const LoadingSkeleton: React.FC<{ rows?: number }> = ({ rows = 3 }) => (
  <div className="space-y-2.5 animate-pulse py-2">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="h-16 rounded-lg bg-surface-container-high/60 w-full" />
    ))}
  </div>
);

export const PermissionNotice: React.FC<{
  requiredPermission: Permission;
  contextLabel?: string;
}> = ({ requiredPermission, contextLabel }) => (
  <div className="p-space-md rounded-lg bg-surface-container-lowest border border-outline-variant/30 flex items-center justify-between gap-3">
    <div className="flex items-center gap-2.5">
      <span className="material-symbols-outlined text-tertiary text-[18px]">lock</span>
      <div>
        <span className="font-label-md text-label-md text-on-surface font-bold block">
          Additional authorization required.
        </span>
        <span className="font-body-sm text-[11px] text-outline">
          {contextLabel || 'Restricted Need-to-Know telemetry module'} requires permission{' '}
          <code className="font-mono text-primary">{requiredPermission}</code>. Switch demo role in
          the top bar to inspect with higher clearance.
        </span>
      </div>
    </div>
    <span className="px-2 py-0.5 rounded bg-tertiary-container/20 text-tertiary font-label-sm text-[10px] font-mono uppercase shrink-0">
      PRIVACY GUARD
    </span>
  </div>
);

export const ToastContainer: React.FC<{
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed bottom-5 right-5 z-[130] flex flex-col gap-2 max-w-md">
      {toasts.map((t) => {
        const bgClass =
          t.variant === 'CRITICAL'
            ? 'bg-secondary-container text-on-secondary-container border-secondary/40'
            : t.variant === 'WARNING'
            ? 'bg-tertiary-container text-on-tertiary border-tertiary/40'
            : 'bg-primary-container text-on-primary-container border-primary/40';
        const iconName =
          t.variant === 'CRITICAL'
            ? 'emergency'
            : t.variant === 'WARNING'
            ? 'warning'
            : 'check_circle';
        return (
          <div
            key={t.id}
            className={`px-space-md py-2.5 rounded-lg shadow-2xl border font-label-md text-label-md font-bold flex items-center justify-between gap-3 ${bgClass}`}
          >
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">{iconName}</span>
              <span>{t.message}</span>
            </div>
            <button
              type="button"
              onClick={() => onDismiss(t.id)}
              className="opacity-75 hover:opacity-100"
              aria-label="Dismiss notification"
            >
              <span className="material-symbols-outlined text-[15px]">close</span>
            </button>
          </div>
        );
      })}
    </div>
  );
};
