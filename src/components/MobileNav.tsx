import { CalendarDays, Cloud, HardDrive, Home, ListTodo, Plus, User } from 'lucide-react';

export type MobileTab = 'beranda' | 'kalender' | 'jadwal' | 'profil';

interface MobileNavProps {
  activeTab: MobileTab;
  onSelectTab: (tab: MobileTab) => void;
  onAddSchedule: () => void;
  isLocalMode: boolean;
}

export function MobileTopBar({
  isLocalMode,
  isFirebaseAvailable,
  onOpenAuth,
}: {
  isLocalMode: boolean;
  isFirebaseAvailable: boolean;
  onOpenAuth: () => void;
}) {
  return (
    <header className="lg:hidden sticky top-0 z-30 h-13 px-4 bg-[#FAF9F6]/90 backdrop-blur-md border-b border-slate-200/70 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 min-w-0">
        <div className="w-8 h-8 rounded-xl bg-[#E8DFF5] border border-[#DDD6FE] flex items-center justify-center shrink-0">
          <svg viewBox="0 0 32 32" className="w-5 h-5" aria-hidden="true">
            <rect x="4" y="6" width="24" height="21" rx="6" fill="#FFFFFF" stroke="#5B21B6" strokeWidth="2" />
            <path d="M4 12.5h24" stroke="#5B21B6" strokeWidth="2" />
            <path
              d="M16 15.5l1.1 2.2 2.4.3-1.7 1.7.4 2.4-2.2-1.1-2.2 1.1.4-2.4-1.7-1.7 2.4-.3z"
              fill="#EC4899"
            />
          </svg>
        </div>
        <span className="text-base font-extrabold text-[#2D3748] font-display truncate">
          My Schedule
        </span>
      </div>

      {isLocalMode && isFirebaseAvailable ? (
        <button
          type="button"
          onClick={onOpenAuth}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-bold shrink-0 whitespace-nowrap bg-[#FFF8E7] hover:bg-[#FEF3C7] text-amber-800 border border-[#FDE68A] cursor-pointer"
        >
          <HardDrive className="w-3.5 h-3.5" />
          <span>Local · Sync Cloud</span>
        </button>
      ) : (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold shrink-0 whitespace-nowrap ${
            isLocalMode
              ? 'bg-[#FFF8E7] text-amber-800 border border-[#FDE68A]'
              : 'bg-[#E2ECE9] text-[#065F46] border border-[#B7E1D5]'
          }`}
        >
          {isLocalMode ? <HardDrive className="w-3.5 h-3.5" /> : <Cloud className="w-3.5 h-3.5" />}
          <span>{isLocalMode ? 'Local Mode' : 'Cloud Synced'}</span>
        </span>
      )}
    </header>
  );
}

export default function MobileNav({
  activeTab,
  onSelectTab,
  onAddSchedule,
}: MobileNavProps) {
  const tabs: Array<{ id: MobileTab; label: string; icon: typeof Home }> = [
    { id: 'beranda', label: 'Beranda', icon: Home },
    { id: 'kalender', label: 'Kalender', icon: CalendarDays },
    { id: 'jadwal', label: 'Jadwal', icon: ListTodo },
    { id: 'profil', label: 'Profil', icon: User },
  ];

  return (
    <>
      {/* Floating Action Button (Mobile & Tablet) */}
      <button
        type="button"
        onClick={onAddSchedule}
        aria-label="Tambah Jadwal Baru"
        className="lg:hidden fixed right-4 bottom-20 z-40 h-13 px-4 rounded-2xl bg-[#2D3748] hover:bg-[#1E293B] text-white shadow-[0_10px_28px_rgba(45,55,72,0.28)] flex items-center gap-2 font-bold text-sm active:scale-95 transition-transform cursor-pointer"
      >
        <Plus className="w-5 h-5" />
        <span>Tambah</span>
      </button>

      {/* Fixed Bottom Navigation Bar */}
      <nav
        aria-label="Navigasi Mobile"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 h-16 bg-white/95 backdrop-blur-md border-t border-slate-200/80 grid grid-cols-4 items-center px-2"
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelectTab(tab.id)}
              className={`min-h-[44px] flex flex-col items-center justify-center gap-0.5 rounded-xl transition-colors cursor-pointer ${
                active ? 'text-[#5B21B6]' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <Icon className={`w-5 h-5 ${active ? 'stroke-[2.5]' : ''}`} />
              <span className="text-[11px] font-bold tracking-tight">{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
