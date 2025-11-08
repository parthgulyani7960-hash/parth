// services/geminiService.ts - LIVE IMPLEMENTATION
import { GoogleGenAI, Modality, GenerateContentResponse } from '@google/genai';

// NOTE: This service will use the live Gemini API.
// An API key MUST be provided in the environment.

let ai: GoogleGenAI;

const getAi = () => {
    // Re-instantiate to ensure the latest API key is used, especially after selection.
    ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
    return ai;
};

const handleApiError = (error: any): never => {
    if (error instanceof Error) {
        console.error("Gemini API Error:", error.message);
        throw new Error(error.message);
    }
    console.error("Unknown Gemini API Error:", error);
    throw new Error('An unknown error occurred with the Gemini API.');
};


export const generateText = async (mode: string, text: string, prompt: string, options: any): Promise<string> => {
    try {
        const ai = getAi();
        let contents = '';
        switch (mode) {
            case 'summarize':
                contents = `Summarize the following text in a ${options.summaryLength} format:\n\n${text}`;
                break;
            case 'proofread':
                contents = `Proofread the following text with a ${options.proofreadTone} tone:\n\n${text}`;
                break;
            case 'transform':
                 contents = `Transform the following text into a ${options.transformFormat}:\n\n"${text}"`;
                break;
            case 'poem':
            case 'script':
            case 'write':
            default:
                contents = prompt;
        }

        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: contents,
        });
        return response.text;
    } catch (error) {
        return handleApiError(error);
    }
};

let chat: any = null;

export const startChat = () => {
    try {
        const ai = getAi();
        chat = ai.chats.create({ model: 'gemini-2.5-pro' });
        console.log("Live chat session started.");
    } catch (error) {
        handleApiError(error);
    }
};

export const generateChatResponse = async (message: string): Promise<string> => {
    if (!chat) {
        startChat();
    }
    try {
        const response: GenerateContentResponse = await chat.sendMessage({ message });
        return response.text;
    } catch (error) {
        return handleApiError(error);
    }
};


export const generateImages = async (prompt: string, count: number, aspectRatio: '1:1' | '16:9' | '9:16', options?: any): Promise<{ images: string[]; mimeType: 'image/png' }> => {
    try {
        const ai = getAi();
        const response = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: prompt,
            config: {
                numberOfImages: count,
                outputMimeType: 'image/png',
                aspectRatio: aspectRatio,
            }
        });
        return {
            images: response.generatedImages.map(img => img.image.imageBytes),
            mimeType: 'image/png'
        };
    } catch (error) {
        return handleApiError(error);
    }
};


