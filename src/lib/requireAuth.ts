import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from './auth';

export async function requireAuth() {
    if (process.env.SKIP_AUTH === 'true') {
        return { error: null, session: { user: { id: 'dev-user', name: 'Dev User', email: 'dev@localhost' }, expires: '2999-12-31T23:59:59.999Z' } };
    }
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), session: null };
    }
    return { error: null, session };
}
