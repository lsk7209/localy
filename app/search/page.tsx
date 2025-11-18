'use client';

import { Box, Container, TextField, InputAdornment, Typography } from '@mui/material';
import { Search } from '@mui/icons-material';
import { useState, useCallback, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

/**
 * 검색 페이지
 * /shop 페이지로 리다이렉트하거나 검색 결과를 표시
 */
export default function SearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');

  // 검색어가 있으면 /shop 페이지로 리다이렉트
  useEffect(() => {
    if (searchQuery) {
      const params = new URLSearchParams();
      params.set('search', searchQuery);
      router.push(`/shop?${params.toString()}`);
    }
  }, [searchQuery, router]);

  const handleSearch = useCallback((event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (searchQuery.trim()) {
      const params = new URLSearchParams();
      params.set('search', searchQuery.trim());
      router.push(`/shop?${params.toString()}`);
    }
  }, [searchQuery, router]);

  const handleSearchChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  }, []);

  return (
    <>
      <Header />
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box
          component="form"
          onSubmit={handleSearch}
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 3,
            minHeight: '60vh',
            justifyContent: 'center',
          }}
        >
          <Typography variant="h3" component="h1" sx={{ fontWeight: 700, mb: 2 }}>
            상가 검색
          </Typography>
          
          <TextField
            fullWidth
            placeholder="상가명, 카테고리, 주소로 검색하세요"
            value={searchQuery}
            onChange={handleSearchChange}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
            sx={{
              maxWidth: 600,
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
              },
            }}
            autoFocus
          />

          <Typography variant="body2" color="text.secondary">
            검색어를 입력하고 Enter를 누르면 상가 목록 페이지로 이동합니다.
          </Typography>
        </Box>
      </Container>
      <Footer />
    </>
  );
}

