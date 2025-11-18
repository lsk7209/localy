'use client';

import { Box, Alert, AlertTitle } from '@mui/material';
import AdminSidebar from '@/components/layout/AdminSidebar';

/**
 * 관리자 레이아웃
 * 개발 단계: 인증 없이 접근 가능
 */
export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // 개발 환경 확인 (프로덕션에서는 환경 변수로 제어 가능)
  const isDevelopment = process.env.NODE_ENV === 'development' || !process.env.NEXT_PUBLIC_PRODUCTION;

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
        {/* 개발 환경 배너 */}
        {isDevelopment && (
          <Alert 
            severity="info" 
            sx={{ 
              borderRadius: 0,
              borderBottom: 1,
              borderColor: 'divider',
            }}
          >
            <AlertTitle>개발 환경</AlertTitle>
            관리자 페이지는 현재 개발 단계로 인증 없이 접근 가능합니다.
          </Alert>
        )}
        {children}
      </Box>
    </Box>
  );
}

