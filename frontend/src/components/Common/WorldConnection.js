// src/components/Common/WorldConnection.js
import React, { useEffect, useRef } from 'react';
import * as am4core from "@amcharts/amcharts4/core";
import * as am4maps from "@amcharts/amcharts4/maps";
import am4geodata_worldLow from "@amcharts/amcharts4-geodata/worldLow";
import { Box, Typography, Paper, Grid, Chip } from '@mui/material';

// Country coordinates for mapping
const countryCoordinates = {
  "United States": { latitude: 39.7837304, longitude: -100.4458825 }, "India": { latitude: 20.5937, longitude: 78.9629 },
  "Germany": { latitude: 51.1657, longitude: 10.4515 }, "France": { latitude: 46.6034, longitude: 1.8883 }, "Netherlands": { latitude: 52.1326, longitude: 5.2913 },
  "Singapore": { latitude: 1.3521, longitude: 103.8198 }, "Japan": { latitude: 36.2048, longitude: 138.2529 }, "Luxembourg": { latitude: 49.8153, longitude: 6.1296 },
  "Reserved": { latitude: -5.0000, longitude: 73.5000 }, "China": { latitude: 35.8617, longitude: 104.1954 }, "United Kingdom": { latitude: 55.3781, longitude: -3.4360 },
  "Canada": { latitude: 56.1304, longitude: -106.3468 }, "Australia": { latitude: -25.2744, longitude: 133.7751 }, "Brazil": { latitude: -14.2350, longitude: -51.9253 },
  "Russian Federation": { latitude: 61.5240, longitude: 105.3188 }, "South Korea": { latitude: 35.9078, longitude: 127.7669 }, "Italy": { latitude: 41.8719, longitude: 12.5674 },
  "Spain": { latitude: 40.4637, longitude: -3.7492 }, "Mexico": { latitude: 23.6345, longitude: -102.5528 }, "Indonesia": { latitude: -0.7893, longitude: 113.9213 },
  "South Africa": { latitude: -30.5595, longitude: 22.9375 }, "Korea, Republic of": { latitude: 40.339852, longitude: 127.510093 },
  "Hong Kong": { latitude: 22.319303, longitude: 114.169361 }, "Afghanistan": { latitude: 33.9391, longitude: 67.709953 },
  "Albania": { latitude: 41.1533, longitude: 20.1683 }, "Algeria": { latitude: 28.0339, longitude: 1.6596 }, "Andorra": { latitude: 42.5078, longitude: 1.5211 },
  "Angola": { latitude: -11.2027, longitude: 17.8739 }, "Argentina": { latitude: -38.4161, longitude: -63.6167 }, "Armenia": { latitude: 40.0691, longitude: 45.0382 },
  "Austria": { latitude: 47.5162, longitude: 14.5501 }, "Azerbaijan": { latitude: 40.1431, longitude: 47.5769 }, "Bahamas": { latitude: 25.0343, longitude: -77.3963 },
  "Bahrain": { latitude: 26.0667, longitude: 50.5577 }, "Bangladesh": { latitude: 23.685, longitude: 90.3563 }, "Belarus": { latitude: 53.9006, longitude: 27.559 },
  "Belgium": { latitude: 50.8503, longitude: 4.3517 }, "Belize": { latitude: 17.1899, longitude: -88.4976 }, "Benin": { latitude: 9.3077, longitude: 2.3158 },
  "Bhutan": { latitude: 27.5142, longitude: 90.4336 }, "Bolivia": { latitude: -16.2902, longitude: -63.5887 }, "Botswana": { latitude: -22.3285, longitude: 24.6849 },
  "Brunei": { latitude: 4.5353, longitude: 114.7277 }, "Bulgaria": { latitude: 42.7339, longitude: 25.4858 }, "Burkina Faso": { latitude: 12.2383, longitude: -1.5616 },
  "Burundi": { latitude: -3.3731, longitude: 29.9189 }, "Cambodia": { latitude: 12.5657, longitude: 104.991 }, "Cameroon": { latitude: 7.3697, longitude: 12.3547 },
  "Chile": { latitude: -35.6751, longitude: -71.543 }, "Colombia": { latitude: 4.5709, longitude: -74.2973 }, "Costa Rica": { latitude: 9.7489, longitude: -83.7534 },
  "Croatia": { latitude: 45.1, longitude: 15.2 }, "Cuba": { latitude: 21.5218, longitude: -77.7812 }, "Cyprus": { latitude: 35.1264, longitude: 33.4299 },
  "Czech Republic": { latitude: 49.8175, longitude: 15.473 }, "Denmark": { latitude: 56.2639, longitude: 9.5018 }, "Dominican Republic": { latitude: 18.7357, longitude: -70.1627 },
  "Ecuador": { latitude: -1.8312, longitude: -78.1834 }, "Egypt": { latitude: 26.8206, longitude: 30.8025 }, "El Salvador": { latitude: 13.7942, longitude: -88.8965 },
  "Estonia": { latitude: 58.5953, longitude: 25.0136 }, "Ethiopia": { latitude: 9.145, longitude: 40.4897 }, "Finland": { latitude: 61.9241, longitude: 25.7482 },
  "Ghana": { latitude: 7.9465, longitude: -1.0232 }, "Greece": { latitude: 39.0742, longitude: 21.8243 }, "Guatemala": { latitude: 15.7835, longitude: -90.2308 },
  "Honduras": { latitude: 15.1999, longitude: -86.2419 }, "Hungary": { latitude: 47.1625, longitude: 19.5033 }, "Iceland": { latitude: 64.9631, longitude: -19.0208 },
  "Iran, Islamic Republic of": { latitude: 32.4279, longitude: 53.688 }, "Iraq": { latitude: 33.2232, longitude: 43.6793 }, "Ireland": { latitude: 53.4129, longitude: -8.2439 },
  "Israel": { latitude: 31.0461, longitude: 34.8516 }, "Jamaica": { latitude: 18.1096, longitude: -77.2975 }, "Jordan": { latitude: 30.5852, longitude: 36.2384 },
  "Kazakhstan": { latitude: 48.0196, longitude: 66.9237 }, "Kuwait": { latitude: 29.3117, longitude: 47.4818 }, "Latvia": { latitude: 56.8796, longitude: 24.6032 },
  "Lebanon": { latitude: 33.8547, longitude: 35.8623 }, "Lithuania": { latitude: 55.1694, longitude: 23.8813 }, "Madagascar": { latitude: -18.7669, longitude: 46.8691 },
  "Malaysia": { latitude: 4.2105, longitude: 101.9758 }, "Malta": { latitude: 35.9375, longitude: 14.3754 }, "Nepal": { latitude: 28.3949, longitude: 84.124 },
  "New Zealand": { latitude: -40.9006, longitude: 174.886 }, "Norway": { latitude: 60.472, longitude: 8.4689 }, "Pakistan": { latitude: 30.3753, longitude: 69.3451 },
  "Philippines": { latitude: 12.8797, longitude: 121.774 }, "Poland": { latitude: 51.9194, longitude: 19.1451 }, "Portugal": { latitude: 39.3999, longitude: -8.2245 },
  "Sweden": { latitude: 60.1282, longitude: 18.6435 }, "Switzerland": { latitude: 46.8182, longitude: 8.2275 }, "Thailand": { latitude: 15.870, longitude: 100.9925 },
  "Vietnam": { latitude: 14.0583, longitude: 108.2772 }, "United Arab Emirates": { latitude: 23.4241, longitude: 53.8478 }, "Taiwan": { latitude: 23.6978, longitude: 120.9605 },
  "Turkey": { latitude: 38.9637, longitude: 35.2433 }, "Ukraine": { latitude: 48.3794, longitude: 31.1656 }, "Sri Lanka": { latitude: 7.8731, longitude: 80.7718 }
};

