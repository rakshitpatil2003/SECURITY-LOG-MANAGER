import React, { useState, useEffect } from 'react';
import { Box, Typography, styled } from '@mui/material';
import ShieldIcon from '@mui/icons-material/Shield';
import { getNews } from '../../services/news';

const TickerContainer = styled(Box)(({ theme }) => ({
  backgroundColor: '#d32f2f', // Red background color
  color: '#ffffff', // White text
  padding: theme.spacing(1),
  overflow: 'hidden',
  whiteSpace: 'nowrap',
  width: '100%',
  boxShadow: '0px -2px 4px rgba(0,0,0,0.1)', // Add shadow at the top
}));

const TickerContent = styled(Box)({
  display: 'inline-block',
  paddingLeft: '100%',
  animation: 'ticker 90s linear infinite',
  fontWeight: 'bold',
  fontSize: '1.1rem',
  '@keyframes ticker': {
    '0%': { transform: 'translateX(0)' },
    '100%': { transform: 'translateX(-100%)' },
  },
});

const NewsTicker = () => {
  const [headlines, setHeadlines] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const news = await getNews();
        setHeadlines(news);
      } catch (error) {
        console.error('Error fetching news:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
    const interval = setInterval(fetchNews, 3600000); // Refresh every hour

    return () => clearInterval(interval);
  }, []);

  if (loading && headlines.length === 0) {
    return (
      <TickerContainer>
        <Typography variant="body2">Loading security news...</Typography>
      </TickerContainer>
    );
  }

  if (headlines.length === 0) {
    return (
      <TickerContainer>
        <Typography variant="body2">No security news available</Typography>
      </TickerContainer>
    );
  }

  return (
    <TickerContainer>
      <TickerContent>
        {headlines.map((headline, index) => (
          <React.Fragment key={index}>
            <Typography 
              component="span" 
              variant="body2"
              sx={{ mx: 2 }}
            >
              {headline}
            </Typography>
            <ShieldIcon fontSize="small" sx={{ mx: 1, verticalAlign: 'middle' }} />
          </React.Fragment>
        ))}
      </TickerContent>
    </TickerContainer>
  );
};

export default NewsTicker;