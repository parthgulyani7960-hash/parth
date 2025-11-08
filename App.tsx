import React, { useState, useCallback, useEffect, lazy, Suspense } from 'react';
import { AppFeature, HistoryItem } from './types';
import Dashboard from './components/Dashboard';
import Modal from './components/common/Modal';
import Button from './components/common/Button';
import Icon from './components/common/Icon';
import Card from './components/common/Card';
import Toggle from './components/common/Toggle';
import Loader from './components/common/Loader';
import { ToastProvider, useToast } from './hooks/useToast';
import ToastContainer from './components/common/Toast';
import { SoundProvider, useSound } from './hooks/useSound';
import InteractiveBackground from './components/common/InteractiveBackground';
import CommandBar from './components/common/CommandBar';
import Spinner from './components/common/Spinner';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import { SessionProvider, useSession } from './hooks/useSession';
import SuggestionChip from './components/common/SuggestionChip';
import BottomNavBar from './components/common/BottomNavBar';

const PhotoEditor = lazy(() => import('./components/PhotoEditor'));
const VideoEditor = lazy(() => import('./components/VideoEditor'));
const AudioEditor = lazy(() => import('./components/AudioEditor'));
const TextEditor = lazy(() => import('./components/TextEditor'));
const TemplatesEditor = lazy(() => import('./components/TemplatesEditor'));
const ImageGenerator = lazy(() => import('./components/ImageGenerator'));
const CreativeChat = lazy(() => import('./components/CreativeChat'));

type Theme = 'light' | 'dark';
type FeedbackCategory = 'bug' | 'feature' | 'question' | 'general';
type FeedbackItem = {
    id: number;
    category: FeedbackCategory;
    message: string;
    user: { name: string; email: string };
    timestamp: Date;
};
type LoginStep = 'initial' | 'accountPicker' | 'securityCheck' | 'loggedIn';
type Suggestion = { text: string; action: () => void; icon: React.ComponentProps<typeof Icon>['name'] };


const MOCK_USER = {
    name: "Creative User",
    email: "creative.user@example.com",
    avatar: "CU"
};
const ADMIN_EMAIL = "parthgulyani7960@gmail.com";
const MOCK_SECURITY_EVENTS = [
    { id: 1, event: 'Successful Login', ip: '192.168.1.10', location: 'New York, USA', timestamp: new Date(Date.now() - 3600000) },
    { id: 2, event: 'Failed Login Attempt', ip: '203.0.113.25', location: 'Unknown', timestamp: new Date(Date.now() - 86400000) },
    { id: 3, event: 'Password Change', ip: '198.51.100.2', location: 'London, UK', timestamp: new Date(Date.now() - 604800000) },
];


const LoginScreen: React.FC<{ onLogin: () => void; }> = ({ onLogin }) => {
  return (
    <Card className="max-w-md w-full text-center">
        <Icon name="brand" className="w-16 h-16 text-brand-primary mx-auto mb-4" />
        <h1 className="text-5xl font-bold text-brand-text dark:text-slate-200 tracking-tight">
          Creative Studio <span className="text-brand-primary">Pro</span>
        </h1>
        <p className="mt-4 text-xl text-brand-subtle dark:text-slate-400">
          Your all-in-one AI-powered creative suite.
        </p>
        <div className="mt-12">
          <Button 
            onClick={onLogin} 
            className="w-full !py-4 text-lg"
          >
            <svg className="w-6 h-6 mr-3" viewBox="0 0 48 48" width="48px" height="48px"><defs><path id="a" d="M44.5 20H24v8.5h11.8C34.7 33.9 30.1 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 11.8 2 2 11.8 2 24s9.8 22 22 22c11 0 21-8 21-22 0-1.3-.2-2.7-.5-4z"/></defs><clipPath id="b"><use xlinkHref="#a" overflow="visible"/></clipPath><path clipPath="url(#b)" fill="#FBBC05" d="M0 37V11l17 13z"/><path clipPath="url(#b)" fill="#EA4335" d="M0 11l17 13 7-6.1L48 14V0H0z"/><path clipPath="url(#b)" fill="#34A853" d="M0 37l30-23.5L48 14v28H0z"/><path clipPath="url(#b)" fill="#4285F4" d="M48 48L17 24l-4-3.4L48 0z"/></svg>
            Continue with Google
          </Button>
        </div>
      </Card>
  );
};

