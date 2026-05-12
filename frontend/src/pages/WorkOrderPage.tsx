import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import ChatHeader from '../components/chat/ChatHeader';
import ChatMessageList from '../components/chat/ChatMessageList';
import StepInput from '../components/chat/StepInput';
import {
  getWorkflow,
  submitStepAnswer,
  submitWorkOrder,
  resetWorkOrder
} from '../services/workOrder.service';
import { uploadMedia } from '../services/upload.service';
import { useWorkOrderStore } from '../store/workOrder.store';
import { WorkOrderStep } from '../types/work-order';

const FIELD_LABELS: Record<string, string> = {
  dc: 'DC',
  consumer_ivrs: 'Consumer IVRS',
  gps_location: 'GPS Location',
  old_meter_condition: 'Old Meter Condition',
  old_meter_video: 'Old Meter Video',
  old_meter_number: 'Old Meter Number',
  new_meter_video: 'New Meter Video',
  new_meter_number: 'New Meter Number',
  meter_body_seal_photo: 'Meter Body Seal',
  nic_seal_photo: 'NIC Seal',
  terminal_seal_photo: 'Terminal Seal',
  box_seal_photo: 'Box Seal',
  service_cable_type: 'Service Cable Type',
};

function formatPreviewValue(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object') {
    const v = value as Record<string, unknown>;
    if ('file_name' in v) return `📎 ${v.file_name}`;
    if ('lat' in v) {
      const err = v.error as string | undefined;
      const coords = `${Number(v.lat).toFixed(5)}, ${Number(v.lng).toFixed(5)}`;
      return err ? `${coords} (${err})` : coords;
    }
  }
  return JSON.stringify(value);
}

interface Message {
  id: string;
  sender: 'bot' | 'user';
  text: string;
}

function formatUserMessage(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object') {
    const v = value as Record<string, unknown>;
    if ('file_name' in v) return `Uploaded: ${v.file_name}`;
    if ('lat' in v) return `📍 GPS: ${Number(v.lat).toFixed(5)}, ${Number(v.lng).toFixed(5)}`;
  }
  return 'Provided';
}

function getStepIndex(step: WorkOrderStep | undefined, steps: WorkOrderStep[] | undefined): number {
  if (!step || !steps) return 0;
  const idx = steps.findIndex((item) => item.id === step.id);
  return idx >= 0 ? idx + 1 : 0;
}

