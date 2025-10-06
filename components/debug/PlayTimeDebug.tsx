'use client';

import React from 'react';
import { usePlayTimeSession } from '@/context/PlayTimeContext';

export default function PlayTimeDebug() {
    const { 
        timeLeft, 
        isExpired, 
        sessionActive, 
        playSessionDuration, 
        elapsedTime, 
        resetPlayTime,
        strictMode,
        setStrictMode 
    } = usePlayTimeSession();

    const formatTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
        const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        return `${h}:${m}:${s}`;
    };

    return (
        <div style={{
            position: 'fixed',
            top: '10px',
            right: '10px',
            backgroundColor: 'rgba(0,0,0,0.8)',
            color: 'white',
            padding: '12px',
            borderRadius: '8px',
            fontSize: '12px',
            fontFamily: 'monospace',
            zIndex: 10000,
            minWidth: '200px',
            lineHeight: 1.4,
        }}>
            <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>PlayTime Debug</div>
            <div>Session Active: {sessionActive ? '✅' : '❌'}</div>
            <div>Expired: {isExpired ? '✅' : '❌'}</div>
            <div>Strict Mode: {strictMode ? '✅' : '❌'}</div>
            <div>Elapsed: {formatTime(elapsedTime)}</div>
            <div>Session Duration: {formatTime(playSessionDuration)}</div>
            <div>Time Left: {formatTime(timeLeft)}</div>
            <div style={{ marginTop: '8px' }}>
                <button 
                    onClick={() => setStrictMode(!strictMode)}
                    style={{ 
                        marginRight: '4px', 
                        padding: '2px 6px', 
                        fontSize: '10px',
                        backgroundColor: '#333',
                        color: 'white',
                        border: '1px solid #666',
                        borderRadius: '3px'
                    }}
                >
                    Toggle Strict
                </button>
                <button 
                    onClick={resetPlayTime}
                    style={{ 
                        padding: '2px 6px', 
                        fontSize: '10px',
                        backgroundColor: '#d32f2f',
                        color: 'white',
                        border: '1px solid #666',
                        borderRadius: '3px'
                    }}
                >
                    Reset Time
                </button>
            </div>
        </div>
    );
}
