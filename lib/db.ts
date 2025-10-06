import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import path from 'path';
import fs from 'fs';

const dbDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'games.db');

export async function getDb(): Promise<Database<sqlite3.Database, sqlite3.Statement>> {
    return open({
        filename: dbPath,
        driver: sqlite3.Database,
    });
}

export async function initDb() {
    const db = await getDb();

    await db.exec(`
        CREATE TABLE IF NOT EXISTS games (
            id INTEGER PRIMARY KEY,
            buildName TEXT NOT NULL,
            title TEXT NOT NULL,
            description TEXT,
            thumbnail TEXT,
            details TEXT,
            publisher TEXT,
            buildType TEXT DEFAULT 'unity'
        );

        CREATE TABLE IF NOT EXISTS game_categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            game_id INTEGER NOT NULL,
            category TEXT NOT NULL,
            FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
        );
    `);

    await db.close();
}

export type Game = {
    id?: number;
    buildName: string;
    title: string;
    description?: string;
    thumbnail?: string;
    details?: string;
    category?: string[];
    publisher?: string;
    buildType?: 'unity' | 'html';
};

export async function insertGame(game: Game): Promise<number> {
    const db = await getDb();

    const { id, buildName, title, description, thumbnail, details, category = [], publisher, buildType = 'unity' } = game;

    if (id !== undefined) {
        await db.run(`DELETE FROM games WHERE id = ?`, [id]);
        await db.run(`DELETE FROM game_categories WHERE game_id = ?`, [id]);
    }

    const result = await db.run(
        `INSERT INTO games (id, buildName, title, description, thumbnail, details, publisher, buildType) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [id ?? null, buildName, title, description, thumbnail, details, publisher, buildType]
    );

    const gameId = id ?? result.lastID!;

    const insertCategory = db.prepare(`INSERT INTO game_categories (game_id, category) VALUES (?, ?)`);

    for (const cat of category) {
        await (await insertCategory).run(gameId, cat);
    }

    await (await insertCategory).finalize();
    await db.close();

    return gameId;
}

export async function getAllGames(): Promise<Game[]> {
    const db = await getDb();

    const games = await db.all(`SELECT * FROM games ORDER BY id ASC`);

    for (const game of games) {
        const categories = await db.all(
            `SELECT category FROM game_categories WHERE game_id = ?`,
            [game.id]
        );

        game.category = categories.map(c => c.category);
    }

    await db.close();

    return games;
}

export async function getGameById(id: number): Promise<Game | null> {
    const db = await getDb();

    const game = await db.get(
        `SELECT id, buildName, title, description, thumbnail, details, publisher, buildType FROM games WHERE id = ?`,
        [id]
    );

    if (!game) {
        await db.close();
        return null;
    }

    const categories = await db.all(
        `SELECT category FROM game_categories WHERE game_id = ? ORDER BY id ASC`,
        [id]
    );

    await db.close();

    return {
        id: game.id,
        buildName: game.buildName,
        title: game.title,
        description: game.description,
        thumbnail: game.thumbnail,
        details: game.details,
        category: categories.map(cat => cat.category),
        publisher: game.publisher,
        buildType: game.buildType as 'unity' | 'html',
    };
}

export async function deleteGameById(id: number) {
    const db = await getDb();

    await db.run('PRAGMA foreign_keys = ON');

    await db.run(`DELETE FROM games WHERE id = ?`, [id]);
    await db.close();
}
