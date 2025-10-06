'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUnitySession } from '@/context/UnitySessionContext';
import styles from './html-game.module.css';

interface HTMLGameViewProps {
    Id?: string;
    Name?: string;
}

const HTMLGameView: React.FC<HTMLGameViewProps> = ({ Id, Name }) => {
    const router = useRouter();
    const { setIsUnityLoaded } = useUnitySession();
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const handleBlur = () => {
            setIsUnityLoaded(false);
        };
        const handleFocus = () => {
            setIsUnityLoaded(true);
        };

        // Set Unity loaded state to true when HTML game is loaded
        setIsUnityLoaded(true);

        window.addEventListener('focus', handleFocus);
        window.addEventListener('blur', handleBlur);

        return () => {
            window.removeEventListener('blur', handleBlur);
            window.removeEventListener('focus', handleFocus);
            setIsUnityLoaded(false);
        };
    }, [setIsUnityLoaded]);

    const handleExit = () => {
        setIsUnityLoaded(false);
        router.push(`/arena/${Id}`);
    };

    const handleIframeLoad = () => {
        setIsLoading(false);
        setError(null);
        setIsUnityLoaded(true);
    };

    const handleIframeError = () => {
        setIsLoading(false);
        setError('Failed to load HTML game');
        setIsUnityLoaded(false);
    };

    return (
        <div style={{ width: '100%', height: '100vh', position: 'relative', backgroundColor: '#001f3f' }}>
            {isLoading && (
                <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    color: 'white',
                    fontSize: '18px',
                    zIndex: 5
                }}>
                    Loading HTML game...
                </div>
            )}

            {error && (
                <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    color: '#ff6b6b',
                    fontSize: '18px',
                    textAlign: 'center',
                    zIndex: 5
                }}>
                    <div>{error}</div>
                    <button 
                        onClick={handleExit}
                        className={styles.backButton}
                        style={{ marginTop: '20px' }}
                    >
                        Go Back
                    </button>
                </div>
            )}

            <iframe
                src={`/games/${Id}/HTML/index.html`}
                style={{
                    width: '100%',
                    height: '100%',
                    border: 'none',
                    backgroundColor: '#001f3f'
                }}
                onLoad={handleIframeLoad}
                onError={handleIframeError}
                title={Name}
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            />
            
            <button 
                className={styles.backButton} 
                onClick={handleExit}
                style={{
                    position: 'absolute',
                    top: '16px',
                    right: '16px',
                    zIndex: 10
                }}
            >
                ← Back
            </button>
        </div>
    );
};

export default dynamic(() => Promise.resolve(HTMLGameView), { ssr: false });
