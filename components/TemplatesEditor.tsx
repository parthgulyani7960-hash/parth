import React, { useState, useMemo, useRef } from 'react';
import { HistoryItem } from '../types';
import Card from './common/Card';
import Icon, { InfoTooltip } from './common/Icon';
import Button from './common/Button';
import Spinner from './common/Spinner';
import Modal from './common/Modal';
import { generateTemplate, generateBrandKit } from '../services/geminiService';
import { useToast } from '../hooks/useToast';
import Toggle from './common/Toggle';

type TemplateCategory = 'All' | 'Social Media' | 'YouTube' | 'Poster' | 'Logo' | 'Thumbnail';
type Tab = 'browse' | 'generate' | 'brand';

interface Template {
  id: number;
  name: string;
  category: TemplateCategory;
  imageUrl: string;
}

interface TemplatesEditorProps {
  addHistoryItem: (featureName: string, action: string, icon: HistoryItem['icon']) => void;
}

// Self-contained placeholder SVG images for templates
const placeholderImages = {
  social: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 400' width='400' height='400'%3E%3Crect width='400' height='400' fill='%23f0f9ff'/%3E%3Crect x='40' y='40' width='320' height='200' fill='%23bae6fd'/%3E%3Crect x='40' y='260' width='320' height='20' fill='%23e0f2fe'/%3E%3Crect x='40' y='290' width='240' height='20' fill='%23e0f2fe'/%3E%3Ccircle cx='70' cy='350' r='20' fill='%23e0f2fe' /%3E%3Crect x='100' y='340' width='100' height='20' fill='%23e0f2fe'/%3E%3C/svg%3E",
  youtube: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1280 720'%3E%3Crect width='1280' height='720' fill='%23fee2e2'/%3E%3Crect x='60' y='60' width='600' height='600' fill='%23fecaca'/%3E%3Crect x='720' y='120' width='500' height='80' fill='%23fecaca'/%3E%3Crect x='720' y='240' width='400' height='60' fill='%23fecaca'/%3E%3Crect x='720' y='340' width='450' height='60' fill='%23fecaca'/%3E%3C/svg%3E",
  poster: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 600'%3E%3Crect width='400' height='600' fill='%23f3e8ff'/%3E%3Ccircle cx='200' cy='200' r='120' fill='%23e9d5ff'/%3E%3Ctext x='50%25' y='50%25' font-size='48' text-anchor='middle' fill='%23a855f7' font-weight='bold' font-family='Poppins'%3EEVENT%3C/text%3E%3Crect x='80' y='450' width='240' height='40' fill='%23e9d5ff'/%3E%3C/svg%3E",
  logo: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'%3E%3Crect width='200' height='200' fill='%23f0fdf4'/%3E%3Ccircle cx='100' cy='100' r='60' fill='%23bbf7d0'/%3E%3Cpath d='M 100,40 L 134.6,85 100,130 65.4,85 Z' fill='%2322c55e'/%3E%3C/svg%3E",
  thumbnail: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1280 720'%3E%3Crect width='1280' height='720' fill='%23e0e7ff'/%3E%3Crect x='40' y='40' width='1200' height='400' fill='%23c7d2fe'/%3E%3Ccircle cx='640' cy='560' r='80' fill='%23a5b4fc'/%3E%3Crect x='240' y='480' width='800' height='80' fill='%23a5b4fc'/%3E%3Ctext x='50%25' y='30%25' font-size='96' text-anchor='middle' fill='%234338ca' font-weight='bold' font-family='Poppins'%3ECLICKBAIT TITLE%3C/text%3E%3C/svg%3E"
};


