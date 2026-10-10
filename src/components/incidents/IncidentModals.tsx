import React, { useState } from 'react';
import { useOperational } from '../../app/providers/OperationalContext';
import { Incident, ResolutionType } from '../../types';
import { Modal } from '../ui/CommonUi';

export const AssignUnitModal: React.FC<{
  open: boolean;
  onClose: () => void;
  incident: Incident;
}> = ({ open, onClose, incident }) => {
  const { responseUnits, assignResponseUnit } = useOperational();
  const [selectedUnitId, setSelectedUnitId] = useState<string>(
    incident.assignedUnitId || 'UNIT-ALPHA-12'
  );
  const [instructions, setInstructions] = useState<string>(
    'Proceed to Mawryngkneng Gorge Trail Post 4 via NH-6 link road. High slope hazard (38°); carry splint kit and BLE beacon locator.'
  );

  const handleConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    assignResponseUnit(incident.id, selectedUnitId, instructions.trim());
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Assign Response Unit — ${incident.id}`}
      subtitle={`Target: ${incident.touristName} (${incident.dtid}) • ${incident.location.name}`}
      icon="local_police"
      maxWidthClass="max-w-2xl"
    >
      <form onSubmit={handleConfirm} className="space-y-space-md">
        <div className="space-y-2">
          <div className="flex items-center justify-between font-label-sm text-label-sm text-outline uppercase">
            <span>SELECT TACTICAL PATROL / INTERCEPT UNIT (SORTED BY PROXIMITY & ETA)</span>
            <span className="text-primary font-mono">{responseUnits.length} UNITS IN SECTOR</span>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {responseUnits.map((unit) => {
              const isSelected = selectedUnitId === unit.id;
              return (
                <label
                  key={unit.id}
                  onClick={() => setSelectedUnitId(unit.id)}
                  className={`p-3 rounded-lg flex items-center justify-between gap-3 cursor-pointer border transition-colors ${
                    isSelected
                      ? 'bg-surface-container-high border-primary'
                      : 'bg-surface-container border-transparent hover:bg-surface-container-high/60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="responseUnit"
                      checked={isSelected}
                      onChange={() => setSelectedUnitId(unit.id)}
                      className="h-4 w-4 accent-[#0ea5e9]"
                    />
                    <div className="w-8 h-8 rounded bg-primary-container/20 text-primary flex items-center justify-center font-mono font-bold text-label-sm">
                      {unit.code}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-headline-md text-body-md font-bold text-on-surface">
                          {unit.name}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-surface-container-highest text-primary font-label-sm text-[10px] font-mono uppercase">
                          {unit.status.replace('_', ' ')}
                        </span>
                        {unit.matchScorePercent && (
                          <span className="font-label-sm text-[10px] text-secondary font-mono font-bold">
                            {unit.matchScorePercent}% Match
                          </span>
                        )}
                      </div>
                      <span className="font-body-sm text-[11px] text-outline block">
                        {unit.vehicleType} • {unit.leadOfficer}
                      </span>
                      <span className="font-label-sm text-[10px] text-on-surface-variant font-mono">
                        Current Assignment: {unit.currentIncidentId || 'None (Available)'}
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0 font-mono">
                    <span className="font-headline-md text-body-md text-primary font-bold block">
                      ETA {unit.etaText}
                    </span>
                    <span className="font-label-sm text-[10px] text-outline">
                      {unit.distanceKm} km away
                    </span>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        <div className="space-y-1">
          <label
            htmlFor="dispatch-instructions"
            className="font-label-sm text-label-sm text-outline uppercase font-semibold block"
          >
            Live Dispatch Instructions to MDT Console
          </label>
          <textarea
            id="dispatch-instructions"
            rows={3}
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            className="w-full p-2.5 bg-surface-container rounded-lg font-body-sm text-body-sm text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="Enter tactical route, terrain caution, or medical kit requirements..."
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-outline-variant/30">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded bg-surface-container-high hover:bg-surface-variant text-on-surface font-label-md text-label-md"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 rounded bg-primary-container hover:opacity-90 text-on-primary-container font-label-md text-label-md font-bold flex items-center gap-1.5 shadow-md"
          >
            <span className="material-symbols-outlined text-[16px]">send</span>
            Confirm Unit Assignment
          </button>
        </div>
      </form>
    </Modal>
  );
};

