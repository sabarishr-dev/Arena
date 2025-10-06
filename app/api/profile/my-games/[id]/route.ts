import { deleteGameById } from '@/lib/db';
import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

export async function DELETE(
    req: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const params = await context.params;
        const { id } = params;
        const gameId = parseInt(id);

        if (isNaN(gameId)) {
            return NextResponse.json({ error: 'Invalid game ID' }, { status: 400 });
        }

        // Step 1: Delete from database (cascades to images/categories)
        await deleteGameById(gameId);

        // Step 2: Delete the WebGL build folder
        const folderPath = path.join(process.cwd(), 'public', 'games', gameId.toString());

        if (fs.existsSync(folderPath)) {
            fs.rmSync(folderPath, { recursive: true, force: true });
            console.log(`Deleted folder: ${folderPath}`);
        }

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error(`Failed to delete game or folder:`, err);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
