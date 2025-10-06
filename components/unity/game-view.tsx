'use client';

import dynamic from 'next/dynamic';
import { useEffect } from 'react';
import { useUnityContext, Unity } from 'react-unity-webgl';
import { AddArenaCoins, AddGamePlayedCount, AddTrophies } from '@/lib/playfab/playfab';
import styles from './game.module.css';
import { useRouter } from 'next/navigation';
import { useUnitySession } from '@/context/UnitySessionContext';
import { usePlayTimeSession } from '@/context/PlayTimeContext';

interface PlayGameProps {
    Id?: string;
    Name?: string;
}

interface Event {
    eventName?: string;
    rewards?: {
        arenaCoins?: number;
        trophies?: number;
    };
}

const GameView: React.FC<PlayGameProps> = ({ Id, Name }) => {
    const router = useRouter();
    const { setIsUnityLoaded } = useUnitySession();
    const { isExpired } = usePlayTimeSession();

    const {
        unityProvider,
        isLoaded,
        addEventListener,
        removeEventListener,
    } = useUnityContext({
        loaderUrl: `/games/${Id}/Build/${Name}.loader.js`,
        dataUrl: `/games/${Id}/Build/${Name}.data`,
        frameworkUrl: `/games/${Id}/Build/${Name}.framework.js`,
        codeUrl: `/games/${Id}/Build/${Name}.wasm`,
        streamingAssetsUrl: `games/${Id}/StreamingAssets`,
    });

    useEffect(() => {
        const handleMessage = (message: any) => {
            try {
                const event: Event = JSON.parse(message);
                const ticket = sessionStorage.getItem('playfabSessionTicket');
                const titleId = process.env.NEXT_PUBLIC_PLAYFAB_TITLE_ID ?? '';
                if (!ticket || !titleId) return;

                if (event.eventName === 'ended') {
                    AddGamePlayedCount(ticket, titleId);
                    AddTrophies(ticket, titleId, event.rewards?.trophies ?? 0);
                    AddArenaCoins(ticket, titleId, event.rewards?.arenaCoins ?? 0);
                }
            } catch (error) {
                console.error('Failed to parse Unity message:', error);
            }
        };


        const handleBlur = () => {
            setIsUnityLoaded(false);
        };
        const handleFocus = () => {
            setIsUnityLoaded(true);
        };

        if (isExpired) {
            console.log('Play time expired, redirecting to dashboard');
            router.push('/dashboard');
            return;
        }

        if (!isLoaded) {
            setIsUnityLoaded(false);
        } else {
            setIsUnityLoaded(true);
            addEventListener('OnMessage', handleMessage);
        }

        window.addEventListener('focus', handleFocus);
        window.addEventListener('blur', handleBlur);

        return () => {
            removeEventListener('OnMessage', handleMessage);
            window.removeEventListener('blur', handleBlur);
            window.removeEventListener('focus', handleFocus);
            setIsUnityLoaded(false);
        };
    }, [isLoaded, isExpired, router]);

    const handleExit = () => {
        setIsUnityLoaded(false);
        router.push(`/arena/${Id}`);
    };

    return (
        <div style={{ width: '100%', height: '100vh', position: 'relative', backgroundColor: '#001f3f' }}>
            <Unity
                unityProvider={unityProvider}
                style={{
                    width: '100%',
                    height: '100%',
                }}
            />
            <button className={styles.backButton} onClick={handleExit}>
                ← Back
            </button>
        </div>
    );
};

export default dynamic(() => Promise.resolve(GameView), { ssr: false });
