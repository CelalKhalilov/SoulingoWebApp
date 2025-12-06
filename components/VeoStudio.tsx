import React, { useState } from 'react';
import { Video, Loader2, Upload, AlertCircle } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import { fileToBase64 } from '../services/audioUtils';
import { ProcessingStatus, VideoGenerationResult } from '../types';

const VeoStudio: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [status, setStatus] = useState<ProcessingStatus>(ProcessingStatus.IDLE);
  const [videoResult, setVideoResult] = useState<VideoGenerationResult | null>(null);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const base64 = await fileToBase64(e.target.files[0]);
      setUploadedImage(base64);
    }
  };

  const ensureApiKey = async (): Promise<boolean> => {
    const aistudio = (window as any).aistudio;
    if (aistudio && aistudio.hasSelectedApiKey) {
      const hasKey = await aistudio.hasSelectedApiKey();
      if (!hasKey) {
        await aistudio.openSelectKey();
        // Assume success after dialog interaction per guidelines
      }
      return true;
    }
    // Fallback for non-AI Studio environments (using env var)
    return !!process.env.API_KEY;
  };

  const generateVideo = async () => {
    try {
      setStatus(ProcessingStatus.PROCESSING);
      await ensureApiKey();

      // IMPORTANT: Re-initialize client to pick up selected key
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

      let operation;

      // Conditional config based on whether image is provided
      if (uploadedImage) {
        operation = await ai.models.generateVideos({
          model: 'veo-3.1-fast-generate-preview',
          prompt: prompt || 'Animate this image naturally.',
          image: {
             imageBytes: uploadedImage,
             mimeType: 'image/jpeg' 
          },
          config: {
            numberOfVideos: 1,
            resolution: '720p',
            aspectRatio: '16:9'
          }
        });
      } else {
        operation = await ai.models.generateVideos({
          model: 'veo-3.1-fast-generate-preview',
          prompt: prompt,
          config: {
            numberOfVideos: 1,
            resolution: '720p',
            aspectRatio: '16:9'
          }
        });
      }

      // Polling loop
      while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 5000));
        operation = await ai.operations.getVideosOperation({ operation });
      }

      const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
      if (videoUri) {
        // Append API Key for download/playback
        const playableUri = `${videoUri}&key=${process.env.API_KEY}`;
        setVideoResult({ uri: playableUri });
        setStatus(ProcessingStatus.COMPLETE);
      } else {
        throw new Error("No video URI in response");
      }

    } catch (error) {
      console.error("Video Gen Error:", error);
      setStatus(ProcessingStatus.ERROR);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <h2 className="text-2xl font-bold mb-2 flex items-center gap-2 text-soul-800">
          <Video className="text-soul-500" /> Veo Video Stüdyosu
        </h2>
        <p className="text-slate-600 mb-6">Google'ın Veo modelini kullanarak animasyonlu dersler veya görsel yardımcılar oluşturun.</p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Kaynak Resim (İsteğe Bağlı)</label>
            <div className="flex items-center gap-4">
              <label className="cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors">
                <Upload size={18} />
                Resim Yükle
                <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
              </label>
              {uploadedImage && <span className="text-sm text-green-600 font-medium">Resim yüklendi!</span>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">İstem (Prompt)</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Oluşturmak istediğiniz videoyu tanımlayın (örn. 'Sınıfta İspanyolca öğreten dost canlısı bir baykuş')..."
              className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-soul-500 focus:border-soul-500 outline-none h-24"
            />
          </div>

          <div className="bg-blue-50 p-4 rounded-xl flex items-start gap-3">
             <AlertCircle className="text-blue-600 shrink-0 mt-0.5" size={20} />
             <div className="text-sm text-blue-800">
               <p className="font-semibold">Fatura Bildirimi</p>
               <p>Veo modellerini kullanmak ücretli bir proje gerektirir. Bir faturalandırma hesabıyla ilişkili bir API anahtarı seçmeniz istenecektir.</p>
               <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noreferrer" className="underline mt-1 block">Fatura Belgelerini Görüntüle</a>
             </div>
          </div>

          <button
            onClick={generateVideo}
            disabled={status === ProcessingStatus.PROCESSING || (!prompt && !uploadedImage)}
            className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
              status === ProcessingStatus.PROCESSING
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                : 'bg-soul-600 text-white hover:bg-soul-700 shadow-md hover:shadow-lg'
            }`}
          >
            {status === ProcessingStatus.PROCESSING ? (
              <>
                <Loader2 className="animate-spin" /> Oluşturuluyor (bu biraz zaman alabilir)...
              </>
            ) : (
              'Video Oluştur'
            )}
          </button>
        </div>
      </div>

      {videoResult && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 animate-fade-in">
          <h3 className="font-bold text-lg mb-4">Oluşturulan Video</h3>
          <div className="aspect-video bg-black rounded-xl overflow-hidden shadow-lg">
             {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
             <video 
               src={videoResult.uri} 
               controls 
               className="w-full h-full"
             />
          </div>
        </div>
      )}
    </div>
  );
};

export default VeoStudio;