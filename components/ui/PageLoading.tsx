import { Box, Container, CircularProgress, Typography } from '@mui/material';
import { memo } from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

/**
 * Component: PageLoading
 * 전체 페이지 로딩 상태를 표시하는 컴포넌트
 * @param {string} message - 로딩 메시지 [Optional]
 * @example <PageLoading message="페이지를 불러오는 중..." />
 */
interface PageLoadingProps {
  message?: string;
}

export default memo(function PageLoading({ message }: PageLoadingProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
      }}
    >
      <Header />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          py: { xs: 6, sm: 8, lg: 10 },
        }}
      >
        <Container maxWidth="sm" sx={{ textAlign: 'center' }}>
          <CircularProgress size={56} sx={{ mb: 3 }} />
          {message && (
            <Typography variant="h6" color="text.secondary">
              {message}
            </Typography>
          )}
        </Container>
      </Box>
      <Footer />
    </Box>
  );
});

