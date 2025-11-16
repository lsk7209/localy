import { Box, Container, Typography, Button } from '@mui/material';
import { Home as HomeIcon } from '@mui/icons-material';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

/**
 * 404 Not Found 페이지
 */
export default function NotFound() {
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
                fontSize: { xs: '4rem', sm: '6rem', md: '8rem' },
                fontWeight: 700,
                color: 'primary.main',
                mb: 2,
              }}
            >
              404
            </Typography>
            <Typography
              variant="h4"
              sx={{
                fontSize: { xs: '1.5rem', sm: '2rem' },
                fontWeight: 600,
                mb: 2,
                color: 'text.primary',
              }}
            >
              페이지를 찾을 수 없습니다
            </Typography>
            <Typography
              variant="body1"
              sx={{
                fontSize: { xs: '0.875rem', sm: '1rem' },
                color: 'text.secondary',
                mb: 4,
              }}
            >
              요청하신 페이지가 존재하지 않거나 이동되었을 수 있습니다.
              <br />
              URL을 확인하시거나 홈으로 돌아가주세요.
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button
              component={Link}
              href="/"
              variant="contained"
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
            <Button
              component={Link}
              href="/shop"
              variant="outlined"
              size="large"
              sx={{
                borderRadius: 2,
                px: 4,
                py: 1.5,
              }}
            >
              상가 목록 보기
            </Button>
          </Box>
        </Container>
      </Box>
      <Footer />
    </Box>
  );
}
