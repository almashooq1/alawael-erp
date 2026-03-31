/**
 * SidebarNavList — قائمة التنقل الاحترافية المحسّنة
 *
 * Premium dark sidebar navigation with:
 * - Section headers with refined dividers
 * - Active state with gradient background + accent line (RTL)
 * - Collapsible parent items with smooth animated children
 * - Tooltip in collapsed mode
 * - Notification badges
 * - Polished micro-interactions
 */

import { useState, useCallback, useMemo, memo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Collapse,
  Typography,
  Tooltip,
  Badge,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
} from '@mui/icons-material';

// ─── Style tokens ─────────────────────────────────────────────────────────────
const SB = {
  ACTIVE_BG:        'rgba(99,102,241,0.15)',
  ACTIVE_BG_HOVER:  'rgba(99,102,241,0.2)',
  ACTIVE_BORDER:    '#6366F1',
  HOVER_BG:         'rgba(255,255,255,0.045)',
  TEXT:             'rgba(255,255,255,0.65)',
  TEXT_ACTIVE:      '#FFFFFF',
  TEXT_MUTED:       'rgba(255,255,255,0.28)',
  ICON:             'rgba(255,255,255,0.42)',
  ICON_ACTIVE:      '#A5B4FC',
  CHILD_DOT:        'rgba(255,255,255,0.2)',
  CHILD_DOT_ACT:    '#818CF8',
  CHILD_TEXT:       'rgba(255,255,255,0.55)',
  CHILD_TEXT_ACT:   'rgba(255,255,255,0.95)',
};

// ─── Child nav item ───────────────────────────────────────────────────────────
const ChildNavItem = memo(function ChildNavItem({ item, collapsed }) {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive =
    location.pathname === item.path ||
    (item.path && item.path !== '/' && location.pathname.startsWith(item.path));

  return (
    <Tooltip
      title={collapsed ? item.label : ''}
      placement="left"
      disableHoverListener={!collapsed}
      arrow
    >
      <ListItemButton
        onClick={() => item.path && navigate(item.path)}
        sx={{
          mx: 1.25,
          mb: 0.35,
          pl: collapsed ? '12px' : '20px',
          pr: collapsed ? '12px' : '12px',
          py: '6px',
          borderRadius: '8px',
          minHeight: 34,
          display: 'flex',
          alignItems: 'center',
          gap: 1.25,
          backgroundColor: isActive ? 'rgba(99,102,241,0.1)' : 'transparent',
          transition: 'all 0.15s ease',
          '&:hover': {
            backgroundColor: isActive ? 'rgba(99,102,241,0.14)' : 'rgba(255,255,255,0.04)',
          },
        }}
      >
        {/* Animated bullet */}
        <Box
          sx={{
            width: isActive ? 7 : 5,
            height: isActive ? 7 : 5,
            borderRadius: '50%',
            flexShrink: 0,
            backgroundColor: isActive ? '#818CF8' : 'rgba(255,255,255,0.2)',
            boxShadow: isActive ? '0 0 6px rgba(129,140,248,0.7)' : 'none',
            transition: 'all 0.2s ease',
          }}
        />

        {!collapsed && (
          <>
            <Typography
              sx={{
                fontSize: '0.8125rem',
                fontWeight: isActive ? 600 : 400,
                color: isActive ? SB.CHILD_TEXT_ACT : SB.CHILD_TEXT,
                flex: 1,
                lineHeight: 1.4,
                transition: 'all 0.15s',
                letterSpacing: isActive ? '-0.01em' : 'normal',
              }}
            >
              {item.label}
            </Typography>

            {item.badge && (
              <Box
                sx={{
                  px: 0.75,
                  py: 0.1,
                  borderRadius: '100px',
                  backgroundColor: item.badgeColor === 'success'
                    ? 'rgba(16,185,129,0.18)'
                    : item.badgeColor === 'warning'
                    ? 'rgba(245,158,11,0.18)'
                    : 'rgba(244,63,94,0.18)',
                  color: item.badgeColor === 'success'
                    ? '#6EE7B7'
                    : item.badgeColor === 'warning'
                    ? '#FCD34D'
                    : '#FDA4AF',
                  fontSize: '0.6rem',
                  fontWeight: 700,
                  lineHeight: 1.6,
                }}
              >
                {item.badge}
              </Box>
            )}
          </>
        )}
      </ListItemButton>
    </Tooltip>
  );
});

