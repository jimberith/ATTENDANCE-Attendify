
import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";

const CampusGuide: React.FC = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{text: string, links: {title: string, uri: string}[]} | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => console.warn("Geolocation denied, using default search.")
      );
    }
  }, []);

  const handleSearch = async () => {
    if (!query.trim() || isLoading) return;
    setIsLoading(true);
    setResults(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: query,
        config: {
          tools: [{ googleMaps: {} }],
          toolConfig: {
            retrievalConfig: {
              latLng: location || { latitude: 37.78193, longitude: -122.40476 } // Default to SF if no location
            }
          }
        },
      });

      const text = response.text || "No results found.";
      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      const links = chunks
        .filter((c: any) => c.maps)
        .map((c: any) => ({
          title: c.maps.title,
          uri: c.maps.uri
        }));

      setResults({ text, links });
    } catch (error) {
      console.error("Maps search error:", error);
      setResults({ text: "Error searching campus information.", links: [] });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn pb-16">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-4xl font-black text-white tracking-tighter italic drop-shadow-lg uppercase">Campus Guide</h2>
          <p className="text-indigo-400 font-bold uppercase text-[10px] tracking-[0.3em] mt-1">
            <i className="fa-solid fa-location-dot mr-2"></i>
            AI-Powered Location Intelligence
          </p>
        </div>
      </div>

      <div className="glass-card p-10 rounded-[50px] shadow-2xl bg-white/95">
        <div className="max-w-2xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <h3 className="text-2xl font-black text-slate-800 tracking-tight">What are you looking for?</h3>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Find libraries, cafes, or study spots nearby</p>
          </div>

          <div className="relative group">
            <input 
              type="text" 
              placeholder="e.g. Best quiet library for studying" 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full px-10 py-6 bg-slate-100 rounded-[30px] border-2 border-transparent outline-none font-bold text-slate-900 focus:border-indigo-500 focus:bg-white transition-all text-sm shadow-inner"
            />
            <button 
              onClick={handleSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 bg-indigo-600 text-white px-8 py-3 rounded-[22px] font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-indigo-700 transition-all"
            >
              {isLoading ? <i className="fa-solid fa-circle-notch animate-spin"></i> : 'Discover'}
            </button>
          </div>

          {results && (
            <div className="space-y-6 animate-slideUp">
              <div className="p-8 bg-indigo-50/50 rounded-[40px] border border-indigo-100">
                <p className="text-sm font-medium text-slate-700 leading-relaxed whitespace-pre-wrap">
                  {results.text}
                </p>
              </div>

              {results.links.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Featured Locations</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {results.links.map((link, i) => (
                      <a 
                        key={i} 
                        href={link.uri} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center justify-between p-5 bg-white border border-slate-100 rounded-3xl hover:border-indigo-200 hover:shadow-lg transition-all group"
                      >
                        <span className="font-bold text-slate-800 text-xs">{link.title}</span>
                        <i className="fa-solid fa-arrow-up-right-from-square text-indigo-400 group-hover:text-indigo-600 transition-colors"></i>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {!results && !isLoading && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-10">
              <button onClick={() => {setQuery("Closest coffee shops"); handleSearch();}} className="p-4 bg-slate-50 rounded-2xl text-[10px] font-black text-slate-400 uppercase tracking-widest hover:bg-indigo-50 hover:text-indigo-600 transition-all">Coffee Shops</button>
              <button onClick={() => {setQuery("Public libraries nearby"); handleSearch();}} className="p-4 bg-slate-50 rounded-2xl text-[10px] font-black text-slate-400 uppercase tracking-widest hover:bg-indigo-50 hover:text-indigo-600 transition-all">Libraries</button>
              <button onClick={() => {setQuery("Parking areas on campus"); handleSearch();}} className="p-4 bg-slate-50 rounded-2xl text-[10px] font-black text-slate-400 uppercase tracking-widest hover:bg-indigo-50 hover:text-indigo-600 transition-all">Parking</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CampusGuide;
