'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './arena.module.css';
import { useSession } from 'next-auth/react';
import SignIn from '@/components/auth/SignIn';

interface Game {
    id: number;
    title: string;
    description: string;
    thumbnail: string;
    category: string[];
    publisher: string
}

export default function Arena() {
    const router = useRouter();
    const [games, setGames] = useState<Game[]>([]);
    const [loading, setLoading] = useState(true);
    const { data: session, status } = useSession();


    useEffect(() => {
        const fetchGames = async () => {
            try {
                const res = await fetch('/api/arena/games');
                const data = await res.json();
                setGames(data);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchGames();
    }, []);

    if (!session) return <SignIn />;


    if (loading) {
        return (
            <div className={styles.page}>
                <h1 className={styles.pageTitle}>Arena</h1>
                <div className={styles.gamesList}>
                    {[...Array(1)].map((_, i) => (
                        <div key={i} className={styles.skeletonCard}>
                            <div className={styles.skeletonTitle}></div>
                            <div className={styles.skeletonImage}></div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className={styles.page}>
            <h1 className={styles.pageTitle}>Arena <p className={styles.info}># games</p> </h1>

            <div className={styles.gamesList}>
                {games.map((game) => (
                    <div
                        key={game.id}
                        className={styles.gameCard}
                        tabIndex={0}
                        role="button"
                        onClick={() => router.push(`/arena/${game.id}`)}
                    >
                        <div className={styles.imageWrapper}>
                            <img
                                src={game.thumbnail}
                                alt={`${game.title} thumbnail`}
                                className={styles.gameImage}
                            />
                            <h3 className={styles.gameTitle}>{game.title}</h3>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
