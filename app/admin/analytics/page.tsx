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
} from '@mui/material';
import { Grid } from '@mui/material';
import { CheckCircle, Update } from '@mui/icons-material';
import { useState, useCallback } from 'react';

const timeRanges = ['오늘', '7일', '30일', '90일', '직접 선택'] as const;

const topPages = [
  {
    title: '강남구 1인 미용실 창업 비용 완벽 분석',
    url: '/posts/gangnam-hair-salon-costs',
    pageviews: 2492,
    visitors: 1820,
    duration: '3분 12초',
    source: 'Google',
  },
  {
    title: '홍대 카페 상권 트렌드 리포트',
    url: '/reports/hongdae-cafe-trends',
    pageviews: 1830,
    visitors: 1512,
    duration: '2분 45초',
    source: 'Naver',
  },
  {
    title: '종로구 음식점 평균 매출 데이터',
    url: '/data/jongno-restaurant-sales',
    pageviews: 1205,
    visitors: 988,
    duration: '4분 02초',
    source: 'Direct',
  },
  {
    title: '마포구 스터디카페 입지 분석',
    url: '/analysis/mapo-study-cafe',
    pageviews: 980,
    visitors: 810,
    duration: '2분 55초',
    source: 'Google',
  },
  {
    title: '2024년 공유오피스 시장 전망',
    url: '/insight/2024-shared-office',
    pageviews: 750,
    visitors: 640,
    duration: '3분 30초',
    source: 'Brunch',
  },
];

const indexNowLogs = [
  { time: '08-23 14:02', status: 'success', engine: 'Google' },
  { time: '08-23 13:55', status: 'success', engine: 'Naver' },
  { time: '08-23 11:30', status: 'fail', engine: 'Bing' },
];

/**
 * Analytics 페이지 - 통계 센터
 */
export default function AnalyticsPage() {
  const [selectedRange, setSelectedRange] = useState<(typeof timeRanges)[number]>('오늘');

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
        {/* 방문자 통계 */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h2" sx={{ mb: 3, fontSize: '1.375rem', fontWeight: 700, px: 2 }}>
            방문자 통계
          </Typography>
          <Grid container spacing={3}>
            {/* @ts-ignore */}
            <Grid item xs={12} lg={8}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="body1" sx={{ mb: 1, fontWeight: 500 }}>
                    방문자 및 페이지뷰
                  </Typography>
                  <Typography variant="h3" sx={{ fontSize: '2rem', fontWeight: 700, mb: 1 }}>
                    1,482
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      지난 30일
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'success.main', fontWeight: 500 }}>
                      +12.5%
                    </Typography>
                  </Box>
                  <Box sx={{ height: 180, bgcolor: 'neutral.100', borderRadius: 2 }}>
                    {/* 차트 영역 */}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            {/* @ts-ignore */}
            <Grid item xs={12} lg={4}>
              <Grid container spacing={3}>
                {/* @ts-ignore */}
                <Grid item xs={12}>
                  <Card>
                    <CardContent>
                      <Typography variant="body1" sx={{ mb: 2, fontWeight: 500 }}>
                        기기 비율
                      </Typography>
                      <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                        <Box
                          sx={{
                            width: 128,
                            height: 128,
                            borderRadius: '50%',
                            bgcolor: 'neutral.200',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            position: 'relative',
                          }}
                        >
                          <Typography variant="h6" sx={{ fontWeight: 700 }}>
                            72%
                          </Typography>
                        </Box>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-around' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'primary.main' }} />
                          <Typography variant="body2">모바일</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'neutral.200' }} />
                          <Typography variant="body2">데스크탑</Typography>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
                {/* @ts-ignore */}
                <Grid item xs={12}>
                  <Card>
                    <CardContent>
                      <Typography variant="body1" sx={{ mb: 2, fontWeight: 500 }}>
                        브라우저 비율
                      </Typography>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                        {[
                          { name: 'Chrome', percent: 65 },
                          { name: 'Safari', percent: 20 },
                          { name: 'Edge', percent: 10 },
                          { name: '기타', percent: 5 },
                        ].map((item) => (
                          <Box key={item.name} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                              {item.name}
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                              {item.percent}%
                            </Typography>
                          </Box>
                        ))}
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </Box>

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
                {topPages.map((page) => (
                  <TableRow key={page.url}>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500, mb: 0.5 }}>
                        {page.title}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        {page.url}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">{page.pageviews.toLocaleString()}</TableCell>
                    <TableCell align="right">{page.visitors.toLocaleString()}</TableCell>
                    <TableCell align="right">{page.duration}</TableCell>
                    <TableCell>{page.source}</TableCell>
                  </TableRow>
                ))}
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
                      1,204
                    </Typography>
                  </Grid>
                  {/* @ts-ignore */}
                  <Grid item xs={4}>
                    <Typography variant="body2" sx={{ color: 'text.secondary', mb: 0.5 }}>
                      이번 주 신규
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 700 }}>
                      32
                    </Typography>
                  </Grid>
                  {/* @ts-ignore */}
                  <Grid item xs={4}>
                    <Typography variant="body2" sx={{ color: 'text.secondary', mb: 0.5 }}>
                      업데이트
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 700 }}>
                      15
                    </Typography>
                  </Grid>
                </Grid>
                <Box sx={{ height: 160, bgcolor: 'neutral.100', borderRadius: 2 }}>
                  {/* 차트 영역 */}
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
                      <CheckCircle sx={{ color: 'success.main' }} />
                      <Typography variant="h6" sx={{ fontWeight: 700, color: 'success.main' }}>
                        정상
                      </Typography>
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
                        3시간 전
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
                      {indexNowLogs.map((log, index) => (
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
                      ))}
                    </TableBody>
                  </Table>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}

