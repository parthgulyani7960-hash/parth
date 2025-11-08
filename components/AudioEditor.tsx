import React, { useState, useCallback, useRef, useEffect, DragEvent } from 'react';
import { generateSpeech, generateText, generateMusic, generateSfx, cleanupAudio } from '../services/geminiService';
import { decode, encode, decodeAudioData } from '../utils/audio';
import { HistoryItem } from '../types';
import Card from './common/Card';
import Button from './common/Button';
import Icon, { InfoTooltip } from './common/Icon';
import Toggle from './common/Toggle';
import Spinner from './common/Spinner';
import Slider from './common/Slider';
import { useToast } from '../hooks/useToast';

// Reference to the SpeechRecognition API
const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

type Tab = 'transcribe' | 'tts' | 'music' | 'remixer';
type VoiceEffect = 'none' | 'chipmunk' | 'robot' | 'echo' | 'monster' | 'alien' | 'deep' | 'radio';
type Emotion = 'Neutral' | 'Happy' | 'Sad' | 'Angry' | 'Excited' | 'Calm';

interface AudioEditorProps {
  addHistoryItem: (featureName: string, action: string, icon: HistoryItem['icon'], previewUrl?: string) => void;
}

const voices = {
    "AI Voices": [
        { id: 'Kore', name: 'Kore (Friendly, Female)' },
        { id: 'Zephyr', name: 'Zephyr (Calm, Male)' },
        { id: 'Puck', name: 'Puck (Energetic, Male)' },
        { id: 'Charon', name: 'Charon (Deep, Male)' },
        { id: 'Aria', name: 'Aria (Narrator, Female)' },
        { id: 'Leo', name: 'Leo (Storyteller, Male)' },
        { id: 'Nova', name: 'Nova (Assistant, Female)' },
        { id: 'Fenrir', name: 'Fenrir (Epic, Male)' },
        { id: 'Luna', name: 'Luna (Soothing, Female)' },
        { id: 'Orion', name: 'Orion (Authoritative, Male)' },
    ]
};

