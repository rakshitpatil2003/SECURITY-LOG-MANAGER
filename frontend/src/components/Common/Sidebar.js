import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  IconButton,
  Typography,
  Avatar,
  Tooltip
} from '@mui/material';

// Icons
import DashboardIcon from '@mui/icons-material/Dashboard';
import SecurityIcon from '@mui/icons-material/Security';
import DescriptionIcon from '@mui/icons-material/Description';
import PeopleIcon from '@mui/icons-material/People';
import SettingsIcon from '@mui/icons-material/Settings';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import WarningIcon from '@mui/icons-material/Warning';
import FolderSpecialIcon from '@mui/icons-material/FolderSpecial';
import HealthAndSafetyIcon from '@mui/icons-material/HealthAndSafety';
import ShieldIcon from '@mui/icons-material/Shield';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import Collapse from '@mui/material/Collapse';
import CrisisAlertIcon from '@mui/icons-material/CrisisAlert';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import AssuredWorkloadIcon from '@mui/icons-material/AssuredWorkload';
import AddModeratorIcon from '@mui/icons-material/AddModerator';
import BugReportIcon from '@mui/icons-material/BugReport';
import InsertPageBreakIcon from '@mui/icons-material/InsertPageBreak';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import PsychologyIcon from '@mui/icons-material/Psychology';
// Sidebar width
const drawerWidth = 240;

