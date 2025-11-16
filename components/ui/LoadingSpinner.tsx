import { Box, CircularProgress, Typography } from '@mui/material';
import { memo } from 'react';

/**
 * Component: LoadingSpinner
 * @param {string} message - 로딩 메시지 [Optional]
 * @param {string} size - 스피너 크기 ('small' | 'medium' | 'large') [Optional, default='medium']
 * @example <LoadingSpinner message="데이터를 불러오는 중..." />
 */
interface LoadingSpinnerProps {
  message?: string;
  size?: 'small' | 'medium' | 'large';
}

export default memo(function LoadingSpinner({ message, size = 'medium' }: LoadingSpinnerProps) {
  const sizeMap = {
    small: 24,
    medium: 40,
    large: 56,
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        py: 4,
      }}
    >
      <CircularProgress size={sizeMap[size]} />
      {message && (
        <Typography variant="body2" color="text.secondary">
          {message}
        </Typography>
      )}
    </Box>
  );
});

