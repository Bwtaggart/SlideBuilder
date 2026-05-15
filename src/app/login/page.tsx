'use client';

import { signIn } from 'next-auth/react';

export default function LoginPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-neutral-950">
            <div className="text-center space-y-6">
                <h1 className="text-3xl font-bold text-white">SlideBuilder</h1>
                <p className="text-neutral-400">Sign in to create presentations</p>
                <button
                    onClick={() => signIn('google', { callbackUrl: '/' })}
                    className="px-6 py-3 bg-white text-neutral-900 rounded-lg font-medium hover:bg-neutral-100 transition-colors"
                >
                    Sign in with Google
                </button>
            </div>
        </div>
    );
}
