import React from 'react';
import { Box, Typography, Grid, useTheme, useMediaQuery, Divider } from '@mui/material';
import { motion } from 'framer-motion';
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

  React.useEffect(() => {
    setPageTitle('Privacy Policy');
  }, [setPageTitle]);

  const policySections = [
    {
      icon: <LockIcon fontSize="large" />,
      title: "Data Collection",
      content: "We collect only necessary security data including logs, threat indicators, and system events to provide our services.",
      color: theme.palette.primary.main,
      animation: { rotateY: 360 }
    },
    {
      icon: <ShieldIcon fontSize="large" />,
      title: "Data Protection",
      content: "All data is encrypted in transit and at rest using AES-256 encryption with regular key rotation.",
      color: theme.palette.secondary.main,
      animation: { scale: 1.05 }
    },
    {
      icon: <DataUsageIcon fontSize="large" />,
      title: "Data Usage",
      content: "Collected data is used exclusively for security monitoring, threat detection, and compliance reporting.",
      color: "#4caf50",
      animation: { x: [-10, 0, 10, 0] }
    },
    {
      icon: <VisibilityOffIcon fontSize="large" />,
      title: "Data Minimization",
      content: "We follow strict data minimization principles, collecting only what's essential for security operations.",
      color: "#ff9800",
      animation: { rotate: [0, 5, -5, 0] }
    },
    {
      icon: <GppGoodIcon fontSize="large" />,
      title: "Third-Party Sharing",
      content: "Data is never sold. Sharing only occurs with your consent or when required for threat intelligence sharing.",
      color: "#9c27b0",
      animation: { y: [0, -15, 0] }
    },
    {
      icon: <PolicyIcon fontSize="large" />,
      title: "Compliance",
      content: "Adheres to GDPR, CCPA, and other global privacy regulations with regular compliance audits.",
      color: "#2196f3",
      animation: { opacity: [0.8, 1] }
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
    boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
    transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    '&:hover': {
      transform: 'translateY(-8px)',
      boxShadow: '0 12px 28px rgba(0,0,0,0.25)'
    }
  }));

  const sectionVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.1,
        duration: 0.6,
        ease: "easeOut"
      }
    })
  };

  const fadeIn = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { duration: 0.8 }
    }
  };

  return (
    <Box sx={{ py: 6, px: 3 }}>
      <motion.div
        initial="hidden"
        animate="visible"
        variants={fadeIn}
      >
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
            Privacy Policy
          </Typography>
          <Typography variant="h5" component="h2" color="text.secondary" mb={4}>
            Our Commitment to Data Protection and Privacy
          </Typography>
        </Box>
      </motion.div>

      <Grid container spacing={4} sx={{ mb: 8 }}>
        {policySections.map((section, index) => (
          <Grid item xs={12} sm={6} md={4} key={index}>
            <motion.div
              custom={index}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={sectionVariants}
              whileHover={section.animation}
            >
              <PolicyCard bgcolor={section.color}>
                <Box sx={{ 
                  fontSize: '3rem', 
                  mb: 2,
                  filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.2))'
                }}>
                  {section.icon}
                </Box>
                <Typography variant="h5" component="h3" gutterBottom sx={{ fontWeight: 600 }}>
                  {section.title}
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  {section.content}
                </Typography>
              </PolicyCard>
            </motion.div>
          </Grid>
        ))}
      </Grid>

      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={fadeIn}
      >
        <Box sx={{ 
          backgroundColor: theme.palette.background.paper,
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: '16px',
          p: 4,
          mb: 6,
          boxShadow: '0 8px 16px rgba(0,0,0,0.05)'
        }}>
          <Typography variant="h4" component="h2" gutterBottom sx={{ fontWeight: 700 }}>
            Detailed Privacy Practices
          </Typography>
          <Divider sx={{ my: 3 }} />
          
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
              custom={index}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={sectionVariants}
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
        </Box>
      </motion.div>

      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={fadeIn}
      >
        <Box sx={{ 
          background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.secondary.dark} 100%)`,
          borderRadius: '16px',
          p: 4,
          color: 'white',
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
            Contact Our Privacy Team
          </Typography>
          <Typography variant="body1" paragraph sx={{ fontSize: '1.1rem' }}>
            For privacy-related inquiries or to exercise your data rights, please contact our Data Protection Officer at:
          </Typography>
          <Typography variant="body1" sx={{ 
            fontSize: '1.2rem',
            fontWeight: 500,
            textDecoration: 'underline'
          }}>
            privacy@securitylogmanager.com
          </Typography>
        </Box>
      </motion.div>
    </Box>
  );
};

export default PrivacyPolicy;