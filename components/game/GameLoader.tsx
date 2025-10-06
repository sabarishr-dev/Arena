'use client';

import React from 'react';
import GameView from '../unity/game-view';
import HTMLGameView from '../html/html-game-view';

interface GameLoaderProps {
    gameId: string;
    gameName: string;
    buildType: 'unity' | 'html';
    buildName?: string;
}

const GameLoader: React.FC<GameLoaderProps> = ({ 
    gameId, 
    gameName, 
    buildType, 
    buildName 
}) => {
    if (buildType === 'unity' && buildName) {
        return <GameView Id={gameId} Name={buildName} />;
    } else if (buildType === 'html') {
        return <HTMLGameView Id={gameId} Name={gameName} />;
    } else {
        return (
            <div style={{ 
                width: '100%', 
                height: '100vh', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                backgroundColor: '#001f3f',
                color: 'white',
                fontSize: '18px'
            }}>
                Invalid game configuration
            </div>
        );
    }
};

export default GameLoader;
