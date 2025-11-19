'use client';

import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  Chip,
  CircularProgress,
  Alert,
  Paper,
  Divider,
  Stack,
} from '@mui/material';
import { Grid } from '@mui/material';
import {
  PlayArrow,
  Refresh,
  CheckCircle,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  FormHelperText,
} from '@mui/material';

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
 * Component: FetchManagementPage
 * 공공데이터 수집 관리 페이지
 * @param {void} - Props 없음
 * @example <FetchManagementPage />
 */
export default function FetchManagementPage() {
  const [status, setStatus] = useState<FetchStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [triggering, setTriggering] = useState<'initial' | 'incremental' | 'manual' | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [lastFetchResult, setLastFetchResult] = useState<{ type: 'initial' | 'incremental' | 'manual'; insertedCount: number; beforeCount: number; afterCount: number } | null>(null);
  
  // 수동 수집 다이얼로그 상태
  const [manualDialogOpen, setManualDialogOpen] = useState(false);
  const [manualType, setManualType] = useState<'dong' | 'date'>('dong');
  const [manualDongCode, setManualDongCode] = useState('');
  const [manualDate, setManualDate] = useState('');
  const [manualMaxPages, setManualMaxPages] = useState(5);

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
      setError(null);
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
      
      // 수집 결과 저장
      if (data.data) {
        setLastFetchResult({
          type: 'initial',
          insertedCount: data.data.insertedCount || 0,
          beforeCount: data.data.beforeCount || 0,
          afterCount: data.data.afterCount || 0,
        });
        
        // 수집 결과에 따른 메시지 표시
        if (data.data.insertedCount > 0) {
          // 성공 메시지는 Alert로 표시하지 않고 상태만 갱신
        } else {
          setError('수집이 완료되었지만 새로운 데이터가 저장되지 않았습니다. API 응답을 확인하세요.');
        }
      }
      
      // 성공 후 상태 갱신
      setTimeout(() => {
        fetchStatus();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류');
      setLastFetchResult(null);
    } finally {
      setTriggering(null);
    }
  }, [fetchStatus]);

  /**
   * 수동 수집 트리거
   */
  const triggerManualFetch = useCallback(async () => {
    if (manualType === 'dong' && !manualDongCode.trim()) {
      setError('행정동 코드를 입력해주세요');
      return;
    }
    if (manualType === 'date' && !manualDate.trim()) {
      setError('날짜를 입력해주세요 (YYYYMMDD 형식)');
      return;
    }

    try {
      setTriggering('manual');
      setError(null);
      setManualDialogOpen(false);
      
      const response = await fetch('/api/fetch/manual', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: manualType,
          dongCode: manualType === 'dong' ? manualDongCode.trim() : undefined,
          date: manualType === 'date' ? manualDate.trim() : undefined,
          maxPages: manualMaxPages || 5,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '수동 수집 시작에 실패했습니다');
      }

      const data = await response.json();
      
      // 수집 결과 저장
      if (data.data) {
        setLastFetchResult({
          type: 'manual',
          insertedCount: data.data.insertedCount || 0,
          beforeCount: data.data.beforeCount || 0,
          afterCount: data.data.afterCount || 0,
        });
        
        if (data.data.insertedCount > 0) {
          // 성공 메시지는 Alert로 표시하지 않고 상태만 갱신
        } else {
          setError('수집이 완료되었지만 새로운 데이터가 저장되지 않았습니다.');
        }
        
        if (data.data.errors && data.data.errors.length > 0) {
          setError(`일부 페이지 수집 실패: ${data.data.errors.length}개 페이지`);
        }
      }
      
      // 성공 후 상태 갱신
      setTimeout(() => {
        fetchStatus();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류');
      setLastFetchResult(null);
    } finally {
      setTriggering(null);
    }
  }, [manualType, manualDongCode, manualDate, manualMaxPages, fetchStatus]);

  /**
   * 증분 수집 트리거
   */
  const triggerIncrementalFetch = useCallback(async () => {
    try {
      setTriggering('incremental');
      setError(null);
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
      
      // 수집 결과 저장
      if (data.data) {
        setLastFetchResult({
          type: 'incremental',
          insertedCount: data.data.insertedCount || 0,
          beforeCount: data.data.beforeCount || 0,
          afterCount: data.data.afterCount || 0,
        });
        
        // 수집 결과에 따른 메시지 표시
        if (data.data.insertedCount > 0) {
          // 성공 메시지는 Alert로 표시하지 않고 상태만 갱신
        } else {
          setError('수집이 완료되었지만 새로운 데이터가 저장되지 않았습니다. API 응답을 확인하세요.');
        }
      }
      
      // 성공 후 상태 갱신
      setTimeout(() => {
        fetchStatus();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류');
      setLastFetchResult(null);
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
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="outlined"
                startIcon={<SettingsIcon />}
                onClick={() => setManualDialogOpen(true)}
                disabled={triggering !== null || !status?.environment.hasPublicDataApiKey}
                sx={{ borderRadius: 2 }}
                aria-label="수동 수집 설정"
              >
                수동 수집
              </Button>
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
        
        {/* 수집 결과 메시지 */}
        {lastFetchResult && lastFetchResult.insertedCount > 0 && (
          <Alert severity="success" sx={{ mb: 3 }} onClose={() => setLastFetchResult(null)}>
            {lastFetchResult.type === 'initial' ? '초기' : lastFetchResult.type === 'incremental' ? '증분' : '수동'} 수집 완료: {lastFetchResult.insertedCount.toLocaleString()}개 데이터 저장됨
            (이전: {lastFetchResult.beforeCount.toLocaleString()} → 현재: {lastFetchResult.afterCount.toLocaleString()})
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
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                      데이터베이스 통계
                    </Typography>
                    <Button
                      size="small"
                      startIcon={<Refresh />}
                      onClick={fetchStatus}
                      disabled={loading}
                    >
                      새로고침
                    </Button>
                  </Box>
                  <Stack spacing={2}>
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        원본 데이터 (raw_store)
                      </Typography>
                      <Typography variant="h4" sx={{ fontWeight: 700 }}>
                        {status.database.rawStore.toLocaleString()}
                      </Typography>
                      {status.database.rawStore > 0 && (
                        <Typography variant="caption" color="success.main">
                          ✓ 수집 완료
                        </Typography>
                      )}
                    </Box>
                    <Divider />
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        정규화된 상가 (biz_place)
                      </Typography>
                      <Typography variant="h4" sx={{ fontWeight: 700 }}>
                        {status.database.bizPlace.toLocaleString()}
                      </Typography>
                      {status.database.bizPlace > 0 && (
                        <Typography variant="caption" color="success.main">
                          ✓ 정규화 완료
                        </Typography>
                      )}
                    </Box>
                    <Divider />
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        발행 메타데이터 (biz_meta)
                      </Typography>
                      <Typography variant="h4" sx={{ fontWeight: 700 }}>
                        {status.database.bizMeta.toLocaleString()}
                      </Typography>
                      {status.database.bizMeta > 0 && (
                        <Typography variant="caption" color="success.main">
                          ✓ 발행 준비 완료
                        </Typography>
                      )}
                    </Box>
                  </Stack>
                  {status.database.rawStore === 0 && (
                    <Alert severity="info" sx={{ mt: 2 }}>
                      아직 수집된 데이터가 없습니다. 초기 수집을 시작하세요.
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* 초기 수집 상태 */}
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
                    aria-label={triggering === 'initial' ? '초기 수집 진행 중' : '초기 수집 시작'}
                    sx={{ borderRadius: 2 }}
                  >
                    {triggering === 'initial' ? '수집 중...' : '초기 수집 시작'}
                  </Button>
                </CardContent>
              </Card>
            </Grid>

            {/* 증분 수집 상태 */}
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
                    aria-label={triggering === 'incremental' ? '증분 수집 진행 중' : '증분 수집 시작'}
                    sx={{ borderRadius: 2 }}
                  >
                    {triggering === 'incremental' ? '수집 중...' : '증분 수집 시작'}
                  </Button>
                </CardContent>
              </Card>
            </Grid>

            {/* 마지막 업데이트 시간 */}
            {lastUpdate && (
              <>
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
              </>
            )}
          </Grid>
        ) : null}
      </Container>

      {/* 수동 수집 다이얼로그 */}
      <Dialog
        open={manualDialogOpen}
        onClose={() => setManualDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        aria-labelledby="manual-fetch-dialog-title"
      >
        <DialogTitle id="manual-fetch-dialog-title">
          수동 수집 설정
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 2 }}>
            <FormControl fullWidth>
              <InputLabel id="manual-type-label">수집 유형</InputLabel>
              <Select
                labelId="manual-type-label"
                value={manualType}
                label="수집 유형"
                onChange={(e) => setManualType(e.target.value as 'dong' | 'date')}
              >
                <MenuItem value="dong">행정동별 수집</MenuItem>
                <MenuItem value="date">날짜별 수집</MenuItem>
              </Select>
              <FormHelperText>
                {manualType === 'dong' 
                  ? '특정 행정동 코드로 상가 데이터를 수집합니다'
                  : '특정 날짜 기준으로 변경된 상가 데이터를 수집합니다'}
              </FormHelperText>
            </FormControl>

            {manualType === 'dong' ? (
              <TextField
                label="행정동 코드"
                value={manualDongCode}
                onChange={(e) => setManualDongCode(e.target.value)}
                placeholder="예: 1168010100"
                helperText="10자리 행정동 코드를 입력하세요"
                fullWidth
                required
              />
            ) : (
              <TextField
                label="날짜"
                value={manualDate}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 8);
                  setManualDate(value);
                }}
                placeholder="YYYYMMDD (예: 20250119)"
                helperText="YYYYMMDD 형식으로 입력하세요 (예: 20250119)"
                fullWidth
                required
                inputProps={{
                  pattern: '[0-9]{8}',
                  maxLength: 8,
                }}
              />
            )}

            <TextField
              label="최대 페이지 수"
              type="number"
              value={manualMaxPages}
              onChange={(e) => setManualMaxPages(parseInt(e.target.value) || 5)}
              helperText="수집할 최대 페이지 수를 입력하세요 (기본값: 5, 최대: 10)"
              fullWidth
              inputProps={{
                min: 1,
                max: 10,
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setManualDialogOpen(false)}>
            취소
          </Button>
          <Button
            variant="contained"
            onClick={triggerManualFetch}
            disabled={triggering !== null || (manualType === 'dong' && !manualDongCode.trim()) || (manualType === 'date' && !manualDate.trim())}
            startIcon={triggering === 'manual' ? <CircularProgress size={16} /> : <PlayArrow />}
          >
            {triggering === 'manual' ? '수집 중...' : '수집 시작'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

