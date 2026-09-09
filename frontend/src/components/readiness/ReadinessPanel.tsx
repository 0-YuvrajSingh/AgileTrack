import React, { useMemo, useState } from 'react';
import { CheckCircle2, AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react';

import type { ReadinessReasonCode, ReleaseReadiness } from '../../types';
import { Card, CardBody } from '../ui/Card';

const REASON_LABEL: Record<ReadinessReasonCode, string> = {
  RELEASE_CANCELLED: 'Release cancelled',
  EMPTY_RELEASE: 'No work in scope',
  INCOMPLETE_WORK: 'Incomplete work',
  BLOCKED_WORK: 'Blocked work',
  APPROVAL_REQUIRED: 'Approval required',
};

interface ReadinessPanelProps {
  readiness: ReleaseReadiness | null;
}

/**
 * Renders the server's verdict. Deliberately holds no readiness logic of its own: re-deriving
 * status in the browser is exactly how a UI ends up disagreeing with the backend.
 */
export const ReadinessPanel: React.FC<ReadinessPanelProps> = ({ readiness }) => {
  const [expanded, setExpanded] = useState(true);

  // Grouped for display only; the server already returns them in a deterministic order.
  const grouped = useMemo(() => {
    const groups = new Map<ReadinessReasonCode, string[]>();
    readiness?.reasons.forEach(reason => {
      const existing = groups.get(reason.code) ?? [];
      existing.push(reason.detail);
      groups.set(reason.code, existing);
    });
    return Array.from(groups.entries());
  }, [readiness]);

  if (!readiness) return null;

  const ready = readiness.status === 'READY';

  return (
    <Card className={ready ? 'border-emerald-300' : 'border-amber-300'}>
      <CardBody className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {ready ? (
              <CheckCircle2 size={20} className="text-emerald-600" />
            ) : (
              <AlertTriangle size={20} className="text-amber-600" />
            )}
            <div>
              <p
                data-testid="readiness-status"
                className={`font-bold text-sm ${ready ? 'text-emerald-700' : 'text-amber-700'}`}
              >
                {ready ? 'READY' : 'NOT READY'}
              </p>
              <p className="text-[11px] text-cf-textMuted">
                {readiness.completedWorkItems} of {readiness.totalWorkItems} work items complete
              </p>
            </div>
          </div>

          {!ready && readiness.reasons.length > 0 && (
            <button
              type="button"
              onClick={() => setExpanded(v => !v)}
              aria-expanded={expanded}
              className="flex items-center gap-1 text-xs text-cf-textMuted hover:text-cf-textDark"
            >
              {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              {readiness.reasons.length} {readiness.reasons.length === 1 ? 'reason' : 'reasons'}
            </button>
          )}
        </div>

        {ready && (
          <p className="text-xs text-cf-textMuted">
            Every readiness gate passes for this release.
          </p>
        )}

        {!ready && expanded && (
          <ul className="space-y-3" data-testid="readiness-reasons">
            {grouped.map(([code, details]) => (
              <li key={code}>
                <p className="text-[10px] uppercase font-mono tracking-wider text-cf-textMuted mb-1">
                  {REASON_LABEL[code]}
                  <span className="ml-1.5 opacity-60">{code}</span>
                </p>
                <ul className="space-y-1">
                  {details.map(detail => (
                    <li
                      key={detail}
                      className="text-xs text-cf-textDark pl-3 border-l-2 border-amber-200"
                    >
                      {detail}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );
};

export default ReadinessPanel;
