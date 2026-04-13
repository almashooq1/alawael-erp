/**
 * SidebarSearch — بحث في قائمة التنقل (Enhanced)
 * Glass input with animated focus ring
 */

export default function SidebarSearch({ collapsed, isMobile, searchQuery, onSearchChange, onClear }) {
  if (collapsed && !isMobile) {
    return (
      <div className="px-3 py-3 flex justify-center">
        <button
          className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/[0.04] border border-white/[0.06] cursor-pointer transition-all duration-200 hover:bg-green-700/15 hover:border-green-500/30 hover:shadow-glow-green-sm text-white/35 hover:text-green-400"
          title="بحث في القائمة"
        >
          <SearchIcon sx={{ fontSize: 16 }} />
        </button>
      </div>
    );
  }

  return (
    <div className="px-4 py-2.5">
      <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/[0.06] transition-all duration-300 focus-within:bg-green-900/15 focus-within:border-green-500/40 focus-within:shadow-[0_0_0_3px_rgba(46,125,50,0.08),0_0_20px_rgba(46,125,50,0.06)] group">
        <SearchIcon
          sx={{ fontSize: 15 }}
          className="text-white/25 flex-shrink-0 transition-colors duration-300 group-focus-within:text-green-400/60"
        />
        <input
          type="text"
          placeholder="ابحث في القائمة..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="flex-1 bg-transparent border-none outline-none text-[0.8rem] text-white/80 placeholder:text-white/20 p-0 font-cairo"
        />
        {searchQuery && (
          <button
            onClick={onClear}
            aria-label="مسح البحث"
            className="p-1 rounded-md text-white/30 hover:text-white/80 hover:bg-white/[0.08] transition-all cursor-pointer bg-transparent border-none"
          >
            <CloseIcon sx={{ fontSize: 12 }} />
          </button>
        )}
      </div>
    </div>
  );
}
