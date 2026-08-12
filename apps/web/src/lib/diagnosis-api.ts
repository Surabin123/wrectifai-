import { apiClient } from './api-client';

export interface DiagnosticIssue {
  name: string;
  confidence: number;
  estimatedPriceRange: {
    min: number;
    max: number;
  };
  requiredParts: string[];
}

export interface DiagnosticResult {
  id: string;
  issues: DiagnosticIssue[];
  confidenceScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  diyAllowed: boolean;
  diySteps: string[];
  nextAction: 'diy' | 'bookGarage' | 'buyParts';
}

export interface DiagnosisMedia {
  id: string;
  mediaType: 'image' | 'video' | 'audio';
  url: string;
}

export interface DiagnosisResponse {
  id: string;
  customerId: string;
  vehicleId: string;
  symptomText: string;
  status: 'received' | 'processing' | 'completed' | 'failed';
  createdAt: string;
  media: DiagnosisMedia[];
  result: DiagnosticResult;
}

export interface SubmitDiagnosisPayload {
  vehicleId: string;
  symptomText: string;
  media?: Array<{ mediaType: 'image' | 'video' | 'audio'; base64: string }>;
  intakeAnswers?: {
    category?: string | null;
    answers?: Record<string, string>;
    questions?: string[];
    qas?: Record<string, string>;
  };
  stage?: 'questions' | 'final';
}

export async function submitDiagnosis(payload: SubmitDiagnosisPayload): Promise<any> {
  // Do NOT catch errors here — let them propagate so the api-client can
  // handle 401 token-refresh automatically, and so the caller can show
  // the correct error message (e.g. session expired vs network error).
  return apiClient.post('/diagnosis', payload);
}

export async function chatDiagnosis(payload: { vehicleId: string, conversationHistory: { role: string, content: string }[] }): Promise<any> {
  return apiClient.post('/diagnosis/chat', payload);
}

export async function getChatHistory(vehicleId: string): Promise<any> {
  return apiClient.get(`/diagnosis/history/${vehicleId}`);
}

export async function syncChatHistory(vehicleId: string, messages: any[]): Promise<any> {
  // We use apiClient.put but we don't await it strictly where it matters
  return apiClient.put(`/diagnosis/history/${vehicleId}`, { messages });
}

export async function getDiagnosis(id: string): Promise<DiagnosisResponse> {
  return apiClient.get(`/diagnosis/${id}`);
}

// Diagnose Config Types
export interface IssueQuestion {
  id: string;
  label: string;
  question: string;
  options: string[];
}

export interface DiagnosticIssueResult {
  id: string;
  title: string;
  badge: string;
  badgeClass: string;
  description: string;
  match: number;
  risks: string[];
  estimatedCost: string;
  imageSrc: string;
  inspectionItems?: string[];
}

export interface IssueCategoryConfig {
  id: string;
  label: string;
  summary: string;
  summaryMeaning: string;
  keywords: string[];
  questions: IssueQuestion[];
  possibleIssues: DiagnosticIssueResult[];
}

export interface ResultSummaryItem {
  title: string;
  heading: string;
  body: string;
  pill: string;
  pillClass: string;
  icon: string;
  iconClass: string;
}

export interface NextStep {
  step: string;
  title: string;
  body: string;
  meta: string;
}

export interface TrustItem {
  id: string;
  title: string;
  description: string;
  icon: string;
}

export interface DiagnoseConfig {
  categories: IssueCategoryConfig[];
  resultSummaries: ResultSummaryItem[];
  nextSteps: NextStep[];
  trustItems: TrustItem[];
}

// Diagnose Config API Functions
export async function getDiagnoseCategories(): Promise<IssueCategoryConfig[]> {
  return apiClient.get('/diagnose/config/categories');
}

export async function getDiagnoseCategory(id: string): Promise<IssueCategoryConfig> {
  return apiClient.get(`/diagnose/config/categories/${id}`);
}

export async function getDiagnoseResultSummaries(): Promise<ResultSummaryItem[]> {
  return apiClient.get('/diagnose/config/result-summaries');
}

export async function getDiagnoseNextSteps(): Promise<NextStep[]> {
  return apiClient.get('/diagnose/config/next-steps');
}

export async function getDiagnoseTrustItems(): Promise<TrustItem[]> {
  return apiClient.get('/diagnose/config/trust-items');
}

export async function getDiagnoseConfig(): Promise<DiagnoseConfig> {
  return apiClient.get('/diagnose/config/all');
}
