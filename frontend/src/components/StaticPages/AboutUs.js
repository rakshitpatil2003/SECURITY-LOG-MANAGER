import React from 'react';
import { Box, Typography, Container } from '@mui/material';

const AboutUs = () => {
  return (
    <Container maxWidth="md">
      <Box py={4}>
        <Typography variant="h4" gutterBottom>
          About Us
        </Typography>
        <Typography variant="body1" paragraph>
          Security Log Manager is a comprehensive solution for managing and analyzing 
          security logs across your organization. Our platform provides real-time 
          monitoring, threat detection, and compliance reporting.
        </Typography>
        <Typography variant="body1" paragraph>
          Developed with security professionals in mind, our tool integrates with 
          various log sources and provides actionable insights to keep your 
          infrastructure secure.
        </Typography>
      </Box>
    </Container>
  );
};

export default AboutUs;