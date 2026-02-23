'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Navbar from '@/components/Navbar';
import StepWizard from '@/components/StepWizard';
import ProjectManager from '@/components/ProjectManager';
import { ToastProvider } from '@/components/Toast';
import { usePresentationStore } from '@/store/presentationStore';
import { useProjectStore } from '@/store/projectStore';

/**
 * Auto-save hook: persists the current presentation state to IndexedDB
 * whenever meaningful data changes (debounced 3s).
 */
function useAutoSave() {
  const { activeProjectId, updateProject } = useProjectStore();
  const { globalPrompt, negativePrompt, aspectRatio, templateImages, selectedTemplate, slides } =
    usePresentationStore();
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const prevDataRef = useRef<string>('');

  const doSave = useCallback(async () => {
    if (!activeProjectId) return;
    const thumbnail = slides.find((s) => s.image_url)?.image_url || '';
    await updateProject(activeProjectId, {
      globalPrompt,
      negativePrompt,
      aspectRatio,
      templateImages,
      selectedTemplate,
      slides,
      thumbnailUrl: thumbnail,
    });
  }, [activeProjectId, globalPrompt, negativePrompt, aspectRatio, templateImages, selectedTemplate, slides, updateProject]);

  useEffect(() => {
    if (!activeProjectId) return;

    // Create a fingerprint of the data that matters
    const dataFingerprint = JSON.stringify({
      globalPrompt,
      negativePrompt,
      aspectRatio,
      templateCount: templateImages.length,
      selectedTemplateId: selectedTemplate?.id,
      slideCount: slides.length,
      slideImages: slides.map((s) => s.image_url ? 'yes' : 'no'),
      slideTitles: slides.map((s) => s.title),
      slidePrompts: slides.map((s) => s.local_prompt),
    });

    // Skip if nothing changed
    if (dataFingerprint === prevDataRef.current) return;
    prevDataRef.current = dataFingerprint;

    // Debounce the save
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      doSave();
    }, 3000);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [activeProjectId, globalPrompt, negativePrompt, aspectRatio, templateImages, selectedTemplate, slides, doSave]);
}

export default function Home() {
  const [isInProject, setIsInProject] = useState(false);

  // Auto-save whenever presentation state changes (debounced)
  useAutoSave();

  return (
    <ToastProvider>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
        }}
      >
        <Navbar
          isInProject={isInProject}
          onBackToProjects={() => setIsInProject(false)}
        />
        <main style={{ flex: 1 }}>
          {isInProject ? (
            <StepWizard />
          ) : (
            <ProjectManager onOpenProject={() => setIsInProject(true)} />
          )}
        </main>
      </div>
    </ToastProvider>
  );
}
