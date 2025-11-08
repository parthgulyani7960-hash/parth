import { encode } from "../utils/audio";

// This file simulates a powerful, context-aware AI backend.
// It uses the session context to make "intelligent" decisions about its output.

// --- PSEUDO-RANDOM HELPERS (for deterministic mocks based on prompt) ---
function hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0; // Convert to 32bit integer
    }
    return Math.abs(hash);
}

function sfc32(a: number, b: number, c: number, d: number) {
    return function() {
      a |= 0; b |= 0; c |= 0; d |= 0;
      let t = (a + b) | 0;
      a = b ^ (b >>> 9);
      b = c + (c << 3) | 0;
      c = (c << 21 | c >>> 11);
      d = (d + 1) | 0;
      t = (t + d) | 0;
      c = (c + t) | 0;
      return (t >>> 0) / 4294967296;
    }
}

// Helper to extract keywords from a string for context
const extractKeywords = (text: string): string[] => {
    const commonWords = new Set(['a', 'an', 'the', 'in', 'on', 'of', 'with', 'style', 'of', 'no']);
    return text.toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .split(/\s+/)
        .filter(word => word.length > 3 && !commonWords.has(word));
};


// Helper to create mock raw PCM audio data (sine wave) and encode it in base64
const createMockPcmAudio = (frequency: number = 440, duration: number = 1.5): string => {
    const sampleRate = 24000; // The API outputs at 24kHz
    const numSamples = sampleRate * duration;
    const samples = new Int16Array(numSamples);
    for (let i = 0; i < numSamples; i++) {
        const sampleValue = Math.sin(2 * Math.PI * frequency * (i / sampleRate)) * 32767;
        const fadeOutThreshold = numSamples * 0.8;
        if (i > fadeOutThreshold) {
            const fadeFactor = 1 - ((i - fadeOutThreshold) / (numSamples - fadeOutThreshold));
            samples[i] = sampleValue * fadeFactor;
        } else {
            samples[i] = sampleValue;
        }
    }
    const bytes = new Uint8Array(samples.buffer);
    return encode(bytes); // Use the existing utility to base64 encode
};

// --- MOCK API ---