const mockTemplates: Template[] = [
  { id: 1, name: 'Modern Instagram Post', category: 'Social Media', imageUrl: placeholderImages.social },
  { id: 2, name: 'Gaming YouTube Thumbnail', category: 'YouTube', imageUrl: placeholderImages.youtube },
  { id: 3, name: 'Minimalist Event Poster', category: 'Poster', imageUrl: placeholderImages.poster },
  { id: 4, name: 'Geometric Business Logo', category: 'Logo', imageUrl: placeholderImages.logo },
  { id: 5, name: 'Product Promo Story', category: 'Social Media', imageUrl: placeholderImages.social },
  { id: 6, name: 'Travel Vlog Thumbnail', category: 'Thumbnail', imageUrl: placeholderImages.thumbnail },
  { id: 7, name: 'Corporate Announcement', category: 'Social Media', imageUrl: placeholderImages.social },
  { id: 8, name: 'Abstract Logo Mark', category: 'Logo', imageUrl: placeholderImages.logo },
  { id: 9, name: 'Music Festival Poster', category: 'Poster', imageUrl: placeholderImages.poster },
  { id: 10, name: 'Tech Review Thumbnail', category: 'Thumbnail', imageUrl: placeholderImages.thumbnail },
  { id: 11, name: 'Quote of the Day Post', category: 'Social Media', imageUrl: placeholderImages.social },
  { id: 12, name: 'Fashion Brand Logo', category: 'Logo', imageUrl: placeholderImages.logo },
];

const categories: TemplateCategory[] = ['All', 'Social Media', 'YouTube', 'Thumbnail', 'Poster', 'Logo'];
const generatorCategories: Exclude<TemplateCategory, 'All'>[] = ['Social Media', 'YouTube', 'Thumbnail', 'Poster', 'Logo'];

interface BrandKit {
    logos: { primary: string, secondary: string };
    colors: string[];
    fonts: { heading: string, body: string };
}

