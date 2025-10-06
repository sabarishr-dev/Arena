'use client';

import React, { useEffect, useState } from 'react';
import { usePlayTimeSession } from '@/context/PlayTimeContext';
import { useUnitySession } from '@/context/UnitySessionContext';

function formatTime(seconds: number) {
    if (isNaN(seconds) || seconds < 0) seconds = 0;
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
}

const styles = {
    position: 'fixed' as const,
    top: 10,
    left: 100,
    backgroundColor: 'rgba(0,0,0,0.7)',
    color: 'white',
    padding: '8px 14px',
    borderRadius: '8px',
    fontWeight: 'bold',
    fontFamily: 'monospace',
    zIndex: 9999,
    userSelect: 'none' as const,
    pointerEvents: 'none' as const,
    minWidth: '160px',
    textAlign: 'left' as const,
    fontSize: '14px',
    lineHeight: 1.4,
    whiteSpace: 'pre-line' as const,
};

export default function PlayTimer() {
    const { isUnityLoaded } = useUnitySession();
    const { elapsedTime, timeLeft, isExpired, sessionActive } = usePlayTimeSession();

    const [remainingDisplay, setRemainingDisplay] = useState(timeLeft);

    useEffect(() => {
        setRemainingDisplay(timeLeft);
    }, [timeLeft]);

    // Show timer when there's an active session, game loaded, or time has been used
    if (!sessionActive && !isUnityLoaded && elapsedTime === 0) return null;

    return (
        <div style={{
            ...styles,
            backgroundColor: isExpired ? 'rgba(255, 77, 79, 0.9)' : 
                            sessionActive ? 'rgba(0,0,0,0.7)' : 'rgba(255, 193, 7, 0.9)'
        }}>
            {isExpired ? (
                <>
                    ⏰ Time's Up!
                    {'\n'}
                    Come back tomorrow!
                </>
            ) : (
                <>
                    ⏱️ Play Time
                    {'\n'}
                    Elapsed: {formatTime(elapsedTime)}
                    {'\n'}
                    Remaining: {formatTime(remainingDisplay)}
                    {'\n'}
                    Status: {sessionActive ? '🟢 Playing' : '⏸️ Paused'}
                </>
            )}
        </div>
    );
}
