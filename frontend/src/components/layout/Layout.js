import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Box, CssBaseline, Toolbar } from '@mui/material';
import Header from '../Common/Header';
import Sidebar from '../Common/Sidebar';

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [pageTitle, setPageTitle] = useState('Dashboard');

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      
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
          //width: { sm: `calc(100% - ${sidebarOpen ? 240 : 72}px)` },
          ml: { sm: `${sidebarOpen ? 80 : 20}px` },
          transition: theme => theme.transitions.create(['margin'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
        }}
      >
        <Toolbar /> {/* Spacer to push content below app bar */}
        <Outlet context={{ setPageTitle }} />
      </Box>
    </Box>
  );
};

export default Layout;