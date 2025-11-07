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
import { generateText } from './services/geminiService';
import Spinner from './components/common/Spinner';
import Header from './components/Header';

const PhotoEditor = lazy(() => import('./components/PhotoEditor'));
const VideoEditor = lazy(() => import('./components/VideoEditor'));
const AudioEditor = lazy(() => import('./components/AudioEditor'));
const TextEditor = lazy(() => import('./components/TextEditor'));
const TemplatesEditor = lazy(() => import('./components/TemplatesEditor'));
const ImageGenerator = lazy(() => import('./components/ImageGenerator'));
const CreativeChat = lazy(() => import('./components/CreativeChat'));

type Theme = 'light' | 'dark';
type FaqMessage = { role: 'user' | 'ai', content: string };

const MOCK_USER = {
    name: "Creative User",
    email: "creative.user@example.com",
};
const ADMIN_EMAIL = "parthgulyani7960@gmail.com";

const LoginScreen: React.FC<{ onLogin: () => void; }> = ({ onLogin }) => {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 animate-fade-in">
       <InteractiveBackground />
      <Card className="max-w-md w-full text-center">
        <h1 className="text-4xl font-bold text-brand-text dark:text-slate-200 tracking-tight">
          Creative Studio <span className="text-brand-primary">AI</span>
        </h1>
        <p className="mt-4 text-lg text-brand-subtle dark:text-slate-400">
          Your all-in-one AI-powered creative suite.
        </p>
        <div className="mt-10">
          <p className="text-sm text-brand-subtle dark:text-slate-400 mb-4">Sign in to continue</p>
          <Button 
            onClick={onLogin} 
            className="w-full !py-4 text-lg"
          >
            <svg className="w-6 h-6 mr-3" viewBox="0 0 48 48" width="48px" height="48px"><defs><path id="a" d="M44.5 20H24v8.5h11.8C34.7 33.9 30.1 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 11.8 2 2 11.8 2 24s9.8 22 22 22c11 0 21-8 21-22 0-1.3-.2-2.7-.5-4z"/></defs><clipPath id="b"><use xlinkHref="#a" overflow="visible"/></clipPath><path clipPath="url(#b)" fill="#FBBC05" d="M0 37V11l17 13z"/><path clipPath="url(#b)" fill="#EA4335" d="M0 11l17 13 7-6.1L48 14V0H0z"/><path clipPath="url(#b)" fill="#34A853" d="M0 37l30-23.5L48 14v28H0z"/><path clipPath="url(#b)" fill="#4285F4" d="M48 48L17 24l-4-3.4L48 0z"/></svg>
            Sign in with Google
          </Button>
        </div>
        <p className="mt-8 text-xs text-slate-400">
          By signing in, you agree to our Terms of Service and Privacy Policy. This is a simulated login for demonstration purposes.
        </p>
      </Card>
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

    const timeAgo = (date: Date) => {
      const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
      if (seconds < 5) return "just now";
      let interval = seconds / 31536000;
      if (interval > 1) return Math.floor(interval) + " years ago";
      interval = seconds / 2592000;
      if (interval > 1) return Math.floor(interval) + " months ago";
      interval = seconds / 86400;
      if (interval > 1) return Math.floor(interval) + " days ago";
      interval = seconds / 3600;
      if (interval > 1) return Math.floor(interval) + " hours ago";
      interval = seconds / 60;
      if (interval > 1) return Math.floor(interval) + " minutes ago";
      return Math.floor(seconds) + " seconds ago";
    }

    return (
        <div className="max-h-[70vh] overflow-y-auto pr-2 space-y-3">
            {history.map(item => (
                <div key={item.id} className="grid grid-cols-[auto,1fr,auto] items-center gap-4 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700">
                    {item.previewUrl ? (
                         <img src={item.previewUrl} alt="History preview" className="w-12 h-12 object-cover rounded-md bg-slate-200 dark:bg-slate-700" />
                    ) : (
                         <div className="w-12 h-12 bg-white dark:bg-slate-700 rounded-md shadow-sm flex items-center justify-center">
                           <Icon name={item.icon} className="w-6 h-6 text-brand-primary" />
                        </div>
                    )}
                    <div>
                        <p className="font-semibold text-brand-text dark:text-slate-200">{item.action}</p>
                        <p className="text-sm text-brand-subtle dark:text-slate-400">{item.featureName}</p>
                    </div>
                    <p className="text-sm text-right text-brand-subtle dark:text-slate-500">{timeAgo(item.timestamp)}</p>
                </div>
            ))}
        </div>
    )
}

