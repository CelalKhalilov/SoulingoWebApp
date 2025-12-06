import React, { useState } from 'react';
import { BookOpen, Sparkles, Loader2, CheckCircle } from 'lucide-react';
import { generateLesson } from '../services/genai';
import { LessonPlan, ProcessingStatus } from '../types';

const LessonGenerator: React.FC = () => {
  const [topic, setTopic] = useState('');
  const [language, setLanguage] = useState('İngilizce');
  const [level, setLevel] = useState('Başlangıç');
  const [status, setStatus] = useState<ProcessingStatus>(ProcessingStatus.IDLE);
  const [lesson, setLesson] = useState<LessonPlan | null>(null);

  const handleGenerate = async () => {
    if (!topic) return;
    try {
      setStatus(ProcessingStatus.PROCESSING);
      const result = await generateLesson(language, level, topic);
      setLesson(result);
      setStatus(ProcessingStatus.COMPLETE);
    } catch (e) {
      console.error(e);
      setStatus(ProcessingStatus.ERROR);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-slate-800">Dersinizi Oluşturun</h1>
        <p className="text-slate-600">Ne öğrenmek istediğinizi söyleyin, yapay zeka sizin için bir plan oluştursun.</p>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Dil</label>
            <select 
              value={language} 
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full p-2 border rounded-lg bg-slate-50"
            >
              <option value="İngilizce">İngilizce</option>
              <option value="İspanyolca">İspanyolca</option>
              <option value="Fransızca">Fransızca</option>
              <option value="Japonca">Japonca</option>
              <option value="Almanca">Almanca</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Seviye</label>
            <select 
               value={level} 
               onChange={(e) => setLevel(e.target.value)}
               className="w-full p-2 border rounded-lg bg-slate-50"
            >
              <option value="Başlangıç">Başlangıç</option>
              <option value="Orta">Orta</option>
              <option value="İleri">İleri</option>
            </select>
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">Konu / İlgi Alanı</label>
          <input 
            type="text" 
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="örn. Kahve siparişi vermek, İş toplantısı, Yol tarifi"
            className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-soul-500 outline-none"
          />
        </div>

        <button 
          onClick={handleGenerate}
          disabled={status === ProcessingStatus.PROCESSING || !topic}
          className="w-full bg-soul-600 text-white py-3 rounded-xl font-bold hover:bg-soul-700 disabled:opacity-50 transition-all flex justify-center items-center gap-2"
        >
          {status === ProcessingStatus.PROCESSING ? <Loader2 className="animate-spin" /> : <Sparkles size={20} />}
          Ders Planı Oluştur
        </button>
      </div>

      {lesson && (
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden animate-fade-in">
          <div className="bg-soul-50 p-6 border-b border-soul-100">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-bold text-soul-800">{lesson.title}</h2>
                <span className="inline-block mt-1 px-3 py-1 bg-white text-soul-600 text-xs font-bold rounded-full border border-soul-200">
                  {lesson.level}
                </span>
              </div>
              <BookOpen className="text-soul-400" size={32} />
            </div>
          </div>

          <div className="p-6 space-y-6">
            <div>
              <h3 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
                <CheckCircle size={18} className="text-soul-500" /> Kelime Bilgisi
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {lesson.vocabulary.map((word, i) => (
                  <div key={i} className="bg-slate-50 p-2 rounded-lg border text-slate-700 text-sm">{word}</div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-bold text-slate-800 mb-3">Diyalog</h3>
              <div className="space-y-3">
                {lesson.dialogue.map((line, i) => (
                  <div key={i} className={`flex ${line.speaker === 'A' ? 'justify-start' : 'justify-end'}`}>
                    <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${
                      line.speaker === 'A' 
                        ? 'bg-slate-100 text-slate-800 rounded-tl-none' 
                        : 'bg-soul-500 text-white rounded-tr-none'
                    }`}>
                      <span className="block text-xs font-bold opacity-70 mb-1">{line.speaker}</span>
                      {line.text}
                    </div>
                  </div>
                ))}
              </div>
            </div>

             <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-100">
              <h3 className="text-sm font-bold text-yellow-800 mb-1">Uzman İpucu</h3>
              <p className="text-sm text-yellow-700">{lesson.tips}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LessonGenerator;