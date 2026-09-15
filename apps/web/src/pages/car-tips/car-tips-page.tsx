'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/common/card';
import { Button } from '@/components/common/button';
import { useRouter } from 'next/navigation';
import { Search, ChevronRight, Clock, BookOpen, Star, X } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Modal } from '@/components/common/modal';

import { DashboardShell } from '@/components/home/dashboard-shell';
import { TopNavbar } from '@/components/home/top-navbar';

const mockAllTips = [
  { id: 1, title: 'How to check your engine oil level correctly', category: 'Maintenance', readTime: '3 min read', img: '/assets/engine_oil_bottle.png', color: 'text-orange-600', bg: 'bg-orange-50', author: 'WrectifAI Team', date: '05 Aug 2026', desc: 'A step-by-step guide on checking your engine oil level and understanding when it needs a top-up.', content: 'Checking your engine oil is one of the most fundamental car maintenance tasks. First, ensure your car is parked on level ground and the engine is cool. Locate the dipstick, pull it out, wipe it clean with a rag, and insert it fully back in. Pull it out again and check the oil level against the markings. If it is between the min and max lines, you are good to go! If it is below the min line, top it up immediately.' },
  { id: 2, title: 'Signs your brake pads need immediate replacement', category: 'Safety', readTime: '4 min read', img: '/assets/brake_disc_1778070670609.png', color: 'text-red-600', bg: 'bg-red-50', author: 'Alex Tech', date: '04 Aug 2026', desc: 'Squeaking? Grinding? Learn the telltale signs that your brake pads are worn out.', content: 'Your brakes are your car\'s most important safety feature. Look out for these signs: 1. Squealing or screeching noises when you apply the brakes. 2. A grinding sound, which usually means the pads are completely worn down. 3. Vibration in the steering wheel or brake pedal. 4. Taking longer to stop than usual. If you experience any of these, get your brakes checked immediately.' },
  { id: 3, title: 'Maximizing your car battery life in extreme weather', category: 'Electricals', readTime: '5 min read', img: '/assets/car_battery.png', color: 'text-green-600', bg: 'bg-green-50', author: 'Mike Mechanic', date: '03 Aug 2026', desc: 'Extreme heat and cold can destroy your battery. Here is how to protect it.', content: 'Extreme temperatures put a heavy strain on your car battery. In hot weather, battery fluid can evaporate faster. In cold weather, it takes more power to start the engine. To maximize battery life: Keep battery terminals clean and free of corrosion, ensure the battery is securely mounted, turn off all lights and electronics before turning off the engine, and consider a trickle charger if you don\'t drive often.' },
  { id: 4, title: 'When should you replace your windshield wipers?', category: 'Safety', readTime: '2 min read', img: '/assets/wiper_blade_1778070781712.png', author: 'WrectifAI Team', date: '02 Aug 2026', color: 'text-blue-600', bg: 'bg-blue-50', desc: 'A quick guide on identifying worn out wipers and replacing them for clear visibility.', content: 'Windshield wipers typically last 6 to 12 months. Signs they need replacing include streaking or skipping across the glass, squeaking noises, or visible cracks in the rubber. Replacing them is a simple DIY task: Lift the wiper arm, press the release tab, remove the old blade, and slide the new one until it clicks into place. Always test them with washer fluid after installation.' },
  { id: 5, title: 'Understanding tyre pressure and tread depth', category: 'Tyres & Wheels', readTime: '6 min read', img: '/assets/clean_tire.png', author: 'Alex Tech', date: '01 Aug 2026', color: 'text-purple-600', bg: 'bg-purple-50', desc: 'Learn why maintaining correct tyre pressure is crucial for your safety and fuel economy.', content: 'Proper tyre pressure ensures optimal handling, fuel efficiency, and tyre lifespan. Check your tyre pressure monthly when the tyres are cold. The recommended pressure is usually found on a sticker inside the driver\'s door jamb. For tread depth, use the penny test: Insert a penny into the tread with Lincoln\'s head upside down. If you can see the top of his head, your tread is too low and it\'s time for new tyres.' },
  { id: 6, title: 'The importance of regular AC servicing', category: 'Maintenance', readTime: '4 min read', img: '/assets/ac_vent_1778070688367.png', author: 'WrectifAI Team', date: '28 Jul 2026', color: 'text-teal-600', bg: 'bg-teal-50', desc: 'Don\'t wait for summer to fail you. Here\'s why regular AC checks save you money.', content: 'A car\'s AC system loses about 5% of its efficiency every year without maintenance. Regular servicing involves checking refrigerant levels, inspecting belts and hoses, and cleaning the condenser. A common issue is a musty smell, indicating mold in the evaporator, which requires an antibacterial treatment. Get your AC serviced annually before summer starts to ensure it blows ice-cold air when you need it most.' },
  { id: 7, title: 'Engine Coolant: What it does and when to flush', category: 'Engine & Performance', readTime: '5 min read', img: '/assets/oil_pour_1778070767058.png', author: 'Mike Mechanic', date: '25 Jul 2026', color: 'text-orange-600', bg: 'bg-orange-50', desc: 'Prevent engine overheating by understanding the role of your engine coolant.', content: 'Engine coolant, or antifreeze, regulates engine temperature and prevents overheating or freezing. Over time, coolant degrades and can become acidic, causing corrosion. A coolant flush replaces the old fluid, removes scale and rust deposits, and restores the cooling system\'s efficiency. Most manufacturers recommend flushing the coolant every 30,000 to 50,000 miles, but always check your owner\'s manual for specific intervals.' },
  { id: 8, title: 'How to safely jump-start a dead battery', category: 'DIY Fixes', readTime: '4 min read', img: '/assets/car_battery.png', color: 'text-green-600', bg: 'bg-green-50', author: 'Alex Tech', date: '20 Jul 2026', desc: 'Don\'t get stranded. Learn the safe and correct way to jump-start your car.', content: 'To safely jump-start a car: 1. Park the working car near the dead one, turn off both engines. 2. Connect one RED clamp to the positive (+) terminal of the dead battery. 3. Connect the other RED clamp to the positive (+) terminal of the good battery. 4. Connect one BLACK clamp to the negative (-) terminal of the good battery. 5. Connect the last BLACK clamp to an unpainted metal surface on the dead car\'s engine block. 6. Start the good car, wait a few minutes, then start the dead car. Remove cables in reverse order.' },
];

