import { NextResponse } from 'next/server';

// This route aggregates usage costs from Supabase
// Currently returns zeros since Supabase is not configured
// Will be wired up when Supabase credentials are provided

export async function GET() {
    try {
        // TODO: When Supabase is configured, query usage_logs table
        // const { data, error } = await supabase
        //   .from('usage_logs')
        //   .select('estimated_cost, timestamp')
        //   .eq('user_id', userId);

        // For now, return zeros
        return NextResponse.json({
            daily: 0,
            weekly: 0,
            monthly: 0,
        });
    } catch (error: unknown) {
        console.error('Usage stats error:', error);
        return NextResponse.json({
            daily: 0,
            weekly: 0,
            monthly: 0,
        });
    }
}