export default function WorkOrderPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { answers, language, setAnswer, setAnswers, reset } = useWorkOrderStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const workflowQuery = useQuery({
    queryKey: ['workflow', id],
    queryFn: () => getWorkflow(id)
  });

  const answerMutation = useMutation({ mutationFn: submitStepAnswer });
  const submitMutation = useMutation({ mutationFn: submitWorkOrder });

  const currentStep = useMemo(() => workflowQuery.data?.currentStep, [workflowQuery.data]);
  const steps = workflowQuery.data?.steps as WorkOrderStep[] | undefined;
  const dataSteps = useMemo(() => steps?.filter((s) => s.id !== 'preview_submit') ?? [], [steps]);
  const totalSteps = dataSteps.length;
  const stepIndex = getStepIndex(currentStep, dataSteps);
  const showPreview = currentStep?.id === 'preview_submit';
  const progressPercent = totalSteps > 0
    ? showPreview ? 100 : Math.max(0, Math.round(((stepIndex - 1) / totalSteps) * 100))
    : 0;

  useEffect(() => {
    if (workflowQuery.data?.answers) {
      setAnswers(workflowQuery.data.answers);
    }
  }, [workflowQuery.data, setAnswers]);

  useEffect(() => {
    if (currentStep && messages.length === 0) {
      const text = language === 'hi' ? currentStep.labelHi : currentStep.labelEn;
      setMessages([{ id: crypto.randomUUID(), sender: 'bot', text }]);
    }
  }, [currentStep, messages.length, language]);

  const handleAnswer = async (value: unknown, inputMode = 'text') => {
    if (!currentStep) return;
    setErrorMsg('');

    try {
      let finalValue = value;
      if (value instanceof File) {
        finalValue = await uploadMedia(value);
      }

      const response = await answerMutation.mutateAsync({
        workOrderId: id,
        stepId: currentStep.id,
        value: finalValue,
        inputMode
      });

      setAnswer(currentStep.fieldKey, finalValue);

      const nextStep = steps?.find((s) => s.id === response.next_step_id);
      const botText = language === 'hi'
        ? (nextStep?.labelHi ?? response.bot_message)
        : response.bot_message;

      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), sender: 'user', text: formatUserMessage(finalValue) },
        { id: crypto.randomUUID(), sender: 'bot', text: botText }
      ]);

      await workflowQuery.refetch();
    } catch {
      setErrorMsg('Could not save your answer. Please try again.');
    }
  };

  const handleSubmit = async () => {
    setErrorMsg('');
    try {
      const result = await submitMutation.mutateAsync(id);
      reset();
      navigate('/success', {
        state: { submissionId: result.submission_id, submittedAt: result.submitted_at }
      });
    } catch {
      setErrorMsg('Submission failed. Please check all required fields and try again.');
    }
  };

  const handleEdit = async () => {
    setErrorMsg('');
    setIsEditing(true);
    try {
      await resetWorkOrder(id);
      reset();
      setMessages([]);
      await workflowQuery.refetch();
    } catch {
      setErrorMsg('Could not restart workflow. Please try again.');
    } finally {
      setIsEditing(false);
    }
  };

  const workOrderMeta = workflowQuery.data?.workOrderMeta as Record<string, string> | undefined;

  return (
    <div className="chat-layout">
      <ChatHeader subtitle={workOrderMeta?.meterType ? `Meter Installation · ${workOrderMeta.meterType}` : 'Meter Installation'} />

      <div style={{ padding: '6px 16px 0', background: '#fff', borderBottom: '1px solid #e2e8f0' }}>
        <div className="progress-bar-track">
          <div className="progress-bar-fill" style={{ width: `${progressPercent}%` }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 6 }}>
          <span className="meta" style={{ fontSize: 12 }}>
            {showPreview ? 'All steps completed' : `Step ${stepIndex || 1} of ${totalSteps || 1}`}
          </span>
          <span className="meta" style={{ fontSize: 12 }}>{progressPercent}%</span>
        </div>
      </div>

      <main className="chat-main">
        {workOrderMeta && (
          <div className="card" style={{ padding: '12px 16px', marginBottom: 12 }}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{workOrderMeta.consumerName}</div>
            <div className="meta">{workOrderMeta.address}</div>
          </div>
        )}

        <ChatMessageList messages={messages} />

        {errorMsg && <div className="error-banner">{errorMsg}</div>}

        {showPreview && (
          <div className="card" style={{ padding: 16, marginBottom: 12 }}>
            <h3 className="section-title" style={{ marginBottom: 12 }}>Review Before Submitting</h3>
            <div className="summary-grid">
              {Object.entries(answers).map(([key, value]) => (
                <div key={key} className="meta-row">
                  <span className="meta">{FIELD_LABELS[key] ?? key}</span>
                  <span style={{ fontWeight: 500, fontSize: 13, textAlign: 'right', maxWidth: '55%', wordBreak: 'break-all' }}>
                    {formatPreviewValue(value)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      <footer className="input-bar">
        {showPreview ? (
          <div className="row">
            <button
              type="button"
              className="btn secondary"
              onClick={handleEdit}
              disabled={isEditing}
              style={{ flex: 1 }}
            >
              {isEditing ? 'Resetting...' : 'Edit'}
            </button>
            <button
              type="button"
              className="btn success"
              onClick={handleSubmit}
              disabled={submitMutation.isPending}
              style={{ flex: 1 }}
            >
              {submitMutation.isPending ? <><span className="spinner" />Submitting...</> : 'Submit'}
            </button>
          </div>
        ) : currentStep ? (
          <StepInput step={currentStep} language={language} onSubmit={handleAnswer} />
        ) : (
          <div className="message bot">Loading current step...</div>
        )}
      </footer>
    </div>
  );
}
