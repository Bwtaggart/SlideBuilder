'use client';

import { useState } from 'react';
import { FileDown, FileText, Loader2 } from 'lucide-react';
import { usePresentationStore } from '@/store/presentationStore';
import { useToast } from './Toast';
import type { PptxExportMode } from '@/lib/types';

/**
 * Download a file using the File System Access API (Chrome 86+).
 * Opens a native "Save As" dialog with the suggested filename.
 * Falls back to anchor-based download if unavailable.
 */
async function downloadFile(blob: Blob, filename: string, mimeType: string): Promise<void> {
    // Try the File System Access API first (Chrome, Edge)
    if ('showSaveFilePicker' in window) {
        try {
            const ext = filename.split('.').pop() || '';
            const handle = await (window as unknown as { showSaveFilePicker: (opts: unknown) => Promise<FileSystemFileHandle> }).showSaveFilePicker({
                suggestedName: filename,
                types: [
                    {
                        description: ext.toUpperCase() + ' File',
                        accept: { [mimeType]: ['.' + ext] },
                    },
                ],
            });
            const writable = await handle.createWritable();
            await writable.write(blob);
            await writable.close();
            return;
        } catch (e: unknown) {
            // User cancelled the save dialog
            if (e instanceof Error && e.name === 'AbortError') return;
            // API unavailable or failed — fall through to anchor method
        }
    }

    // Fallback: anchor-based download
    const file = new File([blob], filename, { type: mimeType });
    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.position = 'fixed';
    link.style.left = '-9999px';
    document.body.appendChild(link);
    link.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
    setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }, 1000);
}

export default function ExportBar() {
    const { slides, aspectRatio, pptxExportMode, setPptxExportMode } = usePresentationStore();
    const { showToast } = useToast();
    const [exportingPptx, setExportingPptx] = useState(false);
    const [exportingPdf, setExportingPdf] = useState(false);

    const hasSlides = slides.some((s) => s.image_url);
    const editableTextLayerCount = slides.reduce((count, slide) => {
        const hasTitle = !!slide.title.trim();
        const hasSubtitle = !!slide.subtitle.trim();
        const hasBullets = slide.bullets.some((b) => b.trim());
        return count + (hasTitle ? 1 : 0) + (hasSubtitle ? 1 : 0) + (hasBullets ? 1 : 0);
    }, 0);

    const handleExportPptx = async () => {
        if (!hasSlides) return;
        if (pptxExportMode === 'hybrid_editable' && editableTextLayerCount === 0) {
            showToast(
                'warning',
                'No Editable Text Found',
                'Hybrid mode only exports Title, Sub Heading, and Bullets fields. This deck has none, so PPTX will be image-only.'
            );
        }
        setExportingPptx(true);
        try {
            const { buildPptxBlob } = await import('@/lib/exportPptx');
            const blob = await buildPptxBlob(slides, { mode: pptxExportMode, aspectRatio });
            await downloadFile(
                blob,
                'SlideBuilder-Presentation.pptx',
                'application/vnd.openxmlformats-officedocument.presentationml.presentation'
            );
            showToast(
                'success',
                'Export Complete',
                `Your PPTX file has been downloaded (${pptxExportMode === 'hybrid_editable' ? 'Hybrid Editable' : 'Image-only'} mode).`
            );
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Export failed';
            showToast('error', 'Export Error', msg);
        } finally {
            setExportingPptx(false);
        }
    };

    const handleExportPdf = async () => {
        if (!hasSlides) return;
        setExportingPdf(true);
        try {
            const { buildPdfBlob } = await import('@/lib/exportPdf');
            const blob = await buildPdfBlob(slides);
            await downloadFile(blob, 'SlideBuilder-Presentation.pdf', 'application/pdf');
            showToast('success', 'Export Complete', 'Your PDF file has been downloaded.');
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Export failed';
            showToast('error', 'Export Error', msg);
        } finally {
            setExportingPdf(false);
        }
    };

    return (
        <div
            className="glass-panel"
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: 10,
                padding: '12px 16px',
                marginTop: 16,
            }}
        >
            <span style={{ fontSize: 12, color: 'var(--color-text-muted)', marginRight: 'auto' }}>
                {slides.filter(s => s.image_url).length} of {slides.length} slides generated
            </span>

            <button
                className="btn-secondary"
                onClick={handleExportPdf}
                disabled={!hasSlides || exportingPdf}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', fontSize: 13 }}
            >
                {exportingPdf ? <Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> : <FileText size={14} />}
                Export PDF
            </button>

            <button
                className="btn-primary"
                onClick={handleExportPptx}
                disabled={!hasSlides || exportingPptx}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', fontSize: 13 }}
                title="Hybrid keeps design image and adds editable text layers."
            >
                {exportingPptx ? <Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> : <FileDown size={14} />}
                Export PPTX
            </button>
            <label
                htmlFor="pptx-export-mode"
                style={{
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    color: 'var(--color-text-muted)',
                }}
            >
                PPTX Mode
            </label>
            <select
                id="pptx-export-mode"
                aria-label="PPTX export mode"
                value={pptxExportMode}
                onChange={(e) => setPptxExportMode(e.target.value as PptxExportMode)}
                style={{
                    background: 'var(--color-bg-card)',
                    color: 'var(--color-text-secondary)',
                    border: '1px solid var(--color-border-default)',
                    borderRadius: 6,
                    padding: '8px 10px',
                    fontSize: 12,
                }}
                title="Hybrid keeps design image and adds editable text layers."
            >
                <option value="hybrid_editable">Hybrid Editable</option>
                <option value="image">Image-only</option>
            </select>
        </div>
    );
}
