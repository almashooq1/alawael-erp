/**
 * SidebarNavList — قائمة التنقل الاحترافية (Tailwind)
 * Section titles, parent items (expandable), child items, collapsed tooltips
 */
import { useState, useCallback, useMemo, memo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ExpandMore as ExpandMoreIcon } from '@mui/icons-material';

/* ─── Child nav item ─────────────────────────────────────────────────────── */
const ChildNavItem = memo(function ChildNavItem({ item, collapsed }) {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive =
    location.pathname === item.path ||
    (item.path && item.path !== '/' && location.pathname.startsWith(item.path));

  const badgeColor =
    item.badgeColor === 'success'
      ? 'bg-emerald-500/[0.18] text-emerald-300'
      : item.badgeColor === 'warning'
      ? 'bg-amber-500/[0.18] text-amber-300'
      : 'bg-rose-500/[0.18] text-rose-300';

  return (
    <button
      onClick={() => item.path && navigate(item.path)}
      title={collapsed ? item.label : undefined}
      className={`w-[calc(100%-10px)] mx-[5px] mb-0.5 flex items-center gap-2.5 rounded-lg min-h-[34px] border-none font-cairo cursor-pointer transition-all duration-150 ${
        collapsed ? 'px-3' : 'pr-5 pl-3'
      } py-1.5 ${
        isActive
          ? 'bg-green-700/[0.12] hover:bg-green-700/[0.17]'
          : 'bg-transparent hover:bg-white/[0.04]'
      }`}
    >
      {/* Bullet */}
      <span
        className={`rounded-full flex-shrink-0 transition-all duration-200 ${
          isActive
            ? 'w-[7px] h-[7px] bg-green-400'
            : 'w-[5px] h-[5px] bg-white/20'
        }`}
        style={isActive ? { boxShadow: '0 0 6px rgba(102,187,106,0.7)' } : undefined}
      />

      {!collapsed && (
        <>
          <span
            className={`text-[0.8125rem] flex-1 text-right leading-relaxed transition-all duration-150 ${
              isActive
                ? 'font-semibold text-white/95 -tracking-tight'
                : 'font-normal text-white/55'
            }`}
          >
            {item.label}
          </span>

          {item.badge && (
            <span
              className={`px-1.5 py-0.5 rounded-full text-[0.6rem] font-bold leading-none ${badgeColor}`}
            >
              {item.badge}
            </span>
          )}
        </>
      )}
    </button>
  );
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
      (c) =>
        location.pathname === c.path ||
        (c.path && location.pathname.startsWith(c.path))
    );

  const handleClick = useCallback(() => {
    if (hasChildren) setOpen((o) => !o);
    else if (item.path) navigate(item.path);
  }, [hasChildren, item.path, navigate]);

  // Child items delegate to ChildNavItem
  if (depth > 0) return <ChildNavItem item={item} collapsed={collapsed} />;

  const isHighlighted = isActive || isChildActive;
  const isExpanded = open || isChildActive;

  const badgeColor =
    item.badgeColor === 'success'
      ? 'bg-emerald-500/[0.15] text-emerald-300'
      : item.badgeColor === 'warning'
      ? 'bg-amber-500/[0.15] text-amber-300'
      : 'bg-rose-500/[0.15] text-rose-300';

  const buttonContent = (
    <button
      onClick={handleClick}
      title={collapsed ? item.label : undefined}
      className={`w-[calc(100%-8px)] mx-1 mb-0.5 flex items-center relative overflow-hidden rounded-[10px] min-h-[42px] border-none font-cairo cursor-pointer transition-colors duration-200 ${
        collapsed ? 'px-3 py-2.5 justify-center' : 'pr-3.5 pl-2.5 py-2'
      } ${
        isHighlighted
          ? 'bg-green-700/[0.15] hover:bg-green-700/20'
          : 'bg-transparent hover:bg-white/[0.045]'
      }`}
    >
      {/* Active accent bar (RTL start side) */}
      {isHighlighted && (
        <span
          className="absolute top-[18%] h-[64%] w-[3px] rounded-l-[3px]"
          style={{
            insetInlineStart: 0,
            background: 'linear-gradient(180deg, #66BB6A 0%, #2E7D32 100%)',
            boxShadow: '0 0 10px rgba(46,125,50,0.7)',
          }}
        />
      )}

      {/* Icon */}
      <span
        className={`flex-shrink-0 flex items-center justify-center transition-colors duration-200 ${
          collapsed ? '' : 'ml-3'
        } ${isHighlighted ? 'text-green-400' : 'text-white/40'} [&_svg]:text-[19px]`}
        style={{ marginInlineEnd: collapsed ? 0 : 12 }}
      >
        {item.icon}
      </span>

      {/* Label + Expand arrow + Badge */}
      {!collapsed && (
        <>
          <span
            className={`flex-1 text-right text-[0.875rem] leading-relaxed transition-all duration-200 ${
              isHighlighted
                ? 'font-semibold text-white -tracking-tight'
                : 'font-normal text-white/65 group-hover:text-white/85'
            }`}
          >
            {item.label}
          </span>

          {hasChildren && (
            <ExpandMoreIcon
              sx={{ fontSize: 15 }}
              className={`flex-shrink-0 mr-1 transition-transform duration-300 ${
                isHighlighted ? 'text-green-300/60' : 'text-white/25'
              } ${isExpanded ? 'rotate-180' : 'rotate-0'}`}
            />
          )}

          {item.badge && !hasChildren && (
            <span
              className={`mr-2 px-1.5 py-0.5 rounded-full text-[0.6rem] font-bold leading-none min-w-[18px] text-center ${badgeColor}`}
            >
              {item.badge}
            </span>
          )}
        </>
      )}
    </button>
  );

  return (
    <>
      {buttonContent}

      {/* Children — CSS transition collapse */}
      {hasChildren && !collapsed && (
        <div
          className="overflow-hidden transition-all duration-300 ease-in-out relative"
          style={{
            maxHeight: isExpanded ? `${item.children.length * 42 + 16}px` : '0px',
            opacity: isExpanded ? 1 : 0,
          }}
        >
          {/* Indent guide line */}
          <div
            className="absolute top-1 bottom-2 w-px"
            style={{
              insetInlineStart: 28,
              background:
                'linear-gradient(180deg, rgba(46,125,50,0.4) 0%, rgba(46,125,50,0.1) 100%)',
            }}
          />
          <div className="mb-1">
            {item.children.map((child) => (
              <NavItem
                key={child.id || child.path}
                item={child}
                collapsed={collapsed}
                depth={1}
              />
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
    return (
      <div
        className="mx-5 my-3 h-px"
        style={{
          background:
            'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.08) 40%, rgba(255,255,255,0.08) 60%, transparent 100%)',
        }}
      />
    );
  }

  return (
    <div className="px-5 pt-5 pb-2 flex items-center gap-3">
      <div
        className="h-px w-4 flex-shrink-0"
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(46,125,50,0.5))',
        }}
      />
      <span className="text-[0.625rem] font-bold tracking-widest uppercase text-white/25 select-none whitespace-nowrap flex-1">
        {label}
      </span>
      <div
        className="h-px flex-1"
        style={{
          background: 'linear-gradient(90deg, rgba(255,255,255,0.07), transparent)',
        }}
      />
    </div>
  );
}

/* ─── Build nav groups from flat array ───────────────────────────────────── */
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
    <nav
      className="flex-1 overflow-x-hidden overflow-y-auto py-2 scrollbar-thin"
      style={{
        scrollbarWidth: 'thin',
        scrollbarColor: 'rgba(46,125,50,0.25) transparent',
      }}
    >
      <style>{`
        nav.scrollbar-thin::-webkit-scrollbar { width: 3px; }
        nav.scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
        nav.scrollbar-thin::-webkit-scrollbar-thumb {
          background: rgba(46,125,50,0.25);
          border-radius: 3px;
        }
        nav.scrollbar-thin::-webkit-scrollbar-thumb:hover {
          background: rgba(46,125,50,0.45);
        }
      `}</style>
      {navGroups.map((group, idx) => (
        <div key={idx}>
          {group.title && (
            <SectionTitle label={group.title} collapsed={collapsed} />
          )}
          <div>
            {group.items.map((item) => (
              <NavItem
                key={item.id || item.path}
                item={item}
                collapsed={collapsed}
                depth={0}
              />
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
});
