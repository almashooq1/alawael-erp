/**
 * SidebarNavList — قائمة التنقل الاحترافية
 *
 * Premium dark sidebar navigation with:
 * - Section headers with dividers
 * - Active state with right accent border (RTL)
 * - Collapsible parent items with animated children
 * - Tooltip in collapsed mode
 * - Notification badges
 * - Smooth transitions
 * - Auto-groups from flat nav items with dividers
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
  Circle as CircleIcon,
} from '@mui/icons-material';

// ─── Style constants ──────────────────────────────────────────────────────────
const SB = {
  ACTIVE_BG:     'rgba(99,102,241,0.14)',
  ACTIVE_BORDER: '#6366F1',
  HOVER_BG:      'rgba(255,255,255,0.05)',
  TEXT:          'rgba(255,255,255,0.72)',
  TEXT_ACTIVE:   '#FFFFFF',
  TEXT_MUTED:    'rgba(255,255,255,0.35)',
  ICON:          'rgba(255,255,255,0.48)',
  ICON_ACTIVE:   '#818CF8',
  CHILD_DOT:     'rgba(255,255,255,0.3)',
  CHILD_DOT_ACT: '#818CF8',
};

// ─── Single nav item ──────────────────────────────────────────────────────────
const NavItem = memo(function NavItem({ item, collapsed, depth = 0 }) {
  const navigate   = useNavigate();
  const location   = useLocation();
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

  const isHighlighted = isActive || isChildActive;

  // ── Child item ──────────────────────────────────────────────────────────────
  if (depth > 0) {
    const childActive = location.pathname === item.path ||
      (item.path && location.pathname.startsWith(item.path));

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
            mx: 1,
            mb: 0.25,
            paddingInlineEnd: collapsed ? 8 : 16,
            paddingInlineStart: collapsed ? 8 : 28,
            py: 0.75,
            borderRadius: '7px',
            minHeight: 34,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            backgroundColor: childActive ? 'rgba(99,102,241,0.1)' : 'transparent',
            transition: 'background-color 0.15s',
            '&:hover': {
              backgroundColor: childActive ? 'rgba(99,102,241,0.15)' : SB.HOVER_BG,
            },
          }}
        >
          {/* Bullet */}
          <CircleIcon
            sx={{
              fontSize: 6,
              flexShrink: 0,
              color: childActive ? SB.CHILD_DOT_ACT : SB.CHILD_DOT,
              transition: 'color 0.15s',
            }}
          />

          {!collapsed && (
            <>
              <Typography
                sx={{
                  fontSize: '0.8125rem',
                  fontWeight: childActive ? 600 : 400,
                  color: childActive ? SB.TEXT_ACTIVE : SB.TEXT,
                  flex: 1,
                  lineHeight: 1.4,
                  transition: 'color 0.15s',
                }}
              >
                {item.label}
              </Typography>

              {item.badge && (
                <Badge
                  badgeContent={item.badge}
                  color={item.badgeColor || 'primary'}
                  sx={{ '& .MuiBadge-badge': { position: 'static', transform: 'none', fontSize: '0.6rem', height: 16, minWidth: 16 } }}
                />
              )}
            </>
          )}
        </ListItemButton>
      </Tooltip>
    );
  }

  // ── Parent item ─────────────────────────────────────────────────────────────
  const buttonContent = (
    <ListItemButton
      onClick={handleClick}
      sx={{
        mx: 1,
        mb: 0.25,
        paddingInlineEnd: collapsed ? 8 : 12,
        paddingInlineStart: collapsed ? 8 : 12,
        py: 0.75,
        borderRadius: '8px',
        minHeight: 42,
        display: 'flex',
        alignItems: 'center',
        position: 'relative',
        // Active state
        backgroundColor: isHighlighted ? SB.ACTIVE_BG : 'transparent',
        // Right accent border for RTL (start side)
        '&::before': isHighlighted
          ? {
              content: '""',
              position: 'absolute',
              insetInlineStart: 0,
              top: '20%',
              height: '60%',
              width: '3px',
              borderRadius: '3px',
              backgroundColor: SB.ACTIVE_BORDER,
              boxShadow: '0 0 8px rgba(99,102,241,0.6)',
            }
          : {},
        transition: 'background-color 0.15s',
        '&:hover': {
          backgroundColor: isHighlighted ? 'rgba(99,102,241,0.18)' : SB.HOVER_BG,
        },
      }}
    >
      {/* Icon */}
      <ListItemIcon
        sx={{
          minWidth: 0,
          marginInlineEnd: collapsed ? 0 : 12,
          color: isHighlighted ? SB.ICON_ACTIVE : SB.ICON,
          transition: 'color 0.15s',
          '& svg': { fontSize: 20 },
          flexShrink: 0,
        }}
      >
        {item.badge && !collapsed ? (
          <Badge
            badgeContent={item.badge}
            color={item.badgeColor || 'error'}
            sx={{
              '& .MuiBadge-badge': {
                fontSize: '0.6rem',
                height: 16,
                minWidth: 16,
                top: -2,
                insetInlineEnd: -2,
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
            sx={{
              m: 0,
              '& .MuiTypography-root': {
                fontSize: '0.875rem',
                fontWeight: isHighlighted ? 600 : 400,
                color: isHighlighted ? SB.TEXT_ACTIVE : SB.TEXT,
                lineHeight: 1.4,
                transition: 'color 0.15s, font-weight 0.15s',
              },
            }}
          />

          {/* Expand arrow for parents */}
          {hasChildren && (
            <ExpandMoreIcon
              sx={{
                fontSize: 16,
                color: SB.TEXT_MUTED,
                transition: 'transform 0.25s ease',
                transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
                flexShrink: 0,
              }}
            />
          )}

          {/* Badge (no children) */}
          {item.badge && !hasChildren && (
            <Box
              sx={{
                marginInlineStart: 8,
                px: 0.75,
                py: 0.125,
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
                fontSize: '0.65rem',
                fontWeight: 700,
                minWidth: 20,
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
      {/* Tooltip only in collapsed mode */}
      {collapsed ? (
        <Tooltip title={item.label} placement="left" arrow>
          {buttonContent}
        </Tooltip>
      ) : (
        buttonContent
      )}

      {/* Children */}
      {hasChildren && !collapsed && (
        <Collapse in={open || isChildActive} timeout={250} unmountOnExit>
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

// ─── Section separator ────────────────────────────────────────────────────────
function SectionTitle({ label, collapsed }) {
  if (collapsed) {
    return (
      <Box
        sx={{
          mx: 2,
          my: 1,
          height: '1px',
          backgroundColor: 'rgba(255,255,255,0.07)',
        }}
      />
    );
  }

  return (
    <Box sx={{ px: 2.5, pt: 2, pb: 0.5 }}>
      <Typography
        sx={{
          fontSize: '0.65rem',
          fontWeight: 600,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.3)',
          userSelect: 'none',
        }}
      >
        {label}
      </Typography>
    </Box>
  );
}

// ─── Convert flat items array (with dividers) to groups ───────────────────────
function buildNavGroups(items) {
  const groups = [];
  let currentGroup = { title: '', items: [] };

  for (const item of items) {
    if (item.type === 'divider') {
      // Push previous group if it has items
      if (currentGroup.items.length > 0) {
        groups.push(currentGroup);
      }
      // Start new group with divider label
      currentGroup = { title: item.label || '', items: [] };
    } else {
      currentGroup.items.push(item);
    }
  }

  // Push the last group
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
        // Scroll styling
        '&::-webkit-scrollbar': { width: '4px' },
        '&::-webkit-scrollbar-track': { background: 'transparent' },
        '&::-webkit-scrollbar-thumb': {
          background: 'rgba(255,255,255,0.1)',
          borderRadius: '2px',
          '&:hover': { background: 'rgba(255,255,255,0.2)' },
        },
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
