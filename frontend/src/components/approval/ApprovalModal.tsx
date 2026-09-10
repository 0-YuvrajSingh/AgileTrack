import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { X, Shield, ShieldCheck, ShieldAlert, Check, Ban, Loader2 } from 'lucide-react';

import type { ApprovalDecision, RiskLevel, Task } from '../../types';
import { Card, CardBody, CardHeader } from '../ui/Card';
import { Button } from '../ui/Button';
import { useApproval } from '../../hooks/useApproval';
import { getApiErrorMessage } from '../../api/axios';

interface ApprovalModalProps {
  workspaceId: string;
  projectId: string;
  task: Task;
  canMutate: boolean;
  onClose: () => void;
  onChanged?: () => void;
}

const RISK_BADGE: Record<RiskLevel, string> = {
  LOW: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  MEDIUM: 'bg-blue-50 text-blue-700 border-blue-200',
  HIGH: 'bg-orange-50 text-orange-700 border-orange-200',
  CRITICAL: 'bg-red-50 text-red-700 border-red-200',
};

export const ApprovalModal: React.FC<ApprovalModalProps> = ({
  workspaceId,
  projectId,
  task,
  canMutate,
  onClose,
  onChanged,
}) => {
  const { approval, loading, error, submitDecision, refetch } = useApproval(
    workspaceId,
    projectId,
    task.id
  );
  const [submitting, setSubmitting] = useState(false);

  const handleDecision = async (decision: ApprovalDecision) => {
    setSubmitting(true);
    try {
      await submitDecision(decision);
      toast.success(`Change ${decision === 'APPROVED' ? 'approved' : 'rejected'}`);
      await refetch();
      onChanged?.();
    } catch (err: any) {
      toast.error(getApiErrorMessage(err, 'Failed to submit decision'));
    } finally {
      setSubmitting(false);
    }
  };

  const risk = approval?.riskLevel ?? task.riskLevel ?? 'LOW';
  const approvalRequired = approval?.approvalRequired ?? (risk === 'HIGH' || risk === 'CRITICAL');

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <Shield size={16} className="text-cf-primary shrink-0" />
            <h2 className="font-bold text-cf-textDark text-sm truncate">
              Change Governance — {task.title}
            </h2>
          </div>
          <button type="button" aria-label="Close" onClick={onClose}>
            <X size={16} className="text-cf-textMuted" />
          </button>
        </CardHeader>

        <CardBody className="space-y-4">
          {loading && !approval && (
            <div className="flex items-center gap-2 text-sm text-cf-textMuted">
              <Loader2 className="animate-spin" size={14} /> Loading governance status...
            </div>
          )}

          {error && (
            <div className="p-2.5 text-xs text-red-700 bg-red-50 border border-red-200 rounded">
              {error}
            </div>
          )}

          <div className="flex items-center justify-between p-3 bg-cf-bgLight/50 rounded-lg border border-cf-border">
            <div>
              <p className="text-xs font-semibold text-cf-textDark">Risk Level</p>
              <p className="text-[11px] text-cf-textMuted">
                {approvalRequired ? 'Approval required before shipping' : 'Approval not required'}
              </p>
            </div>
            <span
              data-testid="risk-badge"
              className={`text-xs font-mono uppercase px-2.5 py-0.5 rounded border font-semibold ${RISK_BADGE[risk]}`}
            >
              {risk}
            </span>
          </div>

          <div className="p-3 bg-white rounded-lg border border-cf-border space-y-2">
            <p className="text-xs font-semibold text-cf-textDark">Governance Status</p>
            {approval?.decision === 'APPROVED' ? (
              <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 p-2 rounded border border-emerald-200">
                <ShieldCheck size={16} className="text-emerald-600 shrink-0" />
                <div>
                  <p className="font-semibold">Approved</p>
                  {approval.approverEmail && (
                    <p className="text-[10px] text-emerald-600">By {approval.approverEmail}</p>
                  )}
                </div>
              </div>
            ) : approval?.decision === 'REJECTED' ? (
              <div className="flex items-center gap-2 text-xs text-red-700 bg-red-50 p-2 rounded border border-red-200">
                <ShieldAlert size={16} className="text-red-600 shrink-0" />
                <div>
                  <p className="font-semibold">Rejected</p>
                  {approval.approverEmail && (
                    <p className="text-[10px] text-red-600">By {approval.approverEmail}</p>
                  )}
                </div>
              </div>
            ) : approvalRequired ? (
              <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 p-2 rounded border border-amber-200">
                <ShieldAlert size={16} className="text-amber-600 shrink-0" />
                <p>Pending governance review and approval.</p>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs text-cf-textMuted bg-gray-50 p-2 rounded border border-gray-200">
                <ShieldCheck size={16} className="text-gray-500 shrink-0" />
                <p>No approval needed for {risk} risk changes.</p>
              </div>
            )}
          </div>

          {canMutate && (
            <div className="pt-2 border-t border-cf-border flex gap-2 justify-end">
              <Button
                variant="secondary"
                size="sm"
                className="text-red-700 hover:bg-red-50 hover:border-red-300"
                disabled={submitting}
                onClick={() => handleDecision('REJECTED')}
              >
                <Ban size={14} className="mr-1" /> Reject
              </Button>
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                disabled={submitting}
                onClick={() => handleDecision('APPROVED')}
              >
                <Check size={14} className="mr-1" /> Approve
              </Button>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
};

export default ApprovalModal;

