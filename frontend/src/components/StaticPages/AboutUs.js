import React, { useEffect, useRef } from 'react';
import { Box, Typography, Grid, useTheme, useMediaQuery, Container, Divider, Chip } from '@mui/material';
import { motion, useScroll, useTransform, useInView, useSpring } from 'framer-motion';
import styled from '@emotion/styled';
import { useOutletContext } from 'react-router-dom';
import SecurityIcon from '@mui/icons-material/Security';
import MonitoringIcon from '@mui/icons-material/Visibility';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import ComplianceIcon from '@mui/icons-material/AssignmentTurnedIn';
import ResponseIcon from '@mui/icons-material/FlashOn';
import IntelligenceIcon from '@mui/icons-material/Public';
import EngineeringIcon from '@mui/icons-material/Engineering';
import PeopleIcon from '@mui/icons-material/People';
import ShieldIcon from '@mui/icons-material/Shield';
import TimelineIcon from '@mui/icons-material/Timeline';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

const AboutUs = () => {
  const { setPageTitle } = useOutletContext();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  
  // Refs for scroll animations
  const headerRef = useRef(null);
  const missionRef = useRef(null);
  const servicesRef = useRef(null);
  const featuresRef = useRef(null);
  const statsRef = useRef(null);
  
  // InView hooks for each section
  const headerInView = useInView(headerRef, { once: true, amount: 0.3 });
  const missionInView = useInView(missionRef, { once: true, amount: 0.3 });
  const servicesInView = useInView(servicesRef, { once: true, amount: 0.1 });
  const featuresInView = useInView(featuresRef, { once: true, amount: 0.3 });
  const statsInView = useInView(statsRef, { once: true, amount: 0.3 });
  
  // Parallax effect for hero section
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 500], [0, -100]);
  const opacity = useTransform(scrollY, [0, 200, 300], [1, 0.8, 0]);
  const springY = useSpring(y, { stiffness: 100, damping: 30 });

  useEffect(() => {
    setPageTitle('About Us');
    
    // Smooth scroll to top on component mount
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
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

  const stats = [
    { label: "Threats Detected", value: "10M+", icon: <ShieldIcon />, color: theme.palette.primary.main },
    { label: "Client Satisfaction", value: "99.8%", icon: <PeopleIcon />, color: theme.palette.secondary.main },
    { label: "Response Time", value: "<15min", icon: <TimelineIcon />, color: "#4caf50" },
    { label: "Global Presence", value: "24", icon: <IntelligenceIcon />, color: "#ff9800" }
  ];

  const teamMembers = [
    { name: "Mr. Naveen Gavande", role: "CyberSecurity Business Head", expertise: "CyberSecurity" },
    { name: "Mr. Rakshit Patil", role: "Security Operations Lead", expertise: "Full Stack Developer" },
    { name: "Mr. Prajwal Kamble", role: "Security Analyst", expertise: "Full Stack Developer" },
    { name: "Mr. Firdous Khan", role: "Security Analyst", expertise: "Penetration Tester" },
    { name: "Mr. Sujal Thakur", role: "Backend Head", expertise: "Purple Teamer" }
  ];

  // Styled components
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

  const StatCard = styled(motion.div)(({ color }) => ({
    backgroundColor: theme.palette.background.paper,
    borderRadius: '16px',
    padding: '24px',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    boxShadow: '0 6px 12px rgba(0,0,0,0.08)',
    border: `1px solid ${theme.palette.divider}`,
    position: 'relative',
    overflow: 'hidden',
    '&::after': {
      content: '""',
      position: 'absolute',
      bottom: 0,
      left: 0,
      width: '100%',
      height: '4px',
      backgroundColor: color,
    }
  }));

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

  const statVariants = {
    hidden: { scale: 0.8, opacity: 0 },
    visible: (i) => ({
      scale: 1,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 100,
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
      {/* Hero Section with Parallax */}
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
        <motion.div
          style={{ y: springY, position: 'relative', zIndex: 1 }}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: headerInView ? 1 : 0, y: headerInView ? 0 : 30 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <Container maxWidth="lg">
            <Box textAlign="center">
              <Box mb={2}>
                <Chip 
                  label="Next-Gen Security" 
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
                Virtual Security Operations Center
              </GradientText>
              
              <Typography 
                variant="h5" 
                component={motion.h2} 
                color="text.secondary" 
                mb={4}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: headerInView ? 1 : 0, y: headerInView ? 0 : 20 }}
                transition={{ duration: 0.5, delay: 0.4 }}
              >
                Detect, Defend & Comply with our AI-powered VSOC solution
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
                  Our Virtual Security Operations Center (VSOC) is a centralized management platform that 
                  enables organizations to monitor, detect, and respond to security threats in real-time.
                  Using cutting-edge AI technologies, we provide comprehensive protection for your digital assets.
                </Typography>
              </motion.div>
            </Box>
          </Container>
        </motion.div>
        
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
            <SecurityIcon sx={{ fontSize: { xs: 40, md: 60 }, color: 'primary.light', opacity: 0.4 }} />
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
            <AnalyticsIcon sx={{ fontSize: { xs: 40, md: 60 }, color: 'secondary.light', opacity: 0.4 }} />
          </motion.div>
        </Box>
      </Box>

      {/* Stats Section */}
      <Container maxWidth="lg">
        <Box 
          ref={statsRef}
          sx={{ mb: 10 }}
        >
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate={statsInView ? "visible" : "hidden"}
          >
            <Grid container spacing={3}>
              {stats.map((stat, index) => (
                <Grid item xs={6} md={3} key={index}>
                  <motion.div
                    variants={statVariants}
                    custom={index}
                  >
                    <StatCard color={stat.color}>
                      <Box sx={{ color: stat.color, mb: 2 }}>
                        {stat.icon}
                      </Box>
                      <Typography 
                        variant="h3" 
                        component="div" 
                        gutterBottom 
                        sx={{ 
                          fontWeight: 700,
                          color: stat.color,
                          fontSize: { xs: '1.8rem', sm: '2.2rem', md: '2.5rem' }
                        }}
                      >
                        {stat.value}
                      </Typography>
                      <Typography variant="subtitle1" color="text.secondary">
                        {stat.label}
                      </Typography>
                    </StatCard>
                  </motion.div>
                </Grid>
              ))}
            </Grid>
          </motion.div>
        </Box>
      </Container>

      {/* Services Section */}
      <Box 
        ref={servicesRef}
        sx={{ py: 6, px: 3, mb: 10 }}
      >
        <Container maxWidth="lg">
          <Box textAlign="center" mb={6}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: servicesInView ? 1 : 0, y: servicesInView ? 0 : 20 }}
              transition={{ duration: 0.5 }}
            >
              <Typography 
                variant="overline" 
                display="block" 
                color="primary" 
                gutterBottom
                sx={{ letterSpacing: 2, fontWeight: 600 }}
              >
                OUR SERVICES
              </Typography>
              
              <Typography 
                variant="h3" 
                component="h2" 
                gutterBottom 
                sx={{ 
                  fontWeight: 700,
                  mb: 3
                }}
              >
                Comprehensive Security Solutions
              </Typography>
              
              <Typography 
                variant="body1" 
                paragraph
                sx={{ 
                  maxWidth: '700px', 
                  mx: 'auto',
                  mb: 6
                }}
              >
                Our VSOC platform offers a range of integrated security services to protect your digital assets
                and ensure compliance with industry standards.
              </Typography>
            </motion.div>
          </Box>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate={servicesInView ? "visible" : "hidden"}
          >
            <Grid container spacing={4}>
              {services.map((service, index) => (
                <Grid item xs={12} sm={6} md={4} key={index}>
                  <motion.div
                    variants={cardVariants}
                    custom={index}
                  >
                    <AnimatedCard bgcolor={service.color}>
                      <Box sx={{ 
                        fontSize: '3rem', 
                        mb: 2,
                        position: 'relative',
                        zIndex: 1
                      }}>
                        {service.icon}
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
          </motion.div>
        </Container>
      </Box>

      {/* Mission Section */}
      <Box 
        ref={missionRef}
        sx={{ py: 8, px: 3, mb: 10 }}
      >
        <Container maxWidth="md">
          <motion.div
            initial="hidden"
            animate={missionInView ? "visible" : "hidden"}
            variants={fadeInUp}
          >
            <Box sx={{ 
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
            }}>
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
                  WHAT DRIVES US
                </Typography>
                
                <Typography variant="h3" component="h2" gutterBottom sx={{ fontWeight: 700 }}>
                  Our Mission
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
                  To redefine cybersecurity with intelligent automation and seamless integration. We aim to protect 
                  digital environments through AI-driven threat detection, response, and prevention.
                </Typography>
                
                <Typography variant="body1" paragraph sx={{ fontSize: '1.1rem', lineHeight: 1.8 }}>
                  Our mission is to simplify security operations while enhancing resilience and compliance. We are 
                  committed to enabling secure, scalable, and future-ready infrastructures for organizations of all sizes.
                </Typography>
                
                <Box mt={4} display="flex" flexWrap="wrap" gap={1}>
                  {['Innovation', 'Reliability', 'Protection', 'Intelligence'].map((value, i) => (
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
                <EngineeringIcon sx={{ fontSize: { xs: 80, md: 120 } }} />
              </Box>
            </Box>
          </motion.div>
        </Container>
      </Box>

      {/* Key Features */}
      <Container maxWidth="lg">
        <Box 
          ref={featuresRef}
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
            animate={{ opacity: featuresInView ? 1 : 0, y: featuresInView ? 0 : 20 }}
            transition={{ duration: 0.5 }}
          >
            <Typography variant="h4" component="h2" gutterBottom sx={{ fontWeight: 700, mb: 4 }}>
              Key Features
            </Typography>
          </motion.div>
          
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate={featuresInView ? "visible" : "hidden"}
          >
            <Grid container spacing={3}>
              {[
                "24/7 Threat Monitoring",
                "Automated Incident Response",
                "Behavioral Anomaly Detection",
                "Cloud Security Posture Management",
                "Compliance Reporting",
                "Threat Intelligence Integration"
              ].map((feature, index) => (
                <Grid item xs={12} sm={6} md={4} key={index}>
                  <motion.div
                    variants={featureVariants}
                    custom={index}
                  >
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 2,
                      p: 2,
                      borderRadius: '12px',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        backgroundColor: 'rgba(0,0,0,0.02)'
                      }
                    }}>
                      <CheckCircleIcon sx={{ color: theme.palette.primary.main }} />
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>{feature}</Typography>
                    </Box>
                  </motion.div>
                </Grid>
              ))}
            </Grid>
          </motion.div>
        </Box>
      </Container>

      {/* Team Section */}
      <Container maxWidth="lg">
        <Box sx={{ mb: 10, textAlign: 'center' }}>
          <Typography 
            variant="overline" 
            display="block" 
            color="primary" 
            gutterBottom
            sx={{ letterSpacing: 2, fontWeight: 600 }}
          >
            LEADERSHIP
          </Typography>
          
          <Typography 
            variant="h4"

            component="h2" 
            gutterBottom 
            sx={{ fontWeight: 700, mb: 6 }}
          >
            Meet Our Experts
          </Typography>
          
          <Grid container spacing={4} justifyContent="center">
            {teamMembers.map((member, index) => (
              <Grid item xs={12} sm={6} md={4} key={index}>
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.5 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <Box sx={{ 
                    p: 3, 
                    borderRadius: '16px',
                    border: `1px solid ${theme.palette.divider}`,
                    backgroundColor: theme.palette.background.paper,
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
                      transform: 'translateY(-5px)'
                    }
                  }}>
                    <Box 
                      sx={{ 
                        width: '100px',
                        height: '100px',
                        borderRadius: '50%',
                        backgroundColor: `rgba(33, 150, 243, ${0.1 + (index * 0.05)})`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mx: 'auto',
                        mb: 3
                      }}
                    >
                      <PeopleIcon sx={{ fontSize: '40px', color: theme.palette.primary.main }} />
                    </Box>
                    
                    <Typography variant="h6" component="h3" gutterBottom sx={{ fontWeight: 600 }}>
                      {member.name}
                    </Typography>
                    
                    <Typography variant="subtitle1" color="primary" gutterBottom>
                      {member.role}
                    </Typography>
                    
                    <Typography variant="body2" color="text.secondary">
                      {member.expertise}
                    </Typography>
                  </Box>
                </motion.div>
              </Grid>
            ))}
          </Grid>
        </Box>
      </Container>
    </Box>
  );
};

export default AboutUs;