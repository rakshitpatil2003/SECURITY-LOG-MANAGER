import React from 'react';
import { useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import { ThemeProvider as CustomThemeProvider } from './context/ThemeContext';
import { ThemeContext } from './context/ThemeContext';


// Auth Context
import { AuthProvider } from './context/AuthContext';
import AccessControl from './components/Common/AccessControl';

// Components
import Layout from './components/layout/Layout';
import Login from './components/Auth/Login';
import Dashboard from './components/Dashboard/Dashboard';
import LogDetails from './components/Logs/LogDetails';
import MajorLogs from './components/Logs/MajorLogs';
import UserDetails from './components/Auth/UserDetails';
import Settings from './components/Common/Settings';
import ProtectedRoute from './components/Common/ProtectedRoute';
import ManualRemediation from './components/Logs/manualRemediation';
import Tickets from './components/Tickets/Tickets';
import Reports from './components/Reports/Reports';
import MitreAttack from './components/ComplianceReports/MitreAttack';
import Hipaa from './components/ComplianceReports/Hipaa';
import Gdpr from './components/ComplianceReports/Gdpr';
import Nist from './components/ComplianceReports/Nist';
import Pcidss from './components/ComplianceReports/Pcidss';
import Tsc from './components/ComplianceReports/Tsc';
import Vulnerability from './components/ThreatIntelligence/Vulnerability';
import AboutUs from './components/StaticPages/AboutUs';
import PrivacyPolicy from './components/StaticPages/PrivacyPolicy';
import TermsOfService from './components/StaticPages/TermsOfService';
import ContactUs from './components/StaticPages/ContactUs';
import ThreatHunting from './components/ThreatIntelligence/ThreatHunting';
import FIM from './components/Logs/FIM';
import SentinelAI from './components/Logs/SentinelAI';
import AdvancedAnalytics from './components/Logs/AdvancedAnalytics';
import SCA from './components/Logs/SCA';
import Session from './components/Logs/Session';
import Malware from './components/Logs/Malware';


// Theme configuration
function App() {
  return (
    <CustomThemeProvider>
      <AppWithTheme />
    </CustomThemeProvider>
  );
}


function AppWithTheme() {
  const { darkMode } = useContext(ThemeContext);
  
  const theme = createTheme({
    palette: {
      mode: darkMode ? 'dark' : 'light',
      primary: {
        main: '#2196f3',
      },
      secondary: {
        main: '#f50057',
      },
      background: {
        default: darkMode ? '#121212' : '#f5f5f5',
        paper: darkMode ? '#1e1e1e' : '#ffffff',
      },
    },
    typography: {
      fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
      h4: {
        fontWeight: 500,
      },
      h6: {
        fontWeight: 500,
      },
    },
    components: {
      MuiAppBar: {
        defaultProps: {
          elevation: 1,
        },
        styleOverrides: {
          root: {
            backgroundColor: darkMode ? '#1e1e1e' : '#ffffff',
            color: darkMode ? '#ffffff' : '#333333'
          }
        }
      },
      MuiPaper: {
        defaultProps: {
          elevation: 2,
        },
      },
    },
  });

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <Router>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />

            {/* Protected routes */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="logs" element={<LogDetails />} />
              <Route path="majorlogs" element={<MajorLogs />} />
              <Route path="advanced-analytics" element={<AdvancedAnalytics />} />
              <Route path="fim" element={<FIM />} />
              <Route path="sessions" element={<Session />} />
              <Route path="sca" element={<SCA />} />
              <Route path="malware" element={<Malware />} />
              <Route path="sentinelai" element={<SentinelAI />} />
              <Route path="remediation" element={<ManualRemediation />} />
              <Route path="tickets" element={<Tickets />} />
              <Route path="reports" element={<Reports />} />
              <Route path="compliance/mitre" element={<MitreAttack />} />
              <Route path="compliance/hipaa" element={<Hipaa />} />
              <Route path="compliance/gdpr" element={<Gdpr />} />
              <Route path="compliance/nist" element={<Nist />} />
              <Route path="compliance/pcidss" element={<Pcidss />} />
              <Route path="compliance/tsc" element={<Tsc />} />
              <Route path="threatintelligence/vulnerability" element={<Vulnerability />} />
              <Route path="threatintelligence/threathunting" element={<ThreatHunting />} />
              <Route path="users" element={<Navigate to="/profile" replace />} />
              <Route path="profile" element={<UserDetails />} />
              <Route path="settings" element={<Settings />} />
              <Route path="about" element={<AboutUs />} />
              <Route path="privacy" element={<PrivacyPolicy />} />
              <Route path="terms" element={<TermsOfService />} />
              <Route path="contact" element={<ContactUs />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;