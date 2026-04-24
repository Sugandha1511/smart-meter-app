import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import type { AxiosError } from 'axios';
import ChatHeader from '../components/chat/ChatHeader';
import ChatMessageList from '../components/chat/ChatMessageList';
import StepInput from '../components/chat/StepInput';
import {
  getWorkflow,
  editWorkOrderStep,
  submitStepAnswer,
  submitWorkOrder
} from '../services/workOrder.service';
import { maybeCompressImage, uploadMedia } from '../services/upload.service';
import { getConsumerByIVRS } from '../services/masterdata.service';
import { useWorkOrderStore } from '../store/workOrder.store';
import { WorkOrderStep } from '../types/work-order';

interface Message {
  id: string;
  sender: 'bot' | 'user';
  text: string;
}

type Source = 'form' | 'master' | 'default' | 'photo' | 'seal' | 'computed' | 'submission';

interface PreviewField {
  label: string;
  value: string;
  source: Source;
  status?: 'pending' | 'missing' | 'error';
  editableStepId?: string;
  fieldKey: string;
}

interface PreviewSection {
  title: string;
  fields: PreviewField[];
}

const SOURCE_LABEL: Record<Source, string> = {
  form: 'Form',
  master: 'Master',
  default: 'Default',
  photo: 'Photo/Video',
  seal: 'Seal Photo',
  computed: 'Computed',
  submission: 'Submission'
};

function getApiErrorMessage(error: unknown): string {
  const err = error as AxiosError<any> | undefined;
  const detail = err?.response?.data?.detail;
  if (typeof detail === 'string' && detail.trim()) return detail;
  if (detail && typeof detail === 'object') return JSON.stringify(detail);
  const msg = (err as any)?.message;
  if (typeof msg === 'string' && msg.trim()) return msg;
  return 'Something went wrong. Please try again.';
}

function formatUserMessage(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && 'file_name' in (value as Record<string, unknown>)) {
    return `Uploaded ${(value as { file_name?: string }).file_name ?? 'file'}`;
  }
  return 'Provided';
}

function getStepIndex(step: WorkOrderStep | undefined, steps: WorkOrderStep[] | undefined): number {
  if (!step || !steps) return 0;
  const idx = steps.findIndex((item) => item.id === step.id);
  return idx >= 0 ? idx + 1 : 0;
}

/**
 * Case-insensitive flexible lookup into a master row.
 * Tries each candidate header name; returns first non-null match.
 */
function pickMaster(
  row: Record<string, unknown> | undefined,
  candidates: string[]
): string | number | null {
  if (!row) return null;
  const lowerKeys = new Map<string, string>();
  Object.keys(row).forEach((k) => lowerKeys.set(k.toLowerCase().trim(), k));
  for (const cand of candidates) {
    const hit = lowerKeys.get(cand.toLowerCase().trim());
    if (hit) {
      const v = row[hit];
      if (v === null || v === undefined || String(v).trim() === '') continue;
      if (typeof v === 'number' || typeof v === 'boolean' || typeof v === 'string') return v as any;
    }
  }
  return null;
}

function toDisplay(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
}