// ─── Parent nav item ──────────────────────────────────────────────────────────
const NavItem = memo(function NavItem({ item, collapsed, depth = 0 }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  const hasChildren = item.children?.length > 0;
  const isActive =
    location.pathname === item.path ||
    (item.path && item.path !== '/' && location.pathname.startsWith(item.path));
  const isChildActive = hasChildren && item.children.some(
    (c) => location.pathname === c.path || (c.path && location.pathname.startsWith(c.path))
  );

  const handleClick = useCallback(() => {
    if (hasChildren) {
      setOpen((o) => !o);
    } else if (item.path) {
      navigate(item.path);
    }
  }, [hasChildren, item.path, navigate]);

  // Delegate child items to ChildNavItem
  if (depth > 0) {
    return <ChildNavItem item={item} collapsed={collapsed} />;
  }

  const isHighlighted = isActive || isChildActive;

  const buttonContent = (
    <ListItemButton
      onClick={handleClick}
      sx={{
        mx: 1,
        mb: 0.35,
        pl: collapsed ? '12px' : '14px',
        pr: collapsed ? '12px' : '10px',
        py: collapsed ? '10px' : '9px',
        borderRadius: '10px',
        minHeight: 42,
        display: 'flex',
        alignItems: 'center',
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: isHighlighted ? SB.ACTIVE_BG : 'transparent',
        // Active accent bar (RTL start side)
        '&::before': isHighlighted
          ? {
              content: '""',
              position: 'absolute',
              insetInlineStart: 0,
              top: '18%',
              height: '64%',
              width: '3px',
              borderRadius: '0 3px 3px 0',
              background: 'linear-gradient(180deg, #818CF8 0%, #6366F1 100%)',
              boxShadow: '0 0 10px rgba(99,102,241,0.7)',
            }
          : {},
        // Right-to-left border
        transition: 'background-color 0.18s ease',
        '&:hover': {
          backgroundColor: isHighlighted ? SB.ACTIVE_BG_HOVER : SB.HOVER_BG,
          '& .nav-icon': { color: isHighlighted ? SB.ICON_ACTIVE : 'rgba(255,255,255,0.7)' },
          '& .nav-label': { color: isHighlighted ? '#FFFFFF' : 'rgba(255,255,255,0.85)' },
        },
      }}
    >
      {/* Icon */}
      <ListItemIcon
        className="nav-icon"
        sx={{
          minWidth: 0,
          marginInlineEnd: collapsed ? 0 : '12px',
          color: isHighlighted ? SB.ICON_ACTIVE : SB.ICON,
          transition: 'color 0.18s ease',
          '& svg': { fontSize: 19 },
          flexShrink: 0,
          justifyContent: 'center',
          display: 'flex',
        }}
      >
        {item.badge && !collapsed ? (
          <Badge
            badgeContent={item.badge}
            color={item.badgeColor || 'error'}
            sx={{
              '& .MuiBadge-badge': {
                fontSize: '0.55rem',
                height: 15,
                minWidth: 15,
                top: -3,
                insetInlineEnd: -3,
                boxShadow: '0 0 0 1.5px #0A1628',
              },
            }}
          >
            {item.icon}
          </Badge>
        ) : (
          item.icon
        )}
      </ListItemIcon>

      {/* Label */}
      {!collapsed && (
        <>
          <ListItemText
            primary={item.label}
            className="nav-label"
            sx={{
              m: 0,
              '& .MuiTypography-root': {
                fontSize: '0.875rem',
                fontWeight: isHighlighted ? 600 : 400,
                color: isHighlighted ? SB.TEXT_ACTIVE : SB.TEXT,
                lineHeight: 1.4,
                transition: 'all 0.18s ease',
                letterSpacing: isHighlighted ? '-0.01em' : 'normal',
              },
            }}
          />

          {/* Expand icon for parents */}
          {hasChildren && (
            <ExpandMoreIcon
              sx={{
                fontSize: 15,
                color: isHighlighted ? 'rgba(165,180,252,0.6)' : SB.TEXT_MUTED,
                transition: 'transform 0.28s cubic-bezier(0.4, 0, 0.2, 1)',
                transform: (open || isChildActive) ? 'rotate(180deg)' : 'rotate(0deg)',
                flexShrink: 0,
                ml: 0.5,
              }}
            />
          )}

          {/* Badge pill (for leaf items) */}
          {item.badge && !hasChildren && (
            <Box
              sx={{
                marginInlineStart: 1,
                px: 0.75,
                py: 0.15,
                borderRadius: '100px',
                backgroundColor: item.badgeColor === 'success'
                  ? 'rgba(16,185,129,0.15)'
                  : item.badgeColor === 'warning'
                  ? 'rgba(245,158,11,0.15)'
                  : 'rgba(244,63,94,0.15)',
                color: item.badgeColor === 'success'
                  ? '#6EE7B7'
                  : item.badgeColor === 'warning'
                  ? '#FCD34D'
                  : '#FDA4AF',
                fontSize: '0.6rem',
                fontWeight: 700,
                lineHeight: 1.6,
                minWidth: 18,
                textAlign: 'center',
              }}
            >
              {item.badge}
            </Box>
          )}
        </>
      )}
    </ListItemButton>
  );

  return (
    <>
      {collapsed ? (
        <Tooltip title={item.label} placement="left" arrow>
          {buttonContent}
        </Tooltip>
      ) : (
        buttonContent
      )}

      {/* Children */}
      {hasChildren && !collapsed && (
        <Collapse
          in={open || isChildActive}
          timeout={240}
          unmountOnExit
          sx={{
            // Indent line for children
            '& > .MuiCollapse-wrapper': {
              position: 'relative',
              '&::before': {
                content: '""',
                position: 'absolute',
                insetInlineStart: '28px',
                top: 4,
                bottom: 8,
                width: '1px',
                background: 'linear-gradient(180deg, rgba(99,102,241,0.4) 0%, rgba(99,102,241,0.1) 100%)',
              },
            },
          }}
        >
          <List disablePadding sx={{ mb: 0.5 }}>
            {item.children.map((child) => (
              <NavItem key={child.id || child.path} item={child} collapsed={collapsed} depth={1} />
            ))}
          </List>
        </Collapse>
      )}
    </>
  );
});

