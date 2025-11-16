'use client';

import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Analytics as AnalyticsIcon,
  Work as WorkIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { memo, useMemo } from 'react';

const drawerWidth = 256;

const menuItems = [
  { href: '/admin', label: 'Dashboard', icon: DashboardIcon },
  { href: '/admin/analytics', label: 'Analytics', icon: AnalyticsIcon },
  { href: '/admin/jobs', label: 'Jobs', icon: WorkIcon },
  { href: '/admin/settings', label: 'Settings', icon: SettingsIcon },
] as const;

/**
 * Component: AdminSidebar
 * 관리자 페이지용 사이드바 네비게이션
 * @example <AdminSidebar />
 */
export default memo(function AdminSidebar() {
  const pathname = usePathname();

  const isActive = useMemo(
    () => (href: string) => {
      if (href === '/admin') {
        return pathname === '/admin';
      }
      return pathname.startsWith(href);
    },
    [pathname]
  );

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          boxSizing: 'border-box',
          borderRight: 1,
          borderColor: 'neutral.200',
        },
      }}
    >
      <Toolbar
        sx={{
          minHeight: 64,
          px: 3,
          borderBottom: 1,
          borderColor: 'neutral.200',
        }}
      >
        <Typography
          variant="h6"
          sx={{
            fontWeight: 700,
            fontSize: '1.25rem',
            letterSpacing: '-0.015em',
          }}
        >
          로커리
        </Typography>
      </Toolbar>
      <List sx={{ px: 2, py: 2 }}>
        {menuItems.map((item) => {
          const active = isActive(item.href);
          return (
            <ListItem key={item.href} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                component={Link}
                href={item.href}
                sx={{
                  borderRadius: 2,
                  bgcolor: active ? 'primary.main' : 'transparent',
                  color: active ? 'primary.contrastText' : 'text.secondary',
                  '&:hover': {
                    bgcolor: active ? 'primary.dark' : 'neutral.100',
                  },
                  px: 2,
                  py: 1.5,
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 40,
                    color: 'inherit',
                  }}
                >
                  <item.icon />
                </ListItemIcon>
                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{
                    fontSize: '0.875rem',
                    fontWeight: active ? 600 : 500,
                  }}
                />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>
    </Drawer>
  );
});

