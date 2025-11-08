import React, { useState, useCallback, useEffect, useRef, DragEvent, useMemo } from 'react';
import { generateVideo, getVideosOperation, analyzeFrame } from '../services/geminiService';
import { HistoryItem } from '../types';
import Card from './common/Card';
import Button from './common/Button';
import Icon, { InfoTooltip } from './common/Icon';
import Spinner from './common/Spinner';
import { useToast } from '../hooks/useToast';
import Modal from './common/Modal';
import { useSession } from '../hooks/useSession';
import Toggle from './common/Toggle';

type Subtitle = { start: number; end: number; text: string };

interface VideoEditorProps {
  addHistoryItem: (featureName: string, action: string, icon: HistoryItem['icon'], previewUrl?: string) => void;
}

const POLLING_INTERVAL_MS = 10000;
const reassuringMessages = [
    "Warming up the AI Director...",
    "Storyboarding your vision...",
    "Assembling digital actors...",
    "Rendering the first scene...",
    "Applying cinematic lighting...",
    "Compositing visual effects...",
    "Adding a touch of movie magic...",
    "Finalizing the high-definition render...",
    "This is taking a bit longer than usual, but great art takes time!",
    "Almost there, polishing the final frames...",
];

const VideoEditor: React.FC<VideoEditorProps> = ({ addHistoryItem }) => {
    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isLoading, setIsLoading] = useState<string | null>(null);
    const [error, setError] = useState<string>('');
    const [isDraggingOver, setIsDraggingOver] = useState<boolean>(false);
    
    const [analysisPrompt, setAnalysisPrompt] = useState<string>('Describe this frame, focusing on subjects, actions, and composition.');
    const [analysisResult, setAnalysisResult] = useState<string>('');
    const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);

    const [genPrompt, setGenPrompt] = useState<string>('A cinematic shot of a futuristic city skyline at night, with flying cars.');
    const [genAspectRatio, setGenAspectRatio] = useState<'16:9' | '9:16'>('16:9');
    
    const [validationErrors, setValidationErrors] = useState<{ [key: string]: string }>({});

    // Veo State
    const [operation, setOperation] = useState<any | null>(null);
    const [statusMessage, setStatusMessage] = useState('');
    const pollingIntervalRef = useRef<number | null>(null);
    const messageIntervalRef = useRef<number | null>(null);
    
    const [isDirectorMode, setIsDirectorMode] = useState(false);
    const [cameraAngle, setCameraAngle] = useState('Eye-level Shot');
    const [shotStyle, setShotStyle] = useState('Standard');
    const [lighting, setLighting] = useState('Natural Lighting');

    // Editing State
    const [isStabilized, setIsStabilized] = useState(false);
    
    const [hasApiKey, setHasApiKey] = useState(false);
    const [isSelectKeyOpen, setIsSelectKeyOpen] = useState(false);

    const addToast = useToast();
    const { scriptForVideo, setScriptForVideo } = useSession();

    useEffect(() => {
        const checkKey = async () => {
            if (window.aistudio) {
                const keyStatus = await window.aistudio.hasSelectedApiKey();
                setHasApiKey(keyStatus);
            }
        };
        checkKey();
    }, []);

    useEffect(() => {
        if (scriptForVideo) {
            const combinedDescription = scriptForVideo.map(scene => `Scene ${scene.sceneNumber}: ${scene.setting}. ${scene.description}`).join('\n\n');
            setGenPrompt(combinedDescription);
            addToast('Script imported from Text Lab!', 'success');
            setScriptForVideo(null); // Clear after import
        }
    }, [scriptForVideo, setScriptForVideo, addToast]);
    

    // Polling logic
    useEffect(() => {
        const cleanup = () => {
            if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
            if (messageIntervalRef.current) clearInterval(messageIntervalRef.current);
        };

        if (operation && !operation.done) {
            pollingIntervalRef.current = window.setInterval(async () => {
                try {
                    const updatedOp = await getVideosOperation(operation);
                    setOperation(updatedOp);
                    if (updatedOp.done) {
                        cleanup();
                        setIsLoading(null);
                        setStatusMessage('Video ready! Preparing for playback...');
                        
                        const downloadLink = updatedOp.response?.generatedVideos?.[0]?.video?.uri;
                        if (downloadLink) {
                            const videoResponse = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
                            const videoBlob = await videoResponse.blob();
                            setVideoUrl(URL.createObjectURL(videoBlob));
                            setVideoFile(null);
                            setStatusMessage('');
                            addToast("Your video has been generated!", "success");
                        } else {
                            throw new Error(updatedOp.error?.message || "Generation finished but no video URI found.");
                        }
                    }
                } catch (error) {
                    cleanup();
                    setIsLoading(null);
                    setOperation(null);
                    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
                    if (errorMessage.includes('API key not valid') || errorMessage.includes('Requested entity was not found')) {
                        addToast('Your API key is invalid. Please select a valid key.', 'error');
                        setHasApiKey(false);
                        setIsSelectKeyOpen(true);
                    } else {
                        setStatusMessage(`Error: ${errorMessage}`);
                        setError(`Error: ${errorMessage}`);
                    }
                    console.error("Polling error:", error);
                }
            }, POLLING_INTERVAL_MS);

            let messageIndex = 0;
            setStatusMessage(reassuringMessages[messageIndex]);
            messageIntervalRef.current = window.setInterval(() => {
                messageIndex = (messageIndex + 1) % reassuringMessages.length;
                setStatusMessage(reassuringMessages[messageIndex]);
            }, 5000);
        }
        return cleanup;
    }, [operation, addToast]);


    const processFile = (file: File) => {
        if (!file.type.startsWith('video/')) {
            setError('Please upload a valid video file.');
            addToast('Please upload a valid video file (MP4, MOV, etc.).', 'error');
            return;
        }
        setError('');
        setVideoFile(file);
        const url = URL.createObjectURL(file);
        setVideoUrl(url);
        setAnalysisResult('');
        addHistoryItem('Video Suite', 'Loaded a video', 'video');
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) processFile(file);
    };

    const handleDragEvents = (e: DragEvent<HTMLDivElement | HTMLLabelElement>) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDragEnter = (e: DragEvent<HTMLDivElement | HTMLLabelElement>) => {
        handleDragEvents(e);
        setIsDraggingOver(true);
    };

    const handleDragLeave = (e: DragEvent<HTMLDivElement | HTMLLabelElement>) => {
        handleDragEvents(e);
        setIsDraggingOver(false);
    };

    const handleDrop = (e: DragEvent<HTMLDivElement | HTMLLabelElement>) => {
        handleDragEvents(e);
        setIsDraggingOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file) processFile(file);
    };

    const handleGenerateVideo = async () => {
        if (!genPrompt.trim()) {
            setValidationErrors({ genPrompt: 'Please enter a prompt to generate a video.' });
            return;
        }
        
        if (window.aistudio) {
            const keyStatus = await window.aistudio.hasSelectedApiKey();
            setHasApiKey(keyStatus);
            if (!keyStatus) {
                setIsSelectKeyOpen(true);
                return;
            }
        }

        setIsLoading('Initializing video generation...');
        setOperation(null);
        setVideoUrl(null);
        setError('');
        try {
            const op = await generateVideo(genPrompt, genAspectRatio, { cameraAngle, shotStyle, lighting });
            setOperation(op);
            addHistoryItem('Video Suite', 'Started generating video', 'video');
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
            if (errorMessage.includes('API key not valid') || errorMessage.includes('Requested entity was not found')) {
                addToast('Your API key is invalid. Please select a valid key.', 'error');
                setHasApiKey(false);
                setIsSelectKeyOpen(true);
            } else {
                setError(`Failed to start video generation: ${errorMessage}`);
            }
            setIsLoading(null);
        }
    };
    
    const handleAnalyzeFrame = async () => {
        if (!videoRef.current || !videoUrl) {
            addToast('Please upload or generate a video to analyze its frames.', 'error');
            return;
        }
        setIsAnalyzing(true);
        setAnalysisResult('');
        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        
        const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg'));
        if (!blob) {
            setIsAnalyzing(false);
            addToast('Could not capture frame.', 'error');
            return;
        }

        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = async () => {
            const base64Data = (reader.result as string).split(',')[1];
            try {
                const result = await analyzeFrame(base64Data, 'image/jpeg', analysisPrompt);
                setAnalysisResult(result);
                addHistoryItem('Video Suite', 'Analyzed video frame', 'video');
            } catch (err) {
                setError('Failed to analyze frame.');
                addToast('Failed to analyze frame.', 'error');
            } finally {
                setIsAnalyzing(false);
            }
        };
    };

    const VideoUploadScreen = () => (
        <div className="grid lg:grid-cols-2 gap-8 items-center min-h-[70vh]">
            <Card>
                <label 
                    htmlFor="video-upload" 
                    className={`w-full h-full flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors cursor-pointer ${isDraggingOver ? 'border-brand-primary bg-slate-50 dark:bg-slate-700' : 'border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
                    onDragEnter={handleDragEnter} onDragOver={handleDragEvents} onDragLeave={handleDragLeave} onDrop={handleDrop}
                >
                    <Icon name="upload" className="w-12 h-12 text-brand-subtle dark:text-slate-400" />
                    <p className="mt-2 font-semibold text-brand-text dark:text-slate-200">Upload or drop a video</p>
                    <p className="text-sm text-brand-subtle dark:text-slate-400">to analyze and edit</p>
                    <input id="video-upload" type="file" accept="video/*" className="hidden" onChange={handleFileChange} />
                </label>
            </Card>
             <Card>
                <div className="space-y-4 text-center">
                    <Icon name="sparkles" className="w-12 h-12 text-brand-primary mx-auto" />
                    <h3 className="text-xl font-semibold text-brand-text dark:text-slate-200">Generate with AI</h3>
                    <p className="text-brand-subtle dark:text-slate-400">Describe the video you want to create, and let AI bring it to life as a real MP4 video.</p>
                     <div className="space-y-4 text-left">
                        <div>
                            <label className="block text-sm font-medium text-brand-subtle dark:text-slate-400 mb-2">Prompt</label>
                            <textarea
                                value={genPrompt}
                                onChange={(e) => {
                                  setGenPrompt(e.target.value);
                                  if (validationErrors.genPrompt) setValidationErrors({});
                                }}
                                placeholder="e.g., A majestic eagle soaring..."
                                rows={4}
                                className={`w-full p-3 border rounded-lg focus:ring-2 focus:outline-none transition bg-white dark:bg-slate-800 text-brand-text dark:text-slate-100 ${validationErrors.genPrompt ? 'border-red-500 ring-red-200' : 'border-slate-300 dark:border-slate-600 focus:ring-brand-primary'}`}
                            />
                             {validationErrors.genPrompt && <p className="text-red-500 text-sm mt-1">{validationErrors.genPrompt}</p>}
                        </div>
                        <Toggle label="Director Mode (Advanced)" enabled={isDirectorMode} onChange={setIsDirectorMode} />
                        {isDirectorMode && (
                            <div className="space-y-3 p-3 bg-slate-100 dark:bg-slate-800/50 rounded-lg animate-fade-in">
                                <h4 className="font-semibold text-brand-text dark:text-slate-200">AI Director Controls</h4>
                                <div>
                                    <label className="text-xs">Camera Angle</label>
                                    <select value={cameraAngle} onChange={e => setCameraAngle(e.target.value)} className="w-full p-2 mt-1 border rounded-lg bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600">
                                        {['Eye-level Shot', 'Low-angle Shot', 'High-angle Shot', 'Drone Shot', 'Close-up', 'Wide Shot'].map(o => <option key={o}>{o}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs">Shot Style</label>
                                     <select value={shotStyle} onChange={e => setShotStyle(e.target.value)} className="w-full p-2 mt-1 border rounded-lg bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600">
                                        {['Standard', 'Slow-motion', 'Time-lapse', 'Handheld shaky', 'Static Tripod'].map(o => <option key={o}>{o}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs">Lighting</label>
                                     <select value={lighting} onChange={e => setLighting(e.target.value)} className="w-full p-2 mt-1 border rounded-lg bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600">
                                        {['Natural Lighting', 'Cinematic Lighting', 'Neon Glow', 'Golden Hour', 'Dark and Moody'].map(o => <option key={o}>{o}</option>)}
                                    </select>
                                </div>
                            </div>
                        )}
                        <Button onClick={handleGenerateVideo} isLoading={!!isLoading} disabled={!!isLoading} icon="sparkles" className="w-full">
                            Generate Video
                        </Button>
                     </div>
                </div>
            </Card>
        </div>
    );

    const VideoEditorUI = () => (
       <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
                <Card className="p-0 overflow-hidden">
                    <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden flex items-center justify-center">
                        <video
                            ref={videoRef}
                            key={videoUrl}
                            src={videoUrl!}
                            className={`w-full h-full object-contain ${isStabilized ? 'video-stabilized' : ''}`}
                            controls
                        />
                        {(isLoading || statusMessage) && (
                             <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center gap-4 text-white p-4 text-center">
                                <Spinner />
                                <p className="font-semibold text-lg">{statusMessage || isLoading}</p>
                                {error && <p className="text-red-400">{error}</p>}
                             </div>
                        )}
                    </div>
                </Card>
                <div className="flex gap-4">
                     {videoUrl && (
                        <Button as="a" href={videoUrl} download="generated-video.mp4" icon="download" variant="secondary" className="w-full">Download Video</Button>
                    )}
                    <Button onClick={() => {setVideoUrl(null); setVideoFile(null); setOperation(null); setIsLoading(null); setStatusMessage('')}} icon="undo" variant="secondary" className="w-full">New Project</Button>
                </div>
               
               <Card>
                    <h3 className="text-lg font-semibold text-brand-text dark:text-slate-200 mb-3">AI Frame Analysis</h3>
                    <div className="space-y-4">
                        <textarea
                            value={analysisPrompt}
                            onChange={(e) => setAnalysisPrompt(e.target.value)}
                            rows={2}
                            className="w-full p-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-brand-primary focus:outline-none transition"
                            placeholder="Ask the AI about the current frame..."
                        />
                        <Button onClick={handleAnalyzeFrame} isLoading={isAnalyzing} disabled={!videoUrl || isAnalyzing} icon="wand" variant="secondary" className="w-full">
                            Analyze Current Frame
                        </Button>
                        {isAnalyzing && !analysisResult && <div className="flex justify-center py-4"><Spinner /></div>}
                        {analysisResult && (
                            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg whitespace-pre-wrap font-mono text-sm dark:text-slate-300">
                                {analysisResult}
                            </div>
                        )}
                    </div>
                </Card>
            </div>
            <div className="lg:col-span-1">
                <Card className="h-full max-h-[85vh] overflow-y-auto">
                    <div className="space-y-6">
                         <div>
                            <h3 className="text-lg font-semibold text-brand-text dark:text-slate-200 mb-3">AI Tools (Mock)</h3>
                            <div className="space-y-3">
                                <Toggle label={<span className="flex items-center gap-2">AI Stabilization <Icon name="stabilize" /></span>} enabled={isStabilized} onChange={setIsStabilized} />
                                <Button variant="secondary" className="w-full justify-start" icon="eraser">AI Object Removal</Button>
                                <Button variant="secondary" className="w-full justify-start" icon="scissors">AI Smart Trim</Button>
                            </div>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );

    return (
        <div className="max-w-7xl mx-auto">
            <div className="text-center mb-8">
                <h2 className="text-4xl font-bold dark:text-slate-100">AI Video Suite</h2>
                <p className="text-lg text-brand-subtle dark:text-slate-400">Generate, edit, and enhance videos with the power of AI.</p>
            </div>
            
            { (!videoUrl && !isLoading) ? <VideoUploadScreen /> : <VideoEditorUI /> }

            <Modal isOpen={isSelectKeyOpen} onClose={() => setIsSelectKeyOpen(false)} title="API Key Required">
                <div className="space-y-4">
                    <p className="text-brand-subtle dark:text-slate-400">
                        This feature requires a Google AI Studio API key. Please select a key to proceed.
                        For more information on billing, visit <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="text-brand-primary hover:underline">ai.google.dev/gemini-api/docs/billing</a>.
                    </p>
                    <Button
                        onClick={async () => {
                             if (window.aistudio) {
                                await window.aistudio.openSelectKey();
                                setIsSelectKeyOpen(false);
                                setHasApiKey(true);
                                addToast('API Key selected. You can now try generating again.', 'success');
                            }
                        }}
                        className="w-full"
                    >
                        Select API Key
                    </Button>
                </div>
            </Modal>

        </div>
    );
};

export default VideoEditor;
