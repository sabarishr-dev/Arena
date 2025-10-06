import { NextApiRequest, NextApiResponse } from 'next';
import formidable, { IncomingForm } from 'formidable';
import fs from 'fs/promises';
import fssync from 'fs';
import path from 'path';
import { insertGame } from '@/lib/db';

export const config = {
    api: {
        bodyParser: false,
    },
};

interface FormidableFileWithRelativePath extends formidable.File {
    webkitRelativePath?: string;
}


export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const form = new IncomingForm({ multiples: true, keepExtensions: true });

    form.parse(req, async (err, fields, files) => {
        if (err) {
            console.error('Form parse error:', err);
            return res.status(500).json({ error: 'Failed to parse form' });
        }

        try {
            const gameId = Array.isArray(fields.gameId) ? fields.gameId[0] : fields.gameId || '';
            const gameName = Array.isArray(fields.gameName) ? fields.gameName[0] : fields.gameName || '';
            const categoryStr = Array.isArray(fields.categories) ? fields.categories[0] : fields.categories || '';
            const buildTypeField = fields.buildType;
            const buildType = Array.isArray(buildTypeField) ? buildTypeField[0] : buildTypeField || 'unity';
            const forceField = fields.force;
            const force = Array.isArray(forceField) ? forceField[0] === 'true' : forceField === 'true';
            const categories = categoryStr.split(',').map((c) => c.trim()).filter(Boolean);
            const publisher = Array.isArray(fields.publisher) ? fields.publisher[0] : fields.publisher || '';
                        
            if (!gameId || !gameName) {
                return res.status(400).json({ error: 'Missing required fields' });
            }

            const basePath = path.join(process.cwd(), 'public', 'games', gameId);
            const buildPath = path.join(basePath, buildType === 'unity' ? 'Build' : 'HTML');
            const thumbnailPath = path.join(basePath, 'Thumbnail');
            
            // Only create StreamingAssets folder for Unity builds
            const foldersToCreate = [buildPath, thumbnailPath];
            if (buildType === 'unity') {
                const streamingAssetsPath = path.join(basePath, 'StreamingAssets');
                foldersToCreate.push(streamingAssetsPath);
            }

            // Handle duplicate build
            if (fssync.existsSync(basePath)) {
                if (!force) {
                    return res.status(409).json({ conflict: true, message: 'Build already exists' });
                }

                // Delete existing content
                await fs.rm(basePath, { recursive: true, force: true });
            }

            // Recreate folders
            for (const dir of foldersToCreate) {
                await fs.mkdir(dir, { recursive: true });
            }

            // Normalize files from form-data
            const buildFiles = Array.isArray(files.files) ? files.files : files.files ? [files.files] : [];
            const htmlFiles = Array.isArray(files.htmlFiles) ? files.htmlFiles : files.htmlFiles ? [files.htmlFiles] : [];
            const thumbnailFile = Array.isArray(files.gameThumbnail) ? files.gameThumbnail[0] : files.gameThumbnail;

            // StreamingAssets files — this is new
            const streamingAssetsFiles = Array.isArray(files.streamingAssets)
                ? files.streamingAssets
                : files.streamingAssets
                    ? [files.streamingAssets]
                    : [];

            let thumbnailUrl = '';

            // Save build files based on type
            if (buildType === 'unity') {
                // Save Unity WebGL files
                for (const file of buildFiles) {
                    if (!file) continue;
                    const dest = path.join(buildPath, file.originalFilename || '');
                    await fs.copyFile(file.filepath, dest);
                }
            } else {
                // Save HTML files
                for (const file of htmlFiles) {
                    if (!file) continue;
                    const dest = path.join(buildPath, file.originalFilename || '');
                    await fs.copyFile(file.filepath, dest);
                }
            }

            // Save thumbnail file
            if (thumbnailFile) {
                const ext = path.extname(thumbnailFile.originalFilename || '.png');
                const filename = `thumbnail${ext}`;
                const dest = path.join(thumbnailPath, filename);
                await fs.copyFile(thumbnailFile.filepath, dest);
                thumbnailUrl = `/games/${gameId}/Thumbnail/${filename}`;
            }

            // Save StreamingAssets files preserving folder structure (Unity only)
            if (buildType === 'unity') {
                const streamingAssetsPath = path.join(basePath, 'StreamingAssets');
                for (const file of streamingAssetsFiles) {
                    if (!file) continue;

                    // webkitRelativePath example: "Audio/sound.wav"
                    const f = file as FormidableFileWithRelativePath;
                    const relativePath = f.webkitRelativePath || f.originalFilename || f.newFilename;
                    const dest = path.join(streamingAssetsPath, relativePath);

                    // Ensure directory exists
                    await fs.mkdir(path.dirname(dest), { recursive: true });

                    // Copy the file
                    await fs.copyFile(file.filepath, dest);
                }
            }

            const buildFileNames = buildType === 'unity' 
                ? buildFiles.map((file) => file.originalFilename || '')
                : htmlFiles.map((file) => file.originalFilename || '');
            const buildName = buildFileNames.length > 0 ? buildFileNames[0].split('.')[0] : '';

            const description = Array.isArray(fields.description) ? fields.description[0] : fields.description || '';
            const details = Array.isArray(fields.details) ? fields.details[0] : fields.details || '';

            // Insert or overwrite DB
            await insertGame({
                id: parseInt(gameId),
                buildName,
                title: gameName,
                description,
                thumbnail: thumbnailUrl,
                category: categories,
                details,
                publisher,
                buildType: buildType as 'unity' | 'html'
            });

            return res.status(200).json({ success: true });
        } catch (e) {
            console.error('Error during upload:', e);
            return res.status(500).json({ error: 'Upload failed' });
        }
    });
}