const WorldConnection = ({ connectionData, height = 500 }) => {
  const chartRef = useRef(null);
  const chartInstanceRef = useRef(null);
  const [visibleConnections, setVisibleConnections] = React.useState({
    outgoingFromServer: true,
    incomingThreat: true,
    incomingNormal: true,
    external: true
  });

  // Toggle connection visibility
  const toggleConnectionVisibility = (connectionType) => {
    setVisibleConnections(prev => ({
      ...prev,
      [connectionType]: !prev[connectionType]
    }));
  };

  useEffect(() => {
    // Create map instance
    const chart = am4core.create("chartdiv", am4maps.MapChart);
    chartInstanceRef.current = chart;

    // Set initial zoom level and center position
    chart.homeZoomLevel = 1.2;
    chart.homeGeoPoint = { longitude: 10, latitude: 30 };
    chart.geodata = am4geodata_worldLow;
    chart.projection = new am4maps.projections.Miller();
    chart.background.fill = "#ffffff"; // White background
    chart.background.fillOpacity = 1;
    chart.chartContainer.wheelable = true;

    // Create map polygon series
    const polygonSeries = chart.series.push(new am4maps.MapPolygonSeries());
    polygonSeries.useGeodata = true;
    polygonSeries.mapPolygons.template.fill = am4core.color("#000000"); // Black countries
    polygonSeries.mapPolygons.template.stroke = am4core.color("#4f97e0"); // Light blue boundaries
    polygonSeries.mapPolygons.template.strokeWidth = 1.5; // Thicker boundary

    // Configure country hover states
    polygonSeries.mapPolygons.template.tooltipText = "{name}";
    polygonSeries.mapPolygons.template.cursorOverStyle = am4core.MouseCursorStyle.pointer;

    // Add city markers for regular countries
    const citySeries = chart.series.push(new am4maps.MapImageSeries());
    citySeries.mapImages.template.nonScaling = false;

    const cityTemplate = citySeries.mapImages.template.createChild(am4core.Circle);
    cityTemplate.radius = 5;
    cityTemplate.fill = am4core.color("#f00");
    cityTemplate.strokeWidth = 2;
    cityTemplate.stroke = am4core.color("#fff");

    // Add city tooltips
    citySeries.mapImages.template.tooltipText = "{title}";

    // Create a separate series for the server icon (Reserved location)
    const serverSeries = chart.series.push(new am4maps.MapImageSeries());
    serverSeries.mapImages.template.nonScaling = false;

    // Create a server icon
    const serverTemplate = serverSeries.mapImages.template.createChild(am4core.Container);

    // Create a rectangle for server body
    const serverBody = serverTemplate.createChild(am4core.RoundedRectangle);
    serverBody.width = 16;
    serverBody.height = 20;
    serverBody.cornerRadius(2, 2, 2, 2);
    serverBody.fill = am4core.color("#3B82F6");
    serverBody.stroke = am4core.color("#1E40AF");
    serverBody.strokeWidth = 1;

    // Add server details (lines representing server slots)
    for (let i = 1; i <= 3; i++) {
      const line = serverTemplate.createChild(am4core.Rectangle);
      line.width = 10;
      line.height = 1;
      line.fill = am4core.color("#ffffff");
      line.y = i * 4;
      line.x = 3;
    }

    serverSeries.mapImages.template.horizontalCenter = "middle";
    serverSeries.mapImages.template.verticalCenter = "middle";
    serverSeries.zIndex = 1000; // This will place server icons above all other elements
    serverSeries.mapImages.template.zIndex = 1000;
    serverTemplate.zIndex = 1000;
    
    // Center the server icon properly
    serverTemplate.horizontalCenter = "middle";
    serverTemplate.verticalCenter = "middle";

    // Add server tooltip
    serverSeries.mapImages.template.tooltipText = "{title} (Server)";

    // Set cities and server location based on connection data
    const cityData = [];
    const serverData = [];
    const uniqueCountries = new Set();

    if (connectionData && connectionData.length > 0) {
      connectionData.forEach(conn => {
        // Check if source country is "Reserved"
        if (conn.source === "Reserved" && conn.srcLongitude && conn.srcLatitude && !uniqueCountries.has(conn.source)) {
          serverData.push({
            title: conn.source,
            latitude: conn.srcLatitude,
            longitude: conn.srcLongitude
          });
          uniqueCountries.add(conn.source);
        }
        // Otherwise add to normal city data
        else if (conn.srcLongitude && conn.srcLatitude && !uniqueCountries.has(conn.source)) {
          cityData.push({
            title: conn.source,
            latitude: conn.srcLatitude,
            longitude: conn.srcLongitude
          });
          uniqueCountries.add(conn.source);
        }

        // Check if target country is "Reserved"
        if (conn.target === "Reserved" && conn.dstLongitude && conn.dstLatitude && !uniqueCountries.has(conn.target)) {
          serverData.push({
            title: conn.target,
            latitude: conn.dstLatitude,
            longitude: conn.dstLongitude
          });
          uniqueCountries.add(conn.target);
        }
        // Otherwise add to normal city data
        else if (conn.dstLongitude && conn.dstLatitude && !uniqueCountries.has(conn.target)) {
          cityData.push({
            title: conn.target,
            latitude: conn.dstLatitude,
            longitude: conn.dstLongitude
          });
          uniqueCountries.add(conn.target);
        }
      });
    }

    // Set property fields for both series
    citySeries.mapImages.template.propertyFields.latitude = "latitude";
    citySeries.mapImages.template.propertyFields.longitude = "longitude";
    serverSeries.mapImages.template.propertyFields.latitude = "latitude";
    serverSeries.mapImages.template.propertyFields.longitude = "longitude";

    // Set data for both series
    citySeries.data = cityData;
    serverSeries.data = serverData;

    // Create line series for different connection types based on requirements
    const createLineSeries = (id, color, name) => {
      const series = chart.series.push(new am4maps.MapArcSeries());
      series.id = id;
      series.name = name;
      series.mapLines.template.line.strokeWidth = 2;
      series.mapLines.template.line.stroke = am4core.color(color);
      series.mapLines.template.line.strokeOpacity = 0.8;
      series.mapLines.template.line.nonScalingStroke = true;
      series.zIndex = 10;

      // Increase the hit area for the lines
      series.mapLines.template.interactive = true;
      series.mapLines.template.strokeWidth = 2;
      series.mapLines.template.interactionsEnabled = true;

      // Create a wider invisible stroke for better hover detection
      const hitArea = series.mapLines.template.createChild(am4core.Line);
      hitArea.strokeWidth = 40; // Much wider than the visible line
      hitArea.stroke = am4core.color("#000");
      hitArea.strokeOpacity = 0.0; // Completely transparent
      hitArea.interactiveChildren = false;
      hitArea.isMeasured = false;

      // Make sure the hit area follows the same path as the visible line
      series.mapLines.template.events.on("ready", (event) => {
        const line = event.target;
        const lineElement = line.line;
        const hitAreaElement = line.children.getIndex(0);

        if (lineElement && hitAreaElement) {
          hitAreaElement.path = lineElement.path;
        }
      });

      // This is the key part - set a much larger hit radius for interaction
      series.mapLines.template.interactiveChildren = true;
      series.mapLines.template.line.hitRadius = 50; // Increase this value for easier hovering
      series.mapLines.template.cursorOverStyle = am4core.MouseCursorStyle.pointer;

      // Add curved lines (arcs)
      series.mapLines.template.shortestDistance = false;
      series.mapLines.template.line.controlPointDistance = 0.3;

      // Ensure tooltips remain visible longer and appear faster
      series.tooltip.pointerOrientation = "vertical";
      series.tooltip.animationDuration = 150; // Faster tooltip appearance
      series.tooltip.keepTargetHover = true; // Keep tooltip visible when hovering over it
      series.tooltip.background.strokeWidth = 0;
      series.tooltip.label.padding(10, 10, 10, 10);

      // Add line tooltips
      series.mapLines.template.tooltipText = "{from} → {to}: {value} event(s)";

      // Modify line thickness based on value
      series.mapLines.template.propertyFields.strokeWidth = "lineThickness";

      // Instead of using child animations that follow the path, we'll animate the line itself
      series.mapLines.template.line.events.on("inited", (event) => {
        const line = event.target;

        // Set up the animation for each line
        startLineAnimation(line);
      });

      // Function to start animation for a line
      function startLineAnimation(line) {
        // Animate the line's strokeDashoffset for a flowing effect
        line.strokeDasharray = 10;

        // Create animation
        const animation = line.animate(
          { property: "strokeDashoffset", from: 100, to: 0 },
          2000,
          am4core.ease.linear
        );

        // Make it repeat
        animation.events.on("animationended", () => {
          // Restart the animation after a delay
          setTimeout(() => {
            animation.start();
          }, 500);
        });
      }

      // Add arrow to line
      const arrow = series.mapLines.template.arrow = new am4core.Triangle();
      arrow.position = 1;
      arrow.direction = "right";
      arrow.stroke = am4core.color(color);
      arrow.fill = am4core.color(color);
      arrow.width = 8;
      arrow.height = 8;

      return series;
    };

    // Create series for each connection type
    const outgoingFromReservedSeries = createLineSeries("outgoingFromReserved", "#00FF00", "Outgoing from Server");
    const incomingThreatSeries = createLineSeries("incomingThreat", "#FF0000", "Incoming Threat (<20 events)");
    const incomingNormalSeries = createLineSeries("incomingNormal", "#0000FF", "Normal Incoming (≥20 events)");
    const externalSeries = createLineSeries("external", "#FFFF00", "External Connection");

    // Add lines based on connection data
    const outgoingData = [];
    const incomingThreatData = [];
    const incomingNormalData = [];
    const externalData = [];

    if (connectionData && connectionData.length > 0) {
      connectionData.forEach(conn => {
        if (conn.srcLongitude && conn.srcLatitude && conn.dstLongitude && conn.dstLatitude) {
          // Calculate line thickness based on value (logarithmic scale for better visualization)
          const lineThickness = Math.max(1, Math.min(6, 1 + Math.log(conn.value)));

          const lineObject = {
            from: conn.source,
            to: conn.target,
            value: conn.value,
            lineThickness: lineThickness,
            multiGeoLine: [[
              { longitude: conn.srcLongitude, latitude: conn.srcLatitude },
              { longitude: conn.dstLongitude, latitude: conn.dstLatitude }
            ]]
          };

          // Determine which series to add this connection to based on the requirements
          if (conn.source === "Reserved") {
            // Outgoing traffic from Reserved (green lines)
            outgoingData.push(lineObject);
          } else if (conn.target === "Reserved") {
            if (conn.value < 20) {
              // Incoming traffic to Reserved with volume < 20 (red lines - threat)
              incomingThreatData.push(lineObject);
            } else {
              // Incoming traffic to Reserved with volume >= 20 (blue lines - normal)
              incomingNormalData.push(lineObject);
            }
          } else {
            // External connections (yellow lines)
            externalData.push(lineObject);
          }
        }
      });
    }

    // Set data for each series
    outgoingFromReservedSeries.data = outgoingData;
    incomingThreatSeries.data = incomingThreatData;
    incomingNormalSeries.data = incomingNormalData;
    externalSeries.data = externalData;

    // Setup connection visibility from state
    outgoingFromReservedSeries.hidden = !visibleConnections.outgoingFromServer;
    incomingThreatSeries.hidden = !visibleConnections.incomingThreat;
    incomingNormalSeries.hidden = !visibleConnections.incomingNormal;
    externalSeries.hidden = !visibleConnections.external;

    // Add zoom control
    chart.zoomControl = new am4maps.ZoomControl();
    chart.zoomControl.slider.height = 100;

    // Create legend
    const legend = new am4maps.Legend();
    legend.parent = chart.chartContainer;
    legend.align = "bottom";
    legend.paddingBottom = 10;
    legend.fontSize = 12;
    legend.useDefaultMarker = true;

    // Make sure all series have proper names for the legend
    outgoingFromReservedSeries.name = "Outgoing from Server";
    incomingThreatSeries.name = "Incoming Threat (<20 events)";
    incomingNormalSeries.name = "Normal Incoming (≥20 events)";
    externalSeries.name = "External Connection";

    // Set colors for legend markers
    outgoingFromReservedSeries.fill = am4core.color("#00FF00");
    incomingThreatSeries.fill = am4core.color("#FF0000");
    incomingNormalSeries.fill = am4core.color("#0000FF");
    externalSeries.fill = am4core.color("#FFFF00");

    // Configure the legend to show these series
    legend.data = [{
      name: "Outgoing from Server", 
      fill: "#00FF00"
    }, {
      name: "Incoming Threat (<20 events)", 
      fill: "#FF0000"
    }, {
      name: "Normal Incoming (≥20 events)", 
      fill: "#0000FF"
    }, {
      name: "External Connection", 
      fill: "#FFFF00"
    }];

    // Make the legend items toggleable and clickable
    legend.itemContainers.template.togglable = true;
    legend.itemContainers.template.clickable = true;
    legend.itemContainers.template.cursorOverStyle = am4core.MouseCursorStyle.pointer;

    // Map the legend items to the corresponding series
    chart.legend = legend;
    legend.parent = chart.chartContainer;

    // Set up click event handler for legend items
    legend.itemContainers.template.events.on("hit", function(ev) {
      const item = ev.target.dataItem.dataContext;
      
      // Toggle the corresponding series visibility
      if (item.name === "Outgoing from Server") {
        outgoingFromReservedSeries.hidden = !outgoingFromReservedSeries.hidden;
        setVisibleConnections(prev => ({...prev, outgoingFromServer: !outgoingFromReservedSeries.hidden}));
      }
      else if (item.name === "Incoming Threat (<20 events)") {
        incomingThreatSeries.hidden = !incomingThreatSeries.hidden;
        setVisibleConnections(prev => ({...prev, incomingThreat: !incomingThreatSeries.hidden}));
      }
      else if (item.name === "Normal Incoming (≥20 events)") {
        incomingNormalSeries.hidden = !incomingNormalSeries.hidden;
        setVisibleConnections(prev => ({...prev, incomingNormal: !incomingNormalSeries.hidden}));
      }
      else if (item.name === "External Connection") {
        externalSeries.hidden = !externalSeries.hidden;
        setVisibleConnections(prev => ({...prev, external: !externalSeries.hidden}));
      }
    });

    chartRef.current = chart;

    return () => {
      chart.dispose();
    };
  }, [connectionData, visibleConnections]);

  // Handle changes to visibility from outside the chart
  useEffect(() => {
    const chart = chartInstanceRef.current;
    if (chart) {
      const outgoingSeries = chart.series.getIndex(3); // outgoingFromReservedSeries
      const incomingThreatSeries = chart.series.getIndex(4); // incomingThreatSeries
      const incomingNormalSeries = chart.series.getIndex(5); // incomingNormalSeries
      const externalSeries = chart.series.getIndex(6); // externalSeries

      if (outgoingSeries) outgoingSeries.hidden = !visibleConnections.outgoingFromServer;
      if (incomingThreatSeries) incomingThreatSeries.hidden = !visibleConnections.incomingThreat;
      if (incomingNormalSeries) incomingNormalSeries.hidden = !visibleConnections.incomingNormal;
      if (externalSeries) externalSeries.hidden = !visibleConnections.external;
    }
  }, [connectionData,visibleConnections, height]);

  return (
    <Box>
      <Box
        id="chartdiv"
        style={{
          width: "100%",
          height: `${height}px`,
          position: "relative",
          backgroundColor: "#ffffff" // White background
        }}
      />
    </Box>
  );
};

export default WorldConnection;