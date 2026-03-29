import React, { useState } from 'react';
import { Activity, ArrowRight, Flame, Ghost, Mountain, SkipForward, Skull } from 'lucide-react';

export function StoryModal({
  onClose,
  onComplete,
}: {
  onClose: () => void;
  onComplete: () => void;
}) {
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    {
      title: 'THE GREAT ROT',
      text: 'Deep in the volcano, a dark rot is spreading. The jungle is dying, and the ancient spirits are silent.',
      icon: <Flame size={120} className="text-red-500 animate-pulse" />,
      color: 'bg-red-900/10',
    },
    {
      title: 'AGENT MONKEY',
      text: "You are the jungle's last hope. Agile, brave, and armed with the legendary Vine Gauntlets.",
      icon: <Ghost size={120} className="text-green-500" />,
      color: 'bg-green-900/10',
    },
    {
      title: 'THE MECHANICS',
      text: 'Hold E or hold click to latch, release to launch, use D to drive, A to brake and open the arc, W to lift, S to drop, and double click to extend the rope.',
      icon: <Activity size={120} className="text-yellow-500" />,
      color: 'bg-yellow-900/10',
    },
    {
      title: 'THE DANGERS',
      text: 'Avoid the void below. Watch out for spiders, birds, and unstable terrain as the biomes get harsher.',
      icon: <Skull size={120} className="text-gray-400" />,
      color: 'bg-gray-900/10',
    },
    {
      title: 'THE GOAL',
      text: 'Ascend through the biomes. Reach the Magma Core. Save the world.',
      icon: <Mountain size={120} className="text-purple-500" />,
      color: 'bg-purple-900/10',
    },
  ];

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide((value) => value + 1);
      return;
    }
    onComplete();
  };

  return (
    <div data-ui-control className="absolute inset-0 bg-black/90 z-[100] flex items-center justify-center p-4">
      <div className="max-w-4xl w-full bg-gray-900 border-4 border-gray-700 rounded-xl overflow-hidden shadow-2xl flex flex-col md:flex-row min-h-[500px] shadow-black/80">
        <div className={`flex-1 flex items-center justify-center p-12 ${slides[currentSlide].color} transition-colors duration-500`}>
          <div className="transform scale-125 drop-shadow-xl transition-all duration-500 animate-bounce-slow">
            {slides[currentSlide].icon}
          </div>
        </div>
        <div className="flex-1 p-8 md:p-12 flex flex-col bg-gray-800 relative justify-center">
          <div key={currentSlide} className="flex-1 flex flex-col justify-center animate-in slide-in-from-right-8 fade-in duration-500">
            <h2 className="text-5xl font-black text-white mb-6 font-mono tracking-tighter drop-shadow-lg">
              {slides[currentSlide].title}
            </h2>
            <p className="text-xl text-gray-300 leading-relaxed font-mono font-bold">
              {slides[currentSlide].text}
            </p>
          </div>
          <div className="flex justify-between items-center mt-8 pt-6 border-t-2 border-gray-700">
            <div className="flex gap-2">
              {slides.map((_, i) => (
                <div key={i} className={`w-3 h-3 rounded-full transition-colors ${i === currentSlide ? 'bg-white' : 'bg-gray-600'}`} />
              ))}
            </div>
            <div className="flex gap-4">
              <button onClick={onClose} className="px-4 py-2 text-gray-400 font-bold hover:text-white transition-colors flex items-center gap-1 text-sm">
                CLOSE <SkipForward size={14} />
              </button>
              <button onClick={handleNext} className="px-8 py-3 bg-white text-black font-bold rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2 text-lg shadow-lg">
                {currentSlide === slides.length - 1 ? 'BEGIN JOURNEY' : 'NEXT'} <ArrowRight size={20} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
