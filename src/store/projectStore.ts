import { create } from 'zustand';
import { getAllProjects, putProject, deleteProjectFromDB } from '@/lib/idb';
import type { Slide, AspectRatio, TemplateImage } from '@/lib/types';

export interface SavedProject {
    id: string;
    name: string;
    createdAt: number;
    updatedAt: number;
    globalPrompt: string;
    negativePrompt: string;
    aspectRatio: AspectRatio;
    templateImages: TemplateImage[];
    selectedTemplate: TemplateImage | null;
    slides: Slide[];
    /** First slide thumbnail for the card preview */
    thumbnailUrl: string;
}

type SaveProjectInput = Omit<SavedProject, 'id' | 'createdAt' | 'updatedAt' | 'thumbnailUrl'> & {
    thumbnailUrl?: string;
};

interface ProjectState {
    projects: SavedProject[];
    activeProjectId: string | null;
    isLoaded: boolean;

    loadProjects: () => Promise<void>;
    saveProject: (name: string, data: SaveProjectInput) => Promise<string>;
    updateProject: (id: string, data: Partial<Omit<SavedProject, 'id' | 'createdAt'>>) => Promise<void>;
    deleteProject: (id: string) => Promise<void>;
    setActiveProjectId: (id: string | null) => void;
    renameProject: (id: string, name: string) => Promise<void>;
}

function generateId(): string {
    return `proj-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
    projects: [],
    activeProjectId: null,
    isLoaded: false,

    loadProjects: async () => {
        const projects = await getAllProjects<SavedProject>();
        // Sort by most recently updated
        projects.sort((a, b) => b.updatedAt - a.updatedAt);
        set({ projects, isLoaded: true });
    },

    saveProject: async (name, data) => {
        const { projects } = get();
        const now = Date.now();

        // Check if we're updating an existing project
        const existing = projects.find((p) => p.id === get().activeProjectId);
        if (existing) {
            const updated: SavedProject = {
                ...existing,
                ...data,
                name,
                updatedAt: now,
                thumbnailUrl: data.thumbnailUrl || existing.thumbnailUrl,
            };
            await putProject(updated);
            const newList = projects.map((p) => (p.id === existing.id ? updated : p));
            set({ projects: newList });
            return existing.id;
        }

        // Create new project
        const id = generateId();
        const project: SavedProject = {
            id,
            name,
            createdAt: now,
            updatedAt: now,
            globalPrompt: data.globalPrompt,
            negativePrompt: data.negativePrompt,
            aspectRatio: data.aspectRatio,
            templateImages: data.templateImages,
            selectedTemplate: data.selectedTemplate,
            slides: data.slides,
            thumbnailUrl: data.thumbnailUrl || '',
        };
        await putProject(project);
        set({ projects: [project, ...projects], activeProjectId: id });
        return id;
    },

    updateProject: async (id, data) => {
        const { projects } = get();
        const existing = projects.find((p) => p.id === id);
        if (!existing) return;
        const updated = { ...existing, ...data, updatedAt: Date.now() };
        await putProject(updated);
        set({ projects: projects.map((p) => (p.id === id ? updated : p)) });
    },

    deleteProject: async (id) => {
        const { projects, activeProjectId } = get();
        await deleteProjectFromDB(id);
        set({
            projects: projects.filter((p) => p.id !== id),
            activeProjectId: activeProjectId === id ? null : activeProjectId,
        });
    },

    setActiveProjectId: (id) => set({ activeProjectId: id }),

    renameProject: async (id, name) => {
        const { projects } = get();
        const existing = projects.find((p) => p.id === id);
        if (!existing) return;
        const updated = { ...existing, name, updatedAt: Date.now() };
        await putProject(updated);
        set({ projects: projects.map((p) => (p.id === id ? updated : p)) });
    },
}));
