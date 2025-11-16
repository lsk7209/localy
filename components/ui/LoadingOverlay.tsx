import { Box, CircularProgress, Backdrop } from '@mui/material';
import { memo } from 'react';

/**
 * Component: LoadingOverlay
 * @param {boolean} open - 표시 여부 [Required]
 * @param {string} message - 로딩 메시지 [Optional]
 * @example <LoadingOverlay open={isLoading} message="처리 중..." />
 */
interface LoadingOverlayProps {
  open: boolean;
  message?: string;
}

export default memo(function LoadingOverlay({ open, message }: LoadingOverlayProps) {
  return (
    <Backdrop
      open={open}
      sx={{
        color: '#fff',
        zIndex: (theme) => theme.zIndex.drawer + 1,
        flexDirection: 'column',
        gap: 2,
      }}
    >
      <CircularProgress color="inherit" />
      {message && (
        <Box
          component="span"
          sx={{
            fontSize: '1rem',
            fontWeight: 500,
          }}
        >
          {message}
        </Box>
      )}
    </Backdrop>
  );
});

