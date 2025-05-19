import React from 'react';
import { Box, Typography, Container, Divider, useTheme } from '@mui/material';
import { useOutletContext } from 'react-router-dom';

const TermsOfService = () => {
  const { setPageTitle } = useOutletContext();
  const theme = useTheme();

  React.useEffect(() => {
    setPageTitle('Terms of Service');
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
          Terms of Service
        </Typography>

        <Typography variant="body1" paragraph>
          Last Updated: May 19, 2025
        </Typography>

        <Typography variant="h5" component="h2" sx={{ mt: 4, mb: 2, fontWeight: 600 }}>
          1. Acceptance of Terms
        </Typography>
        <Typography variant="body1" paragraph>
          By accessing or using the Virtual Security Operations Center ("VSOC") services provided by our company, you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, please do not use our services.
        </Typography>

        <Typography variant="h5" component="h2" sx={{ mt: 4, mb: 2, fontWeight: 600 }}>
          2. Description of Services
        </Typography>
        <Typography variant="body1" paragraph>
          Our VSOC platform provides security monitoring, threat detection, incident response, and compliance management services as described on our website and in service agreements. The specific features and capabilities may vary based on your subscription level.
        </Typography>

        <Typography variant="h5" component="h2" sx={{ mt: 4, mb: 2, fontWeight: 600 }}>
          3. User Accounts and Security
        </Typography>
        <Typography variant="body1" paragraph>
          To access our services, you must create an account with accurate and complete information. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You must immediately notify us of any unauthorized use of your account or any other security breach.
        </Typography>

        <Typography variant="h5" component="h2" sx={{ mt: 4, mb: 2, fontWeight: 600 }}>
          4. Service Availability and Updates
        </Typography>
        <Typography variant="body1" paragraph>
          We strive to provide uninterrupted service, but we do not guarantee that our services will be available at all times. We may perform maintenance or updates that temporarily suspend access to the services. We will make reasonable efforts to provide advance notice of any scheduled maintenance.
        </Typography>

        <Typography variant="h5" component="h2" sx={{ mt: 4, mb: 2, fontWeight: 600 }}>
          5. Your Data and Privacy
        </Typography>
        <Typography variant="body1" paragraph>
          Our Privacy Policy governs the collection, use, and storage of information provided to us through your use of our services. By using our services, you consent to the data practices described in our Privacy Policy.
        </Typography>

        <Typography variant="h5" component="h2" sx={{ mt: 4, mb: 2, fontWeight: 600 }}>
          6. Intellectual Property Rights
        </Typography>
        <Typography variant="body1" paragraph>
          All content, features, and functionality of our services, including but not limited to text, graphics, logos, and software, are owned by our company and are protected by intellectual property laws. You may not reproduce, distribute, modify, or create derivative works of our services without our prior written consent.
        </Typography>

        <Typography variant="h5" component="h2" sx={{ mt: 4, mb: 2, fontWeight: 600 }}>
          7. Compliance Requirements
        </Typography>
        <Typography variant="body1" paragraph>
          While our services assist with compliance monitoring, the ultimate responsibility for compliance with industry regulations and standards (PCI-DSS, HIPAA, CERT-IN, etc.) remains with you. Our services are tools to help you meet these requirements but do not guarantee compliance.
        </Typography>

        <Typography variant="h5" component="h2" sx={{ mt: 4, mb: 2, fontWeight: 600 }}>
          8. Limitations of Liability
        </Typography>
        <Typography variant="body1" paragraph>
          To the maximum extent permitted by law, we shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly, or any loss of data, use, goodwill, or other intangible losses resulting from your use of our services.
        </Typography>

        <Typography variant="h5" component="h2" sx={{ mt: 4, mb: 2, fontWeight: 600 }}>
          9. Indemnification
        </Typography>
        <Typography variant="body1" paragraph>
          You agree to indemnify, defend, and hold harmless our company and its officers, directors, employees, and agents from and against any claims, liabilities, damages, losses, and expenses, including reasonable attorneys' fees and costs, arising out of or in any way connected with your access to or use of our services.
        </Typography>

        <Typography variant="h5" component="h2" sx={{ mt: 4, mb: 2, fontWeight: 600 }}>
          10. Term and Termination
        </Typography>
        <Typography variant="body1" paragraph>
          These Terms will remain in effect until terminated by either you or us. We may terminate or suspend your access to our services immediately, without prior notice or liability, for any reason, including if you breach these Terms. Upon termination, your right to use our services will immediately cease.
        </Typography>

        <Typography variant="h5" component="h2" sx={{ mt: 4, mb: 2, fontWeight: 600 }}>
          11. Changes to These Terms
        </Typography>
        <Typography variant="body1" paragraph>
          We reserve the right to modify these Terms at any time. If we make material changes to these Terms, we will provide notice through our services or by other means. Your continued use of our services after such notice constitutes your acceptance of the modified Terms.
        </Typography>

        <Typography variant="h5" component="h2" sx={{ mt: 4, mb: 2, fontWeight: 600 }}>
          12. Governing Law
        </Typography>
        <Typography variant="body1" paragraph>
          These Terms shall be governed by and construed in accordance with the laws of the jurisdiction in which our company is registered, without regard to its conflict of law provisions.
        </Typography>

        <Typography variant="h5" component="h2" sx={{ mt: 4, mb: 2, fontWeight: 600 }}>
          13. Contact Us
        </Typography>
        <Typography variant="body1" paragraph>
          If you have any questions about these Terms, please contact us through the contact information provided on our website.
        </Typography>

        <Divider sx={{ my: 4 }} />
        
        <Box sx={{ mt: 4 }}>
          <Typography variant="body2" color="text.secondary">
            By using our VSOC services, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.
          </Typography>
        </Box>
      </Box>
    </Container>
  );
};

export default TermsOfService;