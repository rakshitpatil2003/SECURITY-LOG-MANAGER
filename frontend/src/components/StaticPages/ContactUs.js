import React, { useEffect, useRef } from 'react';
import { Box, Typography, Container, Button, Link, useTheme, useMediaQuery, Grid, Divider, TextField, Paper, Chip } from '@mui/material';
import { motion, useInView } from 'framer-motion';
import styled from '@emotion/styled';
import { useOutletContext } from 'react-router-dom';
import EmailIcon from '@mui/icons-material/Email';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import PhoneIcon from '@mui/icons-material/Phone';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import SendIcon from '@mui/icons-material/Send';
import BusinessIcon from '@mui/icons-material/Business';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PublicIcon from '@mui/icons-material/Public';

const ContactUs = () => {
  const { setPageTitle } = useOutletContext();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  
  // Refs for scroll animations
  const headerRef = useRef(null);
  const contactInfoRef = useRef(null);
  const formRef = useRef(null);
  const mapRef = useRef(null);
  
  // InView hooks for each section
  const headerInView = useInView(headerRef, { once: true, amount: 0.3 });
  const contactInfoInView = useInView(contactInfoRef, { once: true, amount: 0.3 });
  const formInView = useInView(formRef, { once: true, amount: 0.3 });
  const mapInView = useInView(mapRef, { once: true, amount: 0.3 });
  
  // Form state
  const [formData, setFormData] = React.useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Handle form submission (would connect to backend in production)
    console.log('Form submitted:', formData);
    // Reset form
    setFormData({
      name: '',
      email: '',
      subject: '',
      message: ''
    });
    // Show success message (this would be replaced with proper notification in production)
    alert('Thank you for your message! We will get back to you shortly.');
  };

  useEffect(() => {
    setPageTitle('Contact Us');
    
    // Smooth scroll to top on component mount
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }, [setPageTitle]);

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

  // Styled components
  const ContactCard = styled(motion.div)(({ bgcolor }) => ({
    backgroundColor: bgcolor || theme.palette.background.paper,
    color: bgcolor ? 'white' : theme.palette.text.primary,
    borderRadius: '16px',
    padding: '24px',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
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
      background: bgcolor ? 'radial-gradient(circle at top right, rgba(255,255,255,0.2) 0%, transparent 70%)' : 'none',
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

  const GradientText = styled(Typography)(({ gradient }) => ({
    background: gradient || `linear-gradient(45deg, ${theme.palette.primary.main} 30%, ${theme.palette.secondary.main} 90%)`,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    textFillColor: 'transparent',
  }));

  const StyledTextField = styled(TextField)({
    '& .MuiOutlinedInput-root': {
      borderRadius: '10px',
      transition: 'all 0.3s ease',
      '&:hover fieldset': {
        borderColor: theme.palette.primary.main,
      },
      '&.Mui-focused fieldset': {
        borderColor: theme.palette.primary.main,
        borderWidth: '2px',
      },
    },
    '& .MuiInputLabel-root.Mui-focused': {
      color: theme.palette.primary.main,
    },
    marginBottom: '20px',
  });

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
        <motion.div
          style={{ position: 'relative', zIndex: 1 }}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: headerInView ? 1 : 0, y: headerInView ? 0 : 30 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <Container maxWidth="lg">
            <Box textAlign="center">
              <Box mb={2}>
                <Chip 
                  label="Get in Touch" 
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
                Contact Our Team
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
                We're here to help with your security needs
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
                  Have questions about our Virtual Security Operations Center or need assistance?
                  Our team of security experts is ready to assist you with any inquiries or support needs.
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
            <EmailIcon sx={{ fontSize: { xs: 40, md: 60 }, color: 'primary.light', opacity: 0.4 }} />
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
            <PhoneIcon sx={{ fontSize: { xs: 40, md: 60 }, color: 'secondary.light', opacity: 0.4 }} />
          </motion.div>
        </Box>
      </Box>

      {/* Contact Information Section */}
      <Container maxWidth="lg">
        <Box 
          ref={contactInfoRef}
          sx={{ mb: 10 }}
        >
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate={contactInfoInView ? "visible" : "hidden"}
          >
            <Grid container spacing={4}>
              {/* Email Contact */}
              <Grid item xs={12} sm={6} md={4}>
                <motion.div variants={cardVariants} custom={0}>
                  <ContactCard>
                    <Box sx={{ 
                      backgroundColor: 'rgba(33, 150, 243, 0.1)',
                      borderRadius: '50%',
                      p: 2,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mb: 3
                    }}>
                      <EmailIcon sx={{ fontSize: 36, color: theme.palette.primary.main }} />
                    </Box>
                    <Typography variant="h6" component="h3" gutterBottom sx={{ fontWeight: 600 }}>
                      Email Us
                    </Typography>
                    <Typography variant="body2" color="text.secondary" paragraph>
                      For general inquiries and information:
                    </Typography>
                    <Link 
                      href="mailto:info@vgipl.in" 
                      sx={{ 
                        color: theme.palette.primary.main,
                        fontWeight: 600,
                        display: 'inline-flex',
                        alignItems: 'center',
                        '&:hover': {
                          textDecoration: 'none'
                        }
                      }}
                    >
                      info@vgipl.in
                    </Link>
                  </ContactCard>
                </motion.div>
              </Grid>

              {/* Phone Contact */}
              <Grid item xs={12} sm={6} md={4}>
                <motion.div variants={cardVariants} custom={1}>
                  <ContactCard>
                    <Box sx={{ 
                      backgroundColor: 'rgba(156, 39, 176, 0.1)',
                      borderRadius: '50%',
                      p: 2,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mb: 3
                    }}>
                      <PhoneIcon sx={{ fontSize: 36, color: theme.palette.secondary.main }} />
                    </Box>
                    <Typography variant="h6" component="h3" gutterBottom sx={{ fontWeight: 600 }}>
                      Call Us
                    </Typography>
                    <Typography variant="body2" color="text.secondary" paragraph>
                      Speak directly with our security experts:
                    </Typography>
                    <Link 
                      href="tel:7798026888" 
                      sx={{ 
                        color: theme.palette.secondary.main,
                        fontWeight: 600,
                        display: 'inline-flex',
                        alignItems: 'center',
                        '&:hover': {
                          textDecoration: 'none'
                        }
                      }}
                    >
                      7798026888
                    </Link>
                  </ContactCard>
                </motion.div>
              </Grid>

              {/* Location Contact */}
              <Grid item xs={12} sm={6} md={4}>
                <motion.div variants={cardVariants} custom={2}>
                  <ContactCard>
                    <Box sx={{ 
                      backgroundColor: 'rgba(76, 175, 80, 0.1)',
                      borderRadius: '50%',
                      p: 2,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mb: 3
                    }}>
                      <LocationOnIcon sx={{ fontSize: 36, color: '#4caf50' }} />
                    </Box>
                    <Typography variant="h6" component="h3" gutterBottom sx={{ fontWeight: 600 }}>
                      Visit Us
                    </Typography>
                    <Typography variant="body2" color="text.secondary" paragraph>
                      Our headquarters location:
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500, color: '#4caf50' }}>
                      Chhatrapati Square, Nagpur 441108
                    </Typography>
                  </ContactCard>
                </motion.div>
              </Grid>
            </Grid>
          </motion.div>
        </Box>
      </Container>

      {/* Contact Form Section */}
      <Box 
        ref={formRef}
        sx={{ py: 6, px: 3, mb: 10, backgroundColor: theme.palette.background.paper }}
      >
        <Container maxWidth="lg">
          <Grid container spacing={6}>
            <Grid item xs={12} md={6}>
              <motion.div
                initial="hidden"
                animate={formInView ? "visible" : "hidden"}
                variants={fadeInUp}
              >
                <Box sx={{ mb: 4 }}>
                  <Typography 
                    variant="overline" 
                    display="block" 
                    color="primary" 
                    gutterBottom
                    sx={{ letterSpacing: 2, fontWeight: 600 }}
                  >
                    CONTACT FORM
                  </Typography>
                  
                  <Typography 
                    variant="h4" 
                    component="h2" 
                    gutterBottom 
                    sx={{ fontWeight: 700 }}
                  >
                    Send Us a Message
                  </Typography>
                  
                  <Divider 
                    sx={{ 
                      bgcolor: theme.palette.primary.main, 
                      width: '80px', 
                      height: '4px', 
                      mb: 4, 
                      borderRadius: '2px'
                    }} 
                  />
                  
                  <Typography variant="body1" paragraph sx={{ mb: 4 }}>
                    Fill out the form below and we'll get back to you as soon as possible.
                  </Typography>
                </Box>
                
                <Box component="form" onSubmit={handleSubmit}>
                  <StyledTextField
                    fullWidth
                    label="Your Name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    variant="outlined"
                  />
                  
                  <StyledTextField
                    fullWidth
                    label="Email Address"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    variant="outlined"
                  />
                  
                  <StyledTextField
                    fullWidth
                    label="Subject"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    required
                    variant="outlined"
                  />
                  
                  <StyledTextField
                    fullWidth
                    label="Message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    required
                    multiline
                    rows={4}
                    variant="outlined"
                  />
                  
                  <Button 
                    type="submit"
                    variant="contained" 
                    color="primary"
                    size="large"
                    endIcon={<SendIcon />}
                    sx={{
                      borderRadius: '10px',
                      py: 1.5,
                      px: 4,
                      fontWeight: 600,
                      textTransform: 'none',
                      boxShadow: '0 8px 16px rgba(33, 150, 243, 0.2)',
                      '&:hover': {
                        boxShadow: '0 12px 20px rgba(33, 150, 243, 0.3)',
                      }
                    }}
                  >
                    Send Message
                  </Button>
                </Box>
              </motion.div>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: formInView ? 1 : 0, x: formInView ? 0 : 30 }}
                transition={{ duration: 0.8, delay: 0.2 }}
              >
                <Box sx={{ 
                  height: '100%',
                  minHeight: '400px',
                  borderRadius: '24px',
                  background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.secondary.dark} 100%)`,
                  overflow: 'hidden',
                  p: { xs: 4, md: 5 },
                  color: 'white',
                  position: 'relative',
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
                    <Box sx={{ mb: 4 }}>
                      <Typography variant="h5" component="h3" gutterBottom sx={{ fontWeight: 700 }}>
                        Our Support Team
                      </Typography>
                      <Typography variant="body1" sx={{ opacity: 0.9 }}>
                        Available to help with any security concerns or questions about our services.
                      </Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <SupportAgentIcon sx={{ mr: 2, fontSize: 28 }} />
                        <Box>
                          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                            Technical Support
                          </Typography>
                          <Typography variant="body2" sx={{ opacity: 0.9 }}>
                            Dedicated team for technical assistance
                          </Typography>
                        </Box>
                      </Box>
                      
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <BusinessIcon sx={{ mr: 2, fontSize: 28 }} />
                        <Box>
                          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                            Business Inquiries
                          </Typography>
                          <Typography variant="body2" sx={{ opacity: 0.9 }}>
                            Partnership and enterprise solutions
                          </Typography>
                        </Box>
                      </Box>
                      
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <AccessTimeIcon sx={{ mr: 2, fontSize: 28 }} />
                        <Box>
                          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                            Response Time
                          </Typography>
                          <Typography variant="body2" sx={{ opacity: 0.9 }}>
                            We respond to all inquiries within 24 hours
                          </Typography>
                        </Box>
                      </Box>
                      
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <PublicIcon sx={{ mr: 2, fontSize: 28 }} />
                        <Box>
                          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                            Global Support
                          </Typography>
                          <Typography variant="body2" sx={{ opacity: 0.9 }}>
                            Serving clients worldwide with localized support
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                  </Box>
                  
                  {/* Floating icon */}
                  <Box sx={{ position: 'absolute', bottom: '10%', right: '5%', opacity: 0.15 }}>
                    <SupportAgentIcon sx={{ fontSize: { xs: 80, md: 120 } }} />
                  </Box>
                </Box>
              </motion.div>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Map Section */}
      <Container maxWidth="lg">
        <Box 
          ref={mapRef}
          sx={{ mb: 10 }}
        >
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: mapInView ? 1 : 0, y: mapInView ? 0 : 40 }}
            transition={{ duration: 0.8 }}
          >
            <Typography 
              variant="h4" 
              component="h2" 
              gutterBottom 
              sx={{ fontWeight: 700, mb: 4, textAlign: 'center' }}
            >
              Find Us
            </Typography>
            
            <Paper
              elevation={6}
              sx={{
                borderRadius: '24px',
                overflow: 'hidden',
                height: '400px',
                position: 'relative',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: 'rgba(0, 0, 0, 0.05)',
                  zIndex: 1,
                  pointerEvents: 'none'
                }
              }}
            >
              {/* Replace with your actual map implementation */}
              <Box 
                component="iframe"
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d237.72088790057686!2d79.08105723634382!3d21.13908092562121!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bd4c017e6f0439d%3A0x7e6e01e4d5bcc1cb!2sChhatrapati%20Square%2C%20Wardha%20Rd%2C%20Nagpur%2C%20Maharashtra%20440015!5e0!3m2!1sen!2sin!4v1715945041815!5m2!1sen!2sin"
                sx={{
                  border: 0,
                  width: '100%',
                  height: '100%'
                }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </Paper>
          </motion.div>
        </Box>
      </Container>

      {/* Connect with us Section */}
      <Box 
        sx={{ 
          backgroundColor: theme.palette.background.paper,
          py: 6,
          mb: -6 // Negative margin to connect with footer
        }}
      >
        <Container maxWidth="md">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <Box 
              sx={{ 
                textAlign: 'center',
                py: 4
              }}
            >
              <Typography 
                variant="h4" 
                component="h2" 
                gutterBottom 
                sx={{ fontWeight: 700 }}
              >
                Ready to Get Started?
              </Typography>
              
              <Typography 
                variant="body1" 
                sx={{ mb: 4, maxWidth: '700px', mx: 'auto' }}
              >
                Connect with our team today to learn how our VSOC solution can protect your organization.
              </Typography>
              
              <Button 
                variant="contained" 
                color="primary"
                size="large"
                href="https://www.vgipl.com/about_vgipl"
                target="_blank"
                rel="noopener noreferrer"
                sx={{
                  borderRadius: '30px',
                  py: 1.5,
                  px: 5,
                  fontWeight: 600,
                  textTransform: 'none',
                  boxShadow: '0 8px 16px rgba(33, 150, 243, 0.2)',
                  '&:hover': {
                    boxShadow: '0 12px 20px rgba(33, 150, 243, 0.3)',
                    transform: 'translateY(-2px)'
                  },
                  transition: 'all 0.3s ease'
                }}
              >
                Visit VGIPL
              </Button>
            </Box>
          </motion.div>
        </Container>
      </Box>
    </Box>
  );
};

export default ContactUs;