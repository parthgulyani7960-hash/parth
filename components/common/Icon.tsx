import React, { useState } from 'react';

interface IconProps extends React.SVGProps<SVGSVGElement> {
  name: 'photo' | 'video' | 'audio' | 'text' | 'template' | 'magic' | 'back' | 'mic' | 'stop' | 'play' | 'pause' | 'upload' | 'sparkles' | 'wand' | 'scissors' | 'adjustments' | 'crop' | 'music' | 'palette' | 'eraser' | 'subtitles' | 'undo' | 'redo' | 'sound-wave' | 'user' | 'settings' | 'feedback' | 'log-out' | 'x' | 'download' | 'help' | 'history' | 'cloud' | 'plus-square' | 'face-smile' | 'brand' | 'upscale' | 'chat' | 'globe' | 'user-plus' | 'layout-dashboard' | 'info' | 'image' | 'film' | 'music-2' | 'type' | 'layout-grid' | 'bot' | 'star' | 'feather' | 'stabilize' | 'shield' | 'lock' | 'crown' | 'download-cloud' | 'sliders' | 'shield-check' | 'folder';
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
    'feedback': <><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></>,
    'log-out': <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></>,
    'x': <><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></>,
    'download': <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></>,
    'help': <><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></>,
    'history': <><path d="M1 21v-6a5 5 0 0 1 5-5h12"></path><path d="M17 16l4-4-4-4"></path></>,
    'cloud': <><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"></path></>,
    'plus-square': <><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></>,
    'face-smile': <><circle cx="12" cy="12" r="10"></circle><path d="M8 14s1.5 2 4 2 4-2 4-2"></path><line x1="9" y1="9" x2="9.01" y2="9"></line><line x1="15" y1="9" x2="15.01" y2="9"></line></>,
    'brand': <><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path></>,
    'upscale': <><path d="M21 11.5v-1a2 2 0 0 0-2-2h-1m-14 4v1a2 2 0 0 0 2 2h1m14-8v-1a2 2 0 0 0-2-2h-1M3 12.5v1a2 2 0 0 0 2 2h1M12 3v18M3 12h18"/></>,
    'chat': <><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></>,
    'globe': <><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></>,
    'user-plus': <><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="17" y1="11" x2="23" y2="11"></line></>,
    'layout-dashboard': <><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></>,
    'info': <><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></>,
    'image': <><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></>,
    'film': <><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect><line x1="7" y1="2" x2="7" y2="22"></line><line x1="17" y1="2" x2="17" y2="22"></line><line x1="2" y1="12" x2="22" y2="12"></line><line x1="2" y1="7" x2="7" y2="7"></line><line x1="2" y1="17" x2="7" y2="17"></line><line x1="17" y1="17" x2="22" y2="17"></line><line x1="17" y1="7" x2="22" y2="7"></line></>,
    'music-2': <><circle cx="8" cy="18" r="4"></circle><path d="M12 18V2l8 2v10"></path></>,
    'type': <><polyline points="4 7 4 4 20 4 20 7"></polyline><line x1="9" y1="20" x2="15" y2="20"></line><line x1="12" y1="4" x2="12" y2="20"></line></>,
    'layout-grid': <><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="3"></line></>,
    'bot': <><path d="M12 8V4H8a4 4 0 0 0-4 4v8a4 4 0 0 0 4 4h8a4 4 0 0 0 4-4v-4h-4a4 4 0 0 1-4-4z"></path><path d="M12 8V4H8a4 4 0 0 0-4 4v8a4 4 0 0 0 4 4h8a4 4 0 0 0 4-4v-4h-4a4 4 0 0 1-4-4zM16 8h4v4h-4z"></path></>,
    'star': <><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></>,
    'feather': <><path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z"></path><line x1="16" y1="8" x2="2" y2="22"></line><line x1="17.5" y1="15" x2="9" y2="15"></line></>,
    'stabilize': <><path d="M3 3h18v18H3z"/><circle cx="12" cy="12" r="4"/></>,
    'shield': <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></>,
    'shield-check': <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></>,
    'lock': <><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></>,
    'crown': <><path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm0 0L12 14 22 4"></path></>,
    'download-cloud': <><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="M12 12v9"/><path d="m8 17 4 4 4-4"/></>,
    'sliders': <path d="M4 21v-7m0-4V3m8 18v-9m0-4V3m8 18v-5m0-4V3M1 14h6m2-6h6m2 8h6"/>,
    'folder': <><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></>,
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

export const InfoTooltip: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => {
  return (
    <div className={`relative group flex items-center ${className}`}>
      <Icon name="info" className="w-4 h-4 text-slate-400 cursor-pointer" />
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-2 bg-slate-800 text-white text-xs rounded-md shadow-lg z-10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none text-left">
          {children}
      </div>
    </div>
  );
};


export default Icon;