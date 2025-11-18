'use client';

import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Paper,
  ToggleButton,
  ToggleButtonGroup,
  CircularProgress,
  Alert,
} from '@mui/material';
import { Grid } from '@mui/material';
import { CheckCircle, Update, Error as ErrorIcon } from '@mui/icons-material';
import { useState, useCallback, useEffect } from 'react';

const timeRanges = ['오늘', '7일', '30일', '90일'] as const;

interface AnalyticsData {
  publishStats: {
    totalPublished: number;
    thisWeekNew: number;
    periodUpdated: number;
  };
  topPages: Array<{
    title: string;
    url: string;
    pageviews: number;
    visitors: number;
    duration: string;
    source: string;
    publishedAt: string | null;
  }>;
  searchStatus: {
    sitemapStatus: string;
    lastIndexed: string | null;
    indexNowLogs: Array<{ time: string; status: 'success' | 'fail'; engine: string }>;
  };
  chartData: Array<{ date: string; count: number }>;
  range: string;
  timestamp: string;
}

/**
 * Analytics 페이지 - 통계 센터
 */
export default function AnalyticsPage() {
  const [selectedRange, setSelectedRange] = useState<(typeof timeRanges)[number]>('오늘');
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/admin/analytics?range=${selectedRange}`);
      if (!response.ok) {
        throw new Error('Analytics 데이터를 불러올 수 없습니다');
      }
      const analyticsData = await response.json();
      setData(analyticsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다');
      console.error('Failed to fetch analytics:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedRange]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

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
              }}
            >
              Analytics
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
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        ) : data ? (
          <>

        {/* 상위 페이지 성과 */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h2" sx={{ mb: 3, fontSize: '1.375rem', fontWeight: 700, px: 2 }}>
            상위 페이지 성과
          </Typography>
          <Paper>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: 'neutral.50' }}>
                  <TableCell sx={{ fontWeight: 600, color: 'text.secondary', fontSize: '0.75rem' }}>
                    URL / 제목
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600, color: 'text.secondary', fontSize: '0.75rem' }}>
                    페이지뷰
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600, color: 'text.secondary', fontSize: '0.75rem' }}>
                    방문자
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600, color: 'text.secondary', fontSize: '0.75rem' }}>
                    체류시간
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600, color: 'text.secondary', fontSize: '0.75rem' }}>
                    유입경로
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.topPages.length > 0 ? (
                  data.topPages.map((page, index) => (
                    <TableRow key={page.url || index}>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 500, mb: 0.5 }}>
                          {page.title}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          {page.url}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        {page.pageviews > 0 ? page.pageviews.toLocaleString() : '-'}
                      </TableCell>
                      <TableCell align="right">
                        {page.visitors > 0 ? page.visitors.toLocaleString() : '-'}
                      </TableCell>
                      <TableCell align="right">{page.duration}</TableCell>
                      <TableCell>{page.source}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                      <Typography variant="body2" color="text.secondary">
                        발행된 페이지가 없습니다
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Paper>
        </Box>

        {/* 발행 성과 및 검색/크롤링 상태 */}
        <Grid container spacing={3}>
          {/* @ts-ignore */}
          <Grid item xs={12} lg={6}>
            <Card>
              <CardContent>
                <Typography variant="h2" sx={{ mb: 3, fontSize: '1.375rem', fontWeight: 700 }}>
                  발행 성과
                </Typography>
                <Grid container spacing={2} sx={{ mb: 3 }}>
                  {/* @ts-ignore */}
                  <Grid item xs={4}>
                    <Typography variant="body2" sx={{ color: 'text.secondary', mb: 0.5 }}>
                      총 발행 수
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 700 }}>
                      {data.publishStats.totalPublished.toLocaleString()}
                    </Typography>
                  </Grid>
                  {/* @ts-ignore */}
                  <Grid item xs={4}>
                    <Typography variant="body2" sx={{ color: 'text.secondary', mb: 0.5 }}>
                      이번 주 신규
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 700 }}>
                      {data.publishStats.thisWeekNew.toLocaleString()}
                    </Typography>
                  </Grid>
                  {/* @ts-ignore */}
                  <Grid item xs={4}>
                    <Typography variant="body2" sx={{ color: 'text.secondary', mb: 0.5 }}>
                      업데이트
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 700 }}>
                      {data.publishStats.periodUpdated.toLocaleString()}
                    </Typography>
                  </Grid>
                </Grid>
                <Box sx={{ height: 160, bgcolor: 'neutral.100', borderRadius: 2, p: 2 }}>
                  {data.chartData.length > 0 ? (
                    <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1, height: '100%' }}>
                      {data.chartData.map((item, index) => (
                        <Box
                          key={index}
                          sx={{
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'flex-end',
                            height: '100%',
                          }}
                        >
                          <Box
                            sx={{
                              width: '100%',
                              height: `${Math.max((item.count / Math.max(...data.chartData.map(d => d.count))) * 100, 10)}%`,
                              bgcolor: 'primary.main',
                              borderRadius: 1,
                              mb: 1,
                            }}
                          />
                          <Typography variant="caption" sx={{ fontSize: '0.65rem', color: 'text.secondary' }}>
                            {item.date.split('-').slice(1).join('/')}
                          </Typography>
                          <Typography variant="caption" sx={{ fontSize: '0.7rem', fontWeight: 500 }}>
                            {item.count}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  ) : (
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                      <Typography variant="body2" color="text.secondary">
                        데이터가 없습니다
                      </Typography>
                    </Box>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>
          {/* @ts-ignore */}
          <Grid item xs={12} lg={6}>
            <Card>
              <CardContent>
                <Typography variant="h2" sx={{ mb: 3, fontSize: '1.375rem', fontWeight: 700 }}>
                  검색/크롤링 상태
                </Typography>
                <Grid container spacing={2} sx={{ mb: 3 }}>
                  {/* @ts-ignore */}
                  <Grid item xs={6}>
                    <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
                      Sitemap
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {data.searchStatus.sitemapStatus === 'ok' || data.searchStatus.sitemapStatus === 'success' ? (
                        <>
                          <CheckCircle sx={{ color: 'success.main' }} />
                          <Typography variant="h6" sx={{ fontWeight: 700, color: 'success.main' }}>
                            정상
                          </Typography>
                        </>
                      ) : (
                        <>
                          <ErrorIcon sx={{ color: 'error.main' }} />
                          <Typography variant="h6" sx={{ fontWeight: 700, color: 'error.main' }}>
                            {data.searchStatus.sitemapStatus === 'unknown' ? '알 수 없음' : '오류'}
                          </Typography>
                        </>
                      )}
                    </Box>
                  </Grid>
                  {/* @ts-ignore */}
                  <Grid item xs={6}>
                    <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
                      최근 색인
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Update />
                      <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        {data.searchStatus.lastIndexed || '없음'}
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
                <Box>
                  <Typography variant="body1" sx={{ mb: 2, fontWeight: 500 }}>
                    IndexNow API 상태
                  </Typography>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 600, color: 'text.secondary', fontSize: '0.75rem' }}>
                          시간
                        </TableCell>
                        <TableCell sx={{ fontWeight: 600, color: 'text.secondary', fontSize: '0.75rem' }}>
                          상태
                        </TableCell>
                        <TableCell sx={{ fontWeight: 600, color: 'text.secondary', fontSize: '0.75rem' }}>
                          엔진
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {data.searchStatus.indexNowLogs.length > 0 ? (
                        data.searchStatus.indexNowLogs.map((log, index) => (
                          <TableRow key={index}>
                            <TableCell>{log.time}</TableCell>
                            <TableCell>
                              <Box
                                sx={{
                                  display: 'inline-block',
                                  px: 1,
                                  py: 0.5,
                                  borderRadius: 2,
                                  bgcolor: log.status === 'success' ? 'success.light' : 'error.light',
                                  color: log.status === 'success' ? 'success.dark' : 'error.dark',
                                  fontSize: '0.75rem',
                                  fontWeight: 500,
                                }}
                              >
                                {log.status === 'success' ? '성공' : '실패'}
                              </Box>
                            </TableCell>
                            <TableCell>{log.engine}</TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={3} align="center" sx={{ py: 2 }}>
                            <Typography variant="body2" color="text.secondary">
                              IndexNow 로그가 없습니다
                            </Typography>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
          </>
        ) : null}
      </Container>
    </Box>
  );
}

