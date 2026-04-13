/**
 * SidebarNavList — قائمة التنقل الاحترافية (Enhanced)
 * Section titles, parent items (expandable), child items, collapsed tooltips, micro-animations
 */
import { useState, useCallback, useMemo, memo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ExpandMore as ExpandMoreIcon } from '@mui/icons-material';

/* ─── Tooltip for collapsed mode ─────────────────────────────────────────── */
function CollapsedTooltip({ label, children }) {
  return (
    <div className="relative group/tip">
      {children}
      <div className="pointer-events-none absolute right-full top-1/2 -translate-y-1/2 mr-3 opacity-0 group-hover/tip:opacity-100 transition-all duration-200 group-hover/tip:translate-x-0 translate-x-2 z-[9999]">
        <div className="px-3 py-1.5 rounded-lg bg-navy-900 border border-white/10 text-[0.75rem] text-white font-medium whitespace-nowrap shadow-xl">
          {label}
          <div className="absolute left-full top-1/2 -translate-y-1/2 border-4 border-transparent border-l-navy-900" />
        </div>
      </div>
    </div>
  );
}

/* ─── Child nav item ─────────────────────────────────────────────────────── */
const ChildNavItem = memo(function ChildNavItem({ item, collapsed }) {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive =
    location.pathname === item.path ||
    (item.path && item.path !== '/' && location.pathname.startsWith(item.path));

  const badgeCls =
    item.badgeColor === 'success'
      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20'
      : item.badgeColor === 'warning'
      ? 'bg-amber-500/15 text-amber-300 border-amber-500/20'
      : 'bg-rose-500/15 text-rose-300 border-rose-500/20';

  const inner = (
    <button
      onClick={() => item.path && navigate(item.path)}
      className={`w-[calc(100%-12px)] mx-1.5 mb-px flex items-center gap-2.5 rounded-lg min-h-[36px] border-none font-cairo cursor-pointer transition-all duration-200 group/child ${
        collapsed ? 'px-3 justify-center' : 'pr-6 pl-3'
      } py-1.5 ${
        isActive
          ? 'bg-green-600/10 text-white/95'
          : 'bg-transparent text-white/45 hover:bg-white/[0.04] hover:text-white/70'
      }`}
    >
      {/* Animated bullet */}
      <span className="relative flex items-center justify-center w-4 h-4 flex-shrink-0">
        <span
          className={`rounded-full transition-all duration-300 ${
            isActive
              ? 'w-2 h-2 bg-green-400 shadow-[0_0_8px_rgba(102,187,106,0.6)]'
              : 'w-1.5 h-1.5 bg-white/20 group-hover/child:bg-white/40 group-hover/child:w-2 group-hover/child:h-2'
          }`}
        />
      </span>

      {!collapsed && (
        <>
          <span
            className={`text-[0.8rem] flex-1 text-right leading-relaxed transition-all duration-200 ${
              isActive ? 'font-semibold' : 'font-normal'
            }`}
          >
            {item.label}
          </span>

          {item.badge && (
            <span className={`px-1.5 py-0.5 rounded-full text-[0.6rem] font-bold leading-none border ${badgeCls}`}>
              {item.badge}
            </span>
          )}
        </>
      )}
    </button>
  );

  return collapsed ? <CollapsedTooltip label={item.label}>{inner}</CollapsedTooltip> : inner;
});

