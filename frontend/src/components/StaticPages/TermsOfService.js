import React, { useEffect, useRef } from 'react';
import { Box, Typography, Container, Divider, useTheme, useMediaQuery, Chip, Paper } from '@mui/material';
import { motion, useInView } from 'framer-motion';
import styled from '@emotion/styled';
import { useOutletContext } from 'react-router-dom';
import GavelIcon from '@mui/icons-material/Gavel';
import SecurityIcon from '@mui/icons-material/Security';
import PrivacyTipIcon from '@mui/icons-material/PrivacyTip';
import ArticleIcon from '@mui/icons-material/Article';
import DescriptionIcon from '@mui/icons-material/Description';

const TermsOfService = () => {
  const { setPageTitle } = useOutletContext();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  // Refs for scroll animations
  const headerRef = useRef(null);
  const contentRef = useRef(null);
  
  // InView hooks for each section
  const headerInView = useInView(headerRef, { once: true, amount: 0.3 });
  const contentInView = useInView(contentRef, { once: true, amount: 0.1 });

  useEffect(() => {
    setPageTitle('Terms of Service');
    
    // Smooth scroll to top on component mount
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }, [setPageTitle]);

  // Styled components
  const GradientText = styled(Typography)(({ gradient }) => ({
    background: gradient,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    textFillColor: 'transparent',
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

  const listItemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: (i) => ({
      opacity: 1,
      x: 0,
      transition: {
        duration: 0.5,
        delay: i * 0.1
      }
    })
  };

  // Terms sections with icons
  const termsSections = [
    {
      title: "1. Acceptance of Terms",
      content: "By accessing or using the Virtual Security Operations Center (VSOC) services provided by our company, you agree to be bound by these Terms of Service (Terms). If you do not agree to these Terms, please do not use our services.",
      icon: <GavelIcon fontSize="large" />,
      color: theme.palette.primary.main
    },
    {
      title: "2. Description of Services",
      content: "Our VSOC platform provides security monitoring, threat detection, incident response, and compliance management services as described on our website and in service agreements. The specific features and capabilities may vary based on your subscription level.",
      icon: <DescriptionIcon fontSize="large" />,
      color: theme.palette.secondary.main
    },
    {
      title: "3. User Accounts and Security",
      content: "To access our services, you must create an account with accurate and complete information. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You must immediately notify us of any unauthorized use of your account or any other security breach.",
      icon: <SecurityIcon fontSize="large" />,
      color: "#4caf50"
    },
    {
      title: "4. Service Availability and Updates",
      content: "We strive to provide uninterrupted service, but we do not guarantee that our services will be available at all times. We may perform maintenance or updates that temporarily suspend access to the services. We will make reasonable efforts to provide advance notice of any scheduled maintenance.",
      icon: <ArticleIcon fontSize="large" />,
      color: "#ff9800"
    },
    {
      title: "5. Your Data and Privacy",
      content: "Our Privacy Policy governs the collection, use, and storage of information provided to us through your use of our services. By using our services, you consent to the data practices described in our Privacy Policy.",
      icon: <PrivacyTipIcon fontSize="large" />,
      color: "#9c27b0"
    }
  ];

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
            <Box mb={2}>
              <Chip 
                label="Legal Information" 
                color="primary" 
                sx={{ mb: 3, fontWeight: 500, px: 2, py: 2.5 }}
                component={motion.div}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: headerInView ? 1 : 0, scale: headerInView ? 1 : 0.8 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              />
            </Box>
            
            <GradientText 
              variant="h2" 
              component={motion.h1}
              gutterBottom 
              gradient={`linear-gradient(45deg, ${theme.palette.primary.main} 30%, ${theme.palette.secondary.main} 90%)`}
              sx={{ 
                fontWeight: 800,
                mb: 2,
                fontSize: { xs: '2.2rem', sm: '2.5rem', md: '3rem' }
              }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: headerInView ? 1 : 0, y: headerInView ? 0 : 20 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              Terms of Service
            </GradientText>
            
            <Typography 
              variant="body1" 
              component={motion.div} 
              color="text.secondary" 
              mb={1}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: headerInView ? 1 : 0, y: headerInView ? 0 : 20 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              sx={{ fontWeight: 500 }}
            >
              Last Updated: May 19, 2025
            </Typography>
          </Box>
        </Container>
        
        {/* Floating shapes */}
        <Box sx={{ position: 'absolute', top: '15%', left: '5%', zIndex: 0, opacity: 0.6 }}>
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
            <GavelIcon sx={{ fontSize: { xs: 40, md: 60 }, color: 'primary.light', opacity: 0.4 }} />
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
            <PrivacyTipIcon sx={{ fontSize: { xs: 40, md: 60 }, color: 'secondary.light', opacity: 0.4 }} />
          </motion.div>
        </Box>
      </Box>

      {/* Content Section */}
      <Container maxWidth="lg">
        <Box 
          ref={contentRef}
          sx={{ 
            mb: 8,
            position: 'relative'
          }}
        >
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate={contentInView ? "visible" : "hidden"}
          >
            {/* First five sections with icons and styled cards */}
            {termsSections.map((section, index) => (
              <motion.div
                key={index}
                variants={fadeInUp}
                custom={index}
              >
                <Paper
                  elevation={0}
                  sx={{
                    p: 4,
                    mb: 4,
                    borderRadius: '16px',
                    border: `1px solid ${theme.palette.divider}`,
                    position: 'relative',
                    overflow: 'hidden',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      boxShadow: '0 8px 24px rgba(0,0,0,0.05)',
                      transform: 'translateY(-5px)'
                    },
                    '&::after': {
                      content: '""',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '4px',
                      height: '100%',
                      backgroundColor: section.color,
                    }
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 3 }}>
                    <Box 
                      sx={{ 
                        color: 'white',
                        bgcolor: section.color,
                        p: 1.5,
                        borderRadius: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}
                    >
                      {section.icon}
                    </Box>
                    
                    <Box>
                      <Typography variant="h5" component="h2" gutterBottom sx={{ fontWeight: 600 }}>
                        {section.title}
                      </Typography>
                      <Typography variant="body1">
                        {section.content}
                      </Typography>
                    </Box>
                  </Box>
                </Paper>
              </motion.div>
            ))}

            {/* Remaining terms sections without icons */}
            <Paper
              elevation={0}
              sx={{
                p: 4,
                mb: 4,
                borderRadius: '16px',
                border: `1px solid ${theme.palette.divider}`,
                backgroundColor: theme.palette.background.paper
              }}
            >
              <motion.div variants={listItemVariants} custom={0}>
                <Typography variant="h5" component="h2" sx={{ mt: 2, mb: 2, fontWeight: 600 }}>
                  6. Intellectual Property Rights
                </Typography>
                <Typography variant="body1" paragraph>
                  All content, features, and functionality of our services, including but not limited to text, graphics, logos, and software, are owned by our company and are protected by intellectual property laws. You may not reproduce, distribute, modify, or create derivative works of our services without our prior written consent.
                </Typography>
              </motion.div>

              <motion.div variants={listItemVariants} custom={1}>
                <Typography variant="h5" component="h2" sx={{ mt: 4, mb: 2, fontWeight: 600 }}>
                  7. Compliance Requirements
                </Typography>
                <Typography variant="body1" paragraph>
                  While our services assist with compliance monitoring, the ultimate responsibility for compliance with industry regulations and standards (PCI-DSS, HIPAA, CERT-IN, etc.) remains with you. Our services are tools to help you meet these requirements but do not guarantee compliance.
                </Typography>
              </motion.div>

              <motion.div variants={listItemVariants} custom={2}>
                <Typography variant="h5" component="h2" sx={{ mt: 4, mb: 2, fontWeight: 600 }}>
                  8. Limitations of Liability
                </Typography>
                <Typography variant="body1" paragraph>
                  To the maximum extent permitted by law, we shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly, or any loss of data, use, goodwill, or other intangible losses resulting from your use of our services.
                </Typography>
              </motion.div>

              <motion.div variants={listItemVariants} custom={3}>
                <Typography variant="h5" component="h2" sx={{ mt: 4, mb: 2, fontWeight: 600 }}>
                  9. Indemnification
                </Typography>
                <Typography variant="body1" paragraph>
                  You agree to indemnify, defend, and hold harmless our company and its officers, directors, employees, and agents from and against any claims, liabilities, damages, losses, and expenses, including reasonable attorneys' fees and costs, arising out of or in any way connected with your access to or use of our services.
                </Typography>
              </motion.div>

              <motion.div variants={listItemVariants} custom={4}>
                <Typography variant="h5" component="h2" sx={{ mt: 4, mb: 2, fontWeight: 600 }}>
                  10. Term and Termination
                </Typography>
                <Typography variant="body1" paragraph>
                  These Terms will remain in effect until terminated by either you or us. We may terminate or suspend your access to our services immediately, without prior notice or liability, for any reason, including if you breach these Terms. Upon termination, your right to use our services will immediately cease.
                </Typography>
              </motion.div>

              <motion.div variants={listItemVariants} custom={5}>
                <Typography variant="h5" component="h2" sx={{ mt: 4, mb: 2, fontWeight: 600 }}>
                  11. Changes to These Terms
                </Typography>
                <Typography variant="body1" paragraph>
                  We reserve the right to modify these Terms at any time. If we make material changes to these Terms, we will provide notice through our services or by other means. Your continued use of our services after such notice constitutes your acceptance of the modified Terms.
                </Typography>
              </motion.div>

              <motion.div variants={listItemVariants} custom={6}>
                <Typography variant="h5" component="h2" sx={{ mt: 4, mb: 2, fontWeight: 600 }}>
                  12. Governing Law
                </Typography>
                <Typography variant="body1" paragraph>
                  These Terms shall be governed by and construed in accordance with the laws of the jurisdiction in which our company is registered, without regard to its conflict of law provisions.
                </Typography>
              </motion.div>

              <motion.div variants={listItemVariants} custom={7}>
                <Typography variant="h5" component="h2" sx={{ mt: 4, mb: 2, fontWeight: 600 }}>
                  13. Contact Us
                </Typography>
                <Typography variant="body1" paragraph>
                  If you have any questions about these Terms, please contact us through the contact information provided on our website.
                </Typography>
              </motion.div>
            </Paper>

            <motion.div variants={fadeInUp} custom={8}>
              <Box 
                sx={{ 
                  mt: 6, 
                  p: 4, 
                  borderRadius: '16px',
                  background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.secondary.dark} 100%)`,
                  color: 'white',
                  textAlign: 'center'
                }}
              >
                <Typography variant="body1" fontWeight={500}>
                  By using our VSOC services, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.
                </Typography>
              </Box>
            </motion.div>
          </motion.div>
        </Box>
      </Container>
    </Box>
  );
};

export default TermsOfService;