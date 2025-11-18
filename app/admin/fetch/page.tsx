'use client';

import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  Grid,
  Chip,
  CircularProgress,
  Alert,
  Paper,
  Divider,
  Stack,
} from '@mui/material';
import {
  PlayArrow,
  Refresh,
  CheckCircle,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { useState, useCallback, useEffect } from 'react';

/**
 * 수집 상태 인터페이스
 */
interface FetchStatus {
  status: string;
  database: {
    rawStore: number;
    bizPlace: number;
    bizMeta: number;
  };
  initialFetch: {
    nextDongIndex: number;
    lastDong: string | null;
    lastPage: number | null;
    isResuming: boolean;
  };
  incrementalFetch: {
    lastModDate: string | null;
    lastPage: number | null;
    isResuming: boolean;
  };
  environment: {
    hasPublicDataApiKey: boolean;
    hasOpenAIApiKey: boolean;
  };
  timestamp: string;
}

/**
 * 공공데이터 수집 관리 페이지
 */
export default function FetchManagementPage() {
  const [status, setStatus] = useState<FetchStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [triggering, setTriggering] = useState<'initial' | 'incremental' | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // 초기 로드 및 주기적 업데이트
  useEffect(() => {
    fetchStatus();
    const interval = setInterval(() => {
      fetchStatus();
    }, 30000); // 30초마다 자동 갱신

    return () => clearInterval(interval);
  }, []);

  /**
   * 수집 상태 조회
   */
  const fetchStatus = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/fetch/status');
      if (!response.ok) {
        throw new Error('수집 상태를 불러올 수 없습니다');
      }
      const data = await response.json();
      setStatus(data);
      setLastUpdate(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류');
      console.error('Failed to fetch status:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * 초기 수집 트리거
   */
  const triggerInitialFetch = useCallback(async () => {
    try {
      setTriggering('initial');
      const response = await fetch('/api/fetch/initial', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '초기 수집 시작에 실패했습니다');
      }

      const data = await response.json();
      
      // 성공 후 상태 갱신
      setTimeout(() => {
        fetchStatus();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류');
    } finally {
      setTriggering(null);
    }
  }, [fetchStatus]);

  /**
   * 증분 수집 트리거
   */
  const triggerIncrementalFetch = useCallback(async () => {
    try {
      setTriggering('incremental');
      const response = await fetch('/api/fetch/incremental', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '증분 수집 시작에 실패했습니다');
      }

      const data = await response.json();
      
      // 성공 후 상태 갱신
      setTimeout(() => {
        fetchStatus();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류');
    } finally {
      setTriggering(null);
    }
  }, [fetchStatus]);

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
              공공데이터 수집 관리
            </Typography>
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={fetchStatus}
              disabled={loading}
              sx={{ borderRadius: 2 }}
            >
              새로고침
            </Button>
          </Box>
        </Container>
      </Box>

      <Container maxWidth="xl" sx={{ py: { xs: 2, sm: 3, lg: 4 } }}>
        {/* 에러 메시지 */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* 로딩 상태 */}
        {loading && !status ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : status ? (
          <Grid container spacing={3}>
            {/* 환경 설정 상태 */}
            {/* @ts-ignore */}
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
                    환경 설정
                  </Typography>
                  <Stack direction="row" spacing={2} flexWrap="wrap">
                    <Chip
                      icon={status.environment.hasPublicDataApiKey ? <CheckCircle /> : <ErrorIcon />}
                      label={`공공데이터 API 키: ${status.environment.hasPublicDataApiKey ? '설정됨' : '미설정'}`}
                      color={status.environment.hasPublicDataApiKey ? 'success' : 'error'}
                      variant="outlined"
                    />
                    <Chip
                      icon={status.environment.hasOpenAIApiKey ? <CheckCircle /> : <WarningIcon />}
                      label={`OpenAI API 키: ${status.environment.hasOpenAIApiKey ? '설정됨' : '미설정'}`}
                      color={status.environment.hasOpenAIApiKey ? 'success' : 'warning'}
                      variant="outlined"
                    />
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            {/* 데이터베이스 통계 */}
            {/* @ts-ignore */}
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
                    데이터베이스 통계
                  </Typography>
                  <Stack spacing={2}>
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        원본 데이터 (raw_store)
                      </Typography>
                      <Typography variant="h4" sx={{ fontWeight: 700 }}>
                        {status.database.rawStore.toLocaleString()}
                      </Typography>
                    </Box>
                    <Divider />
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        정규화된 상가 (biz_place)
                      </Typography>
                      <Typography variant="h4" sx={{ fontWeight: 700 }}>
                        {status.database.bizPlace.toLocaleString()}
                      </Typography>
                    </Box>
                    <Divider />
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        발행 메타데이터 (biz_meta)
                      </Typography>
                      <Typography variant="h4" sx={{ fontWeight: 700 }}>
                        {status.database.bizMeta.toLocaleString()}
                      </Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            {/* 초기 수집 상태 */}
            {/* @ts-ignore */}
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                      초기 수집
                    </Typography>
                    {status.initialFetch.isResuming && (
                      <Chip
                        icon={<WarningIcon />}
                        label="재개 중"
                        color="warning"
                        size="small"
                      />
                    )}
                  </Box>
                  <Stack spacing={2} sx={{ mb: 3 }}>
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        다음 행정동 인덱스
                      </Typography>
                      <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        {status.initialFetch.nextDongIndex}
                      </Typography>
                    </Box>
                    {status.initialFetch.lastDong && (
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          마지막 처리 동
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                          {status.initialFetch.lastDong}
                        </Typography>
                      </Box>
                    )}
                    {status.initialFetch.lastPage && (
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          마지막 페이지
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                          {status.initialFetch.lastPage}
                        </Typography>
                      </Box>
                    )}
                  </Stack>
                  <Button
                    variant="contained"
                    fullWidth
                    startIcon={triggering === 'initial' ? <CircularProgress size={16} /> : <PlayArrow />}
                    onClick={triggerInitialFetch}
                    disabled={triggering !== null || !status.environment.hasPublicDataApiKey}
                    sx={{ borderRadius: 2 }}
                  >
                    {triggering === 'initial' ? '수집 중...' : '초기 수집 시작'}
                  </Button>
                </CardContent>
              </Card>
            </Grid>

            {/* 증분 수집 상태 */}
            {/* @ts-ignore */}
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                      증분 수집
                    </Typography>
                    {status.incrementalFetch.isResuming && (
                      <Chip
                        icon={<WarningIcon />}
                        label="재개 중"
                        color="warning"
                        size="small"
                      />
                    )}
                  </Box>
                  <Stack spacing={2} sx={{ mb: 3 }}>
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        마지막 수정일
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>
                        {status.incrementalFetch.lastModDate
                          ? new Date(status.incrementalFetch.lastModDate).toLocaleString('ko-KR')
                          : '없음'}
                      </Typography>
                    </Box>
                    {status.incrementalFetch.lastPage && (
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          마지막 페이지
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                          {status.incrementalFetch.lastPage}
                        </Typography>
                      </Box>
                    )}
                  </Stack>
                  <Button
                    variant="contained"
                    fullWidth
                    startIcon={triggering === 'incremental' ? <CircularProgress size={16} /> : <PlayArrow />}
                    onClick={triggerIncrementalFetch}
                    disabled={triggering !== null || !status.environment.hasPublicDataApiKey}
                    sx={{ borderRadius: 2 }}
                  >
                    {triggering === 'incremental' ? '수집 중...' : '증분 수집 시작'}
                  </Button>
                </CardContent>
              </Card>
            </Grid>

            {/* 마지막 업데이트 시간 */}
            {lastUpdate && (
              /* @ts-ignore */
              <Grid item xs={12}>
                <Paper
                  sx={{
                    p: 2,
                    bgcolor: 'neutral.50',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                  }}
                >
                  <InfoIcon fontSize="small" color="action" />
                  <Typography variant="body2" color="text.secondary">
                    마지막 업데이트: {lastUpdate.toLocaleString('ko-KR')}
                  </Typography>
                </Paper>
              </Grid>
            )}
          </Grid>
        ) : null}
      </Container>
    </Box>
  );
}

