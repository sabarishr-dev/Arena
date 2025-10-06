'use client';

import React, {
    createContext,
    useContext,
    useEffect,
    useRef,
    useState,
} from 'react';
import { useUnitySession } from './UnitySessionContext';
import {
    getUserDataFromPlayFab,
    updatePlayFabUserData,
} from '@/lib/playfab/playfab';

interface PlayTimeContextType {
    timeLeft: number;
    isExpired: boolean;
    startSession: () => Promise<void>;
    stopSession: () => void;
    sessionActive: boolean;
    strictMode: boolean;
    setStrictMode: (val: boolean) => void;
    playSessionDuration: number;
    elapsedTime: number;
    resetPlayTime: () => Promise<void>;
}

const PlayTimeContext = createContext<PlayTimeContextType | undefined>(
    undefined
);

export const usePlayTimeSession = () => {
    const ctx = useContext(PlayTimeContext);
    if (!ctx) throw new Error('usePlayTime must be used within PlayTimeProvider');
    return ctx;
};

const SECONDS_PER_DAY = parseInt(process.env.NEXT_PUBLIC_DAILY_PLAYTIME_LIMIT || '0');

export const PlayTimeProvider = ({ children }: { children: React.ReactNode }) => {
    const { isUnityLoaded } = useUnitySession();
    const [timeLeft, setTimeLeft] = useState<number>(SECONDS_PER_DAY);
    const [playSessionDuration, setPlaySessionDuration] = useState(0);
    const [isExpired, setIsExpired] = useState(false);
    const [sessionActive, setSessionActive] = useState(false);
    const [elapsedTime, setElapsedTime] = useState(0);
    const [strictMode, setStrictMode] = useState(true);

    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const sessionStartTime = useRef<number | null>(null);
    const autoUpdateIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const [sessionTicket, setSessionTicket] = useState<string | null>(null);


    useEffect(() => {
        if (typeof window !== 'undefined') {
            const ticket = sessionStorage.getItem('playfabSessionTicket');
            setSessionTicket(ticket);
        }
    }, []);
    const titleId = process.env.NEXT_PUBLIC_PLAYFAB_TITLE_ID ?? '';

    // Load playtime from PlayFab once
    useEffect(() => {
        const loadPlayTime = async () => {
            if (!sessionTicket || !titleId) return;

            try {
                const response = await getUserDataFromPlayFab(sessionTicket, titleId);

                // Use UTC date for consistent timezone handling
                const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

                const savedDate = response?.data?.Data?.playtime_date?.Value;
                const usedToday = parseInt(response?.data?.Data?.playtime_seconds?.Value || '0');

                console.log('PlayFab data loaded:', { savedDate, today, usedToday });

                if (savedDate !== today) {
                    // New day - reset everything
                    console.log('New day detected, resetting playtime');
                    setPlaySessionDuration(0);
                    setTimeLeft(SECONDS_PER_DAY);
                    setIsExpired(false);
                    
                    // Update PlayFab with reset data
                    await updatePlayFabUserData(sessionTicket, titleId, {
                        playtime_seconds: '0',
                        playtime_date: today,
                    });
                    console.log('PlayFab reset completed for new day');
                } else {
                    // Same day - restore previous state
                    const remaining = Math.max(SECONDS_PER_DAY - usedToday, 0);
                    setPlaySessionDuration(usedToday);
                    setTimeLeft(remaining);
                    setIsExpired(remaining <= 0);
                    console.log('Same day, restored state:', { usedToday, remaining });
                }
            } catch (err) {
                console.error('Failed to load PlayFab playtime:', err);
                // Fallback: assume fresh start if API fails
                setPlaySessionDuration(0);
                setTimeLeft(SECONDS_PER_DAY);
                setIsExpired(false);
            }
        };

        loadPlayTime();
    }, [sessionTicket, titleId]);

    const updatePlayTimeToPlayFab = async (usedSeconds: number) => {
        if (!sessionTicket || !titleId) return;

        const totalUsed = Math.min(SECONDS_PER_DAY, playSessionDuration + usedSeconds);
        const remaining = Math.max(SECONDS_PER_DAY - totalUsed, 0);
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

        console.log('Updating PlayFab:', { usedSeconds, playSessionDuration, totalUsed, remaining, today });

        try {
            const result = await updatePlayFabUserData(sessionTicket, titleId, {
                playtime_seconds: totalUsed.toString(),
                playtime_date: today,
            });

            if (result.error) {
                console.error('PlayFab API error:', result.error);
                return;
            }

            console.log('PlayFab updated successfully:', { totalUsed, remaining });
            setPlaySessionDuration(totalUsed);
            setTimeLeft(remaining);

            if (remaining <= 0) {
                setIsExpired(true);
                stopSession();
            }
        } catch (err) {
            console.error('Failed to update playtime to PlayFab:', err);
            // Don't update local state if API call fails to prevent desync
        }
    };

    const startSession = async () => {
        if (isExpired || sessionActive) return;

        console.log('Starting play session');
        setSessionActive(true);
        sessionStartTime.current = Date.now();
        setElapsedTime(0);

        // Main timer interval (every 1 second)
        intervalRef.current = setInterval(() => {
            if (!sessionStartTime.current) return;

            const now = Date.now();
            const elapsed = Math.floor((now - sessionStartTime.current) / 1000);
            setElapsedTime(elapsed);

            const totalUsed = playSessionDuration + elapsed;
            const remaining = Math.max(SECONDS_PER_DAY - totalUsed, 0);
            setTimeLeft(remaining);

            if (strictMode && remaining <= 0) {
                console.log('Play time expired, stopping session');
                stopSession();
            }
        }, 1000);

        // Auto-update PlayFab every 1 minute (60 seconds)
        autoUpdateIntervalRef.current = setInterval(() => {
            if (sessionStartTime.current) {
                const now = Date.now();
                const elapsed = Math.floor((now - sessionStartTime.current) / 1000);
                if (elapsed > 0) {
                    console.log('Auto-updating PlayFab (1 minute interval)');
                    updatePlayTimeToPlayFab(elapsed);
                }
            }
        }, 60000); // 60 seconds = 1 minute
    };

    const stopSession = async () => {
        console.log('Stopping play session');
        
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }

        if (autoUpdateIntervalRef.current) {
            clearInterval(autoUpdateIntervalRef.current);
            autoUpdateIntervalRef.current = null;
        }

        if (sessionStartTime.current) {
            const now = Date.now();
            const elapsed = Math.floor((now - sessionStartTime.current) / 1000);
            console.log('Session elapsed time:', elapsed, 'seconds');
            
            if (elapsed > 0) {
                // Use traditional PlayFab update for now to avoid conflicts
                updatePlayTimeToPlayFab(elapsed);
            }
            sessionStartTime.current = null;
        }

        setElapsedTime(0);
        setSessionActive(false);
    };

    // start/stop session with Unity state
    useEffect(() => {
        if (isUnityLoaded && !sessionActive && !isExpired) {
            console.log('Unity loaded, starting session');
            startSession();
        }

        if (!isUnityLoaded && sessionActive) {
            console.log('Unity unloaded, stopping session');
            stopSession();
        }
    }, [isUnityLoaded, sessionActive, isExpired]);

    const resetPlayTime = async () => {
        if (!sessionTicket || !titleId) return;
        
        console.log('Manually resetting play time');
        const today = new Date().toISOString().split('T')[0];
        
        try {
            await updatePlayFabUserData(sessionTicket, titleId, {
                playtime_seconds: '0',
                playtime_date: today,
            });
            
            setPlaySessionDuration(0);
            setTimeLeft(SECONDS_PER_DAY);
            setIsExpired(false);
            console.log('Play time reset successfully');
        } catch (err) {
            console.error('Failed to reset play time:', err);
        }
    };

    return (
        <PlayTimeContext.Provider
            value={{
                timeLeft,
                isExpired,
                startSession,
                stopSession,
                sessionActive,
                strictMode,
                setStrictMode,
                playSessionDuration,
                elapsedTime,
                resetPlayTime,
            }}
        >
            {children}
        </PlayTimeContext.Provider>
    );
};
