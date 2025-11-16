import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  LinearProgress,
  Grid,
  Chip,
  Link as MuiLink,
} from '@mui/material';
import { ArrowForward } from '@mui/icons-material';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';

interface CategoryStat {
  name: string;
  count: number;
  percentage: string;
}

interface RegionData {
  regionName: string;
  totalStores: number;
  categories: CategoryStat[];
  mainCategories: string[];
}

/**
 * 동적 메타데이터 생성 함수
 */
export async function generateMetadata({ params }: { params: Promise<{ name: string }> }): Promise<Metadata> {
  const { name } = await params;
  const regionName = decodeURIComponent(name);
  const title = `${regionName} 지역 상가 정보 | LOCARRY`;
  const description = `${regionName} 지역의 상가 정보와 통계를 확인하세요.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      locale: 'ko_KR',
      siteName: 'LOCARRY',
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
    alternates: {
      canonical: `/region/${encodeURIComponent(regionName)}`,
    },
  };
}

/**
 * 지역 허브 페이지
 * 특정 지역의 상가 현황 요약을 보여주는 페이지
 */
export default async function RegionHubPage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name } = await params;
  const regionName = decodeURIComponent(name);

  // API에서 지역 통계 가져오기
  let regionData: RegionData;
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/region/${encodeURIComponent(name)}`, {
      next: { revalidate: 3600 }, // 1시간마다 재검증
    });

    if (!response.ok) {
      if (response.status === 404) {
        notFound();
      }
      throw new Error(`Failed to fetch region data: ${response.status}`);
    }

    regionData = await response.json();
  } catch (error) {
    console.error('Failed to fetch region data:', error);
    notFound();
  }

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
          py: { xs: 2, sm: 3, md: 4 },
        }}
      >
        <Container maxWidth="md">
          <Box sx={{ mb: 3 }}>
            <Typography
              variant="h1"
              sx={{
                fontSize: { xs: '2rem', sm: '2.5rem' },
                fontWeight: 900,
                letterSpacing: '-0.033em',
                color: 'text.primary',
              }}
            >
              {regionName}
            </Typography>
          </Box>

          {/* 총 상가 개수 */}
          <Card sx={{ mb: 4, bgcolor: 'neutral.50', border: 1, borderColor: 'neutral.200' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1, fontWeight: 500 }}>
                총 상가 개수
              </Typography>
              <Typography
                variant="h2"
                sx={{
                  fontSize: { xs: '2rem', sm: '2.5rem' },
                  fontWeight: 700,
                  color: 'text.primary',
                }}
              >
                {regionData.totalStores.toLocaleString()}개
              </Typography>
            </CardContent>
          </Card>

          {/* 업종별 분포 */}
          <Box sx={{ mb: 4, py: 2 }}>
            <Typography
              variant="h3"
              sx={{
                fontSize: '1.125rem',
                fontWeight: 700,
                mb: 2,
                letterSpacing: '-0.015em',
                color: 'text.primary',
              }}
            >
              업종별 분포
            </Typography>
            {regionData.categories.length > 0 ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                {regionData.categories.map((category, index) => {
                  const maxCount = regionData.categories[0]?.count || 1;
                  return (
                    <Box key={category.name}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                          {category.name}
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.primary' }}>
                          {category.count.toLocaleString()}개 ({category.percentage}%)
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={(category.count / maxCount) * 100}
                        sx={{
                          height: 8,
                          borderRadius: 1,
                          bgcolor: 'neutral.200',
                          '& .MuiLinearProgress-bar': {
                            bgcolor: 'primary.main',
                            borderRadius: 1,
                          },
                        }}
                      />
                    </Box>
                  );
                })}
              </Box>
            ) : (
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                업종 정보가 없습니다.
              </Typography>
            )}
          </Box>

          <Box sx={{ borderTop: 1, borderColor: 'neutral.200', my: 2 }} />

          {/* 주요 업종 보기 */}
          <Box sx={{ mb: 4, py: 2 }}>
            <Typography
              variant="h3"
              sx={{
                fontSize: '1.125rem',
                fontWeight: 700,
                mb: 2,
                letterSpacing: '-0.015em',
                color: 'text.primary',
              }}
            >
              주요 업종 보기
            </Typography>
            {regionData.mainCategories.length > 0 ? (
              <Grid container spacing={1.5}>
                {regionData.mainCategories.map((category) => (
                  // @ts-ignore
                  <Grid item xs={6} sm={4} key={category}>
                    <Chip
                      label={category}
                      component={MuiLink}
                      href={`/shop?category=${encodeURIComponent(category)}&region=${encodeURIComponent(regionName)}`}
                      clickable
                      sx={{
                        width: '100%',
                        height: 40,
                        borderRadius: 1,
                        bgcolor: 'neutral.50',
                        color: 'text.primary',
                        fontWeight: 500,
                        '&:hover': {
                          bgcolor: 'neutral.200',
                        },
                      }}
                    />
                  </Grid>
                ))}
              </Grid>
            ) : (
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                주요 업종 정보가 없습니다.
              </Typography>
            )}
          </Box>

          {/* 전체 보기 링크 */}
          <Box sx={{ textAlign: 'center', mt: 4 }}>
            <MuiLink
              href={`/shop?region=${encodeURIComponent(regionName)}`}
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 1,
                color: 'primary.main',
                fontWeight: 700,
                textDecoration: 'none',
                '&:hover': {
                  textDecoration: 'underline',
                },
              }}
            >
              <span>해당 지역 상가 전체 보기</span>
              <ArrowForward fontSize="small" />
            </MuiLink>
          </Box>
        </Container>
      </Box>
      <Footer />
    </Box>
  );
}

