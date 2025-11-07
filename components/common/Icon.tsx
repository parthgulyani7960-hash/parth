import React, { useState } from 'react';

interface IconProps extends React.SVGProps<SVGSVGElement> {
  name: 'photo' | 'video' | 'audio' | 'text' | 'template' | 'magic' | 'back' | 'mic' | 'stop' | 'play' | 'pause' | 'upload' | 'sparkles' | 'wand' | 'scissors' | 'adjustments' | 'crop' | 'music' | 'palette' | 'eraser' | 'subtitles' | 'undo' | 'redo' | 'sound-wave' | 'user' | 'settings' | 'feedback' | 'log-out' | 'x' | 'download' | 'help' | 'history' | 'cloud' | 'plus-square' | 'face-smile' | 'brand' | 'upscale' | 'chat' | 'globe' | 'user-plus' | 'layout-dashboard' | 'info' | 'image' | 'film' | 'music-2' | 'type' | 'layout-grid' | 'bot' | 'star' | 'feather' | 'stabilize';
}

const Icon: React.FC<IconProps> = ({ name, ...props }) => {
  const icons: { [key in IconProps['name']]: React.ReactElement } = {
    'photo': <><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></>,
    'video': <><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></>,
    'audio': <><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></>,
    'text': <><polyline points="4 7 4 4 20 4 20 7"></polyline><line x1="9" y1="20" x2="15" y2="20"></line><line x1="12" y1="4" x2="12" y2="20"></line></>,
    'template': <><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></>,
    'magic': <><path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 16l-4-4 4-4 4 4-4 4z"></path></>,
    'back': <><polyline points="15 18 9 12 15 6"></polyline></>,
    'mic': <><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line></>,
    'stop': <><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect></>,
    'play': <><polygon points="5 3 19 12 5 21 5 3"></polygon></>,
    'pause': <><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></>,
    'upload': <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></>,
    'sparkles': <><path d="m12 3-1.5 5.5L5 10l5.5 1.5L12 17l1.5-5.5L19 10l-5.5-1.5Z"/><path d="M22 12a10 10 0 1 1-10-10 10 10 0 0 1 10 10Z"/></>,
    'wand': <><path d="M15 4V2m0 14v-2m-3.5-8.5L10 2M10 22l1.5-1.5M2 10l1.5 1.5M20.5 13.5 22 12m-8 6h2m-14 0h2m6-12v2m0 14v-2m-8.5-3.5L2 10m18 10 1.5-1.5M10 3.5 8.5 2M12 22l1.5-1.5"/></>,
    'scissors': <><circle cx="6" cy="6" r="3"></circle><circle cx="6" cy="18" r="3"></circle><line x1="20" y1="4" x2="8.12" y2="15.88"></line><line x1="14.47" y1="14.48" x2="20" y2="20"></line><line x1="8.12" y1="8.12" x2="12" y2="12"></line></>,
    'adjustments': <><path d="M12 20v-4M12 10V4M4 12H2M10 12H4M14 12h6M22 12h-2M18 18v-4M18 8V4M6 18v-4M6 8V4"/></>,
    'crop': <><path d="M6.13 1L6 16a2 2 0 0 0 2 2h15"></path><path d="M1 6.13L16 6a2 2 0 0 1 2 2v15"></path></>,
    'music': <><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></>,
    'palette': <><circle cx="12" cy="5" r="3" /><circle cx="6.5" cy="11.5" r="3" /><circle cx="17.5" cy="11.5" r="3" /><circle cx="12" cy="18" r="3" /></>,
    'eraser': <><path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21H7Z" /><path d="M22 11.5 12.5 2" /></>,
    'subtitles': <><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2zM13 8H7M17 12H7"/></>,
    'undo': <><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/></>,
    'redo': <><path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 0 9-9 9 9 0 0 0 6 2.3l4-4.3"/></>,
    'sound-wave': <><path d="M2 8.5v7a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" /><path d="M10 6.5v11a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2v-11a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2Z" /><path d="M18 4.5v15a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2v-15a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2Z" /></>,
    'user': <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></>,
    'settings': <><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></>,
    'feedback': <><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></>,
    'log-out': <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></>,
    'x': <><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></>,
    'download': <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></>,
    'help': <><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></>,
    'history': <><path d="M1 21v-6a5 5 0 0 1 5-5h12.5"/><path d="M17 16l4-4-4-4"/><path d="m3 11 4-4-4-4"/></>,
    'cloud': <><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"></path></>,
    'plus-square': <><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" /></>,
    'face-smile': <><circle cx="12" cy="12" r="10" /><path d="M8 14s1.5 2 4 2 4-2 4-2" /><line x1="9" y1="9" x2="9.01" y2="9" /><line x1="15" y1="9" x2="15.01" y2="9" /></>,
    'brand': <><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" /><path d="m10 10.5 2 2 2-2" /><path d="m10 15.5 2 2 2-2" /></>,
    'upscale': <><path d="M21 9V3h-6" /><path d="M3 15v6h6" /><path d="M21 3 12 12" /><path d="M3 21 12 12" /></>,
    'chat': <><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" /><path d="m15 6-1 2-2 1 2 1 1 2 1-2 2-1-2-1-1-2Z"/><path d="m9 12-1 2-2 1 2 1 1 2 1-2 2-1-2-1-1-2Z"/></>,
    'globe': <><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 1.5 0 0 1-4 10 15.3 1.5 0 0 1-4-10 15.3 1.5 0 0 1 4-10z"></path></>,
    'user-plus': <><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /><line x1="20" y1="8" x2="20" y2="14" /><line x1="17" y1="11" x2="23" y2="11" /></>,
    'layout-dashboard': <><rect x="3" y="3" width="7" height="9" /><rect x="14" y="3" width="7" height="5" /><rect x="14" y="12" width="7" height="9" /><rect x="3" y="16" width="7" height="5" /></>,
    'info': <><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></>,
    'image': <><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></>,
    'film': <><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" /><line x1="7" y1="2" x2="7" y2="22" /><line x1="17" y1="2" x2="17" y2="22" /><line x1="2" y1="12" x2="22" y2="12" /><line x1="2" y1="7" x2="7" y2="7" /><line x1="2" y1="17" x2="7" y2="17" /><line x1="17" y1="17" x2="22" y2="17" /><line x1="17" y1="7" x2="22" y2="7" /></>,
    'music-2': <><circle cx="8" cy="18" r="4" /><path d="M12 18V2l8 2v10" /></>,
    'type': <><polyline points="4 7 4 4 20 4 20 7" /><line x1="9" y1="20" x2="15" y2="20" /><line x1="12" y1="4" x2="12" y2="20" /></>,
    'layout-grid': <><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></>,
    'bot': <><path d="M12 8V4H8" /><rect x="4" y="12" width="16" height="8" rx="2" /><path d="M2 12h2" /><path d="M20 12h2" /><path d="M12 12v.01" /></>,
    'star': <><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></>,
    'feather': <><path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10s3 3 5 5 5 2 5 2Z"/><path d="M14 18v2"/><path d="M8 12v2"/><path d="M11 15v2"/></>,
    'stabilize': <><path d="M12 22V8"/><path d="M5 12H2a10 10 0 0 0 20 0h-3"/><circle cx="12" cy="5" r="3"/></>,
  };

  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      {...props}
    >
      {icons[name]}
    </svg>
  );
};

export default Icon;

export const InfoTooltip: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => {
  const [isOpen, setIsOpen] = useState(false);
  const timeoutRef = React.useRef<number | null>(null);

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsOpen(true);
  };
  
  const handleMouseLeave = () => {
    timeoutRef.current = window.setTimeout(() => setIsOpen(false), 200);
  };
  
  return (
    <div className={`relative inline-block ${className}`} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      <button
        type="button"
        className="p-1 rounded-full text-brand-subtle dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
        aria-label="More info"
      >
        <Icon name="info" className="w-4 h-4" />
      </button>
      {isOpen && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 z-50 p-3 bg-slate-800 text-white text-sm rounded-lg shadow-lg animate-fade-in text-left">
          {children}
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-8 border-x-transparent border-t-8 border-t-slate-800"></div>
        </div>
      )}
    </div>
  );
};