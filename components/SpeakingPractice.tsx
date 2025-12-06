import React, { useState, useRef } from 'react';
import { Mic, Square, Play, RefreshCw, Loader2, Edit3 } from 'lucide-react';
import { analyzePronunciation } from '../services/genai';
import { ProcessingStatus } from '../types';

const SpeakingPractice: React.FC = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [feedback, setFeedback] = useState<string>('');
  const [status, setStatus] = useState<ProcessingStatus>(ProcessingStatus.IDLE);
  const [targetText, setTargetText] = useState("I would like to order a coffee with milk, please.");
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      setFeedback(''); // Clear previous feedback
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      chunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/wav' });
        setAudioBlob(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Mic error", err);
      alert("Microphone access denied");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleAnalysis = async () => {
    if (!audioBlob) return;
    setStatus(ProcessingStatus.PROCESSING);
    
    // Convert Blob to Base64
    const reader = new FileReader();
    reader.readAsDataURL(audioBlob);
    reader.onloadend = async () => {
      try {
        const base64Audio = (reader.result as string).split(',')[1];
        const result = await analyzePronunciation(base64Audio, targetText);
        setFeedback(result);
        setStatus(ProcessingStatus.COMPLETE);
      } catch (e) {
        console.error(e);
        setStatus(ProcessingStatus.ERROR);
      }
    };
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-slate-800">Konuşma Pratiği</h1>
        <p className="text-slate-600">Aşağıdaki cümleyi okuyun ve anında geri bildirim alın.</p>
      </div>

      <div className="bg-white p-8 rounded-3xl shadow-sm border text-center space-y-6">
        <div className="relative group">
          <textarea
            value={targetText}
            onChange={(e) => setTargetText(e.target.value)}
            className="w-full text-xl font-medium text-slate-800 bg-slate-50 p-6 rounded-xl border-dashed border-2 border-slate-200 text-center resize-none focus:ring-2 focus:ring-soul-500 focus:border-soul-500 outline-none transition-all"
            rows={3}
          />
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 pointer-events-none">
            <Edit3 size={16} />
          </div>
        </div>

        <div className="flex justify-center gap-4">
          {!isRecording ? (
            <button 
              onClick={startRecording}
              className="w-16 h-16 bg-soul-600 rounded-full flex items-center justify-center text-white shadow-lg hover:scale-105 transition-transform"
            >
              <Mic size={32} />
            </button>
          ) : (
            <button 
              onClick={stopRecording}
              className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center text-white shadow-lg animate-pulse"
            >
              <Square size={32} fill="currentColor" />
            </button>
          )}
        </div>
        <p className="text-sm font-semibold text-slate-400">
          {isRecording ? "Dinleniyor..." : audioBlob ? "Kayıt kaydedildi" : "Başlamak için mikrofona dokunun"}
        </p>

        {audioBlob && !isRecording && (
          <div className="flex justify-center gap-3">
             <button 
               onClick={() => {
                 const audio = new Audio(URL.createObjectURL(audioBlob));
                 audio.play();
               }}
               className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-colors"
             >
               <Play size={18} /> Oynat
             </button>
             <button 
               onClick={handleAnalysis}
               disabled={status === ProcessingStatus.PROCESSING}
               className="flex items-center gap-2 px-4 py-2 rounded-lg bg-soul-600 hover:bg-soul-700 text-white font-medium transition-colors"
             >
               {status === ProcessingStatus.PROCESSING ? <Loader2 className="animate-spin" size={18} /> : <RefreshCw size={18} />}
               Analiz Et
             </button>
          </div>
        )}
      </div>

      {feedback && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-soul-200 animate-fade-in text-left">
          <h3 className="font-bold text-lg text-slate-800 mb-2">Eğitmen Sol diyor ki:</h3>
          <div className="prose prose-sm text-slate-600">
            {feedback.split('\n').map((line, i) => <p key={i}>{line}</p>)}
          </div>
        </div>
      )}
    </div>
  );
};

export default SpeakingPractice;