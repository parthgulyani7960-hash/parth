import React, { useState, useCallback, useEffect, useRef, DragEvent, useMemo } from 'react';
import { analyzeFrame, generateVideo, generateAutoCut, suggestMusic, generateSubtitles, stabilizeVideo, applyVideoStyle, applyCinematicMode, generateActorInVideo, enhanceVideoQuality, detectScenes, removeObjectFromVideo, applySlowMotion, transferVideoStyle, replaceObjectInVideo } from '../services/geminiService';
import { HistoryItem } from '../types';
import Card from './common/Card';
import Button from './common/Button';
import Icon, { InfoTooltip } from './common/Icon';
import DualRangeSlider from './common/DualRangeSlider';
import Spinner from './common/Spinner';
import { useToast } from '../hooks/useToast';
import Slider from './common/Slider';
import Modal from './common/Modal';

type Clip = { start: number; end: number };
type Subtitle = { start: number; end: number; text: string };
type Filter = { name: string; style: React.CSSProperties };

interface VideoEditorProps {
  addHistoryItem: (featureName: string, action: string, icon: HistoryItem['icon'], previewUrl?: string) => void;
}

const filters: Filter[] = [
    { name: 'None', style: { filter: 'none' } },
    { name: 'Cinematic', style: { filter: 'contrast(1.2) saturate(1.1) brightness(0.9)' } },
    { name: 'Vibrant', style: { filter: 'saturate(1.5) contrast(1.1)' } },
    { name: 'Vintage', style: { filter: 'sepia(0.6) brightness(1.1)' } },
    { name: 'Noir', style: { filter: 'grayscale(1) contrast(1.3)' } },
    { name: 'Dreamy', style: { filter: 'blur(1px) saturate(1.2) brightness(1.1)' } },
];

