import React, { useState, useEffect, useMemo } from 'react';
import { generateImages, enhancePrompt, outpaintImage, analyzeImage, upscaleImage } from '../services/geminiService';
import { fileToBase64 } from '../utils/file';
import { HistoryItem } from '../types';
import Card from './common/Card';
import Button from './common/Button';
import Icon from './common/Icon';
import Spinner from './common/Spinner';
import Modal from './common/Modal';
import Slider from './common/Slider';
import { useToast } from '../hooks/useToast';
import { useSession } from '../hooks/useSession';

type AspectRatio = '1:1' | '16:9' | '9:16';
type Style = 'Photorealistic' | 'Cartoon' | 'Watercolor' | 'Sci-Fi' | 'Fantasy' | 'Abstract' | 'Anime' | 'Pixel Art' | '3D Render' | 'Cyberpunk' | 'Steampunk' | 'Impressionist' | 'Surreal';
type PromptHistoryItem = {
    elements: string[];
    details: string;
    style: Style;
    negativePrompt: string;
}
type Suggestion = { text: string; action: () => void; icon: React.ComponentProps<typeof Icon>['name'] };
interface ImageGeneratorProps {
  addHistoryItem: (featureName: string, action: string, icon: HistoryItem['icon'], previewUrl?: string, prompt?: string) => void;
  setSuggestion: (suggestion: Suggestion | null) => void;
}

const SkeletonLoader: React.FC<{ aspectRatio: AspectRatio }> = ({ aspectRatio }) => {
    const aspectRatioClasses: Record<AspectRatio, string> = {
        '1:1': 'aspect-square',
        '16:9': 'aspect-video',
        '9:16': 'aspect-[9/16]',
    };

    return (
        <div className={`w-full bg-slate-100 dark:bg-slate-800 rounded-lg ${aspectRatioClasses[aspectRatio]} overflow-hidden relative`}>
             <div className="absolute top-0 left-0 w-full h-full bg-slate-200 dark:bg-slate-700">
                <div 
                    style={{ animation: 'shimmer 1.5s infinite linear' }}
                    className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-slate-50/10 dark:via-white/10 to-transparent -translate-x-full"
                />
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
                <Icon name="palette" className="w-12 h-12 text-slate-300 dark:text-slate-600" />
            </div>
        </div>
    );
};


