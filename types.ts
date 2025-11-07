export enum AppFeature {
  Dashboard = 'DASHBOARD',
  Photo = 'PHOTO',
  Video = 'VIDEO',
  Audio = 'AUDIO',
  Text = 'TEXT',
  Templates = 'TEMPLATES',
  ImageGenerator = 'IMAGE_GENERATOR',
  CreativeChat = 'CREATIVE_CHAT',
}

export interface HistoryItem {
  id: number;
  featureName: string;
  action: string;
  timestamp: Date;
  icon: 'photo' | 'video' | 'sound-wave' | 'text' | 'template' | 'sparkles' | 'help' | 'chat';
  previewUrl?: string;
}