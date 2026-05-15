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
      templateImages,
      selectedTemplate,
      slides: slides.map((s) => ({
        slide_id: s.slide_id,
        slide_index: s.slide_index,
        local_prompt: s.local_prompt,
        image_url: s.image_url,
        speaker_notes: s.speaker_notes,
      })),
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
