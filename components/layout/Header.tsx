'use client';

import { AppBar, Box, Container, Link, Toolbar, Typography } from '@mui/material';
import { memo } from 'react';

/**
 * Component: Header
 * @param {string} title - 로고 텍스트 [Optional, default="LOCARRY"]
 * @example <Header />
 */
export default memo(function Header({ title = 'LOCARRY' }: { title?: string }) {
  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        bgcolor: 'rgba(255, 255, 255, 0.8)',
        borderBottom: 1,
        borderColor: 'neutral.200',
        backdropFilter: 'blur(8px)',
      }}
    >
      <Container maxWidth="lg">
        <Toolbar
          disableGutters
          sx={{
            minHeight: { xs: 56, sm: 64 },
            px: { xs: 2, sm: 3 },
          }}
        >
          <Link
            href="/"
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              textDecoration: 'none',
              color: 'text.primary',
            }}
          >
            <Typography
              variant="h5"
              component="span"
              sx={{
                fontFamily: '"Public Sans", sans-serif',
                fontWeight: 900,
                fontSize: { xs: '1.5rem', sm: '2rem' },
                letterSpacing: '-0.02em',
                color: 'text.primary',
              }}
            >
              {title}
            </Typography>
          </Link>
          <Box sx={{ flexGrow: 1 }} />
          <Box
            component="nav"
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 3,
            }}
          >
            <Link
              href="/"
              sx={{
                color: 'text.primary',
                fontWeight: 700,
                textDecoration: 'none',
                '&:hover': {
                  color: 'primary.main',
                },
              }}
            >
              홈
            </Link>
            <Link
              href="/search"
              sx={{
                color: 'text.secondary',
                fontWeight: 500,
                textDecoration: 'none',
                '&:hover': {
                  color: 'text.primary',
                },
              }}
            >
              검색
            </Link>
            <Link
              href="/category"
              sx={{
                color: 'text.secondary',
                fontWeight: 500,
                textDecoration: 'none',
                '&:hover': {
                  color: 'text.primary',
                },
              }}
            >
              업종
            </Link>
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
});

