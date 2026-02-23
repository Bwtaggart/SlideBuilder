'use client';

import { usePresentationStore } from '@/store/presentationStore';
import GlobalRulesStep from './GlobalRulesStep';
import TemplateGallery from './TemplateGallery';
import SlideBuilder from './SlideBuilder';

export default function StepWizard() {
    const currentStep = usePresentationStore((s) => s.currentStep);

    switch (currentStep) {
        case 1:
            return <GlobalRulesStep />;
        case 2:
            return <TemplateGallery />;
        case 3:
            return <SlideBuilder />;
        default:
            return <GlobalRulesStep />;
    }
}