const formatTime = (timeInSeconds: number) => {
    if (isNaN(timeInSeconds) || timeInSeconds < 0) return '0:00';
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const AccordionSection: React.FC<{title: string; id: string; openSection: string; setOpenSection: (id: string) => void; children: React.ReactNode; info?: string, disabled?: boolean}> = ({title, id, openSection, setOpenSection, children, info, disabled = false}) => {
    const isOpen = openSection === id;
    return (
         <div className={`border-b dark:border-slate-700 last:border-b-0 pb-4 mb-4 ${disabled ? 'opacity-50' : ''}`}>
            <button
                className="w-full flex justify-between items-center text-left"
                onClick={() => setOpenSection(isOpen ? '' : id)}
                aria-expanded={isOpen}
                disabled={disabled}
            >
                <h3 className="text-lg font-semibold text-brand-text dark:text-slate-200 flex items-center gap-2">
                    {title}
                    {info && <InfoTooltip>{info}</InfoTooltip>}
                </h3>
                <Icon name="back" className={`w-5 h-5 transition-transform duration-300 ${isOpen ? '-rotate-90' : 'rotate-90'}`} />
            </button>
            {isOpen && (
                <div className="mt-4 space-y-3 animate-fade-in">
                    {children}
                </div>
            )}
        </div>
    );
};


const VideoEditor: React.FC<VideoEditorProps> = ({ addHistoryItem }) => {
    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [originalVideoUrl, setOriginalVideoUrl] = useState<string | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const [duration, setDuration] = useState<number>(0);
    const [currentTime, setCurrentTime] = useState<number>(0);
    const [trimRange, setTrimRange] = useState<[number, number]>([0, 0]);
    const [isPlaying, setIsPlaying] = useState<boolean>(false);
    const [playbackRate, setPlaybackRate] = useState<number>(1);
    const [isLoading, setIsLoading] = useState<string | null>(null);
    const [error, setError] = useState<string>('');
    const [isDraggingOver, setIsDraggingOver] = useState<boolean>(false);

    const [autoCutPrompt, setAutoCutPrompt] = useState<string>('Create a short, engaging highlight reel.');
    const [suggestedClips, setSuggestedClips] = useState<Clip[]>([]);
    const [activeFilter, setActiveFilter] = useState<Filter>(filters[0]);
    const [subtitles, setSubtitles] = useState<Subtitle[]>([]);
    const [activeSubtitle, setActiveSubtitle] = useState<string>('');
    const [sceneMarkers, setSceneMarkers] = useState<number[]>([]);
    
    // AI Quality Enhancement
    const [isUpscaled, setIsUpscaled] = useState<boolean>(false);
    const [isBitrateImproved, setIsBitrateImproved] = useState<boolean>(false);
    
    // Color Correction State
    const [brightness, setBrightness] = useState<number>(100);
    const [contrast, setContrast] = useState<number>(100);
    const [saturation, setSaturation] = useState<number>(100);
    const [hue, setHue] = useState<number>(0);
    const [activeEffect, setActiveEffect] = useState<string>('None');

    const [analysisPrompt, setAnalysisPrompt] = useState<string>('Describe this frame, focusing on subjects, actions, and composition.');
    const [analysisResult, setAnalysisResult] = useState<string>('');
    const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);

    const [genPrompt, setGenPrompt] = useState<string>('A cinematic shot of a futuristic city skyline at night, with flying cars.');
    const [genAspectRatio, setGenAspectRatio] = useState<'16:9' | '9:16'>('16:9');
    
    const [isCinematicModalOpen, setIsCinematicModalOpen] = useState(false);
    const [cinematicIntensity, setCinematicIntensity] = useState(50);
    const [depthBlur, setDepthBlur] = useState(30);
    const [videoFilterStyle, setVideoFilterStyle] = useState<{ filter?: string }>({});
    const [validationErrors, setValidationErrors] = useState<{ [key: string]: string }>({});

    // New AI tools state
    const [isSelectingForRemoval, setIsSelectingForRemoval] = useState(false);
    const [selectionRect, setSelectionRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
    const [isDrawingSelection, setIsDrawingSelection] = useState(false);
    const selectionStartPointRef = useRef<{ x: number; y: number } | null>(null);

    const [isObjectReplacementModalOpen, setIsObjectReplacementModalOpen] = useState(false);
    const [objectToRemovePrompt, setObjectToRemovePrompt] = useState('');
    const [objectToAddPrompt, setObjectToAddPrompt] = useState('');
    const [isSlowMoModalOpen, setIsSlowMoModalOpen] = useState(false);
    const [slowMoFactor, setSlowMoFactor] = useState(0.5);
    const [isStyleTransferModalOpen, setIsStyleTransferModalOpen] = useState(false);
    const [styleTransferPrompt, setStyleTransferPrompt] = useState('An old, grainy 1920s film');
    const [isMusicModalOpen, setIsMusicModalOpen] = useState(false);
    const [musicPrompt, setMusicPrompt] = useState('Upbeat and adventurous for a travel video');
    const [suggestedTracks, setSuggestedTracks] = useState<string[]>([]);
    const [appliedMusic, setAppliedMusic] = useState<string | null>(null);
    const [isStabilized, setIsStabilized] = useState<boolean>(false);

    const [openSection, setOpenSection] = useState('ai');
    
    const addToast = useToast();

    const videoStyle = useMemo(() => {
        const effectFilters: { [key: string]: string } = {
            'Old Film': 'sepia(0.6) contrast(1.1) brightness(0.9) saturate(1.2)',
            'Neon Glow': 'saturate(2) contrast(1.5)',
            'Glitch': 'none', // Placeholder, real glitch is complex
        };

        const cssFilters = [
            (activeFilter.style.filter !== 'none') ? activeFilter.style.filter : undefined,
            videoFilterStyle.filter,
            `brightness(${brightness}%)`,
            `contrast(${contrast}%)`,
            `saturate(${saturation}%)`,
            `hue-rotate(${hue}deg)`,
            effectFilters[activeEffect],
        ].filter(Boolean).join(' ');

        return {
            filter: cssFilters,
            animation: activeEffect === 'Glitch' ? 'glitch-anim 1s infinite' : 'none'
        };
    }, [activeFilter, videoFilterStyle, brightness, contrast, saturation, hue, activeEffect]);
    
    const resetEditState = () => {
        setSuggestedClips([]);
        setSubtitles([]);
        setActiveSubtitle('');
        setSceneMarkers([]);
        setIsUpscaled(false);
        setIsBitrateImproved(false);
        setAnalysisResult('');
        setActiveFilter(filters[0]);
        setVideoFilterStyle({});
        setPlaybackRate(1);
        setBrightness(100);
        setContrast(100);
        setSaturation(100);
        setHue(0);
        setActiveEffect('None');
        setIsStabilized(false);
        setOriginalVideoUrl(null);
        setAppliedMusic(null);
    };

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
        setOriginalVideoUrl(url);
        resetEditState();
        setOpenSection('ai'); // Switch focus to editing tools
        addHistoryItem('Video Suite', 'Loaded a video', 'video');
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
          processFile(file);
        }
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
        if (file) {
            processFile(file);
        }
    };

    const handleLoadedMetadata = () => {
        if (videoRef.current) {
          const vidDuration = videoRef.current.duration;
          setDuration(vidDuration);
          if (!videoUrl?.includes('#t=')) {
              setTrimRange([0, vidDuration]);
          }
        }
    };

    const handleTimeUpdate = () => {
        if (videoRef.current) {
            const newTime = videoRef.current.currentTime;
            setCurrentTime(newTime);

            const [start, end] = trimRange;
            if (duration > 0 && (start > 0 || end < duration)) {
                if (newTime >= end || newTime < start) {
                    if (isPlaying) {
                        videoRef.current.currentTime = start;
                        videoRef.current.play().catch(e => console.error("Loop play error:", e));
                    }
                }
            }
        }
    };

    const handlePlayPause = () => {
        if (videoRef.current) {
            if (videoRef.current.paused) {
                videoRef.current.play().catch(e => console.error("Play error:", e));
            } else {
                videoRef.current.pause();
            }
        }
    };
    
    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.playbackRate = playbackRate;
        }
    }, [playbackRate]);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;
        const onPlay = () => setIsPlaying(true);
        const onPause = () => setIsPlaying(false);
        video.addEventListener('play', onPlay);
        video.addEventListener('pause', onPause);
        return () => {
            video.removeEventListener('play', onPlay);
            video.removeEventListener('pause', onPause);
        };
    }, [videoUrl]);
    
    useEffect(() => {
        const sub = subtitles.find(s => currentTime >= s.start && currentTime <= s.end);
        setActiveSubtitle(sub ? sub.text : '');
    }, [currentTime, subtitles]);

    const handleGenerateVideo = async () => {
        if (!genPrompt.trim()) {
            setValidationErrors({ genPrompt: 'Please enter a prompt to generate a video.' });
            return;
        }
        setIsLoading('Generating video...');
        setError('');
        try {
            const url = await generateVideo(genPrompt, genAspectRatio, undefined, { 
                resolution: '720p',
                bitrate: 5000,
            });
            setVideoUrl(url);
            setOriginalVideoUrl(url);
            addHistoryItem('Video Suite', 'Generated a video from prompt', 'video', url);
        } catch (err) {
            setError('Failed to generate video.');
        } finally {
            setIsLoading(null);
        }
    };
    
    const handleAnalyzeFrame = async () => {
        if (!videoRef.current) return;
        setIsAnalyzing(true);
        setAnalysisResult('');
        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const base64 = canvas.toDataURL('image/jpeg').split(',')[1];
        
        try {
            const result = await analyzeFrame(base64, 'image/jpeg', analysisPrompt);
            setAnalysisResult(result);
            addHistoryItem('Video Suite', 'Analyzed video frame', 'video');
        } catch (err) {
            setError('Failed to analyze frame.');
        } finally {
            setIsAnalyzing(false);
        }
    };
    
    const handleAutoCut = async () => {
        if (duration === 0) return;
        setIsLoading('Generating auto-cuts...');
        try {
            const clips = await generateAutoCut(duration, autoCutPrompt);
            setSuggestedClips(clips);
            addToast('AI Auto-Cut complete!', 'success');
            addHistoryItem('Video Suite', 'Generated auto-cuts', 'video');
        } catch (err) {
            addToast('Failed to generate auto-cuts.', 'error');
        } finally {
            setIsLoading(null);
        }
    };
    
    const handleGenerateSubtitles = async () => {
        if (duration === 0) return;
        setIsLoading('Generating subtitles...');
        try {
            const subs = await generateSubtitles(duration);
            setSubtitles(subs);
            addToast('Subtitles generated!', 'success');
             addHistoryItem('Video Suite', 'Generated subtitles', 'video');
        } catch (err) {
            addToast('Failed to generate subtitles.', 'error');
        } finally {
            setIsLoading(null);
        }
    };

    const handleDetectScenes = async () => {
        if (duration === 0) return;
        setIsLoading('Detecting scenes...');
        try {
            const markers = await detectScenes(duration);
            setSceneMarkers(markers);
            addToast('Scene detection complete!', 'success');
            addHistoryItem('Video Suite', 'Detected scenes', 'video');
        } catch (err) {
            addToast('Failed to detect scenes.', 'error');
        } finally {
            setIsLoading(null);
        }
    };

    const handleUpscaleVideo = async () => {
        setIsLoading('Upscaling resolution...');
        try {
            await enhanceVideoQuality(); // Re-use the generic mock
            setIsUpscaled(true);
            addToast('Video resolution upscaled!', 'success');
            addHistoryItem('Video Suite', 'Upscaled video resolution', 'video');
        } catch(err) {
            addToast('Failed to upscale video.', 'error');
        } finally {
            setIsLoading(null);
        }
    };
    
    const handleImproveBitrate = async () => {
        setIsLoading('Improving bitrate...');
        try {
            await enhanceVideoQuality(); // Re-use the generic mock
            setIsBitrateImproved(true);
            addToast('Video bitrate improved!', 'success');
            addHistoryItem('Video Suite', 'Improved video bitrate', 'video');
        } catch(err) {
            addToast('Failed to improve bitrate.', 'error');
        } finally {
            setIsLoading(null);
        }
    };

    const handleApplyCinematicMode = async () => {
        setIsLoading('Applying cinematic mode...');
        setIsCinematicModalOpen(false);
        try {
            const styleString = await applyCinematicMode(cinematicIntensity, depthBlur);
            setVideoFilterStyle({ filter: styleString });
            addToast('Cinematic mode applied!', 'success');
            addHistoryItem('Video Suite', 'Applied cinematic mode', 'video');
        } catch(err) {
            addToast('Failed to apply cinematic mode.', 'error');
        } finally {
            setIsLoading(null);
        }
    };

    const handleApplyEffect = (effect: string) => {
        setActiveEffect(effect);
        if (effect !== 'None') {
            addToast(`${effect} effect applied.`, 'info');
        }
    }

    const handleResetColor = () => {
        setBrightness(100);
        setContrast(100);
        setSaturation(100);
        setHue(0);
        addToast('Color adjustments have been reset.', 'info');
    };

    const handleStartObjectRemoval = () => {
        setIsSelectingForRemoval(true);
        if (videoRef.current && !videoRef.current.paused) {
            videoRef.current.pause();
        }
        addToast("Draw a box around the object to remove.", "info");
    };

    const handleCancelObjectRemoval = () => {
        setIsSelectingForRemoval(false);
        setSelectionRect(null);
        setIsDrawingSelection(false);
        selectionStartPointRef.current = null;
    };

    const handleConfirmObjectRemoval = async () => {
        if (!selectionRect) return;
        setIsLoading('Removing object...');
        
        // The mock service just needs a string. Let's describe the action.
        const prompt = `the object within the selected rectangle`;
        try {
            const newUrl = await removeObjectFromVideo(prompt);
            setVideoUrl(newUrl);
            addToast('Object successfully removed!', 'success');
            addHistoryItem('Video Suite', 'Removed object from video', 'video', newUrl);
        } catch(err) {
            addToast('Failed to remove object.', 'error');
        } finally {
            setIsLoading(null);
            handleCancelObjectRemoval();
        }
    };

    const handleSelectionMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        e.preventDefault();
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        selectionStartPointRef.current = { x, y };
        setIsDrawingSelection(true);
        setSelectionRect(null); // Clear previous rect
    };

    const handleSelectionMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isDrawingSelection || !selectionStartPointRef.current) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const currentX = e.clientX - rect.left;
        const currentY = e.clientY - rect.top;

        const startX = selectionStartPointRef.current.x;
        const startY = selectionStartPointRef.current.y;

        const newRect = {
            x: Math.min(startX, currentX),
            y: Math.min(startY, currentY),
            width: Math.abs(currentX - startX),
            height: Math.abs(currentY - startY),
        };
        setSelectionRect(newRect);
    };

    const handleSelectionMouseUp = () => {
        setIsDrawingSelection(false);
    };

    const handleReplaceObject = async () => {
        if (!objectToRemovePrompt.trim() || !objectToAddPrompt.trim()) {
            setValidationErrors({ objectReplacement: 'Please describe both the object to remove and the object to add.' });
            return;
        }
        setIsLoading('Replacing object...');
        setIsObjectReplacementModalOpen(false);
        try {
            const newUrl = await replaceObjectInVideo(objectToRemovePrompt, objectToAddPrompt);
            setVideoUrl(newUrl);
            addToast('Object successfully replaced!', 'success');
            addHistoryItem('Video Suite', 'Replaced object in video', 'video', newUrl);
        } catch(err) {
            addToast('Failed to replace object.', 'error');
        } finally {
            setIsLoading(null);
            setObjectToRemovePrompt('');
            setObjectToAddPrompt('');
            setValidationErrors({});
        }
    };

    const handleApplySlowMo = async () => {
        setIsLoading('Applying slow motion...');
        setIsSlowMoModalOpen(false);
        try {
            const newUrl = await applySlowMotion(slowMoFactor);
            setVideoUrl(newUrl);
            addToast(`Slow motion (${slowMoFactor.toFixed(2)}x) applied!`, 'success');
            addHistoryItem('Video Suite', `Applied ${slowMoFactor.toFixed(2)}x slow motion`, 'video', newUrl);
        } catch(err) {
            addToast('Failed to apply slow motion.', 'error');
        } finally {
            setIsLoading(null);
        }
    };

    const handleStyleTransfer = async () => {
        if (!styleTransferPrompt.trim()) {
            setValidationErrors({ styleTransfer: 'Please describe a style.' });
            return;
        }
        setIsLoading('Transferring style...');
        setIsStyleTransferModalOpen(false);
        try {
            const newUrl = await transferVideoStyle(styleTransferPrompt);
            setVideoUrl(newUrl);
            addToast('Style transfer complete!', 'success');
            addHistoryItem('Video Suite', 'Applied video style transfer', 'video', newUrl);
        } catch(err) {
            addToast('Failed to transfer style.', 'error');
        } finally {
            setIsLoading(null);
            setStyleTransferPrompt('An old, grainy 1920s film');
            setValidationErrors({});
        }
    };

    const handleSuggestMusic = async () => {
        if (!musicPrompt.trim()) {
            setValidationErrors({ music: 'Please describe the music you want.' });
            return;
        }
        setValidationErrors({});
        setIsLoading('Suggesting music...');
        setSuggestedTracks([]);
        try {
            const tracks = await suggestMusic(musicPrompt);
            setSuggestedTracks(tracks);
        } catch (err) {
            addToast('Failed to suggest music.', 'error');
        } finally {
            setIsLoading(null);
        }
    };

    const handleApplyMusic = (trackName: string) => {
        setAppliedMusic(trackName);
        addToast(`Applying "${trackName}" to timeline... (mock)`, 'success');
        addHistoryItem('Video Suite', `Applied music: ${trackName}`, 'video');
        setIsMusicModalOpen(false);
        setSuggestedTracks([]);
        setMusicPrompt('Upbeat and adventurous for a travel video');
    };

    const handleStabilizeVideo = async () => {
        setIsLoading('Stabilizing video...');
        try {
            await stabilizeVideo();
            setIsStabilized(true);
            addToast('Video stabilization applied!', 'success');
            addHistoryItem('Video Suite', 'Applied video stabilization', 'video');
        } catch (err) {
            addToast('Failed to stabilize video.', 'error');
        } finally {
            setIsLoading(null);
        }
    };

    const handleSetStartPoint = () => {
        if (videoRef.current) {
            const newStart = videoRef.current.currentTime;
            if (newStart >= trimRange[1]) {
                addToast("Start point must be before end point.", "error");
                return;
            }
            setTrimRange([newStart, trimRange[1]]);
        }
    };

    const handleSetEndPoint = () => {
        if (videoRef.current) {
            const newEnd = videoRef.current.currentTime;
            if (newEnd <= trimRange[0]) {
                addToast("End point must be after start point.", "error");
                return;
            }
            setTrimRange([trimRange[0], newEnd]);
        }
    };

    const handleApplyTrim = () => {
        if (!originalVideoUrl) return;
        const [start, end] = trimRange;
        const baseUrl = originalVideoUrl.split('#t=')[0];
        const newUrl = `${baseUrl}#t=${start.toFixed(2)},${end.toFixed(2)}`;
        setVideoUrl(newUrl);
        addToast('Trim applied!', 'success');
        addHistoryItem('Video Suite', `Applied trim from ${formatTime(start)} to ${formatTime(end)}`, 'video');
    };

    const handleResetTrim = () => {
        if (!originalVideoUrl) return;
        const baseUrl = originalVideoUrl.split('#t=')[0];
        setVideoUrl(baseUrl);
        setTrimRange([0, duration]);
        addToast('Trim reset to original video.', 'info');
    };
    
    // UI Components
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
                    <p className="text-sm text-brand-subtle dark:text-slate-400">MP4, MOV, WEBM supported</p>
                    <input id="video-upload" type="file" accept="video/*" className="hidden" onChange={handleFileChange} />
                </label>
            </Card>
             <Card>
                <div className="space-y-4 text-center">
                    <Icon name="sparkles" className="w-12 h-12 text-brand-primary mx-auto" />
                    <h3 className="text-xl font-semibold text-brand-text dark:text-slate-200">Generate with AI</h3>
                    <p className="text-brand-subtle dark:text-slate-400">Describe the video you want to create, and let AI bring it to life.</p>
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
                        <div
                            className={`relative w-full h-full ${isSelectingForRemoval ? 'cursor-crosshair' : ''}`}
                            onMouseDown={isSelectingForRemoval ? handleSelectionMouseDown : undefined}
                            onMouseMove={isSelectingForRemoval ? handleSelectionMouseMove : undefined}
                            onMouseUp={isSelectingForRemoval ? handleSelectionMouseUp : undefined}
                        >
                            <video
                                ref={videoRef}
                                src={videoUrl!}
                                className={`w-full h-full object-contain ${isStabilized ? 'video-stabilized' : ''}`}
                                onLoadedMetadata={handleLoadedMetadata}
                                onTimeUpdate={handleTimeUpdate}
                                style={videoStyle}
                                controls
                            />
                            {activeSubtitle && (
                                <div className="absolute bottom-16 left-1/2 -translate-x-1/2 w-full px-4 text-center pointer-events-none">
                                    <p className="py-1 px-3 bg-black/60 text-white text-lg md:text-xl rounded">{activeSubtitle}</p>
                                </div>
                            )}
                             {isSelectingForRemoval && (
                                <div className="absolute inset-0 bg-black/30 pointer-events-none">
                                    {selectionRect && (
                                        <div
                                            className="absolute border-2 border-dashed border-white bg-white/20"
                                            style={{
                                                left: selectionRect.x,
                                                top: selectionRect.y,
                                                width: selectionRect.width,
                                                height: selectionRect.height,
                                            }}
                                        />
                                    )}
                                </div>
                            )}
                        </div>
                        {isLoading && (
                             <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-2 text-white">
                                <Spinner />
                                <p className="font-semibold">{isLoading}</p>
                             </div>
                        )}
                    </div>
                </Card>
                <Card>
                  <div className="w-full">
                      <DualRangeSlider min={0} max={duration} value={trimRange} onChange={setTrimRange} step={0.1} />
                      <div className="relative h-8 mt-2 w-full bg-slate-200 dark:bg-slate-700 rounded-lg">
                          <div 
                              className="absolute top-0 h-full w-0.5 bg-red-500 z-20"
                              style={{ left: `${(currentTime / duration) * 100}%` }}
                          />
                          {suggestedClips.map((clip, i) => (
                              <div
                                  key={`clip-${i}`}
                                  className="absolute top-0 h-full bg-brand-primary/50 rounded-md cursor-pointer hover:bg-brand-primary/70"
                                  style={{
                                      left: `${(clip.start / duration) * 100}%`,
                                      width: `${((clip.end - clip.start) / duration) * 100}%`,
                                  }}
                                  onClick={() => videoRef.current && (videoRef.current.currentTime = clip.start)}
                              />
                          ))}
                          {sceneMarkers.map((marker, i) => (
                              <div
                                  key={`marker-${i}`}
                                  className="absolute top-0 h-full w-0.5 bg-fuchsia-500 z-10"
                                  style={{ left: `${(marker / duration) * 100}%` }}
                              />
                          ))}
                           {appliedMusic && (
                              <div className="absolute bottom-0 h-full bg-emerald-500/30 rounded-lg flex items-center" style={{ left: 0, width: '100%'}}>
                                  <div className="flex items-center h-full px-2">
                                      <Icon name="music" className="w-4 h-4 text-emerald-800 dark:text-emerald-200" />
                                      <span className="text-emerald-800 dark:text-emerald-200 text-xs ml-1 truncate font-medium">{appliedMusic}</span>
                                  </div>
                              </div>
                          )}
                      </div>
                  </div>
                </Card>
               {isSelectingForRemoval && (
                    <Card className="p-4 flex items-center justify-between animate-fade-in">
                        <p className="font-semibold text-brand-text dark:text-slate-200">Draw on the video to select an object.</p>
                        <div className="flex gap-2">
                            <Button variant="secondary" onClick={handleCancelObjectRemoval}>Cancel</Button>
                            <Button variant="primary" onClick={handleConfirmObjectRemoval} disabled={!selectionRect || isDrawingSelection}>Confirm</Button>
                        </div>
                    </Card>
                )}
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
                    <div className="flex flex-col h-full">
                        <AccordionSection title="AI Enhancement Suite" id="ai" openSection={openSection} setOpenSection={setOpenSection} info="Powerful AI tools to automatically improve and add content to your video." disabled={!videoUrl}>
                            <Button onClick={handleAutoCut} isLoading={isLoading === 'Generating auto-cuts...'} disabled={!videoUrl || !!isLoading} icon="scissors" variant="secondary" className="w-full justify-start">AI Auto-Cut</Button>
                            <Button onClick={handleGenerateSubtitles} isLoading={isLoading === 'Generating subtitles...'} disabled={!videoUrl || !!isLoading} icon="subtitles" variant="secondary" className="w-full justify-start">AI Subtitles</Button>
                            <Button onClick={handleDetectScenes} isLoading={isLoading === 'Detecting scenes...'} disabled={!videoUrl || !!isLoading} icon="sparkles" variant="secondary" className="w-full justify-start">AI Scene Detection</Button>
                            <Button onClick={() => setIsCinematicModalOpen(true)} isLoading={isLoading === 'Applying cinematic mode...'} disabled={!videoUrl || !!isLoading} icon="film" variant="secondary" className="w-full justify-start">AI Cinematic Mode</Button>
                            <Button onClick={() => setIsMusicModalOpen(true)} isLoading={isLoading === 'Suggesting music...'} disabled={!videoUrl || !!isLoading} icon="music" variant="secondary" className="w-full justify-start">AI Music Suggestion</Button>
                            <Button onClick={handleStabilizeVideo} isLoading={isLoading === 'Stabilizing video...'} disabled={!videoUrl || !!isLoading || isStabilized} icon="stabilize" variant="secondary" className="w-full justify-start">{isStabilized ? 'Video Stabilized' : 'Stabilize Video'}</Button>
                            <Button onClick={handleUpscaleVideo} isLoading={isLoading === 'Upscaling resolution...'} disabled={!videoUrl || !!isLoading || isUpscaled} icon="upscale" variant="secondary" className="w-full justify-start">{isUpscaled ? 'Resolution Upscaled' : 'AI Upscale Resolution'}</Button>
                            <Button onClick={handleImproveBitrate} isLoading={isLoading === 'Improving bitrate...'} disabled={!videoUrl || !!isLoading || isBitrateImproved} icon="star" variant="secondary" className="w-full justify-start">{isBitrateImproved ? 'Bitrate Improved' : 'AI Improve Bitrate'}</Button>
                            <Button onClick={handleStartObjectRemoval} isLoading={isLoading === 'Removing object...'} disabled={!videoUrl || !!isLoading || isSelectingForRemoval} icon="eraser" variant="secondary" className="w-full justify-start">AI Object Removal</Button>
                            <Button onClick={() => setIsObjectReplacementModalOpen(true)} isLoading={isLoading === 'Replacing object...'} disabled={!videoUrl || !!isLoading} icon="feather" variant="secondary" className="w-full justify-start">AI Object Replacement</Button>
                            <Button onClick={() => setIsSlowMoModalOpen(true)} isLoading={isLoading === 'Applying slow motion...'} disabled={!videoUrl || !!isLoading} icon="feather" variant="secondary" className="w-full justify-start">AI Slow Motion</Button>
                            <Button onClick={() => setIsStyleTransferModalOpen(true)} isLoading={isLoading === 'Transferring style...'} disabled={!videoUrl || !!isLoading} icon="palette" variant="secondary" className="w-full justify-start">AI Style Transfer</Button>
                        </AccordionSection>
                        
                        <AccordionSection title="Trimming & Cutting" id="trim" openSection={openSection} setOpenSection={setOpenSection} info="Precisely cut your video by setting start and end points. The timeline slider also adjusts the trim range." disabled={!videoUrl}>
                            <div className="text-center mb-2 font-mono text-sm dark:text-slate-300">
                                {formatTime(trimRange[0])} - {formatTime(trimRange[1])}
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <Button onClick={handleSetStartPoint} disabled={!videoUrl || !!isLoading} variant="secondary" className="text-xs">Set Start from Playhead</Button>
                                <Button onClick={handleSetEndPoint} disabled={!videoUrl || !!isLoading} variant="secondary" className="text-xs">Set End from Playhead</Button>
                            </div>
                            <div className="grid grid-cols-2 gap-2 mt-2">
                                <Button onClick={handleApplyTrim} disabled={!videoUrl || !!isLoading || (trimRange[0] === 0 && trimRange[1] >= duration)} variant="primary">Apply Trim</Button>
                                <Button onClick={handleResetTrim} disabled={!videoUrl || !!isLoading || !videoUrl?.includes('#t=')} variant="secondary">Reset Trim</Button>
                            </div>
                        </AccordionSection>

                        <AccordionSection title="Color & Filters" id="color" openSection={openSection} setOpenSection={setOpenSection} info="Apply professional color presets or fine-tune the look of your video with precise adjustments." disabled={!videoUrl}>
                             <div className="grid grid-cols-3 gap-2">
                                {filters.map(filter => (
                                    <Button key={filter.name} variant={activeFilter.name === filter.name ? 'primary' : 'secondary'} onClick={() => setActiveFilter(filter)} className="!text-xs !px-2 !py-2 w-full">{filter.name}</Button>
                                ))}
                            </div>
                            <div className="space-y-4 mt-4 pt-4 border-t dark:border-slate-600">
                                 <div className="flex justify-between items-center">
                                    <h4 className="font-semibold text-brand-text dark:text-slate-300">Advanced Correction</h4>
                                    <Button onClick={handleResetColor} variant="tool" className="!text-xs !py-1 !px-2">Reset</Button>
                                </div>
                                <Slider label="Brightness" value={brightness} onChange={(e) => setBrightness(Number(e.target.value))} min={50} max={150} />
                                <Slider label="Contrast" value={contrast} onChange={(e) => setContrast(Number(e.target.value))} min={50} max={150} />
                                <Slider label="Saturation" value={saturation} onChange={(e) => setSaturation(Number(e.target.value))} min={0} max={200} />
                                <Slider label="Hue" value={hue} onChange={(e) => setHue(Number(e.target.value))} min={-180} max={180} />
                            </div>
                        </AccordionSection>

                        <AccordionSection title="Playback & Effects" id="effects" openSection={openSection} setOpenSection={setOpenSection} info="Control playback speed and apply special mock effects." disabled={!videoUrl}>
                            <div>
                                 <label className="block text-sm font-medium text-brand-subtle dark:text-slate-400 mb-2">Playback Speed</label>
                                 <div className="grid grid-cols-4 gap-2">
                                    {[0.5, 1, 1.5, 2].map(rate => (
                                        <Button key={rate} variant={playbackRate === rate ? 'primary' : 'secondary'} onClick={() => setPlaybackRate(rate)} className="!text-xs !px-2 !py-2 w-full">{rate}x</Button>
                                    ))}
                                </div>
                            </div>
                            <div className="mt-4 pt-4 border-t dark:border-slate-600">
                                 <h4 className="font-semibold text-brand-text dark:text-slate-300 mb-2">Special Effects</h4>
                                 <div className="grid grid-cols-2 gap-2">
                                    {['None', 'Old Film', 'Neon Glow', 'Glitch'].map(effect => (
                                        <Button key={effect} variant={activeEffect === effect ? 'primary' : 'secondary'} onClick={() => handleApplyEffect(effect)} className="w-full !text-xs capitalize !px-2 !py-2">{effect}</Button>
                                    ))}
                                </div>
                            </div>
                        </AccordionSection>
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
        
        { !videoUrl ? <VideoUploadScreen /> : <VideoEditorUI /> }
        
        <Modal isOpen={isCinematicModalOpen} onClose={() => setIsCinematicModalOpen(false)} title="AI Cinematic Mode">
             <div className="space-y-6">
                <p className="text-brand-subtle dark:text-slate-400">Adjust the intensity of the cinematic look and the simulated depth of field.</p>
                 <Slider label="Cinematic Intensity" min={0} max={100} value={cinematicIntensity} onChange={(e) => setCinematicIntensity(Number(e.target.value))} />
                 <Slider label="Depth Blur" min={0} max={100} value={depthBlur} onChange={(e) => setDepthBlur(Number(e.target.value))} />
                 <div className="flex justify-end gap-2 pt-4 border-t dark:border-slate-700">
                    <Button variant="secondary" onClick={() => setIsCinematicModalOpen(false)}>Cancel</Button>
                    <Button variant="primary" onClick={handleApplyCinematicMode}>Apply</Button>
                </div>
             </div>
        </Modal>

        <Modal isOpen={isObjectReplacementModalOpen} onClose={() => setIsObjectReplacementModalOpen(false)} title="AI Object Replacement">
            <div className="space-y-4">
                <p className="text-brand-subtle dark:text-slate-400">Describe the object to remove and what you want to replace it with.</p>
                <div>
                    <label className="block text-sm font-medium text-brand-text dark:text-slate-300 mb-1">Object to Remove</label>
                    <textarea
                        value={objectToRemovePrompt}
                        onChange={(e) => {
                            setObjectToRemovePrompt(e.target.value);
                            if (validationErrors.objectReplacement) setValidationErrors({});
                        }}
                        rows={2}
                        className={`w-full p-2 border rounded-lg dark:bg-slate-800 dark:text-slate-100 ${validationErrors.objectReplacement ? 'border-red-500 ring-red-200' : 'border-slate-300 dark:border-slate-600 focus:ring-brand-primary'}`}
                        placeholder="e.g., the blue chair"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-brand-text dark:text-slate-300 mb-1">Replace with</label>
                    <textarea
                        value={objectToAddPrompt}
                        onChange={(e) => {
                            setObjectToAddPrompt(e.target.value);
                            if (validationErrors.objectReplacement) setValidationErrors({});
                        }}
                        rows={2}
                        className={`w-full p-2 border rounded-lg dark:bg-slate-800 dark:text-slate-100 ${validationErrors.objectReplacement ? 'border-red-500 ring-red-200' : 'border-slate-300 dark:border-slate-600 focus:ring-brand-primary'}`}
                        placeholder="e.g., a modern armchair"
                    />
                </div>
                {validationErrors.objectReplacement && <p className="text-red-500 text-sm mt-1">{validationErrors.objectReplacement}</p>}
                <div className="flex justify-end gap-2 pt-4 border-t dark:border-slate-700">
                    <Button variant="secondary" onClick={() => setIsObjectReplacementModalOpen(false)}>Cancel</Button>
                    <Button variant="primary" onClick={handleReplaceObject}>Replace Object</Button>
                </div>
            </div>
        </Modal>

        <Modal isOpen={isSlowMoModalOpen} onClose={() => setIsSlowMoModalOpen(false)} title="AI Slow Motion">
            <div className="space-y-6">
                <p className="text-brand-subtle dark:text-slate-400">Choose the speed for the slow-motion effect. 0.50x is half speed.</p>
                <Slider label={`Speed: ${slowMoFactor.toFixed(2)}x`} min={0.1} max={1.0} step={0.05} value={slowMoFactor} onChange={(e) => setSlowMoFactor(Number(e.target.value))} />
                <div className="flex justify-end gap-2 pt-4 border-t dark:border-slate-700">
                    <Button variant="secondary" onClick={() => setIsSlowMoModalOpen(false)}>Cancel</Button>
                    <Button variant="primary" onClick={handleApplySlowMo}>Apply Effect</Button>
                </div>
            </div>
        </Modal>

        <Modal isOpen={isStyleTransferModalOpen} onClose={() => setIsStyleTransferModalOpen(false)} title="AI Style Transfer">
            <div className="space-y-4">
                <p className="text-brand-subtle dark:text-slate-400">Describe the artistic style you want to apply to the entire video.</p>
                <textarea
                    value={styleTransferPrompt}
                    onChange={(e) => {
                        setStyleTransferPrompt(e.target.value);
                        if (validationErrors.styleTransfer) setValidationErrors({});
                    }}
                    rows={3}
                    className={`w-full p-2 border rounded-lg dark:bg-slate-800 dark:text-slate-100 ${validationErrors.styleTransfer ? 'border-red-500 ring-red-200' : 'border-slate-300 dark:border-slate-600 focus:ring-brand-primary'}`}
                    placeholder="e.g., watercolor painting, anime style, cyberpunk neon"
                />
                {validationErrors.styleTransfer && <p className="text-red-500 text-sm mt-1">{validationErrors.styleTransfer}</p>}
                <div className="flex justify-end gap-2 pt-4 border-t dark:border-slate-700">
                    <Button variant="secondary" onClick={() => setIsStyleTransferModalOpen(false)}>Cancel</Button>
                    <Button variant="primary" onClick={handleStyleTransfer}>Apply Style</Button>
                </div>
            </div>
        </Modal>

        <Modal isOpen={isMusicModalOpen} onClose={() => setIsMusicModalOpen(false)} title="AI Music Suggestion">
            <div className="space-y-4">
                <p className="text-brand-subtle dark:text-slate-400">Describe the mood, genre, or theme of music you need.</p>
                <textarea
                    value={musicPrompt}
                    onChange={(e) => {
                        setMusicPrompt(e.target.value);
                        if (validationErrors.music) setValidationErrors({});
                    }}
                    rows={3}
                    className={`w-full p-2 border rounded-lg dark:bg-slate-800 dark:text-slate-100 ${validationErrors.music ? 'border-red-500 ring-red-200' : 'border-slate-300 dark:border-slate-600 focus:ring-brand-primary'}`}
                    placeholder="e.g., happy ukulele for a vlog, intense orchestral for a trailer"
                />
                {validationErrors.music && <p className="text-red-500 text-sm mt-1">{validationErrors.music}</p>}
                <Button onClick={handleSuggestMusic} isLoading={isLoading === 'Suggesting music...'} disabled={!!isLoading} icon="sparkles" className="w-full">
                    Suggest Music
                </Button>
                {suggestedTracks.length > 0 && (
                    <div className="space-y-2 pt-4 border-t dark:border-slate-700">
                        <h4 className="font-semibold text-brand-text dark:text-slate-200">Suggestions</h4>
                        {suggestedTracks.map((track, index) => (
                            <div key={index} className="flex justify-between items-center p-2 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                                <span>{track}</span>
                                <Button onClick={() => handleApplyMusic(track)} variant="secondary" className="!py-1 !px-3">Apply</Button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </Modal>
    </div>
  );
};

export default VideoEditor;