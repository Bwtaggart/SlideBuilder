/**
 * IndexedDB storage helper for SlideBuilder projects.
 * Uses IndexedDB instead of localStorage to handle large base64 image data.
 * Database is namespaced per user for multi-user isolation.
 */
import type { ServiceType } from './types';

const DB_PREFIX = 'slidebuilder';
const DB_VERSION = 3;
const PROJECT_STORE = 'projects';
const COST_EVENTS_STORE = 'cost_events';
const TEMPLATE_STORE = 'templates';

let currentUserId: string | null = null;

export function setIdbUserId(userId: string) {
    currentUserId = userId;
}

function getDbName(): string {
    if (!currentUserId) return DB_PREFIX;
    return `${DB_PREFIX}-${currentUserId}`;
}

export interface CostEventRecord {
    id: string;
    timestamp: number;
    serviceType: ServiceType;
    usageAmount: number;
    cost: number;
}

function openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(getDbName(), DB_VERSION);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            const db = request.result;
            db.onversionchange = () => { db.close(); };
            resolve(db);
        };
        request.onblocked = () => {
            console.warn('IndexedDB upgrade blocked — close other tabs and refresh');
        };
        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(PROJECT_STORE)) {
                db.createObjectStore(PROJECT_STORE, { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains(COST_EVENTS_STORE)) {
                const store = db.createObjectStore(COST_EVENTS_STORE, { keyPath: 'id' });
                store.createIndex('timestamp', 'timestamp', { unique: false });
            }
            if (!db.objectStoreNames.contains(TEMPLATE_STORE)) {
                db.createObjectStore(TEMPLATE_STORE, { keyPath: 'id' });
            }
        };
    });
}

export async function getAllProjects<T>(): Promise<T[]> {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(PROJECT_STORE, 'readonly');
            const store = tx.objectStore(PROJECT_STORE);
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result as T[]);
            request.onerror = () => reject(request.error);
        });
    } catch (e) {
        console.error('IndexedDB getAllProjects error:', e);
        return [];
    }
}

export async function getProject<T>(id: string): Promise<T | undefined> {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(PROJECT_STORE, 'readonly');
            const store = tx.objectStore(PROJECT_STORE);
            const request = store.get(id);
            request.onsuccess = () => resolve(request.result as T | undefined);
            request.onerror = () => reject(request.error);
        });
    } catch (e) {
        console.error('IndexedDB getProject error:', e);
        return undefined;
    }
}

export async function putProject<T extends { id: string }>(project: T): Promise<void> {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(PROJECT_STORE, 'readwrite');
            const store = tx.objectStore(PROJECT_STORE);
            const request = store.put(project);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    } catch (e) {
        console.error('IndexedDB putProject error:', e);
    }
}

export async function deleteProjectFromDB(id: string): Promise<void> {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(PROJECT_STORE, 'readwrite');
            const store = tx.objectStore(PROJECT_STORE);
            const request = store.delete(id);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    } catch (e) {
        console.error('IndexedDB deleteProject error:', e);
    }
}

export async function putCostEvent(event: CostEventRecord): Promise<void> {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(COST_EVENTS_STORE, 'readwrite');
            const store = tx.objectStore(COST_EVENTS_STORE);
            const request = store.put(event);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    } catch (e) {
        console.error('IndexedDB putCostEvent error:', e);
    }
}

export async function getCostEventsSince(sinceTimestamp: number): Promise<CostEventRecord[]> {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(COST_EVENTS_STORE, 'readonly');
            const store = tx.objectStore(COST_EVENTS_STORE);
            const index = store.index('timestamp');
            const range = IDBKeyRange.lowerBound(sinceTimestamp);
            const request = index.getAll(range);
            request.onsuccess = () => resolve(request.result as CostEventRecord[]);
            request.onerror = () => reject(request.error);
        });
    } catch (e) {
        console.error('IndexedDB getCostEventsSince error:', e);
        return [];
    }
}

export async function deleteCostEventsBefore(cutoffTimestamp: number): Promise<void> {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(COST_EVENTS_STORE, 'readwrite');
            const store = tx.objectStore(COST_EVENTS_STORE);
            const index = store.index('timestamp');
            const range = IDBKeyRange.upperBound(cutoffTimestamp, true);
            const cursorRequest = index.openCursor(range);

            cursorRequest.onsuccess = () => {
                const cursor = cursorRequest.result;
                if (cursor) {
                    cursor.delete();
                    cursor.continue();
                    return;
                }
                resolve();
            };
            cursorRequest.onerror = () => reject(cursorRequest.error);
        });
    } catch (e) {
        console.error('IndexedDB deleteCostEventsBefore error:', e);
    }
}

export interface PersistedTemplate {
    id: string;
    base64: string;
    url?: string;
    createdAt: number;
}

export async function getAllTemplates(): Promise<PersistedTemplate[]> {
    try {
        const db = await openDB();
        if (!db.objectStoreNames.contains(TEMPLATE_STORE)) return [];
        return new Promise((resolve, reject) => {
            const tx = db.transaction(TEMPLATE_STORE, 'readonly');
            const store = tx.objectStore(TEMPLATE_STORE);
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result as PersistedTemplate[]);
            request.onerror = () => reject(request.error);
        });
    } catch (e) {
        console.error('IndexedDB getAllTemplates error:', e);
        return [];
    }
}

export async function putTemplate(template: PersistedTemplate): Promise<void> {
    try {
        const db = await openDB();
        if (!db.objectStoreNames.contains(TEMPLATE_STORE)) return;
        return new Promise((resolve, reject) => {
            const tx = db.transaction(TEMPLATE_STORE, 'readwrite');
            const store = tx.objectStore(TEMPLATE_STORE);
            const request = store.put(template);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    } catch (e) {
        console.error('IndexedDB putTemplate error:', e);
    }
}

export async function deleteTemplate(id: string): Promise<void> {
    try {
        const db = await openDB();
        if (!db.objectStoreNames.contains(TEMPLATE_STORE)) return;
        return new Promise((resolve, reject) => {
            const tx = db.transaction(TEMPLATE_STORE, 'readwrite');
            const store = tx.objectStore(TEMPLATE_STORE);
            const request = store.delete(id);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    } catch (e) {
        console.error('IndexedDB deleteTemplate error:', e);
    }
}
