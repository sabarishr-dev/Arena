import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../pages/api/auth/[...nextauth]';
import { updatePlayFabUserData, getUserDataFromPlayFab } from '@/lib/playfab/playfab';

interface PlayTimeValidationRequest {
    sessionStartTime: number;
    sessionEndTime: number;
    clientElapsedTime: number;
    gameId: string;
    buildType: 'unity' | 'html';
}

interface PlayTimeValidationResponse {
    success: boolean;
    validatedTime: number;
    error?: string;
    suspicious?: boolean;
}

const SECONDS_PER_DAY = parseInt(process.env.NEXT_PUBLIC_DAILY_PLAYTIME_LIMIT || '0');
const MAX_SESSION_DURATION = 3600; // 1 hour max session
const MIN_SESSION_DURATION = 1; // 1 second min session
const MAX_TIME_DISCREPANCY = 5; // 5 seconds tolerance

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body: PlayTimeValidationRequest = await request.json();
        const { sessionStartTime, sessionEndTime, clientElapsedTime, gameId, buildType } = body;

        // Validate session ticket
        const sessionTicket = request.headers.get('x-playfab-session-ticket');
        const titleId = process.env.NEXT_PUBLIC_PLAYFAB_TITLE_ID;
        
        if (!sessionTicket || !titleId) {
            return NextResponse.json({ error: 'Missing session credentials' }, { status: 400 });
        }

        // Basic validation
        if (!sessionStartTime || !sessionEndTime || !clientElapsedTime || !gameId) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Calculate server-side elapsed time
        const serverElapsedTime = Math.floor((sessionEndTime - sessionStartTime) / 1000);
        
        // Validate session duration
        if (serverElapsedTime > MAX_SESSION_DURATION) {
            console.warn(`Suspicious session duration: ${serverElapsedTime}s for user ${session.user.email}`);
            return NextResponse.json({ 
                success: false, 
                error: 'Session duration too long',
                suspicious: true 
            }, { status: 400 });
        }

        if (serverElapsedTime < MIN_SESSION_DURATION) {
            return NextResponse.json({ 
                success: false, 
                error: 'Session too short' 
            }, { status: 400 });
        }

        // Check time discrepancy between client and server
        const timeDiscrepancy = Math.abs(serverElapsedTime - clientElapsedTime);
        if (timeDiscrepancy > MAX_TIME_DISCREPANCY) {
            console.warn(`Time discrepancy detected: ${timeDiscrepancy}s for user ${session.user.email}`);
            return NextResponse.json({ 
                success: false, 
                error: 'Time validation failed',
                suspicious: true 
            }, { status: 400 });
        }

        // Get current PlayFab data
        const playFabData = await getUserDataFromPlayFab(sessionTicket, titleId);
        const today = new Date().toISOString().split('T')[0];
        const savedDate = playFabData?.data?.Data?.playtime_date?.Value;
        const usedToday = parseInt(playFabData?.data?.Data?.playtime_seconds?.Value || '0');

        // Validate date
        if (savedDate !== today) {
            // New day - start fresh with current session time
            const result = await updatePlayFabUserData(sessionTicket, titleId, {
                playtime_seconds: serverElapsedTime.toString(),
                playtime_date: today,
                last_session_start: sessionStartTime.toString(),
                last_session_end: sessionEndTime.toString(),
                last_game_id: gameId,
                last_build_type: buildType,
            });

            if (result.error) {
                return NextResponse.json({ error: 'Failed to update PlayFab' }, { status: 500 });
            }

            return NextResponse.json({
                success: true,
                validatedTime: serverElapsedTime,
            });
        } else {
            // Same day - add to existing time
            const totalUsed = Math.min(SECONDS_PER_DAY, usedToday + serverElapsedTime);
            
            if (totalUsed > SECONDS_PER_DAY) {
                return NextResponse.json({ 
                    success: false, 
                    error: 'Daily limit exceeded' 
                }, { status: 400 });
            }

            const result = await updatePlayFabUserData(sessionTicket, titleId, {
                playtime_seconds: totalUsed.toString(),
                playtime_date: today,
                last_session_start: sessionStartTime.toString(),
                last_session_end: sessionEndTime.toString(),
                last_game_id: gameId,
                last_build_type: buildType,
            });

            if (result.error) {
                return NextResponse.json({ error: 'Failed to update PlayFab' }, { status: 500 });
            }

            return NextResponse.json({
                success: true,
                validatedTime: serverElapsedTime,
            });
        }

    } catch (error) {
        console.error('Play time validation error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
