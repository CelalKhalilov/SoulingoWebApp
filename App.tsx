import React, { useState } from 'react';
import { 
  MessageSquare, 
  Video, 
  Image as ImageIcon, 
  BookOpen, 
  Mic, 
  Menu, 
  X, 
  UserCircle 
} from 'lucide-react';
import LiveSession from './components/LiveSession';
import VeoStudio from './components/VeoStudio';
import SmartImageEditor from './components/SmartImageEditor';
import LessonGenerator from './components/LessonGenerator';
import SpeakingPractice from './components/SpeakingPractice';

enum View {
  LESSON = 'LESSON',
  LIVE = 'LIVE',
  VEO = 'VEO',
  IMAGE = 'IMAGE',
  PRACTICE = 'PRACTICE'
}

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>(View.LESSON);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { id: View.LESSON, label: 'Ders Planı', icon: BookOpen },
    { id: View.PRACTICE, label: 'Konuşma Pratiği', icon: Mic },
    { id: View.LIVE, label: 'Canlı Eğitmen', icon: MessageSquare },
    { id: View.VEO, label: 'Video Stüdyosu', icon: Video },
    { id: View.IMAGE, label: 'Akıllı Editör', icon: ImageIcon },
  ];

  const renderContent = () => {
    switch (currentView) {
      case View.LIVE: return <LiveSession />;
      case View.VEO: return <VeoStudio />;
      case View.IMAGE: return <SmartImageEditor />;
      case View.LESSON: return <LessonGenerator />;
      case View.PRACTICE: return <SpeakingPractice />;
      default: return <LessonGenerator />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50">
      {/* Mobile Header */}
      <div className="md:hidden bg-white border-b p-4 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-2 font-bold text-xl text-soul-600">
          <div className="w-8 h-8 bg-soul-500 rounded-lg flex items-center justify-center text-white">S</div>
          Soulingo
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
          {isMobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Sidebar Navigation */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-white border-r transform transition-transform duration-200 ease-in-out
        md:relative md:translate-x-0
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6 border-b flex items-center gap-2 font-bold text-2xl text-soul-600">
           <div className="w-10 h-10 bg-soul-500 rounded-xl flex items-center justify-center text-white shadow-sm">S</div>
           Soulingo
        </div>
        
        <nav className="p-4 space-y-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setCurrentView(item.id);
                setIsMobileMenuOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${
                currentView === item.id 
                  ? 'bg-soul-50 text-soul-700 shadow-sm border border-soul-100' 
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <item.icon size={20} />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="absolute bottom-0 w-full p-4 border-t bg-slate-50">
          <div className="flex items-center gap-3">
            <UserCircle className="text-slate-400" size={32} />
            <div>
              <p className="text-sm font-semibold text-slate-700">Dil Öğrencisi</p>
              <p className="text-xs text-slate-500">Ücretsiz Plan</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto h-[calc(100vh-64px)] md:h-screen">
        <div className="max-w-4xl mx-auto">
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default App;