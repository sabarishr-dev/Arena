'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import SignIn from '@/components/auth/SignIn';
import styles from '../arena.module.css';
import { usePlayTimeSession } from '@/context/PlayTimeContext';
import Popup from '@/components/popup/Popup'; 

interface Game {
    id: number;
    buildName: string;
    title: string;
    description: string;
    thumbnail: string;
    details: string;
    category: string[];
    publisher: string;
    buildType: 'unity' | 'html';
}

export default function GameDetailPage() {
    const { data: session, status } = useSession();
    const { isExpired } = usePlayTimeSession();

    const params = useParams();
    const router = useRouter();
    const [game, setGame] = useState<Game | null>(null);
    const [loading, setLoading] = useState(true);
    const [popup, setPopup] = useState(false);

    useEffect(() => {
        const fetchGame = async () => {
            try {
                const res = await fetch(`/api/arena/games/${params?.id}`);
                if (!res.ok) throw new Error('Game not found');
                const data = await res.json();
                setGame(data);
            } catch (err) {
                console.error(err);
                setGame(null);
            } finally {
                setLoading(false);
            }
        };

        if (params?.id) {
            fetchGame();
        }
    }, [params?.id]);

    if (status === 'loading' || loading) {
        return (
            <div className={styles.page}>
                <header className={styles.pageHeader}>
                    <h1 className={styles.pageTitle}>Loading Game</h1>
                </header>
                {/* ...loading skeleton UI... */}
            </div>
        );
    }

    function handleOnClickPlay() {
        if (isExpired) {
            setPopup(true);
            return;
        }
        router.push(`/arena/play-game?Id=${game?.id}&Name=${game?.buildName}`);
    }

    if (!session) return <SignIn />;
    if (!game) return <div className={styles.page}>Game not found.</div>;

    return (
        <div className={styles.page}>
            {popup && (
                <Popup
                    message="Your daily playtime has expired. Please come back tomorrow!"
                    onClose={() => setPopup(false)}
                    type="error"
                />
            )}

            <header className={styles.pageHeader}>
                <h1 className={styles.pageTitle}>{game.title}</h1>
            </header>

            <div className={styles.detailLayout}>
                <div className={styles.previewContainer}>
                    <div className={styles.previewMedia}>
                        <img
                            src={game.thumbnail}
                            alt={`${game.title} thumbnail`}
                            className={styles.previewImage}
                        />
                    </div>

                    <div>
                        <h2 className={styles.sectionHeader}>Description</h2>
                        <p>{game.description}</p>
                    </div>
                </div>

                <div className={styles.detailsSection}>
                    <h2 className={styles.sectionHeader}>Details</h2>
                    <p>{game.details}</p>

                    <h2 className={styles.sectionHeader}>Category</h2>
                    <ul className={styles.categoryList}>
                        {game.category.map((cat, index) => (
                            <li key={index} className={styles.categoryItem}>
                                {cat}
                            </li>
                        ))}
                    </ul>

                    <div>
                        <h2 className={styles.sectionHeader}>Publisher</h2>
                        <p className={styles.publisher}>{game.publisher}</p>
                    </div>

                    <div>
                        <h2 className={styles.sectionHeader}>Options</h2>
                        <div className={styles.controlButtonGroup}>
                            <button className={styles.playButton} onClick={handleOnClickPlay}>Play ❌</button>
                            <button className={styles.backButton} onClick={() => router.push('/arena')}>Back ⭕️</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
