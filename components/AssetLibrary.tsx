import React, { useState, useMemo } from 'react';
import Card from './common/Card';
import Icon from './common/Icon';
import Button from './common/Button';
import { useToast } from '../hooks/useToast';

type AssetType = 'All' | 'Image' | 'Video' | 'Audio';

const placeholderImages = {
  image1: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 600'%3E%3Crect width='800' height='600' fill='%23e0f2fe'/%3E%3Cpath d='M0,400 C200,300 300,500 500,400 C700,300 800,450 800,450 L800,600 L0,600 Z' fill='%230ea5e9'/%3E%3Ccircle cx='700' cy='100' r='40' fill='%23fef08a'/%3E%3C/svg%3E",
  image2: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 600'%3E%3Crect width='800' height='600' fill='%231e293b'/%3E%3Ccircle cx='200' cy='200' r='100' fill='%23f97316'/%3E%3Ccircle cx='650' cy='350' r='50' fill='%23475569'/%3E%3C/svg%3E",
  video1: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1280 720'%3E%3Crect width='1280' height='720' fill='%23fee2e2'/%3E%3Crect x='60' y='60' width='600' height='600' fill='%23fecaca'/%3E%3Crect x='720' y='120' width='500' height='80' fill='%23fecaca'/%3E%3Cpath d='M250 360 L350 260 L450 360 Z' fill='%23ef4444'/%3E%3C/svg%3E",
  video2: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1280 720'%3E%3Crect width='1280' height='720' fill='%23e0e7ff'/%3E%3Ccircle cx='640' cy='360' r='200' fill='%23a5b4fc'/%3E%3Cpath d='M540 260 L740 360 L540 460 Z' fill='%234338ca'/%3E%3C/svg%3E",
};

const mockAssets = [
  { id: 1, type: 'Image', name: 'Mountain Sunrise.jpg', url: placeholderImages.image1, size: '2.5 MB', date: '2023-10-26' },
  { id: 2, type: 'Video', name: 'Coastal Drone Shot.mp4', url: placeholderImages.video1, size: '54.1 MB', date: '2023-10-25' },
  { id: 3, type: 'Image', name: 'Abstract Shapes.png', url: placeholderImages.image2, size: '1.1 MB', date: '2023-10-24' },
  { id: 4, type: 'Audio', name: 'Podcast Intro Music.mp3', url: '', size: '5.2 MB', date: '2023-10-23' },
  { id: 5, type: 'Video', name: 'Product Demo.mov', url: placeholderImages.video2, size: '120.7 MB', date: '2023-10-22' },
  { id: 6, type: 'Image', name: 'Team Photo.heic', url: placeholderImages.image1, size: '4.8 MB', date: '2023-10-21' },
];

const AssetLibrary: React.FC = () => {
    const [filter, setFilter] = useState<AssetType>('All');
    const [searchQuery, setSearchQuery] = useState('');
    const addToast = useToast();

    const filteredAssets = useMemo(() => {
        return mockAssets
            .filter(asset => filter === 'All' || asset.type === filter)
            .filter(asset => asset.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }, [filter, searchQuery]);

    const handleAssetClick = (assetName: string) => {
        addToast(`Loading asset "${assetName}"...`, 'info');
    };

    const getAssetIcon = (type: Omit<AssetType, 'All'>) => {
        switch (type) {
            case 'Image': return <Icon name="photo" className="w-full h-full" />;
            case 'Video': return <Icon name="video" className="w-full h-full" />;
            case 'Audio': return <Icon name="sound-wave" className="w-full h-full" />;
            default: return null;
        }
    };

    return (
        <div className="max-w-7xl mx-auto animate-slide-in-up">
            <div className="text-center mb-8">
                <h2 className="text-4xl font-bold dark:text-slate-100">Asset Library</h2>
                <p className="text-lg text-brand-subtle dark:text-slate-400">Manage your creative assets in one place.</p>
            </div>

            <Card className="mb-8">
                <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                    <div className="flex gap-2 bg-slate-100 dark:bg-slate-700/50 p-1 rounded-xl">
                        {(['All', 'Image', 'Video', 'Audio'] as AssetType[]).map(f => (
                            <Button
                                key={f}
                                variant={filter === f ? 'primary' : 'secondary'}
                                onClick={() => setFilter(f)}
                                className={`!py-2 !px-4 ${filter !== f ? '!bg-transparent dark:!bg-transparent !border-0' : ''}`}
                            >
                                {f}
                            </Button>
                        ))}
                    </div>
                    <div className="w-full md:w-auto">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search assets..."
                            className="w-full md:w-64 p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 focus:ring-2 focus:ring-brand-primary focus:outline-none transition"
                        />
                    </div>
                </div>
            </Card>

            {filteredAssets.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {filteredAssets.map((asset, index) => (
                        <div key={asset.id} className="animate-fade-in opacity-0" style={{ animationDelay: `${index * 50}ms` }}>
                            <Card onClick={() => handleAssetClick(asset.name)} className="p-0 overflow-hidden group">
                                <div className="aspect-video bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500">
                                    {asset.url ? (
                                        <img src={asset.url} alt={asset.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                    ) : (
                                        <div className="p-8">{getAssetIcon(asset.type as any)}</div>
                                    )}
                                </div>
                                <div className="p-4">
                                    <p className="font-semibold text-brand-text dark:text-slate-200 truncate">{asset.name}</p>
                                    <div className="flex justify-between items-center text-xs text-brand-subtle dark:text-slate-400 mt-1">
                                        <span>{asset.size}</span>
                                        <span>{asset.date}</span>
                                    </div>
                                </div>
                            </Card>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-20">
                    <Icon name="folder" className="w-16 h-16 mx-auto text-slate-400 mb-4" />
                    <h3 className="text-xl font-semibold text-brand-text dark:text-slate-200">No Assets Found</h3>
                    <p className="text-brand-subtle dark:text-slate-400">Your search for "{searchQuery}" did not return any results.</p>
                </div>
            )}
        </div>
    );
};

export default AssetLibrary;