const createMockImage = (prompt: string, aspectRatio: '1:1' | '16:9' | '9:16' = '1:1') => {
    const width = aspectRatio === '16:9' ? 1024 : aspectRatio === '9:16' ? 576 : 1024;
    const height = aspectRatio === '16:9' ? 576 : aspectRatio === '9:16' ? 1024 : 1024;
    
    const seed = hashCode(prompt);
    const rand = sfc32(seed, seed * 2, seed * 3, seed * 4);

    const randomColor = (saturation = 70, lightness = 50) => `hsl(${Math.floor(rand() * 360)}, ${Math.floor(rand() * 20) + saturation}%, ${Math.floor(rand() * 20) + lightness}%)`;
    const c1 = randomColor();
    const c2 = randomColor();
    const c3 = randomColor(80, 60);
    const c4 = randomColor();
    const angle = Math.floor(rand() * 360);

    let shapes = '';
    const numShapes = Math.floor(rand() * 25) + 15; // 15 to 40 shapes

    for (let i = 0; i < numShapes; i++) {
        const shapeType = rand();
        const opacity = rand() * 0.7 + 0.2;
        const x = rand() * width;
        const y = rand() * height;

        if (shapeType < 0.3) { // Circle
            shapes += `<circle cx="${x}" cy="${y}" r="${rand() * (width / 10) + 10}" fill="${c3}" opacity="${opacity}" filter="url(#blur${rand() > 0.5 ? 1 : 2})" />`;
        } else if (shapeType < 0.6) { // Rectangle
            shapes += `<rect x="${x}" y="${y}" width="${rand() * (width/5) + 20}" height="${rand() * (height/5) + 20}" fill="${c4}" opacity="${opacity}" transform="rotate(${rand() * 360} ${x} ${y})" />`;
        } else if (shapeType < 0.8) { // Polygon
             const points = Array.from({length: Math.floor(rand()*5)+3}, () => `${rand()*width},${rand()*height}`).join(' ');
             shapes += `<polygon points="${points}" fill="${c3}" opacity="${opacity*0.6}" filter="url(#blur1)" />`;
        } else { // Wavy Path
            shapes += `<path d="M ${x} ${y} q ${rand()*300-150} ${rand()*300-150} ${rand()*300} ${rand()*300} T ${rand()*width} ${rand()*height}" stroke="${c4}" stroke-width="${rand()*8 + 2}" fill="none" opacity="${opacity}" />`;
        }
    }
    
    const keywords = extractKeywords(prompt);
    const textSnippet = keywords.length > 0 ? keywords[0] : '';

    const svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%" gradientTransform="rotate(${angle})">
                <stop offset="0%" style="stop-color:${c1};" />
                <stop offset="100%" style="stop-color:${c2};" />
            </linearGradient>
            <filter id="noise">
                <feTurbulence type="fractalNoise" baseFrequency="${rand() * 0.4 + 0.2}" numOctaves="4" stitchTiles="stitch"/>
                <feComposite operator="in" in2="SourceGraphic" result="map"/>
                <feDisplacementMap in="SourceGraphic" in2="map" scale="${rand() * 50 + 10}"/>
            </filter>
            <filter id="blur1">
                <feGaussianBlur stdDeviation="${rand()*3 + 1}"/>
            </filter>
             <filter id="blur2">
                <feGaussianBlur stdDeviation="${rand()*8 + 4}"/>
            </filter>
        </defs>
        <rect width="${width}" height="${height}" fill="url(#grad)" />
        <rect width="${width}" height="${height}" fill="url(#grad)" filter="url(#noise)" opacity="0.4" />
        ${shapes}
        ${textSnippet && `<text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="Inter" font-size="40" fill="white" style="text-shadow: 2px 2px 8px rgba(0,0,0,0.8); mix-blend-mode: overlay; letter-spacing: 2px;" text-transform="capitalize" opacity="0.6">${textSnippet}</text>`}
    </svg>`;
    return btoa(svg);
};

const generateMockVideoUrl = (prompt: string) => {
  const width = 640;
  const height = 360;
  const seed = hashCode(prompt);
  const rand = sfc32(seed, seed * 2, seed * 3, seed * 4);

  const c1 = `hsl(${rand() * 360}, 100%, 50%)`;
  const c2 = `hsl(${rand() * 360}, 100%, 50%)`;

  let shapes = '';
  for (let i = 0; i < 10; i++) {
    const dur = rand() * 6 + 4;
    const size = rand() * 30 + 10;
    shapes += `<rect x="${rand() * width}" y="${rand() * height}" width="${size}" height="${size}" fill="rgba(255,255,255,0.7)">
      <animateTransform attributeName="transform" type="rotate" from="0 ${width/2} ${height/2}" to="360 ${width/2} ${height/2}" dur="${dur}s" repeatCount="indefinite" />
      <animate attributeName="x" values="${rand() * width};${rand() * width};${rand() * width}" dur="${dur*2}s" repeatCount="indefinite" />
      <animate attributeName="y" values="${rand() * height};${rand() * height};${rand() * height}" dur="${dur*2}s" repeatCount="indefinite" />
    </rect>`;
  }

  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${c1}">
             <animate attributeName="stop-color" values="${c1};${c2};${c1}" dur="8s" repeatCount="indefinite" />
          </stop>
          <stop offset="100%" stop-color="${c2}">
             <animate attributeName="stop-color" values="${c2};${c1};${c2}" dur="8s" repeatCount="indefinite" />
          </stop>
        </linearGradient>
      </defs>
      <rect width="${width}" height="${height}" fill="url(#bg-grad)" />
      ${shapes}
      <text x="50%" y="50%" font-family="Inter, sans-serif" font-size="24" fill="white" text-anchor="middle" dominant-baseline="middle" style="text-shadow: 1px 1px 2px black;">${prompt.substring(0, 40)}</text>
    </svg>`;
  
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

// SIMULATED API CALLS (with delay)
export const analyzeImage = async (base64: string, mimeType: string, prompt: string): Promise<string> => {
    console.log('API CALL: analyzeImage', { mimeType, prompt, base64: base64.substring(0, 30) + '...' });
    await new Promise(res => setTimeout(res, 60));
    return `Analysis for prompt "${prompt}":\nThis appears to be a mock SVG image. The dominant color is a shade of purple. The composition is centered. The style is minimalist and geometric. It contains the text "Mock Image".`;
}

export const generateImages = async (prompt: string, count: number, aspectRatio: '1:1' | '16:9' | '9:16', options: { color?: string, dominance?: number, imagePrompt?: {base64: string, influence: number} } = {}): Promise<string[]> => {
    console.log('API CALL: generateImages', { prompt, count, aspectRatio, options });
    await new Promise(res => setTimeout(res, 125));
    return Array.from({ length: count }, (_, i) => createMockImage(prompt + i, aspectRatio));
};

export const enhancePrompt = async (prompt: string): Promise<string> => {
    console.log('API CALL: enhancePrompt', { prompt });
    await new Promise(res => setTimeout(res, 50));
    const enhancements = [
        'hyperrealistic, 8k resolution, trending on artstation',
        'soft, volumetric lighting, epic scale',
        'a masterpiece of digital art, highly detailed',
        'in the style of a cinematic film still',
    ];
    return `${prompt}, ${enhancements[Math.floor(Math.random() * enhancements.length)]}`;
};

export const upscaleImage = async (base64Image: string, scale: number): Promise<string> => {
  console.log('API CALL: upscaleImage', { scale });
  await new Promise(res => setTimeout(res, 100));
  try {
    const svgText = atob(base64Image);
    const cleanedSvg = svgText.replace(/<text class="upscale-label".*?<\/text>/g, '');
    const newSvgText = cleanedSvg.replace('</svg>', `<text x="10" y="30" class="upscale-label" font-family="Inter" font-size="24" fill="rgba(0,0,0,0.5)" font-weight="bold">Upscaled ${scale}x</text></svg>`);
    return btoa(newSvgText);
  } catch (e) {
    console.warn("Upscale mock works best with SVGs. Returning original image.");
    return base64Image;
  }
};

export const outpaintImage = async (base64Image: string, direction: 'up' | 'down' | 'left' | 'right'): Promise<string> => {
    console.log('API CALL: outpaintImage', { direction });
    await new Promise(res => setTimeout(res, 100));
    return createMockImage('outpainted image', '1:1');
};

export const removeImageBackground = async (base64: string, mimeType: string): Promise<string> => {
    console.log('API CALL: removeImageBackground', { mimeType });
    await new Promise(res => setTimeout(res, 75));
    const svg = `<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <pattern id="checkerboard" width="40" height="40" patternUnits="userSpaceOnUse">
                <rect width="20" height="20" fill="#e5e7eb"></rect>
                <rect x="20" y="20" width="20" height="20" fill="#e5e7eb"></rect>
                <rect x="20" width="20" height="20" fill="#f3f4f6"></rect>
                <rect y="20" width="20" height="20" fill="#f3f4f6"></rect>
            </pattern>
        </defs>
        <rect width="512" height="512" fill="url(#checkerboard)" />
        <image href="data:${mimeType};base64,${base64}" x="0" y="0" width="512" height="512" style="filter: drop-shadow(2px 4px 6px rgba(0,0,0,0.3));" />
    </svg>`;
    return btoa(svg);
}

export const magicEraser = async (base64Image: string, mimeType: string, maskBase64: string): Promise<string> => {
    console.log('API CALL: magicEraser');
    await new Promise(res => setTimeout(res, 100));
    return createMockImage('magic eraser result', '1:1');
}

export const replaceSky = async (base64Image: string, mimeType: string, skyType: string): Promise<string> => {
    console.log('API CALL: replaceSky', { skyType });
    await new Promise(res => setTimeout(res, 110));
    
    const seed = hashCode(skyType);
    const rand = sfc32(seed, seed, seed, seed);

    const skyColors: Record<string, [string, string]> = {
        'Blue Sky': ['#87CEEB', '#ADD8E6'], 'Sunset': ['#FF7F50', '#FFA500'], 'Stormy': ['#708090', '#778899'],
        'Night Sky': ['#000030', '#191970'], 'Galaxy': ['#483D8B', '#8A2BE2'], 'Fantasy': ['#DA70D6', '#EE82EE'],
    };
    const [c1, c2] = skyColors[skyType] || skyColors['Blue Sky'];

    let skyElements = '';
    if (skyType === 'Night Sky' || skyType === 'Galaxy') {
        for(let i=0; i<150; i++) {
            skyElements += `<circle cx="${rand()*1024}" cy="${rand()*288}" r="${rand()*1.5}" fill="white" opacity="${rand()*0.8 + 0.2}" />`;
        }
    } else if (skyType === 'Blue Sky' || skyType === 'Sunset') {
         skyElements += `<circle cx="${rand()*800 + 100}" cy="${rand()*100 + 50}" r="${rand()*20 + 30}" fill="rgba(255,255,220,0.9)" />`;
    }

    const svg = `<svg width="1024" height="576" viewBox="0 0 1024 576" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="sky" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="${c1}" /><stop offset="100%" stop-color="${c2}" /></linearGradient>
          <linearGradient id="land" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#228B22" /><stop offset="100%" stop-color="#556B2F" /></linearGradient>
           <filter id="wispyClouds">
                <feTurbulence type="fractalNoise" baseFrequency="0.01 0.04" numOctaves="3" seed="${seed}" />
                <feColorMatrix values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 2 -0.3" />
            </filter>
        </defs>
        <rect width="1024" height="288" fill="url(#sky)" />
        <rect width="1024" height="288" fill="white" opacity="0.2" filter="url(#wispyClouds)" />
        ${skyElements}
        <rect y="288" width="1024" height="288" fill="url(#land)" />
        <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="Inter" font-size="40" fill="white" style="text-shadow: 2px 2px 4px rgba(0,0,0,0.4);">${skyType} Sky</text>
    </svg>`;
    return btoa(svg);
}

export const addObjectToImage = async (base64Image: string, mimeType: string, objectPrompt: string): Promise<string> => {
    console.log('API CALL: addObjectToImage', { objectPrompt });
    await new Promise(res => setTimeout(res, 120));
    return createMockImage(`with added: ${objectPrompt}`, '1:1');
}

export const applyStyleToImage = async (base64Image: string, mimeType: string, stylePrompt: string, styleImages?: {base64: string, influence: number}[]): Promise<string> => {
    console.log('API CALL: applyStyleToImage', { stylePrompt, styleImages: styleImages?.map(si => ({ ...si, base64: '...' })) });
    await new Promise(res => setTimeout(res, 130));
    
    const fallback = () => createMockImage(`styled as: ${stylePrompt}`, '1:1');

    try {
        const svgText = atob(base64Image);
        const seed = hashCode(stylePrompt);
        const rand = sfc32(seed, seed, seed, seed);
        const filterId = `ai-style-${seed}`;
        let filterPrimitives = '';
        
        if (stylePrompt.toLowerCase().includes('blur')) filterPrimitives += `<feGaussianBlur stdDeviation="${rand() * 4 + 1}" />`;
        if (stylePrompt.toLowerCase().includes('glow') || stylePrompt.toLowerCase().includes('neon')) filterPrimitives += `<feGaussianBlur stdDeviation="${rand() * 5 + 2}" result="coloredBlur" /><feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>`;
        if (stylePrompt.toLowerCase().includes('sharp') || stylePrompt.toLowerCase().includes('crisp')) filterPrimitives += `<feConvolveMatrix order="3" kernelMatrix="-1 -1 -1 -1 9 -1 -1 -1 -1" />`;
        if (stylePrompt.toLowerCase().includes('pixel') || stylePrompt.toLowerCase().includes('8-bit')) filterPrimitives += `<feConvolveMatrix order="3" kernelMatrix="1 2 1 2 4 2 1 2 1" divisor="16" />`;
        
        filterPrimitives += `<feTurbulence type="fractalNoise" baseFrequency="${rand() * 0.05}" numOctaves="3" result="turbulence"/><feDisplacementMap in="SourceGraphic" in2="turbulence" scale="${rand() * 20}" /><feColorMatrix type="saturate" values="${1 + (rand()-0.5)*0.8}"/>`;

        const filter = `<filter id="${filterId}">${filterPrimitives}</filter>`;
        const svgContentMatch = svgText.match(/<svg[^>]*>([\s\S]*)<\/svg>/);
        if (!svgContentMatch) return fallback();
        let svgContent = svgContentMatch[1];
        
        if (svgContent.includes('<defs>')) {
            svgContent = svgContent.replace('<defs>', `<defs>${filter}`);
        } else {
            svgContent = `<defs>${filter}</defs>${svgContent}`;
        }
        
        const newSvgContent = `<g filter="url(#${filterId})">${svgContent}</g>`;
        const newSvgText = svgText.replace(svgContentMatch[1], newSvgContent);

        return btoa(newSvgText);
    } catch (e) {
        return fallback();
    }
}

export const animatePhotoToVideo = async (base64Image: string): Promise<string> => {
    console.log('API CALL: animatePhotoToVideo');
    await new Promise(res => setTimeout(res, 180));
    return generateMockVideoUrl('Animated Photo');
};

export const generate3dBackground = async (base64Image: string, mimeType: string, prompt: string): Promise<string> => {
    console.log('API CALL: generate3dBackground', { prompt });
    await new Promise(res => setTimeout(res, 150));
    return createMockImage(`3d background: ${prompt}`, '16:9');
};


// --- VIDEO MOCKS ---
export const analyzeFrame = async (base64: string, mimeType: string, prompt: string): Promise<string> => {
    console.log('API CALL: analyzeFrame', { mimeType, prompt });
    await new Promise(res => setTimeout(res, 60));
    return `Frame analysis for prompt "${prompt}": This is a mock response describing a video frame. The scene appears to be computer-generated, with a dark background and the text "Mock Video" in the center. The mood is neutral.`;
};

export const enhanceVideoQuality = async (): Promise<void> => {
    console.log('API CALL: enhanceVideoQuality');
    await new Promise(res => setTimeout(res, 150));
};


export const generateVideo = async (prompt: string, aspectRatio: '16:9' | '9:16', audioSettings?: any, qualitySettings?: { resolution: string, bitrate: number }): Promise<string> => {
    console.log('API CALL: generateVideo', { prompt, aspectRatio, audioSettings, qualitySettings });
    await new Promise(res => setTimeout(res, 300));
    return generateMockVideoUrl(prompt);
};

export const generateAutoCut = async (duration: number, prompt: string): Promise<{ start: number, end: number }[]> => {
    console.log('API CALL: generateAutoCut', { duration, prompt });
    await new Promise(res => setTimeout(res, 100));
    const seed = hashCode(prompt);
    const rand = sfc32(seed, seed, seed, seed);
    const numClips = Math.floor(rand() * 4) + 3; // 3 to 6 clips
    const clips = [];
    for (let i = 0; i < numClips; i++) {
        const start = rand() * duration * 0.8;
        const end = start + (rand() * (duration / numClips)) + 2;
        if (end <= duration) {
            clips.push({ start: parseFloat(start.toFixed(2)), end: parseFloat(end.toFixed(2)) });
        }
    }
    return clips.sort((a,b) => a.start - b.start);
};

export const detectScenes = async (duration: number): Promise<number[]> => {
    console.log('API CALL: detectScenes', { duration });
    await new Promise(res => setTimeout(res, 75));
    const numScenes = Math.floor(Math.random() * 5) + 2;
    const markers = new Set<number>();
    while (markers.size < numScenes) {
        markers.add(parseFloat((Math.random() * duration).toFixed(2)));
    }
    return Array.from(markers).sort((a,b) => a - b);
}

export const suggestMusic = async (prompt: string): Promise<string[]> => {
    console.log('API CALL: suggestMusic', { prompt });
    await new Promise(res => setTimeout(res, 50));
    return ['Uplifting Corporate', 'Epic Cinematic Score', 'Lo-fi Beats', 'Acoustic Folk'];
};

export const generateSubtitles = async (duration: number): Promise<{ start: number, end: number, text: string }[]> => {
    console.log('API CALL: generateSubtitles', { duration });
    await new Promise(res => setTimeout(res, 110));
    
    const subs = [
        { start: 1, end: 3, text: "This is the first subtitle." },
        { start: 3.5, end: 6, text: "AI is generating these for you." },
        { start: 7, end: 10, text: "It's a mock, but it feels real!" },
        { start: 11, end: 14, text: "Enjoy your creative process." }
    ];

    return subs.filter(sub => sub.end <= duration);
};

export const stabilizeVideo = async (): Promise<void> => {
    console.log('API CALL: stabilizeVideo');
    await new Promise(res => setTimeout(res, 120));
};

export const applyVideoStyle = async (prompt: string): Promise<string> => {
    console.log('API CALL: applyVideoStyle', { prompt });
    await new Promise(res => setTimeout(res, 100));
    const styles: { [key: string]: string } = {
        "van gogh": "saturate(2) contrast(1.4) hue-rotate(15deg)",
        "anime": "saturate(1.5) contrast(1.2)",
        "vintage": "sepia(0.7) contrast(0.9)",
        "noir": "grayscale(1) contrast(1.5)",
    };
    const key = Object.keys(styles).find(k => prompt.toLowerCase().includes(k));
    return key ? styles[key] : 'brightness(1.1)';
};

export const applyCinematicMode = async (intensity: number, depthBlur: number): Promise<string> => {
    console.log('API CALL: applyCinematicMode', { intensity, depthBlur });
    await new Promise(res => setTimeout(res, 100));
    const contrast = 1 + (intensity / 100) * 0.2;
    const saturate = 1 + (intensity / 100) * 0.1;
    return `contrast(${contrast}) saturate(${saturate}) brightness(0.95)`;
};

export const generateActorInVideo = async (actorDescription: string, dialogue: string, voiceStyle: string, referenceImage?: string): Promise<string> => {
    console.log('API CALL: generateActorInVideo', { actorDescription, dialogue, voiceStyle, referenceImage: referenceImage ? '...' : undefined });
    await new Promise(res => setTimeout(res, 250));
    return generateMockVideoUrl('Video with new actor');
};

export const removeObjectFromVideo = async (objectPrompt: string): Promise<string> => {
    console.log('API CALL: removeObjectFromVideo', { objectPrompt });
    await new Promise(res => setTimeout(res, 200));
    return generateMockVideoUrl(`Video with "${objectPrompt}" removed`);
};

export const replaceObjectInVideo = async (removePrompt: string, addPrompt: string): Promise<string> => {
    console.log('API CALL: replaceObjectInVideo', { removePrompt, addPrompt });
    await new Promise(res => setTimeout(res, 210));
    return generateMockVideoUrl(`Video with "${removePrompt}" replaced by "${addPrompt}"`);
};

export const applySlowMotion = async (factor: number): Promise<string> => {
    console.log('API CALL: applySlowMotion', { factor });
    await new Promise(res => setTimeout(res, 180));
    return generateMockVideoUrl(`Video with ${factor.toFixed(2)}x slow motion`);
};

export const transferVideoStyle = async (stylePrompt: string): Promise<string> => {
    console.log('API CALL: transferVideoStyle', { stylePrompt });
    await new Promise(res => setTimeout(res, 220));
    return generateMockVideoUrl(`Video in the style of: ${stylePrompt}`);
};


// --- AUDIO MOCKS ---

const voiceFrequencies: { [key: string]: number } = {
    'Kore': 440, 'Zephyr': 330, 'Puck': 550, 'Charon': 220, 'Aria': 494,
    'Leo': 262, 'Nova': 523, 'Fenrir': 196, 'Luna': 659, 'Orion': 294,
};

export const generateSpeech = async (text: string, voice: string, emotion: string): Promise<string> => {
    console.log('API CALL: generateSpeech', { text, voice, emotion });
    await new Promise(res => setTimeout(res, 60));
    const frequency = voiceFrequencies[voice] || 440;
    return createMockPcmAudio(frequency, text.length > 50 ? 2 : 1);
};

export const generateText = async (mode: string, text: string, prompt: string, options: any, context?: any): Promise<string> => {
    console.log('API CALL: generateText', { mode, text, prompt, options, context });
    await new Promise(res => setTimeout(res, 75));
    const seed = hashCode(text + prompt);
    const rand = sfc32(seed, seed, seed, seed);

    let contextualPrompt = prompt;
    if (context?.lastAction?.prompt) {
        const keywords = extractKeywords(context.lastAction.prompt).join(', ');
        if (keywords) {
            contextualPrompt = `${prompt} (related to: ${keywords})`;
        }
    }
    
    const proofreadTemplates = [
        `This is a proofread version of your text, in a ${options.proofreadTone} tone. All grammar and spelling have been meticulously corrected by our mock AI.`,
        `I've reviewed your text. Here are my suggested changes for a more ${options.proofreadTone} tone:\n\n- (Suggestion 1)\n- (Suggestion 2)\n- (Suggestion 3)\n\nThis polished version should better serve your needs.`,
        `After proofreading, the text now has a distinctly ${options.proofreadTone} feel. I focused on improving clarity and correcting minor grammatical errors without altering the core message.`
    ];
    
    const summarizeTemplates = [
        `Here is a ${options.summaryLength} summary:\n\nThe key takeaway from the text is [Main Point A]. It also touches upon [Main Point B] and concludes with [Main Point C].`,
        `**${options.summaryLength.charAt(0).toUpperCase() + options.summaryLength.slice(1)} Summary:**\n* Main Idea: [Core Concept]\n* Supporting Detail: [Detail 1]\n* Supporting Detail: [Detail 2]`,
        `In short, the document argues that [Primary Thesis]. This is supported by evidence of [Evidence A] and an analysis of [Evidence B], making for a compelling case.`
    ];

    switch(mode) {
        case 'summarize':
            return summarizeTemplates[Math.floor(rand() * summarizeTemplates.length)];
        case 'proofread':
            return proofreadTemplates[Math.floor(rand() * proofreadTemplates.length)];
        case 'write':
            return `Based on your prompt "${contextualPrompt}", here is a generated blog post:\n\nThe future of AI in creative fields is incredibly bright. From generating stunning visuals to composing music, AI is poised to become an indispensable partner for artists, designers, and creators everywhere. It's not about replacement; it's about augmentation. This synergy allows for unprecedented creative exploration.`;
        case 'poem':
             return `A mock poem about "${contextualPrompt}":\n\nThe sun dips low, a painter's fire,\nAcross the canvas of the sea,\nGold and crimson, heart's desire,\nA fleeting masterpiece for me.`;
        case 'script':
             return `[SCENE START]\n\nEXT. ANCIENT RUINS - DAY\n\nBased on your idea: "${contextualPrompt}"\n\nA lone adventurer, Kael, crests a dune. Before him, the sprawling ruins of a forgotten city shimmer in the heat haze. The wind whispers forgotten secrets.\n\nKAEL\n(to himself)\nSo, the legends were true...\n\nHe draws a weathered map, its edges frayed. A giant stone bird suddenly casts a shadow over him. He looks up, startled.\n\n[SCENE END]`;
        case 'transform':
            if (options.transformFormat === 'tweet') return `1/3 🧵 Transformed your text into a tweet thread!\n\nKey insight #1: Mock data is essential for offline development.\n\n#AICreativeSuite #DevLife\n\n2/3 🧵 Insight #2: Handling various states like loading and error is crucial for good UX.\n\n3/3 🧵 Final thought: A well-designed mock API can perfectly simulate real-world behavior, making frontend development much smoother.`;
            if (options.transformFormat === 'email') return `Subject: Summary of Key Points\n\nHello Team,\n\nFollowing up on our recent discussion, I've summarized the main points from the document you provided. The core message revolves around the importance of mock data and state management in modern web applications. Please let me know if you have any questions.\n\nBest,\nCreative Studio AI`;
            return "Slide 1: Title - Main Idea from your text\nSlide 2: Bullet Point 1\nSlide 3: Bullet Point 2\nSlide 4: Conclusion";
        case 'chat':
             const chatResponses = [
                 `That's an interesting point about "${text}". It makes me think about the relationship between creativity and technology. How can I help you explore that further?`,
                 `I've processed your message: "${text}". I can help you brainstorm ideas, write a draft, or structure a plan. What's our next step?`,
                 `Regarding "${text}", I can offer a few perspectives. We could look at it from a historical angle, a technical one, or a purely creative one. Which sounds most useful?`
             ];
             if (context?.lastAction?.prompt) {
                const keywords = extractKeywords(context.lastAction.prompt);
                if (keywords.length > 0) {
                    return `I see you were recently working on something involving "${keywords[0]}". How does that relate to your question about "${text}"? I can help you connect these ideas.`
                }
             }
             return chatResponses[Math.floor(rand() * chatResponses.length)];
        default:
            return 'Unsupported text generation mode.';
    }
}

export const generateMusic = async (mood: string, genre: string, duration: number): Promise<string> => {
    console.log('API CALL: generateMusic', { mood, genre, duration });
    await new Promise(res => setTimeout(res, 150));
    return createMockPcmAudio(300, 3);
}

export const generateSfx = async (prompt: string): Promise<string> => {
    console.log('API CALL: generateSfx', { prompt });
    await new Promise(res => setTimeout(res, 40));
    return createMockPcmAudio(800, 0.5);
}

export const cleanupAudio = async (base64Audio: string, options: any): Promise<string> => {
    console.log('API CALL: cleanupAudio', { options });
    await new Promise(res => setTimeout(res, 80));
    return base64Audio; // Return the same audio for the mock
}


// --- TEMPLATES MOCKS ---

const createMockTemplate = (type: string, isInteractive: boolean, colors: string[], text: string) => {
    const primaryColor = colors[0] || '#7C3AED';
    const secondaryColor = colors[1] || '#E9D5FF';

    const svg = `<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
        <rect width="512" height="512" fill="${secondaryColor}" />
        <rect x="50" y="150" width="412" height="212" fill="${primaryColor}" />
        <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="Inter" font-size="48" fill="white" font-weight="bold">${text}</text>
        <text x="50%" y="85%" dominant-baseline="middle" text-anchor="middle" font-family="Inter" font-size="24" fill="${primaryColor}">${type} Template</text>
    </svg>`;
    return btoa(svg);
}


export const generateTemplate = async (prompt: string, type: string, isInteractive: boolean): Promise<string> => {
    console.log('API CALL: generateTemplate', { prompt, type, isInteractive });
    await new Promise(res => setTimeout(res, 110));

    // Simple prompt parsing for color and text
    const colorRegex = /(red|blue|green|yellow|purple|orange|black|white|violet|indigo|teal|pink|gray)/gi;
    const textRegex = /for "([^"]*)"|titled "([^"]*)"/;
    
    let colors = (prompt.match(colorRegex) || []).slice(0, 2);
    if (colors.length === 0) colors = ['#7C3AED', '#E9D5FF'];
    else if (colors.length === 1) colors.push('#E9D5FF');

    const textMatch = prompt.match(textRegex);
    const text = textMatch ? (textMatch[1] || textMatch[2]) : 'Your Text Here';

    return createMockTemplate(type, isInteractive, colors, text);
}

export const generateBrandKit = async (companyName: string, companyDesc: string) => {
    console.log('API CALL: generateBrandKit', { companyName, companyDesc });
    await new Promise(res => setTimeout(res, 150));
    
    const colors = ['#5A67D8', '#9F7AEA', '#ED64A6', '#4FD1C5', '#F6E05E'];
    const fonts = { heading: 'Inter', body: 'Roboto' };
    const createLogo = (text: string) => btoa(`<svg width="200" height="80" viewBox="0 0 200 80" xmlns="http://www.w3.org/2000/svg"><rect width="200" height="80" fill="${colors[0]}" /><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="${fonts.heading}" font-size="30" fill="white">${text}</text></svg>`);

    return {
        logos: {
            primary: createLogo(companyName),
            secondary: createLogo(companyName.substring(0,1)),
        },
        colors: colors,
        fonts: fonts
    }
}