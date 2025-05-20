import React from 'react';
import { Box, Typography, Link, styled } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

const FooterContainer = styled(Box)(({ theme }) => ({
  backgroundColor: theme.palette.background.paper,
  color: theme.palette.text.secondary,
  padding: theme.spacing(2),
  borderTop: `1px solid ${theme.palette.divider}`,
  position: 'fixed',
  bottom: 0,
  width: '100%',
  zIndex: 1000,
  display: 'flex',
  boxSizing: 'border-box',
  paddingLeft: { xs: theme.spacing(2), sm: theme.spacing(3) },
  paddingRight: { xs: theme.spacing(2), sm: theme.spacing(3) },
}));

const FooterContent = styled(Box)(({ theme }) => ({
  display: 'flex',
  flex: 1,
  alignItems: 'center',
  justifyContent: 'space-between',
  maxWidth: '100%',
  marginLeft: { sm: '240px' }, // Align with sidebar width when open
  [theme.breakpoints.down('sm')]: {
    flexDirection: 'column',
    gap: theme.spacing(1),
    marginLeft: 0,
  },
}));

const CopyrightText = styled(Box)(({ theme }) => ({
  minWidth: '240px', // Match sidebar width
  paddingLeft: theme.spacing(2),
  [theme.breakpoints.down('sm')]: {
    minWidth: 'auto',
    paddingLeft: 0,
    textAlign: 'center',
  },
}));

const FooterLinks = styled(Box)(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing(2),
  flexWrap: 'wrap',
  justifyContent: 'center',
  flex: 1,
  maxWidth: 'calc(70% - 240px)', // Account for copyright space
  [theme.breakpoints.down('sm')]: {
    gap: theme.spacing(1),
    maxWidth: '100%',
  },
}));

const FooterLink = styled(Link)(({ theme }) => ({
  transition: 'color 0.3s ease',
  whiteSpace: 'nowrap',
  '&:hover': {
    color: theme.palette.primary.main,
  },
}));

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <FooterContainer>
      <FooterContent>
        <CopyrightText>
          <Typography variant="body2">
            © {new Date().getFullYear()} Security Log Manager. All rights reserved.
          </Typography>
        </CopyrightText>
        <FooterLinks>
          <FooterLink
            component={RouterLink}
            to="/about"
            color="inherit"
            variant="body2"
            underline="hover"
          >
            About Us
          </FooterLink>
          <FooterLink
            component={RouterLink}
            to="/privacy"
            color="inherit"
            variant="body2"
            underline="hover"
          >
            Privacy Policy
          </FooterLink>
          <FooterLink
            component={RouterLink}
            to="/terms"
            color="inherit"
            variant="body2"
            underline="hover"
          >
            Terms of Service
          </FooterLink>
          <FooterLink
            component={RouterLink}
            to="/contact"
            color="inherit"
            variant="body2"
            underline="hover"
          >
            Contact
          </FooterLink>
        </FooterLinks>
      </FooterContent>
    </FooterContainer>
  );
};

export default Footer;