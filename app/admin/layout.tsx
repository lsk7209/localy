'use client';

import { Box } from '@mui/material';
import AdminSidebar from '@/components/layout/AdminSidebar';

/**
 * 관리자 레이아웃
 */
export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AdminSidebar />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
        }}
      >
        {children}
      </Box>
    </Box>
  );
}

