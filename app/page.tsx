'use client';

import { Box, Container, FormControl, MenuItem, Select, SelectChangeEvent, Typography } from '@mui/material';
import { useState, useCallback } from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

const regions = [
  '지역을 선택하세요',
  '서울특별시',
  '부산광역시',
  '대구광역시',
  '인천광역시',
  '광주광역시',
  '대전광역시',
  '울산광역시',
  '세종특별자치시',
  '경기도',
  '강원도',
  '충청북도',
  '충청남도',
  '전라북도',
  '전라남도',
  '경상북도',
  '경상남도',
  '제주특별자치도',
];

/**
 * 홈 페이지 - 지역 선택 또는 검색창
 */
export default function HomePage() {
  const [selectedRegion, setSelectedRegion] = useState('');

  const handleRegionChange = useCallback((event: SelectChangeEvent<string>) => {
    const value = event.target.value;
    setSelectedRegion(value);
    if (value && value !== '지역을 선택하세요') {
      // TODO: 지역 선택 시 해당 지역 허브 페이지로 이동
      // router.push(`/region/${encodeURIComponent(value)}`);
    }
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
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          px: 2,
          py: { xs: 6, sm: 8, lg: 10 },
        }}
      >
        <Container maxWidth="lg">
          <Box sx={{ mb: 6 }}>
            <Typography
              variant="h1"
              sx={{
                fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' },
                fontWeight: 700,
                mb: 2,
                color: 'text.primary',
              }}
            >
              상가 정보, 이제 공공데이터로 쉽게 찾으세요.
            </Typography>
            <Typography
              variant="body1"
              sx={{
                fontSize: { xs: '0.875rem', sm: '1rem' },
                color: 'text.secondary',
                mb: 4,
              }}
            >
              지역을 선택하여 우리 동네 상가 정보를 확인해보세요.
            </Typography>
          </Box>

          {/* 통계 카드 */}
          {loading ? (
            <Box sx={{ mb: 4 }}>
              <LoadingSpinner message="통계 데이터를 불러오는 중..." />
            </Box>
          ) : error ? (
            <Alert severity="error" sx={{ mb: 4, maxWidth: 600, mx: 'auto' }}>
              {error}
            </Alert>
          ) : stats ? (
            <Grid container spacing={3} sx={{ mb: 6 }}>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                      {stats.totalStores.toLocaleString()}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      전체 상가
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                      {stats.publishedStores.toLocaleString()}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      발행된 상가
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                      {stats.totalRegions.toLocaleString()}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      지역 수
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" sx={{ fontWeight: 700, mb: 1, fontSize: '1rem' }}>
                      {stats.lastUpdated ? new Date(stats.lastUpdated).toLocaleDateString('ko-KR') : '-'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      최종 업데이트
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          ) : null}

          {/* 지역 선택 */}
          <Box sx={{ mt: 4, maxWidth: 400, mx: 'auto' }}>
            <FormControl fullWidth>
              <Select
                value={selectedRegion}
                onChange={handleRegionChange}
                displayEmpty
                sx={{
                  height: 56,
                  borderRadius: 2,
                  bgcolor: 'background.paper',
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'neutral.300',
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'primary.main',
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'primary.main',
                    borderWidth: 2,
                  },
                }}
              >
                {regions.map((region) => (
                  <MenuItem key={region} value={region === '지역을 선택하세요' ? '' : region}>
                    {region}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </Container>
      </Box>
      <Footer />
    </Box>
  );
}
