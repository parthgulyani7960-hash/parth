import { encode } from "../utils/audio";

// --- MOCK MODE ---
// All API calls are now mocked to provide a free, API-key-free experience.

// Helper to create mock raw PCM audio data (sine wave) and encode it in base64
const createMockPcmAudio = (frequency: number = 440, duration: number = 1.5): string => {
    const sampleRate = 24000; // The API outputs at 24kHz
    const numSamples = sampleRate * duration;
    const samples = new Int16Array(numSamples);
    for (let i = 0; i < numSamples; i++) {
        // Simple sine wave
        const sampleValue = Math.sin(2 * Math.PI * frequency * (i / sampleRate)) * 32767;
        // Fade out in the last 20% of the duration
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

const createMockImage = (aspectRatio: '1:1' | '16:9' | '9:16' = '1:1', color?: string, dominance: number = 50) => {
    const width = aspectRatio === '16:9' ? 1024 : aspectRatio === '9:16' ? 576 : 1024;
    const height = aspectRatio === '16:9' ? 576 : aspectRatio === '9:16' ? 1024 : 1024;
    
    const randomColor = () => Math.floor(Math.random() * 255);
    const c1 = color ? `hsl(${parseInt(color.slice(1,3), 16)}, ${dominance}%, 50%)` : `rgb(${randomColor()}, ${randomColor()}, ${randomColor()})`;
    const c2 = `rgb(${randomColor()}, ${randomColor()}, ${randomColor()})`;
    const angle = Math.floor(Math.random() * 360);

    const shapes = [
        `<circle cx="${width * 0.25}" cy="${height * 0.25}" r="${Math.random() * 50 + 20}" fill="rgba(255,255,255,0.3)" />`,
        `<rect x="${width * 0.7}" y="${height * 0.6}" width="${Math.random() * 100 + 50}" height="${Math.random() * 100 + 50}" fill="rgba(255,255,255,0.2)" transform="rotate(${Math.random() * 90} ${width*0.75} ${height*0.75})" />`,
        `<path d="M ${Math.random()*width} ${Math.random()*height} L ${Math.random()*width} ${Math.random()*height} L ${Math.random()*width} ${Math.random()*height} Z" fill="rgba(255,255,255,0.25)" />`
    ];
    
    const randomShape = shapes[Math.floor(Math.random() * shapes.length)];

    const svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
        <defs><linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%" gradientTransform="rotate(${angle})"><stop offset="0%" style="stop-color:${c1};" /><stop offset="100%" style="stop-color:${c2};" /></linearGradient></defs>
        <rect width="${width}" height="${height}" fill="url(#grad)" />
        ${randomShape}
        <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="Inter" font-size="40" fill="white" style="text-shadow: 2px 2px 4px rgba(0,0,0,0.4);">AI Generated Image</text>
    </svg>`;
    return btoa(svg);
};

const createMockVideoUrl = (prompt: string) => {
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 360;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, '#232526');
  gradient.addColorStop(1, '#414345');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.font = 'bold 24px Inter';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Basic word wrap
  const words = prompt.split(' ');
  let line = '';
  const lines = [];
  const maxWidth = canvas.width - 80;
  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && n > 0) {
      lines.push(line);
      line = words[n] + ' ';
    } else {
      line = testLine;
    }
  }
  lines.push(line);

  const lineHeight = 30;
  const startY = (canvas.height - (lines.length - 1) * lineHeight) / 2;

  lines.forEach((l, i) => {
    ctx.fillText(l.trim(), canvas.width / 2, startY + i * lineHeight);
  });
  
  return canvas.toDataURL();
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
    return Array.from({ length: count }, () => createMockImage(aspectRatio, options.color, options.dominance));
};

export const enhancePrompt = async (prompt: string): Promise<string> => {
    console.log('API CALL: enhancePrompt', { prompt });
    await new Promise(res => setTimeout(res, 50));
    return `${prompt}, golden hour lighting, hyperrealistic, 8k resolution, trending on artstation`;
};

export const upscaleImage = async (base64Image: string, scale: number): Promise<string> => {
  console.log('API CALL: upscaleImage', { scale });
  await new Promise(res => setTimeout(res, 100));
  // This is a mock. It decodes the SVG, adds a label, and re-encodes it.
  try {
    const svgText = atob(base64Image);
    // Use a regex to avoid adding multiple labels
    const cleanedSvg = svgText.replace(/<text class="upscale-label".*?<\/text>/g, '');
    const newSvgText = cleanedSvg.replace('</svg>', `<text x="10" y="30" class="upscale-label" font-family="Inter" font-size="24" fill="rgba(0,0,0,0.5)" font-weight="bold">Upscaled ${scale}x</text></svg>`);
    return btoa(newSvgText);
  } catch (e) {
    // If it's not an SVG, just return the original for this mock.
    console.warn("Upscale mock works best with SVGs. Returning original image.");
    return base64Image;
  }
};

export const outpaintImage = async (base64Image: string, direction: 'up' | 'down' | 'left' | 'right'): Promise<string> => {
    console.log('API CALL: outpaintImage', { direction });
    await new Promise(res => setTimeout(res, 100));
    return createMockImage('1:1');
};

export const removeImageBackground = async (base64: string, mimeType: string): Promise<string> => {
    console.log('API CALL: removeImageBackground', { mimeType });
    await new Promise(res => setTimeout(res, 75));
    return createMockImage('1:1');
}

export const magicEraser = async (base64Image: string, mimeType: string, maskBase64: string): Promise<string> => {
    console.log('API CALL: magicEraser');
    await new Promise(res => setTimeout(res, 100));
    return createMockImage('1:1');
}

export const replaceSky = async (base64Image: string, mimeType: string, skyType: string): Promise<string> => {
    console.log('API CALL: replaceSky', { skyType });
    await new Promise(res => setTimeout(res, 110));
    return createMockImage('16:9');
}

export const addObjectToImage = async (base64Image: string, mimeType: string, objectPrompt: string): Promise<string> => {
    console.log('API CALL: addObjectToImage', { objectPrompt });
    await new Promise(res => setTimeout(res, 120));
    return createMockImage('1:1');
}

export const applyStyleToImage = async (base64Image: string, mimeType: string, stylePrompt: string, styleImages?: {base64: string, influence: number}[]): Promise<string> => {
    console.log('API CALL: applyStyleToImage', { stylePrompt, styleImages: styleImages?.map(si => ({ ...si, base64: '...' })) });
    await new Promise(res => setTimeout(res, 130));
    return createMockImage('1:1');
}

export const animatePhotoToVideo = async (base64Image: string): Promise<string> => {
    console.log('API CALL: animatePhotoToVideo');
    await new Promise(res => setTimeout(res, 180));
    // In a real implementation, this would call a generative video model
    // with the source image to create a short animation (e.g., parallax, subtle motion).
    return createMockVideoUrl('Animated Photo');
};

export const generate3dBackground = async (base64Image: string, mimeType: string, prompt: string): Promise<string> => {
    console.log('API CALL: generate3dBackground', { prompt });
    await new Promise(res => setTimeout(res, 150));
    // This mock simulates removing the background and generating a new one.
    // For simplicity, we just return a new image.
    return createMockImage('16:9');
};


// --- VIDEO MOCKS ---
export const analyzeFrame = async (base64: string, mimeType: string, prompt: string): Promise<string> => {
    console.log('API CALL: analyzeFrame', { mimeType, prompt });
    await new Promise(res => setTimeout(res, 60));
    return `Frame analysis for prompt "${prompt}": This is a mock response describing a video frame. The scene appears to be computer-generated, with a dark background and the text "Mock Video" in the center. The mood is neutral.`;
};

export const enhanceVideoQuality = async (): Promise<void> => {
    console.log('API CALL: enhanceVideoQuality');
    // Simulate a backend process that enhances video resolution and bitrate.
    await new Promise(res => setTimeout(res, 150));
};


export const generateVideo = async (prompt: string, aspectRatio: '16:9' | '9:16', audioSettings?: any, qualitySettings?: { resolution: string, bitrate: number }): Promise<string> => {
    console.log('API CALL: generateVideo', { prompt, aspectRatio, audioSettings, qualitySettings });
    await new Promise(res => setTimeout(res, 300)); // Simulate longer generation time
    return createMockVideoUrl(prompt);
};

export const generateAutoCut = async (duration: number, prompt: string): Promise<{ start: number, end: number }[]> => {
    console.log('API CALL: generateAutoCut', { duration, prompt });
    await new Promise(res => setTimeout(res, 100));
    const numClips = Math.floor(Math.random() * 4) + 3; // 3 to 6 clips
    const clips = [];
    for (let i = 0; i < numClips; i++) {
        const start = Math.random() * duration * 0.8;
        const end = start + (Math.random() * (duration / numClips)) + 2;
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
    // Real backend would re-render video frames. For mock, we send CSS.
    const contrast = 1 + (intensity / 100) * 0.2;
    const saturate = 1 + (intensity / 100) * 0.1;
    // Blur is too performance-heavy for real-time video, so we'll skip it in the mock response.
    // const blur = (depthBlur / 100) * 2;
    // A real API would return a new video stream/URL.
    return `contrast(${contrast}) saturate(${saturate}) brightness(0.95)`;
};

export const generateActorInVideo = async (actorDescription: string, dialogue: string, voiceStyle: string, referenceImage?: string): Promise<string> => {
    console.log('API CALL: generateActorInVideo', { actorDescription, dialogue, voiceStyle, referenceImage: referenceImage ? '...' : undefined });
    await new Promise(res => setTimeout(res, 250)); // Simulate a longer process
    // Returns a new video to imply the actor has been added/replaced.
    return createMockVideoUrl('Video with new actor');
};

export const removeObjectFromVideo = async (objectPrompt: string): Promise<string> => {
    console.log('API CALL: removeObjectFromVideo', { objectPrompt });
    await new Promise(res => setTimeout(res, 200));
    return createMockVideoUrl(`Video with "${objectPrompt}" removed`);
};

export const replaceObjectInVideo = async (removePrompt: string, addPrompt: string): Promise<string> => {
    console.log('API CALL: replaceObjectInVideo', { removePrompt, addPrompt });
    await new Promise(res => setTimeout(res, 210));
    return createMockVideoUrl(`Video with "${removePrompt}" replaced by "${addPrompt}"`);
};

export const applySlowMotion = async (factor: number): Promise<string> => {
    console.log('API CALL: applySlowMotion', { factor });
    await new Promise(res => setTimeout(res, 180));
    return createMockVideoUrl(`Video with ${factor.toFixed(2)}x slow motion`);
};

export const transferVideoStyle = async (stylePrompt: string): Promise<string> => {
    console.log('API CALL: transferVideoStyle', { stylePrompt });
    await new Promise(res => setTimeout(res, 220));
    return createMockVideoUrl(`Video in the style of: ${stylePrompt}`);
};


// --- AUDIO MOCKS ---

// Map voice names to distinct frequencies for varied demo sounds
const voiceFrequencies: { [key: string]: number } = {
    'Kore': 440, // A4
    'Zephyr': 330, // E4
    'Puck': 550, // C#5
    'Charon': 220, // A3
    'Aria': 494, // B4
    'Leo': 262, // C4
    'Nova': 523, // C5
    'Fenrir': 196, // G3
    'Luna': 659, // E5
    'Orion': 294, // D4
};

export const generateSpeech = async (text: string, voice: string, emotion: string): Promise<string> => {
    console.log('API CALL: generateSpeech', { text, voice, emotion });
    await new Promise(res => setTimeout(res, 60));
    const frequency = voiceFrequencies[voice] || 440;
    return createMockPcmAudio(frequency, text.length > 50 ? 2 : 1);
};

export const mockLiveConnect = async (callbacks: { onopen: () => void, onmessage: (msg: any) => void, onerror: (e: any) => void, onclose: () => void }) => {
    console.log('API CALL: mockLiveConnect');
    
    callbacks.onopen();

    const words = "This is a live transcription being generated by a mock AI service. It demonstrates how text can appear in real-time as a user speaks. You can use this to summarize or analyze later.".split(" ");
    let i = 0;
    const interval = setInterval(() => {
        if (i < words.length) {
            callbacks.onmessage({ serverContent: { inputTranscription: { text: words[i] + ' ' } } });
            i++;
        } else {
             // Let it just sit "open" waiting for more speech
        }
    }, 300);

    const session = {
        close: () => {
            console.log('Live session closed.');
            clearInterval(interval);
            callbacks.onclose();
        },
        sendRealtimeInput: (input: any) => {
            // In a real scenario, this would send audio data.
            // Here we just log it.
            // console.log("Sending audio data...", input);
        }
    };
    
    return session;
};


export const generateText = async (mode: string, text: string, prompt: string, options: any): Promise<string> => {
    console.log('API CALL: generateText', { mode, text, prompt, options });
    await new Promise(res => setTimeout(res, 75));
    switch(mode) {
        case 'summarize':
            return `This is a mock AI summary of the provided text. It has been processed to be a ${options.summaryLength} length. The key points seem to be about a mock implementation for a creative suite application.`;
        case 'proofread':
            return `This is a proofread version of your text, in a ${options.proofreadTone} tone. All grammar and spelling have been meticulously corrected by our mock AI.`;
        case 'write':
            return `Based on your prompt "${prompt}", here is a generated blog post:\n\nThe future of AI in creative fields is incredibly bright. From generating stunning visuals to composing music, AI is poised to become an indispensable partner for artists, designers, and creators everywhere. It's not about replacement; it's about augmentation.`;
        case 'poem':
             return `A mock poem about "${prompt}":\n\nThe sun dips low, a painter's fire,\nAcross the canvas of the sea,\nGold and crimson, heart's desire,\nA fleeting masterpiece for me.`;
        case 'script':
             return `[SCENE START]\n\nEXT. ANCIENT RUINS - DAY\n\nBased on your idea: "${prompt}"\n\nA lone adventurer, Kael, crests a dune. Before him, the sprawling ruins of a forgotten city shimmer in the heat haze. The wind whispers forgotten secrets.\n\nKAEL\n(to himself)\nSo, the legends were true...\n\nHe draws a weathered map, its edges frayed. A giant stone bird suddenly casts a shadow over him. He looks up, startled.\n\n[SCENE END]`;
        case 'transform':
            if (options.transformFormat === 'tweet') {
                return `1/3 🧵 Transformed your text into a tweet thread!\n\nKey insight #1: Mock data is essential for offline development.\n\n#AICreativeSuite #DevLife\n\n2/3 🧵 Insight #2: Handling various states like loading and error is crucial for good UX.\n\n3/3 🧵 Final thought: A well-designed mock API can perfectly simulate real-world behavior, making frontend development much smoother.`;
            }
             if (options.transformFormat === 'email') {
                return `Subject: Summary of Key Points\n\nHello Team,\n\nFollowing up on our recent discussion, I've summarized the main points from the document you provided. The core message revolves around the importance of mock data and state management in modern web applications. Please let me know if you have any questions.\n\nBest,\nCreative Studio AI`;
            }
            return "Slide 1: Title - Main Idea from your text\nSlide 2: Bullet Point 1\nSlide 3: Bullet Point 2\nSlide 4: Conclusion";
        case 'chat':
             if (prompt.toLowerCase().includes('help')) {
                 return `Of course! I can help with that. Creative Studio AI has many features. Key features include:\n- **Photo Lab**: Advanced photo editing with AI tools.\n- **Video Suite**: Generate video from text or edit your own clips.\n- **Audio Studio**: Transcribe audio, generate voice-overs, and create music.\n- **Image Generator**: Create images from text prompts.\n\nWhat would you like to know more about?`;
             }
             return `This is a mock AI response to your message: "${text}". I am a helpful assistant designed to help with your creative projects. How can I assist you further?`;
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