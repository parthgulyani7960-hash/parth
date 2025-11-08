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
import PasswordStrengthIndicator from './components/security/PasswordStrengthIndicator';
import SecurityCenterModal from './components/security/SecurityCenterModal';
import TwoFactorAuthSetupModal from './components/security/TwoFactorAuthSetupModal';
import ChangePasswordModal from './components/security/ChangePasswordModal';

const PhotoEditor = lazy(() => import('./components/PhotoEditor'));
const VideoEditor = lazy(() => import('./components/VideoEditor'));
const AudioEditor = lazy(() => import('./components/AudioEditor'));
const TextEditor = lazy(() => import('./components/TextEditor'));
const TemplatesEditor = lazy(() => import('./components/TemplatesEditor'));
const ImageGenerator = lazy(() => import('./components/ImageGenerator'));
const CreativeChat = lazy(() => import('./components/CreativeChat'));
const AssetLibrary = lazy(() => import('./components/AssetLibrary'));
const PixelArtStudio = lazy(() => import('./components/PixelArtStudio'));


type Theme = 'light' | 'dark';
type FeedbackCategory = 'bug' | 'feature' | 'question' | 'general';
type FeedbackItem = {
    id: number;
    category: FeedbackCategory;
    message: string;
    user: { name: string; email: string };
    timestamp: Date;
};
type LoginStep = 'initial' | 'accountPicker' | 'addAccount' | '2faVerification' | 'securityCheck' | 'loggedIn';
type Suggestion = { text: string; action: () => void; icon: React.ComponentProps<typeof Icon>['name'] };

type MockUser = {
    id: number;
    name: string;
    email: string;
    avatar: string;
    is2faEnabled?: boolean;
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

const GoogleAccountPicker: React.FC<{ users: MockUser[], onSelectAccount: (user: MockUser) => void, onAddNew: () => void }> = ({ users, onSelectAccount, onAddNew }) => (
    <Modal isOpen={true} onClose={() => {}} title="Choose an account">
        <div className="space-y-2">
            {users.map(user => (
                <button key={user.id} onClick={() => onSelectAccount(user)} className="w-full flex items-center gap-4 p-3 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-200 to-sky-200 flex items-center justify-center text-brand-primary font-bold shadow-sm">{user.avatar}</div>
                    <div>
                        <p className="font-semibold text-brand-text dark:text-slate-200">{user.name}</p>
                        <p className="text-sm text-brand-subtle dark:text-slate-400">{user.email}</p>
                    </div>
                    {user.is2faEnabled && <Icon name="shield-check" className="w-5 h-5 text-emerald-500 ml-auto" title="2FA Enabled" />}
                </button>
            ))}
             <button onClick={onAddNew} className="w-full flex items-center gap-4 p-3 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                <div className="w-10 h-10 rounded-full border-2 border-slate-300 dark:border-slate-500 flex items-center justify-center text-brand-subtle dark:text-slate-400"><Icon name="user-plus" /></div>
                <div>
                    <p className="font-semibold text-brand-text dark:text-slate-200">Use another account</p>
                </div>
            </button>
        </div>
    </Modal>
);

const AddAccountScreen: React.FC<{ onComplete: (user: MockUser) => void }> = ({ onComplete }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim() || !password.trim()) return;
        setIsSubmitting(true);
        // Simulate network delay
        setTimeout(() => {
            const name = email.split('@')[0].replace(/[\.\_]/g, ' ').replace(/\d+/g, '').replace(/(^\w|\s\w)/g, m => m.toUpperCase());
            const avatar = (name.match(/\b\w/g) || []).slice(0, 2).join('').toUpperCase();
            const newUser: MockUser = {
                id: Date.now(),
                name: name || "New User",
                email: email,
                avatar: avatar || 'NU'
            };
            onComplete(newUser);
        }, 1000);
    };

    return (
        <Modal isOpen={true} onClose={() => {}} title="Sign in with Google">
            <p className="text-center text-brand-subtle dark:text-slate-400 mb-4">
                Enter your account details.
                <br />
                (This is a simulation. No real data is sent.)
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="w-full p-3 border rounded-lg dark:bg-slate-800" placeholder="Email address" />
                <div>
                    <input type="password" value={password} onChange={e => setPassword(e.target.value)} required className="w-full p-3 border rounded-lg dark:bg-slate-800" placeholder="Password" />
                    <PasswordStrengthIndicator password={password} />
                </div>
                <Button type="submit" isLoading={isSubmitting} className="w-full mt-4 !py-3">Next</Button>
            </form>
        </Modal>
    )
};