/* ─── Parent nav item ────────────────────────────────────────────────────── */
const NavItem = memo(function NavItem({ item, collapsed, depth = 0 }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  const hasChildren = item.children?.length > 0;
  const isActive =
    location.pathname === item.path ||
    (item.path && item.path !== '/' && location.pathname.startsWith(item.path));
  const isChildActive =
    hasChildren &&
    item.children.some(
      (c) => location.pathname === c.path || (c.path && location.pathname.startsWith(c.path))
    );

  const handleClick = useCallback(() => {
    if (hasChildren) setOpen((o) => !o);
    else if (item.path) navigate(item.path);
  }, [hasChildren, item.path, navigate]);

  if (depth > 0) return <ChildNavItem item={item} collapsed={collapsed} />;

  const isHighlighted = isActive || isChildActive;
  const isExpanded = open || isChildActive;

  const badgeCls =
    item.badgeColor === 'success'
      ? 'bg-emerald-500/12 text-emerald-300'
      : item.badgeColor === 'warning'
      ? 'bg-amber-500/12 text-amber-300'
      : 'bg-rose-500/12 text-rose-300';

  const btn = (
    <button
      onClick={handleClick}
      className={`w-[calc(100%-8px)] mx-1 mb-0.5 flex items-center relative overflow-hidden rounded-xl min-h-[44px] border-none font-cairo cursor-pointer group/nav transition-all duration-200 ${
        collapsed ? 'px-0 py-2.5 justify-center' : 'pr-3.5 pl-3 py-2'
      } ${
        isHighlighted
          ? 'bg-green-600/12 hover:bg-green-600/18'
          : 'bg-transparent hover:bg-white/[0.05]'
      }`}
    >
      {/* Active accent line (RTL right side) */}
      {isHighlighted && (
        <span
          className="absolute top-[16%] h-[68%] w-[3px] rounded-l-full transition-all duration-300"
          style={{
            insetInlineStart: 0,
            background: 'linear-gradient(180deg, #66BB6A 0%, #2E7D32 100%)',
            boxShadow: '0 0 12px rgba(46,125,50,0.6), 0 0 4px rgba(102,187,106,0.4)',
          }}
        />
      )}

      {/* Hover highlight glow */}
      <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-green-500/0 via-green-500/0 to-green-500/0 group-hover/nav:from-green-500/[0.02] group-hover/nav:via-green-500/[0.04] group-hover/nav:to-green-500/[0.02] transition-all duration-300" />

      {/* Icon */}
      <span
        className={`flex-shrink-0 flex items-center justify-center transition-all duration-200 relative z-10 ${
          collapsed ? '' : ''
        } ${
          isHighlighted ? 'text-green-400 scale-110' : 'text-white/35 group-hover/nav:text-white/60'
        } [&_svg]:!text-[20px]`}
        style={{ marginInlineEnd: collapsed ? 0 : 12 }}
      >
        {item.icon}
      </span>

      {/* Label + controls */}
      {!collapsed && (
        <>
          <span
            className={`flex-1 text-right text-[0.875rem] leading-relaxed relative z-10 transition-all duration-200 ${
              isHighlighted
                ? 'font-bold text-white tracking-tight'
                : 'font-medium text-white/55 group-hover/nav:text-white/80'
            }`}
          >
            {item.label}
          </span>

          {hasChildren && (
            <ExpandMoreIcon
              sx={{ fontSize: 15 }}
              className={`flex-shrink-0 mr-1 relative z-10 transition-all duration-300 ease-bounce-in ${
                isHighlighted ? 'text-green-300/50' : 'text-white/20'
              } ${isExpanded ? 'rotate-180' : 'rotate-0'}`}
            />
          )}

          {item.badge && !hasChildren && (
            <span className={`mr-1.5 px-2 py-0.5 rounded-full text-[0.6rem] font-bold leading-none min-w-[18px] text-center relative z-10 ${badgeCls}`}>
              {item.badge}
            </span>
          )}
        </>
      )}
    </button>
  );

  return (
    <>
      {collapsed ? <CollapsedTooltip label={item.label}>{btn}</CollapsedTooltip> : btn}

      {/* Children — animated collapse */}
      {hasChildren && !collapsed && (
        <div
          className="overflow-hidden transition-all duration-300 ease-smooth relative"
          style={{
            maxHeight: isExpanded ? `${item.children.length * 44 + 16}px` : '0px',
            opacity: isExpanded ? 1 : 0,
          }}
        >
          {/* Vertical guide line */}
          <div
            className="absolute top-1 bottom-2 w-px"
            style={{
              insetInlineStart: 26,
              background: 'linear-gradient(180deg, rgba(46,125,50,0.35) 0%, rgba(46,125,50,0.08) 100%)',
            }}
          />
          <div className="py-1">
            {item.children.map((child) => (
              <NavItem key={child.id || child.path} item={child} collapsed={collapsed} depth={1} />
            ))}
          </div>
        </div>
      )}
    </>
  );
});

/* ─── Section title ──────────────────────────────────────────────────────── */
function SectionTitle({ label, collapsed }) {
  if (collapsed) {
    return <div className="mx-5 my-3.5 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />;
  }

  return (
    <div className="px-5 pt-6 pb-2.5 flex items-center gap-3">
      <div className="h-px w-5 flex-shrink-0 bg-gradient-to-r from-transparent to-green-500/40" />
      <span className="text-[0.6rem] font-bold tracking-[0.2em] uppercase text-white/20 select-none whitespace-nowrap">
        {label}
      </span>
      <div className="h-px flex-1 bg-gradient-to-r from-white/[0.05] to-transparent" />
    </div>
  );
}

/* ─── Build nav groups ───────────────────────────────────────────────────── */
function buildNavGroups(items) {
  const groups = [];
  let currentGroup = { title: '', items: [] };
  for (const item of items) {
    if (item.type === 'divider') {
      if (currentGroup.items.length > 0) groups.push(currentGroup);
      currentGroup = { title: item.label || '', items: [] };
    } else {
      currentGroup.items.push(item);
    }
  }
  if (currentGroup.items.length > 0) groups.push(currentGroup);
  return groups;
}

/* ─── Main export ────────────────────────────────────────────────────────── */
export default memo(function SidebarNavList({ items = [], collapsed }) {
  const navGroups = useMemo(() => buildNavGroups(items), [items]);

  return (
    <nav className="flex-1 overflow-x-hidden overflow-y-auto py-2.5 scrollbar-thin">
      {navGroups.map((group, idx) => (
        <div key={idx}>
          {group.title && <SectionTitle label={group.title} collapsed={collapsed} />}
          <div>
            {group.items.map((item) => (
              <NavItem key={item.id || item.path} item={item} collapsed={collapsed} depth={0} />
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
});