const CATEGORIES = ['All', 'Maintenance', 'Safety', 'Engine & Performance', 'Tyres & Wheels', 'Electricals', 'DIY Fixes'];

export function CarTipsPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedArticle, setSelectedArticle] = useState<any>(null);

  useEffect(() => {
    const handleSearch = (e: CustomEvent) => setSearchQuery(e.detail);
    window.addEventListener('dashboard-search', handleSearch as EventListener);
    return () => window.removeEventListener('dashboard-search', handleSearch as EventListener);
  }, []);

  const filteredTips = mockAllTips.filter(tip => {
    const matchesSearch = tip.title.toLowerCase().includes(searchQuery.toLowerCase()) || tip.desc.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || tip.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const featuredTips = mockAllTips.slice(0, 3);
  const latestTips = filteredTips.filter(tip => !featuredTips.some(ft => ft.id === tip.id) || searchQuery || selectedCategory !== 'All');

  const getCategoryCount = (cat: string) => {
    if (cat === 'All') return mockAllTips.length;
    return mockAllTips.filter(tip => tip.category === cat).length;
  };

  return (
    <DashboardShell header={<TopNavbar />}>
      <div className="flex flex-col lg:flex-row gap-6 p-4">
        {/* Main Content */}
        <div className="flex-1 space-y-6">
          <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 mb-1">Car Tips & Guides</h1>
              <p className="text-slate-500 text-sm">Expert advice to keep your vehicle in top condition</p>
            </div>
          </div>
          
          {searchQuery && (
            <div className="text-sm font-medium text-slate-600">
              Searching articles for: <span className="text-blue-600 bg-blue-50 px-2 py-1 rounded">&quot;{searchQuery}&quot;</span>
            </div>
          )}

          {/* Featured Tips Row */}
          {!searchQuery && selectedCategory === 'All' && (
            <div>
              <h3 className="font-bold text-slate-900 mb-4 flex items-center"><Star className="w-4 h-4 mr-2 text-amber-500 fill-current" /> Must Read</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {featuredTips.map((tip) => (
                  <Card key={tip.id} onClick={() => setSelectedArticle(tip)} className="p-0 overflow-hidden group cursor-pointer hover:shadow-md transition-all border-slate-100 flex flex-col h-full rounded-[20px]">
                    <div className={cn("h-32 flex items-center justify-center p-4 relative overflow-hidden", tip.bg)}>
                       <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent"></div>
                       <Image src={tip.img} alt={tip.title} width={100} height={100} className="object-contain group-hover:scale-110 transition-transform relative z-10" />
                    </div>
                    <div className="p-4 flex flex-col flex-1 bg-white">
                      <div className="flex items-center justify-between mb-2">
                         <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded", tip.bg, tip.color)}>{tip.category}</span>
                         <span className="flex items-center text-[10px] text-slate-500 font-medium"><Clock className="w-3 h-3 mr-1"/> {tip.readTime}</span>
                      </div>
                      <h4 className="font-bold text-slate-900 text-sm mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">{tip.title}</h4>
                      <div className="mt-auto pt-3 flex items-center text-xs font-bold text-blue-600">
                         Read Article <ChevronRight className="w-3 h-3 ml-1 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Latest Articles List */}
          <div>
            <h3 className="font-bold text-slate-900 mb-4">{searchQuery || selectedCategory !== 'All' ? 'Search Results' : 'Latest Articles'}</h3>
            {latestTips.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-[20px] border border-slate-100 shadow-sm">
                 <BookOpen className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                 <p className="text-slate-500 font-medium">No articles found matching your criteria</p>
                 <button onClick={() => { setSearchQuery(''); setSelectedCategory('All'); }} className="text-blue-600 text-sm mt-2 hover:underline font-semibold">Clear filters</button>
              </div>
            ) : (
              <div className="space-y-4">
                {latestTips.map((tip) => (
                  <Card key={tip.id} onClick={() => setSelectedArticle(tip)} className="p-4 sm:p-5 flex flex-col sm:flex-row gap-5 cursor-pointer hover:border-blue-200 transition-colors group rounded-[20px] border-slate-100 shadow-sm bg-white">
                    <div className={cn("w-full sm:w-32 h-32 sm:h-24 rounded-xl flex items-center justify-center shrink-0 border border-slate-100 p-2 relative overflow-hidden", tip.bg)}>
                       <Image src={tip.img} alt={tip.title} width={80} height={80} className="object-contain group-hover:scale-110 transition-transform" />
                    </div>
                    <div className="flex-1 flex flex-col">
                      <div className="flex flex-wrap items-center gap-3 mb-2">
                        <span className={cn("px-2 py-0.5 text-[10px] font-bold rounded", tip.bg, tip.color)}>{tip.category}</span>
                        <span className="text-[11px] text-slate-400 font-medium flex items-center"><Clock className="w-3 h-3 mr-1"/> {tip.readTime}</span>
                      </div>
                      <h4 className="font-bold text-slate-900 mb-1 group-hover:text-blue-600 transition-colors line-clamp-1">{tip.title}</h4>
                      <p className="text-xs text-slate-500 line-clamp-2 mb-3">{tip.desc}</p>
                      
                      <div className="mt-auto flex items-center justify-between">
                         <div className="flex items-center gap-2">
                           <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-[8px] font-bold text-slate-600">
                             {tip.author.charAt(0)}
                           </div>
                           <span className="text-[11px] font-medium text-slate-700">{tip.author}</span>
                           <span className="text-slate-300 mx-1">•</span>
                           <span className="text-[11px] text-slate-500">{tip.date}</span>
                         </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-full lg:w-[300px] space-y-6">
          <Card className="p-5 shadow-sm border-slate-100 rounded-[20px] bg-gradient-to-br from-blue-900 to-blue-800 text-white relative overflow-hidden">
             <div className="relative z-10">
               <h3 className="font-bold mb-2">Got a Car Problem?</h3>
               <p className="text-xs text-blue-100 mb-5">Try our AI diagnostic tool to find out what&apos;s wrong with your vehicle instantly.</p>
               <Button onClick={() => router.push('/ai-diagnose')} className="w-full bg-white text-blue-900 hover:bg-blue-50 font-bold shadow-sm">Diagnose Issue</Button>
             </div>
             <div className="absolute -right-4 -bottom-4 opacity-10 w-32 h-32">
                <Image src="/assets/Robo_icon.png" alt="AI" width={128} height={128} className="object-contain" />
             </div>
          </Card>

          <Card className="p-5 shadow-sm border-slate-100 rounded-[20px] bg-white">
            <h3 className="font-bold text-slate-900 mb-4">Categories</h3>
            <div className="space-y-1 text-sm font-medium">
               {CATEGORIES.map((cat) => (
                 <button 
                   key={cat} 
                   onClick={() => setSelectedCategory(cat)}
                   className={cn(
                     "w-full flex items-center justify-between p-2.5 rounded-xl transition-colors group",
                     selectedCategory === cat ? "bg-blue-50 text-blue-700" : "hover:bg-slate-50 text-slate-600"
                   )}
                 >
                    <span>{cat}</span>
                    <span className={cn(
                      "text-[10px] px-2.5 py-0.5 rounded-full transition-colors",
                      selectedCategory === cat ? "bg-blue-200 text-blue-800" : "bg-slate-100 text-slate-500 group-hover:bg-slate-200"
                    )}>
                      {getCategoryCount(cat)}
                    </span>
                 </button>
               ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Read Article Modal */}
      <Modal isOpen={!!selectedArticle} onClose={() => setSelectedArticle(null)} title={selectedArticle?.title || 'Article'}>
        {selectedArticle && (
          <div className="space-y-6">
            <div className={cn("w-full h-48 md:h-64 rounded-xl flex items-center justify-center relative overflow-hidden", selectedArticle.bg)}>
              <Image src={selectedArticle.img} alt={selectedArticle.title} width={180} height={180} className="object-contain relative z-10" />
            </div>
            
            <div>
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <span className={cn("px-2.5 py-1 text-xs font-bold rounded", selectedArticle.bg, selectedArticle.color)}>{selectedArticle.category}</span>
                <span className="text-xs text-slate-500 font-medium flex items-center"><Clock className="w-3.5 h-3.5 mr-1"/> {selectedArticle.readTime}</span>
                <span className="text-slate-300 mx-1">•</span>
                <span className="text-xs text-slate-500 font-medium">{selectedArticle.date}</span>
              </div>
              
              <h2 className="text-2xl font-bold text-slate-900 mb-4">{selectedArticle.title}</h2>
              
              <div className="flex items-center gap-2 mb-6 p-3 bg-slate-50 rounded-lg border border-slate-100">
                 <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">
                   {selectedArticle.author.charAt(0)}
                 </div>
                 <div>
                   <p className="text-xs text-slate-500 font-medium">Written by</p>
                   <p className="text-sm font-bold text-slate-900">{selectedArticle.author}</p>
                 </div>
              </div>
              
              <div className="prose prose-slate max-w-none text-sm text-slate-700 leading-relaxed">
                <p className="font-semibold text-slate-900 mb-4 text-base">{selectedArticle.desc}</p>
                <p>{selectedArticle.content}</p>
                
                <h4 className="mt-6 mb-2 text-slate-900 font-bold">Key Takeaways</h4>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Regular maintenance extends vehicle lifespan</li>
                  <li>Always check manufacturer specifications</li>
                  <li>If unsure, consult a professional mechanic</li>
                </ul>
              </div>
            </div>
            
            <div className="pt-6 border-t border-slate-100 flex gap-3">
              <Button className="flex-1 bg-slate-100 text-slate-700 hover:bg-slate-200" onClick={() => setSelectedArticle(null)}>Close Article</Button>
              <Button className="flex-1 bg-blue-600 text-white" onClick={() => { setSelectedArticle(null); router.push('/ai-diagnose'); }}>Diagnose an Issue</Button>
            </div>
          </div>
        )}
      </Modal>
    </DashboardShell>
  );
}

export default CarTipsPage;
