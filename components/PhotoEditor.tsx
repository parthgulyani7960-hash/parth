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
import { useToast } from '../hooks/useToast';

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

interface PhotoEditorProps {
  addHistoryItem: (featureName: string, action: string, icon: HistoryItem['icon'], previewUrl?: string) => void;
}

const aspectRatios = [
    { name: 'Freeform', value: null },
    { name: '1:1', value: '1:1' },
    { name: '16:9', value: '16:9' },
    { name: '4:3', value: '4:3' },
    { name: '9:16', value: '9:16' }
];

const skyPresets = ['Blue Sky', 'Sunset', 'Stormy', 'Night Sky', 'Galaxy', 'Fantasy'];
const stylePresets = ['Vintage', 'Anime', 'Cyberpunk', 'Watercolor', '3D Render', 'Retro'];

const PhotoEditor: React.FC<PhotoEditorProps> = ({ addHistoryItem }) => {
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [analysisPrompt, setAnalysisPrompt] = useState<string>('Describe this image in detail, focusing on composition, lighting, and subject matter.');
  const [analysisResult, setAnalysisResult] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [error, setError] = useState<string>('');
  
  const [brightness, setBrightness] = useState(0);
  const [contrast, setContrast] = useState(0);
  const [saturation, setSaturation] = useState(0);
  const [activeFilter, setActiveFilter] = useState<string>('None');

  const [isCropping, setIsCropping] = useState<boolean>(false);
  const [cropRect, setCropRect] = useState<CropRect>({ x: 50, y: 50, width: 200, height: 150 });
  const [dragInfo, setDragInfo] = useState<DragInfo | null>(null);
  const [aspectRatio, setAspectRatio] = useState<string | null>(null);

  const [isTextMode, setIsTextMode] = useState<boolean>(false);
  const [textElements, setTextElements] = useState<TextElement[]>([]);
  const [activeTextId, setActiveTextId] = useState<string | null>(null);
  const [textDragInfo, setTextDragInfo] = useState<TextDragInfo | null>(null);
  
  const [isErasing, setIsErasing] = useState<boolean>(false);
  const [erasePath, setErasePath] = useState<Point[]>([]);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [eraseBrushSize, setEraseBrushSize] = useState<number>(30);
  
  const [isColorSplashMode, setIsColorSplashMode] = useState<boolean>(false);
  const [splashThreshold, setSplashThreshold] = useState<number>(50);

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
  const [objectPromptError, setObjectPromptError] = useState('');
  const [universePromptError, setUniversePromptError] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);
  
  // Portrait Enhance State
  const [skinSmooth, setSkinSmooth] = useState(0);
  const [eyeBrightness, setEyeBrightness] = useState(0);
  const [teethWhiten, setTeethWhiten] = useState(0);

  // Animate Photo State
  const [isAnimating, setIsAnimating] = useState(false);
  const [animatedVideoUrl, setAnimatedVideoUrl] = useState<string | null>(null);

  // AI Style Mixer State
  const [styleImage1, setStyleImage1] = useState<{base64: string; url: string} | null>(null);
  const [styleImage2, setStyleImage2] = useState<{base64: string; url: string} | null>(null);
  const [styleImage1Influence, setStyleImage1Influence] = useState(50);
  const [styleImage2Influence, setStyleImage2Influence] = useState(50);

  const imageRef = useRef<HTMLImageElement>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const eraseCanvasRef = useRef<HTMLCanvasElement>(null);
  const addToast = useToast();

  const isInEditMode = isCropping || isTextMode || isErasing || isColorSplashMode || isSkyModalOpen || isObjectModalOpen || isStyleModalOpen || isUniverseModalOpen || isUpscaleModalOpen;

  const addNewHistoryState = useCallback((newState: ImageState) => {
    const newHistory = history.slice(0, historyIndex + 1);
    setHistory([...newHistory, newState]);
    setHistoryIndex(newHistory.length);
  }, [history, historyIndex]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await processFile(file);
    }
  };
  
  const processFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
        setError('Please upload a valid image file.');
        return;
    }
    const newUrl = URL.createObjectURL(file);
    setImageUrl(newUrl);
    setError('');
    setAnalysisResult('');
    setActiveFilter('None');
    setBrightness(0);
    setContrast(0);
    setSaturation(0);
    setSkinSmooth(0);
    setEyeBrightness(0);
    setTeethWhiten(0);
    setIsCropping(false);
    setIsTextMode(false);
    setTextElements([]);
    setActiveTextId(null);
    setIsErasing(false);
    setIsColorSplashMode(false);
    
    const base64 = await fileToBase64(file);
    setImageBase64(base64);
    setImageMimeType(file.type);

    const initialState: ImageState = { base64, url: newUrl, mimeType: file.type };
    setHistory([initialState]);
    setHistoryIndex(0);
    addHistoryItem('Photo Lab', 'Loaded a new image', 'photo', newUrl);
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
          const newMimeType = 'image/png';
          const newUrl = `data:${newMimeType};base64,${resultBase64}`;
          setImageBase64(resultBase64);
          setImageMimeType(newMimeType);
          setImageUrl(newUrl);
          addNewHistoryState({ base64: resultBase64, url: newUrl, mimeType: newMimeType });
          addHistoryItem('Photo Lab', `Replaced sky with ${skyType}`, 'photo', newUrl);
      } catch (err) {
          setError('Failed to replace sky.');
      } finally {
          setIsProcessing(null);
      }
  };
  
  const handleAddObject = async () => {
      if (!objectPrompt.trim()) {
        setObjectPromptError('Please describe the object to add.');
        return;
      }
      if (!imageBase64 || !imageMimeType) return;
      setIsProcessing('Adding Object');
      setIsObjectModalOpen(false);
      setObjectPromptError('');
      try {
          const resultBase64 = await addObjectToImage(imageBase64, imageMimeType, objectPrompt);
          const newMimeType = 'image/png';
          const newUrl = `data:${newMimeType};base64,${resultBase64}`;
          setImageBase64(resultBase64);
          setImageMimeType(newMimeType);
          setImageUrl(newUrl);
          addNewHistoryState({ base64: resultBase64, url: newUrl, mimeType: newMimeType });
          addHistoryItem('Photo Lab', 'Added object with AI', 'photo', newUrl);
      } catch (err) {
          setError('Failed to add object.');
      } finally {
          setIsProcessing(null);
      }
  };

  const handleGenerateUniverse = async () => {
    if (!universePrompt.trim()) {
        setUniversePromptError('Please describe the world you want to create.');
        return;
    }
    if (!imageBase64 || !imageMimeType) return;
    setIsProcessing('Generating Universe');
    setIsUniverseModalOpen(false);
    setUniversePromptError('');
    try {
        const resultBase64 = await generate3dBackground(imageBase64, imageMimeType, universePrompt);
        const newMimeType = 'image/png';
        const newUrl = `data:${newMimeType};base64,${resultBase64}`;
        setImageBase64(resultBase64);
        setImageMimeType(newMimeType);
        setImageUrl(newUrl);
        addNewHistoryState({ base64: resultBase64, url: newUrl, mimeType: newMimeType });
        addHistoryItem('Photo Lab', 'Created a Background Universe', 'photo', newUrl);
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
    if (styleImage1) {
        styleImages.push({ base64: styleImage1.base64, influence: styleImage1Influence });
    }
    if (styleImage2) {
        styleImages.push({ base64: styleImage2.base64, influence: styleImage2Influence });
    }

    try {
        const resultBase64 = await applyStyleToImage(imageBase64, imageMimeType, stylePrompt, styleImages.length > 0 ? styleImages : undefined);
        const newMimeType = 'image/png';
        const newUrl = `data:${newMimeType};base64,${resultBase64}`;
        setImageBase64(resultBase64);
        setImageMimeType(newMimeType);
        setImageUrl(newUrl);
        addNewHistoryState({ base64: resultBase64, url: newUrl, mimeType: newMimeType });
        addHistoryItem('Photo Lab', 'Applied AI style', 'photo', newUrl);
        addToast('AI Style applied!', 'success');
        setStyleImage1(null);
        setStyleImage2(null);
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
            addHistoryItem('Photo Lab', `Upscaled image ${scale}x`, 'photo', newUrl);
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
      const newMimeType = 'image/png';
      const newUrl = `data:${newMimeType};base64,${resultBase64}`;
      setImageBase64(resultBase64);
      setImageMimeType(newMimeType); 
      setImageUrl(newUrl);
      addNewHistoryState({ base64: resultBase64, url: newUrl, mimeType: newMimeType });
      addHistoryItem('Photo Lab', 'Removed background', 'photo', newUrl);
    } catch (err) {
      setError('Failed to remove background. Please try again.');
      console.error(err);
    } finally {
      setIsProcessing(null);
    }
  };
  
  const handleStartCropping = () => {
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
    addHistoryItem('Photo Lab', 'Cropped image', 'photo', croppedImageUrl);
  };

  const handleAnalyze = useCallback(async () => {
    if (!imageBase64 || !imageMimeType) {
      addToast('Please upload an image first.', 'error');
      return;
    }
    if (!analysisPrompt) {
      addToast('Please enter a prompt for analysis.', 'error');
      return;
    }
    setIsAnalyzing(true);
    setError('');
    setAnalysisResult('');

    try {
      const result = await analyzeImage(imageBase64, imageMimeType, analysisPrompt);
      setAnalysisResult(result);
      addHistoryItem('Photo Lab', 'Analyzed image', 'photo');
    } catch (err) {
      setError('Failed to analyze image. Please try again.');
      console.error(err);
    } finally {
      setIsAnalyzing(false);
    }
  }, [imageBase64, imageMimeType, analysisPrompt, addHistoryItem, addToast]);

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
      `blur(${skinSmooth / 20}px)`, // Simulate skin smoothing with blur
      `brightness(${1 + eyeBrightness/100}) saturate(${1 + eyeBrightness/50})`, // Simulate eye brightening
      `saturate(${1 - teethWhiten/100}) brightness(${1 + teethWhiten/100})`, // Simulate teeth whitening
  ].filter(Boolean).join(' ');

  const handleStartTextMode = () => {
    setIsTextMode(true);
    const newId = `text-${Date.now()}`;
    const container = imageContainerRef.current?.getBoundingClientRect();
    const newTextElement: TextElement = {
      id: newId,
      content: 'Sample Text',
      x: container ? container.width / 2 - 70 : 50,
      y: container ? container.height / 2 - 25 : 50,
      color: '#FFFFFF',
      fontSize: 48,
      fontFamily: 'Inter',
    };
    setTextElements([newTextElement]);
    setActiveTextId(newId);
  };
  
  const handleCancelTextMode = () => {
    setIsTextMode(false);
    setTextElements([]);
    setActiveTextId(null);
  };

  const handleApplyText = () => {
    if (!imageRef.current || !imageMimeType) return;
    
    const img = imageRef.current;
    const { naturalWidth, naturalHeight } = img;
    const canvas = document.createElement('canvas');
    canvas.width = naturalWidth;
    canvas.height = naturalHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.drawImage(img, 0, 0, naturalWidth, naturalHeight);
    
    const scaleX = naturalWidth / img.width;
    const scaleY = naturalHeight / img.height;
    
    textElements.forEach(text => {
      ctx.fillStyle = text.color;
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 5;
      ctx.font = `${text.fontSize * scaleX}px ${text.fontFamily}`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(text.content, text.x * scaleX, text.y * scaleY);
    });

    const newImageUrl = canvas.toDataURL(imageMimeType);
    const newImageBase64 = newImageUrl.split(',')[1];
    
    setImageUrl(newImageUrl);
    setImageBase64(newImageBase64);
    addNewHistoryState({ base64: newImageBase64, url: newImageUrl, mimeType: imageMimeType });
    handleCancelTextMode();
    addHistoryItem('Photo Lab', 'Added text to image', 'photo', newImageUrl);
  };
  
  const handleTextMouseDown = (e: React.MouseEvent | React.TouchEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveTextId(id);
    const { clientX, clientY } = 'touches' in e.nativeEvent ? e.nativeEvent.touches[0] : e.nativeEvent;
    const textElement = textElements.find(t => t.id === id);
    if (textElement) {
        setTextDragInfo({
            id,
            startX: clientX,
            startY: clientY,
            elementStartX: textElement.x,
            elementStartY: textElement.y,
        });
    }
  };

  const handleTextMouseMove = useCallback((e: globalThis.MouseEvent | globalThis.TouchEvent) => {
    if (!textDragInfo || !imageContainerRef.current) return;
    e.preventDefault();
    e.stopPropagation();

    const { clientX, clientY } = e instanceof globalThis.MouseEvent ? e : e.touches[0];
    const dx = clientX - textDragInfo.startX;
    const dy = clientY - textDragInfo.startY;

    setTextElements(prev => prev.map(t => 
      t.id === textDragInfo.id 
        ? { ...t, x: textDragInfo.elementStartX + dx, y: textDragInfo.elementStartY + dy } 
        : t
    ));
  }, [textDragInfo]);

  const handleTextMouseUp = useCallback(() => {
    setTextDragInfo(null);
  }, []);

  React.useEffect(() => {
    if (textDragInfo) {
      window.addEventListener('mousemove', handleTextMouseMove);
      window.addEventListener('mouseup', handleTextMouseUp);
      window.addEventListener('touchmove', handleTextMouseMove);
      window.addEventListener('touchend', handleTextMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleTextMouseMove);
      window.removeEventListener('mouseup', handleTextMouseUp);
      window.removeEventListener('touchmove', handleTextMouseMove);
      window.removeEventListener('touchend', handleTextMouseUp);
    };
  }, [textDragInfo, handleTextMouseMove, handleTextMouseUp]);
  
  const handleStartErasing = () => setIsErasing(true);
  const handleCancelErasing = () => {
      setIsErasing(false);
      setErasePath([]);
      const canvas = eraseCanvasRef.current;
      if(canvas) {
          const ctx = canvas.getContext('2d');
          ctx?.clearRect(0, 0, canvas.width, canvas.height);
      }
  };
  
  const handleApplyEraser = async () => {
      if (!erasePath.length || !imageBase64 || !imageMimeType || !eraseCanvasRef.current) return;
      setIsProcessing('Magic Eraser');
      
      const maskCanvas = eraseCanvasRef.current;
      const maskBase64 = maskCanvas.toDataURL('image/png').split(',')[1];
      
      try {
          const resultBase64 = await magicEraser(imageBase64, imageMimeType, maskBase64);
          const newMimeType = 'image/png';
          const newUrl = `data:${newMimeType};base64,${resultBase64}`;
          setImageBase64(resultBase64);
          setImageMimeType(newMimeType);
          setImageUrl(newUrl);
          addNewHistoryState({ base64: resultBase64, url: newUrl, mimeType: newMimeType });
          handleCancelErasing();
          addHistoryItem('Photo Lab', 'Used Magic Eraser', 'photo', newUrl);
          addToast('Magic Eraser applied successfully!', 'success');
      } catch (err) {
          setError('Failed to apply Magic Eraser. Please try again.');
          addToast('Failed to apply Magic Eraser.', 'error');
          console.error(err);
      } finally {
          setIsProcessing(null);
      }
  };

  const handleStartColorSplash = () => setIsColorSplashMode(true);
  const handleCancelColorSplash = () => {
      setIsColorSplashMode(false);
      // Revert to current history state if any changes were made
      const currentState = history[historyIndex];
      if (currentState) {
        setImageUrl(currentState.url);
      }
  };

  const handleImageClickForSplash = (e: React.MouseEvent<HTMLLabelElement>) => {
    if (!isColorSplashMode || !imageRef.current || !imageMimeType) return;
    
    setIsProcessing('Color Splash');
    const img = imageRef.current;
    const rect = img.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    
    ctx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight);
    
    const scaleX = img.naturalWidth / img.width;
    const scaleY = img.naturalHeight / img.height;
    
    const pixel = ctx.getImageData(x * scaleX, y * scaleY, 1, 1).data;
    const targetR = pixel[0];
    const targetG = pixel[1];
    const targetB = pixel[2];

    setTimeout(() => {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i+1];
            const b = data[i+2];
            
            const distance = Math.sqrt(
                Math.pow(r - targetR, 2) +
                Math.pow(g - targetG, 2) +
                Math.pow(b - targetB, 2)
            );

            if (distance > splashThreshold) {
                const gray = 0.299 * r + 0.587 * g + 0.114 * b;
                data[i] = gray;
                data[i+1] = gray;
                data[i+2] = gray;
            }
        }
        ctx.putImageData(imageData, 0, 0);
        const newUrl = canvas.toDataURL(imageMimeType);
        setImageUrl(newUrl);
        setIsProcessing(null);
    }, 100);
  };

  const handleApplyColorSplash = () => {
    if (!imageUrl || !imageMimeType) return;

    // Convert data URL to base64
    const base64 = imageUrl.split(',')[1];
    setImageBase64(base64);
    addNewHistoryState({ base64, url: imageUrl, mimeType: imageMimeType });
    setIsColorSplashMode(false);
    addHistoryItem('Photo Lab', 'Applied Color Splash', 'photo', imageUrl);
  };
  
  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      const prevState = history[newIndex];
      setImageBase64(prevState.base64);
      setImageUrl(prevState.url);
      setImageMimeType(prevState.mimeType);
      setHistoryIndex(newIndex);
      // Reset live adjustments as they are not part of the saved state
      setBrightness(0);
      setContrast(0);
      setSaturation(0);
      setSkinSmooth(0);
      setEyeBrightness(0);
      setTeethWhiten(0);
      setActiveFilter('None');
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
      // Reset live adjustments
      setBrightness(0);
      setContrast(0);
      setSaturation(0);
      setSkinSmooth(0);
      setEyeBrightness(0);
      setTeethWhiten(0);
      setActiveFilter('None');
    }
  };

  const getCanvasCoords = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement): Point | null => {
      const rect = canvas.getBoundingClientRect();
      const touch = 'touches' in e && e.touches[0];
      const clientX = touch ? touch.clientX : (e as React.MouseEvent).clientX;
      const clientY = touch ? touch.clientY : (e as React.MouseEvent).clientY;
      if (clientX === undefined || clientY === undefined) return null;
      return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const handleEraseMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
      if (!isErasing || !eraseCanvasRef.current) return;
      setIsDrawing(true);
      const point = getCanvasCoords(e, eraseCanvasRef.current);
      if (point) setErasePath([point]);
  };

  const handleEraseMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
      if (!isErasing || !isDrawing || !eraseCanvasRef.current) return;
      const point = getCanvasCoords(e, eraseCanvasRef.current);
      if (point) setErasePath(prev => [...prev, point]);
  };
  
  const handleEraseMouseUp = () => {
      if (!isErasing) return;
      setIsDrawing(false);
  };
  
  useEffect(() => {
    const canvas = eraseCanvasRef.current;
    if (isErasing && canvas && erasePath.length > 1) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.strokeStyle = 'rgba(255, 0, 255, 0.7)';
        ctx.lineWidth = eraseBrushSize;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.clearRect(0,0, canvas.width, canvas.height);
        ctx.beginPath();
        ctx.moveTo(erasePath[0].x, erasePath[0].y);
        for(let i = 1; i < erasePath.length; i++) {
          ctx.lineTo(erasePath[i].x, erasePath[i].y);
        }
        ctx.stroke();
      }
    }
  }, [erasePath, isErasing, eraseBrushSize]);
  
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

        // Reset adjustments now that they are baked in
        setBrightness(0);
        setContrast(0);
        setSaturation(0);
        setSkinSmooth(0);
        setEyeBrightness(0);
        setTeethWhiten(0);
        setActiveFilter('None');
        addHistoryItem('Photo Lab', 'Applied adjustments', 'photo', newImageUrl);
    };

    const handleAutoEnhance = async () => {
        setIsProcessing('Auto-Enhance');
        await new Promise(resolve => setTimeout(resolve, 1000));
        setBrightness(10);
        setContrast(8);
        setSaturation(12);
        setIsProcessing(null);
        addHistoryItem('Photo Lab', 'Used AI Auto-Enhance', 'photo');
    };

    const handleAnimatePhoto = async () => {
        if (!imageBase64) return;
        setIsAnimating(true);
        try {
            const videoUrl = await animatePhotoToVideo(imageBase64);
            setAnimatedVideoUrl(videoUrl);
            addHistoryItem('Photo Lab', 'Animated photo to video', 'photo');
        } catch (err) {
            setError('Failed to animate photo.');
        } finally {
            setIsAnimating(false);
        }
    };

    const handleDownload = async (resolution: 'Original' | '1080p' | '720p' | '480p') => {
        if (!imageRef.current || !imageMimeType) return;
        setIsDownloading(true);

        // Use a timeout to allow UI to update before blocking with canvas operations
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

            ctx.filter = filterValue; // filterValue is already computed with all live adjustments
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


  const renderToolsPanel = () => (
     <Card className="h-full">
        <div className="flex flex-col h-full space-y-6">
            <div>
                <h3 className="text-lg font-semibold text-brand-text dark:text-slate-200 mb-4 border-b dark:border-slate-700 pb-2">History</h3>
                 <div className="grid grid-cols-2 gap-3">
                    <Button onClick={handleUndo} disabled={historyIndex <= 0} icon="undo" variant="secondary" className="w-full justify-start">Undo</Button>
                    <Button onClick={handleRedo} disabled={historyIndex >= history.length - 1} icon="redo" variant="secondary" className="w-full justify-start">Redo</Button>
                </div>
            </div>
             <div>
                <h3 className="text-lg font-semibold text-brand-text dark:text-slate-200 mb-4 border-b dark:border-slate-700 pb-2 flex items-center gap-2">
                    AI Magic Studio
                    <InfoTooltip>One-click AI tools to perform complex edits, from removing the background to generating a new one.</InfoTooltip>
                </h3>
                 <div className="space-y-3">
                    <Button onClick={() => setIsUpscaleModalOpen(true)} isLoading={isProcessing?.startsWith('Upscaling')} disabled={!imageBase64 || !!isProcessing || isInEditMode} icon="upscale" variant="secondary" className="w-full justify-start">AI Upscale</Button>
                    <Button onClick={handleAnimatePhoto} isLoading={isAnimating} disabled={!imageBase64 || !!isProcessing || isInEditMode} icon="video" variant="secondary" className="w-full justify-start">Animate Photo</Button>
                    <Button onClick={() => setIsStyleModalOpen(true)} isLoading={isProcessing === 'Applying Style'} disabled={!imageBase64 || !!isProcessing || isInEditMode} icon="brand" variant="secondary" className="w-full justify-start">AI Style Sculptor</Button>
                    <div className="flex items-center justify-between">
                        <Button onClick={() => setIsUniverseModalOpen(true)} isLoading={isProcessing === 'Generating Universe'} disabled={!imageBase64 || !!isProcessing || isInEditMode} icon="globe" variant="secondary" className="w-full justify-start">Background Universe</Button>
                        <InfoTooltip>Let AI remove the background and generate an entirely new 3D world behind your subject based on a text prompt.</InfoTooltip>
                    </div>
                    <Button onClick={() => setIsSkyModalOpen(true)} isLoading={isProcessing?.startsWith('Sky')} disabled={!imageBase64 || !!isProcessing || isInEditMode} icon="cloud" variant="secondary" className="w-full justify-start">AI Sky Replacement</Button>
                    <Button onClick={() => setIsObjectModalOpen(true)} isLoading={isProcessing === 'Adding Object'} disabled={!imageBase64 || !!isProcessing || isInEditMode} icon="plus-square" variant="secondary" className="w-full justify-start">AI Object Adder</Button>
                    <Button onClick={handleRemoveBackground} isLoading={isProcessing === 'Remove BG'} disabled={!imageBase64 || !!isProcessing || isInEditMode} icon="scissors" variant="secondary" className="w-full justify-start">Remove Background</Button>
                    <Button onClick={handleStartErasing} isLoading={isProcessing === 'Magic Eraser'} disabled={!imageBase64 || !!isProcessing || isInEditMode} icon="eraser" variant="secondary" className="w-full justify-start">Magic Eraser</Button>
                 </div>
            </div>
            <div>
                <h3 className="text-lg font-semibold text-brand-text dark:text-slate-200 mb-4 border-b dark:border-slate-700 pb-2">Core Tools</h3>
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <Button onClick={handleStartColorSplash} isLoading={isProcessing === 'Color Splash'} disabled={!imageBase64 || !!isProcessing || isInEditMode} icon="palette" variant="secondary" className="w-full justify-start">Magic Color Splash</Button>
                        <InfoTooltip>Click a color on your image to isolate it, turning the rest of the image black and white. Use the sensitivity slider to adjust the color range.</InfoTooltip>
                    </div>
                    <Button onClick={handleStartCropping} disabled={!imageBase64 || !!isProcessing || isInEditMode} icon="crop" variant="secondary" className="w-full justify-start">Crop Image</Button>
                    <Button onClick={handleStartTextMode} disabled={!imageBase64 || !!isProcessing || isInEditMode} icon="text" variant="secondary" className="w-full justify-start">Add Text</Button>
                </div>
            </div>
             <div>
                <h3 className="text-lg font-semibold text-brand-text dark:text-slate-200 mb-4 border-b dark:border-slate-700 pb-2">Adjustments</h3>
                 <div className="space-y-4">
                    <Button onClick={handleAutoEnhance} isLoading={isProcessing === 'Auto-Enhance'} disabled={!imageBase64 || !!isProcessing || isInEditMode} icon="wand" variant="secondary" className="w-full justify-start">AI Auto-Enhance</Button>
                    <Slider label="Brightness" value={brightness} onChange={(e) => setBrightness(parseInt(e.target.value))} />
                    <Slider label="Contrast" value={contrast} onChange={(e) => setContrast(parseInt(e.target.value))} />
                    <Slider label="Saturation" value={saturation} onChange={(e) => setSaturation(parseInt(e.target.value))} />
                 </div>
                 <div className="mt-4 pt-4 border-t dark:border-slate-600 space-y-4">
                     <h4 className="text-md font-semibold text-brand-text dark:text-slate-300 flex items-center gap-2">
                        <Icon name="face-smile"/> AI Portrait Enhance
                        <InfoTooltip>Automatically detects faces and allows for subtle, natural-looking enhancements.</InfoTooltip>
                     </h4>
                     <Slider label="Smooth Skin" min={0} max={100} value={skinSmooth} onChange={(e) => setSkinSmooth(parseInt(e.target.value))} />
                     <Slider label="Brighten Eyes" min={0} max={100} value={eyeBrightness} onChange={(e) => setEyeBrightness(parseInt(e.target.value))} />
                     <Slider label="Whiten Teeth" min={0} max={100} value={teethWhiten} onChange={(e) => setTeethWhiten(parseInt(e.target.value))} />
                 </div>
                 <Button
                    onClick={handleApplyAdjustments}
                    disabled={!imageBase64 || (brightness === 0 && contrast === 0 && saturation === 0 && skinSmooth === 0 && eyeBrightness === 0 && teethWhiten === 0 && activeFilter === 'None')}
                    className="w-full mt-4"
                    variant="secondary"
                 >
                    Apply Adjustments
                 </Button>
            </div>
            <div className="border-t dark:border-slate-700 pt-6">
                <Button
                    onClick={() => setIsExportModalOpen(true)}
                    disabled={!imageBase64 || isInEditMode}
                    icon="download"
                    className="w-full"
                    variant="primary"
                >
                    Download Image
                </Button>
            </div>
        </div>
    </Card>
  );
  
  const renderTextTools = () => {
    const activeText = textElements.find(t => t.id === activeTextId);
    if (!activeText) return null;

    const updateActiveText = (props: Partial<TextElement>) => {
        setTextElements(prev => prev.map(t => t.id === activeTextId ? { ...t, ...props } : t));
    };

    return (
        <Card className="h-full">
            <div className="flex flex-col h-full space-y-6">
                <div>
                    <h3 className="text-lg font-semibold text-brand-text dark:text-slate-200 mb-4 border-b dark:border-slate-700 pb-2">Text Editor</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="text-sm font-medium text-brand-subtle dark:text-slate-400">Text</label>
                            <textarea
                                value={activeText.content}
                                onChange={(e) => updateActiveText({ content: e.target.value })}
                                className="w-full p-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 rounded-lg focus:ring-2 focus:ring-brand-primary focus:outline-none transition text-sm dark:text-slate-100"
                                rows={3}
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-brand-subtle dark:text-slate-400">Color</label>
                            <input
                                type="color"
                                value={activeText.color}
                                onChange={(e) => updateActiveText({ color: e.target.value })}
                                className="w-full h-10 p-1 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800"
                            />
                        </div>
                        <Slider 
                            label="Font Size" 
                            min={12} max={128} 
                            value={activeText.fontSize} 
                            onChange={(e) => updateActiveText({ fontSize: parseInt(e.target.value) })} 
                        />
                    </div>
                </div>
                <div className="flex-grow"></div>
                <div className="space-y-2">
                     <Button onClick={handleApplyText} variant="primary" className="w-full">Apply Text</Button>
                     <Button onClick={handleCancelTextMode} variant="secondary" className="w-full">Cancel</Button>
                </div>
            </div>
        </Card>
    );
  };

  const renderColorSplashTools = () => (
    <Card className="h-full">
        <div className="flex flex-col h-full space-y-6">
            <div>
                <h3 className="text-lg font-semibold text-brand-text dark:text-slate-200 mb-4 border-b dark:border-slate-700 pb-2">Magic Color Splash</h3>
                <p className="text-sm text-brand-subtle dark:text-slate-400 mb-4">Click on a color in the image to isolate it. Adjust the sensitivity for finer control.</p>
                <Slider 
                    label="Sensitivity" 
                    min={10} max={150} 
                    value={splashThreshold} 
                    onChange={(e) => setSplashThreshold(parseInt(e.target.value))} 
                />
            </div>
            <div className="flex-grow"></div>
            <div className="space-y-2">
                 <Button onClick={handleApplyColorSplash} variant="primary" className="w-full">Apply Color Splash</Button>
                 <Button onClick={handleCancelColorSplash} variant="secondary" className="w-full">Cancel</Button>
            </div>
        </div>
    </Card>
);

  const renderCropTools = () => (
    <Card className="h-full">
        <div className="flex flex-col h-full space-y-6">
            <div>
                <h3 className="text-lg font-semibold text-brand-text dark:text-slate-200 mb-4 border-b dark:border-slate-700 pb-2">Crop Image</h3>
                <div className="space-y-3">
                    <p className="text-sm font-medium text-brand-subtle dark:text-slate-400">Aspect Ratio</p>
                    <div className="grid grid-cols-3 gap-2">
                        {aspectRatios.map(ar => (
                            <Button
                                key={ar.name}
                                variant={aspectRatio === ar.value ? 'primary' : 'secondary'}
                                onClick={() => handleSetAspectRatio(ar.value)}
                                className="w-full text-xs !px-2 !py-2"
                            >
                                {ar.name}
                            </Button>
                        ))}
                    </div>
                </div>
            </div>
            <div className="flex-grow"></div>
            <div className="space-y-2">
                 <Button onClick={handleApplyCrop} variant="primary" className="w-full">Apply Crop</Button>
                 <Button onClick={handleCancelCrop} variant="secondary" className="w-full">Cancel</Button>
            </div>
        </div>
    </Card>
);

  const imageStyle = { 
      filter: filterValue,
      cursor: isColorSplashMode ? 'crosshair' : 'default'
  };

  const renderActiveToolUI = () => {
      if (isCropping) return renderCropTools();
      if (isTextMode) return renderTextTools();
      if (isErasing) return (
          <Card className="h-full">
            <div className="flex flex-col h-full space-y-6">
                <div>
                    <h3 className="text-lg font-semibold text-brand-text dark:text-slate-200 mb-4 border-b dark:border-slate-700 pb-2">Magic Eraser</h3>
                    <p className="text-sm text-brand-subtle dark:text-slate-400 mb-4">Paint over the object you want to remove from the image.</p>
                    <Slider 
                        label="Brush Size" 
                        min={10} 
                        max={100} 
                        value={eraseBrushSize} 
                        onChange={(e) => setEraseBrushSize(Number(e.target.value))} 
                    />
                </div>
                <div className="flex-grow"></div>
                <div className="space-y-2">
                    <Button onClick={handleApplyEraser} isLoading={isProcessing === 'Magic Eraser'} variant="primary" className="w-full">Apply Erase</Button>
                    <Button onClick={handleCancelErasing} variant="secondary" className="w-full">Cancel</Button>
                </div>
            </div>
          </Card>
      );
      if (isColorSplashMode) return renderColorSplashTools();
      return renderToolsPanel();
  };


  return (
    <div className="max-w-7xl mx-auto">
        <h2 className="text-4xl font-bold text-center mb-2 dark:text-slate-100">AI Photo Lab</h2>
        <p className="text-center text-lg text-brand-subtle dark:text-slate-400 mb-8">Edit, enhance, and transform your photos with the power of AI.</p>
        <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
                <Card className="p-0 overflow-hidden">
                    <div 
                        ref={imageContainerRef}
                        className="relative w-full min-h-[60vh] bg-slate-100 dark:bg-slate-800/50 flex items-center justify-center"
                        onMouseDown={isErasing ? handleEraseMouseDown : undefined}
                        onMouseMove={isErasing ? handleEraseMouseMove : undefined}
                        onMouseUp={isErasing ? handleEraseMouseUp : undefined}
                        onMouseLeave={isErasing ? handleEraseMouseUp : undefined}
                        onTouchStart={isErasing ? handleEraseMouseDown : undefined}
                        onTouchMove={isErasing ? handleEraseMouseMove : undefined}
                        onTouchEnd={isErasing ? handleEraseMouseUp : undefined}
                    >
                    {!imageUrl ? (
                        <label 
                            htmlFor="image-upload" 
                            className={`w-full h-full flex flex-col items-center justify-center cursor-pointer transition-colors p-8 min-h-[60vh] ${isDraggingOver ? 'bg-slate-200 dark:bg-slate-700' : ''}`}
                            onDragEnter={handleDragEnter}
                            onDragOver={handleDragEvents}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                        >
                            <div className={`text-center text-brand-subtle dark:text-slate-400 p-8 border-2 border-dashed rounded-xl transition-colors ${isDraggingOver ? 'border-brand-primary' : 'border-slate-300 dark:border-slate-600'}`}>
                                <Icon name="upload" className="w-12 h-12 mx-auto mb-2" />
                                <p className="font-semibold text-brand-text dark:text-slate-200">Upload or drag & drop an image</p>
                                <p className="text-sm">to start editing with AI</p>
                            </div>
                        </label>
                    ) : (
                       <label onClick={handleImageClickForSplash} className="relative cursor-default">
                            <img
                                ref={imageRef}
                                src={imageUrl}
                                alt="Editable"
                                className="max-w-full max-h-[80vh] object-contain block select-none"
                                style={imageStyle}
                                draggable="false"
                            />
                             {isProcessing && (
                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
                                    <div className="text-center text-white">
                                        <Spinner />
                                        <p className="mt-2 font-semibold">{isProcessing}...</p>
                                    </div>
                                </div>
                            )}

                             {isErasing && (
                                <canvas
                                  ref={eraseCanvasRef}
                                  width={imageRef.current?.clientWidth}
                                  height={imageRef.current?.clientHeight}
                                  className="absolute top-0 left-0 w-full h-full cursor-crosshair"
                                />
                            )}
                            
                            {isTextMode && textElements.map(text => (
                                <div
                                    key={text.id}
                                    style={{ 
                                        position: 'absolute', 
                                        left: text.x, 
                                        top: text.y, 
                                        color: text.color, 
                                        fontSize: `${text.fontSize}px`, 
                                        fontFamily: text.fontFamily,
                                        cursor: 'move',
                                        textShadow: '0 0 5px rgba(0,0,0,0.7)',
                                        border: activeTextId === text.id ? '2px dashed #7C3AED' : 'none',
                                        padding: '4px'
                                    }}
                                    onMouseDown={(e) => handleTextMouseDown(e, text.id)}
                                    onTouchStart={(e) => handleTextMouseDown(e, text.id)}
                                >
                                    {text.content}
                                </div>
                            ))}

                            {isCropping && (
                                <>
                                <div className="absolute inset-0 bg-black/50" style={{
                                    clipPath: `polygon(
                                        0% 0%, 100% 0%, 100% 100%, 0% 100%,
                                        0% ${cropRect.y}px,
                                        ${cropRect.x}px ${cropRect.y}px,
                                        ${cropRect.x}px ${cropRect.y + cropRect.height}px,
                                        ${cropRect.x + cropRect.width}px ${cropRect.y + cropRect.height}px,
                                        ${cropRect.x + cropRect.width}px ${cropRect.y}px,
                                        0% ${cropRect.y}px
                                    )`,
                                    pointerEvents: 'none'
                                }}/>
                                <div
                                    className="absolute border-2 border-dashed border-white cursor-move"
                                    style={{
                                    left: cropRect.x,
                                    top: cropRect.y,
                                    width: cropRect.width,
                                    height: cropRect.height,
                                    }}
                                    onMouseDown={(e) => handleCropMouseDown(e, 'move')}
                                    onTouchStart={(e) => handleCropMouseDown(e, 'move')}
                                >
                                    {['top-left', 'top-right', 'bottom-left', 'bottom-right', 'top', 'bottom', 'left', 'right'].map(handle => (
                                      <div
                                        key={handle}
                                        className="absolute w-4 h-4 bg-white rounded-full -m-2"
                                        style={{
                                          top: handle.includes('top') ? '0%' : handle.includes('bottom') ? '100%' : '50%',
                                          left: handle.includes('left') ? '0%' : handle.includes('right') ? '100%' : '50%',
                                          transform: 'translate(-50%, -50%)',
                                          cursor: `${handle.includes('top') ? 'n' : handle.includes('bottom') ? 's' : ''}${handle.includes('left') ? 'w' : handle.includes('right') ? 'e' : ''}-resize`
                                        }}
                                        onMouseDown={(e) => handleCropMouseDown(e, handle)}
                                        onTouchStart={(e) => handleCropMouseDown(e, handle)}
                                      />
                                    ))}
                                </div>
                                </>
                            )}
                       </label>
                    )}
                    <input id="image-upload" type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                    </div>
                </Card>
                {imageBase64 && (
                    <Card className="mt-8 animate-fade-in">
                        <h3 className="text-lg font-semibold text-brand-text dark:text-slate-200 mb-3">AI Image Analysis</h3>
                        <div className="space-y-4">
                            <textarea
                                value={analysisPrompt}
                                onChange={(e) => setAnalysisPrompt(e.target.value)}
                                rows={2}
                                className="w-full p-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-brand-primary focus:outline-none transition"
                                placeholder="Ask the AI about your image..."
                            />
                            <Button onClick={handleAnalyze} isLoading={isAnalyzing} disabled={isAnalyzing} icon="wand" variant="secondary" className="w-full">
                                Analyze Image
                            </Button>
                            {isAnalyzing && !analysisResult && 
                                <div className="flex justify-center py-4">
                                    <Spinner />
                                </div>
                            }
                            {analysisResult && (
                                <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg whitespace-pre-wrap font-mono text-sm dark:text-slate-300">
                                    {analysisResult}
                                </div>
                            )}
                             {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
                        </div>
                    </Card>
                )}
            </div>
            <div className="lg:col-span-1">
                {renderActiveToolUI()}
            </div>
        </div>
        
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
                <textarea
                    value={objectPrompt}
                    onChange={(e) => {
                        setObjectPrompt(e.target.value)
                        if (objectPromptError) setObjectPromptError('');
                    }}
                    rows={3}
                    className={`w-full p-2 border rounded-lg dark:bg-slate-800 dark:text-slate-100 ${objectPromptError ? 'border-red-500 ring-red-200' : 'border-slate-300 dark:border-slate-600 focus:ring-brand-primary'}`}
                />
                 {objectPromptError && <p className="text-red-500 text-sm mt-1">{objectPromptError}</p>}
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
                <textarea
                    value={universePrompt}
                    onChange={(e) => {
                        setUniversePrompt(e.target.value)
                        if (universePromptError) setUniversePromptError('');
                    }}
                    rows={3}
                    className={`w-full p-2 border rounded-lg dark:bg-slate-800 dark:text-slate-100 ${universePromptError ? 'border-red-500 ring-red-200' : 'border-slate-300 dark:border-slate-600 focus:ring-brand-primary'}`}
                />
                 {universePromptError && <p className="text-red-500 text-sm mt-1">{universePromptError}</p>}
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
                <textarea
                    value={stylePrompt}
                    onChange={e => setStylePrompt(e.target.value)}
                    rows={3}
                    className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-brand-primary"
                />

                <div className="border-t dark:border-slate-700 pt-4 mt-4">
                    <p className="text-brand-subtle dark:text-slate-400 mb-2">Or, mix styles from images.</p>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="style-image-1" className="block text-sm font-medium text-brand-text dark:text-slate-300 mb-1">Style Image 1</label>
                            <div className="relative w-full aspect-square bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center">
                                <input id="style-image-1" type="file" accept="image/*" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={(e) => handleStyleImageUpload(e, 1)} />
                                {styleImage1 ? (
                                    <img src={styleImage1.url} alt="Style 1" className="w-full h-full object-cover rounded-lg" />
                                ) : (
                                    <Icon name="upload" className="w-8 h-8 text-slate-400" />
                                )}
                            </div>
                        </div>
                        <div>
                            <label htmlFor="style-image-2" className="block text-sm font-medium text-brand-text dark:text-slate-300 mb-1">Style Image 2</label>
                             <div className="relative w-full aspect-square bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center">
                                <input id="style-image-2" type="file" accept="image/*" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={(e) => handleStyleImageUpload(e, 2)} />
                                {styleImage2 ? (
                                    <img src={styleImage2.url} alt="Style 2" className="w-full h-full object-cover rounded-lg" />
                                ) : (
                                    <Icon name="upload" className="w-8 h-8 text-slate-400" />
                                )}
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
                    <Button variant="secondary" onClick={() => {
                        setIsStyleModalOpen(false);
                        setStyleImage1(null);
                        setStyleImage2(null);
                    }}>Cancel</Button>
                    <Button variant="primary" onClick={handleApplyStyle}>Apply Style</Button>
                </div>
             </div>
        </Modal>

    </div>
  );
};

export default PhotoEditor;