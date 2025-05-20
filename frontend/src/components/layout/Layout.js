import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Box, CssBaseline, Toolbar } from '@mui/material';
import Header from '../Common/Header';
import Sidebar from '../Common/Sidebar';
import NewsTicker from '../Common/NewsTicker';
import Footer from '../Common/Footer'; // Add this import

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [pageTitle, setPageTitle] = useState('Dashboard');

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <CssBaseline />
      
      <Box sx={{ display: 'flex', flex: 1 }}>
        {/* Header */}
        <Header 
          open={sidebarOpen} 
          toggleDrawer={toggleSidebar} 
          title={pageTitle} 
        />
        
        {/* Sidebar */}
        <Sidebar 
          open={sidebarOpen} 
          toggleDrawer={toggleSidebar} 
        />
        
        {/* Main content */}
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            p: 3,
            ml: { sm: `${sidebarOpen ? 80 : 20}px` },
            transition: theme => theme.transitions.create(['margin'], {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.enteringScreen,
            }),
            display: 'flex',
            flexDirection: 'column',
            pb: 12, // Add padding bottom to prevent content from being hidden behind footer
          }}
        >
          <Toolbar />
          <Box sx={{ flex: 1 }}>
            <Outlet context={{ setPageTitle }} />
          </Box>
        </Box>
      </Box>
      
      {/* News Ticker positioned above footer */}
      <Box 
        sx={{ 
          position: 'fixed',
          bottom: 48, // Height of footer
          width: '100%',
          zIndex: 1100,
          paddingLeft: theme => ({ 
            xs: 0, 
            sm: `${sidebarOpen ? drawerWidth : 72}px` 
          }),
          transition: theme => theme.transitions.create(['padding'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
        }}
      >
        <NewsTicker />
      </Box>
      
      {/* Footer positioned at the very bottom */}
      <Box
        sx={{
          paddingLeft: theme => ({ 
            xs: 0, 
            sm: `${sidebarOpen ? drawerWidth : 72}px` 
          }),
          transition: theme => theme.transitions.create(['padding'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
        }}
      >
        <Footer />
      </Box>
    </Box>
  );
};

// Sidebar width constant - keep in sync with Sidebar component
const drawerWidth = 240;

export default Layout;