// ─── Section title ────────────────────────────────────────────────────────────
function SectionTitle({ label, collapsed }) {
  if (collapsed) {
    return (
      <Box
        sx={{
          mx: 2.5,
          my: 1.25,
          height: '1px',
          background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.08) 40%, rgba(255,255,255,0.08) 60%, transparent 100%)',
        }}
      />
    );
  }

  return (
    <Box sx={{ px: 2.75, pt: 2.25, pb: 0.75, display: 'flex', alignItems: 'center', gap: 1.5 }}>
      <Box
        sx={{
          height: '1px',
          width: 16,
          background: 'linear-gradient(90deg, transparent, rgba(99,102,241,0.5))',
          flexShrink: 0,
        }}
      />
      <Typography
        sx={{
          fontSize: '0.625rem',
          fontWeight: 700,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.25)',
          userSelect: 'none',
          whiteSpace: 'nowrap',
          flex: 1,
        }}
      >
        {label}
      </Typography>
      <Box
        sx={{
          height: '1px',
          flex: 1,
          background: 'linear-gradient(90deg, rgba(255,255,255,0.07), transparent)',
        }}
      />
    </Box>
  );
}

// ─── Build nav groups from flat array ─────────────────────────────────────────
function buildNavGroups(items) {
  const groups = [];
  let currentGroup = { title: '', items: [] };

  for (const item of items) {
    if (item.type === 'divider') {
      if (currentGroup.items.length > 0) {
        groups.push(currentGroup);
      }
      currentGroup = { title: item.label || '', items: [] };
    } else {
      currentGroup.items.push(item);
    }
  }
  if (currentGroup.items.length > 0) {
    groups.push(currentGroup);
  }

  return groups;
}

// ─── Main export ──────────────────────────────────────────────────────────────
export default memo(function SidebarNavList({ items = [], collapsed }) {
  const navGroups = useMemo(() => buildNavGroups(items), [items]);

  return (
    <Box
      component="nav"
      sx={{
        flex: 1,
        overflow: 'hidden auto',
        py: 1,
        // Custom scrollbar
        '&::-webkit-scrollbar': { width: '3px' },
        '&::-webkit-scrollbar-track': { background: 'transparent' },
        '&::-webkit-scrollbar-thumb': {
          background: 'rgba(99,102,241,0.25)',
          borderRadius: '3px',
          '&:hover': { background: 'rgba(99,102,241,0.45)' },
        },
        scrollbarWidth: 'thin',
        scrollbarColor: 'rgba(99,102,241,0.25) transparent',
      }}
    >
      {navGroups.map((group, groupIdx) => (
        <Box key={groupIdx}>
          {group.title && <SectionTitle label={group.title} collapsed={collapsed} />}
          <List disablePadding>
            {group.items.map((item) => (
              <NavItem key={item.id || item.path} item={item} collapsed={collapsed} depth={0} />
            ))}
          </List>
        </Box>
      ))}
    </Box>
  );
});
