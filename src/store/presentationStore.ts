import { create } from 'zustand';
import type { Slide, AspectRatio, TemplateImage, ChatMessage, WizardStep, PptxExportMode } from '@/lib/types';

function generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

interface PresentationState {
    // Wizard
    currentStep: WizardStep;
    setStep: (step: WizardStep) => void;

    // Global Rules (Step 1)
    globalPrompt: string;
    negativePrompt: string;
    aspectRatio: AspectRatio;
    setGlobalPrompt: (prompt: string) => void;
    setNegativePrompt: (prompt: string) => void;
    setAspectRatio: (ratio: AspectRatio) => void;

    // Templates (Step 2)
    templateImages: TemplateImage[];
    selectedTemplate: TemplateImage | null;
    isGeneratingTemplates: boolean;
    setTemplateImages: (images: TemplateImage[]) => void;
    setSelectedTemplate: (template: TemplateImage) => void;
    setIsGeneratingTemplates: (v: boolean) => void;

    // Slides (Step 3)
    slides: Slide[];
    activeSlideIndex: number;
    isGeneratingSlide: boolean;
    pptxExportMode: PptxExportMode;
    setActiveSlideIndex: (index: number) => void;
    setPptxExportMode: (mode: PptxExportMode) => void;
    addSlide: () => void;
    updateSlide: (index: number, updates: Partial<Slide>) => void;
    deleteSlide: (index: number) => void;
    reorderSlides: (fromIndex: number, toIndex: number) => void;
    setIsGeneratingSlide: (v: boolean) => void;

    // Refinement Chat
    chatMessages: ChatMessage[];
    addChatMessage: (message: ChatMessage) => void;
    clearChat: () => void;

    // Reset
    resetPresentation: () => void;
}

const initialSlide: () => Slide = () => ({
    slide_id: generateId(),
    presentation_id: '',
    slide_index: 0,
    local_prompt: '',
    title: '',
    subtitle: '',
    bullets: [],
    image_url: '',
    speaker_notes: '',
});

export const usePresentationStore = create<PresentationState>((set, get) => ({
    // Wizard
    currentStep: 1,
    setStep: (step) => set({ currentStep: step }),

    // Global Rules
    globalPrompt: '',
    negativePrompt: '',
    aspectRatio: '16:9',
    setGlobalPrompt: (prompt) => set({ globalPrompt: prompt }),
    setNegativePrompt: (prompt) => set({ negativePrompt: prompt }),
    setAspectRatio: (ratio) => set({ aspectRatio: ratio }),

    // Templates
    templateImages: [],
    selectedTemplate: null,
    isGeneratingTemplates: false,
    setTemplateImages: (images) => set({ templateImages: images }),
    setSelectedTemplate: (template) => set({ selectedTemplate: template }),
    setIsGeneratingTemplates: (v) => set({ isGeneratingTemplates: v }),

    // Slides
    slides: [initialSlide()],
    activeSlideIndex: 0,
    isGeneratingSlide: false,
    pptxExportMode: 'hybrid_editable',
    setActiveSlideIndex: (index) => set({ activeSlideIndex: index }),
    setPptxExportMode: (mode) => set({ pptxExportMode: mode }),
    addSlide: () => {
        const { slides } = get();
        const newSlide = initialSlide();
        newSlide.slide_index = slides.length;
        set({
            slides: [...slides, newSlide],
            activeSlideIndex: slides.length,
        });
    },
    updateSlide: (index, updates) => {
        const { slides } = get();
        const updated = [...slides];
        updated[index] = { ...updated[index], ...updates };
        set({ slides: updated });
    },
    deleteSlide: (index) => {
        const { slides, activeSlideIndex } = get();
        if (slides.length <= 1) return;
        const updated = slides.filter((_, i) => i !== index).map((s, i) => ({
            ...s,
            slide_index: i,
        }));
        set({
            slides: updated,
            activeSlideIndex: Math.min(activeSlideIndex, updated.length - 1),
        });
    },
    reorderSlides: (fromIndex, toIndex) => {
        const { slides } = get();
        const updated = [...slides];
        const [moved] = updated.splice(fromIndex, 1);
        updated.splice(toIndex, 0, moved);
        set({
            slides: updated.map((s, i) => ({ ...s, slide_index: i })),
        });
    },
    setIsGeneratingSlide: (v) => set({ isGeneratingSlide: v }),

    // Chat
    chatMessages: [],
    addChatMessage: (message) =>
        set({ chatMessages: [...get().chatMessages, message] }),
    clearChat: () => set({ chatMessages: [] }),

    // Reset
    resetPresentation: () =>
        set({
            currentStep: 1,
            globalPrompt: '',
            negativePrompt: '',
            aspectRatio: '16:9',
            templateImages: [],
            selectedTemplate: null,
            slides: [initialSlide()],
            activeSlideIndex: 0,
            pptxExportMode: 'hybrid_editable',
            chatMessages: [],
        }),
}));
