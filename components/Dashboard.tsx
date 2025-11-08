import React from 'react';
import { AppFeature } from '../types';
import Card from './common/Card';
import Icon from './common/Icon';

interface DashboardProps {
  onSelectFeature: (feature: AppFeature) => void;
}

const features = [
  { id: AppFeature.Photo, name: 'Photo Lab', description: 'Transform photos with style mixing, AI animation, and cinematic tools.', icon: 'photo' as const, color: 'text-sky-500' },
  { id: AppFeature.Video, name: 'Video Suite', description: 'Direct cinematic scenes, replace backgrounds, and auto-edit footage.', icon: 'video' as const, color: 'text-emerald-500' },
  { id: AppFeature.ImageGenerator, name: 'Image Generator', description: 'Create unique images and entire 3D worlds from text descriptions.', icon: 'sparkles' as const, color: 'text-fuchsia-500' },
  { id: AppFeature.Audio, name: 'Audio Studio', description: 'Master audio, act with AI voices, and compose mood-based music.', icon: 'sound-wave' as const, color: 'text-amber-500' },
  { id: AppFeature.Text, name: 'Text Lab', description: 'Write film scripts, generate smart captions, and brainstorm with an AI.', icon: 'text' as const, color: 'text-rose-500' },
  { id: AppFeature.Templates, name: 'Templates', description: 'Create stunning designs with pre-made templates.', icon: 'template' as const, color: 'text-purple-500' },
];

const Dashboard: React.FC<DashboardProps> = ({ onSelectFeature }) => {
  return (
    <div className="max-w-6xl mx-auto animate-slide-in-up">
      <div className="text-center mb-12">
        <h2 className="text-5xl font-bold text-brand-text dark:text-slate-200 mb-3">Creative Dashboard</h2>
        <p className="text-xl text-brand-subtle dark:text-slate-400">What will you create today?</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {features.map((feature, index) => (
          <div key={feature.id} style={{ animationDelay: `${index * 100}ms` }} className="animate-slide-in-up opacity-0">
            <Card onClick={() => onSelectFeature(feature.id)}>
              <div className="flex flex-col items-center text-center">
                <div className={`p-4 bg-white dark:bg-slate-800 rounded-full mb-4 shadow-neumorphic-inset dark:shadow-none ${feature.color}`}>
                  <Icon name={feature.icon} className="w-10 h-10" />
                </div>
                <h3 className="text-xl font-semibold text-brand-text dark:text-slate-200 mb-2">{feature.name}</h3>
                <p className="text-brand-subtle dark:text-slate-400">{feature.description}</p>
              </div>
            </Card>
          </div>
        ))}
         <div style={{ animationDelay: `${features.length * 100}ms` }} className="animate-slide-in-up opacity-0">
            <Card onClick={() => onSelectFeature(AppFeature.CreativeChat)}>
              <div className="flex flex-col items-center text-center relative">
                <div className="p-4 bg-white dark:bg-slate-800 rounded-full mb-4 shadow-neumorphic-inset dark:shadow-none text-indigo-500">
                  <Icon name="chat" className="w-10 h-10" />
                </div>
                <h3 className="text-xl font-semibold text-brand-text dark:text-slate-200 mb-2">Creative Chat</h3>
                <p className="text-brand-subtle dark:text-slate-400">Brainstorm ideas and co-create projects with a real-time AI partner.</p>
              </div>
            </Card>
          </div>
      </div>
    </div>
  );
};

export default Dashboard;