export const VerifyIncidentModal: React.FC<{
  open: boolean;
  onClose: () => void;
  incident: Incident;
}> = ({ open, onClose, incident }) => {
  const { verifyIncident } = useOperational();
  const [notes, setNotes] = useState('');

  const handleAction = (action: 'VERIFY' | 'REQUEST_CONFIRMATION' | 'ESCALATE') => {
    verifyIncident(incident.id, action, notes.trim() || undefined);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Verify Incident Signals — ${incident.id}`}
      subtitle="Human-in-the-Loop Verification Protocol (SOP v3.8)"
      icon="psychology"
      maxWidthClass="max-w-xl"
    >
      <div className="space-y-space-md">
        <div className="p-3 rounded-lg bg-tertiary-container/20 border border-tertiary/30 flex items-start gap-2.5">
          <span className="material-symbols-outlined text-tertiary text-[20px] mt-0.5">
            warning
          </span>
          <div>
            <span className="font-headline-md text-body-md text-tertiary font-bold block">
              Anomaly detected — verification required.
            </span>
            <p className="font-body-sm text-[11px] text-on-surface-variant leading-relaxed mt-0.5">
              AI pattern recognition highlights correlated telemetry signals (Model Confidence:{' '}
              <strong className="font-mono text-on-surface">
                {incident.aiAssessment.confidencePercent}%
              </strong>
              ). Automated models never declare a tourist missing—human officer verification is
              mandatory.
            </p>
          </div>
        </div>

        <div className="space-y-1.5">
          <span className="font-label-sm text-label-sm text-outline uppercase">
            DETECTED TELEMETRY SIGNALS
          </span>
          <div className="space-y-1.5">
            {incident.aiAssessment.signals.map((sig, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2.5 rounded bg-surface-container"
              >
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-tertiary text-[16px]">
                    {sig.icon}
                  </span>
                  <span className="font-body-sm text-body-sm text-on-surface font-medium">
                    {sig.label}
                  </span>
                </div>
                <span className="font-label-sm text-label-sm font-mono text-primary font-bold">
                  {sig.weight}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-1">
          <label
            htmlFor="verify-notes"
            className="font-label-sm text-label-sm text-outline uppercase font-semibold block"
          >
            Officer Verification Observation Notes (Optional)
          </label>
          <textarea
            id="verify-notes"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Record cell tower ping result, guide contact status, or telemetry check..."
            className="w-full p-2.5 bg-surface-container rounded-lg font-body-sm text-body-sm text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-outline-variant/30">
          <button
            type="button"
            onClick={() => handleAction('REQUEST_CONFIRMATION')}
            className="px-3 py-2 rounded bg-surface-container-high hover:bg-surface-variant text-on-surface font-label-md text-label-md flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[15px]">sms</span>
            Request Tourist Confirmation
          </button>
          <button
            type="button"
            onClick={() => handleAction('ESCALATE')}
            className="px-3 py-2 rounded bg-secondary-container hover:opacity-90 text-on-secondary-container font-label-md text-label-md font-bold flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[15px]">e911_emergency</span>
            Escalate
          </button>
          <button
            type="button"
            onClick={() => handleAction('VERIFY')}
            className="px-4 py-2 rounded bg-primary-container hover:opacity-90 text-on-primary-container font-label-md text-label-md font-bold flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[15px]">verified</span>
            Verify Signals
          </button>
        </div>
      </div>
    </Modal>
  );
};

const RESOLUTION_TYPES: ResolutionType[] = [
  'Assisted Tourist',
  'Resolved',
  'Medical Assistance',
  'Reunited',
  'False / Unfounded',
  'Other',
];

export const ResolveIncidentModal: React.FC<{
  open: boolean;
  onClose: () => void;
  incident: Incident;
  onResolved?: () => void;
}> = ({ open, onClose, incident, onResolved }) => {
  const { resolveIncident } = useOperational();
  const [resolutionType, setResolutionType] = useState<ResolutionType>('Assisted Tourist');
  const [notes, setNotes] = useState<string>(
    'Tourist encountered slippery rocky ledge in Mawryngkneng Gorge, suffered mild ankle sprain. First aid administered on scene by Unit Alpha-12 and escorted safely to Mawryngkneng Outpost 1.'
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!notes.trim() || notes.trim().length < 10) {
      setErrorMsg('Resolution notes are required (minimum 10 characters) for statutory audit.');
      return;
    }
    setErrorMsg(null);
    resolveIncident(incident.id, resolutionType, notes.trim());
    onClose();
    if (onResolved) onResolved();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Resolve Incident ${incident.id}?`}
      subtitle={`Subject: ${incident.touristName} (${incident.dtid}) • ${incident.location.name}`}
      icon="check_circle"
      maxWidthClass="max-w-xl"
    >
      <form onSubmit={handleSubmit} className="space-y-space-md">
        <div className="space-y-1.5">
          <label
            htmlFor="resolution-type"
            className="font-label-sm text-label-sm text-outline uppercase font-semibold block"
          >
            Resolution Classification *
          </label>
          <select
            id="resolution-type"
            value={resolutionType}
            onChange={(e) => setResolutionType(e.target.value as ResolutionType)}
            className="w-full h-9 px-3 rounded bg-surface-container text-on-surface font-body-sm text-body-sm focus:outline-none focus:ring-1 focus:ring-primary"
          >
            {RESOLUTION_TYPES.map((rt) => (
              <option key={rt} value={rt} className="bg-surface-container-high text-on-surface">
                {rt}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="resolution-notes"
            className="font-label-sm text-label-sm text-outline uppercase font-semibold block"
          >
            Official Field Resolution Notes (Required) *
          </label>
          <textarea
            id="resolution-notes"
            rows={4}
            value={notes}
            onChange={(e) => {
              setNotes(e.target.value);
              if (errorMsg) setErrorMsg(null);
            }}
            placeholder="Describe field findings, medical assistance rendered, and safe escort status..."
            className="w-full p-2.5 bg-surface-container rounded-lg font-body-sm text-body-sm text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
          />
          {errorMsg && (
            <p className="font-label-sm text-label-sm text-secondary">{errorMsg}</p>
          )}
        </div>

        <div className="p-2.5 rounded bg-surface-container-lowest text-outline font-label-sm text-[11px]">
          Confirming resolution updates the incident to <strong>RESOLVED</strong>, releases assigned
          patrol units back to available roster, moves the record to Incident History, and logs the
          decision to the Audit Trail.
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-outline-variant/30">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded bg-surface-container-high hover:bg-surface-variant text-on-surface font-label-md text-label-md"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 rounded bg-primary-container hover:opacity-90 text-on-primary-container font-label-md text-label-md font-bold flex items-center gap-1.5 shadow-md"
          >
            <span className="material-symbols-outlined text-[16px]">task_alt</span>
            Confirm Resolution
          </button>
        </div>
      </form>
    </Modal>
  );
};
