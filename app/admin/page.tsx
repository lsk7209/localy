'use client';

import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Paper,
  ToggleButton,
  ToggleButtonGroup,
  Chip,
  CircularProgress,
} from '@mui/material';
import { Grid } from '@mui/material';
import { Error as ErrorIcon, Warning as WarningIcon, Info as InfoIcon } from '@mui/icons-material';
import { useState, useCallback, useEffect } from 'react';

const timeRanges = ['오늘', '7일', '30일', '90일'] as const;

interface Stats {
  totalStores: number;
  todayNewFetched: number;
  todayUpdated: number;
  todayPublished: number;
  totalPublished: number;
  pendingPublish: number;
  publishedLast7Days: number;
}

/**
 * 관리자 Dashboard 페이지
 */
export default function AdminDashboardPage() {
  const [selectedRange, setSelectedRange] = useState<(typeof timeRanges)[number]>('오늘');
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/stats');
      if (!response.ok) {
        throw new Error('Failed to fetch stats');
      }
      const data = await response.json();
      setStats(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Failed to fetch stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRangeChange = useCallback(
    (_: React.MouseEvent<HTMLElement>, newRange: (typeof timeRanges)[number] | null) => {
      if (newRange !== null) {
        setSelectedRange(newRange);
      }
    },
    []
  );

  return (
    <Box sx={{ flexGrow: 1, bgcolor: 'neutral.50' }}>
      {/* 헤더 */}
      <Box
        sx={{
          bgcolor: 'background.paper',
          borderBottom: 1,
          borderColor: 'neutral.200',
          px: { xs: 2, sm: 3, lg: 4 },
          py: 2,
        }}
      >
        <Container maxWidth="xl">
          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 2,
            }}
          >
            <Typography
              variant="h1"
              sx={{
                fontSize: { xs: '2rem', sm: '2.5rem' },
                fontWeight: 900,
                letterSpacing: '-0.033em',
                minWidth: 288,
              }}
            >
              대시보드
            </Typography>
            <ToggleButtonGroup
              value={selectedRange}
              exclusive
              onChange={handleRangeChange}
              size="small"
              sx={{
                flexWrap: 'wrap',
                gap: 0.5,
                '& .MuiToggleButton-root': {
                  borderRadius: 2,
                  px: 2,
                  py: 0.5,
                  border: 0,
                  bgcolor: 'background.paper',
                  '&.Mui-selected': {
                    bgcolor: 'primary.main',
                    color: 'primary.contrastText',
                    '&:hover': {
                      bgcolor: 'primary.dark',
                    },
                  },
                },
              }}
            >
              {timeRanges.map((range) => (
                <ToggleButton key={range} value={range}>
                  {range}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Box>
        </Container>
      </Box>

      <Container maxWidth="xl" sx={{ py: { xs: 2, sm: 3, lg: 4 } }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Box sx={{ p: 3, bgcolor: 'error.light', borderRadius: 2, color: 'error.dark' }}>
            <Typography>데이터를 불러오는 중 오류가 발생했습니다: {error}</Typography>
          </Box>
        ) : (
          <>
            {/* 통계 카드 */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
              {/* @ts-ignore */}
              <Grid item xs={12} sm={6} lg={3}>
                <Card>
                  <CardContent>
                    <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
                      총 등록 상가
                    </Typography>
                    <Typography variant="h3" sx={{ fontWeight: 700 }}>
                      {stats?.totalStores.toLocaleString() || 0}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              {/* @ts-ignore */}
              <Grid item xs={12} sm={6} lg={3}>
                <Card>
                  <CardContent>
                    <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
                      오늘 신규 수집
                    </Typography>
                    <Typography variant="h3" sx={{ fontWeight: 700 }}>
                      {stats?.todayNewFetched.toLocaleString() || 0}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              {/* @ts-ignore */}
              <Grid item xs={12} sm={6} lg={3}>
                <Card>
                  <CardContent>
                    <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
                      오늘 정보 수정
                    </Typography>
                    <Typography variant="h3" sx={{ fontWeight: 700 }}>
                      {stats?.todayUpdated.toLocaleString() || 0}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              {/* @ts-ignore */}
              <Grid item xs={12} sm={6} lg={3}>
                <Card>
                  <CardContent>
                    <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
                      오늘 발행 페이지
                    </Typography>
                    <Typography variant="h3" sx={{ fontWeight: 700 }}>
                      {stats?.todayPublished.toLocaleString() || 0}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

        <Grid container spacing={3}>
          {/* 발행 현황 */}
          {/* @ts-ignore */}
          <Grid item xs={12} lg={8}>
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h3" sx={{ mb: 3, fontSize: '1.25rem', fontWeight: 700 }}>
                  발행 현황
                </Typography>
                <Grid container spacing={2} sx={{ mb: 3 }}>
                  {/* @ts-ignore */}
                  <Grid item xs={12} sm={4}>
                    <Typography variant="body2" sx={{ color: 'text.secondary', mb: 0.5 }}>
                      전체 발행 페이지
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 700 }}>
                      {stats?.totalPublished.toLocaleString() || 0}
                    </Typography>
                  </Grid>
                  {/* @ts-ignore */}
                  <Grid item xs={12} sm={4}>
                    <Typography variant="body2" sx={{ color: 'text.secondary', mb: 0.5 }}>
                      발행 대기
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 700 }}>
                      {stats?.pendingPublish.toLocaleString() || 0}
                    </Typography>
                  </Grid>
                  {/* @ts-ignore */}
                  <Grid item xs={12} sm={4}>
                    <Typography variant="body2" sx={{ color: 'text.secondary', mb: 0.5 }}>
                      최근 7일 발행량
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 700 }}>
                      {stats?.publishedLast7Days.toLocaleString() || 0}
                    </Typography>
                  </Grid>
                </Grid>
                <Box sx={{ height: 128, bgcolor: 'neutral.100', borderRadius: 2 }}>
                  {/* 차트 영역 - 실제로는 차트 라이브러리 사용 */}
                </Box>
              </CardContent>
            </Card>

            {/* 방문자 요약 */}
            <Card>
              <CardContent>
                <Typography variant="h3" sx={{ mb: 3, fontSize: '1.25rem', fontWeight: 700 }}>
                  방문자 요약
                </Typography>
                <Grid container spacing={3}>
                  {/* @ts-ignore */}
                  <Grid item xs={12} sm={6}>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 0.5 }}>
                        최근 7일 방문자 (UV)
                      </Typography>
                      <Typography variant="h4" sx={{ fontWeight: 700 }}>
                        8,492
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 0.5 }}>
                        최근 7일 페이지뷰 (PV)
                      </Typography>
                      <Typography variant="h4" sx={{ fontWeight: 700 }}>
                        32,128
                      </Typography>
                    </Box>
                  </Grid>
                  {/* @ts-ignore */}
                  <Grid item xs={12} sm={6}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <Box sx={{ position: 'relative', width: 128, height: 128, mb: 2 }}>
                        {/* 원형 차트 영역 */}
                        <Box
                          sx={{
                            width: '100%',
                            height: '100%',
                            borderRadius: '50%',
                            bgcolor: 'neutral.200',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Typography variant="h4" sx={{ fontWeight: 700 }}>
                            75%
                          </Typography>
                        </Box>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'primary.main' }} />
                          <Typography variant="body2">모바일</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'neutral.200' }} />
                          <Typography variant="body2">데스크탑</Typography>
                        </Box>
                      </Box>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* 경고 및 알림 */}
          {/* @ts-ignore */}
          <Grid item xs={12} lg={4}>
            <Card>
              <CardContent>
                <Typography variant="h3" sx={{ mb: 3, fontSize: '1.25rem', fontWeight: 700 }}>
                  경고 및 알림
                </Typography>
                <Paper
                  sx={{
                    bgcolor: 'error.light',
                    p: 2,
                    mb: 3,
                    borderRadius: 2,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'error.dark' }}>
                    최근 24시간 내 오류
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: 'error.dark' }}>
                    3
                  </Typography>
                </Paper>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Box sx={{ display: 'flex', gap: 1.5 }}>
                    <ErrorIcon sx={{ color: 'error.main', fontSize: 20 }} />
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        [DB] 데이터 수집 실패
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        2시간 전 - 소상공인시장진흥공단 API
                      </Typography>
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1.5 }}>
                    <WarningIcon sx={{ color: 'warning.main', fontSize: 20 }} />
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        [System] 디스크 용량 임계치 근접
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        8시간 전 - 사용량 85%
                      </Typography>
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1.5 }}>
                    <InfoIcon sx={{ color: 'info.main', fontSize: 20 }} />
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        [Update] 시스템 정기점검 예정
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        1일 전 - 2024.08.15 02:00 ~ 04:00
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
          </>
        )}
      </Container>
    </Box>
  );
}
