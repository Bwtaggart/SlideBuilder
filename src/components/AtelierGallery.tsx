'use client';

import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, ArrowRight, Upload, Sparkles, Check, Download, Layers, Trash2 } from 'lucide-react';
import { usePresentationStore } from '@/store/presentationStore';
import { useCostStore } from '@/store/costStore';
import { createBlankTemplate } from '@/lib/template';
import { getAllTemplates, putTemplate, deleteTemplate } from '@/lib/idb';
import type { TemplateImage } from '@/lib/types';
import TemplateEditor from './TemplateEditor';

interface AtelierGalleryProps {
  onBack: () => void;
  onPick: () => void;
}

export default function AtelierGallery({ onBack, onPick }: AtelierGalleryProps) {
  const {
    templateImages,
    selectedTemplate,
    setSelectedTemplate,
    setTemplateImages,
    isGeneratingTemplates,
    setIsGeneratingTemplates,
    globalPrompt,
    setGlobalPrompt,
    negativePrompt,
    setNegativePrompt,
    aspectRatio,
  } = usePresentationStore();
  const { addCost } = useCostStore();

  const [filter, setFilter] = useState('all');
  const [describePrompt, setDescribePrompt] = useState(globalPrompt);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isCustomizing, setIsCustomizing] = useState(false);
  const refImageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (templateImages.length > 0) return;
    getAllTemplates().then((persisted) => {
      if (persisted.length > 0) {
        const images: TemplateImage[] = persisted.map((t) => ({
          id: t.id,
          base64: t.base64,
          url: t.url,
        }));
        setTemplateImages(images);
      }
    });
  }, []);

  const blankTemplate = createBlankTemplate(aspectRatio);

  const allTemplates: (TemplateImage & { name: string; tag: string; isBlank?: boolean })[] = [
    { ...blankTemplate, name: 'Blank canvas', tag: 'utility', isBlank: true },
    ...templateImages.map((t, i) => ({
      ...t,
      name: `Template ${i + 1}`,
      tag: 'generated',
    })),
  ];

  const filtered =
    filter === 'all'
      ? allTemplates
      : allTemplates.filter((t) => t.tag === filter || t.isBlank);

  const selectedIndex = filtered.findIndex(
    (t) => t.id === (selectedTemplate?.id ?? blankTemplate.id),
  );

  const handleSelect = (template: (typeof allTemplates)[number]) => {
    if (template.isBlank) {
      setSelectedTemplate(blankTemplate);
    } else {
      setSelectedTemplate({ id: template.id, base64: template.base64, url: template.url });
    }
  };

  const handleGenerate = async () => {
    if (!describePrompt.trim()) return;
    setIsGeneratingTemplates(true);
    setGlobalPrompt(describePrompt);
    try {
      const resp = await fetch('/api/generate-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          globalPrompt: describePrompt,
          negativePrompt,
          aspectRatio,
        }),
      });
      const data = await resp.json();
      if (data.error) throw new Error(data.error);
      const images: TemplateImage[] = (data.images || []).map(
        (img: { id: string; base64: string }) => ({
          id: img.id,
          base64: img.base64,
        }),
      );
      setTemplateImages(images);
      addCost('nano_banana_image', images.length);
      if (images.length > 0) {
        setSelectedTemplate(images[0]);
      }
    } catch (err) {
      console.error('Template generation failed:', err);
    } finally {
      setIsGeneratingTemplates(false);
    }
  };

  const handleUploadReference = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setIsAnalyzing(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });
      const resp = await fetch('/api/analyze-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64, mimeType: file.type }),
      });
      const data = await resp.json();
      if (data.error) throw new Error(data.error);
      if (data.globalPrompt) {
        setDescribePrompt(data.globalPrompt);
        setGlobalPrompt(data.globalPrompt);
      }
      if (data.negativePrompt) {
        setNegativePrompt(data.negativePrompt);
      }
    } catch (err) {
      console.error('Reference analysis failed:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handlePickAndContinue = async () => {
    const tpl = selectedTemplate || blankTemplate;
    if (!selectedTemplate) {
      setSelectedTemplate(blankTemplate);
    }
    if (tpl.base64) {
      await putTemplate({ id: tpl.id, base64: tpl.base64, url: tpl.url, createdAt: Date.now() });
    }
    onPick();
  };

  const handleDeleteTemplate = async (id: string) => {
    setTemplateImages(templateImages.filter((t) => t.id !== id));
    if (selectedTemplate?.id === id) {
      setSelectedTemplate(blankTemplate);
    }
    await deleteTemplate(id);
  };

  const handleCustomizeSave = (compositeBase64: string) => {
    const id = `custom-${Date.now()}`;
    const newTemplate: TemplateImage = { id, base64: compositeBase64 };
    setTemplateImages([...templateImages, newTemplate]);
    setSelectedTemplate(newTemplate);
    setIsCustomizing(false);
  };

  const tags = [
    { id: 'all', label: 'All templates' },
    { id: 'generated', label: 'Generated' },
    { id: 'utility', label: 'Utility' },
  ];

  return (
    <div
      style={{
        fontFamily: 'var(--font-sans)',
        background: 'var(--color-bg-canvas)',
        color: 'var(--color-text-primary)',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <input
        ref={refImageInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleUploadReference}
      />
      {/* Topbar */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 24px',
          borderBottom: '1px solid var(--color-border-default)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={onBack} className="atl-btn" style={{ padding: '6px 10px' }} title="Back to home">
            <ArrowLeft size={13} />
          </button>
          <span className="atl-serif" style={{ fontSize: 16 }}>
            Pick a starting template
          </span>
          <span className="atl-chip">step 1 of 2 · style</span>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            className="atl-btn"
            title="Upload a reference image to guide template generation"
            onClick={() => refImageInputRef.current?.click()}
            disabled={isAnalyzing}
          >
            <Upload size={13} /> {isAnalyzing ? 'Analyzing…' : 'Upload reference'}
          </button>
          <button
            className="atl-btn"
            title="Add graphics on top of the selected template"
            onClick={() => setIsCustomizing(true)}
            disabled={!selectedTemplate?.base64}
          >
            <Layers size={13} /> Customize
          </button>
          <button className="atl-btn atl-btn-pri" onClick={handlePickAndContinue} title="Use the selected template and start editing slides">
            Use template <ArrowRight size={13} />
          </button>
        </div>
      </header>

      {/* Body */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '240px 1fr', minHeight: 0 }}>
        {/* Sidebar */}
        <aside
          className="atl-side"
          style={{
            borderRight: '1px solid var(--color-border-default)',
            padding: '18px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}
        >
          <div className="atl-label">Filter</div>
          {tags.map((t) => (
            <button
              key={t.id}
              onClick={() => setFilter(t.id)}
              className="atl-btn"
              style={{
                justifyContent: 'flex-start',
                background: filter === t.id ? '#fff' : 'transparent',
                borderColor: filter === t.id ? 'var(--color-accent)' : 'transparent',
                color: filter === t.id ? 'var(--color-accent)' : 'var(--color-text-primary)',
              }}
            >
              {t.label}
            </button>
          ))}

          <div style={{ marginTop: 18 }} className="atl-label">
            Or describe
          </div>
          <textarea
            className="atl-ta"
            rows={4}
            placeholder={'"Editorial spread, generous whitespace, Fraunces serif, muted earth palette."'}
            value={describePrompt}
            onChange={(e) => setDescribePrompt(e.target.value)}
          />
          <button
            className="atl-btn atl-btn-pri"
            style={{ justifyContent: 'center', marginTop: 8 }}
            onClick={handleGenerate}
            disabled={isGeneratingTemplates || !describePrompt.trim()}
            title="Generate template designs from your description"
          >
            {isGeneratingTemplates ? (
              <>
                <div
                  style={{
                    width: 14,
                    height: 14,
                    border: '2px solid rgba(250,248,244,.3)',
                    borderTopColor: '#faf8f4',
                    borderRadius: '50%',
                    animation: 'atl-spin 0.9s linear infinite',
                  }}
                />
                Generating…
              </>
            ) : (
              <>
                <Sparkles size={13} /> Generate template
              </>
            )}
          </button>
        </aside>

        {/* Content grid */}
        <div style={{ overflow: 'auto', padding: '24px 28px' }}>
          {isGeneratingTemplates && templateImages.length === 0 ? (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 18,
              }}
            >
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="atl-card" style={{ overflow: 'hidden' }}>
                  <div
                    className="atl-skel"
                    style={{ aspectRatio: '16/10', width: '100%' }}
                  />
                  <div style={{ padding: '12px 14px' }}>
                    <div
                      className="atl-skel"
                      style={{ height: 16, width: '60%', marginBottom: 6 }}
                    />
                    <div className="atl-skel" style={{ height: 12, width: '30%' }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 18,
              }}
            >
              {filtered.map((t, i) => {
                const isSelected = i === selectedIndex;
                return (
                  <div
                    key={t.id}
                    className="atl-card atl-tile"
                    onClick={() => handleSelect(t)}
                    style={{
                      overflow: 'hidden',
                      border: isSelected
                        ? '2px solid var(--color-accent)'
                        : '1px solid var(--color-border-default)',
                      position: 'relative',
                    }}
                  >
                    <div
                      style={{
                        aspectRatio: '16/10',
                        background: t.isBlank ? 'var(--color-bg-canvas)' : 'var(--color-bg-hover)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                      }}
                    >
                      {t.isBlank ? (
                        <div
                          className="atl-serif"
                          style={{ color: 'var(--color-text-placeholder)', fontSize: 36 }}
                        >
                          +
                        </div>
                      ) : t.base64 ? (
                        <img
                          src={`data:image/png;base64,${t.base64}`}
                          alt={t.name}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        <div className="atl-skel" style={{ width: '100%', height: '100%' }} />
                      )}
                    </div>
                    <div
                      style={{
                        padding: '12px 14px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <div className="atl-serif" style={{ fontSize: 15 }}>
                          {t.name}
                        </div>
                        <div
                          className="atl-mono"
                          style={{
                            fontSize: 10,
                            color: 'var(--color-text-secondary)',
                            textTransform: 'uppercase',
                            letterSpacing: '.08em',
                            marginTop: 2,
                          }}
                        >
                          {t.tag}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {!t.isBlank && t.base64 && (
                          <button
                            className="atl-btn"
                            style={{ padding: '3px 6px', fontSize: 10 }}
                            title="Download template as PNG"
                            onClick={(e) => {
                              e.stopPropagation();
                              const a = document.createElement('a');
                              a.href = `data:image/png;base64,${t.base64}`;
                              a.download = `${t.name.replace(/\s+/g, '-').toLowerCase()}.png`;
                              a.click();
                            }}
                          >
                            <Download size={10} />
                          </button>
                        )}
                        {!t.isBlank && (
                          <button
                            className="atl-btn"
                            style={{ padding: '3px 6px', fontSize: 10, color: '#b91c1c' }}
                            title="Delete template"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteTemplate(t.id);
                            }}
                          >
                            <Trash2 size={10} />
                          </button>
                        )}
                        {isSelected && (
                          <div
                            style={{
                              width: 20,
                              height: 20,
                              borderRadius: '50%',
                              background: 'var(--color-accent)',
                              color: '#faf8f4',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Check size={12} />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {isCustomizing && selectedTemplate?.base64 && (
        <TemplateEditor
          templateBase64={selectedTemplate.base64}
          onSave={handleCustomizeSave}
          onCancel={() => setIsCustomizing(false)}
        />
      )}
    </div>
  );
}
