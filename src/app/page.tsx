'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import AtelierHome from '@/components/AtelierHome';
import AtelierGallery from '@/components/AtelierGallery';
import AtelierGenerating from '@/components/AtelierGenerating';
import AtelierWorkspace from '@/components/AtelierWorkspace';
import AtelierExport from '@/components/AtelierExport';
import { ToastProvider } from '@/components/Toast';
import { usePresentationStore } from '@/store/presentationStore';
import { useProjectStore, type SavedProject } from '@/store/projectStore';
import { useCostStore } from '@/store/costStore';
import { buildPptxBlob } from '@/lib/exportPptx';

type AtelierView = 'home' | 'gallery' | 'generating' | 'workspace' | 'export';

function useAutoSave() {
  const { activeProjectId, updateProject } = useProjectStore();
  const { globalPrompt, negativePrompt, aspectRatio, templateImages, selectedTemplate, slides, pptxExportMode } =
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
      pptxExportMode,
      thumbnailUrl: thumbnail,
    });
  }, [activeProjectId, globalPrompt, negativePrompt, aspectRatio, templateImages, selectedTemplate, slides, pptxExportMode, updateProject]);

  useEffect(() => {
    if (!activeProjectId) return;
    const dataFingerprint = JSON.stringify({
      globalPrompt, negativePrompt, aspectRatio, templateImages, selectedTemplate, pptxExportMode,
      slides: slides.map((s) => ({
        slide_id: s.slide_id, slide_index: s.slide_index, local_prompt: s.local_prompt,
        title: s.title, subtitle: s.subtitle, bullets: s.bullets,
        image_url: s.image_url, speaker_notes: s.speaker_notes,
      })),
    });
    if (dataFingerprint === prevDataRef.current) return;
    prevDataRef.current = dataFingerprint;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => { doSave(); }, 3000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [activeProjectId, globalPrompt, negativePrompt, aspectRatio, templateImages, selectedTemplate, slides, pptxExportMode, doSave]);
}

export default function Home() {
  const [view, setView] = useState<AtelierView>('home');
  const [projectName, setProjectName] = useState('Untitled Deck');

  const { loadProjects, setActiveProjectId } = useProjectStore();
  const { fetchBreakdown } = useCostStore();
  const {
    setGlobalPrompt,
    setNegativePrompt,
    setAspectRatio,
    setStep,
    slides,
    aspectRatio,
  } = usePresentationStore();
  const resetPresentation = usePresentationStore((s) => s.resetPresentation);
  const setTemplateImages = usePresentationStore((s) => s.setTemplateImages);
  const setSelectedTemplate = usePresentationStore((s) => s.setSelectedTemplate);

  useEffect(() => {
    loadProjects();
    fetchBreakdown();
  }, [loadProjects, fetchBreakdown]);

  useAutoSave();

  const handleOpenProject = (project: SavedProject) => {
    setActiveProjectId(project.id);
    setProjectName(project.name);
    setGlobalPrompt(project.globalPrompt);
    setNegativePrompt(project.negativePrompt);
    setAspectRatio(project.aspectRatio);
    setTemplateImages(project.templateImages || []);
    setSelectedTemplate(project.selectedTemplate || null);

    const store = usePresentationStore.getState();
    if (project.slides.length > 0) {
      usePresentationStore.setState({
        slides: project.slides.map((s, i) => ({ ...s, slide_index: i })),
        activeSlideIndex: 0,
      });
    } else {
      usePresentationStore.setState({ slides: [], activeSlideIndex: 0 });
      store.addSlide();
    }

    setStep(3);
    setView('workspace');
  };

  const handleNew = () => {
    resetPresentation();
    setActiveProjectId(null);
    setProjectName('Untitled Deck');
    setStep(1);
    setView('gallery');
  };

  const handleExport = async (format: 'pptx' | 'pdf', mode: 'hybrid' | 'image') => {
    if (format === 'pptx') {
      const blob = await buildPptxBlob(slides, {
        aspectRatio,
        mode: mode === 'hybrid' ? 'hybrid_editable' : 'image',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${projectName.replace(/\s+/g, '-')}.pptx`;
      a.click();
      URL.revokeObjectURL(url);
    }
    setView('workspace');
  };

  return (
    <ToastProvider>
      {view === 'home' && (
        <AtelierHome onOpenProject={handleOpenProject} onNew={handleNew} />
      )}
      {view === 'gallery' && (
        <AtelierGallery
          onBack={() => setView('home')}
          onPick={() => setView('workspace')}
        />
      )}
      {view === 'generating' && (
        <AtelierGenerating
          projectName={projectName}
          onDone={() => setView('workspace')}
          onHome={() => {
            loadProjects();
            setView('home');
          }}
        />
      )}
      {view === 'workspace' && (
        <AtelierWorkspace
          projectName={projectName}
          onHome={() => {
            loadProjects();
            setView('home');
          }}
          onGallery={() => setView('gallery')}
          onExport={() => setView('export')}
        />
      )}
      {view === 'export' && (
        <AtelierExport
          projectName={projectName}
          onClose={() => setView('workspace')}
          onExport={handleExport}
        />
      )}
    </ToastProvider>
  );
}
