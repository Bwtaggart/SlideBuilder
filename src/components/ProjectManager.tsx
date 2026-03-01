'use client';

import { useEffect, useState } from 'react';
import {
    FolderOpen,
    Plus,
    Trash2,
    Clock,
    Image as ImageIcon,
    Layers,
    Pencil,
    Check,
    X,
} from 'lucide-react';
import { useProjectStore, type SavedProject } from '@/store/projectStore';
import { usePresentationStore } from '@/store/presentationStore';

interface Props {
    onOpenProject: () => void;
}

export default function ProjectManager({ onOpenProject }: Props) {
    const { projects, loadProjects, deleteProject, setActiveProjectId, renameProject, isLoaded } =
        useProjectStore();
    const presentationStore = usePresentationStore();
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

    useEffect(() => {
        loadProjects();
    }, [loadProjects]);

    const handleNewProject = () => {
        presentationStore.resetPresentation();
        setActiveProjectId(null);
        onOpenProject();
    };

    const handleOpenProject = (project: SavedProject) => {
        // Load project data into presentation store
        presentationStore.resetPresentation();
        usePresentationStore.setState({
            globalPrompt: project.globalPrompt,
            negativePrompt: project.negativePrompt,
            aspectRatio: project.aspectRatio,
            templateImages: project.templateImages,
            selectedTemplate: project.selectedTemplate,
            slides: project.slides,
            pptxExportMode: project.pptxExportMode || 'hybrid_editable',
            currentStep: project.selectedTemplate ? 3 : project.templateImages.length > 0 ? 2 : 1,
        });
        setActiveProjectId(project.id);
        onOpenProject();
    };

    const handleDelete = (id: string) => {
        if (confirmDeleteId === id) {
            deleteProject(id);
            setConfirmDeleteId(null);
        } else {
            setConfirmDeleteId(id);
            // Auto-clear after 3 seconds
            setTimeout(() => setConfirmDeleteId(null), 3000);
        }
    };

    const handleRename = (id: string) => {
        if (editName.trim()) {
            renameProject(id, editName.trim());
        }
        setEditingId(null);
        setEditName('');
    };

    const formatDate = (ts: number) => {
        const d = new Date(ts);
        const now = new Date();
        const diff = now.getTime() - d.getTime();
        const minutes = Math.floor(diff / 60000);
        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        if (days < 7) return `${days}d ago`;
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    if (!isLoaded) return null;

    return (
        <div style={{ maxWidth: 960, margin: '0 auto', padding: '48px 24px', animation: 'fade-in 0.4s ease-out' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 36 }}>
                <div>
                    <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 6 }}>
                        Your <span className="glow-text">Projects</span>
                    </h1>
                    <p style={{ color: 'var(--color-text-secondary)', fontSize: 14 }}>
                        {projects.length} project{projects.length !== 1 ? 's' : ''} saved locally
                    </p>
                </div>
                <button
                    className="btn-primary"
                    onClick={handleNewProject}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '12px 20px',
                        fontSize: 14,
                    }}
                >
                    <Plus size={16} />
                    New Presentation
                </button>
            </div>

            {/* Empty State */}
            {projects.length === 0 && (
                <div
                    className="glass-panel"
                    style={{
                        padding: '64px 24px',
                        textAlign: 'center',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 16,
                    }}
                >
                    <div
                        style={{
                            width: 72,
                            height: 72,
                            borderRadius: 16,
                            background: 'linear-gradient(135deg, rgba(0,212,255,0.1), rgba(59,130,246,0.1))',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '1px solid rgba(0,212,255,0.15)',
                        }}
                    >
                        <FolderOpen size={32} style={{ color: 'var(--color-text-muted)' }} />
                    </div>
                    <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--color-text-primary)' }}>
                        No projects yet
                    </h2>
                    <p style={{ color: 'var(--color-text-muted)', fontSize: 14, maxWidth: 360 }}>
                        Create your first presentation and it will appear here for easy access.
                    </p>
                    <button
                        className="btn-primary"
                        onClick={handleNewProject}
                        style={{ marginTop: 8, padding: '10px 24px', fontSize: 14 }}
                    >
                        <Plus size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }} />
                        Create First Presentation
                    </button>
                </div>
            )}

            {/* Project Grid */}
            {projects.length > 0 && (
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                        gap: 16,
                    }}
                >
                    {projects.map((project) => {
                        const slideCount = project.slides.length;
                        const generatedCount = project.slides.filter((s) => s.image_url).length;
                        const isConfirmingDelete = confirmDeleteId === project.id;

                        return (
                            <div
                                key={project.id}
                                className="glass-panel"
                                style={{
                                    overflow: 'hidden',
                                    transition: 'all 0.2s ease',
                                    cursor: 'pointer',
                                    position: 'relative',
                                }}
                                onClick={() => handleOpenProject(project)}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.borderColor = 'var(--color-accent-cyan)';
                                    e.currentTarget.style.boxShadow = '0 0 16px rgba(0,212,255,0.1)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.borderColor = '';
                                    e.currentTarget.style.boxShadow = '';
                                }}
                            >
                                {/* Thumbnail */}
                                <div
                                    style={{
                                        aspectRatio: '16/9',
                                        background: 'var(--color-bg-primary)',
                                        borderBottom: '1px solid var(--color-border-subtle)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        overflow: 'hidden',
                                    }}
                                >
                                    {project.thumbnailUrl ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                            src={project.thumbnailUrl}
                                            alt={project.name}
                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                        />
                                    ) : (
                                        <ImageIcon size={32} style={{ color: 'var(--color-text-muted)' }} />
                                    )}
                                </div>

                                {/* Info */}
                                <div style={{ padding: '12px 14px' }}>
                                    {/* Name (editable) */}
                                    {editingId === project.id ? (
                                        <div
                                            style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 6 }}
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <input
                                                className="input-field"
                                                value={editName}
                                                onChange={(e) => setEditName(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') handleRename(project.id);
                                                    if (e.key === 'Escape') { setEditingId(null); setEditName(''); }
                                                }}
                                                autoFocus
                                                style={{ fontSize: 13, padding: '4px 8px', flex: 1 }}
                                            />
                                            <button
                                                onClick={() => handleRename(project.id)}
                                                style={{
                                                    background: 'none',
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                    color: 'var(--color-accent-green)',
                                                    padding: 2,
                                                }}
                                            >
                                                <Check size={14} />
                                            </button>
                                            <button
                                                onClick={() => { setEditingId(null); setEditName(''); }}
                                                style={{
                                                    background: 'none',
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                    color: 'var(--color-text-muted)',
                                                    padding: 2,
                                                }}
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                    ) : (
                                        <h3
                                            style={{
                                                fontSize: 14,
                                                fontWeight: 600,
                                                color: 'var(--color-text-primary)',
                                                marginBottom: 6,
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap',
                                            }}
                                        >
                                            {project.name}
                                        </h3>
                                    )}

                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 11, color: 'var(--color-text-muted)' }}>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                                                <Layers size={11} />
                                                {generatedCount}/{slideCount}
                                            </span>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                                                <Clock size={11} />
                                                {formatDate(project.updatedAt)}
                                            </span>
                                        </div>

                                        {/* Actions */}
                                        <div
                                            style={{ display: 'flex', alignItems: 'center', gap: 2 }}
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <button
                                                onClick={() => {
                                                    setEditingId(project.id);
                                                    setEditName(project.name);
                                                }}
                                                title="Rename"
                                                style={{
                                                    background: 'none',
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                    color: 'var(--color-text-muted)',
                                                    padding: 4,
                                                    borderRadius: 4,
                                                    transition: 'color 0.2s',
                                                }}
                                                onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-accent-cyan)'; }}
                                                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-muted)'; }}
                                            >
                                                <Pencil size={12} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(project.id)}
                                                title={isConfirmingDelete ? 'Click again to confirm' : 'Delete'}
                                                style={{
                                                    background: 'none',
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                    color: isConfirmingDelete ? 'var(--color-accent-red)' : 'var(--color-text-muted)',
                                                    padding: 4,
                                                    borderRadius: 4,
                                                    transition: 'color 0.2s',
                                                }}
                                                onMouseEnter={(e) => {
                                                    if (!isConfirmingDelete) e.currentTarget.style.color = 'var(--color-accent-red)';
                                                }}
                                                onMouseLeave={(e) => {
                                                    if (!isConfirmingDelete) e.currentTarget.style.color = 'var(--color-text-muted)';
                                                }}
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
