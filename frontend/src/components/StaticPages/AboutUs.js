import React from 'react';
import { Box, Typography, Grid, useTheme, useMediaQuery } from '@mui/material';
import { motion } from 'framer-motion';
import styled from '@emotion/styled';
import { useOutletContext } from 'react-router-dom';
import SecurityIcon from '@mui/icons-material/Security';
import MonitoringIcon from '@mui/icons-material/Visibility';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import ComplianceIcon from '@mui/icons-material/AssignmentTurnedIn';
import ResponseIcon from '@mui/icons-material/FlashOn';
import IntelligenceIcon from '@mui/icons-material/Public';

const AboutUs = () => {
  const { setPageTitle } = useOutletContext();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  React.useEffect(() => {
    setPageTitle('About Us');
  }, [setPageTitle]);

  const services = [
    {
      icon: <MonitoringIcon fontSize="large" />,
      title: "Real-Time Monitoring",
      description: "24/7, 365 days monitoring of your digital assets with immediate threat detection",
      color: theme.palette.primary.main
    },
    {
      icon: <AnalyticsIcon fontSize="large" />,
      title: "AI & ML Analytics",
      description: "Advanced behavioral analytics to detect anomalies and potential threats",
      color: theme.palette.secondary.main
    },
    {
      icon: <ResponseIcon fontSize="large" />,
      title: "Automated Response",
      description: "Instant response to security incidents with automated remediation",
      color: "#4caf50"
    },
    {
      icon: <ComplianceIcon fontSize="large" />,
      title: "Compliance",
      description: "PCI-DSS, HIPAA, CERT-IN compliance monitoring and reporting",
      color: "#ff9800"
    },
    {
      icon: <IntelligenceIcon fontSize="large" />,
      title: "Threat Intelligence",
      description: "Global threat intelligence from New Zealand to USA",
      color: "#9c27b0"
    },
    {
      icon: <SecurityIcon fontSize="large" />,
      title: "SOC as a Service",
      description: "Complete Security Operations Center as a managed service",
      color: "#2196f3"
    }
  ];

  const AnimatedCard = styled(motion.div)(({ bgcolor }) => ({
    backgroundColor: bgcolor,
    color: 'white',
    borderRadius: '16px',
    padding: '24px',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    boxShadow: '0 8px 16px rgba(0,0,0,0.1)',
    transition: 'transform 0.3s ease',
    '&:hover': {
      transform: 'translateY(-5px)'
    }
  }));

  const cardVariants = {
    offscreen: {
      y: 50,
      opacity: 0
    },
    onscreen: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        bounce: 0.4,
        duration: 0.8
      }
    }
  };

  return (
    <Box sx={{ py: 6, px: 3 }}>
      <Box textAlign="center" mb={6}>
        <Typography 
          variant="h3" 
          component="h1" 
          gutterBottom 
          sx={{ 
            fontWeight: 700,
            background: `linear-gradient(45deg, ${theme.palette.primary.main} 30%, ${theme.palette.secondary.main} 90%)`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            mb: 2
          }}
        >
          Virtual Security Operations Center
        </Typography>
        <Typography variant="h5" component="h2" color="text.secondary" mb={4}>
          Detect, Defend & Comply with our AI-powered VSOC solution
        </Typography>
        <Typography variant="body1" paragraph>
          Our Virtual Security Operations Center (VSOC) is a centralized management platform that 
          enables organizations to monitor, detect, and respond to security threats in real-time.
        </Typography>
      </Box>

      <Grid container spacing={4} sx={{ mb: 8 }}>
        {services.map((service, index) => (
          <Grid item xs={12} sm={6} md={4} key={index}>
            <motion.div
              initial="offscreen"
              whileInView="onscreen"
              viewport={{ once: true, amount: 0.2 }}
              variants={cardVariants}
            >
              <AnimatedCard bgcolor={service.color}>
                <Box sx={{ fontSize: '3rem', mb: 2 }}>
                  {service.icon}
                </Box>
                <Typography variant="h5" component="h3" gutterBottom sx={{ fontWeight: 600 }}>
                  {service.title}
                </Typography>
                <Typography variant="body1">
                  {service.description}
                </Typography>
              </AnimatedCard>
            </motion.div>
          </Grid>
        ))}
      </Grid>

      <Box sx={{ 
        background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.secondary.dark} 100%)`,
        borderRadius: '16px',
        p: 4,
        color: 'white',
        mb: 6,
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'radial-gradient(circle at top right, rgba(255,255,255,0.1) 0%, transparent 50%)',
        }
      }}>
        <Typography variant="h4" component="h2" gutterBottom sx={{ fontWeight: 700 }}>
          Our Mission
        </Typography>
        <Typography variant="body1" paragraph sx={{ fontSize: '1.1rem' }}>
          To redefine cybersecurity with intelligent automation and seamless integration. We aim to protect 
          digital environments through AI-driven threat detection, response, and prevention.
        </Typography>
        <Typography variant="body1" paragraph sx={{ fontSize: '1.1rem' }}>
          Our mission is to simplify security operations while enhancing resilience and compliance. We are 
          committed to enabling secure, scalable, and future-ready infrastructures.
        </Typography>
      </Box>

      <Box sx={{ 
        backgroundColor: theme.palette.background.paper,
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: '16px',
        p: 4,
        mb: 6
      }}>
        <Typography variant="h4" component="h2" gutterBottom sx={{ fontWeight: 700 }}>
          Key Features
        </Typography>
        <Grid container spacing={2}>
          {[
            "24/7 Threat Monitoring",
            "Automated Incident Response",
            "Behavioral Anomaly Detection",
            "Cloud Security Posture Management",
            "Compliance Reporting",
            "Threat Intelligence Integration"
          ].map((feature, index) => (
            <Grid item xs={12} sm={6} key={index}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ 
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: theme.palette.primary.main
                }} />
                <Typography variant="body1">{feature}</Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Box>
    </Box>
  );
};

export default AboutUs;