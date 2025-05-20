import React from 'react';
import { Box, Typography, Grid, useTheme, useMediaQuery, Divider, Chip, Container } from '@mui/material';
import { motion, useInView } from 'framer-motion';
import styled from '@emotion/styled';
import { useOutletContext } from 'react-router-dom';
import LockIcon from '@mui/icons-material/Lock';
import ShieldIcon from '@mui/icons-material/Shield';
import DataUsageIcon from '@mui/icons-material/DataUsage';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import GppGoodIcon from '@mui/icons-material/GppGood';
import PolicyIcon from '@mui/icons-material/Policy';

const PrivacyPolicy = () => {
  const { setPageTitle } = useOutletContext();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));

  // Refs for scroll animations
  const headerRef = React.useRef(null);
  const cardsRef = React.useRef(null);
  const detailsRef = React.useRef(null);
  const contactRef = React.useRef(null);
  
  // InView hooks for each section
  const headerInView = useInView(headerRef, { once: true, amount: 0.3 });
  const cardsInView = useInView(cardsRef, { once: true, amount: 0.1 });
  const detailsInView = useInView(detailsRef, { once: true, amount: 0.3 });
  const contactInView = useInView(contactRef, { once: true, amount: 0.3 });

  React.useEffect(() => {
    setPageTitle('Privacy Policy');
    
    // Smooth scroll to top on component mount
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }, [setPageTitle]);

  const policySections = [
    {
      icon: <LockIcon fontSize="large" />,
      title: "Data Collection",
      content: "We collect only necessary security data including logs, threat indicators, and system events to provide our services.",
      color: theme.palette.primary.main
    },
    {
      icon: <ShieldIcon fontSize="large" />,
      title: "Data Protection",
      content: "All data is encrypted in transit and at rest using AES-256 encryption with regular key rotation.",
      color: theme.palette.secondary.main
    },
    {
      icon: <DataUsageIcon fontSize="large" />,
      title: "Data Usage",
      content: "Collected data is used exclusively for security monitoring, threat detection, and compliance reporting.",
      color: "#4caf50"
    },
    {
      icon: <VisibilityOffIcon fontSize="large" />,
      title: "Data Minimization",
      content: "We follow strict data minimization principles, collecting only what's essential for security operations.",
      color: "#ff9800"
    },
    {
      icon: <GppGoodIcon fontSize="large" />,
      title: "Third-Party Sharing",
      content: "Data is never sold. Sharing only occurs with your consent or when required for threat intelligence sharing.",
      color: "#9c27b0"
    },
    {
      icon: <PolicyIcon fontSize="large" />,
      title: "Compliance",
      content: "Adheres to GDPR, CCPA, and other global privacy regulations with regular compliance audits.",
      color: "#2196f3"
    }
  ];

  const PolicyCard = styled(motion.div)(({ bgcolor }) => ({
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
    transition: 'all 0.3s ease',
    overflow: 'hidden',
    position: 'relative',
    '&::before': {
      content: '""',
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      background: 'radial-gradient(circle at top right, rgba(255,255,255,0.2) 0%, transparent 70%)',
      opacity: 0,
      transition: 'opacity 0.3s ease',
    },
    '&:hover': {
      transform: 'translateY(-5px)',
      boxShadow: '0 12px 20px rgba(0,0,0,0.15)',
      '&::before': {
        opacity: 1,
      }
    }
  }));

  // Animation variants
  const fadeInUp = {
    hidden: { opacity: 0, y: 60 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: {
        duration: 0.6,
        ease: "easeOut"
      }
    }
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const cardVariants = {
    hidden: { y: 50, opacity: 0 },
    visible: (i) => ({
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        bounce: 0.4,
        duration: 0.8,
        delay: i * 0.1
      }
    })
  };

  const featureVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: (i) => ({
      opacity: 1,
      x: 0,
      transition: {
        duration: 0.5,
        delay: i * 0.05
      }
    })
  };

  return (
    <Box sx={{ overflow: 'hidden' }}>
      {/* Hero Section */}
      <Box 
        ref={headerRef}
        sx={{ 
          position: 'relative',
          py: { xs: 8, md: 10 },
          px: 3,
          mb: 6,
          overflow: 'hidden',
          background: `linear-gradient(135deg, ${theme.palette.background.default} 0%, ${theme.palette.background.paper} 100%)`,
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: `radial-gradient(circle at 70% 30%, rgba(33, 150, 243, 0.1) 0%, transparent 50%)`,
            zIndex: 0
          }
        }}
      >
        <Container maxWidth="lg">
          <Box textAlign="center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: headerInView ? 1 : 0, y: headerInView ? 0 : 30 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              <Box mb={2}>
                <Chip 
                  label="Data Protection" 
                  color="primary" 
                  sx={{ mb: 3, fontWeight: 500, px: 2, py: 2.5 }}
                  component={motion.div}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: headerInView ? 1 : 0, scale: headerInView ? 1 : 0.8 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                />
              </Box>
              
              <Typography 
                variant="h2" 
                component={motion.h1}
                gutterBottom 
                sx={{ 
                  fontWeight: 800,
                  mb: 2,
                  fontSize: { xs: '2.2rem', sm: '2.5rem', md: '3rem' },
                  background: `linear-gradient(45deg, ${theme.palette.primary.main} 30%, ${theme.palette.secondary.main} 90%)`,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  textFillColor: 'transparent',
                }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: headerInView ? 1 : 0, y: headerInView ? 0 : 20 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                Privacy Policy
              </Typography>
              
              <Typography 
                variant="h5" 
                component={motion.h2} 
                color="text.secondary" 
                mb={4}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: headerInView ? 1 : 0, y: headerInView ? 0 : 20 }}
                transition={{ duration: 0.5, delay: 0.4 }}
              >
                Our Commitment to Data Protection and Privacy
              </Typography>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: headerInView ? 1 : 0, y: headerInView ? 0 : 20 }}
                transition={{ duration: 0.5, delay: 0.5 }}
              >
                <Typography 
                  variant="body1" 
                  paragraph
                  sx={{ 
                    maxWidth: '800px', 
                    mx: 'auto', 
                    fontSize: { xs: '1rem', md: '1.1rem' },
                    lineHeight: 1.7
                  }}
                >
                  We take your privacy seriously. This policy explains how we collect, use, and protect your data in compliance with global privacy regulations.
                </Typography>
              </motion.div>
            </motion.div>
          </Box>
        </Container>
        
        {/* Floating shapes */}
        <Box sx={{ position: 'absolute', top: '10%', left: '5%', zIndex: 0, opacity: 0.6 }}>
          <motion.div
            animate={{ 
              y: [0, 15, 0],
              rotate: [0, 5, 0]
            }}
            transition={{ 
              duration: 6, 
              ease: "easeInOut", 
              repeat: Infinity,
              repeatType: "reverse"
            }}
          >
            <LockIcon sx={{ fontSize: { xs: 40, md: 60 }, color: 'primary.light', opacity: 0.4 }} />
          </motion.div>
        </Box>
        
        <Box sx={{ position: 'absolute', bottom: '15%', right: '8%', zIndex: 0, opacity: 0.6 }}>
          <motion.div
            animate={{ 
              y: [0, -20, 0],
              rotate: [0, -5, 0]
            }}
            transition={{ 
              duration: 7, 
              ease: "easeInOut", 
              repeat: Infinity,
              repeatType: "reverse",
              delay: 1
            }}
          >
            <ShieldIcon sx={{ fontSize: { xs: 40, md: 60 }, color: 'secondary.light', opacity: 0.4 }} />
          </motion.div>
        </Box>
      </Box>

      {/* Policy Cards Section */}
      <Container maxWidth="lg">
        <Box 
          ref={cardsRef}
          sx={{ mb: 10 }}
        >
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate={cardsInView ? "visible" : "hidden"}
          >
            <Grid container spacing={4}>
              {policySections.map((section, index) => (
                <Grid item xs={12} sm={6} md={4} key={index}>
                  <motion.div
                    variants={cardVariants}
                    custom={index}
                  >
                    <PolicyCard bgcolor={section.color}>
                      <Box sx={{ 
                        fontSize: '3rem', 
                        mb: 2,
                        position: 'relative',
                        zIndex: 1
                      }}>
                        {section.icon}
                        <motion.div
                          style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            width: '60px',
                            height: '60px',
                            borderRadius: '50%',
                            backgroundColor: 'rgba(255, 255, 255, 0.1)',
                            zIndex: -1
                          }}
                          animate={{
                            scale: [1, 1.2, 1],
                          }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                            repeatType: 'reverse'
                          }}
                        />
                      </Box>
                      <Typography variant="h5" component="h3" gutterBottom sx={{ fontWeight: 600 }}>
                        {section.title}
                      </Typography>
                      <Typography variant="body1">
                        {section.content}
                      </Typography>
                    </PolicyCard>
                  </motion.div>
                </Grid>
              ))}
            </Grid>
          </motion.div>
        </Box>
      </Container>

      {/* Detailed Practices Section */}
      <Container maxWidth="lg">
        <Box 
          ref={detailsRef}
          sx={{ 
            backgroundColor: theme.palette.background.paper,
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: '24px',
            p: { xs: 3, md: 5 },
            mb: 10,
            boxShadow: '0 8px 24px rgba(0,0,0,0.06)'
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: detailsInView ? 1 : 0, y: detailsInView ? 0 : 20 }}
            transition={{ duration: 0.5 }}
          >
            <Typography variant="h4" component="h2" gutterBottom sx={{ fontWeight: 700, mb: 4 }}>
              Detailed Privacy Practices
            </Typography>
          </motion.div>
          
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate={detailsInView ? "visible" : "hidden"}
          >
            {[
              {
                title: "Information Collection",
                content: "We collect system logs, network traffic metadata, and security events necessary for threat detection and response."
              },
              {
                title: "Data Retention",
                content: "Security data is retained for 90 days by default, with options for extended retention based on compliance requirements."
              },
              {
                title: "User Rights",
                content: "You have the right to access, correct, or delete your personal data, with exceptions for legitimate security purposes."
              },
              {
                title: "Security Measures",
                content: "Implements multi-layered security including encryption, access controls, and regular security audits."
              }
            ].map((item, index) => (
              <motion.div
                key={index}
                variants={featureVariants}
                custom={index}
              >
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" component="h3" gutterBottom sx={{ 
                    fontWeight: 600,
                    color: theme.palette.primary.main
                  }}>
                    {item.title}
                  </Typography>
                  <Typography variant="body1" paragraph>
                    {item.content}
                  </Typography>
                  {index < 3 && <Divider sx={{ my: 2 }} />}
                </Box>
              </motion.div>
            ))}
          </motion.div>
        </Box>
      </Container>

      {/* Contact Section */}
      <Container maxWidth="lg">
        <Box 
          ref={contactRef}
          sx={{ 
            background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.secondary.dark} 100%)`,
            borderRadius: '24px',
            p: { xs: 4, md: 6 },
            color: 'white',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'radial-gradient(circle at top right, rgba(255,255,255,0.15) 0%, transparent 50%)',
            }
          }}
        >
          <motion.div
            initial="hidden"
            animate={contactInView ? "visible" : "hidden"}
            variants={fadeInUp}
          >
            <Box sx={{ position: 'relative', zIndex: 1 }}>
              <Typography 
                variant="overline" 
                display="block" 
                gutterBottom
                sx={{ 
                  letterSpacing: 3, 
                  opacity: 0.9, 
                  fontWeight: 500,
                  mb: 2
                }}
              >
                HAVE QUESTIONS?
              </Typography>
              
              <Typography variant="h3" component="h2" gutterBottom sx={{ fontWeight: 700 }}>
                Contact Our Privacy Team
              </Typography>
              
              <Divider 
                sx={{ 
                  bgcolor: 'rgba(255,255,255,0.3)', 
                  width: '80px', 
                  height: '4px', 
                  mb: 4, 
                  borderRadius: '2px'
                }} 
              />
              
              <Typography variant="body1" paragraph sx={{ fontSize: '1.1rem', lineHeight: 1.8, mb: 3 }}>
                For privacy-related inquiries or to exercise your data rights, please contact our Data Protection Officer.
              </Typography>
              
              <Typography 
                variant="h6" 
                component="a" 
                href="mailto:privacy@securitylogmanager.com"
                sx={{ 
                  display: 'inline-block',
                  fontWeight: 600,
                  color: 'white',
                  textDecoration: 'none',
                  borderBottom: '2px solid white',
                  pb: 0.5,
                  '&:hover': {
                    opacity: 0.9
                  }
                }}
              >
                privacy@securitylogmanager.com
              </Typography>
              
              <Box mt={4} display="flex" flexWrap="wrap" gap={1}>
                {['GDPR', 'CCPA', 'HIPAA', 'ISO 27001'].map((value, i) => (
                  <Chip 
                    key={i}
                    label={value}
                    sx={{ 
                      bgcolor: 'rgba(255,255,255,0.15)', 
                      color: 'white',
                      backdropFilter: 'blur(10px)',
                      fontSize: '0.9rem'
                    }}
                  />
                ))}
              </Box>
            </Box>
            
            {/* Floating icon */}
            <Box sx={{ position: 'absolute', bottom: '10%', right: '5%', opacity: 0.15 }}>
              <PolicyIcon sx={{ fontSize: { xs: 80, md: 120 } }} />
            </Box>
          </motion.div>
        </Box>
      </Container>
    </Box>
  );
};

export default PrivacyPolicy;