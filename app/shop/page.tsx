'use client';

import {
  Box,
  Container,
  Typography,
  TextField,
  InputAdornment,
  FormControl,
  Select,
  MenuItem,
  Paper,
  Link as MuiLink,
  Pagination,
} from '@mui/material';
import { Search, Map } from '@mui/icons-material';
import { useState, useCallback, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { LoadingSkeleton } from '@/components/ui';

interface Shop {
  id: string;
  slug: string | null;
  name: string | null;
  category: string | null;
  address: string | null;
  sido: string | null;
  sigungu: string | null;
  dong: string | null;
  lastPublishedAt: number | null;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/**
 * 상가 리스트 페이지
 * 업종 및 지역별 상가 목록을 보여주는 페이지
 */
export default function ShopListPage() {
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [category, setCategory] = useState(searchParams.get('category') || '');
  const [region, setRegion] = useState(searchParams.get('region') || '');
  const [sortBy, setSortBy] = useState(searchParams.get('sortBy') || 'name');
  const [page, setPage] = useState(parseInt(searchParams.get('page') || '1', 10));
  const [shops, setShops] = useState<Shop[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchShops();
  }, [page, sortBy, category, region, searchQuery]);

  const fetchShops = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: String(page),
        sortBy,
        ...(searchQuery && { search: searchQuery }),
        ...(category && { category }),
        ...(region && { region }),
      });

      const response = await fetch(`/api/shops?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch shops');
      }
      const data = await response.json();
      setShops(data.shops || []);
      setPagination(data.pagination);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Failed to fetch shops:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
    setPage(1); // 검색 시 첫 페이지로 리셋
  }, []);

  const handleSortChange = useCallback((event: any) => {
    setSortBy(event.target.value);
    setPage(1);
  }, []);

  const handlePageChange = useCallback((_: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

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
          py: { xs: 2, sm: 3 },
        }}
      >
        <Container maxWidth="md">
          {/* 헤더 */}
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Typography
              variant="h1"
              sx={{
                fontSize: { xs: '2rem', sm: '2.5rem' },
                fontWeight: 900,
                letterSpacing: '-0.02em',
                mb: 1,
                color: 'text.primary',
              }}
            >
              상가 정보 목록
            </Typography>
            <Typography variant="body1" sx={{ color: 'text.secondary' }}>
              공공데이터 기반으로 원하는 상가 정보를 찾아보세요.
            </Typography>
          </Box>

          {/* 검색 및 정렬 */}
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, mb: 4 }}>
            <TextField
              fullWidth
              placeholder="상호명, 업종, 주소 검색"
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
                flex: 1,
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                },
              }}
            />
            <FormControl sx={{ minWidth: { xs: '100%', sm: 160 } }}>
              <Select
                value={sortBy}
                onChange={handleSortChange}
                sx={{
                  borderRadius: 2,
                  height: 56,
                }}
              >
                <MenuItem value="name">이름순</MenuItem>
                <MenuItem value="latest">최신순</MenuItem>
              </Select>
            </FormControl>
          </Box>

          {/* 상가 목록 */}
      {loading ? (
        <Box sx={{ py: 4 }}>
          <LoadingSkeleton variant="card" count={6} />
        </Box>
      ) : error ? (
            <Box sx={{ p: 3, bgcolor: 'error.light', borderRadius: 2, color: 'error.dark' }}>
              <Typography>데이터를 불러오는 중 오류가 발생했습니다: {error}</Typography>
            </Box>
          ) : shops.length === 0 ? (
            <Paper
              elevation={0}
              sx={{
                border: 1,
                borderColor: 'neutral.200',
                borderRadius: 2,
                p: 4,
                textAlign: 'center',
              }}
            >
              <Typography variant="body1" sx={{ color: 'text.secondary' }}>
                검색 결과가 없습니다.
              </Typography>
            </Paper>
          ) : (
            <>
              <Paper
                elevation={0}
                sx={{
                  border: 1,
                  borderColor: 'neutral.200',
                  borderRadius: 2,
                  overflow: 'hidden',
                  mb: 4,
                }}
              >
                {shops.map((store, index) => (
                  <MuiLink
                    key={store.id}
                    href={store.slug ? `/shop/${store.slug}` : '#'}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 2,
                      px: 2,
                      py: 2.5,
                      borderBottom: index < shops.length - 1 ? 1 : 0,
                      borderColor: 'neutral.200',
                      textDecoration: 'none',
                      color: 'inherit',
                      '&:hover': {
                        bgcolor: 'neutral.50',
                      },
                    }}
                  >
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography
                        variant="h6"
                        sx={{
                          fontWeight: 700,
                          mb: 0.5,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {store.name || '상가명 없음'}
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{
                          color: 'text.secondary',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {store.category || '업종 미제공'} · {store.address || '주소 미제공'}
                      </Typography>
                    </Box>
                    <Map sx={{ color: 'primary.main', flexShrink: 0 }} />
                  </MuiLink>
                ))}
              </Paper>

              {/* 페이지네이션 */}
              {pagination && pagination.totalPages > 1 && (
                <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                  <Pagination
                    count={pagination.totalPages}
                    page={page}
                    onChange={handlePageChange}
                    color="primary"
                    sx={{
                      '& .MuiPaginationItem-root': {
                        borderRadius: 2,
                      },
                    }}
                  />
                </Box>
              )}
            </>
          )}
        </Container>
      </Box>
      <Footer />
    </Box>
  );
}