const Sidebar = ({ open, toggleDrawer }) => {
  const { currentUser } = useAuth();
  const location = useLocation();
  const [subMenuOpenStates, setSubMenuOpenStates] = useState({});

  const toggleSubMenu = (title) => {
    setSubMenuOpenStates(prev => ({
      ...prev,
      [title]: !prev[title]
    }));
  };

  const isAnySubItemActive = (subItems) => {
    return subItems.some(subItem => location.pathname === subItem.path);
  };

  // Menu items with access control
  const menuItems = [
    {
      title: 'Dashboard',
      icon: <DashboardIcon />,
      path: '/',
      roles: ['administrator', 'L1-Analyst', 'L2-Analyst', 'L3-Analyst']
    },
    {
      title: 'Forensics Analysis',
      icon: <SecurityIcon />,
      path: '/logs',
      roles: ['administrator', 'L1-Analyst', 'L2-Analyst', 'L3-Analyst']
    },
    {
      title: 'Advanced Analytics',
      icon: <PsychologyIcon />,
      path: '/advanced-analytics',
      roles: ['administrator', 'L1-Analyst', 'L2-Analyst', 'L3-Analyst']
    },
    {
      title: 'Major Events',
      icon: <WarningIcon />, // You might need to import WarningIcon from @mui/icons-material/Warning
      path: '/majorlogs',
      roles: ['administrator', 'L1-Analyst', 'L2-Analyst', 'L3-Analyst'] // Match same roles as LogDetails
    },
    {
      title: 'Manual Remediation',
      icon: <SecurityIcon />,
      path: '/remediation',
      roles: ['administrator', 'L3-Analyst']
    },
    {
    title: 'File Integrity Monitoring',
    icon: <InsertPageBreakIcon />,
    path: '/fim',
    roles: ['administrator', 'L1-Analyst', 'L2-Analyst', 'L3-Analyst']
    },
    {
    title: 'Sentinel AI',
    icon: <SmartToyIcon />,
    path: '/sentinelai',
    roles: ['administrator', 'L1-Analyst', 'L2-Analyst', 'L3-Analyst']
    },
    {
      title: 'Tickets',
      icon: <ConfirmationNumberIcon />,
      path: '/tickets',
      roles: ['administrator', 'L1-Analyst', 'L2-Analyst', 'L3-Analyst']
    },
    {
      title: 'Reports',
      icon: <DescriptionIcon />,
      path: '/reports',
      roles: ['administrator', 'L2-Analyst', 'L3-Analyst']
    },
    {
      title: 'Compliance Reports',
      icon: <FolderSpecialIcon />,
      subItems: [
        {
          title: 'MITRE ATT&CK',
          icon: <CrisisAlertIcon />,
          path: '/compliance/mitre',
          roles: ['administrator', 'L2-Analyst', 'L3-Analyst']
        },
        {
          title: 'HIPAA',
          icon: <HealthAndSafetyIcon />,
          path: '/compliance/hipaa',
          roles: ['administrator', 'L2-Analyst', 'L3-Analyst']
        },
        {
          title: 'GDPR',
          icon: <ShieldIcon />,
          path: '/compliance/gdpr',
          roles: ['administrator', 'L2-Analyst', 'L3-Analyst']
        },
        {
          title: 'NIST',
          icon: <AssignmentTurnedInIcon />,
          path: '/compliance/nist',
          roles: ['administrator', 'L2-Analyst', 'L3-Analyst']
        },
        {
          title: 'PCI-DSS',
          icon: <AssuredWorkloadIcon />,
          path: '/compliance/pcidss',
          roles: ['administrator', 'L2-Analyst', 'L3-Analyst']
        },
        {
          title: 'TSC',
          icon: <AddModeratorIcon />,
          path: '/compliance/tsc',
          roles: ['administrator', 'L2-Analyst', 'L3-Analyst']
        }
        // More compliance report items can be added here later
      ],
      roles: ['administrator', 'L2-Analyst', 'L3-Analyst']
    },
    {
      title: 'Threat Intelligence',
      icon: <SecurityIcon />,
      subItems: [
        {
          title: 'Vulnerability Detection',
          icon: <BugReportIcon />,
          path: '/threatintelligence/vulnerability',
          roles: ['administrator', 'L1-Analyst', 'L2-Analyst', 'L3-Analyst']
        },
        {
          title: 'Threat Hunting',
          icon: <BugReportIcon />,
          path: '/threatintelligence/threathunting',
          roles: ['administrator', 'L1-Analyst', 'L2-Analyst', 'L3-Analyst']
        }
        // Other threat intelligence items can be added here
      ],
      roles: ['administrator', 'L1-Analyst', 'L2-Analyst', 'L3-Analyst']
    },
    {
      title: 'Users',
      icon: <PeopleIcon />,
      path: '/profile',
      roles: ['administrator']
    },
    {
      title: 'Settings',
      icon: <SettingsIcon />,
      path: '/settings',
      roles: ['administrator']
    }
  ];

  // Check if user has access to a menu item
  const hasAccess = (requiredRoles) => {
    if (!currentUser || !currentUser.role) return false;
    return requiredRoles.includes(currentUser.role);
  };

  // Get initial letter for avatar
  const getInitial = () => {
    if (!currentUser) return 'U';

    if (currentUser.fullName) {
      return currentUser.fullName.charAt(0).toUpperCase();
    }

    if (currentUser.username) {
      return currentUser.username.charAt(0).toUpperCase();
    }

    return 'U';
  };

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: open ? drawerWidth : 72,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: open ? drawerWidth : 72,
          boxSizing: 'border-box',
          transition: theme => theme.transitions.create('width', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
          overflowX: 'hidden',
        },
      }}
      open={open}
    >
      <Box sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: open ? 'flex-end' : 'center',
        py: 2,
        px: open ? 1 : 0
      }}>
        {open && (
          <Typography variant="h6" sx={{ flexGrow: 1, ml: 2 }}>
            SecLogManager
          </Typography>
        )}
        <IconButton onClick={toggleDrawer}>
          {open ? <ChevronLeftIcon /> : <ChevronRightIcon />}
        </IconButton>
      </Box>

      <Divider />

      <List>
        {menuItems.map((item) => {
          // Only show menu items if user has access
          if (!hasAccess(item.roles)) return null;

          // Check if the item has subitems
          if (item.subItems) {
            const isSubMenuOpen = subMenuOpenStates[item.title] || false;
            const hasActiveSubItem = isAnySubItemActive(item.subItems);

            return (
              <Box key={item.title}>
                <ListItem disablePadding sx={{ display: 'block' }}>
                  <ListItemButton
                    onClick={() => toggleSubMenu(item.title)}
                    sx={{
                      minHeight: 48,
                      justifyContent: open ? 'initial' : 'center',
                      px: 2.5,
                      bgcolor: hasActiveSubItem ? 'rgba(0, 0, 0, 0.08)' : 'transparent',
                    }}
                  >
                    <ListItemIcon
                      sx={{
                        minWidth: 0,
                        mr: open ? 2 : 'auto',
                        justifyContent: 'center',
                      }}
                    >
                      {item.icon}
                    </ListItemIcon>
                    <ListItemText
                      primary={item.title}
                      sx={{ opacity: open ? 1 : 0 }}
                    />
                    {open && (isSubMenuOpen ? <ExpandLess /> : <ExpandMore />)}
                  </ListItemButton>
                </ListItem>

                {open && (
                  <Collapse in={isSubMenuOpen} timeout="auto" unmountOnExit>
                    <List component="div" disablePadding>
                      {item.subItems.map((subItem) => {
                        // Only show subitems if user has access
                        if (!hasAccess(subItem.roles)) return null;

                        return (
                          <ListItem key={subItem.title} disablePadding sx={{ display: 'block' }}>
                            <ListItemButton
                              component={NavLink}
                              to={subItem.path}
                              selected={location.pathname === subItem.path}
                              sx={{
                                minHeight: 48,
                                justifyContent: open ? 'initial' : 'center',
                                pl: 4,
                                px: 2.5,
                              }}
                            >
                              <ListItemIcon
                                sx={{
                                  minWidth: 0,
                                  mr: open ? 2 : 'auto',
                                  justifyContent: 'center',
                                }}
                              >
                                {subItem.icon}
                              </ListItemIcon>
                              <ListItemText
                                primary={subItem.title}
                                sx={{ opacity: open ? 1 : 0 }}
                              />
                            </ListItemButton>
                          </ListItem>
                        );
                      })}
                    </List>
                  </Collapse>
                )}
              </Box>
            );
          }

          // Regular menu item without subitems
          return (
            <ListItem key={item.title} disablePadding sx={{ display: 'block' }}>
              <Tooltip title={open ? '' : item.title} placement="right">
                <ListItemButton
                  component={NavLink}
                  to={item.path}
                  selected={location.pathname === item.path}
                  sx={{
                    minHeight: 48,
                    justifyContent: open ? 'initial' : 'center',
                    px: 2.5,
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: 0,
                      mr: open ? 2 : 'auto',
                      justifyContent: 'center',
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={item.title}
                    sx={{ opacity: open ? 1 : 0 }}
                  />
                </ListItemButton>
              </Tooltip>
            </ListItem>
          );
        })}
      </List>

      <Divider sx={{ mt: 'auto' }} />

      <ListItem disablePadding sx={{ display: 'block' }}>
        <Tooltip title={open ? '' : 'Profile'} placement="right">
          <ListItemButton
            component={NavLink}
            to="/profile"
            selected={location.pathname === '/profile'}
            sx={{
              minHeight: 48,
              justifyContent: open ? 'initial' : 'center',
              px: 2.5,
            }}
          >
            <ListItemIcon
              sx={{
                minWidth: 0,
                mr: open ? 2 : 'auto',
                justifyContent: 'center',
              }}
            >
              {currentUser ? (
                <Avatar
                  sx={{
                    width: 32,
                    height: 32,
                    bgcolor: 'primary.main'
                  }}
                >
                  {getInitial()}
                </Avatar>
              ) : (
                <AccountCircleIcon />
              )}
            </ListItemIcon>
            <ListItemText
              primary={currentUser?.username || 'Profile'}
              secondary={currentUser?.role}
              sx={{
                opacity: open ? 1 : 0,
                '& .MuiListItemText-secondary': {
                  textOverflow: 'ellipsis',
                  overflow: 'hidden',
                  whiteSpace: 'nowrap'
                }
              }}
            />
          </ListItemButton>
        </Tooltip>
      </ListItem>
    </Drawer>
  );
};

export default Sidebar;