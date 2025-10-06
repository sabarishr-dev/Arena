'use client';
import { useState } from 'react';
import styles from './publish.module.css';
import File from '@/components/publish/File';
import FolderUpload from '@/components/publish/Folder';
import { useSession } from 'next-auth/react';
import SignIn from '@/components/auth/SignIn';

export default function Publish() {
    const [step, setStep] = useState(1);
    const { data: session, status } = useSession();

    const [gameId, setGameId] = useState('');
    const [gameName, setGameName] = useState('');
    const [categories, setCategories] = useState('');
    const [description, setDescription] = useState('');
    const [details, setDetails] = useState('');
    const [gameThumbnail, setGameThumbnail] = useState<File | null>(null);

    const [dataFile, setDataFile] = useState<File | null>(null);
    const [wasmFile, setWasmFile] = useState<File | null>(null);
    const [frameworkFile, setFrameworkFile] = useState<File | null>(null);
    const [loaderFile, setLoaderFile] = useState<File | null>(null);

    const [hasStreamingAssets, setHasStreamingAssets] = useState(false);
    const [streamingAssetsFiles, setStreamingAssetsFiles] = useState<FileList | null>(null);

    const [uploaded, setUploaded] = useState(false);
    const [available, setAvailable] = useState<boolean | null>(null);
    const [checking, setChecking] = useState(false);


    const canGoNextStep1 = () => {
        return gameId.trim() !== '' && gameName.trim() !== '';
    };

    const canSubmit = () => {
        return dataFile !== null && wasmFile !== null && frameworkFile !== null && loaderFile !== null;
    };

    const handleUpload = async (force = false) => {
        if (!canSubmit()) {
            alert('Please upload all required build files.');
            return;
        }

        if (hasStreamingAssets && (!streamingAssetsFiles || streamingAssetsFiles.length === 0)) {
            alert('Please upload the StreamingAssets folder contents.');
            return;
        }

        const formData = new FormData();
        formData.append('gameId', gameId);
        formData.append('gameName', gameName);
        formData.append('categories', categories);
        formData.append('description', description);
        formData.append('details', details);
        formData.append('publisher', session?.user?.email || "magician");
        formData.append('hasStreamingAssets', hasStreamingAssets ? 'true' : 'false');

        if (gameThumbnail) {
            formData.append('gameThumbnail', gameThumbnail);
        }

        formData.append('files', dataFile!);
        formData.append('files', wasmFile!);
        formData.append('files', frameworkFile!);
        formData.append('files', loaderFile!);

        if (hasStreamingAssets && streamingAssetsFiles) {
            Array.from(streamingAssetsFiles).forEach((file) => {
                formData.append('streamingAssetsFiles', file, file.webkitRelativePath);
            });
        }

        if (force) {
            formData.append('force', 'true');
        }

        const res = await fetch('/api/publish', {
            method: 'POST',
            body: formData,
        });

        if (res.ok) {
            setUploaded(true);
        } else if (res.status === 409) {
            const { message } = await res.json();
            const confirmOverwrite = window.confirm(message);
            if (confirmOverwrite) {
                await handleUpload(true);
            }
        } else {
            alert('Upload failed.');
        }
    };

    const checkAvailability = async () => {
        if (!gameId.trim()) return alert("Please enter a Game ID to check.");

        setChecking(true);
        setAvailable(null);

        try {
            const res = await fetch(`/api/arena/games/${gameId.trim()}`);

            if (res.status === 200) {
                // Game exists => Not available
                setAvailable(false);
            } else if (res.status === 404) {
                // Game not found => Available
                setAvailable(true);
            } else {
                throw new Error('Unexpected response');
            }
        } catch (err) {
            console.error('Error checking game ID:', err);
            alert('Error checking game ID. See console for details.');
            setAvailable(null);
        } finally {
            setChecking(false);
        }
    };

    if (!session) return <SignIn />;


    return (
        <div className={styles.wrapper}>
            <h1 className={styles.title}>Publish Unity WebGL Build</h1>
            <h6 className={styles.uploader}>Publisher : {session.user?.name}</h6>

            {!uploaded && (
                <>
                    {step === 1 && (
                        <>
                            <label>
                                Game ID ❗️
                                <input
                                    type="text"
                                    required
                                    value={gameId}
                                    onChange={(e) => setGameId(e.target.value)}
                                    placeholder="Must be Unique, please check for availability "
                                />
                                <br />
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <button
                                        className={styles.checkForAvailability}
                                        type="button"
                                        onClick={checkAvailability}
                                        disabled={checking}
                                    >
                                        {checking ? 'Checking...' : 'Check for Availability'}
                                    </button>
                                    {available !== null && (
                                        <span style={{ fontSize: 14 }}>
                                            {available ? '✅ Available' : '❌ Already Exists'}
                                        </span>
                                    )}
                                </div>

                            </label>


                            <label>
                                Game Name ❗️
                                <input
                                    type="text"
                                    required
                                    value={gameName}
                                    onChange={(e) => setGameName(e.target.value)}
                                    placeholder="Enter game name"
                                />
                            </label>

                            <label>
                                Description
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    rows={4}
                                    placeholder="Enter game description"
                                />
                            </label>

                            <label>
                                Details
                                <textarea
                                    value={details}
                                    onChange={(e) => setDetails(e.target.value)}
                                    rows={4}
                                    placeholder="Enter additional details ... ex: controls, how to play ?"
                                />
                            </label>

                            <label>
                                Categories
                                <input
                                    type="text"
                                    value={categories}
                                    onChange={(e) => setCategories(e.target.value)}
                                    placeholder="Comma separated"
                                />
                            </label>

                            <label>
                                Game Thumbnail (PNG, JPG)*
                                <input
                                    type="file"
                                    accept=".png, .jpg, .jpeg"
                                    onChange={(e) =>
                                        setGameThumbnail(e.target.files ? e.target.files[0] : null)
                                    }
                                />
                            </label>

                            <button
                                className={styles.uploadBtn}
                                onClick={() => {
                                    if (canGoNextStep1()) setStep(2);
                                    else alert('Please fill all required fields on this page.');
                                }}
                            >
                                Next
                            </button>
                        </>
                    )}

                    {step === 2 && (
                        <>
                            <File label="DATA file (.data)*" accept=".data" onFileChange={setDataFile} />
                            <File label="WASM file (.wasm)*" accept=".wasm" onFileChange={setWasmFile} />
                            <File
                                label="Framework JS (.framework.js)*"
                                accept=".framework.js"
                                onFileChange={setFrameworkFile}
                            />
                            <File label="Loader JS (.loader.js)*" accept=".loader.js" onFileChange={setLoaderFile} />

                            {/* <label style={{ marginTop: '20px', display: 'block' }}>
                                <input
                                    type="checkbox"
                                    checked={hasStreamingAssets}
                                    onChange={(e) => {
                                        setHasStreamingAssets(e.target.checked);
                                        setStreamingAssetsFiles(null);
                                    }}
                                    style={{ marginRight: 6 }}
                                />
                                Has Streaming Assets?
                            </label> */}

                            {/* {hasStreamingAssets && (
                                <div>
                                    <label htmlFor="streaming-assets-upload">
                                        Upload StreamingAssets Folder:
                                    </label>
                                    <FolderUpload />
                                    <small style={{ fontSize: 12, color: '#666' }}>
                                        Select the entire StreamingAssets folder to preserve structure
                                    </small>
                                </div>
                            )} */}


                            <div style={{ marginTop: '20px' }}>
                                <button
                                    className={styles.uploadBtn}
                                    onClick={() => setStep(1)}
                                    style={{ marginRight: '10px' }}
                                >
                                    Back
                                </button>

                                <button
                                    className={styles.uploadBtn}
                                    onClick={() => {
                                        handleUpload();
                                    }}
                                    disabled={!canSubmit()}
                                >
                                    Upload
                                </button>
                            </div>
                        </>
                    )}
                </>
            )}

            {uploaded && <p>Unity Build Uploaded! You can now preview the game.</p>}
        </div>
    );
}
