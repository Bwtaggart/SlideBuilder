// ─── Database Models ───────────────────────────────────────────────

export interface User {
  user_id: string;
  email: string;
  stripe_customer_id?: string;
}

export interface UsageLog {
  log_id: string;
  user_id: string;
  timestamp: string;
  service_type: 'nano_banana_image' | 'gemini_text';
  tokens_used: number;
  estimated_cost: number;
}

export interface Presentation {
  presentation_id: string;
  user_id: string;
  global_prompt: string;
  negative_prompt: string;
  base_template_url: string;
  aspect_ratio: AspectRatio;
}

export interface Slide {
  slide_id: string;
  presentation_id: string;
  slide_index: number;
  local_prompt: string;
  // Optional structured-text fields, retained for backward compatibility with
  // saved projects. The current generation pipeline does not require them.
  title: string;
  subtitle: string;
  bullets: string[];
  image_url: string;
  speaker_notes: string;
  // Optional QA results from the post-generation second-pass check.
  qa_passed?: boolean;
  qa_issues?: string[];
}

// ─── App Types ─────────────────────────────────────────────────────

export type AspectRatio = '16:9' | '4:3' | '9:16';

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  imageUrl?: string;
  timestamp: number;
}

export interface GraphicOverlay {
  src: string;
  xPct: number;
  yPct: number;
  widthPct: number;
  heightPct: number;
}

export interface TemplateImage {
  id: string;
  base64: string;
  url?: string;
  /** Original clean template before graphic overlays were added */
  originalBase64?: string;
  /** Graphics to composite on top of generated slides */
  overlays?: GraphicOverlay[];
}

export interface CostBreakdown {
  daily: number;
  weekly: number;
  monthly: number;
}

export type ServiceType = 'nano_banana_image' | 'gemini_text';

export type WizardStep = 1 | 2 | 3;
