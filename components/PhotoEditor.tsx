import React, { useState, useCallback, useRef, MouseEvent, TouchEvent, useEffect, DragEvent } from 'react';
import { fileToBase64 } from '../utils/file';
import { analyzeImage, removeImageBackground, magicEraser, replaceSky, addObjectToImage, applyStyleToImage, animatePhotoToVideo, generate3dBackground, upscaleImage } from '../services/geminiService';
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
  { name: 'None', style: {} },
  { name: 'Vintage', style: { filter: 'sepia(0.6) brightness(1.1) contrast(0.9)' } },
  { name: 'Noir', style: { filter: 'grayscale(1) contrast(1.3) brightness(1.1)' } },
  { name: 'Cinematic', style: { filter: 'contrast(1.2) saturate(1.1) brightness(0.9)' } },
];

type CropRect = { x: number; y: number; width: number; height: number };
type DragInfo = { type: 'move' | 'resize'; handle: string; startX: number; startY: number; startRect: CropRect };

type TextElement = { 
  id: string; 
  content: string; 
  x: number; y: number; 
  color: string; 
  fontSize: number; 
  fontFamily: string;
};
type TextDragInfo = { id: string; startX: number; startY: number; elementStartX: number; elementStartY: number; };

type Point = { x: number; y: number };

