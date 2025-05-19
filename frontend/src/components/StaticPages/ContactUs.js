import React from 'react';
import { Box, Typography, Container, Button, Link, useTheme } from '@mui/material';
import { useOutletContext } from 'react-router-dom';
import EmailIcon from '@mui/icons-material/Email';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import PhoneIcon from '@mui/icons-material/Phone';

const ContactUs = () => {
  const { setPageTitle } = useOutletContext();
  const theme = useTheme();
  
  // The URL to your contact form
  const contactFormUrl = "https://www.vgipl.com/about_vgipl";

  React.useEffect(() => {
    setPageTitle('Contact Us');
  }, [setPageTitle]);

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 6 }}>
        <Typography 
          variant="h3" 
          component="h1" 
          gutterBottom 
          sx={{ 
            fontWeight: 700,
            mb: 4,
            background: `linear-gradient(45deg, ${theme.palette.primary.main} 30%, ${theme.palette.secondary.main} 90%)`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Contact Us
        </Typography>
        
        <Box sx={{ mb: 4 }}>
          <Typography variant="body1" paragraph>
            We'd love to hear from you! Please use one of the following methods to get in touch with our team:
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <EmailIcon sx={{ mr: 2, color: theme.palette.primary.main }} />
            <Typography variant="body1">
              Email: <Link href="mailto:info@vgipl.in">info@vgipl.in</Link>
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <PhoneIcon sx={{ mr: 2, color: theme.palette.primary.main }} />
            <Typography variant="body1">
              Phone: 7798026888
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
            <LocationOnIcon sx={{ mr: 2, color: theme.palette.primary.main }} />
            <Typography variant="body1">
              Address: Chhatrapati Square, Nagpur 441108
            </Typography>
          </Box>
        </Box>
        
        <Typography variant="h5" component="h2" sx={{ mb: 2, fontWeight: 600 }}>
          Connect with us
        </Typography>
        
        <Typography variant="body1" paragraph>
          For a faster response, please use our online contact form:
        </Typography>
        
        <Button 
          variant="contained" 
          color="primary" 
          href={contactFormUrl}
          target="_blank"
          rel="noopener noreferrer"
          sx={{ mt: 2 }}
        >
          Take me to VGIL
        </Button>
      </Box>
    </Container>
  );
};

export default ContactUs;