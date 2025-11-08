import React, { useState, DragEvent } from 'react';
import { HistoryItem } from '../types';
import { generatePixelArt, pixelateImage } from '../services/geminiService';
import { fileToBase64 } from '../utils/file';
import Card from './common/Card';
import Button from './common/Button';
import Icon from './common/Icon';
import Slider from './common/Slider';
import Spinner from './common/Spinner';
import { useToast } from '../hooks/useToast';

interface PixelArtStudioProps {
  addHistoryItem: (featureName: string, action: string, icon: HistoryItem['icon'], previewUrl?: string, prompt?: string) => void;
}

type Mode = 'generate' | 'convert';
type Palette = 'Automatic' | 'Retro Game' | 'Vibrant' | 'Grayscale';

const PixelArtStudio: React.FC<PixelArtStudioProps> = ({ addHistoryItem }) => {
    const [mode, setMode] = useState<Mode>('generate');
    const [prompt, setPrompt] = useState<string>('A heroic knight with a sword and shield');
    const [pixelSize, setPixelSize] = useState<number>(8);
    const [palette, setPalette] = useState<Palette>('Automatic');
    const [isGenerating, setIsGenerating] = useState<boolean>(false);
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);
    const [sourceImage, setSourceImage] = useState<{ url: string; base64: string, mimeType: string; } | null>(null);
    const [isDraggingOver, setIsDraggingOver] = useState<boolean>(false);
    const addToast = useToast();

    const handleGenerate = async () => {
        if (!prompt.trim()) {
            addToast('Please enter a prompt to generate pixel art.', 'error');
            return;
        }
        setIsGenerating(true);
        setGeneratedImage(null);
        try {
            const result = await generatePixelArt(prompt, pixelSize);
            setGeneratedImage(result);
            addHistoryItem('Pixel Art Studio', 'Generated pixel art from prompt', 'layout-grid', `data:image/png;base64,${result}`, prompt);
        } catch (error) {
            addToast('Failed to generate pixel art.', 'error');
        } finally {
            setIsGenerating(false);
        }
    };
    
    const handleConvert = async () => {
        if (!sourceImage) {
            addToast('Please upload an image to convert.', 'error');
            return;
        }
        setIsGenerating(true);
        setGeneratedImage(null);
        try {
            const result = await pixelateImage(sourceImage.base64, sourceImage.mimeType);
            setGeneratedImage(result);
             addHistoryItem('Pixel Art Studio', 'Converted image to pixel art', 'layout-grid', `data:image/png;base64,${result}`);
        } catch (error) {
            addToast('Failed to convert image.', 'error');
        } finally {
            setIsGenerating(false);
        }
    };

    const processFile = async (file: File) => {
        if (!file.type.startsWith('image/')) {
            addToast('Please upload a valid image file.', 'error');
            return;
        }
        const url = URL.createObjectURL(file);
        const base64 = await fileToBase64(file);
        setSourceImage({ url, base64, mimeType: file.type });
        setGeneratedImage(null); // Clear previous result
        setMode('convert'); // Switch to convert mode automatically
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) processFile(file);
    };
    
    const handleDragEvents = (e: DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDragEnter = (e: DragEvent<HTMLLabelElement>) => {
        handleDragEvents(e);
        if (mode === 'convert') setIsDraggingOver(true);
    };
    
    const handleDragLeave = (e: DragEvent<HTMLLabelElement>) => {
        handleDragEvents(e);
        setIsDraggingOver(false);
    };

    const handleDrop = (e: DragEvent<HTMLLabelElement>) => {
        handleDragEvents(e);
        setIsDraggingOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file && mode === 'convert') processFile(file);
    };

    return (
        <div className="max-w-6xl mx-auto">
            <h2 className="text-4xl font-bold text-center mb-2 dark:text-slate-100">AI Pixel Art Studio</h2>
            <p className="text-center text-lg text-brand-subtle dark:text-slate-400 mb-8">Generate retro sprites or pixelate your photos with AI.</p>
            
            <div className="grid lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1">
                    <Card>
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-lg font-semibold text-brand-text dark:text-slate-200 mb-3">Mode</h3>
                                <div className="flex gap-2 bg-slate-100 dark:bg-slate-700/50 p-1 rounded-xl">
                                    <Button onClick={() => setMode('generate')} variant={mode === 'generate' ? 'primary' : 'secondary'} className={`flex-1 ${mode !== 'generate' && '!bg-transparent dark:!bg-transparent !border-0'}`}>Generate</Button>
                                    <Button onClick={() => setMode('convert')} variant={mode === 'convert' ? 'primary' : 'secondary'} className={`flex-1 ${mode !== 'convert' && '!bg-transparent dark:!bg-transparent !border-0'}`}>Convert</Button>
                                </div>
                            </div>
                            
                             {mode === 'generate' ? (
                                <div>
                                    <label className="block text-sm font-medium text-brand-text dark:text-slate-300 mb-2">Prompt</label>
                                    <textarea
                                        value={prompt}
                                        onChange={e => setPrompt(e.target.value)}
                                        placeholder="e.g., A cute slime monster"
                                        rows={4}
                                        className="w-full p-2 border rounded-lg dark:bg-slate-800 dark:text-slate-100 border-slate-300 dark:border-slate-600 focus:ring-brand-primary"
                                    />
                                </div>
                            ) : (
                                <div>
                                     <label className="block text-sm font-medium text-brand-text dark:text-slate-300 mb-2">Upload Image</label>
                                     <label 
                                        htmlFor="pixel-art-upload" 
                                        className={`w-full h-32 flex flex-col items-center justify-center cursor-pointer transition-colors p-4 border-2 border-dashed rounded-xl ${isDraggingOver ? 'bg-slate-200 dark:bg-slate-700 border-brand-primary' : 'bg-transparent border-slate-300 dark:border-slate-600'}`}
                                        onDragEnter={handleDragEnter} onDragOver={handleDragEvents} onDragLeave={handleDragLeave} onDrop={handleDrop}>
                                        {sourceImage ? (
                                            <img src={sourceImage.url} alt="Source" className="max-h-full max-w-full object-contain rounded" />
                                        ) : (
                                            <div className="text-center text-brand-subtle dark:text-slate-400">
                                                <Icon name="upload" className="w-8 h-8 mx-auto mb-1" />
                                                <p className="text-sm">Upload or drop an image</p>
                                            </div>
                                        )}
                                    </label>
                                    <input id="pixel-art-upload" type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                                </div>
                            )}

                            <div>
                                <h3 className="text-lg font-semibold text-brand-text dark:text-slate-200 mb-3">Settings</h3>
                                <div className="space-y-4">
                                     <Slider label="Pixel Size" min={2} max={24} step={1} value={pixelSize} onChange={e => setPixelSize(Number(e.target.value))} />
                                     <div>
                                        <label className="block text-sm font-medium text-brand-subtle dark:text-slate-400 mb-2">Color Palette (Mock)</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {(['Automatic', 'Retro Game', 'Vibrant', 'Grayscale'] as Palette[]).map(p => (
                                                <Button key={p} variant={palette === p ? 'primary' : 'secondary'} onClick={() => setPalette(p)}>{p}</Button>
                                            ))}
                                        </div>
                                     </div>
                                </div>
                            </div>
                             <Button onClick={mode === 'generate' ? handleGenerate : handleConvert} isLoading={isGenerating} disabled={isGenerating} icon="layout-grid" className="w-full !py-4 text-lg">
                                {mode === 'generate' ? 'Generate Art' : 'Convert Image'}
                            </Button>
                        </div>
                    </Card>
                </div>
                <div className="lg:col-span-2">
                    <Card className="h-full">
                        <div className="flex flex-col items-center justify-center w-full h-full min-h-[60vh] bg-slate-100 dark:bg-slate-800/50 rounded-lg p-4">
                            {isGenerating ? (
                                <div className="text-center">
                                    <Spinner />
                                    <p className="mt-2 font-semibold text-brand-text dark:text-slate-200">Pixelating...</p>
                                </div>
                            ) : generatedImage ? (
                                <img src={`data:image/png;base64,${generatedImage}`} alt="Generated Pixel Art" className="max-w-full max-h-full object-contain" style={{ imageRendering: 'pixelated' }} />
                            ) : (
                                <div className="text-center text-brand-subtle dark:text-slate-400">
                                    <Icon name="layout-grid" className="w-16 h-16 mx-auto mb-4" />
                                    <h3 className="text-xl font-semibold text-brand-text dark:text-slate-200">Your pixel art will appear here</h3>
                                    <p>{mode === 'generate' ? 'Describe your sprite and click Generate.' : 'Upload an image and click Convert.'}</p>
                                </div>
                            )}
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default PixelArtStudio;
