'use client';

import { useState, useEffect, createContext, useContext, useCallback, type ReactNode } from 'react';
import { AlertTriangle, Shield, CheckCircle, X, Info } from 'lucide-react';

type ToastType = 'error' | 'warning' | 'success' | 'info';

interface Toast {
    id: string;
    type: ToastType;
    title: string;
    message: string;
}

interface ToastContextType {
    showToast: (type: ToastType, title: string, message: string) => void;
}

const ToastContext = createContext<ToastContextType>({ showToast: () => { } });

export function useToast() {
    return useContext(ToastContext);
}

const iconMap = {
    error: AlertTriangle,
    warning: Shield,
    success: CheckCircle,
    info: Info,
};

const colorMap = {
    error: { bg: 'rgba(239, 68, 68, 0.15)', border: '#ef4444', text: '#fca5a5' },
    warning: { bg: 'rgba(245, 158, 11, 0.15)', border: '#f59e0b', text: '#fcd34d' },
    success: { bg: 'rgba(16, 185, 129, 0.15)', border: '#10b981', text: '#6ee7b7' },
    info: { bg: 'rgba(0, 212, 255, 0.15)', border: '#00d4ff', text: '#67e8f9' },
};

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
    const Icon = iconMap[toast.type];
    const colors = colorMap[toast.type];

    useEffect(() => {
        const timer = setTimeout(() => onDismiss(toast.id), 5000);
        return () => clearTimeout(timer);
    }, [toast.id, onDismiss]);

    return (
        <div
            className="toast"
            style={{
                position: 'relative',
                background: colors.bg,
                border: `1px solid ${colors.border}`,
                borderRadius: '10px',
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                maxWidth: '420px',
                backdropFilter: 'blur(12px)',
                marginBottom: '8px',
            }}
        >
            <Icon size={18} style={{ color: colors.border, flexShrink: 0, marginTop: 2 }} />
            <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 13, color: colors.text, marginBottom: 2 }}>
                    {toast.title}
                </div>
                <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                    {toast.message}
                </div>
            </div>
            <button
                onClick={() => onDismiss(toast.id)}
                style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--color-text-secondary)',
                    cursor: 'pointer',
                    padding: 2,
                    flexShrink: 0,
                }}
            >
                <X size={14} />
            </button>
        </div>
    );
}

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const showToast = useCallback((type: ToastType, title: string, message: string) => {
        const id = `${Date.now()}-${Math.random().toString(36).substring(2, 5)}`;
        setToasts((prev) => [...prev, { id, type, title, message }]);
    }, []);

    const dismissToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <div
                style={{
                    position: 'fixed',
                    bottom: 24,
                    right: 24,
                    zIndex: 9999,
                    display: 'flex',
                    flexDirection: 'column-reverse',
                    gap: 8,
                }}
            >
                {toasts.map((toast) => (
                    <ToastItem key={toast.id} toast={toast} onDismiss={dismissToast} />
                ))}
            </div>
        </ToastContext.Provider>
    );
}
