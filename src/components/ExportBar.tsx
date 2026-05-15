'use client';

import { useState } from 'react';
import { FileDown, FileText, Loader2 } from 'lucide-react';
import { usePresentationStore } from '@/store/presentationStore';
import { useToast } from './Toast';

/**
 * Download a file using the File System Access API (Chrome 86+).
 * Opens a native "Save As" dialog with the suggested filename.
 * Falls back to anchor-based download if unavailable.
 */
async function downloadFile(blob: Blob, filename: string, mimeType: string): Promise<void> {
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
            if (e instanceof Error && e.name === 'AbortError') return;
        }
    }

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
    const { slides, aspectRatio } = usePresentationStore();
    const { showToast } = useToast();
    const [exportingPptx, setExportingPptx] = useState(false);
    const [exportingPdf, setExportingPdf] = useState(false);

    const hasSlides = slides.some((s) => s.image_url);

    const handleExportPptx = async () => {
        if (!hasSlides) return;
        setExportingPptx(true);
        try {
            const { buildPptxBlob } = await import('@/lib/exportPptx');
            const blob = await buildPptxBlob(slides, { aspectRatio });
            await downloadFile(
                blob,
                'SlideBuilder-Presentation.pptx',
                'application/vnd.openxmlformats-officedocument.presentationml.presentation'
            );
            showToast('success', 'Export Complete', 'Your PPTX file has been downloaded.');
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
            >
                {exportingPptx ? <Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> : <FileDown size={14} />}
                Export PPTX
            </button>
        </div>
    );
}
