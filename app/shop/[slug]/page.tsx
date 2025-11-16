import {
  Box,
  Container,
  Typography,
  Chip,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';
import { Map, NearMe } from '@mui/icons-material';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';

/**
 * 상가 데이터 타입
 */
interface StoreData {
  id: string;
  slug: string;
  name: string | null;
  category: string | null;
  address: string | null;
  addrRoad: string | null;
  addrJibun: string | null;
  sido: string | null;
  sigungu: string | null;
  dong: string | null;
  lat: number | null;
  lng: number | null;
  status: string | null;
  licenseDate: string | null;
  summary: string | null;
  faq: Array<{ question: string; answer: string }> | null;
  lastPublishedAt: number | null;
}

/**
 * 동적 메타데이터 생성 함수
 */
export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/shop/${params.slug}`, {
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      return {
        title: '상가 정보 | LOCARRY',
        description: '상가 상세 정보를 확인하세요.',
      };
    }

    const storeData = await response.json();
    const title = `${storeData.name || '상가'} - ${storeData.category || '상가 정보'} | LOCARRY`;
    const description =
      storeData.summary ||
      `${storeData.name || '상가'}의 상세 정보를 확인하세요. 위치: ${storeData.address || '정보 없음'}`;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type: 'website',
        locale: 'ko_KR',
        siteName: 'LOCARRY',
        ...(storeData.address && {
          addressLocality: storeData.dong || storeData.sigungu || storeData.sido || '',
          addressRegion: storeData.sido || '',
        }),
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
      },
      alternates: {
        canonical: `/shop/${params.slug}`,
      },
      ...(storeData.category && {
        keywords: [storeData.category, storeData.sido || '', storeData.sigungu || '', storeData.dong || '', '상가', '상권'].filter(Boolean).join(', '),
      }),
    };
  } catch (error) {
    console.error('Failed to generate metadata:', error);
    return {
      title: '상가 정보 | LOCARRY',
      description: '상가 상세 정보를 확인하세요.',
    };
  }
}

/**
 * 상가 상세 페이지 (서버 컴포넌트)
 */
export default async function ShopDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const { slug } = params;

  // API에서 상가 정보 가져오기
  let storeData: StoreData;
  try {
    // Cloudflare Pages에서는 같은 도메인의 API 라우트 사용
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/shop/${slug}`, {
      next: { revalidate: 3600 }, // 1시간마다 재검증
    });

    if (!response.ok) {
      if (response.status === 404) {
        notFound();
      }
      throw new Error(`Failed to fetch store: ${response.status}`);
    }

    storeData = await response.json();
  } catch (error) {
    console.error('Failed to fetch store data:', error);
    notFound();
  }

  // FAQ 파싱
  const faq = storeData.faq || [];

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
        <Container maxWidth="lg">
          {/* 헤더 섹션 */}
          <Box
            sx={{
              borderBottom: 1,
              borderColor: 'neutral.200',
              pb: 3,
              mb: 3,
            }}
          >
            <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 2 }}>
              <Box>
                {storeData.status && (
                  <Chip
                    label={storeData.status}
                    color="primary"
                    sx={{
                      mb: 1.5,
                      fontWeight: 700,
                      bgcolor: 'primary.light',
                      color: 'primary.dark',
                    }}
                  />
                )}
                <Typography
                  variant="h1"
                  sx={{
                    fontSize: { xs: '2rem', sm: '2.5rem' },
                    fontWeight: 700,
                    mb: 1,
                    color: 'text.primary',
                  }}
                >
                  {storeData.name || '상가명 없음'}
                </Typography>
                <Typography variant="body1" sx={{ color: 'text.secondary' }}>
                  {storeData.category || '업종 미제공'} · {storeData.address || '주소 미제공'}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 1, width: { xs: '100%', sm: 'auto' } }}>
                <Button
                  variant="outlined"
                  startIcon={<Map />}
                  sx={{
                    flex: { xs: 1, sm: 'none' },
                    borderColor: 'neutral.300',
                    color: 'text.primary',
                    '&:hover': {
                      borderColor: 'primary.main',
                      bgcolor: 'neutral.50',
                    },
                  }}
                >
                  지도
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<NearMe />}
                  sx={{
                    flex: { xs: 1, sm: 'none' },
                    borderColor: 'neutral.300',
                    color: 'text.primary',
                    '&:hover': {
                      borderColor: 'primary.main',
                      bgcolor: 'neutral.50',
                    },
                  }}
                >
                  길찾기
                </Button>
              </Box>
            </Box>
          </Box>

          {/* 매장 요약 정보 */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h2" sx={{ mb: 2, fontSize: '1.25rem', fontWeight: 700 }}>
              매장 요약 정보
            </Typography>
            <Paper
              elevation={0}
              sx={{
                p: { xs: 2.5, sm: 3 },
                bgcolor: 'neutral.50',
                borderRadius: 2,
              }}
            >
              <Typography variant="body1" sx={{ color: 'text.secondary', lineHeight: 1.75 }}>
                {storeData.summary || '공공데이터 기반 상가 정보입니다.'}
              </Typography>
            </Paper>
          </Box>

          {/* 공공데이터 정보 */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h2" sx={{ mb: 2, fontSize: '1.25rem', fontWeight: 700 }}>
              공공데이터 정보
            </Typography>
            <Table>
              <TableBody>
                <TableRow>
                  <TableCell
                    component="th"
                    sx={{
                      width: '25%',
                      fontWeight: 500,
                      color: 'text.secondary',
                      borderBottom: 1,
                      borderColor: 'neutral.200',
                    }}
                  >
                    인허가일자
                  </TableCell>
                  <TableCell sx={{ borderBottom: 1, borderColor: 'neutral.200' }}>
                    {storeData.licenseDate || '공공데이터 미제공'}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell
                    component="th"
                    sx={{
                      fontWeight: 500,
                      color: 'text.secondary',
                      borderBottom: 1,
                      borderColor: 'neutral.200',
                    }}
                  >
                    주소 (도로명)
                  </TableCell>
                  <TableCell sx={{ borderBottom: 1, borderColor: 'neutral.200' }}>
                    {storeData.addrRoad || '공공데이터 미제공'}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell
                    component="th"
                    sx={{
                      fontWeight: 500,
                      color: 'text.secondary',
                      borderBottom: 1,
                      borderColor: 'neutral.200',
                    }}
                  >
                    주소 (지번)
                  </TableCell>
                  <TableCell sx={{ borderBottom: 1, borderColor: 'neutral.200' }}>
                    {storeData.addrJibun || '공공데이터 미제공'}
                  </TableCell>
                </TableRow>
                {storeData.lat && storeData.lng && (
                  <TableRow>
                    <TableCell
                      component="th"
                      sx={{
                        fontWeight: 500,
                        color: 'text.secondary',
                        borderBottom: 1,
                        borderColor: 'neutral.200',
                      }}
                    >
                      좌표
                    </TableCell>
                    <TableCell sx={{ borderBottom: 1, borderColor: 'neutral.200' }}>
                      {storeData.lat}, {storeData.lng}
                    </TableCell>
                  </TableRow>
                )}
                <TableRow>
                  <TableCell
                    component="th"
                    sx={{
                      fontWeight: 500,
                      color: 'text.secondary',
                    }}
                  >
                    발행일자
                  </TableCell>
                  <TableCell>
                    {storeData.lastPublishedAt
                      ? new Date(storeData.lastPublishedAt * 1000).toLocaleDateString('ko-KR')
                      : '미발행'}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </Box>

          {/* FAQ */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h2" sx={{ mb: 2, fontSize: '1.25rem', fontWeight: 700 }}>
              자주 묻는 질문 (FAQ)
            </Typography>
            {faq.length > 0 ? (
              <Box sx={{ borderTop: 1, borderColor: 'neutral.200', pt: 2 }}>
                {faq.map((item, index) => (
                  <Box key={index} sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
                      Q. {item.question}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary', pl: 2 }}>
                      A. {item.answer}
                    </Typography>
                  </Box>
                ))}
              </Box>
            ) : (
              <Box sx={{ borderTop: 1, borderColor: 'neutral.200', pt: 2 }}>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  FAQ 정보가 아직 생성되지 않았습니다.
                </Typography>
              </Box>
            )}
          </Box>

          {/* 관련 정보 */}
          {storeData.sido && storeData.sigungu && (
            <Box sx={{ mb: 4 }}>
              <Typography variant="h2" sx={{ mb: 2, fontSize: '1.25rem', fontWeight: 700 }}>
                관련 정보
              </Typography>
              <Box sx={{ borderTop: 1, borderColor: 'neutral.200', pt: 1 }}>
                {storeData.dong && (
                  <Typography
                    component="a"
                    href={`/region/${encodeURIComponent(storeData.dong)}`}
                    sx={{
                      display: 'block',
                      py: 1,
                      px: 1,
                      color: 'primary.main',
                      textDecoration: 'none',
                      borderRadius: 1,
                      '&:hover': {
                        bgcolor: 'primary.light',
                        color: 'primary.dark',
                      },
                    }}
                  >
                    {storeData.dong} 상권 정보
                  </Typography>
                )}
                {storeData.sigungu && (
                  <Typography
                    component="a"
                    href={`/region/${encodeURIComponent(storeData.sigungu)}`}
                    sx={{
                      display: 'block',
                      py: 1,
                      px: 1,
                      color: 'primary.main',
                      textDecoration: 'none',
                      borderRadius: 1,
                      '&:hover': {
                        bgcolor: 'primary.light',
                        color: 'primary.dark',
                      },
                    }}
                  >
                    {storeData.sido} {storeData.sigungu} 상권 정보
                  </Typography>
                )}
                {storeData.category && (
                  <Typography
                    component="a"
                    href={`/shop?category=${encodeURIComponent(storeData.category)}`}
                    sx={{
                      display: 'block',
                      py: 1,
                      px: 1,
                      color: 'primary.main',
                      textDecoration: 'none',
                      borderRadius: 1,
                      '&:hover': {
                        bgcolor: 'primary.light',
                        color: 'primary.dark',
                      },
                    }}
                  >
                    {storeData.category} 업종 전체 보기
                  </Typography>
                )}
              </Box>
            </Box>
          )}
        </Container>
      </Box>
      <Footer />
    </Box>
  );
}