const GoogleAccountPicker: React.FC<{ onSelectAccount: () => void }> = ({ onSelectAccount }) => (
    <Modal isOpen={true} onClose={() => {}} title="Choose an account">
        <div className="space-y-2">
            <button onClick={onSelectAccount} className="w-full flex items-center gap-4 p-3 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-200 to-sky-200 flex items-center justify-center text-brand-primary font-bold shadow-sm">{MOCK_USER.avatar}</div>
                <div>
                    <p className="font-semibold text-brand-text dark:text-slate-200">{MOCK_USER.name}</p>
                    <p className="text-sm text-brand-subtle dark:text-slate-400">{MOCK_USER.email}</p>
                </div>
            </button>
        </div>
    </Modal>
);

const SecurityCheckScreen: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
    const [status, setStatus] = useState('Verifying identity...');
    useEffect(() => {
        setTimeout(() => setStatus('Checking for secure connection...'), 1000);
        setTimeout(() => setStatus('Security check complete.'), 2000);
        setTimeout(onComplete, 2500);
    }, [onComplete]);

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 animate-fade-in text-center">
            <Spinner />
            <p className="mt-4 text-lg font-semibold text-brand-text dark:text-slate-200">{status}</p>
        </div>
    );
};


const HistoryViewer: React.FC<{ history: HistoryItem[] }> = ({ history }) => {
    if (history.length === 0) {
        return <div className="text-center text-brand-subtle dark:text-slate-400 py-12">
            <Icon name="history" className="w-12 h-12 mx-auto mb-4" />
            <p className="font-semibold text-lg text-brand-text dark:text-slate-200">No Activity Yet</p>
            <p>Your actions in the app will be recorded here.</p>
        </div>
    }

    return (
        <ul className="space-y-4">
            {history.slice().reverse().map((item) => (
                <li key={item.id} className="flex items-center gap-4 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                    <div className={`p-2 rounded-full bg-brand-primary/10 text-brand-primary`}>
                        <Icon name={item.icon} className="w-6 h-6" />
                    </div>
                    <div className="flex-grow">
                        <p className="font-semibold text-brand-text dark:text-slate-200">{item.action}</p>
                        <p className="text-sm text-brand-subtle dark:text-slate-400">{item.featureName}</p>
                    </div>
                    <p className="text-xs text-brand-subtle dark:text-slate-500">{new Date(item.timestamp).toLocaleTimeString()}</p>
                </li>
            ))}
        </ul>
    );
};

// --- FAQ Data and Component ---
const faqData = [
    {
        q: "Is this a real application? Are my images and data being processed?",
        a: "Creative Studio Pro is a sophisticated demonstration app designed to showcase the potential of generative AI in a creative workflow. All 'AI' features are simulated locally in your browser using mock data and clever visual effects. No data is sent to any server, no real AI models are being run, and nothing is saved outside of your browser's local storage."
    },
    {
        q: "Can I use my own API key for Google Gemini?",
        a: "This demo is designed to run without needing any API key, making it accessible to everyone. The focus is on demonstrating UI/UX patterns and potential features, rather than being a fully functional AI product."
    },
    {
        q: "How does the 'AI Voice Cloning' work?",
        a: "The voice cloning feature is a simulation. When you upload an audio file, the app pretends to 'clone' it by simply remembering the file name. When you generate speech with the 'cloned' voice, it uses one of the standard pre-built mock voices for the audio output. It does not actually analyze or replicate the voice from your file."
    },
    {
        q: "Why do some AI features produce abstract art or simple effects?",
        a: "To simulate complex AI tasks like 'Style Transfer' or 'Image Generation' without a real AI, the app generates complex, randomized SVG (Scalable Vector Graphics) images. This allows it to create visually interesting and unique results on the fly that look 'generative' without the need for a powerful backend."
    },
    {
        q: "How is my history and theme saved?",
        a: "The app uses your browser's `localStorage`. This is a standard web feature that allows websites to store small amounts of data directly in your browser. When you close the tab and reopen it, the app reads from this storage to restore your theme preference and your recent activity history."
    }
];

