import { Box, Skeleton } from '@mui/material';
import { memo } from 'react';

/**
 * Component: LoadingSkeleton
 * @param {string} variant - 스켈레톤 타입 ('card' | 'list' | 'table' | 'text') [Optional, default='card']
 * @param {number} count - 반복 횟수 [Optional, default=1]
 * @example <LoadingSkeleton variant="card" count={3} />
 */
interface LoadingSkeletonProps {
  variant?: 'card' | 'list' | 'table' | 'text';
  count?: number;
}

export default memo(function LoadingSkeleton({ variant = 'card', count = 1 }: LoadingSkeletonProps) {
  const renderSkeleton = () => {
    switch (variant) {
      case 'card':
        return (
          <Box sx={{ p: 2 }}>
            <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 2, mb: 2 }} />
            <Skeleton variant="text" width="60%" height={32} sx={{ mb: 1 }} />
            <Skeleton variant="text" width="40%" height={24} />
          </Box>
        );

      case 'list':
        return (
          <Box sx={{ p: 2 }}>
            <Skeleton variant="text" width="80%" height={28} sx={{ mb: 1 }} />
            <Skeleton variant="text" width="60%" height={20} />
          </Box>
        );

      case 'table':
        return (
          <Box sx={{ p: 2 }}>
            <Skeleton variant="rectangular" height={48} sx={{ borderRadius: 1, mb: 1 }} />
            <Skeleton variant="rectangular" height={48} sx={{ borderRadius: 1, mb: 1 }} />
            <Skeleton variant="rectangular" height={48} sx={{ borderRadius: 1 }} />
          </Box>
        );

      case 'text':
        return (
          <Box sx={{ p: 2 }}>
            <Skeleton variant="text" width="100%" height={24} sx={{ mb: 1 }} />
            <Skeleton variant="text" width="90%" height={24} sx={{ mb: 1 }} />
            <Skeleton variant="text" width="95%" height={24} />
          </Box>
        );

      default:
        return <Skeleton variant="rectangular" height={200} />;
    }
  };

  return (
    <Box>
      {Array.from({ length: count }).map((_, index) => (
        <Box key={index}>{renderSkeleton()}</Box>
      ))}
    </Box>
  );
});

