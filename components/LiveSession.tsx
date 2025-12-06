import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Mic, MicOff, Video, VideoOff, Phone, Activity, MessageSquare } from 'lucide-react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { float32ToPcm16Blob, decodeAudioData, decode } from '../services/audioUtils';

interface Transcript {
  id: string;
  speaker: 'user' | 'model';
  text: string;
}

const LiveSession: React.FC = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);
  const [status, setStatus] = useState<string>("Bağlanmaya hazır");
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  
  // Refs for Audio Contexts and Session
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const videoIntervalRef = useRef<number | null>(null);
  
  // Refs for transcription buffering
  const inputBufferRef = useRef('');
  const outputBufferRef = useRef('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of transcript
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcripts]);

  // Initialize Audio Contexts
  const initAudio = useCallback(() => {
    const AudioContextPolyfill = window.AudioContext || (window as any).webkitAudioContext;
    if (!inputAudioContextRef.current) {
      inputAudioContextRef.current = new AudioContextPolyfill({ sampleRate: 16000 });
    }
    if (!outputAudioContextRef.current) {
      outputAudioContextRef.current = new AudioContextPolyfill({ sampleRate: 24000 });
    }
  }, []);

  const connectToLive = async () => {
    try {
      setStatus("Bağlanıyor...");
      // Reset state
      setTranscripts([]);
      inputBufferRef.current = '';
      outputBufferRef.current = '';

      initAudio();
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      // Get User Media
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: true, 
        video: isVideoEnabled 
      });
      mediaStreamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      // Connect to Gemini Live
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            setStatus("Bağlandı");
            setIsConnected(true);
            setupAudioInput(stream);
            if (isVideoEnabled) setupVideoInput();
          },
          onmessage: async (message: LiveServerMessage) => {
            handleServerMessage(message);
          },
          onclose: () => {
            setStatus("Bağlantı kesildi");
            setIsConnected(false);
          },
          onerror: (err) => {
            console.error(err);
            setStatus("Hata: " + err.type);
            disconnect();
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {}, // Enable transcription for user input
          outputAudioTranscription: {}, // Enable transcription for model output
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
          },
          systemInstruction: 'Sen Sol adında arkadaş canlısı bir dil öğretmenisin. Kullanıcıların konuşma pratiği yapmasına yardımcı oluyorsun. Hata yaparlarsa nazikçe düzelt. Genellikle kullanıcının pratik yaptığı dilde konuşmalısın, ancak gerekirse kavramları Türkçe olarak açıklayabilirsin.',
        },
      });
      
      sessionPromiseRef.current = sessionPromise;

    } catch (error) {
      console.error("Connection failed", error);
      setStatus("Bağlantı Başarısız");
    }
  };

  const setupAudioInput = (stream: MediaStream) => {
    if (!inputAudioContextRef.current) return;
    
    const source = inputAudioContextRef.current.createMediaStreamSource(stream);
    const processor = inputAudioContextRef.current.createScriptProcessor(4096, 1, 1);
    
    processor.onaudioprocess = (e) => {
      if (isMuted) return;
      
      const inputData = e.inputBuffer.getChannelData(0);
      const pcmBlob = float32ToPcm16Blob(inputData, 16000);
      
      sessionPromiseRef.current?.then(session => {
        session.sendRealtimeInput({ media: pcmBlob });
      });
    };

    source.connect(processor);
    processor.connect(inputAudioContextRef.current.destination);
  };

  const setupVideoInput = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    videoIntervalRef.current = window.setInterval(() => {
        if (!videoRef.current || !canvasRef.current || !ctx) return;
        
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        ctx.drawImage(videoRef.current, 0, 0);
        
        const base64Data = canvasRef.current.toDataURL('image/jpeg', 0.8).split(',')[1];
        
        sessionPromiseRef.current?.then(session => {
          session.sendRealtimeInput({
            media: {
              mimeType: 'image/jpeg',
              data: base64Data
            }
          });
        });
    }, 1000); // 1 FPS for video to save bandwidth/tokens
  };

  const handleServerMessage = async (message: LiveServerMessage) => {
    // Handle Transcription
    const serverContent = message.serverContent;
    if (serverContent) {
      if (serverContent.inputTranscription?.text) {
        inputBufferRef.current += serverContent.inputTranscription.text;
      }
      if (serverContent.outputTranscription?.text) {
        outputBufferRef.current += serverContent.outputTranscription.text;
      }

      if (serverContent.turnComplete) {
        const newItems: Transcript[] = [];
        if (inputBufferRef.current.trim()) {
          newItems.push({ id: Date.now() + '-user', speaker: 'user', text: inputBufferRef.current.trim() });
          inputBufferRef.current = '';
        }
        if (outputBufferRef.current.trim()) {
          newItems.push({ id: Date.now() + '-model', speaker: 'model', text: outputBufferRef.current.trim() });
          outputBufferRef.current = '';
        }
        
        if (newItems.length > 0) {
          setTranscripts(prev => [...prev, ...newItems]);
        }
      }
    }

    // Handle Audio Output
    if (!outputAudioContextRef.current) return;

    const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      const ctx = outputAudioContextRef.current;
      nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
      
      const audioBuffer = await decodeAudioData(
        decode(base64Audio),
        ctx,
        24000
      );

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      source.start(nextStartTimeRef.current);
      nextStartTimeRef.current += audioBuffer.duration;
    }
  };

  const disconnect = () => {
    sessionPromiseRef.current?.then(session => session.close());
    sessionPromiseRef.current = null;
    
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
    }
    
    if (videoIntervalRef.current) {
      clearInterval(videoIntervalRef.current);
    }

    setIsConnected(false);
    setStatus("Bağlanmaya hazır");
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[600px]">
      <div className="flex-1 bg-slate-900 relative flex flex-col items-center justify-center p-4 overflow-hidden">
        {/* Video Preview or Placeholder */}
        <video 
          ref={videoRef} 
          muted 
          autoPlay 
          className={`absolute inset-0 w-full h-full object-cover opacity-50 ${!isVideoEnabled ? 'hidden' : ''}`} 
        />
        <canvas ref={canvasRef} className="hidden" />

        {/* Transcript Overlay */}
        {transcripts.length > 0 && (
           <div className="absolute inset-0 z-20 p-4 overflow-y-auto space-y-4 bg-slate-900/60 backdrop-blur-sm">
             {transcripts.map((t) => (
                <div key={t.id} className={`flex ${t.speaker === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] p-3 rounded-2xl text-sm shadow-sm animate-fade-in ${
                      t.speaker === 'user' 
                        ? 'bg-soul-600 text-white rounded-tr-sm' 
                        : 'bg-white text-slate-900 rounded-tl-sm'
                    }`}>
                      <p className="font-bold text-xs mb-1 opacity-75">{t.speaker === 'user' ? 'Siz' : 'Sol'}</p>
                      {t.text}
                    </div>
                </div>
             ))}
             <div ref={scrollRef} />
           </div>
        )}

        {/* Status Center (Only show if empty chat) */}
        {transcripts.length === 0 && (
          <div className="z-10 text-center space-y-4 relative">
            <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto ${isConnected ? 'bg-soul-500 animate-pulse' : 'bg-slate-700'}`}>
              <Activity className="text-white" size={48} />
            </div>
            <h2 className="text-white text-xl font-semibold">{status}</h2>
            {isConnected && <p className="text-slate-300">Sol ile konuşuluyor...</p>}
          </div>
        )}
      </div>

      <div className="bg-slate-50 p-6 border-t z-30">
        <div className="flex justify-center items-center gap-6">
          <button 
            onClick={() => setIsMuted(!isMuted)}
            className={`p-4 rounded-full transition-colors ${isMuted ? 'bg-red-100 text-red-600' : 'bg-white shadow-sm hover:bg-slate-100 text-slate-700'}`}
          >
            {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
          </button>

          {!isConnected ? (
            <button 
              onClick={connectToLive}
              className="bg-soul-600 hover:bg-soul-700 text-white px-8 py-4 rounded-full font-bold shadow-lg transform transition hover:scale-105 flex items-center gap-2"
            >
              <Phone size={24} fill="currentColor" />
              Aramayı Başlat
            </button>
          ) : (
             <button 
              onClick={disconnect}
              className="bg-red-500 hover:bg-red-600 text-white px-8 py-4 rounded-full font-bold shadow-lg transform transition hover:scale-105 flex items-center gap-2"
            >
              <Phone size={24} className="rotate-[135deg]" fill="currentColor" />
              Aramayı Bitir
            </button>
          )}

          <button 
            onClick={() => {
              setIsVideoEnabled(!isVideoEnabled);
              if (isConnected) {
                alert("Görüntü ayarlarını değiştirmek için lütfen tekrar bağlanın.");
              }
            }}
            className={`p-4 rounded-full transition-colors ${!isVideoEnabled ? 'bg-slate-200 text-slate-400' : 'bg-white shadow-sm hover:bg-slate-100 text-soul-600'}`}
          >
            {isVideoEnabled ? <Video size={24} /> : <VideoOff size={24} />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LiveSession;