const ImageGenerator: React.FC<ImageGeneratorProps> = ({ addHistoryItem, setSuggestion }) => {
    const { themeOfTheDay } = useSession();

    // New structured state for photobashing
    const [elements, setElements] = useState<string[]>(['A majestic lion']);
    const [details, setDetails] = useState<string>('in the savanna at sunset, cinematic lighting');
    const [style, setStyle] = useState<Style>('Photorealistic');
    const [negativePrompt, setNegativePrompt] = useState<string>('');
    
    const [numberOfImages, setNumberOfImages] = useState<number>(2);
    const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isEnhancing, setIsEnhancing] = useState<boolean>(false);
    const [error, setError] = useState<string>('');
    const [validationErrors, setValidationErrors] = useState<{ elements?: string }>({});
    
    // Undo/Redo State
    const [generationHistory, setGenerationHistory] = useState<string[][]>([]);
    const [historyIndex, setHistoryIndex] = useState<number>(-1);
    const currentImages = generationHistory[historyIndex] || [];
    
    // Modals
    const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [isOutpaintModalOpen, setIsOutpaintModalOpen] = useState(false);
    const [isUpscaleModalOpen, setIsUpscaleModalOpen] = useState(false);
    
    // Per-image processing state
    const [processingState, setProcessingState] = useState<{index: number, type: 'outpainting' | 'upscaling'} | null>(null);
    
    // New state for advanced settings
    const [quality, setQuality] = useState<'Standard' | 'High'>('Standard');
    const [seed, setSeed] = useState<string>('');
    
    // Image Prompt State
    const [imagePromptFile, setImagePromptFile] = useState<string | null>(null);
    const [imagePromptMimeType, setImagePromptMimeType] = useState<string | null>(null);
    const [imagePromptUrl, setImagePromptUrl] = useState<string | null>(null);
    const [imageInfluence, setImageInfluence] = useState<number>(50);
    
    // Image Analysis State
    const [analysisPrompt, setAnalysisPrompt] = useState<string>('Describe this image in detail, focusing on the main subject, composition, and style.');
    const [analysisResult, setAnalysisResult] = useState<string>('');
    const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);

    // History State
    const [promptHistory, setPromptHistory] = useState<PromptHistoryItem[]>([]);
    const addToast = useToast();
    
    useEffect(() => {
        setElements([`A character inspired by the theme: ${themeOfTheDay}`]);
        setDetails('cinematic lighting, epic composition');
    }, [themeOfTheDay]);
    
    const finalPrompt = useMemo(() => {
        return [
            ...elements.filter(el => el.trim()),
            details.trim(),
            `style of ${style}`,
            negativePrompt.trim() ? `no ${negativePrompt.trim()}` : ''
        ].filter(Boolean).join(', ');
    }, [elements, details, style, negativePrompt]);

    const addToHistory = (item: PromptHistoryItem) => {
        setPromptHistory(prev => {
            const isDuplicate = prev.some(p => p.elements.join() === item.elements.join() && p.details === item.details && p.style === item.style && p.negativePrompt === item.negativePrompt);
            if (isDuplicate) return prev;
            return [item, ...prev].slice(0, 20); // Keep last 20 prompts
        });
    };
    
    const loadFromHistory = (item: PromptHistoryItem) => {
        setElements(item.elements);
        setDetails(item.details);
        setStyle(item.style);
        setNegativePrompt(item.negativePrompt);
        setIsHistoryModalOpen(false);
    };

    const validate = () => {
        const newErrors: { elements?: string } = {};
        if (elements.some(el => !el.trim())) {
            newErrors.elements = "Please ensure all photobash elements have a description.";
        }
        if (elements.length === 0 || elements.every(el => !el.trim())) {
             newErrors.elements = "Please provide at least one element for your image.";
        }
        setValidationErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleGenerate = async () => {
        if (!validate()) {
            return;
        }
        setIsLoading(true);
        setError('');
        setSuggestion(null);
        
        const currentPrompt = { elements, details, style, negativePrompt };
        addToHistory(currentPrompt);
        
        const images = await generateImages(finalPrompt, numberOfImages, aspectRatio, imagePromptFile ? { imagePrompt: { base64: imagePromptFile, influence: imageInfluence } } : undefined);
        const newHistory = generationHistory.slice(0, historyIndex + 1);
        const newHistoryWithCurrent = [...newHistory, images];
        setGenerationHistory(newHistoryWithCurrent);
        setHistoryIndex(newHistoryWithCurrent.length - 1);

        addHistoryItem('Image Generator', `Generated ${images.length} image(s)`, 'sparkles', undefined, finalPrompt);
        setIsLoading(false);
        setSuggestion({
            text: 'Animate this image?',
            icon: 'video',
            action: () => {
                addToast('Feature coming soon!', 'info');
                setSuggestion(null);
            }
        });
    };
    
    const handleUndo = () => {
        if (historyIndex > 0) {
            setHistoryIndex(prev => prev - 1);
            addToast('Undo successful', 'info');
        }
    };
    
    const handleRedo = () => {
        if (historyIndex < generationHistory.length - 1) {
            setHistoryIndex(prev => prev + 1);
            addToast('Redo successful', 'info');
        }
    };

    const handleEnhancePrompt = async () => {
        const firstElement = elements.find(el => el.trim());
        if (!firstElement) {
            setValidationErrors({ elements: 'Please enter at least one element before enhancing.' });
            addToast('Please enter an element to enhance.', 'error');
            return;
        }
        setIsEnhancing(true);
        try {
            const enhancedDetails = await enhancePrompt(firstElement);
            setDetails(enhancedDetails);
            addHistoryItem('Image Generator', 'Enhanced prompt with AI', 'sparkles');
            addToast('Prompt enhanced by AI!', 'success');
        } catch (err) {
            console.error("Prompt enhancement failed:", err);
            addToast('Failed to enhance prompt.', 'error');
        } finally {
            setIsEnhancing(false);
        }
    };
    
     const handleImagePromptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImagePromptUrl(URL.createObjectURL(file));
            const base64 = await fileToBase64(file);
            setImagePromptFile(base64);
            setImagePromptMimeType(file.type);
        }
    };

    const handleAnalyzeImage = async () => {
        if (!imagePromptFile || !imagePromptMimeType) {
            addToast('Please upload an image to analyze.', 'error');
            return;
        }
        setIsAnalyzing(true);
        setAnalysisResult('');
        setError('');

        try {
            const result = await analyzeImage(imagePromptFile, imagePromptMimeType, analysisPrompt);
            setAnalysisResult(result);
            addHistoryItem('Image Generator', 'Analyzed a reference image', 'photo');
        } catch (err) {
            setError('Failed to analyze image.');
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleOutpaint = async (direction: 'up' | 'down' | 'left' | 'right') => {
        if (processingState?.index === undefined) return;
        const sourceImage = currentImages[processingState.index];
        setProcessingState({ index: processingState.index, type: 'outpainting' });
        setIsOutpaintModalOpen(false);
        try {
            const newImage = await outpaintImage(sourceImage, direction);
            
            const newImageSet = [...currentImages];
            newImageSet[processingState.index] = newImage;

            const newHistory = generationHistory.slice(0, historyIndex + 1);
            const newHistoryWithOutpaint = [...newHistory, newImageSet];
            setGenerationHistory(newHistoryWithOutpaint);
            setHistoryIndex(newHistoryWithOutpaint.length - 1);

            addHistoryItem('Image Generator', `Outpainted image ${direction}`, 'sparkles');
        } catch(err) {
            setError('Failed to outpaint image.');
        } finally {
            setProcessingState(null);
        }
    };
    
    const handleUpscale = async (scale: number) => {
        if (processingState?.index === undefined) return;
        const sourceImage = currentImages[processingState.index];
        setProcessingState({ index: processingState.index, type: 'upscaling' });
        setIsUpscaleModalOpen(false);
        try {
            const newImage = await upscaleImage(sourceImage, scale);
            const newImageSet = [...currentImages];
            newImageSet[processingState.index] = newImage;

            const newHistory = generationHistory.slice(0, historyIndex + 1);
            const newHistoryWithUpscale = [...newHistory, newImageSet];
            setGenerationHistory(newHistoryWithUpscale);
            setHistoryIndex(newHistoryWithUpscale.length - 1);
            addHistoryItem('Image Generator', `Upscaled image by ${scale}x`, 'sparkles');
            addToast(`Image successfully upscaled by ${scale}x!`, 'success');
        } catch(err) {
            setError('Failed to upscale image.');
        } finally {
            setProcessingState(null);
        }
    };

    const handleDownload = (base64Image: string, index: number) => {
        const link = document.createElement('a');
        link.href = `data:image/svg+xml;base64,${base64Image}`;
        link.download = `generated-image-${index + 1}.svg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };
    
    const handleAddElement = () => setElements(prev => [...prev, '']);
    const handleRemoveElement = (index: number) => setElements(prev => prev.filter((_, i) => i !== index));
    const handleElementChange = (index: number, value: string) => {
        setElements(prev => prev.map((el, i) => i === index ? value : el));
        if (validationErrors.elements) setValidationErrors({});
    };

    const aspectRatioClasses: Record<AspectRatio, string> = {
        '1:1': 'aspect-square',
        '16:9': 'aspect-video',
        '9:16': 'aspect-[9/16]',
    };

    return (
        <div className="max-w-7xl mx-auto">
            <h2 className="text-4xl font-bold text-center mb-2 dark:text-slate-100">AI Image Generator</h2>
            <p className="text-center text-lg text-brand-subtle dark:text-slate-400 mb-8">Create unique images and entire 3D worlds from text descriptions.</p>
            <div className="grid lg:grid-cols-3 gap-8">
                {/* Controls Panel */}
                <div className="lg:col-span-1">
                    <Card className="h-full">
                        <div className="flex flex-col h-full space-y-6">
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                     <div className="flex items-center gap-2">
                                        <h3 className="text-lg font-semibold text-brand-text dark:text-slate-200">Describe your image</h3>
                                        <button onClick={() => setIsHelpModalOpen(true)} className="p-1 rounded-full text-brand-subtle dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700" aria-label="Prompting Guide">
                                            <Icon name="help" className="w-5 h-5" />
                                        </button>
                                    </div>
                                    <Button onClick={() => setIsHistoryModalOpen(true)} variant="tool" className="!p-1.5 !rounded-lg text-xs" icon="history">History</Button>
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-brand-text dark:text-slate-300 mb-1">Image Prompt <span className="text-brand-subtle dark:text-slate-400">(Optional)</span></label>
                                        <div className="flex items-center gap-2">
                                            <label htmlFor="image-prompt-upload" className="flex-grow p-2 text-center border-2 border-dashed rounded-lg cursor-pointer hover:border-brand-primary transition-colors text-brand-subtle dark:text-slate-400 border-slate-300 dark:border-slate-600">
                                                {imagePromptUrl ? 'Change Image' : 'Upload Image'}
                                            </label>
                                            <input id="image-prompt-upload" type="file" accept="image/*" className="hidden" onChange={handleImagePromptUpload} />
                                            {imagePromptUrl && <img src={imagePromptUrl} alt="Image prompt preview" className="w-12 h-12 object-cover rounded-lg" />}
                                        </div>
                                        {imagePromptUrl && (
                                            <div className="mt-2">
                                                <Slider label="Image Influence" min={0} max={100} value={imageInfluence} onChange={e => setImageInfluence(Number(e.target.value))} />
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-brand-text dark:text-slate-300 mb-2">AI Photobash Kit <span className="text-red-500">*</span></label>
                                        <div className="space-y-2">
                                          {elements.map((el, index) => (
                                              <div key={index} className="flex items-center gap-2">
                                                  <input
                                                      type="text"
                                                      value={el}
                                                      onChange={(e) => handleElementChange(index, e.target.value)}
                                                      placeholder={`Element ${index + 1}`}
                                                      className="w-full p-2 border rounded-lg focus:ring-2 focus:outline-none transition dark:text-slate-200 dark:bg-slate-700 border-slate-300 dark:border-slate-600 focus:ring-brand-primary"
                                                  />
                                                  {elements.length > 1 && (
                                                      <Button onClick={() => handleRemoveElement(index)} variant="icon" className="!bg-red-100 dark:!bg-red-900/50 text-red-500 hover:!bg-red-200 dark:hover:!bg-red-900">
                                                          <Icon name="x" className="w-4 h-4" />
                                                      </Button>
                                                  )}
                                              </div>
                                          ))}
                                        </div>
                                        {validationErrors.elements && <p className="text-red-500 text-sm mt-1">{validationErrors.elements}</p>}
                                        <Button onClick={handleAddElement} variant="secondary" className="w-full mt-2 text-sm !py-1">Add Element</Button>
                                    </div>
                                     <div>
                                        <label className="block text-sm font-medium text-brand-text dark:text-slate-300 mb-2">Style</label>
                                        <div className="grid grid-cols-3 gap-2">
                                            {(['Photorealistic', 'Cartoon', 'Watercolor', 'Sci-Fi', 'Fantasy', 'Abstract', 'Anime', 'Pixel Art', '3D Render', 'Cyberpunk', 'Steampunk', 'Impressionist', 'Surreal'] as Style[]).map(s => (
                                                <Button key={s} variant={style === s ? 'primary' : 'secondary'} onClick={() => setStyle(s)} className="w-full !text-xs !py-2 !px-1 capitalize">{s}</Button>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="flex items-center justify-between mb-1">
                                            <label className="block text-sm font-medium text-brand-text dark:text-slate-300">Additional Details</label>
                                            <Button onClick={handleEnhancePrompt} isLoading={isEnhancing} disabled={isEnhancing || isLoading || elements.every(el => !el.trim())} icon="sparkles" variant="tool" className="!p-1.5 !rounded-lg text-xs">Enhance</Button>
                                        </div>
                                        <textarea
                                            value={details}
                                            onChange={(e) => setDetails(e.target.value)}
                                            placeholder="e.g., cinematic lighting, high detail"
                                            rows={3}
                                            className="w-full p-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 dark:text-slate-200 rounded-lg focus:ring-2 focus:ring-brand-primary focus:outline-none transition"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-brand-text dark:text-slate-300 mb-1">Negative Prompt <span className="text-brand-subtle dark:text-slate-400">(Optional)</span></label>
                                        <input
                                            type="text"
                                            value={negativePrompt}
                                            onChange={(e) => setNegativePrompt(e.target.value)}
                                            placeholder="e.g., blurry, ugly, text"
                                            className="w-full p-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 dark:text-slate-200 rounded-lg focus:ring-2 focus:ring-brand-primary focus:outline-none transition"
                                        />
                                    </div>
                                    <div className="pt-2">
                                        <h4 className="text-sm font-semibold text-brand-subtle dark:text-slate-400 mb-2">Final Prompt Preview</h4>
                                        <p className="p-3 bg-slate-100 dark:bg-slate-900/50 rounded-lg text-brand-text dark:text-slate-300 font-mono text-xs break-words">
                                            {finalPrompt || 'Your constructed prompt will appear here.'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h3 className="text-lg font-semibold text-brand-text dark:text-slate-200 mb-3">Settings</h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-brand-subtle dark:text-slate-400 mb-2">Number of images</label>
                                        <div className="flex gap-2">
                                            {[1, 2, 4].map(num => (
                                                <Button key={num} variant={numberOfImages === num ? 'primary' : 'secondary'} onClick={() => setNumberOfImages(num)} className="w-full">{num}</Button>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-brand-subtle dark:text-slate-400 mb-2">Aspect Ratio</label>
                                        <div className="flex gap-2">
                                            {(['1:1', '16:9', '9:16'] as AspectRatio[]).map(ratio => (
                                                <Button key={ratio} variant={aspectRatio === ratio ? 'primary' : 'secondary'} onClick={() => setAspectRatio(ratio)} className="w-full">{ratio}</Button>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-brand-subtle dark:text-slate-400 mb-2">Quality</label>
                                        <div className="flex gap-2">
                                            <Button key="std" variant={quality === 'Standard' ? 'primary' : 'secondary'} onClick={() => setQuality('Standard')} className="w-full">Standard</Button>
                                            <Button key="high" variant={quality === 'High' ? 'primary' : 'secondary'} onClick={() => setQuality('High')} className="w-full">High</Button>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-brand-subtle dark:text-slate-400 mb-2">Seed</label>
                                        <input
                                            type="number"
                                            value={seed}
                                            onChange={(e) => setSeed(e.target.value.replace(/\D/g, ''))}
                                            placeholder="Random"
                                            className="w-full p-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 dark:text-slate-200 rounded-lg focus:ring-2 focus:ring-brand-primary focus:outline-none transition"
                                        />
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex-grow"></div>
                             <div className="space-y-2">
                                <Button onClick={handleGenerate} isLoading={isLoading} disabled={isLoading || isEnhancing || !!processingState} icon="sparkles" className="w-full !py-4 text-lg">
                                    Generate
                                </Button>
                             </div>
                        </div>
                    </Card>
                </div>

                {/* Results Panel */}
                <div className="lg:col-span-2">
                    <Card className="min-h-[60vh]">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold text-brand-text dark:text-slate-200">Generated Images</h3>
                            <div className="flex gap-2">
                                <Button onClick={handleUndo} disabled={historyIndex <= 0 || !!processingState} icon="undo" variant="secondary">Undo</Button>
                                <Button onClick={handleRedo} disabled={historyIndex >= generationHistory.length - 1 || !!processingState} icon="redo" variant="secondary">Redo</Button>
                            </div>
                        </div>
                        <div className="h-full">
                            {isLoading ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {Array.from({ length: numberOfImages }).map((_, index) => (
                                       <SkeletonLoader key={index} aspectRatio={aspectRatio} />
                                    ))}
                                </div>
                            ) : error ? (
                                <div className="flex items-center justify-center h-full text-red-500 text-center">
                                    <p>{error}</p>
                                </div>
                            ) : currentImages.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {currentImages.map((img, index) => (
                                        <div key={`${historyIndex}-${index}`} className="group relative overflow-hidden rounded-lg">
                                            <img src={`data:image/svg+xml;base64,${img}`} alt={`Generated image ${index + 1}`} className={`w-full h-full object-cover ${aspectRatioClasses[aspectRatio]}`} />
                                            {processingState && processingState.index === index ? (
                                                <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-2">
                                                    <Spinner />
                                                    <p className="text-white font-semibold capitalize">{processingState.type}...</p>
                                                </div>
                                            ) : (
                                                <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                    <Button onClick={() => handleDownload(img, index)} variant="secondary" icon="download" aria-label="Download" />
                                                    <Button onClick={() => { setProcessingState({index, type: 'upscaling'}); setIsUpscaleModalOpen(true); }} variant="secondary" icon="upscale" aria-label="Upscale" />
                                                    <Button onClick={() => { setProcessingState({index, type: 'outpainting'}); setIsOutpaintModalOpen(true); }} variant="secondary" icon="plus-square" aria-label="Outpaint" />
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-center text-brand-subtle dark:text-slate-400">
                                    <Icon name="palette" className="w-16 h-16 mb-4 text-slate-400" />
                                    <h3 className="text-xl font-semibold text-brand-text dark:text-slate-200">Your creations will appear here</h3>
                                    <p>Describe what you want to see and click "Generate".</p>
                                </div>
                            )}
                        </div>
                    </Card>
                     {/* ANALYSIS SECTION */}
                    {imagePromptUrl && (
                        <div className="mt-8 animate-fade-in">
                            <Card>
                                <h3 className="text-lg font-semibold text-brand-text dark:text-slate-200 mb-3">AI Image Analysis</h3>
                                <div className="space-y-4">
                                    <p className="text-sm text-brand-subtle dark:text-slate-400">
                                        Use the AI to analyze your uploaded reference image. This can help you write better text prompts.
                                    </p>
                                    <textarea
                                        value={analysisPrompt}
                                        onChange={(e) => setAnalysisPrompt(e.target.value)}
                                        rows={3}
                                        className="w-full p-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 dark:text-slate-200 rounded-lg focus:ring-2 focus:ring-brand-primary focus:outline-none transition"
                                        placeholder="e.g., What is the main color palette? Describe the lighting."
                                    />
                                    <Button onClick={handleAnalyzeImage} isLoading={isAnalyzing} disabled={isAnalyzing} icon="wand" variant="secondary" className="w-full">
                                        Analyze Reference Image
                                    </Button>
                                    {isAnalyzing && !analysisResult && 
                                        <div className="flex justify-center py-4">
                                            <Spinner />
                                        </div>
                                    }
                                    {analysisResult && (
                                        <div className="p-4 bg-slate-50 dark:bg-slate-700 rounded-lg whitespace-pre-wrap font-mono text-sm dark:text-slate-300 animate-fade-in">
                                            {analysisResult}
                                        </div>
                                    )}
                                </div>
                            </Card>
                        </div>
                    )}
                </div>
            </div>
             <Modal isOpen={isHelpModalOpen} onClose={() => setIsHelpModalOpen(false)} title="Prompting Guide">
                <div className="space-y-4 text-sm text-brand-subtle dark:text-slate-400">
                    <p>Creating the perfect image starts with a great prompt. Here's how to write one:</p>
                    <div>
                        <h4 className="font-semibold text-brand-text dark:text-slate-200">1. Start with clear Elements</h4>
                        <p>Use the Photobash Kit to describe each part of your scene. Be specific! Instead of "a car", try "a red vintage sports car". For a second element, you could add "a futuristic city in the background".</p>
                    </div>
                    <div>
                        <h4 className="font-semibold text-brand-text dark:text-slate-200">2. Add Details</h4>
                        <p>Describe the environment, lighting, and mood. For example: "on a winding coastal road at dusk, dramatic lighting, misty atmosphere". Use the "Enhance Prompt" button for AI suggestions!</p>
                    </div>
                    <div>
                        <h4 className="font-semibold text-brand-text dark:text-slate-200">3. Choose a Style</h4>
                        <p>Selecting a style gives your image a distinct look. "Photorealistic" aims for realism, while "Cartoon" is more playful.</p>
                    </div>
                     <div>
                        <h4 className="font-semibold text-brand-text dark:text-slate-200">4. Use an Image Prompt</h4>
                        <p>Upload an image to guide the AI's composition and color. Use the slider to control how much influence it has.</p>
                    </div>
                </div>
            </Modal>
             <Modal isOpen={isHistoryModalOpen} onClose={() => setIsHistoryModalOpen(false)} title="Prompt History" size="large">
                 <div className="max-h-[60vh] overflow-y-auto pr-2">
                    {promptHistory.length > 0 ? (
                        <div className="space-y-3">
                            {promptHistory.map((item, index) => (
                                <button key={index} onClick={() => loadFromHistory(item)} className="w-full text-left p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/50 transition">
                                    <div className="grid grid-cols-3 gap-4 items-start">
                                        <div className="col-span-1">
                                            <p className="text-xs font-semibold text-brand-subtle dark:text-slate-400 uppercase tracking-wider">Elements</p>
                                            <p className="font-medium text-brand-text dark:text-slate-200 break-words">{item.elements.join(', ')}</p>
                                        </div>
                                        <div className="col-span-2">
                                            <p className="text-xs font-semibold text-brand-subtle dark:text-slate-400 uppercase tracking-wider">Details & Style</p>
                                            <p className="text-sm text-brand-subtle dark:text-slate-400">{item.details} ({item.style})</p>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    ) : (
                        <p className="text-center p-8 text-brand-subtle dark:text-slate-400">No prompt history found.</p>
                    )}
                 </div>
             </Modal>
             <Modal isOpen={isOutpaintModalOpen} onClose={() => setIsOutpaintModalOpen(false)} title="AI Outpainting">
                <div className="text-center">
                    <p className="mb-4 text-brand-subtle dark:text-slate-400">Choose a direction to expand the image.</p>
                    <div className="grid grid-cols-3 grid-rows-3 gap-2 w-48 mx-auto">
                        <div/>
                        <Button onClick={() => handleOutpaint('up')} variant="secondary">Up</Button>
                        <div/>
                        <Button onClick={() => handleOutpaint('left')} variant="secondary">Left</Button>
                        <div className="bg-slate-200 dark:bg-slate-700 rounded-lg flex items-center justify-center">
                            <Icon name="photo" />
                        </div>
                        <Button onClick={() => handleOutpaint('right')} variant="secondary">Right</Button>
                        <div/>
                        <Button onClick={() => handleOutpaint('down')} variant="secondary">Down</Button>
                        <div/>
                    </div>
                </div>
            </Modal>

            <Modal isOpen={isUpscaleModalOpen} onClose={() => setIsUpscaleModalOpen(false)} title="AI Upscaler">
                <div className="space-y-4">
                    <p className="text-brand-subtle dark:text-slate-400">Increase the resolution of your image. Higher scales may take longer.</p>
                    <div className="grid grid-cols-2 gap-3">
                        <Button onClick={() => handleUpscale(2)} variant="secondary">Upscale 2x</Button>
                        <Button onClick={() => handleUpscale(4)} variant="secondary">Upscale 4x</Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default ImageGenerator;