const AppContent: React.FC = () => {
  const [activeFeature, setActiveFeature] = useState<AppFeature>(AppFeature.Dashboard);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [isCommandBarOpen, setIsCommandBarOpen] = useState(false);
  const [isWelcomeModalOpen, setIsWelcomeModalOpen] = useState(false);
  
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem('theme') as Theme) || 'light');
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  
  const [faqInput, setFaqInput] = useState('');
  const [faqMessages, setFaqMessages] = useState<FaqMessage[]>([
      { role: 'ai', content: "I'm the Creative Studio AI Assistant. How can I help you today? Ask me about any feature!" }
  ]);
  const [isAnsweringFaq, setIsAnsweringFaq] = useState(false);

  const addToast = useToast();
  const { isSoundEnabled, setIsSoundEnabled } = useSound();
  
  const [user, setUser] = useState(MOCK_USER);
  const isAdmin = user.email === ADMIN_EMAIL;


  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    const hasSeenWelcome = localStorage.getItem('hasSeenWelcomeModal');
    if (!hasSeenWelcome) {
        setIsWelcomeModalOpen(true);
    }
  }, []);

  const addHistoryItem = useCallback((featureName: string, action: string, icon: HistoryItem['icon'], previewUrl?: string) => {
      const newItem: HistoryItem = {
          id: Date.now(),
          featureName,
          action,
          timestamp: new Date(),
          icon,
          previewUrl
      };
      setHistory(prev => [newItem, ...prev]);
  }, []);

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
  };
  
  const handleLogin = () => {
    const isAssignedAdmin = Math.random() < 0.2; // 20% chance to be admin for demo
    if (isAssignedAdmin) {
        setUser({ name: "Parth Gulyani", email: ADMIN_EMAIL });
        addToast("Welcome, Admin! The Admin Panel is available in your profile.", "info");
    } else {
        setUser(MOCK_USER);
    }
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setActiveFeature(AppFeature.Dashboard);
  };
  
  const handleFeedback = () => {
    addToast("Thanks for your feedback!", "info");
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

  const renderFeature = () => {
    const props = { addHistoryItem };
    switch (activeFeature) {
      case AppFeature.Photo:
        return <PhotoEditor {...props} />;
      case AppFeature.Video:
        return <VideoEditor {...props} />;
      case AppFeature.Audio:
        return <AudioEditor {...props} />;
      case AppFeature.Text:
        return <TextEditor {...props} />;
      case AppFeature.ImageGenerator:
        return <ImageGenerator {...props} />;
      case AppFeature.Templates:
        return <TemplatesEditor {...props} />;
      case AppFeature.CreativeChat:
        return <CreativeChat {...props} />;
      case AppFeature.Dashboard:
      default:
        return <Dashboard onSelectFeature={setActiveFeature} />;
    }
  };
    
    const handleSendFaqMessage = async () => {
        if (!faqInput.trim() || isAnsweringFaq) return;
        
        const userMessage: FaqMessage = { role: 'user', content: faqInput };
        setFaqMessages(prev => [...prev, userMessage]);
        setFaqInput('');
        setIsAnsweringFaq(true);
        
        try {
            const helpPrompt = `You are a helpful assistant for Creative Studio AI. A user is asking: "${faqInput}". Answer concisely based on the app's features: Photo Lab (editing, AI tools), Video Suite (editing, generation), Audio Studio (transcription, TTS, music), Image Generator, Template Studio, and Creative Chat. Do not mention that you are a mock AI.`;
            const response = await generateText('chat', helpPrompt, '', {});
            const aiMessage: FaqMessage = { role: 'ai', content: response };
            setFaqMessages(prev => [...prev, aiMessage]);
        } catch (err) {
            const errorMessage: FaqMessage = { role: 'ai', content: "Sorry, I couldn't find an answer to that. Please try rephrasing your question or check our Feature Guides." };
            setFaqMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsAnsweringFaq(false);
        }
    };
    
    const handleCloseWelcomeModal = () => {
        localStorage.setItem('hasSeenWelcomeModal', 'true');
        setIsWelcomeModalOpen(false);
    }

  if (!isLoggedIn) {
      return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen font-sans text-brand-text dark:text-slate-300">
      <InteractiveBackground />
       <Header
            user={user}
            activeFeature={activeFeature}
            onBackToDashboard={() => setActiveFeature(AppFeature.Dashboard)}
            onOpenSettings={() => setIsSettingsModalOpen(true)}
            onOpenFeedback={handleFeedback}
            onOpenProfile={() => setIsProfileModalOpen(true)}
            onOpenCommandBar={() => setIsCommandBarOpen(true)}
        />
      <main className="pt-24">
            <div className="p-4 sm:p-6 lg:p-8">
                <div key={activeFeature} className="animate-fade-in">
                  <Suspense fallback={<Loader />}>
                    {renderFeature()}
                  </Suspense>
                </div>
            </div>
      </main>


      <Button
        variant="icon"
        className="fixed bottom-6 right-6 !rounded-2xl !p-4 !bg-brand-primary !text-white button-glow !shadow-lg"
        onClick={() => setIsHelpModalOpen(true)}
        aria-label="Open AI Help"
      >
        <Icon name="help" className="w-8 h-8"/>
      </Button>

      <CommandBar 
        isOpen={isCommandBarOpen}
        onClose={() => setIsCommandBarOpen(false)}
        onSelectFeature={(feature) => {
            setActiveFeature(feature);
            setIsCommandBarOpen(false);
        }}
      />

      <Modal isOpen={isWelcomeModalOpen} onClose={handleCloseWelcomeModal} title="Welcome to Creative Studio AI!">
        <div className="space-y-4 text-brand-subtle dark:text-slate-400">
            <p className="text-lg">This is an interactive demonstration of a next-generation creative suite.</p>
            <p><strong>Important Note:</strong> All AI features within this application are <span className="font-bold text-amber-500">simulated</span>. No data is sent to a server, and no real AI models are being called. This provides a safe, API-key-free environment for you to explore the full range of functionalities.</p>
            <p>Feel free to upload your own assets, generate content, and experiment with all the tools. Your work stays private in your browser.</p>
            <div className="pt-4 flex justify-end">
                <Button onClick={handleCloseWelcomeModal}>Get Started</Button>
            </div>
        </div>
      </Modal>

      <Modal isOpen={isSettingsModalOpen} onClose={() => setIsSettingsModalOpen(false)} title="Settings">
        <div className="space-y-6">
            <div>
                <h4 className="text-md font-semibold text-brand-text dark:text-slate-200 mb-3">Appearance</h4>
                <div className="flex gap-4">
                    <Button variant={theme === 'light' ? 'primary' : 'secondary'} className="w-full" onClick={() => handleThemeChange('light')}>Light Mode</Button>
                    <Button variant={theme === 'dark' ? 'primary' : 'secondary'} className="w-full" onClick={() => handleThemeChange('dark')}>Dark Mode</Button>
                </div>
            </div>
             <div className="border-t dark:border-slate-700 pt-6">
                <h4 className="text-md font-semibold text-brand-text dark:text-slate-200 mb-3">Sound</h4>
                <Toggle label="UI Soundscape" enabled={isSoundEnabled} onChange={setIsSoundEnabled} />
             </div>
             <div className="border-t dark:border-slate-700 pt-6">
                <h4 className="text-md font-semibold text-brand-text dark:text-slate-200 mb-3">Account & Data</h4>
                <div className="space-y-3">
                   <Button icon="history" variant="secondary" className="w-full justify-start" onClick={() => { setIsSettingsModalOpen(false); setIsHistoryModalOpen(true); }}>View App History</Button>
                   <Button icon="globe" variant="secondary" className="w-full justify-start" onClick={() => { setIsSettingsModalOpen(false); setIsPrivacyModalOpen(true); }}>Privacy & Policy</Button>
                </div>
            </div>
            <div className="flex justify-end gap-3 mt-4 border-t dark:border-slate-700 pt-6">
                <Button variant="secondary" onClick={() => setIsSettingsModalOpen(false)}>Close</Button>
            </div>
        </div>
      </Modal>

      <Modal isOpen={isPrivacyModalOpen} onClose={() => setIsPrivacyModalOpen(false)} title="Privacy & Policy">
        <div className="space-y-4 text-sm text-brand-subtle dark:text-slate-400 max-h-[60vh] overflow-y-auto pr-2">
            <h4 className="font-bold text-brand-text dark:text-slate-200">Our Commitment to Your Privacy</h4>
            <p>Creative Studio AI is designed with your privacy and security as a top priority. This application is a demonstration and operates entirely in your browser. No data, images, or content you create is ever uploaded to a server or stored permanently unless explicitly stated by a feature.</p>
            
            <h4 className="font-bold text-brand-text dark:text-slate-200">Admin & User Data</h4>
            <p>The "Admin Panel" feature is a simulation. The user statistics displayed are randomly generated for demonstration purposes and do not reflect real user activity. Your personal information (like the mock Google account) is not tracked or stored.</p>

            <h4 className="font-bold text-brand-text dark:text-slate-200">AI Processing</h4>
            <p>All AI generation and processing are handled by mock services that simulate API calls without sending your data over the internet. This ensures you can explore the full capabilities of the app in a safe and private environment.</p>

            <p>You can confidently create, edit, and experiment, knowing your work remains your own. If you have any questions, please use the AI Assistant in the Help modal.</p>
        </div>
      </Modal>


      <Modal isOpen={isHistoryModalOpen} onClose={() => setIsHistoryModalOpen(false)} title="Application History" size="large">
        <HistoryViewer history={history} />
      </Modal>

      <Modal isOpen={isHelpModalOpen} onClose={() => setIsHelpModalOpen(false)} title="AI Help Assistant" size="large">
        <div className="flex flex-col h-[60vh] animate-fade-in">
            <div className="flex-grow p-4 overflow-y-auto space-y-6 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                {faqMessages.map((msg, index) => (
                    <div key={index} className={`flex items-start gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                        {msg.role === 'ai' && (
                            <div className="w-8 h-8 flex-shrink-0 bg-brand-primary/20 text-brand-primary rounded-full flex items-center justify-center">
                                <Icon name="sparkles" className="w-5 h-5" />
                            </div>
                        )}
                        <div className={`max-w-md p-3 rounded-xl text-sm ${msg.role === 'user' ? 'bg-brand-primary text-white rounded-br-none' : 'bg-white dark:bg-slate-700 text-brand-text dark:text-slate-200 rounded-bl-none'}`}>
                            <p className="whitespace-pre-wrap">{msg.content}</p>
                        </div>
                    </div>
                ))}
                {isAnsweringFaq && <div className="flex justify-start"><Spinner /></div>}
            </div>
            <div className="mt-4 flex items-center gap-3">
                <input
                    type="text"
                    value={faqInput}
                    onChange={e => setFaqInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSendFaqMessage()}
                    placeholder="Ask about a feature..."
                    className="w-full p-3 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-lg focus:ring-2 focus:ring-brand-primary focus:outline-none transition dark:text-slate-100"
                />
                <Button onClick={handleSendFaqMessage} disabled={isAnsweringFaq}>Send</Button>
            </div>
        </div>
      </Modal>

      <Modal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} title="My Profile">
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-200 to-sky-200 flex items-center justify-center text-brand-primary text-2xl font-bold">
                    {user.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                    <p className="font-bold text-lg text-brand-text dark:text-slate-200">{user.name}</p>
                    <p className="text-sm text-brand-subtle dark:text-slate-400">{user.email}</p>
                </div>
            </div>

            <div className="space-y-2">
                 <div className="flex justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                    <span className="font-medium text-brand-subtle dark:text-slate-400">Account Status</span>
                    <span className="font-semibold text-emerald-500">{isAdmin ? 'Admin' : 'Free User'}</span>
                </div>
                 <div className="flex justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                    <span className="font-medium text-brand-subtle dark:text-slate-400">Joined</span>
                    <span className="font-semibold text-brand-text dark:text-slate-200">July 2024</span>
                </div>
            </div>
            
            {isAdmin && (
                 <div className="border-t dark:border-slate-700 pt-4">
                    <Button icon="layout-dashboard" variant="secondary" className="w-full" onClick={() => {setIsProfileModalOpen(false); setIsAdminPanelOpen(true);}}>
                        Admin Panel
                    </Button>
                 </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                <Button variant="secondary" onClick={() => setIsProfileModalOpen(false)}>Close</Button>
                <Button variant="primary" icon="log-out" onClick={handleLogout}>Sign Out</Button>
            </div>
        </div>
      </Modal>

      <Modal isOpen={isAdminPanelOpen} onClose={() => setIsAdminPanelOpen(false)} title="Admin Panel" size="large">
        <div className="space-y-6">
            <p className="text-brand-subtle dark:text-slate-400">Showing mock analytics for Creative Studio AI.</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="text-center">
                    <p className="text-4xl font-bold text-brand-primary">1,258</p>
                    <p className="text-brand-subtle dark:text-slate-400">Total Users</p>
                </Card>
                 <Card className="text-center">
                    <p className="text-4xl font-bold text-brand-primary">4,821</p>
                    <p className="text-brand-subtle dark:text-slate-400">Projects Created</p>
                </Card>
                 <Card className="text-center">
                    <p className="text-4xl font-bold text-brand-primary">245</p>
                    <p className="text-brand-subtle dark:text-slate-400">Active Today</p>
                </Card>
            </div>
            <div>
                 <h4 className="font-semibold text-brand-text dark:text-slate-200 mb-2">Feature Usage</h4>
                 <div className="space-y-2 p-4 bg-slate-50 dark:bg-slate-800/60 rounded-lg">
                    <p><strong>Image Generator:</strong> 12,304 generations</p>
                    <p><strong>Video Suite:</strong> 2,109 videos edited</p>
                    <p><strong>Audio Studio:</strong> 5,678 audio files processed</p>
                 </div>
            </div>
        </div>
      </Modal>

      <ToastContainer />
    </div>
  );
};

const App: React.FC = () => (
  <ToastProvider>
    <SoundProvider>
      <AppContent />
    </SoundProvider>
  </ToastProvider>
);

export default App;