export default function WorkOrderPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { answers, setAnswer, setAnswers, reset } = useWorkOrderStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [extractionResult, setExtractionResult] = useState<{
    oldMeter: any | null;
    newMeter: any | null;
    seals: Record<string, any>;
  } | null>(null);
  const [extractionLoading, setExtractionLoading] = useState(false);
  const [extractionError, setExtractionError] = useState<string | null>(null);
  const lastExtractionSignatureRef = useRef<string | null>(null);

  const [geo, setGeo] = useState<{ lat: number; lng: number } | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [installedAt] = useState<string>(() => new Date().toISOString());

  const [uploading, setUploading] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);

  const workflowQuery = useQuery({
    queryKey: ['workflow', id],
    queryFn: () => getWorkflow(id)
  });

  const answerMutation = useMutation({ mutationFn: submitStepAnswer });
  const submitMutation = useMutation({ mutationFn: submitWorkOrder });
  const editMutation = useMutation({ mutationFn: editWorkOrderStep });

  const currentStep = useMemo(() => workflowQuery.data?.currentStep, [workflowQuery.data]);
  const steps = workflowQuery.data?.steps as WorkOrderStep[] | undefined;
  const stepIndex = getStepIndex(currentStep, steps);
  const totalSteps = steps?.length ?? 0;

  useEffect(() => {
    if (workflowQuery.data?.answers) {
      setAnswers(workflowQuery.data.answers);
    }
  }, [workflowQuery.data, setAnswers]);

  useEffect(() => {
    if (currentStep && messages.length === 0) {
      setMessages([{ id: crypto.randomUUID(), sender: 'bot', text: currentStep.labelEn }]);
    }
  }, [currentStep, messages.length]);

  const handleAnswer = async (value: unknown, inputMode = 'text') => {
    if (!currentStep) return;

    const isFile = value instanceof File;
    const capturedStep = currentStep;
    let statusMsgId: string | null = null;

    try {
      let finalValue = value;
      if (isFile) {
        let file = value as File;
        const originalSize = file.size;
        statusMsgId = crypto.randomUUID();
        setUploading(true);
        setUploadPct(0);

        const fmt = (n: number) => (n / 1024 / 1024).toFixed(1);
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            sender: 'user',
            text: `Selected ${file.name} (${fmt(originalSize)} MB)`
          },
          { id: statusMsgId!, sender: 'bot', text: 'Preparing file...' }
        ]);

        // Compress big photos before upload (videos pass through untouched).
        if (file.type.startsWith('image/')) {
          const compressed = await maybeCompressImage(file);
          if (compressed !== file) {
            file = compressed;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === statusMsgId
                  ? {
                      ...m,
                      text: `Compressed ${fmt(originalSize)} MB → ${fmt(file.size)} MB. Uploading...`
                    }
                  : m
              )
            );
          }
        }

        finalValue = await uploadMedia(file, (pct) => {
          const percent = Math.round(pct * 100);
          setUploadPct(percent);
          setMessages((prev) =>
            prev.map((m) =>
              m.id === statusMsgId ? { ...m, text: `Uploading... ${percent}%` } : m
            )
          );
        });

        setMessages((prev) =>
          prev.map((m) =>
            m.id === statusMsgId ? { ...m, text: 'Upload complete. Saving...' } : m
          )
        );
      }

      const response = await answerMutation.mutateAsync({
        workOrderId: id,
        stepId: capturedStep.id,
        value: finalValue,
        inputMode
      });

      setAnswer(capturedStep.fieldKey, finalValue);

      // Update the workflow query cache locally instead of refetching. The
      // answer endpoint already tells us which step to show next, and we
      // already have the full `steps` list in memory. This removes a full
      // network round-trip per step, which was ~500–1000 ms on Render.
      queryClient.setQueryData(['workflow', id], (old: any) => {
        if (!old) return old;
        const stepsList = (old.steps ?? []) as WorkOrderStep[];
        const nextId: string = response.next_step_id ?? capturedStep.id;
        const nextStep =
          stepsList.find((s) => s.id === nextId) ??
          (nextId === 'preview_submit'
            ? { id: 'preview_submit', labelEn: 'Please review and submit.' }
            : old.currentStep);
        return {
          ...old,
          currentStep: nextStep,
          answers: {
            ...(old.answers ?? {}),
            [capturedStep.fieldKey]: finalValue
          }
        };
      });

      setMessages((prev) => {
        const base = statusMsgId ? prev.filter((m) => m.id !== statusMsgId) : prev;
        return [
          ...base,
          ...(isFile
            ? []
            : [{ id: crypto.randomUUID(), sender: 'user' as const, text: formatUserMessage(finalValue) }]),
          { id: crypto.randomUUID(), sender: 'bot' as const, text: response.bot_message }
        ];
      });
    } catch (e) {
      const msg = getApiErrorMessage(e);
      setMessages((prev) => {
        const base = statusMsgId ? prev.filter((m) => m.id !== statusMsgId) : prev;
        return [
          ...base,
          {
            id: crypto.randomUUID(),
            sender: 'bot' as const,
            text: isFile ? `Upload failed: ${msg}` : msg
          }
        ];
      });
      // Only refetch on error — in case the server rejected the value and we
      // need to re-read authoritative state (e.g. 422 on IVRS validation).
      await workflowQuery.refetch();
    } finally {
      setUploading(false);
      setUploadPct(0);
    }
  };

  const handleSubmit = async () => {
    await submitMutation.mutateAsync(id);
    reset();
    navigate('/success');
  };

  const showPreview = currentStep?.id === 'preview_submit';
  const ivrs = String(answers['consumer_ivrs'] ?? '').trim();

  const consumerQuery = useQuery({
    queryKey: ['consumerMaster', ivrs],
    queryFn: () => getConsumerByIVRS(ivrs),
    enabled: showPreview && ivrs.length > 0,
    staleTime: 60_000
  });

  // Hardcoded extracted values — real OCR/VLM integration can plug in later.
  useEffect(() => {
    if (!showPreview) {
      lastExtractionSignatureRef.current = null;
      setExtractionResult(null);
      setExtractionLoading(false);
      setExtractionError(null);
      return;
    }

    const meterFields = {
      meter_serial_number: 'SM-2024-07-00123',
      current_rating: '10-60A',
      meter_type: 'Whole Current (WC)',
      meter_class: '1.0',
      kwh_reading: 4532.7,
      kw_reading: 2.14,
      avg_pf_reading: 0.97,
      manufacturing_year: '2022',
      make: 'GenusPower',
      phase: 'Single Phase',
      communication_module: 'NIC (RF Mesh)'
    };

    setExtractionResult({
      oldMeter: { value: '004532', confidence: 0.91, fields: meterFields },
      newMeter: {
        value: '000012',
        confidence: 0.94,
        fields: { ...meterFields, kwh_reading: 12.3, kw_reading: 0.2 }
      },
      seals: {
        meter_body_seal_photo: { values: ['SL10293', 'SL10294'], confidence: 0.9 },
        nic_seal_photo: { values: ['NIC-77821'], confidence: 0.92 },
        terminal_seal_photo: { values: ['TS-55231', 'TS-55232'], confidence: 0.89 },
        box_seal_photo: { values: ['BX-41008'], confidence: 0.88 }
      }
    });
    setExtractionLoading(false);
    setExtractionError(null);
  }, [showPreview]);

  // Try to capture device geolocation once on preview.
  useEffect(() => {
    if (!showPreview) return;
    if (geo) return;
    if (!('geolocation' in navigator)) {
      setGeoError('Geolocation not supported on this device.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setGeo({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => setGeoError(err.message || 'Location permission denied.'),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30_000 }
    );
  }, [showPreview, geo]);

  const previewSections = useMemo<PreviewSection[]>(() => {
    const master = (consumerQuery.data?.row ?? {}) as Record<string, unknown>;

    const sealExtracted = (key: string): string => {
      const seal = extractionResult?.seals?.[key];
      if (!seal) return '';
      if (Array.isArray(seal.values) && seal.values.length) return seal.values[0];
      if (seal.value) return String(seal.value);
      return '';
    };

    const oldFields = extractionResult?.oldMeter?.fields ?? {};
    const newFields = extractionResult?.newMeter?.fields ?? {};
    const oldKwh = oldFields.kwh_reading;
    const prevKwh = pickMaster(master, ['Previous Month Reading kWh', 'Prev Month kWh', 'Previous Reading kWh']);
    const consumption =
      typeof oldKwh === 'number' && typeof prevKwh === 'number' ? oldKwh - prevKwh : null;

    // Helper to create a master-data field row.
    const masterField = (
      label: string,
      headerCandidates: string[],
      fieldKey: string
    ): PreviewField => {
      const val = pickMaster(master, headerCandidates);
      return {
        label,
        fieldKey,
        source: 'master',
        value: val === null ? '' : toDisplay(val),
        status: val === null ? 'missing' : undefined
      };
    };

    const formField = (
      label: string,
      fieldKey: string,
      rawValue: unknown,
      stepId?: string
    ): PreviewField => {
      const s = rawValue === undefined || rawValue === null ? '' : toDisplay(rawValue as any);
      return {
        label,
        fieldKey,
        source: 'form',
        value: s,
        status: s ? undefined : 'missing',
        editableStepId: stepId
      };
    };

    const defaultField = (label: string, fieldKey: string, value: string): PreviewField => ({
      label,
      fieldKey,
      value,
      source: 'default'
    });

    const photoField = (
      label: string,
      fieldKey: string,
      raw: unknown,
      side: 'old' | 'new'
    ): PreviewField => {
      const fields = side === 'old' ? oldFields : newFields;
      const v = fields?.[fieldKey as keyof typeof fields];
      if (v !== undefined && v !== null && String(v).trim() !== '') {
        return { label, fieldKey, value: toDisplay(v as any), source: 'photo' };
      }
      if (extractionLoading) {
        return { label, fieldKey, value: 'Extracting...', source: 'photo', status: 'pending' };
      }
      if (raw) {
        return { label, fieldKey, value: 'Not detected', source: 'photo', status: 'missing' };
      }
      return { label, fieldKey, value: '', source: 'photo', status: 'missing' };
    };

    const sealField = (
      label: string,
      fieldKey: string,
      sealKey: string,
      answerKey: string
    ): PreviewField => {
      const raw = answers[answerKey];
      const v = sealExtracted(sealKey);
      if (v) return { label, fieldKey, value: v, source: 'seal' };
      if (extractionLoading) return { label, fieldKey, value: 'Extracting...', source: 'seal', status: 'pending' };
      if (raw) return { label, fieldKey, value: 'Not detected', source: 'seal', status: 'missing' };
      return { label, fieldKey, value: '', source: 'seal', status: 'missing' };
    };

    const consumerInfo: PreviewField[] = [
      formField('DC', 'dc', answers['dc'], 'dc'),
      masterField('DC Code', ['Revised DC Code', 'DC Code'], 'dc_code'),
      formField('Consumer IVRS', 'consumer_ivrs', answers['consumer_ivrs'], 'consumer_ivrs'),
      masterField('Consumer UID', ['id', 'Consumer UID', 'UID'], 'consumer_uid'),
      masterField('Consumer Name', ['Consumer Name', 'Name'], 'consumer_name'),
      masterField('Consumer Mobile No.', ['Consumer Mobile No.', 'Mobile No', 'Mobile Number', 'Mobile'], 'consumer_mobile'),
      masterField('Sanctioned Load', ['Sanctioned Load', 'Sanction Load in kW'], 'sanctioned_load'),
      masterField('Consumer Type', ['Consumer Type', 'Connection Type', 'Premise Type'], 'consumer_type'),
      masterField('Circle', ['Circle'], 'circle'),
      masterField('Division', ['Division'], 'division'),
      masterField('Substation', ['Substation', 'Sub Station'], 'substation'),
      masterField('Substation Code', ['Substation Code', 'Sub Station Code'], 'substation_code'),
      masterField('Feeder', ['Feeder Name', 'Feeder'], 'feeder'),
      masterField('Feeder Code', ['Feeder Code'], 'feeder_code'),
      masterField('Unique DT Code', ['Unique DT Code', 'DT Code', 'DTR Code'], 'dt_code'),
      masterField('DT Name', ['DTR Name', 'DT Name'], 'dt_name'),
      masterField('Tariff Category', ['Tariff Categary', 'Tariff Category', 'Tariff Code'], 'tariff_category'),
      masterField('Consumer Address', ['Address', 'Consumer Address'], 'consumer_address')
    ];

    const status: PreviewField[] = [
      defaultField('CI Exception Status', 'ci_exception', 'No Exception'),
      defaultField('Consumer MI Possible', 'mi_possible', 'Yes'),
      defaultField('Is Old Meter Available', 'old_meter_available', 'Yes'),
      defaultField('Old Meter Height', 'old_meter_height', '3m - 6m')
    ];

    const oldMeter: PreviewField[] = [
      formField(
        'Old Meter Condition',
        'old_meter_condition',
        answers['old_meter_condition'],
        'old_meter_condition'
      ),
      photoField('Old Meter Serial Number', 'meter_serial_number', answers['old_meter_video'], 'old'),
      photoField('Current Rating (Old Meter)', 'current_rating', answers['old_meter_video'], 'old'),
      photoField('Old Meter Type', 'meter_type', answers['old_meter_video'], 'old'),
      masterField('Old Meter Class', ['Old Meter Class', 'Meter Class'], 'old_meter_class'),
      photoField('Old Meter kWh Reading', 'kwh_reading', answers['old_meter_video'], 'old'),
      masterField('Previous Month Reading kWh', ['Previous Month Reading kWh', 'Prev Month kWh'], 'prev_month_kwh'),
      {
        label: 'Consumption (kWh)',
        fieldKey: 'consumption_kwh',
        source: 'computed',
        value: consumption !== null ? String(consumption) : '',
        status: consumption === null ? 'missing' : undefined
      },
      photoField('Old Meter kW Reading', 'kw_reading', answers['old_meter_video'], 'old'),
      photoField('Old Meter Avg PF Reading', 'avg_pf_reading', answers['old_meter_video'], 'old'),
      photoField('Old Meter Manufacturing Year', 'manufacturing_year', answers['old_meter_video'], 'old')
    ];

    const newMeter: PreviewField[] = [
      defaultField('Service Line Visible', 'service_line_visible', 'Yes'),
      defaultField('New Meter Location', 'new_meter_location', 'Outside'),
      photoField('New Meter Make', 'make', answers['new_meter_video'], 'new'),
      photoField('New Meter Serial Number', 'meter_serial_number', answers['new_meter_video'], 'new'),
      photoField('New Meter Phase', 'phase', answers['new_meter_video'], 'new'),
      photoField('New Meter kWh Reading', 'kwh_reading', answers['new_meter_video'], 'new'),
      photoField('New Meter kW Reading', 'kw_reading', answers['new_meter_video'], 'new'),
      photoField('Communication Module', 'communication_module', answers['new_meter_video'], 'new'),
      formField('Service Cable Type', 'service_cable_type', answers['service_cable_type'], 'service_cable_type')
    ];

    const seals: PreviewField[] = [
      // Body seal 1 & 2 derived from the same meter body seal photo if multiple values detected.
      (() => {
        const seal = extractionResult?.seals?.['meter_body_seal_photo'];
        const vs: string[] = Array.isArray(seal?.values) ? seal.values : seal?.value ? [String(seal.value)] : [];
        const v = vs[0] ?? '';
        return {
          label: 'New Meter Body Seal 1',
          fieldKey: 'body_seal_1',
          source: 'seal',
          value: v,
          status: v ? undefined : extractionLoading ? 'pending' : 'missing'
        };
      })(),
      (() => {
        const seal = extractionResult?.seals?.['meter_body_seal_photo'];
        const vs: string[] = Array.isArray(seal?.values) ? seal.values : [];
        const v = vs[1] ?? '';
        return {
          label: 'New Meter Body Seal 2',
          fieldKey: 'body_seal_2',
          source: 'seal',
          value: v,
          status: v ? undefined : extractionLoading ? 'pending' : 'missing'
        };
      })(),
      sealField('NIC Seal', 'nic_seal', 'nic_seal_photo', 'nic_seal_photo'),
      (() => {
        const seal = extractionResult?.seals?.['terminal_seal_photo'];
        const vs: string[] = Array.isArray(seal?.values) ? seal.values : seal?.value ? [String(seal.value)] : [];
        return {
          label: 'Terminal Seal 1',
          fieldKey: 'terminal_seal_1',
          source: 'seal',
          value: vs[0] ?? '',
          status: vs[0] ? undefined : extractionLoading ? 'pending' : 'missing'
        };
      })(),
      (() => {
        const seal = extractionResult?.seals?.['terminal_seal_photo'];
        const vs: string[] = Array.isArray(seal?.values) ? seal.values : [];
        return {
          label: 'Terminal Seal 2',
          fieldKey: 'terminal_seal_2',
          source: 'seal',
          value: vs[1] ?? '',
          status: vs[1] ? undefined : extractionLoading ? 'pending' : 'missing'
        };
      })(),
      sealField('Meter Box Seal', 'box_seal', 'box_seal_photo', 'box_seal_photo')
    ];

    const audit: PreviewField[] = [
      {
        label: 'Longitude',
        fieldKey: 'longitude',
        source: 'form',
        value: geo ? geo.lng.toFixed(6) : '',
        status: geo ? undefined : geoError ? 'error' : 'pending'
      },
      {
        label: 'Latitude',
        fieldKey: 'latitude',
        source: 'form',
        value: geo ? geo.lat.toFixed(6) : '',
        status: geo ? undefined : geoError ? 'error' : 'pending'
      },
      {
        label: 'Installation Date & Time',
        fieldKey: 'installed_at',
        source: 'submission',
        value: new Date(installedAt).toLocaleString()
      },
      { label: 'Vendor', fieldKey: 'vendor', source: 'submission', value: 'Yukti' }
    ];

    return [
      { title: 'Consumer & Connection', fields: consumerInfo },
      { title: 'Installation Status', fields: status },
      { title: 'Old Meter', fields: oldMeter },
      { title: 'New Meter', fields: newMeter },
      { title: 'Seals', fields: seals },
      { title: 'Location & Audit', fields: audit }
    ];
  }, [
    answers,
    consumerQuery.data,
    extractionResult,
    extractionLoading,
    geo,
    geoError,
    installedAt
  ]);

  const handleEditField = async (stepId: string) => {
    const res = await editMutation.mutateAsync({ workOrderId: id, stepId });
    if (res?.answers) setAnswers(res.answers);
    const label = res?.currentStep?.labelEn ?? 'Please provide the value.';
    setMessages([{ id: crypto.randomUUID(), sender: 'bot', text: label }]);
    lastExtractionSignatureRef.current = null;
    setExtractionResult(null);
    setExtractionLoading(false);
    setExtractionError(null);
    await workflowQuery.refetch();
  };

  return (
    <div className="chat-layout">
      <ChatHeader subtitle="Meter Installation" />
      <main className="chat-main">
        <div style={{ marginBottom: 12 }}>
          <span className="progress-chip">
            Step {stepIndex || totalSteps} of {totalSteps || 1}
          </span>
        </div>
        <ChatMessageList messages={messages} />

        {showPreview ? (
          <div className="card preview-card">
            <div className="preview-header">
              <div>
                <h3>Preview</h3>
                <div className="preview-sub">
                  Review every field that will be saved. Use Edit to correct a form entry.
                </div>
              </div>
              <span className="progress-chip">IVRS {ivrs || '—'}</span>
            </div>

            {consumerQuery.isLoading ? (
              <div className="preview-alert info">Loading consumer master data...</div>
            ) : null}
            {consumerQuery.isError ? (
              <div className="preview-alert warn">
                Could not load consumer master data. Master fields will be empty.
              </div>
            ) : null}
            {geoError ? (
              <div className="preview-alert warn">
                Location unavailable: {geoError}
              </div>
            ) : null}

            {previewSections.map((section) => (
              <section className="preview-section" key={section.title}>
                <h4 className="preview-section-title">{section.title}</h4>
                <div className="preview-grid">
                  {section.fields.map((field) => (
                    <div className="preview-field" key={`${section.title}-${field.fieldKey}`}>
                      <div>
                        <div className="preview-field-label">{field.label}</div>
                        <div
                          className={[
                            'preview-field-value',
                            field.status === 'missing' && !field.value ? 'missing' : '',
                            field.status === 'pending' ? 'pending' : '',
                            field.status === 'error' ? 'error' : ''
                          ]
                            .filter(Boolean)
                            .join(' ')}
                        >
                          {field.value || (field.status === 'missing' ? '—' : field.value)}
                        </div>
                        {field.editableStepId ? (
                          <button
                            type="button"
                            className="btn secondary"
                            style={{ marginTop: 8, padding: '6px 10px', fontSize: 12 }}
                            onClick={() => handleEditField(field.editableStepId as string)}
                          >
                            Edit
                          </button>
                        ) : null}
                      </div>
                      <span className={`source-tag ${field.source}`}>
                        {SOURCE_LABEL[field.source]}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            ))}

          </div>
        ) : null}
      </main>
      <footer className="input-bar">
        {uploading ? (
          <div className="upload-progress">
            <div className="upload-progress-label">Uploading... {uploadPct}%</div>
            <div className="upload-progress-track">
              <div className="upload-progress-fill" style={{ width: `${uploadPct}%` }} />
            </div>
          </div>
        ) : showPreview ? (
          <div className="row">
            <button type="button" className="btn success" onClick={handleSubmit} disabled={submitMutation.isPending}>
              {submitMutation.isPending ? 'Submitting...' : 'Submit'}
            </button>
          </div>
        ) : currentStep ? (
          <StepInput step={currentStep} onSubmit={handleAnswer} />
        ) : (
          <div className="message bot">Loading current step...</div>
        )}
      </footer>
    </div>
  );
}
