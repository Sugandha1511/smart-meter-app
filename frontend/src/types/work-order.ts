export type InputType =
  | 'quick_reply'
  | 'select'
  | 'text'
  | 'number'
  | 'voice_text'
  | 'photo'
  | 'video'
  | 'confirm';

export interface StepOption {
  labelEn: string;
  labelHi: string;
  value: string;
}

export interface WorkOrderStep {
  id: string;
  fieldKey: string;
  labelEn: string;
  labelHi: string;
  inputType: InputType;
  required: boolean;
  options?: StepOption[];
  validation?: {
    regex?: string;
    min?: number;
    max?: number;
    allowedMimeTypes?: string[];
  };
}

export interface WorkOrderSummary {
  id: string;
  workOrderNumber: string;
  customerName: string;
  address: string;
  status: string;
}

export interface WorkflowResponse {
  workOrderId: string;
  currentStep: WorkOrderStep;
  steps: WorkOrderStep[];
  workOrderMeta: Record<string, unknown>;
  answers: Record<string, unknown>;
}

export interface UploadResponse {
  file_id: string;
  file_name: string;
  url: string;
  mime_type: string;
}

export interface StepAnswerResponse {
  accepted: boolean;
  normalized_value: unknown;
  next_step_id: string;
  bot_message: string;
}
