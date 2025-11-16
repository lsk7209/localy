'use client';

import {
  Box,
  Container,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Button,
  Menu,
  MenuItem,
  CircularProgress,
} from '@mui/material';
import { ExpandMore } from '@mui/icons-material';
import { useState, useCallback, useEffect } from 'react';

const jobTypes = ['전체', '수집', '발행', 'AI', '정규화', '재시도'] as const;
const statuses = ['전체', '성공', '실패'] as const;
const periods = ['최근 7일', '최근 30일', '최근 90일', '전체'] as const;

interface Job {
  id: string;
  time: string;
  type: string;
  count: number;
  status: 'success' | 'fail';
  message: string;
}

/**
 * Jobs 페이지 - 작업 로그
 */
export default function JobsPage() {
  const [jobTypeAnchor, setJobTypeAnchor] = useState<null | HTMLElement>(null);
  const [statusAnchor, setStatusAnchor] = useState<null | HTMLElement>(null);
  const [periodAnchor, setPeriodAnchor] = useState<null | HTMLElement>(null);
  const [selectedJobType, setSelectedJobType] = useState('전체');
  const [selectedStatus, setSelectedStatus] = useState('전체');
  const [selectedPeriod, setSelectedPeriod] = useState('최근 7일');
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchJobs();
  }, [selectedJobType, selectedStatus, selectedPeriod]);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        type: selectedJobType,
        status: selectedStatus,
        period: selectedPeriod,
      });
      const response = await fetch(`/api/admin/jobs?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch jobs');
      }
      const data = await response.json();
      setJobs(data.jobs || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Failed to fetch jobs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleJobTypeClick = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    setJobTypeAnchor(event.currentTarget);
  }, []);

  const handleStatusClick = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    setStatusAnchor(event.currentTarget);
  }, []);

  const handlePeriodClick = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    setPeriodAnchor(event.currentTarget);
  }, []);

  const handleJobTypeClose = useCallback((value: string) => {
    setSelectedJobType(value);
    setJobTypeAnchor(null);
  }, []);

  const handleStatusClose = useCallback((value: string) => {
    setSelectedStatus(value);
    setStatusAnchor(null);
  }, []);

  const handlePeriodClose = useCallback((value: string) => {
    setSelectedPeriod(value);
    setPeriodAnchor(null);
  }, []);

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
          <Box sx={{ mb: 2 }}>
            <Typography
              variant="h1"
              sx={{
                fontSize: { xs: '2rem', sm: '2.5rem' },
                fontWeight: 900,
                letterSpacing: '-0.033em',
                mb: 1,
              }}
            >
              작업 로그
            </Typography>
            <Typography variant="body1" sx={{ color: 'text.secondary' }}>
              데이터 파이프라인의 상태를 모니터링합니다.
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            <Button
              variant="outlined"
              endIcon={<ExpandMore />}
              onClick={handleJobTypeClick}
              sx={{
                borderColor: 'neutral.300',
                color: 'text.primary',
                textTransform: 'none',
                borderRadius: 2,
              }}
            >
              작업 타입: {selectedJobType}
            </Button>
            <Menu anchorEl={jobTypeAnchor} open={Boolean(jobTypeAnchor)} onClose={() => setJobTypeAnchor(null)}>
              {jobTypes.map((type) => (
                <MenuItem key={type} onClick={() => handleJobTypeClose(type)}>
                  {type}
                </MenuItem>
              ))}
            </Menu>

            <Button
              variant="outlined"
              endIcon={<ExpandMore />}
              onClick={handleStatusClick}
              sx={{
                borderColor: 'neutral.300',
                color: 'text.primary',
                textTransform: 'none',
                borderRadius: 2,
              }}
            >
              상태: {selectedStatus}
            </Button>
            <Menu anchorEl={statusAnchor} open={Boolean(statusAnchor)} onClose={() => setStatusAnchor(null)}>
              {statuses.map((status) => (
                <MenuItem key={status} onClick={() => handleStatusClose(status)}>
                  {status}
                </MenuItem>
              ))}
            </Menu>

            <Button
              variant="outlined"
              endIcon={<ExpandMore />}
              onClick={handlePeriodClick}
              sx={{
                borderColor: 'neutral.300',
                color: 'text.primary',
                textTransform: 'none',
                borderRadius: 2,
              }}
            >
              기간: {selectedPeriod}
            </Button>
            <Menu anchorEl={periodAnchor} open={Boolean(periodAnchor)} onClose={() => setPeriodAnchor(null)}>
              {periods.map((period) => (
                <MenuItem key={period} onClick={() => handlePeriodClose(period)}>
                  {period}
                </MenuItem>
              ))}
            </Menu>
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
          <Paper sx={{ overflow: 'hidden' }}>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: 'neutral.50' }}>
                  <TableCell sx={{ fontWeight: 600, color: 'text.secondary', fontSize: '0.875rem', width: 180 }}>
                    시간
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600, color: 'text.secondary', fontSize: '0.875rem', width: 120 }}>
                    작업 타입
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600, color: 'text.secondary', fontSize: '0.875rem', width: 120 }}>
                    처리 건수
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600, color: 'text.secondary', fontSize: '0.875rem', width: 80 }}>
                    상태
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600, color: 'text.secondary', fontSize: '0.875rem' }}>
                    메시지
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {jobs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                      작업 로그가 없습니다.
                    </TableCell>
                  </TableRow>
                ) : (
                  jobs.map((job) => (
                    <TableRow key={job.id}>
                      <TableCell sx={{ color: 'text.secondary' }}>{job.time}</TableCell>
                      <TableCell sx={{ color: 'text.secondary' }}>{job.type}</TableCell>
                      <TableCell sx={{ color: 'text.secondary' }}>{job.count.toLocaleString()}건</TableCell>
                      <TableCell>
                        <Box
                          sx={{
                            width: 10,
                            height: 10,
                            borderRadius: '50%',
                            bgcolor: job.status === 'success' ? 'success.main' : 'error.main',
                          }}
                        />
                      </TableCell>
                      <TableCell sx={{ color: 'text.secondary' }}>{job.message}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Paper>
        )}
      </Container>
    </Box>
  );
}
