/**
 * SidebarNavList — Main navigation list with collapsible children.
 */
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
  Divider,
  alpha,
} from '@mui/material';
import { ExpandLess, ExpandMore } from '@mui/icons-material';

const SidebarNavList = ({
  items,
  collapsed,
  isMobile,
  expandedItems,
  isActive,
  onToggleExpand,
  onNavigate,
  onToggleCollapse,
  theme,
}) => (
  <Box sx={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', px: collapsed && !isMobile ? 0.5 : 1.5, py: 1 }}>
    <List disablePadding>
      {items.map((item) => {
        if (item.type === 'divider') {
          if (collapsed && !isMobile) return <Divider key={item.id} sx={{ my: 1.5 }} />;
          return (
            <Typography
              key={item.id}
              variant="overline"
              sx={{
                px: 1.5,
                pt: 2,
                pb: 0.5,
                display: 'block',
                color: 'text.disabled',
                fontSize: '0.6875rem',
              }}
            >
              {item.label}
            </Typography>
          );
        }

        const hasChildren = item.children && item.children.length > 0;
        const isExpanded = expandedItems[item.id];
        const active = hasChildren
          ? item.children.some((c) => isActive(c.path))
          : isActive(item.path);

        return (
          <Box key={item.id}>
            <Tooltip
              title={collapsed && !isMobile ? item.label : ''}
              placement="left"
              arrow
            >
              <ListItemButton
                onClick={() => {
                  if (hasChildren) {
                    if (collapsed && !isMobile) {
                      onToggleCollapse?.();
                      setTimeout(() => onToggleExpand(item.id), 300);
                    } else {
                      onToggleExpand(item.id);
                    }
                  } else {
                    onNavigate(item.path);
                  }
                }}
                selected={active}
                sx={{
                  minHeight: 42,
                  justifyContent: collapsed && !isMobile ? 'center' : 'flex-start',
                  px: collapsed && !isMobile ? 1 : 1.5,
                  borderRadius: '8px',
                  mb: 0.25,
                  ...(active && {
                    backgroundColor: alpha(theme.palette.primary.main, 0.1),
                    color: theme.palette.primary.main,
                    '&:hover': { backgroundColor: alpha(theme.palette.primary.main, 0.15) },
                    '& .MuiListItemIcon-root': { color: theme.palette.primary.main },
                  }),
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: collapsed && !isMobile ? 0 : 40,
                    justifyContent: 'center',
                    color: active ? theme.palette.primary.main : theme.palette.text.secondary,
                  }}
                >
                  {item.badge ? (
                    <Badge badgeContent={item.badge} color="error" variant="dot">
                      {item.icon}
                    </Badge>
                  ) : (
                    item.icon
                  )}
                </ListItemIcon>

                {(!collapsed || isMobile) && (
                  <>
                    <ListItemText
                      primary={item.label}
                      primaryTypographyProps={{
                        fontSize: '0.875rem',
                        fontWeight: active ? 600 : 400,
                        noWrap: true,
                      }}
                    />
                    {hasChildren && (isExpanded ? <ExpandLess sx={{ fontSize: 18 }} /> : <ExpandMore sx={{ fontSize: 18 }} />)}
                  </>
                )}
              </ListItemButton>
            </Tooltip>

            {/* Children */}
            {hasChildren && (!collapsed || isMobile) && (
              <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                <List disablePadding sx={{ pr: 2 }}>
                  {item.children.map((child) => {
                    const childActive = isActive(child.path);
                    return (
                      <ListItemButton
                        key={child.id}
                        onClick={() => onNavigate(child.path)}
                        selected={childActive}
                        sx={{
                          minHeight: 36,
                          pr: 4,
                          pl: 1.5,
                          borderRadius: '6px',
                          mb: 0.25,
                          position: 'relative',
                          '&::before': {
                            content: '""',
                            position: 'absolute',
                            right: 20,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            backgroundColor: childActive
                              ? theme.palette.primary.main
                              : theme.palette.divider,
                            transition: 'background-color 0.2s',
                          },
                          ...(childActive && {
                            backgroundColor: alpha(theme.palette.primary.main, 0.06),
                            color: theme.palette.primary.main,
                          }),
                        }}
                      >
                        <ListItemText
                          primary={child.label}
                          primaryTypographyProps={{
                            fontSize: '0.8125rem',
                            fontWeight: childActive ? 600 : 400,
                          }}
                        />
                      </ListItemButton>
                    );
                  })}
                </List>
              </Collapse>
            )}
          </Box>
        );
      })}
    </List>
  </Box>
);

export default SidebarNavList;
