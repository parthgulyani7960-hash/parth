import React, { useState, useCallback, useRef, MouseEvent, TouchEvent, useEffect, DragEvent } from 'react';
import { fileToBase64 } from '../utils/file';
import { removeImageBackground, animatePhotoToVideo, upscaleImage, getVideosOperation, replaceSky, addObjectToImage, applyStyleToImage, magicEraser, outpaintImage } from '../services/geminiService';
import { HistoryItem } from '../types';
import Card from './common/Card';
import Button from './common/Button';
import Icon, { InfoTooltip } from './common/Icon';
import Slider from './common/Slider';
import Spinner from './common/Spinner';
import Modal from './common/Modal';
import Toggle from './common/Toggle';
import { useToast } from '../hooks/useToast';

const ProBadge: React.FC = () => (
    <span className="ml-auto bg-gradient-to-r from-amber-400 to-yellow-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">PRO</span>
);

const filters = [
  { name: 'None', style: '' },
  { name: 'Vintage', style: 'sepia(0.6) brightness(1.1) contrast(0.9)' },
  { name: 'Noir', style: 'grayscale(1) contrast(1.3) brightness(1.1)' },
  { name: 'Cinematic', style: 'contrast(1.2) saturate(1.1) brightness(0.9)' },
];

type CropRect = { x: number; y: number; width: number; height: number };
type DragInfo = { type: 'move' | 'resize'; handle: string; startX: number; startY: number; startRect: CropRect };

type ImageState = {
    base64: string;
    url: string;
    mimeType: string;
    prompt?: string;
};

type Suggestion = { text: string; action: () => void; icon: React.ComponentProps<typeof Icon>['name'] };

interface PhotoEditorProps {
  addHistoryItem: (featureName: string, action: string, icon: HistoryItem['icon'], previewUrl?: string, prompt?: string) => void;
  setSuggestion: (suggestion: Suggestion | null) => void;
}

const aspectRatios = [
    { name: 'Freeform', value: null },
    { name: '1:1', value: '1:1' },
    { name: '16:9', value: '16:9' },
    { name: '9:16', value: '9:16' }
];

const skyPresets = ['Blue Sky', 'Sunset', 'Stormy', 'Night Sky', 'Galaxy', 'Fantasy'];
const stylePresets = ['Vintage', 'Anime', 'Cyberpunk', 'Watercolor', '3D Render', 'Retro'];

const POLLING_INTERVAL_MS = 5000;