const FaqAccordion: React.FC = () => {
    const [activeFaq, setActiveFaq] = useState<number | null>(0);
    return (
        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
            {faqData.map((item, index) => (
                <div key={index} className="border-b dark:border-slate-700 last:border-b-0">
                    <button
                        className="w-full flex justify-between items-center text-left py-3"
                        onClick={() => setActiveFaq(activeFaq === index ? null : index)}
                    >
                        <h4 className="font-semibold text-brand-text dark:text-slate-200">{item.q}</h4>
                        <Icon name="back" className={`w-5 h-5 transition-transform duration-300 ${activeFaq === index ? '-rotate-90' : 'rotate-90'}`} />
                    </button>
                    {activeFaq === index && (
                        <div className="pb-4 text-brand-subtle dark:text-slate-400 animate-fade-in">
                            <p className="whitespace-pre-wrap">{item.a}</p>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
};


// --- MAIN APP COMPONENT ---
const App: React.FC = () => {
    const [loginStep, setLoginStep] = useState<LoginStep>('initial');
    const [activeFeature, setActiveFeature] = useState<AppFeature>(AppFeature.Dashboard);
    const [theme, setTheme] = useState<Theme>('light');
    const [history, setHistory] = useState<HistoryItem[]>([]);
    
    // Modals state
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [isFaqOpen, setIsFaqOpen] = useState(false);
    const [isAdminOpen, setIsAdminOpen] = useState(false);
    const [isCommandBarOpen, setIsCommandBarOpen] = useState(false);
    const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    
    // Feedback form state
    const [feedbackCategory, setFeedbackCategory] = useState<FeedbackCategory>('general');
    const [feedbackMessage, setFeedbackMessage] = useState('');
    const [feedbackItems, setFeedbackItems] = useState<FeedbackItem[]>([]);
    
    // PWA Install state
    const [installPrompt, setInstallPrompt] = useState<any>(null);
    
    // Simulated Security State
    const [is2faEnabled, setIs2faEnabled] = useState(false);

    const { isSoundEnabled, setIsSoundEnabled } = useSound();
    const { setLastAction, themeOfTheDay } = useSession();
    const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
    const addToast = useToast();

    // Data Persistence Effects & PWA
    useEffect(() => {
        // Load state from localStorage on initial render
        const savedTheme = localStorage.getItem('creative-studio-theme') as Theme;
        if (savedTheme) {
            setTheme(savedTheme);
        }

        const savedHistory = localStorage.getItem('creative-studio-history');
        if (savedHistory) {
            try {
                const parsedHistory = JSON.parse(savedHistory);
                // Important: Revive Date objects from strings
                const revivedHistory = parsedHistory.map((item: HistoryItem) => ({
                    ...item,
                    timestamp: new Date(item.timestamp)
                }));
                setHistory(revivedHistory);
            } catch (e) {
                console.error("Failed to parse history from localStorage", e);
            }
        }
        
        // PWA install prompt handler
        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            setInstallPrompt(e);
        };
        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        
        return () => {
             window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        }
    }, []);

    useEffect(() => {
        // Save theme to localStorage whenever it changes
        localStorage.setItem('creative-studio-theme', theme);
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [theme]);

    useEffect(() => {
        // Save history to localStorage whenever it changes
        localStorage.setItem('creative-studio-history', JSON.stringify(history));
    }, [history]);
    
    const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

    const addHistoryItem = useCallback((featureName: string, action: string, icon: HistoryItem['icon'], previewUrl?: string, prompt?: string) => {
        const newItem: HistoryItem = {
            id: Date.now(),
            featureName,
            action,
            timestamp: new Date(),
            icon,
            previewUrl,
        };
        setHistory(prev => [...prev, newItem].slice(-50)); // Keep last 50 items
        if (prompt) {
            setLastAction({ feature: featureName as AppFeature, prompt });
        }
    }, [setLastAction]);
    
    const handleLogin = () => {
        setLoginStep('loggedIn');
        addHistoryItem('App', 'User logged in', 'user');
    }

    const handleLogout = () => {
        setLoginStep('initial');
        setActiveFeature(AppFeature.Dashboard);
        setHistory([]);
    }
    
    const handleFeedbackSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!feedbackMessage.trim()) {
            addToast('Please enter your feedback message.', 'error');
            return;
        }
        
        const newFeedback: FeedbackItem = {
            id: Date.now(),
            category: feedbackCategory,
            message: feedbackMessage,
            user: MOCK_USER,
            timestamp: new Date()
        };

        setFeedbackItems(prev => [...prev, newFeedback]);
        setFeedbackMessage('');
        setIsFeedbackOpen(false);
        addToast('Thank you for your feedback!', 'success');
    };
    
    const handleInstallApp = async () => {
      if (!installPrompt) return;
      installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      if (outcome === 'accepted') {
        addToast('Creative Studio Pro installed!', 'success');
      }
      setInstallPrompt(null);
    };
    
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setIsCommandBarOpen(prev => !prev);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const handleSetSuggestion = useCallback((suggestion: Suggestion | null) => {
        setSuggestion(suggestion);
    }, []);

    const renderFeature = () => {
        switch(activeFeature) {
            case AppFeature.Dashboard: return <Dashboard onSelectFeature={setActiveFeature} />;
            case AppFeature.Photo: return <PhotoEditor addHistoryItem={addHistoryItem} setSuggestion={handleSetSuggestion} />;
            case AppFeature.Video: return <VideoEditor addHistoryItem={addHistoryItem} />;
            case AppFeature.Audio: return <AudioEditor addHistoryItem={addHistoryItem} />;
            case AppFeature.Text: return <TextEditor addHistoryItem={addHistoryItem} />;
            case AppFeature.Templates: return <TemplatesEditor addHistoryItem={addHistoryItem} />;
            case AppFeature.ImageGenerator: return <ImageGenerator addHistoryItem={addHistoryItem} setSuggestion={handleSetSuggestion} />;
            case AppFeature.CreativeChat: return <CreativeChat addHistoryItem={addHistoryItem} />;
            default: return <Dashboard onSelectFeature={setActiveFeature} />;
        }
    };

    if (loginStep !== 'loggedIn') {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 animate-fade-in">
                <InteractiveBackground />
                {loginStep === 'initial' && <LoginScreen onLogin={() => setLoginStep('accountPicker')} />}
                {loginStep === 'accountPicker' && <GoogleAccountPicker onSelectAccount={() => setLoginStep('securityCheck')} />}
                {loginStep === 'securityCheck' && <SecurityCheckScreen onComplete={handleLogin} />}
            </div>
        );
    }

    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;

    return (
        <div className="flex h-screen overflow-hidden">
            <Sidebar 
                activeFeature={activeFeature} 
                onSelectFeature={setActiveFeature}
                isCollapsed={isSidebarCollapsed}
                onOpenSettings={() => setIsSettingsOpen(true)}
            />
            <div className="flex-1 flex flex-col overflow-hidden">
                <Header 
                    user={MOCK_USER}
                    onOpenSettings={() => setIsSettingsOpen(true)}
                    onOpenFeedback={() => setIsFeedbackOpen(true)}
                    onOpenProfile={() => setIsProfileOpen(true)}
                    onLogout={handleLogout}
                    onOpenCommandBar={() => setIsCommandBarOpen(true)}
                    installPrompt={installPrompt}
                    onInstallApp={handleInstallApp}
                    isSidebarCollapsed={isSidebarCollapsed}
                    onToggleSidebar={() => setIsSidebarCollapsed(prev => !prev)}
                />
                <main className="flex-1 overflow-y-auto p-4 md:p-8 pb-24 md:pb-8 relative">
                    <InteractiveBackground />
                    <Suspense fallback={<Loader />}>
                        {renderFeature()}
                    </Suspense>
                    {suggestion && (
                        <SuggestionChip 
                            text={suggestion.text} 
                            icon={suggestion.icon} 
                            onClick={suggestion.action}
                            onClose={() => setSuggestion(null)}
                        />
                    )}
                </main>
            </div>
            <BottomNavBar activeFeature={activeFeature} onSelectFeature={setActiveFeature} />
            
            <CommandBar isOpen={isCommandBarOpen} onClose={() => setIsCommandBarOpen(false)} onSelectFeature={setActiveFeature} />
            
            <Modal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} title="Settings">
                <div className="space-y-6">
                    <Toggle label="Dark Mode" enabled={theme === 'dark'} onChange={toggleTheme} />
                    <Toggle label="UI Sounds" enabled={isSoundEnabled} onChange={setIsSoundEnabled} />
                    <div>
                        <h4 className="font-semibold text-brand-text dark:text-slate-200 mb-2">Application</h4>
                         <div className="space-y-2">
                            {isStandalone ? (
                                <Button variant="secondary" icon="shield-check" className="w-full justify-start" disabled>App Installed</Button>
                            ) : installPrompt && (
                                <Button variant="secondary" icon="download-cloud" className="w-full justify-start" onClick={handleInstallApp}>Install App</Button>
                            )}
                             <Button variant="secondary" icon="help" className="w-full justify-start" onClick={() => { setIsSettingsOpen(false); setIsFaqOpen(true); }}>Help & FAQ</Button>
                        </div>
                    </div>
                    <div>
                        <h4 className="font-semibold text-brand-text dark:text-slate-200 mb-2">Privacy & Security</h4>
                        <div className="space-y-3">
                            <Toggle 
                                label="Enable Two-Factor Authentication (Simulated)" 
                                enabled={is2faEnabled} 
                                onChange={(val) => {
                                    setIs2faEnabled(val);
                                    addToast(`2FA is now ${val ? 'enabled' : 'disabled'} (Simulated)`, 'info');
                                }} 
                            />
                             <Button variant="secondary" icon="shield-check" className="w-full justify-start" onClick={() => { setIsSettingsOpen(false); setIsSecurityModalOpen(true); }}>Review Login Activity</Button>
                        </div>
                    </div>
                </div>
            </Modal>
            
            <Modal isOpen={isFeedbackOpen} onClose={() => setIsFeedbackOpen(false)} title="Submit Feedback">
                <form onSubmit={handleFeedbackSubmit} className="space-y-4">
                     <div>
                        <label className="block text-sm font-medium text-brand-text dark:text-slate-300 mb-2">Category</label>
                        <div className="grid grid-cols-2 gap-2">
                            {(['bug', 'feature', 'question', 'general'] as FeedbackCategory[]).map(cat => (
                                <Button key={cat} type="button" variant={feedbackCategory === cat ? 'primary' : 'secondary'} onClick={() => setFeedbackCategory(cat)} className="capitalize w-full">{cat}</Button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <label htmlFor="feedback-message" className="block text-sm font-medium text-brand-text dark:text-slate-300 mb-2">Message</label>
                        <textarea
                            id="feedback-message"
                            value={feedbackMessage}
                            onChange={e => setFeedbackMessage(e.target.value)}
                            rows={5}
                            className="w-full p-2 border rounded-lg dark:bg-slate-800 dark:text-slate-100 border-slate-300 dark:border-slate-600 focus:ring-brand-primary"
                            placeholder="Tell us what you think..."
                        />
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="secondary" onClick={() => setIsFeedbackOpen(false)}>Cancel</Button>
                        <Button type="submit" variant="primary">Submit Feedback</Button>
                    </div>
                </form>
            </Modal>
            
            <Modal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} title="My Profile">
                <div className="text-center space-y-4">
                     <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-violet-200 to-sky-200 flex items-center justify-center text-brand-primary font-bold text-4xl shadow-lg">
                        {MOCK_USER.avatar}
                    </div>
                    <div>
                        <h3 className="text-2xl font-bold text-brand-text dark:text-slate-200">{MOCK_USER.name}</h3>
                        <p className="text-brand-subtle dark:text-slate-400">{MOCK_USER.email}</p>
                    </div>
                    <div className="pt-4 space-y-2">
                         <Button variant="secondary" icon="history" className="w-full" onClick={() => { setIsProfileOpen(false); setIsHistoryOpen(true); }}>View Activity</Button>
                         {MOCK_USER.email === ADMIN_EMAIL && (
                             <Button variant="secondary" icon="layout-dashboard" className="w-full" onClick={() => { setIsProfileOpen(false); setIsAdminOpen(true); }}>Admin Panel</Button>
                         )}
                         <Button variant="secondary" icon="log-out" className="w-full" onClick={handleLogout}>Log Out</Button>
                    </div>
                </div>
            </Modal>
            
             <Modal isOpen={isHistoryOpen} onClose={() => setIsHistoryOpen(false)} title="Activity History" size="large">
                <div className="max-h-[60vh] overflow-y-auto">
                    <HistoryViewer history={history} />
                </div>
            </Modal>
            
             <Modal isOpen={isAdminOpen} onClose={() => setIsAdminOpen(false)} title="Admin Panel" size="large">
                <div className="space-y-6">
                    <div>
                        <h3 className="text-lg font-semibold text-brand-text dark:text-slate-200 mb-2">User Feedback</h3>
                        {feedbackItems.length > 0 ? (
                            <div className="space-y-3 max-h-40 overflow-y-auto pr-2">
                                {feedbackItems.slice().reverse().map(item => (
                                    <div key={item.id} className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="font-semibold capitalize text-brand-text dark:text-slate-200">{item.category}</p>
                                                <p className="text-sm text-brand-subtle dark:text-slate-400">{item.message}</p>
                                            </div>
                                            <p className="text-xs text-brand-subtle dark:text-slate-500">{item.timestamp.toLocaleString()}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-brand-subtle dark:text-slate-400">No feedback submitted yet.</p>
                        )}
                    </div>
                     <div>
                        <h3 className="text-lg font-semibold text-brand-text dark:text-slate-200 mb-2">Mock Security Events</h3>
                         <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                            {MOCK_SECURITY_EVENTS.map(event => (
                                <div key={event.id} className={`p-3 rounded-lg flex justify-between items-center ${event.event.includes('Failed') ? 'bg-red-50 dark:bg-red-900/40' : 'bg-slate-50 dark:bg-slate-800/50'}`}>
                                    <div>
                                        <p className={`font-semibold ${event.event.includes('Failed') ? 'text-red-800 dark:text-red-200' : 'text-brand-text dark:text-slate-200'}`}>{event.event}</p>
                                        <p className="text-sm text-brand-subtle dark:text-slate-400">IP: {event.ip} ({event.location})</p>
                                    </div>
                                     <p className="text-xs text-brand-subtle dark:text-slate-500">{event.timestamp.toLocaleString()}</p>
                                </div>
                            ))}
                         </div>
                    </div>
                </div>
            </Modal>

            <Modal isOpen={isSecurityModalOpen} onClose={() => setIsSecurityModalOpen(false)} title="Login Activity" size="large">
                <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2">
                    {MOCK_SECURITY_EVENTS.map(event => (
                        <div key={event.id} className={`p-3 rounded-lg flex justify-between items-center ${event.event.includes('Failed') ? 'bg-red-50 dark:bg-red-900/40' : 'bg-slate-50 dark:bg-slate-800/50'}`}>
                            <div>
                                <p className={`font-semibold ${event.event.includes('Failed') ? 'text-red-800 dark:text-red-200' : 'text-brand-text dark:text-slate-200'}`}>{event.event}</p>

                                <p className="text-sm text-brand-subtle dark:text-slate-400">IP: {event.ip} ({event.location})</p>
                            </div>
                            <p className="text-xs text-brand-subtle dark:text-slate-500">{event.timestamp.toLocaleString()}</p>
                        </div>
                    ))}
                </div>
            </Modal>
            
            <Modal isOpen={isFaqOpen} onClose={() => setIsFaqOpen(false)} title="Frequently Asked Questions" size="large">
                <FaqAccordion />
            </Modal>
        </div>
    );
};

const AppWrapper: React.FC = () => (
    <ToastProvider>
      <SoundProvider>
        <SessionProvider>
            <App />
            <ToastContainer />
        </SessionProvider>
      </SoundProvider>
    </ToastProvider>
);

export default AppWrapper;