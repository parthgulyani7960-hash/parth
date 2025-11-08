import React, { useState, useEffect } from 'react';
import { generateText } from '../services/geminiService';
import { HistoryItem, ScriptScene } from '../types';
import Card from './common/Card';
import Button from './common/Button';
import Icon, { InfoTooltip } from './common/Icon';
import Spinner from './common/Spinner';
import { useToast } from '../hooks/useToast';
import { useSession } from '../hooks/useSession';

type Mode = 'write' | 'proofread' | 'summarize' | 'poem' | 'transform' | 'script';
type SummaryLength = 'short' | 'medium' | 'long';
type ProofreadTone = 'formal' | 'casual' | 'professional';
type TransformFormat = 'tweet' | 'email' | 'slides';

interface TextEditorProps {
  addHistoryItem: (featureName: string, action: string, icon: HistoryItem['icon'], previewUrl?: string, prompt?: string) => void;
}

const TextEditor: React.FC<TextEditorProps> = ({ addHistoryItem }) => {
  const [mode, setMode] = useState<Mode>('write');
  const [inputText, setInputText] = useState<string>('');
  const [prompt, setPrompt] = useState<string>('');
  const [customPrompt, setCustomPrompt] = useState<string>('');
  const [generatedText, setGeneratedText] = useState<string>('');
  const [editableGeneratedText, setEditableGeneratedText] = useState('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [validationErrors, setValidationErrors] = useState<{ [key: string]: string }>({});

  const [summaryLength, setSummaryLength] = useState<SummaryLength>('medium');
  const [proofreadTone, setProofreadTone] = useState<ProofreadTone>('professional');
  const [transformFormat, setTransformFormat] = useState<TransformFormat>('tweet');
  const addToast = useToast();
  const { lastAction, themeOfTheDay, setScriptForVideo } = useSession();
  
  useEffect(() => {
    setPrompt(`A short, engaging blog post about ${themeOfTheDay}.`);
  }, [themeOfTheDay]);


  const validate = (currentMode: Mode) => {
    const newErrors: { [key: string]: string } = {};
    if ((currentMode === 'write' || currentMode === 'poem' || currentMode === 'script') && !prompt.trim()) {
      newErrors.prompt = "Please provide a prompt or topic.";
    }
    if ((currentMode === 'proofread' || currentMode === 'summarize' || currentMode === 'transform') && !inputText.trim()) {
      newErrors.inputText = "Please provide some text to process.";
    }
    setValidationErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleGenerate = async (currentMode: Mode) => {
    if (!validate(currentMode)) return;

    setIsLoading(true);
    setError('');
    setGeneratedText('');
    setEditableGeneratedText('');

    try {
      let finalPrompt = prompt;
      if (currentMode === 'write' && customPrompt.trim()) {
        finalPrompt = `${prompt}\n\n---\nCustom Instructions:\n${customPrompt}`;
      }
      // FIX: The `generateText` function expects 4 arguments, but 5 were provided. Merged the last two arguments into a single options object.
      const result = await generateText(currentMode, inputText, finalPrompt, { summaryLength, proofreadTone, transformFormat, lastAction });
      setGeneratedText(result);
      setEditableGeneratedText(result);
      addHistoryItem('Text Lab', `Generated text in ${currentMode} mode`, 'text', undefined, finalPrompt);
    } catch (err) {
      console.error(err);
      setError('An error occurred while generating text. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleModeChange = (newMode: Mode) => {
    setMode(newMode);
    if (newMode === 'poem') {
      setPrompt(`A beautiful poem about ${themeOfTheDay}.`);
    } else if (newMode === 'write') {
      setPrompt(`A short, engaging blog post about ${themeOfTheDay}.`);
    } else if (newMode === 'script') {
        setPrompt(`A movie scene set in a world based on ${themeOfTheDay}.`);
    }
    setGeneratedText('');
    setEditableGeneratedText('');
    setError('');
    setValidationErrors({});
  }
  
  const handleCopy = () => {
    if (!editableGeneratedText) return;
    navigator.clipboard.writeText(editableGeneratedText);
    addToast('Text copied to clipboard!', 'success');
  };

  const handleSendToVideo = () => {
    const scenes: ScriptScene[] = [];
    const sceneRegex = /SCENE\s+(\d+)\s*\n(.*?)\n([\s\S]*?)(?=SCENE|\Z)/gi;
    let match;
    while((match = sceneRegex.exec(editableGeneratedText)) !== null) {
        scenes.push({
            sceneNumber: parseInt(match[1]),
            setting: match[2].trim(),
            description: match[3].trim(),
        });
    }
    if (scenes.length > 0) {
        setScriptForVideo(scenes);
        addToast('Script sent to Video Suite!', 'success');
    } else {
        addToast('Could not find scenes in the script. Make sure it follows standard script format (e.g., "SCENE 1").', 'error');
    }
  };


  const renderInputArea = () => {
    switch (mode) {
      case 'write':
      case 'poem':
      case 'script':
        return (
          <div>
            <div>
              <label className="block text-sm font-medium text-brand-text dark:text-slate-300 mb-2">{mode === 'write' ? 'Main Goal / Topic' : mode === 'poem' ? 'What is the poem about?' : 'Logline / Core Idea'}</label>
              <textarea
                value={prompt}
                onChange={(e) => {
                  setPrompt(e.target.value);
                  if (validationErrors.prompt) setValidationErrors({});
                }}
                placeholder={mode === 'write' ? "e.g., A witty social media caption..." : mode === 'poem' ? "e.g., A rainy day in the city" : "e.g., Two friends travel through time to fix a mistake."}
                className={`w-full h-32 p-3 border rounded-lg focus:ring-2 focus:outline-none transition dark:text-slate-100 dark:bg-slate-800 ${validationErrors.prompt ? 'border-red-500 ring-red-200' : 'border-slate-300 dark:border-slate-600 focus:ring-brand-primary'}`}
              />
              {validationErrors.prompt && <p className="text-red-500 text-sm mt-1">{validationErrors.prompt}</p>}
            </div>
            {mode === 'write' && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-brand-text dark:text-slate-300 mb-2">Custom Instructions <span className="text-brand-subtle dark:text-slate-400">(Optional)</span></label>
                <textarea
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="e.g., Make it witty, use emojis, and keep it under 100 words."
                  className="w-full h-24 p-3 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-brand-primary focus:outline-none transition"
                />
              </div>
            )}
          </div>
        );
      case 'proofread':
      case 'summarize':
      case 'transform':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-brand-text dark:text-slate-300 mb-2">Text to process</label>
              <textarea
                value={inputText}
                onChange={(e) => {
                  setInputText(e.target.value);
                  if (validationErrors.inputText) setValidationErrors({});
                }}
                placeholder="Paste or write your text here..."
                className={`w-full h-48 p-3 border rounded-lg focus:ring-2 focus:outline-none transition dark:text-slate-100 dark:bg-slate-800 ${validationErrors.inputText ? 'border-red-500 ring-red-200' : 'border-slate-300 dark:border-slate-600 focus:ring-brand-primary'}`}
              />
              {validationErrors.inputText && <p className="text-red-500 text-sm mt-1">{validationErrors.inputText}</p>}
            </div>
            {mode === 'summarize' && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-brand-text dark:text-slate-300 mb-2">Summary Length</label>
                <div className="flex gap-2">
                    {(['short', 'medium', 'long'] as SummaryLength[]).map(len => (
                        <Button key={len} variant={summaryLength === len ? 'primary' : 'secondary'} onClick={() => setSummaryLength(len)} className="capitalize">{len}</Button>
                    ))}
                </div>
              </div>
            )}
             {mode === 'proofread' && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-brand-text dark:text-slate-300 mb-2">Tone</label>
                <div className="flex gap-2">
                    {(['formal', 'casual', 'professional'] as ProofreadTone[]).map(tone => (
                        <Button key={tone} variant={proofreadTone === tone ? 'primary' : 'secondary'} onClick={() => setProofreadTone(tone)} className="capitalize">{tone}</Button>
                    ))}
                </div>
              </div>
            )}
             {mode === 'transform' && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-brand-text dark:text-slate-300 mb-2">Format</label>
                <div className="flex gap-2">
                    {(['tweet', 'email', 'slides'] as TransformFormat[]).map(format => (
                        <Button key={format} variant={transformFormat === format ? 'primary' : 'secondary'} onClick={() => setTransformFormat(format)} className="capitalize">{format}</Button>
                    ))}
                </div>
              </div>
            )}
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <h2 className="text-4xl font-bold text-center mb-2 dark:text-slate-100">AI Text Lab</h2>
      <p className="text-center text-lg text-brand-subtle dark:text-slate-400 mb-8">Write, proofread, and transform text with a real AI assistant.</p>
      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <Card className="h-full">
            <div className="flex flex-col h-full space-y-6">
                <div>
                    <h3 className="text-lg font-semibold text-brand-text dark:text-slate-200 mb-3 flex items-center gap-2">
                        Mode
                        <InfoTooltip>Choose a mode for the AI. 'Write' creates new content, while other modes process the text you provide in the main editor.</InfoTooltip>
                    </h3>
                    <div className="space-y-2">
                        {(['write', 'proofread', 'summarize', 'poem', 'transform', 'script'] as Mode[]).map(m => (
                            <Button key={m} variant={mode === m ? 'primary' : 'secondary'} onClick={() => handleModeChange(m)} className="w-full justify-start capitalize">{m}</Button>
                        ))}
                    </div>
                </div>
                <div className="flex-grow"></div>
                <Button onClick={() => handleGenerate(mode)} isLoading={isLoading} disabled={isLoading} icon="sparkles" className="w-full !py-4 text-lg">
                    Generate
                </Button>
            </div>
          </Card>
        </div>
        <div className="lg:col-span-2">
            <Card className="h-full">
                <div className="flex flex-col h-full">
                    <div className="space-y-6 flex-grow">
                        {renderInputArea()}
                    </div>
                </div>
            </Card>
        </div>
      </div>
      {(isLoading || generatedText) && (
        <div className="mt-8">
            <Card>
                 <div className="flex justify-between items-center mb-3">
                    <h3 className="text-lg font-semibold text-brand-text dark:text-slate-200">AI Output</h3>
                     {generatedText && (
                        <div className="flex gap-2">
                           {mode === 'script' && <Button onClick={handleSendToVideo} icon="video" variant="secondary">Send to Video Suite</Button>}
                           <Button onClick={handleCopy} icon="scissors" variant="secondary">Copy</Button>
                        </div>
                     )}
                 </div>
                 <div className="min-h-[200px] bg-white dark:bg-slate-800 p-4 rounded-lg">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-full">
                            <Spinner />
                        </div>
                    ) : (
                        <textarea 
                           value={editableGeneratedText}
                           onChange={(e) => setEditableGeneratedText(e.target.value)}
                           className="w-full h-full min-h-[200px] bg-transparent focus:outline-none text-brand-text dark:text-slate-200 whitespace-pre-wrap"
                        />
                    )}
                 </div>
            </Card>
        </div>
      )}
    </div>
  );
};

export default TextEditor;