const PhotoEditor: React.FC<PhotoEditorProps> = ({ addHistoryItem, setSuggestion }) => {
  const [originalImageState, setOriginalImageState] = useState<ImageState | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [error, setError] = useState<string>('');
  
  const [brightness, setBrightness] = useState(0);
  const [contrast, setContrast] = useState(0);
  const [saturation, setSaturation] = useState(0);
  const [blur, setBlur] = useState(0);
  const [activeFilter, setActiveFilter] = useState<string>('None');

  const [isCropping, setIsCropping] = useState<boolean>(false);
  const [cropRect, setCropRect] = useState<CropRect>({ x: 50, y: 50, width: 200, height: 150 });
  const [dragInfo, setDragInfo] = useState<DragInfo | null>(null);
  const [aspectRatio, setAspectRatio] = useState<string | null>(null);

  const [isDraggingOver, setIsDraggingOver] = useState<boolean>(false);
  
  const [history, setHistory] = useState<ImageState[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isAiToolModalOpen, setIsAiToolModalOpen] = useState<null | 'sky' | 'add' | 'style' | 'magic'>(null);
  const [aiToolPrompt, setAiToolPrompt] = useState('');

  const [isDownloading, setIsDownloading] = useState(false);
  
  const [animatedVideoUrl, setAnimatedVideoUrl] = useState<string | null>(null);
  const [animationOperation, setAnimationOperation] = useState<any | null>(null);
  const pollingIntervalRef = useRef<number | null>(null);
  
  const imageRef = useRef<HTMLImageElement>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const addToast = useToast();
  
  const [activeTool, setActiveTool] = useState<'ai' | 'adjust' | 'filters' | 'crop'>('ai');
  const [isComparing, setIsComparing] = useState(false);
  const [compareSliderPosition, setCompareSliderPosition] = useState(50);
  const compareSliderRef = useRef<HTMLDivElement>(null);

  const [hasApiKey, setHasApiKey] = useState(false);
  const [isSelectKeyOpen, setIsSelectKeyOpen] = useState(false);
  
  const isInEditMode = isCropping || !!isAiToolModalOpen;

  const previousImageState = historyIndex > 0 ? history[historyIndex - 1] : null;

    useEffect(() => {
        const checkKey = async () => {
            if (window.aistudio) {
                const keyStatus = await window.aistudio.hasSelectedApiKey();
                setHasApiKey(keyStatus);
            }
        };
        checkKey();
    }, []);

  // Polling logic for video animation
    useEffect(() => {
        const cleanup = () => {
            if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
        };

        if (animationOperation && !animationOperation.done) {
            pollingIntervalRef.current = window.setInterval(async () => {
                try {
                    const updatedOp = await getVideosOperation(animationOperation);
                    setAnimationOperation(updatedOp);
                    if (updatedOp.done) {
                        cleanup();
                        setIsProcessing("Animation ready!");
                        
                        const downloadLink = updatedOp.response?.generatedVideos?.[0]?.video?.uri;
                        if (downloadLink) {
                            const videoResponse = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
                            const videoBlob = await videoResponse.blob();
                            setAnimatedVideoUrl(URL.createObjectURL(videoBlob));
                        } else {
                            throw new Error(updatedOp.error?.message || "Generation finished but no video URI found.");
                        }
                    }
                } catch (error) {
                    cleanup();
                    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred during polling.';
                    if (errorMessage.includes('API key not valid') || errorMessage.includes('Requested entity was not found')) {
                        addToast('Your API key seems to be invalid. Please select a valid one.', 'error');
                        setHasApiKey(false);
                        setIsSelectKeyOpen(true);
                    } else {
                        addToast(`Animation Error: ${errorMessage}`, "error");
                    }
                    setIsProcessing(null);
                    setAnimationOperation(null);
                }
            }, POLLING_INTERVAL_MS);
        }
        return cleanup;
    }, [animationOperation, addToast]);
    
  // Canvas rendering logic
  useEffect(() => {
    if (!imageUrl || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageUrl;
    img.onload = () => {
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        ctx.filter = filterValue;
        ctx.drawImage(img, 0, 0);
    }
  }, [imageUrl, brightness, contrast, saturation, blur, activeFilter]);

  const addNewHistoryState = useCallback((newState: ImageState) => {
    const newHistory = history.slice(0, historyIndex + 1);
    setHistory([...newHistory, newState]);
    setHistoryIndex(newHistory.length);
  }, [history, historyIndex]);

  const processFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
        setError('Please upload a valid image file.');
        return;
    }
    const newUrl = URL.createObjectURL(file);
    const base64 = await fileToBase64(file);
    const mimeType = file.type;
    
    setImageUrl(newUrl);
    setError('');
    setActiveFilter('None');
    setBrightness(0); setContrast(0); setSaturation(0); setBlur(0);
    setIsCropping(false);
    
    setImageBase64(base64);
    setImageMimeType(mimeType);
    
    const initialState: ImageState = { base64, url: newUrl, mimeType: mimeType };
    setOriginalImageState(initialState);
    setHistory([initialState]);
    setHistoryIndex(0);
    addHistoryItem('Photo Lab', 'Loaded a new image', 'photo', newUrl, "new image loaded");
  };
  
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await processFile(file);
    }
  };

  const handleDragEvents = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragEnter = (e: DragEvent<HTMLLabelElement>) => {
    handleDragEvents(e);
    setIsDraggingOver(true);
  };
  
  const handleDragLeave = (e: DragEvent<HTMLLabelElement>) => {
    handleDragEvents(e);
    setIsDraggingOver(false);
  };

  const handleDrop = (e: DragEvent<HTMLLabelElement>) => {
    handleDragEvents(e);
    setIsDraggingOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
        processFile(file);
    }
  };
  
  const runAiTool = async (
    toolName: string, 
    apiCall: () => Promise<string>
  ) => {
    if (!imageBase64 || !imageMimeType) return;
    setIsProcessing(toolName);
    setError('');
    try {
        const resultBase64 = await apiCall();
        const newMimeType = 'image/png'; // AI edits often return PNG
        const newUrl = `data:${newMimeType};base64,${resultBase64}`;
        setImageBase64(resultBase64);
        setImageMimeType(newMimeType);
        setImageUrl(newUrl);
        addNewHistoryState({ base64: resultBase64, url: newUrl, mimeType: newMimeType, prompt: aiToolPrompt });
        addHistoryItem('Photo Lab', toolName, 'photo', newUrl, aiToolPrompt);
        addToast(`${toolName} applied successfully!`, 'success');
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        setError(`Failed to apply ${toolName}: ${errorMessage}`);
        addToast(`Failed to apply ${toolName}.`, 'error');
    } finally {
        setIsProcessing(null);
        setIsAiToolModalOpen(null);
        setAiToolPrompt('');
    }
  };

  const handleAiToolSubmit = () => {
    if (!isAiToolModalOpen) return;
    switch (isAiToolModalOpen) {
      case 'sky':
        runAiTool('Replace Sky', () => replaceSky(imageBase64!, imageMimeType!, aiToolPrompt));
        break;
      case 'add':
        runAiTool('Add Object', () => addObjectToImage(imageBase64!, imageMimeType!, aiToolPrompt));
        break;
      case 'style':
        runAiTool('Apply Style', () => applyStyleToImage(imageBase64!, imageMimeType!, aiToolPrompt));
        break;
      case 'magic':
        runAiTool('Magic Eraser', () => magicEraser(imageBase64!, imageMimeType!, aiToolPrompt));
        break;
    }
  };

  const openAiToolModal = (tool: 'sky' | 'add' | 'style' | 'magic') => {
    const prompts = {
      sky: 'A beautiful sunset',
      add: 'A small, friendly robot sitting on the ground',
      style: 'In the style of a watercolor painting',
      magic: 'The person on the left',
    };
    setAiToolPrompt(prompts[tool]);
    setIsAiToolModalOpen(tool);
  };
  
  const handleRemoveBackground = async () => {
    runAiTool('Remove Background', () => removeImageBackground(imageBase64!, imageMimeType!));
  };
  
  const handleAnimatePhoto = async () => {
    if (!imageBase64 || !imageMimeType) return;

    if (window.aistudio) {
        const keyStatus = await window.aistudio.hasSelectedApiKey();
        setHasApiKey(keyStatus);
        if (!keyStatus) {
            setIsSelectKeyOpen(true);
            return;
        }
    }
    
    setIsProcessing('Initializing animation...');
    setAnimationOperation(null);
    try {
        const op = await animatePhotoToVideo(imageBase64, imageMimeType);
        setAnimationOperation(op);
        addHistoryItem('Photo Lab', 'Started animating photo', 'photo');
        setIsProcessing('AI is animating your photo...');
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
         if (errorMessage.includes('API key not valid') || errorMessage.includes('Requested entity was not found')) {
            addToast('Your API key seems to be invalid. Please select a valid one.', 'error');
            setHasApiKey(false);
            setIsSelectKeyOpen(true);
        } else {
            setError(`Failed to start animation: ${errorMessage}`);
            addToast(`Failed to start animation: ${errorMessage}`, 'error');
        }
        setIsProcessing(null);
    }
  };

  const handleStartCropping = () => {
    setActiveTool('crop');
    if (!imageRef.current) return;
    setIsCropping(true);
    setAspectRatio(null);
    const { width, height } = imageRef.current.getBoundingClientRect();
    setCropRect({
      x: width * 0.1,
      y: height * 0.1,
      width: width * 0.8,
      height: height * 0.8
    });
  };

  const handleSetAspectRatio = (ratioValue: string | null) => {
    setAspectRatio(ratioValue);
    if (!imageRef.current) return;
    
    const { width: imgWidth, height: imgHeight } = imageRef.current.getBoundingClientRect();
    
    if (!ratioValue) {
        setCropRect({ x: imgWidth * 0.1, y: imgHeight * 0.1, width: imgWidth * 0.8, height: imgHeight * 0.8 });
        return;
    }
    
    const [w, h] = ratioValue.split(':').map(Number);
    const ratio = w / h;
    
    let newWidth, newHeight;
    
    if (imgWidth / imgHeight > ratio) {
        newHeight = imgHeight * 0.9;
        newWidth = newHeight * ratio;
    } else {
        newWidth = imgWidth * 0.9;
        newHeight = newWidth / ratio;
    }
    
    const newX = (imgWidth - newWidth) / 2;
    const newY = (imgHeight - newHeight) / 2;
    
    setCropRect({ x: newX, y: newY, width: newWidth, height: newHeight });
};

  const handleCancelCrop = () => {
    setIsCropping(false);
    setAspectRatio(null);
  }
  
  const handleApplyCrop = () => {
    if (!imageRef.current || !imageMimeType) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imageUrl!;
    img.onload = () => {
      const { naturalWidth, naturalHeight } = img;
      const { clientWidth, clientHeight } = imageRef.current!;

      const scaleX = naturalWidth / clientWidth;
      const scaleY = naturalHeight / clientHeight;

      const sx = cropRect.x * scaleX;
      const sy = cropRect.y * scaleY;
      const sWidth = cropRect.width * scaleX;
      const sHeight = cropRect.height * scaleY;

      const canvas = document.createElement('canvas');
      canvas.width = sWidth;
      canvas.height = sHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, sWidth, sHeight);

      const croppedImageUrl = canvas.toDataURL(imageMimeType);
      const croppedImageBase64 = croppedImageUrl.split(',')[1];
      
      setImageUrl(croppedImageUrl);
      setImageBase64(croppedImageBase64);
      addNewHistoryState({ base64: croppedImageBase64, url: croppedImageUrl, mimeType: imageMimeType });
      setIsCropping(false);
      addHistoryItem('Photo Lab', 'Cropped image', 'photo', croppedImageUrl, 'cropped image');
    }
  };

  const getCoords = (e: React.MouseEvent | React.TouchEvent): { x: number, y: number } => {
    const touch = 'touches' in e && e.touches[0];
    const clientX = touch ? touch.clientX : (e as React.MouseEvent).clientX;
    const clientY = touch ? touch.clientY : (e as React.MouseEvent).clientY;
    return { x: clientX, y: clientY };
  };

  const handleCropMouseDown = (e: React.MouseEvent | React.TouchEvent, handle: string) => {
    e.preventDefault();
    e.stopPropagation();
    const { x, y } = getCoords(e);
    setDragInfo({
      type: handle === 'move' ? 'move' : 'resize',
      handle,
      startX: x,
      startY: y,
      startRect: { ...cropRect }
    });
  };

  const handleCropMouseMove = useCallback((e: globalThis.MouseEvent | globalThis.TouchEvent) => {
    if (!dragInfo || !imageContainerRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    
    const { clientX, clientY } = e instanceof globalThis.MouseEvent ? e : e.touches[0];
    const dx = clientX - dragInfo.startX;
    const dy = clientY - dragInfo.startY;

    let newRect = { ...dragInfo.startRect };
    const { handle, startRect } = dragInfo;

    if (dragInfo.type === 'move') {
      newRect.x += dx;
      newRect.y += dy;
    } else {
      let { x, y, width, height } = startRect;
      
      if (handle.includes('right')) { width = startRect.width + dx; }
      if (handle.includes('left')) { width = startRect.width - dx; x = startRect.x + dx; }
      if (handle.includes('bottom')) { height = startRect.height + dy; }
      if (handle.includes('top')) { height = startRect.height - dy; y = startRect.y + dy; }

      if (aspectRatio) {
          const [w, h] = aspectRatio.split(':').map(Number);
          const parsedRatio = w / h;
          
          const isCorner = !['top', 'bottom', 'left', 'right'].includes(handle);
          const isWidthHandle = handle.includes('left') || handle.includes('right');
          const isHeightHandle = handle.includes('top') || handle.includes('bottom');

          if (isCorner || isWidthHandle) {
              const newHeight = width / parsedRatio;
              if (handle.includes('top')) {
                  y += height - newHeight;
              }
              height = newHeight;
          } else if (isHeightHandle) {
              const newWidth = height * parsedRatio;
              x += (width - newWidth) / 2;
              width = newWidth;
          }
      }
      newRect = { x, y, width, height };
    }
    
    const containerRect = imageRef.current?.getBoundingClientRect();
    if (containerRect) {
      if (newRect.x < 0) {
          if (dragInfo.type === 'resize') newRect.width += newRect.x;
          newRect.x = 0;
      }
      if (newRect.y < 0) {
          if (dragInfo.type === 'resize') newRect.height += newRect.y;
          newRect.y = 0;
      }
      if (newRect.x + newRect.width > containerRect.width) {
          if (dragInfo.type === 'move') newRect.x = containerRect.width - newRect.width;
          else newRect.width = containerRect.width - newRect.x;
      }
      if (newRect.y + newRect.height > containerRect.height) {
          if (dragInfo.type === 'move') newRect.y = containerRect.height - newRect.height;
          else newRect.height = containerRect.height - newRect.y;
      }
    }
    
    newRect.width = Math.max(20, newRect.width);
    newRect.height = Math.max(20, newRect.height);

    setCropRect(newRect);
  }, [dragInfo, aspectRatio]);

  const handleCropMouseUp = useCallback(() => {
    setDragInfo(null);
  }, []);

  React.useEffect(() => {
    if (dragInfo) {
      window.addEventListener('mousemove', handleCropMouseMove);
      window.addEventListener('mouseup', handleCropMouseUp);
      window.addEventListener('touchmove', handleCropMouseMove);
      window.addEventListener('touchend', handleCropMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleCropMouseMove);
      window.removeEventListener('mouseup', handleCropMouseUp);
      window.removeEventListener('touchmove', handleCropMouseMove);
      window.removeEventListener('touchend', handleCropMouseUp);
    };
  }, [dragInfo, handleCropMouseMove, handleCropMouseUp]);

  const selectedFilter = filters.find(f => f.name === activeFilter);
  const filterValue = [
      selectedFilter?.style,
      `brightness(${1 + brightness/100})`,
      `contrast(${1 + contrast/100})`,
      `saturate(${1 + saturation/100})`,
      blur > 0 ? `blur(${blur}px)` : '',
  ].filter(Boolean).join(' ');
  
    const handleUndo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      const prevState = history[newIndex];
      setImageBase64(prevState.base64);
      setImageUrl(prevState.url);
      setImageMimeType(prevState.mimeType);
      setHistoryIndex(newIndex);
      setBrightness(0); setContrast(0); setSaturation(0); setBlur(0); setActiveFilter('None');
    }
  };
  
  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      const nextState = history[newIndex];
      setImageBase64(nextState.base64);
      setImageUrl(nextState.url);
      setImageMimeType(nextState.mimeType);
      setHistoryIndex(newIndex);
      setBrightness(0); setContrast(0); setSaturation(0); setBlur(0); setActiveFilter('None');
    }
  };

    const handleApplyAdjustments = () => {
        if (!imageUrl || !imageMimeType) return;
        
        if (!canvasRef.current) return;
        
        const canvas = canvasRef.current;
        const newImageUrl = canvas.toDataURL(imageMimeType);
        const newImageBase64 = newImageUrl.split(',')[1];

        setImageUrl(newImageUrl);
        setImageBase64(newImageBase64);
        addNewHistoryState({ base64: newImageBase64, url: newImageUrl, mimeType: imageMimeType });

        setBrightness(0); setContrast(0); setSaturation(0); setBlur(0); setActiveFilter('None');
        addHistoryItem('Photo Lab', 'Applied adjustments', 'photo', newImageUrl, 'applied color adjustments');
    };

    const handleDownload = async () => {
        if (!canvasRef.current || !imageMimeType) return;
        setIsDownloading(true);
        try {
            const dataUrl = canvasRef.current.toDataURL(imageMimeType.startsWith('image/svg') ? 'image/png' : imageMimeType);
            const link = document.createElement('a');
            const fileExtension = imageMimeType.split('/')[1]?.split('+')[0] || 'png';
            link.href = dataUrl;
            link.download = `edited-image.${fileExtension}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch(e) {
            console.error(e);
            addToast('Failed to download image.', 'error');
        } finally {
            setIsDownloading(false);
            setIsExportModalOpen(false);
        }
    };
    
    // Compare Slider Logic
    const handleCompareSliderMove = (e: React.MouseEvent | React.TouchEvent) => {
        if (!compareSliderRef.current || !imageContainerRef.current) return;
        
        e.preventDefault();

        const moveHandler = (moveEvent: globalThis.MouseEvent | globalThis.TouchEvent) => {
            if ('touches' in moveEvent) {
                moveEvent.preventDefault();
            }
            
            const clientX = 'touches' in moveEvent ? moveEvent.touches[0].clientX : moveEvent.clientX;
            const rect = imageContainerRef.current!.getBoundingClientRect();
            let x = clientX - rect.left;
            let newPosition = (x / rect.width) * 100;
            if (newPosition < 0) newPosition = 0;
            if (newPosition > 100) newPosition = 100;
            setCompareSliderPosition(newPosition);
        };
        
        const upHandler = () => {
            window.removeEventListener('mousemove', moveHandler);
            window.removeEventListener('mouseup', upHandler);
            window.removeEventListener('touchmove', moveHandler);
            window.removeEventListener('touchend', upHandler);
        };

        window.addEventListener('mousemove', moveHandler);
        window.addEventListener('mouseup', upHandler);
        window.addEventListener('touchmove', moveHandler, { passive: false });
        window.addEventListener('touchend', upHandler);
    };
  
  const renderOptionsPanel = () => {
    switch (activeTool) {
        case 'adjust':
            return (
                <div className="space-y-4">
                    <Slider label="Brightness" value={brightness} onChange={(e) => setBrightness(parseInt(e.target.value))} />
                    <Slider label="Contrast" value={contrast} onChange={(e) => setContrast(parseInt(e.target.value))} />
                    <Slider label="Saturation" value={saturation} onChange={(e) => setSaturation(parseInt(e.target.value))} />
                    <Slider label="Blur" value={blur} onChange={(e) => setBlur(parseInt(e.target.value))} min={0} max={20} />
                    <Button onClick={handleApplyAdjustments} disabled={brightness === 0 && contrast === 0 && saturation === 0 && blur === 0} variant="secondary" className="w-full">Apply Adjustments</Button>
                </div>
            );
        case 'filters':
            return (
                <div className="grid grid-cols-2 gap-2">
                    {filters.map(f => <Button key={f.name} variant={activeFilter === f.name ? 'primary' : 'secondary'} onClick={() => setActiveFilter(f.name)}>{f.name}</Button>)}
                </div>
            );
        case 'crop':
            return (
                <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-brand-subtle dark:text-slate-400">Aspect Ratio</p>
                        <InfoTooltip>
                            Aspect ratio is the proportional relationship between an image's width and height.
                            <ul className="list-disc list-inside mt-2 space-y-1">
                                <li><strong>1:1:</strong> A perfect square, ideal for profile pictures and social media posts.</li>
                                <li><strong>16:9:</strong> A wide, cinematic ratio, perfect for thumbnails and wallpapers.</li>
                                <li><strong>9:16:</strong> A tall, vertical ratio, suitable for mobile stories.</li>
                            </ul>
                        </InfoTooltip>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        {aspectRatios.map(ar => (
                            <Button key={ar.name} variant={aspectRatio === ar.value ? 'primary' : 'secondary'} onClick={() => handleSetAspectRatio(ar.value)} className="w-full text-xs !px-2 !py-2">{ar.name}</Button>
                        ))}
                    </div>
                     <div className="pt-4 space-y-2 border-t dark:border-slate-700">
                        <Button onClick={handleApplyCrop} variant="primary" className="w-full">Apply Crop</Button>
                        <Button onClick={handleCancelCrop} variant="secondary" className="w-full">Cancel</Button>
                    </div>
                </div>
            );
        case 'ai':
            return (
                 <div className="space-y-3">
                    <Button onClick={handleAnimatePhoto} isLoading={!!isProcessing && isProcessing.includes('animat')} disabled={!!isProcessing} icon="video" variant="secondary" className="w-full justify-start">Animate Photo <ProBadge /></Button>
                    <Button onClick={() => openAiToolModal('sky')} disabled={!!isProcessing} icon="cloud" variant="secondary" className="w-full justify-start">AI Sky Replacement <ProBadge /></Button>
                    <Button onClick={() => openAiToolModal('add')} disabled={!!isProcessing} icon="plus-square" variant="secondary" className="w-full justify-start">AI Object Adder <ProBadge /></Button>
                    <Button onClick={() => openAiToolModal('magic')} disabled={!!isProcessing} icon="eraser" variant="secondary" className="w-full justify-start">Magic Eraser <ProBadge /></Button>
                    <Button onClick={() => openAiToolModal('style')} disabled={!!isProcessing} icon="palette" variant="secondary" className="w-full justify-start">AI Style Transfer <ProBadge /></Button>
                    <Button onClick={handleRemoveBackground} isLoading={isProcessing === 'Remove Background'} disabled={!!isProcessing} icon="scissors" variant="secondary" className="w-full justify-start">Remove Background</Button>
                 </div>
            );
        default: return null;
    }
  }


  return (
    <div>
        <h2 className="text-4xl font-bold text-center mb-2 dark:text-slate-100">AI Photo Lab</h2>
        <p className="text-center text-lg text-brand-subtle dark:text-slate-400 mb-8">Edit, enhance, and transform your photos with the power of AI.</p>
        
        {/* Hidden canvas for processing */}
        <canvas ref={canvasRef} className="hidden"></canvas>

        {!imageUrl ? (
            <Card>
                <label 
                    htmlFor="image-upload" 
                    className={`w-full h-full flex flex-col items-center justify-center cursor-pointer transition-colors p-8 min-h-[60vh] ${isDraggingOver ? 'bg-slate-200 dark:bg-slate-700' : ''}`}
                    onDragEnter={handleDragEnter} onDragOver={handleDragEvents} onDragLeave={handleDragLeave} onDrop={handleDrop}>
                    <div className={`text-center text-brand-subtle dark:text-slate-400 p-8 border-2 border-dashed rounded-xl transition-colors ${isDraggingOver ? 'border-brand-primary' : 'border-slate-300 dark:border-slate-600'}`}>
                        <Icon name="upload" className="w-12 h-12 mx-auto mb-2" />
                        <p className="font-semibold text-brand-text dark:text-slate-200">Upload or drag & drop an image</p>
                        <p className="text-sm">to start editing with AI</p>
                    </div>
                </label>
                <input id="image-upload" type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
            </Card>
        ) : (
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4 h-[80vh]">
               {/* Center Canvas */}
                <div className="bg-slate-100 dark:bg-slate-900/50 rounded-2xl flex items-center justify-center p-4 relative overflow-hidden" ref={imageContainerRef}>
                    <div className="absolute top-4 left-4 z-10 flex gap-2">
                        <Button onClick={handleUndo} disabled={historyIndex <= 0} icon="undo" variant="icon">Undo</Button>
                        <Button onClick={handleRedo} disabled={historyIndex >= history.length - 1} icon="redo" variant="icon">Redo</Button>
                    </div>
                    {historyIndex > 0 && (
                         <div className="absolute top-4 right-4 z-10 flex gap-2">
                            <Toggle label="Compare" enabled={isComparing} onChange={setIsComparing} />
                         </div>
                    )}
                     <div className="absolute bottom-4 right-4 z-10">
                         <Button onClick={() => setIsExportModalOpen(true)} disabled={isInEditMode} icon="download" variant="primary">Download</Button>
                     </div>

                    <div className="relative w-full h-full flex items-center justify-center">
                         {isComparing && previousImageState ? (
                            <div className="relative w-full h-full max-w-full max-h-full select-none">
                                <img src={previousImageState.url} alt="Before" className="absolute inset-0 w-full h-full object-contain" draggable={false} />
                                <div className="absolute inset-0 w-full h-full" style={{ clipPath: `inset(0 ${100 - compareSliderPosition}% 0 0)`}}>
                                    <img ref={imageRef} src={imageUrl} alt="After" className="absolute inset-0 w-full h-full object-contain" style={{filter: filterValue}} draggable={false} />
                                </div>
                                <div ref={compareSliderRef} className="absolute top-0 bottom-0 w-1 bg-white/80 cursor-ew-resize" style={{ left: `calc(${compareSliderPosition}% - 2px)`}} onMouseDown={handleCompareSliderMove} onTouchStart={handleCompareSliderMove}>
                                    <div className="absolute top-1/2 -translate-y-1/2 -ml-4 w-10 h-10 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center shadow-lg cursor-ew-resize">
                                        <Icon name="back" className="w-5 h-5 text-slate-600 -rotate-180" />
                                        <Icon name="back" className="w-5 h-5 text-slate-600" />
                                    </div>
                                </div>
                            </div>
                         ) : (
                            <img ref={imageRef} src={imageUrl} alt="Editable" className="max-w-full max-h-full object-contain block select-none" style={{filter: filterValue}} draggable="false" />
                         )}

                         {isProcessing && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
                                <div className="text-center text-white">
                                    <Spinner />
                                    <p className="mt-2 font-semibold">{isProcessing}...</p>
                                </div>
                            </div>
                        )}
                        
                        {isCropping && (
                            <>
                            <div className="absolute inset-0 bg-black/50" style={{clipPath: `polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%, 0% ${cropRect.y}px, ${cropRect.x}px ${cropRect.y}px, ${cropRect.x}px ${cropRect.y + cropRect.height}px, ${cropRect.x + cropRect.width}px ${cropRect.y + cropRect.height}px, ${cropRect.x + cropRect.width}px ${cropRect.y}px, 0% ${cropRect.y}px)`, pointerEvents: 'none'}}/>
                            <div className="absolute border-2 border-dashed border-white cursor-move" style={{left: cropRect.x, top: cropRect.y, width: cropRect.width, height: cropRect.height}} onMouseDown={(e) => handleCropMouseDown(e, 'move')} onTouchStart={(e) => handleCropMouseDown(e, 'move')}>
                                {['top-left', 'top-right', 'bottom-left', 'bottom-right', 'top', 'bottom', 'left', 'right'].map(handle => (
                                  <div key={handle} className="absolute w-4 h-4 bg-white rounded-full -m-2" style={{top: handle.includes('top') ? '0%' : handle.includes('bottom') ? '100%' : '50%', left: handle.includes('left') ? '0%' : handle.includes('right') ? '100%' : '50%', transform: 'translate(-50%, -50%)', cursor: `${handle.includes('top') ? 'n' : handle.includes('bottom') ? 's' : ''}${handle.includes('left') ? 'w' : handle.includes('right') ? 'e' : ''}-resize`}} onMouseDown={(e) => handleCropMouseDown(e, handle)} onTouchStart={(e) => handleCropMouseDown(e, handle)}/>
                                ))}
                            </div>
                            </>
                        )}
                    </div>
                </div>
                
                {/* Right Options Panel */}
                <Card className="overflow-y-auto">
                     <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-700/50 p-1 rounded-xl mb-4">
                        <Button variant={activeTool === 'ai' ? 'primary' : 'secondary'} onClick={() => setActiveTool('ai')} className={`flex-1 !text-xs !py-2 ${activeTool !== 'ai' ? '!bg-transparent dark:!bg-transparent !border-0' : ''}`}>AI Tools</Button>
                        <Button variant={activeTool === 'adjust' ? 'primary' : 'secondary'} onClick={() => setActiveTool('adjust')} className={`flex-1 !text-xs !py-2 ${activeTool !== 'adjust' ? '!bg-transparent dark:!bg-transparent !border-0' : ''}`}>Adjust</Button>
                        <Button variant={activeTool === 'filters' ? 'primary' : 'secondary'} onClick={() => setActiveTool('filters')} className={`flex-1 !text-xs !py-2 ${activeTool !== 'filters' ? '!bg-transparent dark:!bg-transparent !border-0' : ''}`}>Filters</Button>
                        <Button variant={activeTool === 'crop' ? 'primary' : 'secondary'} onClick={handleStartCropping} className={`flex-1 !text-xs !py-2 ${activeTool !== 'crop' ? '!bg-transparent dark:!bg-transparent !border-0' : ''}`}>Crop</Button>
                    </div>
                    <div className="animate-fade-in">
                        {renderOptionsPanel()}
                    </div>
                </Card>
            </div>
        )}
        
        <Modal isOpen={!!animatedVideoUrl} onClose={() => setAnimatedVideoUrl(null)} title="AI Animation Complete">
            <video src={animatedVideoUrl ?? ''} controls autoPlay loop className="w-full rounded-lg" />
             <div className="mt-4 flex justify-end">
                <Button as="a" href={animatedVideoUrl ?? ''} download="animated-photo.mp4" icon="download">Download Video</Button>
            </div>
        </Modal>

        <Modal isOpen={isExportModalOpen} onClose={() => setIsExportModalOpen(false)} title="Download Image">
            <div className="space-y-4">
                <p className="text-brand-subtle dark:text-slate-400">Your image will be downloaded with all adjustments applied.</p>
                <Button onClick={handleDownload} disabled={isDownloading} isLoading={isDownloading} icon="download" className="w-full">
                    Download as {imageMimeType ? imageMimeType.split('/')[1]?.toUpperCase() : 'PNG'}
                </Button>
            </div>
        </Modal>

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
        
         <Modal isOpen={!!isAiToolModalOpen} onClose={() => setIsAiToolModalOpen(null)} title={`AI ${isAiToolModalOpen} Tool`}>
            <div className="space-y-4">
                <p className="text-brand-subtle dark:text-slate-400">
                    {
                        {
                            sky: 'Describe the kind of sky you want to see.',
                            add: 'Describe the object you want to add to the scene.',
                            style: 'Describe the artistic style you want to apply.',
                            magic: 'Describe the object you want to remove from the image.'
                        }[isAiToolModalOpen!]
                    }
                </p>
                <textarea
                    value={aiToolPrompt}
                    onChange={(e) => setAiToolPrompt(e.target.value)}
                    rows={3}
                    className="w-full p-2 border rounded-lg dark:bg-slate-800 dark:text-slate-100 border-slate-300 dark:border-slate-600 focus:ring-brand-primary"
                />
                <div className="flex justify-end gap-2">
                    <Button variant="secondary" onClick={() => setIsAiToolModalOpen(null)}>Cancel</Button>
                    <Button variant="primary" icon="sparkles" onClick={handleAiToolSubmit}>Apply</Button>
                </div>
            </div>
        </Modal>
        
    </div>
  );
};

export default PhotoEditor;