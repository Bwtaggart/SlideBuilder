'use client';

import { useState } from 'react';
import { Layers, Check, Save, Loader2 } from 'lucide-react';
import { usePresentationStore } from '@/store/presentationStore';
import { useProjectStore } from '@/store/projectStore';
import { useToast } from './Toast';
import CostWidget from './CostWidget';

const steps = [
    { num: 1, label: 'Global Rules' },
    { num: 2, label: 'Templates' },
    { num: 3, label: 'Slide Builder' },
] as const;

interface Props {
    isInProject: boolean;
    onBackToProjects: () => void;
}

export default function Navbar({ isInProject, onBackToProjects }: Props) {
    const { currentStep, setStep, selectedTemplate, templateImages, globalPrompt, negativePrompt, aspectRatio, slides, pptxExportMode } =
        usePresentationStore();
    const { activeProjectId, saveProject, updateProject } = useProjectStore();
    const { showToast } = useToast();
    const [showSaveDialog, setShowSaveDialog] = useState(false);
    const [saveName, setSaveName] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const canNavigateTo = (step: number) => {
        if (step === 1) return true;
        if (step === 2) return templateImages.length > 0 || !!selectedTemplate;
        if (step === 3) return !!selectedTemplate;
        return false;
    };

    const handleSave = async () => {
        if (activeProjectId) {
            setIsSaving(true);
            const thumbnail = slides.find((s) => s.image_url)?.image_url || '';
            await updateProject(activeProjectId, {
                globalPrompt,
                negativePrompt,
                aspectRatio,
                templateImages,
                selectedTemplate,
                slides,
                pptxExportMode,
                thumbnailUrl: thumbnail,
            });
            showToast('success', 'Saved', 'Project updated.');
            setIsSaving(false);
        } else {
            setShowSaveDialog(true);
            setSaveName(`Presentation ${new Date().toLocaleDateString()}`);
        }
    };

    const handleSaveNew = async () => {
        if (!saveName.trim()) return;
        setIsSaving(true);
        const thumbnail = slides.find((s) => s.image_url)?.image_url || '';
        await saveProject(saveName.trim(), {
            name: saveName.trim(),
            globalPrompt,
            negativePrompt,
            aspectRatio,
            templateImages,
            selectedTemplate,
            slides,
            pptxExportMode,
            thumbnailUrl: thumbnail,
        });
        showToast('success', 'Saved', `"${saveName.trim()}" saved to projects.`);
        setShowSaveDialog(false);
        setSaveName('');
        setIsSaving(false);
    };

    return (
        <>
            <nav
                className="glass-panel"
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 24px',
                    borderRadius: 0,
                    borderTop: 'none',
                    borderLeft: 'none',
                    borderRight: 'none',
                    borderBottom: '1px solid var(--color-border-default)',
                    position: 'sticky',
                    top: 0,
                    zIndex: 50,
                }}
            >
                {/* Logo — always acts as home button when in a project */}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        cursor: isInProject ? 'pointer' : 'default',
                    }}
                    onClick={isInProject ? onBackToProjects : undefined}
                    title={isInProject ? 'Back to Projects' : undefined}
                >
                    <div
                        style={{
                            width: 34,
                            height: 34,
                            borderRadius: 8,
                            background: 'linear-gradient(135deg, var(--color-accent-cyan), var(--color-accent-blue))',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'box-shadow 0.2s ease',
                        }}
                    >
                        <Layers size={18} style={{ color: 'var(--color-bg-primary)' }} />
                    </div>
                    <span
                        style={{
                            fontSize: 16,
                            fontWeight: 700,
                            letterSpacing: '-0.02em',
                            transition: 'opacity 0.2s ease',
                        }}
                        className="glow-text"
                    >
                        SlideBuilder
                    </span>
                </div>

                {/* Step Indicators — Projects is the first "step" */}
                {isInProject && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                        {/* Projects pseudo-step */}
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                            <button
                                onClick={onBackToProjects}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 8,
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    padding: '4px 8px',
                                    borderRadius: 8,
                                    transition: 'all 0.2s ease',
                                }}
                            >
                                <div className="step-dot step-dot--complete">
                                    <Check size={14} />
                                </div>
                                <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-accent-green)', transition: 'color 0.2s ease' }}>
                                    Projects
                                </span>
                            </button>
                            <div className="step-line step-line--active" />
                        </div>

                        {/* Normal wizard steps */}
                        {steps.map((step, i) => (
                            <div key={step.num} style={{ display: 'flex', alignItems: 'center' }}>
                                <button
                                    onClick={() => canNavigateTo(step.num) && setStep(step.num as 1 | 2 | 3)}
                                    disabled={!canNavigateTo(step.num)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 8,
                                        background: 'none',
                                        border: 'none',
                                        cursor: canNavigateTo(step.num) ? 'pointer' : 'default',
                                        padding: '4px 8px',
                                        borderRadius: 8,
                                        transition: 'all 0.2s ease',
                                    }}
                                >
                                    <div
                                        className={`step-dot ${currentStep === step.num
                                            ? 'step-dot--active'
                                            : currentStep > step.num
                                                ? 'step-dot--complete'
                                                : 'step-dot--inactive'
                                            }`}
                                    >
                                        {currentStep > step.num ? <Check size={14} /> : step.num}
                                    </div>
                                    <span
                                        style={{
                                            fontSize: 12,
                                            fontWeight: 500,
                                            color:
                                                currentStep === step.num
                                                    ? 'var(--color-accent-cyan)'
                                                    : currentStep > step.num
                                                        ? 'var(--color-accent-green)'
                                                        : 'var(--color-text-muted)',
                                            transition: 'color 0.2s ease',
                                        }}
                                    >
                                        {step.label}
                                    </span>
                                </button>
                                {i < steps.length - 1 && (
                                    <div
                                        className={`step-line ${currentStep > step.num ? 'step-line--active' : 'step-line--inactive'}`}
                                    />
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* Right side: Save + Cost */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {isInProject && (
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                background: 'none',
                                border: '1px solid var(--color-border-default)',
                                borderRadius: 6,
                                padding: '6px 12px',
                                cursor: 'pointer',
                                color: 'var(--color-text-secondary)',
                                fontSize: 12,
                                fontWeight: 500,
                                transition: 'all 0.2s ease',
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.borderColor = 'var(--color-accent-green)';
                                e.currentTarget.style.color = 'var(--color-accent-green)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.borderColor = 'var(--color-border-default)';
                                e.currentTarget.style.color = 'var(--color-text-secondary)';
                            }}
                        >
                            {isSaving ? <Loader2 size={13} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Save size={13} />}
                            {activeProjectId ? 'Save' : 'Save As'}
                        </button>
                    )}
                    <CostWidget />
                </div>
            </nav>

            {/* Save Dialog Overlay */}
            {showSaveDialog && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0,0,0,0.6)',
                        backdropFilter: 'blur(4px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 100,
                        animation: 'fade-in 0.2s ease-out',
                    }}
                    onClick={() => setShowSaveDialog(false)}
                >
                    <div
                        className="glass-panel"
                        style={{
                            padding: 24,
                            width: 400,
                            animation: 'slide-up 0.2s ease-out',
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>
                            Save Project
                        </h2>
                        <label className="label" htmlFor="save-name">Project Name</label>
                        <input
                            id="save-name"
                            className="input-field"
                            value={saveName}
                            onChange={(e) => setSaveName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSaveNew()}
                            autoFocus
                            style={{ marginBottom: 16 }}
                        />
                        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                            <button
                                className="btn-secondary"
                                onClick={() => setShowSaveDialog(false)}
                                style={{ padding: '8px 16px', fontSize: 13 }}
                            >
                                Cancel
                            </button>
                            <button
                                className="btn-primary"
                                onClick={handleSaveNew}
                                disabled={!saveName.trim()}
                                style={{ padding: '8px 16px', fontSize: 13 }}
                            >
                                <Save size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }} />
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
