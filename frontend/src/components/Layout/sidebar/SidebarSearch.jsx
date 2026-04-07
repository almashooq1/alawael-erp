/**
 * SidebarSearch — بحث في قائمة التنقل (Tailwind)
 */
import { Search as SearchIcon, Close as CloseIcon } from '@mui/icons-material';

const SidebarSearch = ({ collapsed, isMobile, searchQuery, onSearchChange, onClear }) => {
  if (collapsed && !isMobile) {
    return (
      <div className="px-3 py-3 flex justify-center">
        <div
          className="w-[38px] h-[38px] rounded-[10px] flex items-center justify-center bg-white/5 border border-white/[0.07] cursor-pointer transition-all duration-200 hover:bg-green-800/20 hover:border-green-600/40"
          title="بحث في القائمة"
        >
          <SearchIcon sx={{ fontSize: 16, color: 'rgba(255,255,255,0.4)' }} />
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-3">
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-[10px] bg-white/[0.055] border border-white/[0.07] transition-all duration-200 focus-within:bg-green-900/20 focus-within:border-green-600/50 focus-within:shadow-[0_0_0_3px_rgba(46,125,50,0.12)]">
        <SearchIcon sx={{ fontSize: 15 }} className="text-white/35 flex-shrink-0" />
        <input
          type="text"
          placeholder="ابحث في القائمة..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="flex-1 bg-transparent border-none outline-none text-[0.79rem] text-white/80 placeholder:text-white/25 placeholder:text-[0.79rem] p-0 font-cairo"
        />
        {searchQuery && (
          <button
            onClick={onClear}
            aria-label="مسح البحث"
            className="p-0.5 rounded text-white/35 hover:text-white/80 hover:bg-white/[0.08] transition-all cursor-pointer bg-transparent border-none"
          >
            <CloseIcon sx={{ fontSize: 13 }} />
          </button>
        )}
      </div>
    </div>
  );
};

export default SidebarSearch;
