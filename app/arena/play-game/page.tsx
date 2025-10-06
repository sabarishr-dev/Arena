"use client";

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";

const GameLoader = dynamic(() => import("../../../components/game/GameLoader"), { ssr: false });

interface Game {
    id: number;
    buildName: string;
    title: string;
    buildType: 'unity' | 'html';
}

const PlayGamePage: React.FC = () => {
    const searchParams = useSearchParams();
    const gameId = searchParams?.get("Id");
    const [game, setGame] = useState<Game | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchGame = async () => {
            if (!gameId) {
                setError('Game ID is required');
                setLoading(false);
                return;
            }

            try {
                const res = await fetch(`/api/arena/games/${gameId}`);
                if (!res.ok) {
                    throw new Error('Game not found');
                }
                const gameData = await res.json();
                setGame(gameData);
            } catch (err) {
                console.error('Failed to fetch game:', err);
                setError('Failed to load game');
            } finally {
                setLoading(false);
            }
        };

        fetchGame();
    }, [gameId]);

    if (loading) {
        return (
            <div style={{
                width: "100%",
                height: "100vh",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "#001f3f",
                color: "white",
                fontSize: "18px"
            }}>
                Loading game...
            </div>
        );
    }

    if (error || !game) {
        return (
            <div style={{
                width: "100%",
                height: "100vh",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "#001f3f",
                color: "#ff6b6b",
                fontSize: "18px",
                textAlign: "center"
            }}>
                <div>
                    <div>{error || 'Game not found'}</div>
                    <button
                        onClick={() => window.history.back()}
                        style={{
                            marginTop: "20px",
                            padding: "10px 20px",
                            backgroundColor: "#4CAF50",
                            color: "white",
                            border: "none",
                            borderRadius: "5px",
                            cursor: "pointer"
                        }}
                    >
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div style={{ width: "100%", height: "100vh" }}>
            <GameLoader
                gameId={gameId!}
                gameName={game.title}
                buildType={game.buildType}
                buildName={game.buildName}
            />
        </div>
    );
};

export default PlayGamePage;
