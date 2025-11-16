'use client';

import { Box, Container, Typography } from '@mui/material';
import { memo } from 'react';

/**
 * Component: Footer
 * @example <Footer />
 */
export default memo(function Footer() {
  return (
    <Box
      component="footer"
      sx={{
        mt: 'auto',
        width: '100%',
        borderTop: 1,
        borderColor: 'neutral.200',
        py: 3,
      }}
    >
      <Container maxWidth="lg">
        <Typography
          variant="caption"
          align="center"
          display="block"
          sx={{ color: 'text.secondary' }}
        >
          데이터 출처: 공공데이터포털(data.go.kr) 소상공인시장진흥공단 상가(상권)정보
        </Typography>
        <Typography
          variant="caption"
          align="center"
          display="block"
          sx={{ mt: 1, color: 'text.secondary' }}
        >
          © 2024 로커리. All rights reserved.
        </Typography>
      </Container>
    </Box>
  );
});

