'use client';

import {
  Box,
  Container,
  Typography,
  Paper,
  Tabs,
  Tab,
  Chip,
  Link as MuiLink,
  Pagination,
  CircularProgress,
  Alert,
} from '@mui/material';
import { Map, Store } from '@mui/icons-material';
import { useState, useCallback, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { LoadingSkeleton } from '@/components/ui';

interface Category {
  name: string;
  count: number;
  percentage: string;
}

interface Store {
  id: string;
  slug: string | null;
  name: string | null;
  category: string | null;
  address: string | null;
  sido: string | null;
  sigungu: string | null;
  dong: string | null;
  lastPublishedAt: string | null;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/**
 * 업종별 매장 목록 페이지 내부 컴포넌트
 */
function CategoryPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedCategory = searchParams.get('category') || 'all';
  const [page, setPage] = useState(parseInt(searchParams.get('page') || '1', 10));

  const [categories, setCategories] = useState<Category[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalStores, setTotalStores] = useState(0);

  // 업종 통계 조회
  useEffect(() => {
    fetchCategories();
  }, []);

  // 선택된 업종의 매장 목록 조회
  useEffect(() => {
    if (selectedCategory && selectedCategory !== 'all') {
      fetchStoresByCategory();
    } else {
      setStores([]);
      setPagination(null);
    }
  }, [selectedCategory, page]);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/categories');
      if (!response.ok) {
        throw new Error('업종 통계를 불러올 수 없습니다');
      }
      const data = await response.json();
      setCategories(data.categories || []);
      setTotalStores(data.totalStores || 0);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류');
      console.error('Failed to fetch categories:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStoresByCategory = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        category: selectedCategory,
        page: String(page),
        limit: '20',
      });

      const response = await fetch(`/api/categories?${params.toString()}`);
      if (!response.ok) {
        throw new Error('매장 목록을 불러올 수 없습니다');
      }
      const data = await response.json();
      setStores(data.stores || []);
      setPagination(data.pagination);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류');
      console.error('Failed to fetch stores:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryChange = useCallback(
    (_: React.SyntheticEvent, newValue: string) => {
      const params = new URLSearchParams();
      if (newValue !== 'all') {
        params.set('category', newValue);
      }
      params.set('page', '1');
      router.push(`/category?${params.toString()}`);
      setPage(1);
    },
    [router]
  );

  const handlePageChange = useCallback(
    (_: React.ChangeEvent<unknown>, value: number) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('page', String(value));
      router.push(`/category?${params.toString()}`);
      setPage(value);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [router, searchParams]
  );

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
          bgcolor: 'neutral.50',
        }}
      >
        <Container maxWidth="lg">
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
              업종별 매장 정보
            </Typography>
            <Typography variant="body1" sx={{ color: 'text.secondary', mb: 2 }}>
              업종별로 분류된 매장 정보를 확인하세요.
            </Typography>
            {totalStores > 0 && (
              <Chip
                icon={<Store />}
                label={`총 ${totalStores.toLocaleString()}개 매장`}
                color="primary"
                variant="outlined"
                sx={{ fontWeight: 600 }}
              />
            )}
          </Box>

          {/* 업종 탭 */}
          <Paper
            elevation={0}
            sx={{
              border: 1,
              borderColor: 'neutral.200',
              borderRadius: 2,
              mb: 4,
              overflow: 'hidden',
            }}
          >
            <Tabs
              value={selectedCategory}
              onChange={handleCategoryChange}
              variant="scrollable"
              scrollButtons="auto"
              sx={{
                borderBottom: 1,
                borderColor: 'neutral.200',
                '& .MuiTab-root': {
                  minHeight: 64,
                  fontWeight: 600,
                  textTransform: 'none',
                  fontSize: '1rem',
                },
              }}
            >
              <Tab
                label="전체"
                value="all"
                sx={{
                  '&.Mui-selected': {
                    color: 'primary.main',
                  },
                }}
              />
              {categories.map((category) => (
                <Tab
                  key={category.name}
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <span>{category.name}</span>
                      <Chip
                        label={category.count.toLocaleString()}
                        size="small"
                        sx={{
                          height: 20,
                          fontSize: '0.75rem',
                          fontWeight: 600,
                        }}
                      />
                    </Box>
                  }
                  value={category.name}
                  sx={{
                    '&.Mui-selected': {
                      color: 'primary.main',
                    },
                  }}
                />
              ))}
            </Tabs>
          </Paper>

          {/* 에러 메시지 */}
          {error && (
            <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {/* 매장 목록 */}
          {selectedCategory === 'all' ? (
            <Paper
              elevation={0}
              sx={{
                border: 1,
                borderColor: 'neutral.200',
                borderRadius: 2,
                p: 4,
              }}
            >
              <Typography variant="body1" sx={{ color: 'text.secondary', textAlign: 'center' }}>
                업종을 선택하면 해당 업종의 매장 목록을 확인할 수 있습니다.
              </Typography>
            </Paper>
          ) : loading ? (
            <Box sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
              <CircularProgress />
            </Box>
          ) : stores.length === 0 ? (
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
                {selectedCategory} 업종의 매장이 아직 없습니다.
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
                {stores.map((store, index) => (
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
                      borderBottom: index < stores.length - 1 ? 1 : 0,
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
                        {store.address || '주소 미제공'}
                        {store.dong && ` · ${store.dong}`}
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

/**
 * 업종별 매장 목록 페이지
 * 업종별로 분류된 매장 정보를 보여주는 페이지
 */
export default function CategoryPage() {
  return (
    <Suspense
      fallback={
        <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
          <Header />
          <Box component="main" sx={{ flexGrow: 1, py: { xs: 2, sm: 3 } }}>
            <Container maxWidth="lg">
              <Box sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
                <CircularProgress />
              </Box>
            </Container>
          </Box>
          <Footer />
        </Box>
      }
    >
      <CategoryPageContent />
    </Suspense>
  );
}

