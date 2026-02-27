'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2 } from 'lucide-react';
import { usePresentationStore } from '@/store/presentationStore';
import { useCostStore } from '@/store/costStore';
import { useToast } from './Toast';
import type { ChatMessage } from '@/lib/types';

export default function RefinementChat() {
    const { chatMessages, addChatMessage, slides, activeSlideIndex, updateSlide } = usePresentationStore();
    const { addCost } = useCostStore();
    const { showToast } = useToast();
    const [message, setMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const currentSlide = slides[activeSlideIndex];

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatMessages]);

    const handleSend = async () => {
        if (!message.trim() || isSending || !currentSlide?.image_url) return;

        const userMsg: ChatMessage = {
            id: `${Date.now()}-user`,
            role: 'user',
            content: message,
            timestamp: Date.now(),
        };
        addChatMessage(userMsg);
        setMessage('');
        setIsSending(true);

        try {
            const res = await fetch('/api/refine', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    currentImageBase64: currentSlide.image_url.replace(/^data:image\/\w+;base64,/, ''),
                    chatHistory: chatMessages.map(m => ({ role: m.role, content: m.content })),
                    newMessage: message,
                }),
            });

            if (!res.ok) {
                const data = await res.json();
                if (res.status === 400 || res.status === 403) {
                    showToast('warning', 'Safety Policy', data.error || 'Cannot process this request.');
                    return;
                }
                throw new Error(data.error || 'Refinement failed');
            }

            const data = await res.json();

            // Update slide image
            if (data.imageBase64) {
                updateSlide(activeSlideIndex, {
                    image_url: `data:image/png;base64,${data.imageBase64}`,
                });
            }

            // Add assistant message
            const assistantMsg: ChatMessage = {
                id: `${Date.now()}-assistant`,
                role: 'assistant',
                content: data.text || 'Updated the image based on your request.',
                timestamp: Date.now(),
                imageUrl: data.imageBase64 ? `data:image/png;base64,${data.imageBase64}` : undefined,
            };
            addChatMessage(assistantMsg);
            if (data.imageBase64) {
                addCost('nano_banana_image', 1);
            }
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'An error occurred';
            showToast('error', 'Refinement Error', msg);
        } finally {
            setIsSending(false);
            inputRef.current?.focus();
        }
    };

    return (
        <div
            className="glass-panel"
            style={{
                display: 'flex',
                flexDirection: 'column',
                height: 280,
                marginTop: 16,
            }}
        >
            {/* Header */}
            <div
                style={{
                    padding: '10px 14px',
                    borderBottom: '1px solid var(--color-border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: 12,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    color: 'var(--color-text-secondary)',
                }}
            >
                <Bot size={14} className="glow-text" />
                Conversational Refinement
            </div>

            {/* Messages */}
            <div
                style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: 12,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                }}
            >
                {chatMessages.length === 0 && (
                    <div style={{ color: 'var(--color-text-muted)', fontSize: 13, textAlign: 'center', marginTop: 20 }}>
                        Chat with the AI to refine your slide. e.g. &quot;Make the background darker&quot; or &quot;Add a gradient effect&quot;
                    </div>
                )}
                {chatMessages.map((msg) => (
                    <div
                        key={msg.id}
                        style={{
                            display: 'flex',
                            gap: 8,
                            alignItems: 'flex-start',
                            justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                        }}
                    >
                        {msg.role === 'assistant' && (
                            <div
                                style={{
                                    width: 24,
                                    height: 24,
                                    borderRadius: 6,
                                    background: 'linear-gradient(135deg, var(--color-accent-cyan), var(--color-accent-blue))',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                }}
                            >
                                <Bot size={12} style={{ color: 'var(--color-bg-primary)' }} />
                            </div>
                        )}
                        <div
                            style={{
                                padding: '8px 12px',
                                borderRadius: 10,
                                fontSize: 13,
                                lineHeight: 1.5,
                                maxWidth: '80%',
                                background: msg.role === 'user' ? 'rgba(0,212,255,0.12)' : 'var(--color-bg-card)',
                                border: `1px solid ${msg.role === 'user' ? 'rgba(0,212,255,0.2)' : 'var(--color-border-subtle)'}`,
                                color: 'var(--color-text-primary)',
                            }}
                        >
                            {msg.content}
                        </div>
                        {msg.role === 'user' && (
                            <div
                                style={{
                                    width: 24,
                                    height: 24,
                                    borderRadius: 6,
                                    background: 'var(--color-bg-card)',
                                    border: '1px solid var(--color-border-default)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                }}
                            >
                                <User size={12} style={{ color: 'var(--color-text-muted)' }} />
                            </div>
                        )}
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div
                style={{
                    padding: '10px 12px',
                    borderTop: '1px solid var(--color-border-subtle)',
                    display: 'flex',
                    gap: 8,
                }}
            >
                <input
                    ref={inputRef}
                    className="input-field"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                    placeholder={currentSlide?.image_url ? 'Describe changes to your slide...' : 'Generate a slide first...'}
                    disabled={!currentSlide?.image_url || isSending}
                    style={{ fontSize: 13 }}
                />
                <button
                    className="btn-primary"
                    onClick={handleSend}
                    disabled={!message.trim() || isSending || !currentSlide?.image_url}
                    style={{ padding: '8px 12px', flexShrink: 0 }}
                >
                    {isSending ? <Loader2 size={16} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Send size={16} />}
                </button>
            </div>
        </div>
    );
}
