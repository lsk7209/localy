'use client';

import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  Switch,
  FormControlLabel,
  Paper,
  Alert,
} from '@mui/material';
import { Save } from '@mui/icons-material';
import { useState, useEffect } from 'react';

interface Settings {
  aiEnabled: boolean;
  publishRateLimit: number;
  nextDongIndex: number;
  lastModDate: string;
}

/**
 * 관리자 Settings 페이지
 */
export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({
    aiEnabled: true,
    publishRateLimit: 10,
    nextDongIndex: 0,
    lastModDate: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/settings');
      if (!response.ok) {
        throw new Error('Failed to fetch settings');
      }
      const data = await response.json();
      setSettings(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Failed to fetch settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const response = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      if (!response.ok) {
        throw new Error('Failed to save settings');
      }

      setSuccess('설정이 저장되었습니다.');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Failed to save settings:', err);
    } finally {
      setSaving(false);
    }
  };

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
          <Typography
            variant="h1"
            sx={{
              fontSize: { xs: '2rem', sm: '2.5rem' },
              fontWeight: 900,
              letterSpacing: '-0.033em',
            }}
          >
            설정
          </Typography>
        </Container>
      </Box>

      <Container maxWidth="xl" sx={{ py: { xs: 2, sm: 3, lg: 4 } }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <Typography>로딩 중...</Typography>
          </Box>
        ) : (
          <>
            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}
            {success && (
              <Alert severity="success" sx={{ mb: 3 }}>
                {success}
              </Alert>
            )}

            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h3" sx={{ mb: 3, fontSize: '1.25rem', fontWeight: 700 }}>
                  AI 설정
                </Typography>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.aiEnabled}
                      onChange={(e) => setSettings({ ...settings, aiEnabled: e.target.checked })}
                    />
                  }
                  label="AI 요약 및 FAQ 생성 활성화"
                />
                <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1 }}>
                  AI 기능을 활성화하면 OpenAI API를 사용하여 상가 정보의 요약과 FAQ를 자동으로 생성합니다.
                </Typography>
              </CardContent>
            </Card>

            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h3" sx={{ mb: 3, fontSize: '1.25rem', fontWeight: 700 }}>
                  발행 설정
                </Typography>
                <TextField
                  label="발행 배치 크기"
                  type="number"
                  value={settings.publishRateLimit}
                  onChange={(e) =>
                    setSettings({ ...settings, publishRateLimit: parseInt(e.target.value) || 10 })
                  }
                  fullWidth
                  sx={{ mb: 2 }}
                  helperText="한 번에 발행할 상가 페이지 수 (기본값: 10)"
                />
              </CardContent>
            </Card>

            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h3" sx={{ mb: 3, fontSize: '1.25rem', fontWeight: 700 }}>
                  수집 상태
                </Typography>
                <TextField
                  label="다음 행정동 인덱스"
                  type="number"
                  value={settings.nextDongIndex}
                  onChange={(e) =>
                    setSettings({ ...settings, nextDongIndex: parseInt(e.target.value) || 0 })
                  }
                  fullWidth
                  sx={{ mb: 2 }}
                  helperText="초기 수집 시 다음에 처리할 행정동 인덱스"
                  disabled
                />
                <TextField
                  label="마지막 수정일"
                  type="text"
                  value={settings.lastModDate || '없음'}
                  fullWidth
                  disabled
                  helperText="증분 수집 시 사용되는 마지막 수정일"
                />
              </CardContent>
            </Card>

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
              <Button variant="outlined" onClick={fetchSettings} disabled={saving}>
                취소
              </Button>
              <Button
                variant="contained"
                startIcon={<Save />}
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? '저장 중...' : '저장'}
              </Button>
            </Box>
          </>
        )}
      </Container>
    </Box>
  );
}
