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
  title: string;
  subtitle: string;
  bullets: string[];
  rendered_text_payload?: string;
  image_url: string;
  speaker_notes: string;
}

// ─── App Types ─────────────────────────────────────────────────────

export type AspectRatio = '16:9' | '4:3' | '9:16';
export type PptxExportMode = 'image' | 'hybrid_editable';

export interface TextBoxRect {
  xPct: number;
  yPct: number;
  wPct: number;
  hPct: number;
}

export interface SlideTextLayout {
  title: TextBoxRect;
  subtitle: TextBoxRect;
  bullets: TextBoxRect;
}

export type AspectRatioTextLayouts = Record<AspectRatio, SlideTextLayout>;

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
