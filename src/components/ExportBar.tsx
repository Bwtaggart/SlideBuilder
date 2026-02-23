'use client';

import { useState } from 'react';
import { FileDown, FileText, Loader2 } from 'lucide-react';
import { usePresentationStore } from '@/store/presentationStore';
import { useToast } from './Toast';

/**
 * Trigger a file download from a Blob.
 * Uses a data URL approach for maximum browser compatibility (Safari included).
 */
function triggerDownload(blob: Blob, filename: string) {
    const reader = new FileReader();
    reader.onloadend = () => {
        const a = document.createElement('a');
        a.href = reader.result as string;
        a.download = filename;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };
    reader.readAsDataURL(blob);
}

export default function ExportBar() {
    const { slides } = usePresentationStore();
    const { showToast } = useToast();
    const [exportingPptx, setExportingPptx] = useState(false);
    const [exportingPdf, setExportingPdf] = useState(false);

    const hasSlides = slides.some((s) => s.image_url);

    const handleExportPptx = async () => {
        if (!hasSlides) return;
        setExportingPptx(true);
        try {
            const { buildPptxBlob } = await import('@/lib/exportPptx');
            const blob = await buildPptxBlob(slides);
            triggerDownload(blob, 'SlideBuilder-Presentation.pptx');
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
            triggerDownload(blob, 'SlideBuilder-Presentation.pdf');
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