type ImageState = {
    base64: string;
    url: string;
    mimeType: string;
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

  const [textElements, setTextElements] = useState<TextElement[]>([]);
  const [activeTextId, setActiveTextId] = useState<string | null>(null);
  const [textDragInfo, setTextDragInfo] = useState<TextDragInfo | null>(null);
  
  const [isErasing, setIsErasing] = useState<boolean>(false);
  const [erasePath, setErasePath] = useState<Point[]>([]);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [eraseBrushSize, setEraseBrushSize] = useState<number>(30);
  
  const [isDraggingOver, setIsDraggingOver] = useState<boolean>(false);
  
  const [history, setHistory] = useState<ImageState[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isSkyModalOpen, setIsSkyModalOpen] = useState(false);
  const [isObjectModalOpen, setIsObjectModalOpen] = useState(false);
  const [isStyleModalOpen, setIsStyleModalOpen] = useState(false);
  const [isUniverseModalOpen, setIsUniverseModalOpen] = useState(false);
  const [isUpscaleModalOpen, setIsUpscaleModalOpen] = useState(false);

  const [stylePrompt, setStylePrompt] = useState('A vibrant, abstract oil painting');
  const [objectPrompt, setObjectPrompt] = useState('a small, red bird on a branch');
  const [universePrompt, setUniversePrompt] = useState('A surreal, glowing forest on an alien planet');
  const [isDownloading, setIsDownloading] = useState(false);
  
  const [animatedVideoUrl, setAnimatedVideoUrl] = useState<string | null>(null);

  const [styleImage1, setStyleImage1] = useState<{base64: string; url: string} | null>(null);
  const [styleImage2, setStyleImage2] = useState<{base64: string; url: string} | null>(null);
  const [styleImage1Influence, setStyleImage1Influence] = useState(50);
  const [styleImage2Influence, setStyleImage2Influence] = useState(50);

  const imageRef = useRef<HTMLImageElement>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const eraseCanvasRef = useRef<HTMLCanvasElement>(null);
  const addToast = useToast();
  
  // New state for redesigned UI
  const [activeTool, setActiveTool] = useState<'adjust' | 'filters' | 'crop' | 'ai'>('ai');
  const [isComparing, setIsComparing] = useState(false);
  const [compareSliderPosition, setCompareSliderPosition] = useState(50);
  const compareSliderRef = useRef<HTMLDivElement>(null);

  const isInEditMode = isCropping || !!activeTextId || isErasing || isSkyModalOpen || isObjectModalOpen || isStyleModalOpen || isUniverseModalOpen || isUpscaleModalOpen;

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
    
    // Reset all state
    setImageUrl(newUrl);
    setError('');
    setActiveFilter('None');
    setBrightness(0); setContrast(0); setSaturation(0); setBlur(0);
    setIsCropping(false); setTextElements([]); setActiveTextId(null); setIsErasing(false);
    
    setImageBase64(base64);
    setImageMimeType(mimeType);
    
    const initialState: ImageState = { base64, url: newUrl, mimeType: mimeType };
    setOriginalImageState(initialState); // Save the original
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

  const handleReplaceSky = async (skyType: string) => {
      if (!imageBase64 || !imageMimeType) return;
      setIsProcessing(`Sky: ${skyType}`);
      setIsSkyModalOpen(false);
      try {
          const resultBase64 = await replaceSky(imageBase64, imageMimeType, skyType);
          const newMimeType = 'image/svg+xml';
          const newUrl = `data:${newMimeType};base64,${resultBase64}`;
          setImageBase64(resultBase64);
          setImageMimeType(newMimeType);
          setImageUrl(newUrl);
          addNewHistoryState({ base64: resultBase64, url: newUrl, mimeType: newMimeType });
          addHistoryItem('Photo Lab', `Replaced sky with ${skyType}`, 'photo', newUrl, `sky replaced with ${skyType}`);
      } catch (err) {
          setError('Failed to replace sky.');
      } finally {
          setIsProcessing(null);
      }
  };
  
  const handleAddObject = async () => {
      if (!objectPrompt.trim()) {
        addToast('Please describe the object to add.', 'error');
        return;
      }
      if (!imageBase64 || !imageMimeType) return;
      setIsProcessing('Adding Object');
      setIsObjectModalOpen(false);
      try {
          const resultBase64 = await addObjectToImage(imageBase64, imageMimeType, objectPrompt);
          const newMimeType = 'image/svg+xml';
          const newUrl = `data:${newMimeType};base64,${resultBase64}`;
          setImageBase64(resultBase64);
          setImageMimeType(newMimeType);
          setImageUrl(newUrl);
          addNewHistoryState({ base64: resultBase64, url: newUrl, mimeType: newMimeType });
          addHistoryItem('Photo Lab', 'Added object with AI', 'photo', newUrl, `added object: ${objectPrompt}`);
      } catch (err) {
          setError('Failed to add object.');
      } finally {
          setIsProcessing(null);
      }
  };

  const handleGenerateUniverse = async () => {
    if (!universePrompt.trim()) {
        addToast('Please describe the world you want to create.', 'error');
        return;
    }
    if (!imageBase64 || !imageMimeType) return;
    setIsProcessing('Generating Universe');
    setIsUniverseModalOpen(false);
    try {
        const resultBase64 = await generate3dBackground(imageBase64, imageMimeType, universePrompt);
        const newMimeType = 'image/svg+xml';
        const newUrl = `data:${newMimeType};base64,${resultBase64}`;
        setImageBase64(resultBase64);
        setImageMimeType(newMimeType);
        setImageUrl(newUrl);
        addNewHistoryState({ base64: resultBase64, url: newUrl, mimeType: newMimeType });
        addHistoryItem('Photo Lab', 'Created a Background Universe', 'photo', newUrl, `created universe: ${universePrompt}`);
        addToast('Background Universe generated!', 'success');
    } catch (err) {
        setError('Failed to generate background universe.');
    } finally {
        setIsProcessing(null);
    }
};

  const handleStyleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, imageNumber: 1 | 2) => {
    const file = e.target.files?.[0];
    if (file) {
        const url = URL.createObjectURL(file);
        const base64 = await fileToBase64(file);
        if (imageNumber === 1) {
            setStyleImage1({ base64, url });
        } else {
            setStyleImage2({ base64, url });
        }
    }
  };
  
  const handleApplyStyle = async () => {
    if (!stylePrompt.trim() && !styleImage1 && !styleImage2) {
      addToast('Please describe a style or provide style images.', 'error');
      return;
    }
    if (!imageBase64 || !imageMimeType) return;
    setIsProcessing('Applying Style');
    setIsStyleModalOpen(false);
    
    const styleImages = [];
    if (styleImage1) styleImages.push({ base64: styleImage1.base64, influence: styleImage1Influence });
    if (styleImage2) styleImages.push({ base64: styleImage2.base64, influence: styleImage2Influence });

    try {
        const resultBase64 = await applyStyleToImage(imageBase64, imageMimeType, stylePrompt, styleImages.length > 0 ? styleImages : undefined);
        const newMimeType = 'image/svg+xml';
        const newUrl = `data:${newMimeType};base64,${resultBase64}`;
        setImageBase64(resultBase64);
        setImageMimeType(newMimeType);
        setImageUrl(newUrl);
        addNewHistoryState({ base64: resultBase64, url: newUrl, mimeType: newMimeType });
        addHistoryItem('Photo Lab', 'Applied AI style', 'photo', newUrl, `applied style: ${stylePrompt}`);
        addToast('AI Style applied!', 'success');
        setStyleImage1(null); setStyleImage2(null);
    } catch (err) {
        setError('Failed to apply style.');
    } finally {
        setIsProcessing(null);
    }
  };

    const handleUpscale = async (scale: number) => {
        if (!imageBase64 || !imageMimeType) return;
        setIsProcessing(`Upscaling ${scale}x`);
        setIsUpscaleModalOpen(false);
        try {
            const resultBase64 = await upscaleImage(imageBase64, scale);
            const newMimeType = imageMimeType; // Upscale mock preserves type
            const newUrl = `data:${newMimeType};base64,${resultBase64}`;
            setImageBase64(resultBase64);
            setImageMimeType(newMimeType);
            setImageUrl(newUrl);
            addNewHistoryState({ base64: resultBase64, url: newUrl, mimeType: newMimeType });
            addHistoryItem('Photo Lab', `Upscaled image ${scale}x`, 'photo', newUrl, `upscaled image ${scale}x`);
            addToast(`Image successfully upscaled ${scale}x`, 'success');
        } catch (err) {
            setError('Failed to upscale image.');
        } finally {
            setIsProcessing(null);
        }
    };
  
  const handleRemoveBackground = async () => {
    if (!imageBase64 || !imageMimeType) return;
    setIsProcessing('Remove BG');
    setError('');
    try {
      const resultBase64 = await removeImageBackground(imageBase64, imageMimeType);
      const newMimeType = 'image/svg+xml';
      const newUrl = `data:${newMimeType};base64,${resultBase64}`;
      setImageBase64(resultBase64);
      setImageMimeType(newMimeType); 
      setImageUrl(newUrl);
      addNewHistoryState({ base64: resultBase64, url: newUrl, mimeType: newMimeType });
      addHistoryItem('Photo Lab', 'Removed background', 'photo', newUrl, 'removed background');
      setSuggestion({
        text: "Add a new background?",
        icon: 'globe',
        action: () => {
            setActiveTool('ai');
            setIsUniverseModalOpen(true);
            setSuggestion(null);
        }
      });
    } catch (err) {
      setError('Failed to remove background. Please try again.');
    } finally {
      setIsProcessing(null);
    }
  };
  
  const handleAnimatePhoto = async () => {
      if (!imageBase64) return;
      setIsProcessing('Animating...');
      try {
          const videoUrl = await animatePhotoToVideo(imageBase64);
          setAnimatedVideoUrl(videoUrl);
          addHistoryItem('Photo Lab', 'Animated photo to video', 'photo', undefined, 'animated photo');
      } catch (err) {
          setError('Failed to animate photo.');
      } finally {
          setIsProcessing(null);
      }
  };

  // Refactored handleStartCropping to activate the tool panel
  const handleStartCropping = () => {
    setActiveTool('crop');
    if (!imageRef.current) return;
    setIsCropping(true);
    setAspectRatio(null); // Default to freeform
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
    
    if (!ratioValue) { // Freeform
        setCropRect({ x: imgWidth * 0.1, y: imgHeight * 0.1, width: imgWidth * 0.8, height: imgHeight * 0.8 });
        return;
    }
    
    const [w, h] = ratioValue.split(':').map(Number);
    const ratio = w / h;
    
    let newWidth, newHeight;
    
    if (imgWidth / imgHeight > ratio) { // Image is wider than ratio
        newHeight = imgHeight * 0.9;
        newWidth = newHeight * ratio;
    } else { // Image is taller or same aspect ratio
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

    const img = imageRef.current;
    const { naturalWidth, naturalHeight, width, height } = img;
    const scaleX = naturalWidth / width;
    const scaleY = naturalHeight / height;

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
    } else { // Resize
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
      selectedFilter?.style.filter,
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
        if (!imageRef.current || !imageMimeType) return;

        const img = imageRef.current;
        const { naturalWidth, naturalHeight } = img;
        const canvas = document.createElement('canvas');
        canvas.width = naturalWidth;
        canvas.height = naturalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        ctx.filter = filterValue;
        ctx.drawImage(img, 0, 0, naturalWidth, naturalHeight);

        const newImageUrl = canvas.toDataURL(imageMimeType);
        const newImageBase64 = newImageUrl.split(',')[1];

        setImageUrl(newImageUrl);
        setImageBase64(newImageBase64);
        addNewHistoryState({ base64: newImageBase64, url: newImageUrl, mimeType: imageMimeType });

        setBrightness(0); setContrast(0); setSaturation(0); setBlur(0); setActiveFilter('None');
        addHistoryItem('Photo Lab', 'Applied adjustments', 'photo', newImageUrl, 'applied color adjustments');
    };

    const handleDownload = async (resolution: 'Original' | '1080p' | '720p' | '480p') => {
        if (!imageRef.current || !imageMimeType) return;
        setIsDownloading(true);
        await new Promise(resolve => setTimeout(resolve, 50));

        try {
            const img = imageRef.current;
            const { naturalWidth, naturalHeight } = img;
            const imageAspectRatio = naturalWidth / naturalHeight;
            
            let targetWidth = naturalWidth;
            let targetHeight = naturalHeight;
            
            if (resolution === '1080p') {
                targetHeight = 1080;
                targetWidth = targetHeight * imageAspectRatio;
            } else if (resolution === '720p') {
                targetHeight = 720;
                targetWidth = targetHeight * imageAspectRatio;
            } else if (resolution === '480p') {
                targetHeight = 480;
                targetWidth = targetHeight * imageAspectRatio;
            }
            
            targetWidth = Math.round(targetWidth);
            targetHeight = Math.round(targetHeight);

            const canvas = document.createElement('canvas');
            canvas.width = targetWidth;
            canvas.height = targetHeight;
            const ctx = canvas.getContext('2d');

            if (!ctx) {
                throw new Error('Could not get canvas context');
            }

            ctx.filter = filterValue;
            ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
            
            const dataUrl = canvas.toDataURL(imageMimeType);
            const link = document.createElement('a');
            link.href = dataUrl;
            
            const fileExtension = imageMimeType.split('/')[1] || 'png';
            link.download = `edited-image-${resolution}.${fileExtension}`;
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            setIsExportModalOpen(false);
        } catch (e) {
            console.error("Download failed", e);
            setError("Sorry, the image could not be downloaded.");
        } finally {
            setIsDownloading(false);
        }
    };
    
    // Compare Slider Logic
    const handleCompareSliderMove = (e: React.MouseEvent | React.TouchEvent) => {
        if (!compareSliderRef.current || !imageContainerRef.current) return;
        
        const getClientX = (evt: typeof e) => 'touches' in evt ? evt.touches[0].clientX : evt.clientX;

        const moveHandler = (moveEvent: globalThis.MouseEvent | globalThis.TouchEvent) => {
            const rect = imageContainerRef.current!.getBoundingClientRect();
            let x = getClientX(moveEvent as any) - rect.left;
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
        window.addEventListener('touchmove', moveHandler);
        window.addEventListener('touchend', upHandler);
    };

  const imageStyle = { filter: filterValue };
  
  const renderOptionsPanel = () => {
    switch (activeTool) {
        case 'adjust':
            const adjustmentPreviewStyle = {
                filter: `brightness(${1 + brightness/100}) contrast(${1 + contrast/100}) saturate(${1 + saturation/100}) blur(${blur}px)`,
                background: 'linear-gradient(90deg, rgba(255,0,0,1) 0%, rgba(255,255,0,1) 17%, rgba(0,255,0,1) 33%, rgba(0,255,255,1) 50%, rgba(0,0,255,1) 67%, rgba(255,0,255,1) 83%, rgba(255,0,0,1) 100%)'
            };
            return (
                <div className="space-y-4">
                    <div className="w-full h-12 rounded-lg mb-4" style={adjustmentPreviewStyle} />
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
                    <p className="text-sm font-medium text-brand-subtle dark:text-slate-400">Aspect Ratio</p>
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
                    <Button onClick={() => setIsUpscaleModalOpen(true)} disabled={!!isProcessing} icon="upscale" variant="secondary" className="w-full justify-start">AI Upscale <ProBadge /></Button>
                    <Button onClick={handleAnimatePhoto} isLoading={isProcessing === 'Animating...'} disabled={!!isProcessing} icon="video" variant="secondary" className="w-full justify-start">Animate Photo <ProBadge /></Button>
                    <Button onClick={() => setIsStyleModalOpen(true)} disabled={!!isProcessing} icon="brand" variant="secondary" className="w-full justify-start">AI Style Sculptor</Button>
                    <Button onClick={() => setIsUniverseModalOpen(true)} disabled={!!isProcessing} icon="globe" variant="secondary" className="w-full justify-start">Background Universe <ProBadge /></Button>
                    <Button onClick={() => setIsSkyModalOpen(true)} disabled={!!isProcessing} icon="cloud" variant="secondary" className="w-full justify-start">AI Sky Replacement</Button>
                    <Button onClick={() => setIsObjectModalOpen(true)} disabled={!!isProcessing} icon="plus-square" variant="secondary" className="w-full justify-start">AI Object Adder</Button>
                    <Button onClick={handleRemoveBackground} isLoading={isProcessing === 'Remove BG'} disabled={!!isProcessing} icon="scissors" variant="secondary" className="w-full justify-start">Remove Background</Button>
                 </div>
            );
        default: return null;
    }
  }


  return (
    <div>
        <h2 className="text-4xl font-bold text-center mb-2 dark:text-slate-100">AI Photo Lab</h2>
        <p className="text-center text-lg text-brand-subtle dark:text-slate-400 mb-8">Edit, enhance, and transform your photos with the power of AI.</p>
        
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
            <div className="grid grid-cols-1 lg:grid-cols-[80px,1fr,320px] gap-4 h-[80vh]">
               {/* Left Toolbar */}
               <Card className="p-2">
                   <div className="flex flex-col items-center gap-2">
                        <Button variant={activeTool === 'adjust' ? 'primary' : 'tool'} onClick={() => setActiveTool('adjust')}><Icon name="sliders" className="w-6 h-6"/></Button>
                        <Button variant={activeTool === 'filters' ? 'primary' : 'tool'} onClick={() => setActiveTool('filters')}><Icon name="palette" className="w-6 h-6"/></Button>
                        <Button variant={activeTool === 'crop' ? 'primary' : 'tool'} onClick={handleStartCropping}><Icon name="crop" className="w-6 h-6"/></Button>
                        <Button variant={activeTool === 'ai' ? 'primary' : 'tool'} onClick={() => setActiveTool('ai')}><Icon name="sparkles" className="w-6 h-6"/></Button>
                   </div>
               </Card>
               
               {/* Center Canvas */}
                <div className="bg-slate-100 dark:bg-slate-900/50 rounded-2xl flex items-center justify-center p-4 relative overflow-hidden" ref={imageContainerRef}>
                    <div className="absolute top-4 left-4 z-10 flex gap-2">
                        <Button onClick={handleUndo} disabled={historyIndex <= 0} icon="undo" variant="icon">Undo</Button>
                        <Button onClick={handleRedo} disabled={historyIndex >= history.length - 1} icon="redo" variant="icon">Redo</Button>
                    </div>
                     <div className="absolute top-4 right-4 z-10 flex gap-2">
                        <Toggle label="Compare" enabled={isComparing} onChange={setIsComparing} />
                     </div>
                     <div className="absolute bottom-4 right-4 z-10">
                         <Button onClick={() => setIsExportModalOpen(true)} disabled={isInEditMode} icon="download" variant="primary">Download</Button>
                     </div>

                    <div className="relative w-full h-full flex items-center justify-center">
                         {isComparing && originalImageState ? (
                            <div className="relative w-full h-full max-w-full max-h-full select-none">
                                <img src={originalImageState.url} alt="Original" className="absolute inset-0 w-full h-full object-contain" style={imageStyle} draggable={false} />
                                <div className="absolute inset-0 w-full h-full" style={{ clipPath: `inset(0 ${100 - compareSliderPosition}% 0 0)`}}>
                                    <img src={imageUrl} alt="Edited" className="absolute inset-0 w-full h-full object-contain" style={imageStyle} draggable={false} />
                                </div>
                                <div ref={compareSliderRef} className="absolute top-0 bottom-0 w-1 bg-white/80 cursor-ew-resize" style={{ left: `calc(${compareSliderPosition}% - 2px)`}} onMouseDown={handleCompareSliderMove} onTouchStart={handleCompareSliderMove}>
                                    <div className="absolute top-1/2 -translate-y-1/2 -ml-4 w-10 h-10 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center shadow-lg cursor-ew-resize">
                                        <Icon name="back" className="w-5 h-5 text-slate-600 -rotate-180" />
                                        <Icon name="back" className="w-5 h-5 text-slate-600" />
                                    </div>
                                </div>
                            </div>
                         ) : (
                            <img ref={imageRef} src={imageUrl} alt="Editable" className="max-w-full max-h-full object-contain block select-none" style={imageStyle} draggable="false" />
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
                    <h3 className="text-xl font-semibold capitalize text-brand-text dark:text-slate-200 mb-4 border-b dark:border-slate-700 pb-2">{activeTool}</h3>
                    <div className="animate-fade-in">
                        {renderOptionsPanel()}
                    </div>
                </Card>
            </div>
        )}
        
        <Modal isOpen={!!animatedVideoUrl} onClose={() => setAnimatedVideoUrl(null)} title="AI Animation Complete">
            <video src={animatedVideoUrl ?? ''} controls autoPlay loop className="w-full rounded-lg" />
        </Modal>

        <Modal isOpen={isExportModalOpen} onClose={() => setIsExportModalOpen(false)} title="Download Image">
            <div className="space-y-4">
                <p className="text-brand-subtle dark:text-slate-400">Choose a resolution to download. Note: Adjustments are applied on export.</p>
                <div className="grid grid-cols-2 gap-3">
                    <Button onClick={() => handleDownload('Original')} disabled={isDownloading} variant="secondary">Original</Button>
                    <Button onClick={() => handleDownload('1080p')} disabled={isDownloading} variant="secondary">1080p</Button>
                    <Button onClick={() => handleDownload('720p')} disabled={isDownloading} variant="secondary">720p</Button>
                    <Button onClick={() => handleDownload('480p')} disabled={isDownloading} variant="secondary">480p</Button>
                </div>
                {isDownloading && <div className="flex items-center justify-center gap-2 text-brand-subtle"><Spinner /> Preparing your download...</div>}
            </div>
        </Modal>
        
        <Modal isOpen={isSkyModalOpen} onClose={() => setIsSkyModalOpen(false)} title="AI Sky Replacement">
            <div className="space-y-4">
                 <p className="text-brand-subtle dark:text-slate-400">Select a preset to replace the sky in your image.</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {skyPresets.map(sky => (
                        <Button key={sky} onClick={() => handleReplaceSky(sky)} variant="secondary">{sky}</Button>
                    ))}
                </div>
            </div>
        </Modal>
        
        <Modal isOpen={isObjectModalOpen} onClose={() => setIsObjectModalOpen(false)} title="AI Object Adder">
             <div className="space-y-4">
                <p className="text-brand-subtle dark:text-slate-400">Describe the object you want to add to the image.</p>
                <textarea value={objectPrompt} onChange={(e) => setObjectPrompt(e.target.value)} rows={3} className="w-full p-2 border rounded-lg dark:bg-slate-800 dark:text-slate-100 border-slate-300 dark:border-slate-600 focus:ring-brand-primary"/>
                <div className="flex justify-end gap-2">
                    <Button variant="secondary" onClick={() => setIsObjectModalOpen(false)}>Cancel</Button>
                    <Button variant="primary" onClick={handleAddObject}>Add Object</Button>
                </div>
             </div>
        </Modal>
        
        <Modal isOpen={isUpscaleModalOpen} onClose={() => setIsUpscaleModalOpen(false)} title="AI Upscale">
            <div className="space-y-4">
                <p className="text-brand-subtle dark:text-slate-400">Increase the resolution of your image. This will enhance details and quality.</p>
                <div className="grid grid-cols-2 gap-3">
                    <Button onClick={() => handleUpscale(2)} variant="secondary">Upscale 2x</Button>
                    <Button onClick={() => handleUpscale(4)} variant="secondary">Upscale 4x</Button>
                </div>
            </div>
        </Modal>

        <Modal isOpen={isUniverseModalOpen} onClose={() => setIsUniverseModalOpen(false)} title="AI Background Universe">
             <div className="space-y-4">
                <p className="text-brand-subtle dark:text-slate-400">Describe the 3D world you want to generate for the background.</p>
                <textarea value={universePrompt} onChange={(e) => setUniversePrompt(e.target.value)} rows={3} className="w-full p-2 border rounded-lg dark:bg-slate-800 dark:text-slate-100 border-slate-300 dark:border-slate-600 focus:ring-brand-primary" />
                <div className="flex justify-end gap-2">
                    <Button variant="secondary" onClick={() => setIsUniverseModalOpen(false)}>Cancel</Button>
                    <Button variant="primary" onClick={handleGenerateUniverse}>Generate</Button>
                </div>
             </div>
        </Modal>
        
        <Modal 
            isOpen={isStyleModalOpen} 
            onClose={() => {
                setIsStyleModalOpen(false);
                setStyleImage1(null);
                setStyleImage2(null);
            }} 
            title="AI Style Sculptor & Mixer">
             <div className="space-y-4">
                <p className="text-brand-subtle dark:text-slate-400">Describe the artistic style, or click the presets below to mix them.</p>
                <div className="flex flex-wrap gap-2">
                    {stylePresets.map(preset => (
                        <Button key={preset} variant="secondary" className="!text-xs" onClick={() => setStylePrompt(p => p ? `${p}, ${preset} style` : `${preset} style`)}>{preset}</Button>
                    ))}
                </div>
                <textarea value={stylePrompt} onChange={e => setStylePrompt(e.target.value)} rows={3} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-brand-primary" />
                <div className="border-t dark:border-slate-700 pt-4 mt-4">
                    <p className="text-brand-subtle dark:text-slate-400 mb-2">Or, mix styles from images.</p>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="style-image-1" className="block text-sm font-medium text-brand-text dark:text-slate-300 mb-1">Style Image 1</label>
                            <div className="relative w-full aspect-square bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center">
                                <input id="style-image-1" type="file" accept="image/*" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={(e) => handleStyleImageUpload(e, 1)} />
                                {styleImage1 ? <img src={styleImage1.url} alt="Style 1" className="w-full h-full object-cover rounded-lg" /> : <Icon name="upload" className="w-8 h-8 text-slate-400" />}
                            </div>
                        </div>
                        <div>
                            <label htmlFor="style-image-2" className="block text-sm font-medium text-brand-text dark:text-slate-300 mb-1">Style Image 2</label>
                             <div className="relative w-full aspect-square bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center">
                                <input id="style-image-2" type="file" accept="image/*" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={(e) => handleStyleImageUpload(e, 2)} />
                                {styleImage2 ? <img src={styleImage2.url} alt="Style 2" className="w-full h-full object-cover rounded-lg" /> : <Icon name="upload" className="w-8 h-8 text-slate-400" />}
                            </div>
                        </div>
                    </div>
                    {(styleImage1 || styleImage2) && (
                        <div className="mt-4 space-y-4">
                            {styleImage1 && <Slider label="Style 1 Influence" min={0} max={100} value={styleImage1Influence} onChange={e => setStyleImage1Influence(Number(e.target.value))} />}
                            {styleImage2 && <Slider label="Style 2 Influence" min={0} max={100} value={styleImage2Influence} onChange={e => setStyleImage2Influence(Number(e.target.value))} />}
                        </div>
                    )}
                </div>
                <div className="flex justify-end gap-2 pt-4 border-t dark:border-slate-700 mt-4">
                    <Button variant="secondary" onClick={() => { setIsStyleModalOpen(false); setStyleImage1(null); setStyleImage2(null);}}>Cancel</Button>
                    <Button variant="primary" onClick={handleApplyStyle}>Apply Style</Button>
                </div>
             </div>
        </Modal>
    </div>
  );
};

export default PhotoEditor;