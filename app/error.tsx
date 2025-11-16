'use client';

import { Box, Container, Typography, Button, Alert } from '@mui/material';
import { Home as HomeIcon, Refresh as RefreshIcon } from '@mui/icons-material';
import { useEffect } from 'react';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

/**
 * 에러 페이지 컴포넌트
 * @param {Object} props - 에러 정보
 * @param {Error} props.error - 발생한 에러 객체
 * @param {Function} props.reset - 에러 상태를 리셋하는 함수
 */
interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    // 에러 로깅 (프로덕션에서는 에러 추적 서비스로 전송)
    console.error('Application error:', {
      message: error.message,
      stack: error.stack,
      digest: error.digest,
      timestamp: new Date().toISOString(),
    });
  }, [error]);

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
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          px: 2,
          py: { xs: 6, sm: 8, lg: 10 },
        }}
      >
        <Container maxWidth="sm">
          <Box sx={{ mb: 4 }}>
            <Typography
              variant="h1"
              sx={{
                fontSize: { xs: '3rem', sm: '4rem', md: '5rem' },
                fontWeight: 700,
                color: 'error.main',
                mb: 2,
              }}
            >
              오류 발생
            </Typography>
            <Typography
              variant="h5"
              sx={{
                fontSize: { xs: '1.25rem', sm: '1.5rem' },
                fontWeight: 600,
                mb: 2,
                color: 'text.primary',
              }}
            >
              예기치 않은 오류가 발생했습니다
            </Typography>
            <Typography
              variant="body1"
              sx={{
                fontSize: { xs: '0.875rem', sm: '1rem' },
                color: 'text.secondary',
                mb: 4,
              }}
            >
              잠시 후 다시 시도해주세요. 문제가 계속되면 관리자에게 문의해주세요.
            </Typography>

            {/* 개발 환경에서만 에러 상세 정보 표시 */}
            {process.env.NODE_ENV === 'development' && (
              <Alert severity="error" sx={{ mb: 4, textAlign: 'left' }}>
                <Typography variant="body2" component="pre" sx={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
                  {error.message}
                  {error.stack && `\n\n${error.stack}`}
                </Typography>
              </Alert>
            )}
          </Box>

          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button
              onClick={reset}
              variant="contained"
              size="large"
              startIcon={<RefreshIcon />}
              sx={{
                borderRadius: 2,
                px: 4,
                py: 1.5,
              }}
            >
              다시 시도
            </Button>
            <Button
              component={Link}
              href="/"
              variant="outlined"
              size="large"
              startIcon={<HomeIcon />}
              sx={{
                borderRadius: 2,
                px: 4,
                py: 1.5,
              }}
            >
              홈으로 가기
            </Button>
          </Box>
        </Container>
      </Box>
      <Footer />
    </Box>
  );
}

