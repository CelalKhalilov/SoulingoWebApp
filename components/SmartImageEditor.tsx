import React, { useState } from 'react';
import { Image as ImageIcon, Wand2, Loader2, Download } from 'lucide-react';
import { fileToBase64 } from '../services/audioUtils';
import { editImage } from '../services/genai';
import { ProcessingStatus } from '../types';

const SmartImageEditor: React.FC = () => {
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [status, setStatus] = useState<ProcessingStatus>(ProcessingStatus.IDLE);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const base64 = await fileToBase64(e.target.files[0]);
      setOriginalImage(base64);
      setResultImage(null); // Reset result on new upload
    }
  };

  const handleEdit = async () => {
    if (!originalImage || !prompt) return;

    try {
      setStatus(ProcessingStatus.PROCESSING);
      const newImageBase64 = await editImage(originalImage, prompt);
      setResultImage(newImageBase64);
      setStatus(ProcessingStatus.COMPLETE);
    } catch (error) {
      console.error(error);
      setStatus(ProcessingStatus.ERROR);
      alert("Resim düzenlenemedi. İsteminizin net olduğundan emin olun.");
    }
  };

  return (
    <div className="grid md:grid-cols-2 gap-6 h-full">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-soul-800">
          <ImageIcon className="text-soul-500" /> Kaynak
        </h2>
        
        <div className="flex-1 bg-slate-100 rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center relative overflow-hidden group min-h-[300px]">
          {originalImage ? (
            <img 
              src={`data:image/jpeg;base64,${originalImage}`} 
              alt="Original" 
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="text-center text-slate-400 p-4">
              <p>Başlamak için bir resim yükleyin</p>
            </div>
          )}
          
          <label className="absolute inset-0 cursor-pointer bg-black/0 hover:bg-black/10 transition-colors flex items-center justify-center">
             <input type="file" className="hidden" accept="image/*" onChange={handleUpload} />
             {!originalImage && <span className="bg-white text-soul-600 px-4 py-2 rounded-full font-bold shadow-sm">Dosya Seç</span>}
          </label>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-bold text-slate-700 mb-2">Düzenleme Talimatı</label>
          <div className="flex gap-2">
            <input 
              type="text" 
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="örn., 'Retro filtresi ekle', 'Karlı yap'"
              className="flex-1 border p-3 rounded-xl focus:ring-2 focus:ring-soul-500 outline-none"
            />
            <button 
              onClick={handleEdit}
              disabled={!originalImage || !prompt || status === ProcessingStatus.PROCESSING}
              className="bg-soul-600 text-white p-3 rounded-xl hover:bg-soul-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {status === ProcessingStatus.PROCESSING ? <Loader2 className="animate-spin" /> : <Wand2 />}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-soul-800">
          <Wand2 className="text-soul-500" /> Sonuç
        </h2>
        
        <div className="flex-1 bg-slate-100 rounded-xl border border-slate-200 flex items-center justify-center overflow-hidden min-h-[300px]">
           {status === ProcessingStatus.PROCESSING ? (
             <div className="text-center">
               <Loader2 className="animate-spin text-soul-500 w-12 h-12 mx-auto mb-2" />
               <p className="text-soul-600 font-medium">Sihir yapılıyor...</p>
             </div>
           ) : resultImage ? (
             <img 
              src={`data:image/jpeg;base64,${resultImage}`} 
              alt="Result" 
              className="w-full h-full object-contain animate-fade-in"
            />
           ) : (
             <p className="text-slate-400">Düzenlenen resim burada görünecek</p>
           )}
        </div>

        {resultImage && (
          <div className="mt-4 flex justify-end">
            <a 
              href={`data:image/jpeg;base64,${resultImage}`} 
              download="soulingo-edit.jpg"
              className="flex items-center gap-2 text-soul-600 font-bold hover:underline"
            >
              <Download size={18} /> Resmi Kaydet
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

export default SmartImageEditor;