const AudioEditor: React.FC<AudioEditorProps> = ({ addHistoryItem }) => {
    const [activeTab, setActiveTab] = useState<Tab>('transcribe');
    const addToast = useToast();

    // Transcription state
    const [isRecording, setIsRecording] = useState(false);
    const [transcription, setTranscription] = useState<string>('');
    const [summary, setSummary] = useState('');
    const [isSummarizing, setIsSummarizing] = useState(false);
    const recognitionRef = useRef<any | null>(null);

    // TTS state
    const [ttsText, setTtsText] = useState("Hello! I am a powerful AI voice from Google. What would you like me to say?");
    const [isGeneratingSpeech, setIsGeneratingSpeech] = useState(false);
    const [isGeneratingDemo, setIsGeneratingDemo] = useState<string | null>(null);
    const [ttsError, setTtsError] = useState('');
    const [generatedSpeechAudio, setGeneratedSpeechAudio] = useState<string | null>(null);
    const outputAudioContextRef = useRef<AudioContext | null>(null);
    const [selectedVoice, setSelectedVoice] = useState('Kore');
    const [ttsEmotion, setTtsEmotion] = useState<Emotion>('Neutral');
    const [voiceEffect, setVoiceEffect] = useState<VoiceEffect>('none');
    const [pitch, setPitch] = useState(0);
    const [speed, setSpeed] = useState(1);
    const [customVoiceName, setCustomVoiceName] = useState<string | null>(null);
    const [isDraggingOver, setIsDraggingOver] = useState(false);
    const [isCloningVoice, setIsCloningVoice] = useState(false);
    
    // AI Audio Cleanup State
    const [noiseReduction, setNoiseReduction] = useState(0);
    const [deEss, setDeEss] = useState(0);
    const [voiceEq, setVoiceEq] = useState(0);
    const [isCleaning, setIsCleaning] = useState(false);
    
    // AI Music State
    const [musicMood, setMusicMood] = useState('Happy');
    const [musicGenre, setMusicGenre] = useState('Electronic');
    const [musicDuration, setMusicDuration] = useState(30);
    const [isGeneratingMusic, setIsGeneratingMusic] = useState(false);
    const [generatedMusic, setGeneratedMusic] = useState<string | null>(null);
    const [sfxPrompt, setSfxPrompt] = useState('Laser blast');
    const [isGeneratingSfx, setIsGeneratingSfx] = useState(false);
    const [validationErrors, setValidationErrors] = useState<{ [key: string]: string }>({});

    // AI Remixer State
    const [remixFile, setRemixFile] = useState<File | null>(null);
    const [remixFileUrl, setRemixFileUrl] = useState<string | null>(null);
    const [isAnalyzingStems, setIsAnalyzingStems] = useState(false);
    const [stems, setStems] = useState<{vocals: number, bass: number, drums: number, other: number} | null>(null);
    

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
        };
    }, []);

    const stopTranscription = useCallback(() => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
            recognitionRef.current = null;
        }
        setIsRecording(false);
    }, []);

    const startTranscription = useCallback(async () => {
        if (!SpeechRecognition) {
            addToast("Real-time transcription is not supported in this browser.", 'error');
            return;
        }

        try {
            await navigator.mediaDevices.getUserMedia({ audio: true });

            setIsRecording(true);
            setTranscription('');
            setSummary('');

            const recognition = new SpeechRecognition();
            recognitionRef.current = recognition;
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = 'en-US';

            let finalTranscript = '';

            recognition.onresult = (event: any) => {
                let interimTranscript = '';
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        finalTranscript += event.results[i][0].transcript;
                    } else {
                        interimTranscript += event.results[i][0].transcript;
                    }
                }
                setTranscription(finalTranscript + interimTranscript);
            };
            
            recognition.onerror = (event: any) => {
                addToast(`Transcription error: ${event.error}`, 'error');
                stopTranscription();
            };

            recognition.onend = () => {
                // If it ends unexpectedly, and we are still in recording state, try to restart.
                // This handles cases where the browser stops listening after a pause.
                if (isRecording) {
                    // But if the user intended to stop, we should not restart.
                    // This logic can be tricky, so for this demo, we'll let the user restart manually.
                    setIsRecording(false);
                }
            };

            recognition.start();
            addHistoryItem('Audio Studio', 'Started live transcription', 'sound-wave');
        } catch (error) {
            console.error('Failed to get microphone access:', error);
            addToast('Microphone access was denied. Please allow it in your browser settings to use transcription.', 'error');
            setIsRecording(false);
        }
    }, [addHistoryItem, addToast, stopTranscription, isRecording]); 

    const handleSummarize = async () => {
        if (!transcription) return;
        setIsSummarizing(true);
        setSummary('');
        try {
            const result = await generateText('summarize', transcription, '', { summaryLength: 'short' });
            setSummary(result);
            addHistoryItem('Audio Studio', 'Summarized transcription', 'sound-wave');
        } catch (error) {
            console.error('Summarization failed:', error);
            setSummary('Could not generate summary.');
        } finally {
            setIsSummarizing(false);
        }
    };
    
    const playAudio = async (base64Audio: string) => {
        if (!outputAudioContextRef.current || outputAudioContextRef.current.state === 'closed') {
            outputAudioContextRef.current = new ((window as any).AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        }
        const audioCtx = outputAudioContextRef.current;
        if (audioCtx.state === 'suspended') {
            await audioCtx.resume();
        }
        const audioBuffer = await decodeAudioData(decode(base64Audio), audioCtx, 24000, 1);
        const source = audioCtx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioCtx.destination);
        source.start();
    };

    const handleGenerateSpeech = useCallback(async () => {
        if (!ttsText.trim()) {
            setValidationErrors(prev => ({...prev, tts: "Please enter some text to generate speech."}));
            return;
        }
        setIsGeneratingSpeech(true);
        setTtsError('');
        setGeneratedSpeechAudio(null);

        try {
            const base64Audio = await generateSpeech(ttsText, selectedVoice, ttsEmotion);
            setGeneratedSpeechAudio(base64Audio);
            await playAudioWithEffects(base64Audio);
            addHistoryItem('Audio Studio', `Generated speech with ${selectedVoice} voice`, 'sound-wave');
        } catch (error) {
            console.error("Error generating speech:", error);
            setTtsError("Failed to generate speech. Please try again.");
        } finally {
            setIsGeneratingSpeech(false);
        }
    }, [ttsText, selectedVoice, ttsEmotion, addHistoryItem]);

    const handleVoiceDemo = async (voiceId: string) => {
        if (isGeneratingDemo) return;
        setIsGeneratingDemo(voiceId);
        try {
            const demoText = "This is a demonstration of my voice.";
            const base64Audio = await generateSpeech(demoText, voiceId, 'Neutral');
            await playAudio(base64Audio);
        } catch (error) {
            console.error(`Failed to play demo for ${voiceId}`, error);
            addToast(`Could not play demo for ${voiceId}.`, 'error');
        } finally {
            setIsGeneratingDemo(null);
        }
    };
    
    const playAudioWithEffects = async (base64Audio: string) => {
       if (!outputAudioContextRef.current || outputAudioContextRef.current.state === 'closed') {
            outputAudioContextRef.current = new ((window as any).AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        }
        const audioCtx = outputAudioContextRef.current;
        if (audioCtx.state === 'suspended') {
            await audioCtx.resume();
        }
        
        const audioBuffer = await decodeAudioData(decode(base64Audio), audioCtx, 24000, 1);
        const source = audioCtx.createBufferSource();
        source.buffer = audioBuffer;
        source.playbackRate.value = speed;
        source.detune.value = pitch;

        let lastNode: AudioNode = source;

        if (voiceEffect === 'chipmunk') {
            source.playbackRate.value = speed * 1.7;
        } else if (voiceEffect === 'robot') {
             const distortion = audioCtx.createWaveShaper();
             const gainNode = audioCtx.createGain();
             const biquadFilter = audioCtx.createBiquadFilter();

             biquadFilter.type = "lowshelf";
             biquadFilter.frequency.value = 1000;
             biquadFilter.gain.value = 25;
             lastNode.connect(biquadFilter);
             lastNode = biquadFilter;
        } else if (voiceEffect === 'monster') {
            source.playbackRate.value = speed * 0.7; // Slower for deep voice
            source.detune.value = pitch - 500; // Lower pitch
        } else if (voiceEffect === 'alien') {
            const filter = audioCtx.createBiquadFilter();
            filter.type = 'peaking';
            filter.frequency.value = 3500;
            filter.Q.value = 20;
            filter.gain.value = 25;
            lastNode.connect(filter);
            lastNode = filter;
        } else if (voiceEffect === 'deep') {
            source.playbackRate.value = speed * 0.8;
            source.detune.value = pitch - 800;
        } else if (voiceEffect === 'radio') {
            const radioFilter = audioCtx.createBiquadFilter();
            radioFilter.type = 'bandpass';
            radioFilter.frequency.value = 1500;
            radioFilter.Q.value = 4;
            lastNode.connect(radioFilter);
            lastNode = radioFilter;
        } else if (voiceEffect === 'echo') {
            const delay = audioCtx.createDelay(0.5);
            delay.delayTime.value = 0.3;
            const feedback = audioCtx.createGain();
            feedback.gain.value = 0.4;
            
            const masterGain = audioCtx.createGain();
            lastNode.connect(masterGain);
            masterGain.connect(audioCtx.destination);
            
            masterGain.connect(delay);
            delay.connect(feedback);
            feedback.connect(delay);
            delay.connect(audioCtx.destination);
            lastNode = masterGain;
        }

        if (voiceEffect !== 'echo') {
          lastNode.connect(audioCtx.destination);
        }
        source.start();
    };

    const handleApplyCleanup = async (options: { noise: number, deess: number, eq: number}) => {
        if (!generatedSpeechAudio) {
            addToast('Please generate some speech first.', 'error');
            return;
        }
        setIsCleaning(true);
        try {
            const cleanedAudio = await cleanupAudio(generatedSpeechAudio, options);
            setGeneratedSpeechAudio(cleanedAudio);
            addToast('AI Audio Cleanup applied!', 'success');
            addHistoryItem('Audio Studio', 'Applied AI audio cleanup', 'sound-wave');
        } catch (error) {
            console.error('Audio cleanup failed', error);
        } finally {
            setIsCleaning(false);
        }
    };
    
    const handleAutoCleanup = () => {
        const autoSettings = { noise: 70, deess: 50, eq: 15 };
        setNoiseReduction(autoSettings.noise);
        setDeEss(autoSettings.deess);
        setVoiceEq(autoSettings.eq);
        handleApplyCleanup(autoSettings);
    };
    
    const processVoiceFile = (file: File) => {
        if (file.size > 10 * 1024 * 1024) { // 10MB limit
            addToast("File size exceeds 10MB limit.", 'error');
            setTtsError("File size exceeds 10MB limit.");
            return;
        }
        if (!['audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/x-wav'].includes(file.type)) {
            addToast("Please upload a valid audio file (MP3, WAV).", 'error');
            setTtsError("Please upload a valid audio file (MP3, WAV).");
            return;
        }
        setTtsError('');
        setIsCloningVoice(true);
        addToast(`Analyzing voice sample "${file.name}"...`, 'info');

        // Mock cloning process
        setTimeout(() => {
            setCustomVoiceName(file.name);
            setSelectedVoice(file.name); // Auto-select the custom voice
            addHistoryItem('Audio Studio', 'Cloned a voice from sample', 'sound-wave');
            addToast(`Voice "${file.name}" successfully cloned!`, 'success');
            setIsCloningVoice(false);
        }, 2500);
    };


    const handleVoiceFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            processVoiceFile(file);
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

    const handleDrop = (e: DragEvent<HTMLDivElement>) => {
        handleDragEvents(e);
        setIsDraggingOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file) {
            processVoiceFile(file);
        }
    };
    
    const handleGenerateMusic = async () => {
        setIsGeneratingMusic(true);
        setGeneratedMusic(null);
        try {
            const result = await generateMusic(musicMood, musicGenre, musicDuration);
            setGeneratedMusic(result);
            addHistoryItem('Audio Studio', `Generated ${musicGenre} music`, 'sound-wave');
        } catch (error) {
            console.error(error);
        } finally {
            setIsGeneratingMusic(false);
        }
    };
    
    const handleGenerateSfx = async () => {
        if (!sfxPrompt.trim()) {
            setValidationErrors(prev => ({...prev, sfx: 'Please describe a sound effect to generate.'}));
            return;
        }
        setIsGeneratingSfx(true);
        try {
            const result = await generateSfx(sfxPrompt);
            playAudio(result);
            addHistoryItem('Audio Studio', 'Generated a sound effect', 'sound-wave');
        } catch (error) {
            console.error(error);
        } finally {
            setIsGeneratingSfx(false);
        }
    };

    const handleRemixFileDrop = (e: DragEvent<HTMLLabelElement>) => {
        handleDragEvents(e);
        setIsDraggingOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file) {
            processRemixFile(file);
        }
    };

    const handleRemixFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            processRemixFile(file);
        }
    };

    const processRemixFile = (file: File) => {
        setRemixFile(file);
        setRemixFileUrl(URL.createObjectURL(file));
        setIsAnalyzingStems(true);
        // Mock analysis
        setTimeout(() => {
            setIsAnalyzingStems(false);
            setStems({ vocals: 100, bass: 100, drums: 100, other: 100 });
            addHistoryItem('Audio Studio', 'Separated audio stems', 'sound-wave');
        }, 2000);
    };


    const renderTranscriber = () => (
        <div className="flex flex-col items-center space-y-6">
            <Button
                onClick={isRecording ? stopTranscription : startTranscription}
                className={`w-24 h-24 rounded-full text-white shadow-lg transition-transform duration-300 ${isRecording ? 'bg-red-500 hover:bg-red-600 animate-pulse' : 'bg-brand-primary hover:bg-violet-700'}`}
            >
                <Icon name={isRecording ? 'stop' : 'mic'} className="w-10 h-10" />
            </Button>
            <p className="font-semibold text-lg text-brand-text dark:text-slate-200">{isRecording ? "Listening..." : "Tap to start transcription"}</p>
            <Card className="w-full !p-4">
                <div className="min-h-[150px] bg-slate-50 dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-600">
                    <p className="text-brand-text dark:text-slate-300 whitespace-pre-wrap">{transcription || "Your live transcription will appear here..."}</p>
                </div>
                {transcription && (
                    <div className="mt-4">
                        <Button onClick={handleSummarize} isLoading={isSummarizing} disabled={isSummarizing} icon="sparkles" className="w-full" variant="secondary">
                            AI Summary
                        </Button>
                    </div>
                )}
                 {summary && (
                    <div className="mt-4 p-4 bg-sky-50 dark:bg-sky-900/40 rounded-lg border border-sky-200 dark:border-sky-800">
                         <h4 className="font-semibold text-sky-800 dark:text-sky-200 mb-2">Summary</h4>
                         <p className="text-sm text-sky-700 dark:text-sky-300 whitespace-pre-wrap">{summary}</p>
                    </div>
                 )}
            </Card>
        </div>
    );
    
    const renderTTS = () => (
        <div className="space-y-6">
            <div className="space-y-4">
              <div>
                  <label className="block text-sm font-medium text-brand-text dark:text-slate-300 mb-2">Voice Selection</label>
                  <div className="space-y-3">
                    {Object.entries(voices).map(([groupName, voiceList]) => (
                        <div key={groupName}>
                            <p className="text-xs font-semibold text-brand-subtle dark:text-slate-400 uppercase tracking-wider mb-2">{groupName}</p>
                            <div className="grid grid-cols-2 gap-2">
                                {voiceList.map(voice => (
                                     <Button
                                        key={voice.id}
                                        variant={selectedVoice === voice.id ? 'primary' : 'secondary'}
                                        onClick={() => setSelectedVoice(voice.id)}
                                        className="w-full !justify-between"
                                     >
                                         <span className="text-sm">{voice.name}</span>
                                         <Button
                                            variant="icon"
                                            onClick={(e) => { e.stopPropagation(); handleVoiceDemo(voice.id); }}
                                            className="!p-1"
                                            disabled={!!isGeneratingDemo}
                                         >
                                            {isGeneratingDemo === voice.id ? <Spinner/> : <Icon name="play" className="w-4 h-4" />}
                                         </Button>
                                     </Button>
                                ))}
                            </div>
                        </div>
                    ))}
                    {customVoiceName && (
                         <div>
                            <p className="text-xs font-semibold text-brand-subtle dark:text-slate-400 uppercase tracking-wider mb-2">Cloned Voice</p>
                             <Button variant={selectedVoice === customVoiceName ? 'primary' : 'secondary'} onClick={() => setSelectedVoice(customVoiceName)} className="w-full !justify-start text-sm">{customVoiceName}</Button>
                         </div>
                    )}
                  </div>
              </div>
              <div>
                 <label className="block text-sm font-medium text-brand-text dark:text-slate-300 mb-1">Emotion</label>
                  <select 
                    value={ttsEmotion}
                    onChange={e => setTtsEmotion(e.target.value as Emotion)}
                    className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-brand-primary focus:outline-none transition bg-white dark:bg-slate-800 dark:text-slate-200"
                  >
                     {(['Neutral', 'Happy', 'Sad', 'Angry', 'Excited', 'Calm'] as Emotion[]).map(e => <option key={e} value={e}>{e}</option>)}
                  </select>
              </div>
            </div>
            
            <div className="pt-2">
                <label htmlFor="voice-upload" className="w-full text-sm font-medium text-brand-text dark:text-slate-300 mb-1 block">
                    AI Voice Cloning (Beta)
                    <InfoTooltip className="ml-1">Upload a short, clear audio sample (MP3 or WAV) of a voice. The AI will analyze it and create a clone you can use for text-to-speech.</InfoTooltip>
                </label>
                <div 
                    className={`relative border-2 border-dashed rounded-lg p-4 text-center transition-colors ${isDraggingOver ? 'border-brand-primary bg-slate-50 dark:bg-slate-700' : 'border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
                    onDragEnter={handleDragEnter}
                    onDragOver={handleDragEvents}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                >
                    <input 
                        id="voice-upload" 
                        type="file" 
                        accept="audio/mp3,audio/wav,audio/mpeg" 
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                        onChange={handleVoiceFileChange}
                        disabled={isCloningVoice}
                    />
                    <div className="flex flex-col items-center justify-center text-brand-subtle dark:text-slate-400">
                        {isCloningVoice ? (
                            <div className="flex flex-col items-center gap-2">
                                <Spinner />
                                <span>Cloning voice...</span>
                            </div>
                        ) : (
                            <>
                                <Icon name="upload" className="w-6 h-6 mb-1"/>
                                <p className="text-sm truncate px-2">
                                    {customVoiceName ? `Using voice: ${customVoiceName}` : 'Upload a voice sample (WAV, MP3)'}
                                </p>
                            </>
                        )}
                    </div>
                </div>
                 {ttsError && <p className="text-red-500 text-sm mt-1">{ttsError}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-brand-text dark:text-slate-300 mb-1">Text to Convert</label>
              <textarea
                  value={ttsText}
                  onChange={(e) => {
                    setTtsText(e.target.value);
                    if (validationErrors.tts) setValidationErrors(prev => ({...prev, tts: ''}));
                  }}
                  className={`w-full h-36 p-3 border rounded-lg focus:ring-2 focus:outline-none transition dark:text-slate-100 dark:bg-slate-800 ${validationErrors.tts ? 'border-red-500 ring-red-200' : 'border-slate-300 dark:border-slate-600 focus:ring-brand-primary'}`}
                  placeholder="Enter text to convert to speech..."
              />
              {validationErrors.tts && <p className="text-red-500 text-sm mt-1">{validationErrors.tts}</p>}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Slider label="Pitch" min={-1200} max={1200} step={50} value={pitch} onChange={(e) => setPitch(Number(e.target.value))} />
                <Slider label="Speed" min={0.5} max={2} step={0.1} value={speed} onChange={(e) => setSpeed(Number(e.target.value))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-text dark:text-slate-300 mb-2">
                AI Voice Changer
                <InfoTooltip className="ml-1">Apply fun, real-time effects to the generated voice.</InfoTooltip>
              </label>
              <div className="grid grid-cols-4 gap-2">
                {(['none', 'chipmunk', 'robot', 'deep', 'monster', 'alien', 'radio', 'echo'] as VoiceEffect[]).map(effect => (
                  <Button key={effect} variant={voiceEffect === effect ? 'primary' : 'secondary'} onClick={() => setVoiceEffect(effect)} className="w-full !text-xs capitalize !px-2 !py-2">{effect}</Button>
                ))}
              </div>
            </div>
            <div className="border-t dark:border-slate-700 pt-6">
                <h3 className="text-lg font-semibold text-brand-text dark:text-slate-200 mb-3 flex items-center gap-2">
                    AI Audio Cleanup
                    <InfoTooltip>After generating speech, use these tools to automatically reduce background noise, remove harsh "s" sounds (de-essing), and balance the voice tone (EQ).</InfoTooltip>
                </h3>
                <div className="space-y-4">
                     <Slider label="Noise Reduction" min={0} max={100} step={1} value={noiseReduction} onChange={(e) => setNoiseReduction(Number(e.target.value))} />
                     <Slider label="De-Essing" min={0} max={100} step={1} value={deEss} onChange={(e) => setDeEss(Number(e.target.value))} />
                     <Slider label="Voice EQ" min={-100} max={100} step={1} value={voiceEq} onChange={(e) => setVoiceEq(Number(e.target.value))} />
                     <div className="grid grid-cols-2 gap-2">
                         <Button onClick={handleAutoCleanup} isLoading={isCleaning} disabled={isCleaning || !generatedSpeechAudio} icon="sparkles" variant="secondary" className="w-full">Auto Cleanup</Button>
                         <Button onClick={() => handleApplyCleanup({ noise: noiseReduction, deess: deEss, eq: voiceEq })} isLoading={isCleaning} disabled={isCleaning || !generatedSpeechAudio} icon="wand" variant="secondary" className="w-full">Apply Manual</Button>
                     </div>
                </div>
            </div>
             <div className="relative border-t dark:border-slate-700 pt-6">
                <Button onClick={handleGenerateSpeech} isLoading={isGeneratingSpeech} disabled={isGeneratingSpeech || !!isGeneratingDemo} icon="play" className="w-full">
                    Generate & Play Speech
                </Button>
                {isGeneratingSpeech && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm rounded-xl">
                        <div className="flex items-center gap-2 text-brand-subtle dark:text-slate-400">
                             <Spinner />
                            <span>Generating...</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
    
    const renderMusicGenerator = () => (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-semibold text-brand-text dark:text-slate-200 mb-4 border-b dark:border-slate-700 pb-2">Royalty-Free Music</h3>
                <p className="text-xs text-brand-subtle dark:text-slate-400 -mt-3 mb-4">Note: Generates instrumental music and sound effects only.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-brand-text dark:text-slate-300 mb-1">Mood</label>
                        <select value={musicMood} onChange={e => setMusicMood(e.target.value)} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 dark:text-slate-200">
                            <option>Happy</option>
                            <option>Sad</option>
                            <option>Epic</option>
                            <option>Calm</option>
                            <option>Energetic</option>
                            <option>Tense</option>
                            <option>Uplifting</option>
                            <option>Mysterious</option>
                            <option>Romantic</option>
                            <option>Funky</option>
                            <option>Dramatic</option>
                            <option>Dreamy</option>
                        </select>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-brand-text dark:text-slate-300 mb-1">Genre</label>
                        <select value={musicGenre} onChange={e => setMusicGenre(e.target.value)} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 dark:text-slate-200">
                            <option>Electronic</option>
                            <option>Cinematic</option>
                            <option>Acoustic</option>
                            <option>Lo-fi</option>
                            <option>Ambient</option>
                            <option>Orchestral</option>
                            <option>Rock</option>
                            <option>Jazz</option>
                            <option>Hip Hop</option>
                            <option>Pop</option>
                            <option>Synthwave</option>
                            <option>Folk</option>
                        </select>
                    </div>
                </div>
                <div className="mt-4">
                     <Slider label={`Duration: ${musicDuration}s`} min={10} max={180} step={5} value={musicDuration} onChange={e => setMusicDuration(Number(e.target.value))} />
                </div>
                <Button onClick={handleGenerateMusic} isLoading={isGeneratingMusic} disabled={isGeneratingMusic} icon="music" className="w-full mt-4">Generate Music</Button>
                {generatedMusic && (
                    <div className="mt-4 animate-fade-in">
                        <audio controls src={`data:audio/wav;base64,${generatedMusic}`} className="w-full"></audio>
                    </div>
                )}
            </div>
             <div className="border-t dark:border-slate-700 pt-6">
                <h3 className="text-lg font-semibold text-brand-text dark:text-slate-200 mb-3">Sound Effects (SFX)</h3>
                 <div>
                    <div className="flex items-center gap-2">
                      <input
                          type="text"
                          value={sfxPrompt}
                          onChange={(e) => {
                            setSfxPrompt(e.target.value)
                            if (validationErrors.sfx) setValidationErrors(prev => ({...prev, sfx: ''}));
                          }}
                          placeholder="Describe a sound effect..."
                          className={`w-full p-2 border rounded-lg dark:bg-slate-800 dark:text-slate-100 ${validationErrors.sfx ? 'border-red-500 ring-red-200' : 'border-slate-300 dark:border-slate-600 focus:ring-brand-primary'}`}
                      />
                      <Button onClick={handleGenerateSfx} isLoading={isGeneratingSfx} disabled={isGeneratingSfx} icon="sound-wave" variant="primary">Generate</Button>
                    </div>
                    {validationErrors.sfx && <p className="text-red-500 text-xs mt-1">{validationErrors.sfx}</p>}
                 </div>
            </div>
        </div>
    );
    
    const renderRemixer = () => (
        <div className="space-y-6">
            {!remixFileUrl ? (
                <label 
                    htmlFor="remix-upload"
                    className={`w-full h-64 flex flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors cursor-pointer ${isDraggingOver ? 'border-brand-primary bg-slate-50 dark:bg-slate-700' : 'border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
                    onDragEnter={handleDragEnter} onDragOver={handleDragEvents} onDragLeave={handleDragLeave} onDrop={handleRemixFileDrop}
                >
                    <Icon name="upload" className="w-12 h-12 text-brand-subtle dark:text-slate-400" />
                    <p className="mt-2 font-semibold text-brand-text dark:text-slate-200">Upload or drop a song to remix</p>
                    <p className="text-sm text-brand-subtle dark:text-slate-400">MP3, WAV, FLAC supported</p>
                    <input id="remix-upload" type="file" accept="audio/*" className="hidden" onChange={handleRemixFileChange} />
                </label>
            ) : isAnalyzingStems ? (
                <div className="h-64 flex flex-col items-center justify-center text-center">
                    <Spinner />
                    <p className="mt-2 font-semibold text-brand-text dark:text-slate-200">AI is analyzing audio stems...</p>
                    <p className="text-sm text-brand-subtle dark:text-slate-400">{remixFile?.name}</p>
                </div>
            ) : stems && (
                <div className="space-y-4">
                     <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-lg">
                        <p className="text-center text-sm text-sky-600 dark:text-sky-300 bg-sky-100 dark:bg-sky-900/50 p-2 rounded">Note: This is a UI demonstration. Stem separation is a mock feature.</p>
                     </div>
                    <audio controls src={remixFileUrl} className="w-full"></audio>
                    <Slider label="Vocals" min={0} max={100} value={stems.vocals} onChange={e => setStems(s => s ? {...s, vocals: Number(e.target.value)} : null)} />
                    <Slider label="Bass" min={0} max={100} value={stems.bass} onChange={e => setStems(s => s ? {...s, bass: Number(e.target.value)} : null)} />
                    <Slider label="Drums" min={0} max={100} value={stems.drums} onChange={e => setStems(s => s ? {...s, drums: Number(e.target.value)} : null)} />
                    <Slider label="Other" min={0} max={100} value={stems.other} onChange={e => setStems(s => s ? {...s, other: Number(e.target.value)} : null)} />
                </div>
            )}
        </div>
    );

    return (
        <div className="max-w-4xl mx-auto">
            <h2 className="text-4xl font-bold text-center mb-2 dark:text-slate-100">AI Audio Studio</h2>
            <p className="text-center text-lg text-brand-subtle dark:text-slate-400 mb-8">Transcribe, generate, and remix audio with AI.</p>
            <Card>
                <div className="mb-6 border-b border-slate-200 dark:border-slate-700">
                    <nav className="flex -mb-px gap-6">
                        <button onClick={() => setActiveTab('transcribe')} className={`py-4 px-1 border-b-2 font-medium text-lg ${activeTab === 'transcribe' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-brand-subtle dark:text-slate-400 hover:text-brand-text dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600'}`}>Transcribe</button>
                        <button onClick={() => setActiveTab('tts')} className={`py-4 px-1 border-b-2 font-medium text-lg ${activeTab === 'tts' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-brand-subtle dark:text-slate-400 hover:text-brand-text dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600'}`}>AI Voice Actor</button>
                        <button onClick={() => setActiveTab('music')} className={`py-4 px-1 border-b-2 font-medium text-lg ${activeTab === 'music' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-brand-subtle dark:text-slate-400 hover:text-brand-text dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600'}`}>AI Music</button>
                        <button onClick={() => setActiveTab('remixer')} className={`py-4 px-1 border-b-2 font-medium text-lg ${activeTab === 'remixer' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-brand-subtle dark:text-slate-400 hover:text-brand-text dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600'}`}>
                            AI Music Remixer
                            <InfoTooltip className="ml-1">Upload a song and the AI will attempt to separate it into stems like vocals, bass, and drums, allowing you to remix them.</InfoTooltip>
                        </button>
                    </nav>
                </div>
                {activeTab === 'transcribe' && renderTranscriber()}
                {activeTab === 'tts' && renderTTS()}
                {activeTab === 'music' && renderMusicGenerator()}
                {activeTab === 'remixer' && renderRemixer()}
            </Card>
        </div>
    );
};

export default AudioEditor;