export const enhancePrompt = async (prompt: string): Promise<string> => {
     try {
        const ai = getAi();
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Enhance this image generation prompt to be more vivid, detailed, and cinematic. Add specific details about lighting, composition, and style. Only return the enhanced prompt itself. Original prompt: "${prompt}"`,
        });
        return response.text.replace(/"/g, ''); // Clean up quotes
    } catch (error) {
        return handleApiError(error);
    }
};

export const upscaleImage = async (prompt: string, aspectRatio: '1:1' | '16:9' | '9:16'): Promise<{ image: string; mimeType: 'image/png' }> => {
     try {
        const { images, mimeType } = await generateImages(`High resolution, 4k, ultra-detailed version of: ${prompt}`, 1, aspectRatio);
        return { image: images[0], mimeType };
    } catch (error) {
        return handleApiError(error);
    }
};

const editImageWithAI = async (base64: string, mimeType: string, prompt: string): Promise<string> => {
    try {
        const ai = getAi();
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [
                    { inlineData: { data: base64, mimeType } },
                    { text: prompt }
                ]
            },
            config: {
                responseModalities: [Modality.IMAGE],
            }
        });

        const imagePart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
        if (imagePart?.inlineData?.data) {
            return imagePart.inlineData.data;
        }
        throw new Error('No image was returned from the API.');
    } catch (error) {
        return handleApiError(error);
    }
};

export const removeImageBackground = (base64: string, mimeType: string) => editImageWithAI(base64, mimeType, 'remove the background, leaving only the main subject with a transparent background');
export const replaceSky = (base64: string, mimeType: string, skyType: string) => editImageWithAI(base64, mimeType, `replace the sky with a beautiful ${skyType} sky`);
export const addObjectToImage = (base64: string, mimeType: string, objectPrompt: string) => editImageWithAI(base64, mimeType, `add this object to the image in a realistic way: ${objectPrompt}`);
export const applyStyleToImage = (base64: string, mimeType: string, stylePrompt: string) => editImageWithAI(base64, mimeType, `apply this artistic style to the entire image: ${stylePrompt}`);
export const magicEraser = (base64: string, mimeType: string, objectToRemove: string) => editImageWithAI(base64, mimeType, `seamlessly remove this from the image: ${objectToRemove}`);
export const outpaintImage = (base64: string, mimeType: string, direction: string) => editImageWithAI(base64, mimeType, `outpaint the image, expanding it to the ${direction}`);

export const analyzeImage = async (base64: string, mimeType: string, prompt: string): Promise<string> => {
    try {
        const ai = getAi();
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: {
                parts: [
                    { inlineData: { data: base64, mimeType } },
                    { text: prompt }
                ]
            }
        });
        return response.text;
    } catch (error) {
        return handleApiError(error);
    }
};

// --- VIDEO GENERATION (VEO) ---
export const generateVideo = async (prompt: string, aspectRatio: '16:9' | '9:16', directorOptions: any) => {
    try {
        const fullPrompt = `${prompt}, ${directorOptions.cameraAngle}, ${directorOptions.shotStyle}, ${directorOptions.lighting}`;
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string }); // Always create a new instance for Veo
        return await ai.models.generateVideos({
            model: 'veo-3.1-fast-generate-preview',
            prompt: fullPrompt,
            config: {
                numberOfVideos: 1,
                resolution: '720p',
                aspectRatio,
            }
        });
    } catch (error) {
        return handleApiError(error);
    }
};


export const getVideosOperation = async (operation: any) => {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string }); // Always create a new instance for Veo
        return await ai.operations.getVideosOperation({ operation });
    } catch (error) {
        return handleApiError(error);
    }
};

export const animatePhotoToVideo = async (base64Image: string, mimeType: string) => {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string }); // Always create a new instance for Veo
        return await ai.models.generateVideos({
            model: 'veo-3.1-fast-generate-preview',
            image: { imageBytes: base64Image, mimeType },
            config: {
                numberOfVideos: 1,
                resolution: '720p',
                aspectRatio: '16:9'
            }
        });
    } catch (error) {
        return handleApiError(error);
    }
};

export const analyzeFrame = (base64: string, mimeType: string, prompt: string): Promise<string> => {
    return analyzeImage(base64, mimeType, prompt);
};

// --- AUDIO GENERATION (TTS) ---
export const generateSpeech = async (text: string, voice: string, emotion: string): Promise<string> => {
    try {
        const ai = getAi();
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text: `Say with a ${emotion.toLowerCase()} tone: ${text}` }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: voice },
                    },
                },
            },
        });
        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (!base64Audio) {
            throw new Error('No audio data returned from API.');
        }
        return base64Audio;
    } catch (error) {
        return handleApiError(error);
    }
};

export const generatePixelArt = async (prompt: string, pixelSize: number): Promise<string> => {
     try {
        const { images } = await generateImages(`Pixel art sprite of ${prompt}, ${pixelSize}-bit style, simple background`, 1, '1:1');
        return images[0];
    } catch (error) {
        return handleApiError(error);
    }
};

export const pixelateImage = async (base64Image: string, mimeType: string): Promise<string> => {
    return editImageWithAI(base64Image, mimeType, 'pixelate this image, turning it into pixel art');
};

export const generateTemplate = async (prompt: string, type: string, isInteractive: boolean): Promise<string> => {
    const aspectRatio = type === 'YouTube' || type === 'Thumbnail' ? '16:9' : '1:1';
    try {
        const { images } = await generateImages(`A modern, clean template for a ${type}. Theme: ${prompt}.`, 1, aspectRatio as '1:1' | '16:9' | '9:16');
        return images[0];
    } catch (error) {
        return handleApiError(error);
    }
};

export const generateBrandKit = async (companyName: string, description: string): Promise<any> => {
     try {
        const ai = getAi();
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: `Generate a brand kit for a company. Name: ${companyName}. Description: ${description}. Return a JSON object with this exact structure: { "logos": { "primary": "description for a primary logo", "secondary": "description for a secondary logo/icon" }, "colors": ["list of 5 hex color codes"], "fonts": { "heading": "name of a Google Font for headings", "body": "name of a Google Font for body text" } }`,
        });

        const jsonString = response.text.match(/\{[\s\S]*\}/)?.[0] ?? '{}';
        const brandInfo = JSON.parse(jsonString);

        const [logo1Result, logo2Result] = await Promise.all([
            generateImages(brandInfo.logos.primary, 1, '1:1'),
            generateImages(brandInfo.logos.secondary, 1, '1:1')
        ]);
        
        return {
            logos: { primary: logo1Result.images[0], secondary: logo2Result.images[0] },
            colors: brandInfo.colors,
            fonts: brandInfo.fonts,
        };
    } catch (error) {
        return handleApiError(error);
    }
};