const TemplatesEditor: React.FC<TemplatesEditorProps> = ({ addHistoryItem }) => {
  const [activeTab, setActiveTab] = useState<Tab>('generate');
  
  // Browser state
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategory>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isRemixModalOpen, setIsRemixModalOpen] = useState(false);
  const [remixPrompt, setRemixPrompt] = useState('');
  const [remixingTemplate, setRemixingTemplate] = useState<Template | null>(null);
  const [isGeneratedRemixModalOpen, setIsGeneratedRemixModalOpen] = useState(false);

  // Generator state
  const [genPrompt, setGenPrompt] = useState('A vibrant blue and yellow YouTube thumbnail for "Summer Party Mix"');
  const [genType, setGenType] = useState<Exclude<TemplateCategory, 'All'>>('Thumbnail');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedTemplates, setGeneratedTemplates] = useState<string[]>([]);
  const [isInteractive, setIsInteractive] = useState(false);
  
  // Brand Kit State
  const [companyName, setCompanyName] = useState('Aura Coffee');
  const [companyDesc, setCompanyDesc] = useState('A specialty coffee shop focused on high-quality, ethically sourced beans and a cozy atmosphere.');
  const [isGeneratingBrandKit, setIsGeneratingBrandKit] = useState(false);
  const [brandKit, setBrandKit] = useState<BrandKit | null>(null);

  const [validationErrors, setValidationErrors] = useState<{ [key: string]: string }>({});
  const addToast = useToast();
  const downloadCanvasRef = useRef<HTMLCanvasElement>(null);

  
  const handleGenerate = async () => {
    if (!genPrompt.trim()) {
      setValidationErrors({ genPrompt: 'Please enter a description for your template.' });
      return;
    }
    setIsGenerating(true);
    setValidationErrors({});
    try {
      const result = await generateTemplate(genPrompt, genType, isInteractive);
      setGeneratedTemplates(prev => [result, ...prev]);
      addHistoryItem('Template Studio', `Generated a ${genType} template`, 'template');
    } catch (error) {
      console.error("Template generation failed:", error);
    } finally {
      setIsGenerating(false);
    }
  };
  
  const handleGenerateBrandKit = async () => {
      const newErrors: { [key: string]: string } = {};
      if (!companyName.trim()) newErrors.companyName = "Company name is required.";
      if (!companyDesc.trim()) newErrors.companyDesc = "Company description is required.";

      setValidationErrors(newErrors);
      if (Object.keys(newErrors).length > 0) return;

      setIsGeneratingBrandKit(true);
      setBrandKit(null);
      try {
          const result = await generateBrandKit(companyName, companyDesc);
          setBrandKit(result);
          addHistoryItem('Template Studio', 'Generated a brand kit', 'template');
      } catch (err) {
          console.error("Brand kit generation failed:", err);
      } finally {
          setIsGeneratingBrandKit(false);
      }
  };

  const openRemixModal = (template: Template) => {
    setRemixingTemplate(template);
    setRemixPrompt(`Make this for a tech startup launch`);
    setIsRemixModalOpen(true);
  };
  
  const handleRemix = async () => {
    if (!remixPrompt || !remixingTemplate) return;
    addToast(`Remixing "${remixingTemplate.name}"...`, 'info');
    setIsRemixModalOpen(false);
    setRemixingTemplate(null);
    addHistoryItem('Template Studio', 'Remixed a template with AI', 'template');
  };

  const openGeneratedRemixModal = (base64: string) => {
    setRemixingTemplate({ id: 0, name: 'AI Generated Template', category: 'All', imageUrl: base64}); // Use template structure for context
    setRemixPrompt('Change the main color to red and the text to "New Release"');
    setIsGeneratedRemixModalOpen(true);
  };

  const handleRemixGenerated = async () => {
      if (!remixPrompt) return;
      setIsGeneratedRemixModalOpen(false);
      addToast('Remixing generated template...', 'info');
      
      setIsGenerating(true);
      try {
        const result = await generateTemplate(remixPrompt, genType, isInteractive);
        setGeneratedTemplates(prev => [result, ...prev]);
        addHistoryItem('Template Studio', `Remixed a generated template`, 'template');
      } catch (error) {
        console.error("Template remix failed:", error);
      } finally {
        setIsGenerating(false);
      }
  }

  const handleDownloadTemplate = (base64Image: string) => {
    const img = new Image();
    img.src = `data:image/jpeg;base64,${base64Image}`;
    img.onload = () => {
        const canvas = downloadCanvasRef.current;
        if (!canvas) return;
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0);
        const link = document.createElement('a');
        link.download = 'generated-template.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
    };
  };

  const filteredTemplates = useMemo(() => {
    let templates = mockTemplates;

    if (selectedCategory !== 'All') {
      templates = templates.filter(t => t.category === selectedCategory);
    }
    
    if (searchQuery) {
        templates = templates.filter(t => 
            t.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }
    return templates;
  }, [selectedCategory, searchQuery]);

  const handleTemplateClick = (templateName: string) => {
    addToast(`Opening "${templateName}" in editor...`, 'info');
  };

  const renderBrowser = () => (
     <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-1">
          <Card>
            <h3 className="text-lg font-semibold text-brand-text dark:text-slate-200 mb-4 border-b dark:border-slate-700 pb-2">Categories</h3>
            <ul className="space-y-2">
              {categories.map(category => (
                <li key={category}>
                  <button
                    onClick={() => setSelectedCategory(category)}
                    className={`w-full text-left px-4 py-2 rounded-lg transition-colors text-md ${selectedCategory === category ? 'bg-brand-primary/10 text-brand-primary font-semibold' : 'text-brand-subtle dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                  >
                    {category}
                  </button>
                </li>
              ))}
            </ul>
          </Card>
        </div>
        <div className="lg:col-span-3">
            <div className="mb-6">
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search templates..."
                    className="w-full p-3 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-brand-primary focus:outline-none transition bg-white/60 dark:bg-slate-800/60 dark:text-slate-100 shadow-interactive"
                />
            </div>
          {filteredTemplates.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredTemplates.map((template, index) => (
                <div key={template.id} className="animate-fade-in opacity-0" style={{ animationDelay: `${index * 50}ms` }}>
                  <Card onClick={() => handleTemplateClick(template.name)} className="p-0 overflow-hidden group">
                    <div className="aspect-[4/5] bg-slate-100 dark:bg-slate-700 relative">
                      <img src={template.imageUrl} alt={template.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                       <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="icon" className="!bg-black/40 text-white" onClick={(e) => { e.stopPropagation(); openRemixModal(template); }}>
                                <Icon name="sparkles" />
                            </Button>
                        </div>
                    </div>
                    <div className="p-4">
                      <p className="font-semibold text-brand-text dark:text-slate-200 truncate">{template.name}</p>
                    </div>
                  </Card>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center text-brand-subtle dark:text-slate-400 bg-white/50 dark:bg-slate-800/50 rounded-lg p-8">
              <Icon name="template" className="w-16 h-16 mb-4 text-slate-400" />
              <p className="text-xl font-semibold dark:text-slate-300">No Templates Found</p>
              <p>{searchQuery ? `Your search for "${searchQuery}" did not return any results.` : `There are no templates available in the "${selectedCategory}" category.`}</p>
            </div>
          )}
        </div>
      </div>
  );

  const renderGenerator = () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1">
            <Card className="h-full">
                <div className="space-y-6">
                    <div>
                        <h3 className="text-lg font-semibold text-brand-text dark:text-slate-200 mb-3">Template Type</h3>
                        <div className="grid grid-cols-2 gap-2">
                            {generatorCategories.map(cat => (
                                <Button key={cat} variant={genType === cat ? 'primary' : 'secondary'} onClick={() => setGenType(cat)}>{cat}</Button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <label className="block text-lg font-semibold text-brand-text dark:text-slate-200 mb-3">
                            Describe your template
                             <InfoTooltip className="ml-2">
                                Be descriptive! Include a theme, colors, and the exact text you want in quotes (e.g., for "My Awesome Blog") for the best results.
                            </InfoTooltip>
                        </label>
                        <textarea
                            value={genPrompt}
                            onChange={(e) => {
                              setGenPrompt(e.target.value);
                              if (validationErrors.genPrompt) setValidationErrors({});
                            }}
                            placeholder="e.g., A vibrant and energetic YouTube thumbnail for a gaming channel"
                            rows={5}
                            className={`w-full p-3 border rounded-lg focus:ring-2 focus:outline-none transition dark:text-slate-100 dark:bg-slate-700 ${validationErrors.genPrompt ? 'border-red-500 ring-red-200' : 'border-slate-300 dark:border-slate-600 focus:ring-brand-primary'}`}
                        />
                        {validationErrors.genPrompt && <p className="text-red-500 text-sm mt-1">{validationErrors.genPrompt}</p>}
                    </div>
                    <div>
                      <Toggle
                        label="Interactive Template"
                        enabled={isInteractive}
                        onChange={setIsInteractive}
                      />
                    </div>
                    <Button onClick={handleGenerate} isLoading={isGenerating} disabled={isGenerating} icon="sparkles" className="w-full !py-4 text-lg">
                        Generate Template
                    </Button>
                </div>
            </Card>
        </div>
        <div className="md:col-span-2">
            <Card className="h-full">
                <h3 className="text-lg font-semibold text-brand-text dark:text-slate-200 mb-3">AI Output Gallery</h3>
                <div className="min-h-[40vh] bg-slate-100 dark:bg-slate-800/50 rounded-lg flex items-center justify-center p-4">
                    {isGenerating && generatedTemplates.length === 0 ? (
                        <div className="text-center">
                            <Spinner />
                            <p className="mt-2 text-brand-subtle dark:text-slate-400">AI is creating...</p>
                        </div>
                    ) : generatedTemplates.length > 0 ? (
                        <div className="grid grid-cols-2 gap-4 w-full">
                            {isGenerating && <div className="aspect-square bg-slate-200 dark:bg-slate-700 rounded-lg flex items-center justify-center"><Spinner/></div>}
                            {generatedTemplates.map((template, index) => (
                               <div key={index} className="group relative aspect-square">
                                    <img src={`data:image/jpeg;base64,${template}`} alt={`Generated template ${index + 1}`} className="w-full h-full object-contain rounded-lg bg-white dark:bg-slate-700" />
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                        <Button variant="secondary" icon="sparkles" onClick={() => openGeneratedRemixModal(template)}>Remix</Button>
                                        <Button variant="secondary" icon="download" onClick={() => handleDownloadTemplate(template)}>PNG</Button>
                                    </div>
                               </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-center text-brand-subtle dark:text-slate-400">
                            <Icon name="template" className="w-16 h-16 mb-4 text-slate-400" />
                            <p className="text-xl font-semibold text-brand-text dark:text-slate-200">Your creations will appear here</p>
                            <p>Describe your template to get started.</p>
                        </div>
                    )}
                </div>
            </Card>
        </div>
    </div>
  );
  
  const renderBrandKit = () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1">
            <Card className="h-full">
                <div className="space-y-6">
                    <div>
                        <h3 className="text-lg font-semibold text-brand-text dark:text-slate-200 mb-3">AI Brand Kit Generator</h3>
                        <p className="text-sm text-brand-subtle dark:text-slate-400 mb-4">Provide your company details and the AI will generate a complete brand identity for you.</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-brand-text dark:text-slate-300 mb-1">Company Name</label>
                        <input
                            type="text"
                            value={companyName}
                            onChange={(e) => {
                                setCompanyName(e.target.value);
                                if (validationErrors.companyName) setValidationErrors({});
                            }}
                            className={`w-full p-2 border rounded-lg dark:bg-slate-800 ${validationErrors.companyName ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'}`}
                        />
                         {validationErrors.companyName && <p className="text-red-500 text-xs mt-1">{validationErrors.companyName}</p>}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-brand-text dark:text-slate-300 mb-1">Company Description</label>
                         <textarea
                            value={companyDesc}
                            onChange={(e) => {
                                setCompanyDesc(e.target.value);
                                if (validationErrors.companyDesc) setValidationErrors({});
                            }}
                            rows={4}
                            className={`w-full p-2 border rounded-lg dark:bg-slate-800 ${validationErrors.companyDesc ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'}`}
                        />
                         {validationErrors.companyDesc && <p className="text-red-500 text-xs mt-1">{validationErrors.companyDesc}</p>}
                    </div>
                    <Button onClick={handleGenerateBrandKit} isLoading={isGeneratingBrandKit} disabled={isGeneratingBrandKit} icon="sparkles" className="w-full !py-4 text-lg">
                        Generate Brand Kit
                    </Button>
                </div>
            </Card>
        </div>
         <div className="md:col-span-2">
            <Card className="h-full">
                <h3 className="text-lg font-semibold text-brand-text dark:text-slate-200 mb-3">Your Brand Kit</h3>
                 <div className="min-h-[40vh] bg-slate-100 dark:bg-slate-800/50 rounded-lg flex items-center justify-center p-4">
                    {isGeneratingBrandKit ? (
                        <div className="text-center">
                            <Spinner />
                            <p className="mt-2 text-brand-subtle dark:text-slate-400">Generating brand identity...</p>
                        </div>
                    ) : brandKit ? (
                        <div className="w-full space-y-6 animate-fade-in">
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <h4 className="font-semibold dark:text-slate-300">Logos</h4>
                                    <Button variant="secondary" onClick={handleGenerateBrandKit} className="!text-xs !py-1">Regenerate</Button>
                                </div>
                                <div className="flex gap-4 items-center">
                                    <img src={`data:image/png;base64,${brandKit.logos.primary}`} alt="Primary Logo" className="bg-white rounded-lg p-2 shadow-md w-24 h-24 object-contain"/>
                                    <img src={`data:image/png;base64,${brandKit.logos.secondary}`} alt="Secondary Logo" className="bg-white rounded-full w-20 h-20 p-2 shadow-md object-contain"/>
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <h4 className="font-semibold dark:text-slate-300">Color Palette</h4>
                                    <Button variant="secondary" onClick={handleGenerateBrandKit} className="!text-xs !py-1">Regenerate</Button>
                                </div>
                                <div className="flex gap-2">
                                    {brandKit.colors.map((color, i) => (
                                        <div key={i} className="w-12 h-12 rounded-full border-2 border-white dark:border-slate-600" style={{ backgroundColor: color }} />
                                    ))}
                                </div>
                            </div>
                             <div>
                                <h4 className="font-semibold dark:text-slate-300 mb-2">Fonts</h4>
                                <p><span className="font-semibold" style={{fontFamily: brandKit.fonts.heading}}>Heading: {brandKit.fonts.heading}</span></p>
                                <p><span style={{fontFamily: brandKit.fonts.body}}>Body: {brandKit.fonts.body}</span></p>
                            </div>
                        </div>
                    ) : (
                        <p className="text-brand-subtle dark:text-slate-400">Your brand kit will appear here.</p>
                    )}
                 </div>
            </Card>
        </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto">
      {/* Hidden canvas for PNG downloads */}
      <canvas ref={downloadCanvasRef} className="hidden"></canvas>

      <h2 className="text-4xl font-bold text-center mb-2 dark:text-slate-100">AI Template Studio</h2>
      <p className="text-center text-lg text-brand-subtle dark:text-slate-400 mb-8">Browse pre-made templates or generate new ones with AI.</p>
      
      <div className="mb-6 border-b border-slate-200 dark:border-slate-700">
        <nav className="flex justify-center -mb-px gap-6">
            <button onClick={() => setActiveTab('browse')} className={`py-4 px-1 border-b-2 font-medium text-lg ${activeTab === 'browse' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-brand-subtle dark:text-slate-400 hover:text-brand-text dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600'}`}>Browse Templates</button>
            <button onClick={() => setActiveTab('generate')} className={`py-4 px-1 border-b-2 font-medium text-lg ${activeTab === 'generate' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-brand-subtle dark:text-slate-400 hover:text-brand-text dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600'}`}>AI Generator</button>
            <button onClick={() => setActiveTab('brand')} className={`py-4 px-1 border-b-2 font-medium text-lg ${activeTab === 'brand' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-brand-subtle dark:text-slate-400 hover:text-brand-text dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600'}`}>AI Brand Kit</button>
        </nav>
      </div>

      <div className="animate-fade-in">
        {activeTab === 'browse' && renderBrowser()}
        {activeTab === 'generate' && renderGenerator()}
        {activeTab === 'brand' && renderBrandKit()}
      </div>

      <Modal isOpen={isRemixModalOpen} onClose={() => setIsRemixModalOpen(false)} title={`Remix "${remixingTemplate?.name}"`}>
        <div className="space-y-4">
            <p className="text-brand-subtle dark:text-slate-400">Describe how you want to change this template.</p>
            <textarea
                value={remixPrompt}
                onChange={e => setRemixPrompt(e.target.value)}
                rows={3}
                className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-brand-primary"
            />
            <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setIsRemixModalOpen(false)}>Cancel</Button>
                <Button variant="primary" onClick={handleRemix}>Remix with AI</Button>
            </div>
        </div>
      </Modal>

      <Modal isOpen={isGeneratedRemixModalOpen} onClose={() => setIsGeneratedRemixModalOpen(false)} title="Remix Generated Template">
        <div className="space-y-4">
            <p className="text-brand-subtle dark:text-slate-400">Describe how you want to change this template.</p>
            <textarea
                value={remixPrompt}
                onChange={e => setRemixPrompt(e.target.value)}
                rows={3}
                className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-brand-primary"
            />
            <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setIsGeneratedRemixModalOpen(false)}>Cancel</Button>
                <Button variant="primary" onClick={handleRemixGenerated}>Remix with AI</Button>
            </div>
        </div>
      </Modal>

    </div>
  );
};

export default TemplatesEditor;