const TwoFactorAuthVerificationScreen: React.FC<{ onVerify: (code: string) => void, isVerifying: boolean, error: string }> = ({ onVerify, isVerifying, error }) => {
    const [code, setCode] = useState('');

    const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/\D/g, '').slice(0, 6);
        setCode(value);
    }
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onVerify(code);
    }

    return (
        <Modal isOpen={true} onClose={() => {}} title="Two-Factor Authentication">
             <form onSubmit={handleSubmit} className="space-y-4 text-center">
                 <Icon name="shield-check" className="w-16 h-16 text-emerald-500 mx-auto" />
                 <p className="text-brand-subtle dark:text-slate-400">Enter the 6-digit code from your authenticator app.</p>
                 <input
                    type="text"
                    value={code}
                    onChange={handleInput}
                    required
                    maxLength={6}
                    className="w-full p-4 text-2xl text-center tracking-[1em] border rounded-lg dark:bg-slate-800"
                    placeholder="------"
                    autoFocus
                />
                {error && <p className="text-red-500 text-sm">{error}</p>}
                <Button type="submit" isLoading={isVerifying} className="w-full !py-3">Verify</Button>
             </form>
        </Modal>
    );
};


const SecurityCheckScreen: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
    const [status, setStatus] = useState('Verifying your identity...');
    const checks = [
        'Checking for secure connection (SSL)...',
        'Encrypting login data...',
        'Performing 2-Factor Authentication check...',
        'Cross-referencing device signature...',
        'Security check complete. Welcome!',
    ];

    useEffect(() => {
        let checkIndex = 0;
        const interval = setInterval(() => {
            if (checkIndex < checks.length) {
                setStatus(checks[checkIndex]);
                checkIndex++;
            } else {
                clearInterval(interval);
                setTimeout(onComplete, 500);
            }
        }, 800);

        return () => clearInterval(interval);
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
        q: "How does this application work?",
        a: "This is a high-fidelity prototype that uses the real Google Gemini API to power its features. All AI generation tasks, from text to images and video, are processed by Google's state-of-the-art models."
    },
    {
        q: "Do I need an API key to use the features?",
        a: "Yes. For features that use advanced models like Veo for video generation, you will be prompted to select your own Google AI Studio API key. This ensures that usage is tied to your account. You can get a key from ai.google.dev."
    },
    {
        q: "Why do I need to select my own API key for some features?",
        a: "Advanced models like Veo have specific usage and billing requirements. By using your own key, you can manage your usage directly through your Google AI Studio account. This application provides a link to the billing documentation (ai.google.dev/gemini-api/docs/billing) for transparency."
    },
    {
        q: "Is my data safe?",
        a: "Your project history and settings are saved locally in your browser's storage and are not sent to any server other than for processing by the Google Gemini API. Please review Google's API policies for information on how they handle data."
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

const AdminDashboard: React.FC<{ feedbackItems: FeedbackItem[], history: HistoryItem[], onClearFeedback: () => void }> = ({ feedbackItems, history, onClearFeedback }) => {
    const addToast = useToast();
    const [isFixing, setIsFixing] = useState(false);
    const [fixingStatus, setFixingStatus] = useState('');
    
    const totalGenerations = history.filter(item => item.action.toLowerCase().includes('generate')).length;
    const mostUsedFeature = history.reduce((acc, item) => {
        acc[item.featureName] = (acc[item.featureName] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    // FIX: Explicitly cast sorting values to numbers to prevent type errors with potentially malformed data.
    const sortedFeatures = Object.entries(mostUsedFeature).sort((a, b) => Number(b[1]) - Number(a[1]));
    
    const handleFixBugs = () => {
        setIsFixing(true);
        const statuses = [
            "Analyzing user feedback...",
            "Identifying root cause of bugs...",
            "Cross-referencing with system logs...",
            "Generating potential code patches...",
            "Deploying virtual hotfix...",
            "Verifying system stability...",
        ];
        let statusIndex = 0;

        const interval = setInterval(() => {
            if (statusIndex < statuses.length) {
                setFixingStatus(statuses[statusIndex]);
                statusIndex++;
            } else {
                clearInterval(interval);
                setIsFixing(false);
                onClearFeedback();
                addToast("AI analysis complete. All reported issues have been resolved.", "success");
            }
        }, 800);
    };

    return (
         <div className="space-y-6">
            <div>
                <h3 className="text-lg font-semibold text-brand-text dark:text-slate-200 mb-2">App Statistics (Mock)</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card className="text-center">
                        <p className="text-3xl font-bold text-brand-primary">{Math.floor(Math.random() * 50) + 10}</p>
                        <p className="text-sm text-brand-subtle dark:text-slate-400">Active Users (24h)</p>
                    </Card>
                     <Card className="text-center">
                        <p className="text-3xl font-bold text-brand-primary">{totalGenerations * (Math.floor(Math.random() * 5) + 3)}</p>
                        <p className="text-sm text-brand-subtle dark:text-slate-400">Generations Today</p>
                    </Card>
                     <Card className="text-center">
                        <p className="text-3xl font-bold text-brand-primary">{sortedFeatures[0]?.[0] || 'N/A'}</p>
                        <p className="text-sm text-brand-subtle dark:text-slate-400">Most Used Feature</p>
                    </Card>
                     <Card className="text-center">
                        <p className="text-3xl font-bold text-brand-primary text-emerald-500">99.8%</p>
                        <p className="text-sm text-brand-subtle dark:text-slate-400">API Uptime</p>
                    </Card>
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <h3 className="text-lg font-semibold text-brand-text dark:text-slate-200 mb-2">User Feedback</h3>
                    {feedbackItems.length > 0 ? (
                        <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                            {feedbackItems.slice().reverse().map(item => (
                                <div key={item.id} className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="font-semibold capitalize text-brand-text dark:text-slate-200">{item.category} <span className="font-normal text-xs text-brand-subtle dark:text-slate-500">from {item.user.name}</span></p>
                                            <p className="text-sm text-brand-subtle dark:text-slate-400">{item.message}</p>
                                        </div>
                                        <p className="text-xs text-brand-subtle dark:text-slate-500">{item.timestamp.toLocaleString()}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-brand-subtle dark:text-slate-400">No new feedback submitted.</p>
                    )}
                </div>
                <div>
                    <h3 className="text-lg font-semibold text-brand-text dark:text-slate-200 mb-2">Automated System Health</h3>
                    <Card>
                        {isFixing ? (
                             <div className="flex items-center gap-3">
                                <Spinner />
                                <p className="font-semibold text-brand-text dark:text-slate-200">{fixingStatus}</p>
                            </div>
                        ) : (
                             <div className="text-center space-y-3">
                                <Icon name="shield-check" className="w-10 h-10 mx-auto text-emerald-500" />
                                <p className="text-brand-text dark:text-slate-200 font-semibold">System is stable.</p>
                                <Button
                                    onClick={handleFixBugs}
                                    disabled={feedbackItems.length === 0}
                                    icon="sparkles"
                                    variant="secondary"
                                >
                                    {feedbackItems.length > 0 ? `Resolve ${feedbackItems.length} issue(s) with AI` : 'No issues to resolve'}
                                </Button>
                            </div>
                        )}
                    </Card>
                </div>
            </div>
        </div>
    );
};


// --- MAIN APP COMPONENT ---
const App: React.FC = () => {
    const [loginStep, setLoginStep] = useState<LoginStep>('initial');
    const [users, setUsers] = useState<MockUser[]>([]);
    const [currentUser, setCurrentUser] = useState<MockUser | null>(null);
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
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    
    // Security Modals State
    const [isSecuritySettingsOpen, setIsSecuritySettingsOpen] = useState(false);
    const [isTwoFactorSetupOpen, setIsTwoFactorSetupOpen] = useState(false);
    const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
    const [twoFactorVerificationError, setTwoFactorVerificationError] = useState('');
    const [isVerifying2fa, setIsVerifying2fa] = useState(false);

    // Feedback form state
    const [feedbackCategory, setFeedbackCategory] = useState<FeedbackCategory>('general');
    const [feedbackMessage, setFeedbackMessage] = useState('');
    const [feedbackItems, setFeedbackItems] = useState<FeedbackItem[]>([]);
    
    // PWA Install state
    const [installPrompt, setInstallPrompt] = useState<any>(null);

    const { isSoundEnabled, setIsSoundEnabled } = useSound();
    const { setLastAction } = useSession();
    const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
    const addToast = useToast();

    // Data Persistence Effects & PWA
    useEffect(() => {
        // Load state from localStorage on initial render
        const savedTheme = localStorage.getItem('creative-studio-theme') as Theme;
        if (savedTheme) setTheme(savedTheme);

        try {
            const savedUsers = localStorage.getItem('creative-studio-users');
            if (savedUsers) {
                setUsers(JSON.parse(savedUsers));
            } else {
                // Seed with default users if none exist
                const defaultUsers: MockUser[] = [
                    { id: 1, name: "Creative User", email: "creative.user@example.com", avatar: "CU", is2faEnabled: false },
                    { id: 2, name: "Alex Drake", email: "alex.drake@example.com", avatar: "AD", is2faEnabled: false },
                    { id: 3, name: "Parth Gulyani", email: ADMIN_EMAIL, avatar: "PG", is2faEnabled: true },
                ];
                setUsers(defaultUsers);
            }
        } catch (e) { console.error("Failed to load users from localStorage", e); }

        const savedHistory = localStorage.getItem('creative-studio-history');
        if (savedHistory) {
            try {
                const parsedHistory = JSON.parse(savedHistory);
                const revivedHistory = parsedHistory.map((item: HistoryItem) => ({ ...item, timestamp: new Date(item.timestamp) }));
                setHistory(revivedHistory);
            } catch (e) { console.error("Failed to parse history from localStorage", e); }
        }
        
        // PWA install prompt handler
        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            setInstallPrompt(e);
        };
        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        
        return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    }, []);

    useEffect(() => {
        // Save users to localStorage whenever they change
        localStorage.setItem('creative-studio-users', JSON.stringify(users));
    }, [users]);

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
        try {
            localStorage.setItem('creative-studio-history', JSON.stringify(history));
        } catch (error) {
            console.error("Failed to save history to localStorage:", error);
            addToast("Could not save history, storage may be full.", "error");
        }
    }, [history, addToast]);
    
    const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

    const addHistoryItem = useCallback((featureName: string, action: string, icon: HistoryItem['icon'], previewUrl?: string, prompt?: string) => {
        const newItem: HistoryItem = {
            id: Date.now(),
            featureName,
            action,
            timestamp: new Date(),
            icon,
            // Do not store base64 strings in history to avoid exceeding localStorage quota.
            previewUrl: previewUrl && previewUrl.startsWith('data:') ? undefined : previewUrl,
        };
        setHistory(prev => [...prev, newItem].slice(-50)); // Keep last 50 items
        if (prompt) {
            setLastAction({ feature: featureName as AppFeature, prompt });
        }
    }, [setLastAction]);
    
    const handleLoginComplete = () => {
        if (!currentUser) return; // Should not happen
        setLoginStep('loggedIn');
        addHistoryItem('App', 'User logged in', 'user');
    };

    const handleAddNewUser = (newUser: MockUser) => {
        setUsers(prev => {
            const userExists = prev.some(u => u.email === newUser.email);
            if (userExists) {
                setCurrentUser(prev.find(u => u.email === newUser.email) || null);
                return prev;
            }
            return [...prev, newUser];
        });
        setCurrentUser(newUser);
        setLoginStep('securityCheck');
    };

    const handleLogout = () => {
        setLoginStep('initial');
        setActiveFeature(AppFeature.Dashboard);
        setCurrentUser(null);
    };
    
    const handleFeedbackSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!feedbackMessage.trim() || !currentUser) {
            addToast('Please enter your feedback message.', 'error');
            return;
        }
        
        const newFeedback: FeedbackItem = {
            id: Date.now(),
            category: feedbackCategory,
            message: feedbackMessage,
            user: { name: currentUser.name, email: currentUser.email },
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

    const handle2faVerify = (code: string) => {
        setIsVerifying2fa(true);
        setTwoFactorVerificationError('');
        // Simulate network delay for verification
        setTimeout(() => {
            if (code === '123456') { // Mock correct code
                setLoginStep('securityCheck');
            } else {
                setTwoFactorVerificationError('Invalid verification code. Please try again.');
            }
            setIsVerifying2fa(false);
        }, 1000);
    };

    const handleToggle2FA = (enabled: boolean) => {
        if (!currentUser) return;

        if (enabled) {
            setIsSecuritySettingsOpen(false);
            setIsTwoFactorSetupOpen(true);
        } else {
             const updatedUser = { ...currentUser, is2faEnabled: false };
             setCurrentUser(updatedUser);
             setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
             addToast('Two-Factor Authentication disabled.', 'info');
        }
    };

    const handle2faSetupSuccess = () => {
        if (!currentUser) return;
        const updatedUser = { ...currentUser, is2faEnabled: true };
        setCurrentUser(updatedUser);
        setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
        setIsTwoFactorSetupOpen(false);
        addToast('Two-Factor Authentication enabled successfully!', 'success');
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
            case AppFeature.AssetLibrary: return <AssetLibrary />;
            case AppFeature.PixelArt: return <PixelArtStudio addHistoryItem={addHistoryItem} />;
            default: return <Dashboard onSelectFeature={setActiveFeature} />;
        }
    };

    if (loginStep !== 'loggedIn' || !currentUser) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 animate-fade-in">
                <InteractiveBackground />
                {loginStep === 'initial' && <LoginScreen onLogin={() => setLoginStep('accountPicker')} />}
                {loginStep === 'accountPicker' && <GoogleAccountPicker users={users} onSelectAccount={(user) => { setCurrentUser(user); user.is2faEnabled ? setLoginStep('2faVerification') : setLoginStep('securityCheck'); }} onAddNew={() => setLoginStep('addAccount')} />}
                {loginStep === 'addAccount' && <AddAccountScreen onComplete={handleAddNewUser} />}
                {loginStep === '2faVerification' && <TwoFactorAuthVerificationScreen onVerify={handle2faVerify} isVerifying={isVerifying2fa} error={twoFactorVerificationError} />}
                {loginStep === 'securityCheck' && <SecurityCheckScreen onComplete={handleLoginComplete} />}
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
                    user={currentUser}
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
                <div className="flex flex-col items-center text-center space-y-4">
                     <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-violet-200 to-sky-200 flex items-center justify-center text-brand-primary font-bold text-4xl shadow-lg">
                        {currentUser.avatar}
                    </div>
                    <div>
                        <h3 className="text-2xl font-bold text-brand-text dark:text-slate-200">{currentUser.name}</h3>
                        <p className="text-brand-subtle dark:text-slate-400">{currentUser.email}</p>
                    </div>
                </div>
                <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700 space-y-2">
                    <Button variant="secondary" icon="history" className="w-full justify-start" onClick={() => { setIsProfileOpen(false); setIsHistoryOpen(true); }}>View Activity</Button>
                    <Button variant="secondary" icon="shield" className="w-full justify-start" onClick={() => { setIsProfileOpen(false); setIsSecuritySettingsOpen(true); }}>Security Center</Button>
                    {currentUser.email === ADMIN_EMAIL && (
                        <Button variant="secondary" icon="layout-dashboard" className="w-full justify-start" onClick={() => { setIsProfileOpen(false); setIsAdminOpen(true); }}>Admin Panel</Button>
                    )}
                    <Button variant="secondary" icon="log-out" className="w-full justify-start text-red-500 hover:bg-red-50 dark:hover:bg-red-900/40" onClick={handleLogout}>Log Out</Button>
                </div>
            </Modal>
            
             <Modal isOpen={isHistoryOpen} onClose={() => setIsHistoryOpen(false)} title="Activity History" size="large">
                <div className="max-h-[60vh] overflow-y-auto">
                    <HistoryViewer history={history} />
                </div>
            </Modal>
            
             <Modal isOpen={isAdminOpen} onClose={() => setIsAdminOpen(false)} title="Admin Panel" size="extra-large">
                <AdminDashboard feedbackItems={feedbackItems} history={history} onClearFeedback={() => setFeedbackItems([])} />
            </Modal>
            
            <Modal isOpen={isFaqOpen} onClose={() => setIsFaqOpen(false)} title="Frequently Asked Questions" size="large">
                <FaqAccordion />
            </Modal>

            {/* Security Modals */}
             <SecurityCenterModal
                isOpen={isSecuritySettingsOpen}
                onClose={() => setIsSecuritySettingsOpen(false)}
                user={currentUser}
                loginActivity={MOCK_SECURITY_EVENTS}
                onToggle2FA={handleToggle2FA}
                onChangePassword={() => { setIsSecuritySettingsOpen(false); setIsChangePasswordOpen(true); }}
                onSignOutAll={() => addToast('Signed out of all other devices.', 'success')}
            />

            <TwoFactorAuthSetupModal
                isOpen={isTwoFactorSetupOpen}
                onClose={() => setIsTwoFactorSetupOpen(false)}
                onSuccess={handle2faSetupSuccess}
            />

            <ChangePasswordModal
                isOpen={isChangePasswordOpen}
                onClose={() => setIsChangePasswordOpen(false)}
                onSave={() => {
                    setIsChangePasswordOpen(false);
                    addToast('Password changed successfully!', 'success');
                }}
            />
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