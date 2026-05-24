import {
  AutoAwesome as OmniIcon,
  Brightness4,
  Brightness7,
  Chat as ChatIcon,
  Favorite as FavoriteIcon,
  Help as HelpIcon,
  Image as ImageIcon,
  GraphicEq as LiveIcon,
  List as LogIcon,
  Menu as MenuIcon,
  Mic as MicIcon,
  MusicNote as MusicIcon,
  Person as PersonIcon,
  Settings as SettingsIcon,
  Movie as VideoIcon,
} from "@mui/icons-material";
import {
  AppBar,
  Box,
  Container,
  CssBaseline,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ThemeProvider,
  Toolbar,
  Tooltip,
  Typography,
  createTheme,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import React, { useState } from "react";
import {
  Route,
  BrowserRouter as Router,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";

import { LogViewer } from "./components/common/LogViewer";
// Import components
import ChatInterface from "./features/chat/ChatInterface";
import Help from "./features/help/Help";
import ImageGenerator from "./features/image/ImageGenerator";
import GeminiLive from "./features/live/GeminiLive";
import { MoviePipeline } from "./features/movie-pipeline/MoviePipeline";
import MusicGenerator from "./features/music/MusicGenerator";
import OmniGenerator from "./features/omni/OmniGenerator";
import RomanceNovelGenerator from "./features/romance-novel/RomanceNovelGenerator";
import Settings from "./features/settings/Settings";
import Speech from "./features/speech/Speech";
import VideoGenerator from "./features/video/VideoGenerator";

// Theme context
const ColorModeContext = React.createContext({ toggleColorMode: () => {} });

// Main App Component
const AppContent = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [logViewerOpen, setLogViewerOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const colorMode = React.useContext(ColorModeContext);

  const drawerWidth = 280;

  const menuItems = [
    {
      text: "Text Chat",
      icon: <ChatIcon />,
      path: "/chat",
      description: "AI conversation with Gemini",
    },
    {
      text: "Speech",
      icon: <MicIcon />,
      path: "/speech",
      description: "Gemini TTS (text-to-speech)",
    },
    {
      text: "Gemini Live",
      icon: <LiveIcon />,
      path: "/live",
      description: "Streaming Live API (WebSocket)",
    },
    {
      text: "Image Generation",
      icon: <ImageIcon />,
      path: "/image",
      description: "Nano Banana 2 / Gemini image",
    },
		{
			text: "Gemini Omni",
			icon: <OmniIcon />,
			path: "/omni",
			description: "Any-to-any multimodal video (Omni Flash)",
		},
		{
			text: "Music Generation",
      icon: <MusicIcon />,
      path: "/music",
      description: "Generate music with Lyria",
    },
    {
      text: "Video Generation",
      icon: <VideoIcon />,
      path: "/video",
      description: "Create videos with Veo",
    },
    {
      text: "Make a Movie",
      icon: <VideoIcon />,
      path: "/movie",
      description: "Create movies with AI pipeline",
    },
    {
      text: "Romance Novel",
      icon: <FavoriteIcon />,
      path: "/romance",
      description: "Generate steamy romance novels",
    },
  ];

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const drawer = (
    <Box sx={{ overflow: "auto", mt: 1 }}>
      <List>
        {menuItems.map((item) => (
          <ListItem
            button
            key={item.text}
            onClick={() => {
              navigate(item.path);
              if (isMobile) setMobileOpen(false);
            }}
            selected={location.pathname === item.path}
            sx={{
              mb: 1,
              mx: 1,
              borderRadius: 2,
              "&.Mui-selected": {
                backgroundColor: theme.palette.primary.main + "20",
                "&:hover": {
                  backgroundColor: theme.palette.primary.main + "30",
                },
              },
            }}
          >
            <ListItemIcon sx={{ color: "inherit", minWidth: 40 }}>
              {item.icon}
            </ListItemIcon>
            <ListItemText
              primary={item.text}
              secondary={item.description}
              primaryTypographyProps={{ fontWeight: 500 }}
              secondaryTypographyProps={{ fontSize: "0.75rem" }}
            />
          </ListItem>
        ))}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      {/* App Bar */}
      <AppBar
        position="fixed"
        sx={{
          zIndex: theme.zIndex.drawer + 1,
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
          background:
            theme.palette.mode === "dark"
              ? "linear-gradient(45deg, #1a1a1a 30%, #2d2d2d 90%)"
              : "linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)",
          boxShadow: "0 3px 5px 2px rgba(33, 203, 243, .3)",
        }}
      >
        <Toolbar>
          {isMobile && (
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
          )}

          <Typography
            variant="h6"
            component="div"
            sx={{ flexGrow: 1, fontWeight: 600 }}
          >
						🚀 Google AI MCP
          </Typography>

          {import.meta.env.REACT_APP_BUILD_TIME && (
            <Typography
              variant="caption"
              sx={{
                mr: 2,
                opacity: 0.8,
                display: { xs: "none", sm: "block" },
              }}
            >
              Built: {import.meta.env.REACT_APP_BUILD_TIME}
            </Typography>
          )}

          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Tooltip title="View Logs">
              <IconButton
                color="inherit"
                onClick={() => setLogViewerOpen(true)}
              >
                <LogIcon />
              </IconButton>
            </Tooltip>

            <Tooltip title="Help">
              <IconButton color="inherit" onClick={() => navigate("/help")}>
                <HelpIcon />
              </IconButton>
            </Tooltip>

            <Tooltip title="Settings">
              <IconButton color="inherit" onClick={() => navigate("/settings")}>
                <SettingsIcon />
              </IconButton>
            </Tooltip>

            <Tooltip title="Toggle theme">
              <IconButton color="inherit" onClick={colorMode.toggleColorMode}>
                {theme.palette.mode === "dark" ? (
                  <Brightness7 />
                ) : (
                  <Brightness4 />
                )}
              </IconButton>
            </Tooltip>

            <Tooltip title="User Profile">
              <IconButton color="inherit">
                <PersonIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Sidebar */}
      <Box
        component="nav"
        sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
      >
        {/* Desktop drawer */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: "none", md: "block" },
            "& .MuiDrawer-paper": {
              boxSizing: "border-box",
              width: drawerWidth,
              borderRight: "none",
              background: theme.palette.background.paper,
              top: { xs: "56px", sm: "64px" }, // Match AppBar height
              height: { xs: "calc(100% - 56px)", sm: "calc(100% - 64px)" },
            },
          }}
          open
        >
          {drawer}
        </Drawer>

        {/* Mobile drawer */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: "block", md: "none" },
            "& .MuiDrawer-paper": {
              boxSizing: "border-box",
              width: drawerWidth,
              borderRight: "none",
              background: theme.palette.background.paper,
            },
          }}
        >
          {drawer}
        </Drawer>
      </Box>

      {/* Main content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { md: `calc(100% - ${drawerWidth}px)` },
          pt: { xs: "56px", sm: "64px" }, // Use padding-top instead of margin-top, responsive to Toolbar height
          minHeight: "100vh",
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          background: theme.palette.background.default,
        }}
      >
        <Container
          maxWidth={false}
          sx={{
            py: 3,
            px: { xs: 2, md: 3 },
            height: "100%",
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
          }}
        >
          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <Routes>
              <Route path="/" element={<ChatInterface />} />
              <Route path="/chat" element={<ChatInterface />} />
              <Route path="/speech" element={<Speech />} />
              <Route path="/live" element={<GeminiLive />} />
							<Route path="/image" element={<ImageGenerator />} />
							<Route path="/omni" element={<OmniGenerator />} />
							<Route path="/music" element={<MusicGenerator />} />
              <Route path="/video" element={<VideoGenerator />} />
              <Route path="/movie" element={<MoviePipeline />} />
              <Route path="/romance" element={<RomanceNovelGenerator />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/help" element={<Help />} />
            </Routes>
          </Box>
        </Container>
      </Box>

      {/* Log Viewer */}
      <LogViewer open={logViewerOpen} onClose={() => setLogViewerOpen(false)} />
    </Box>
  );
};

// Main App with theme provider
const App = () => {
  const [mode, setMode] = useState<"light" | "dark">("light");

  const colorMode = React.useMemo(
    () => ({
      toggleColorMode: () => {
        setMode((prevMode) => (prevMode === "light" ? "dark" : "light"));
      },
    }),
    [],
  );

  const theme = React.useMemo(
    () =>
      createTheme({
        palette: {
          mode,
          primary: {
            main: "#2196F3",
          },
          secondary: {
            main: "#21CBF3",
          },
          background: {
            default: mode === "light" ? "#f5f5f5" : "#121212",
            paper: mode === "light" ? "#ffffff" : "#1e1e1e",
          },
        },
        typography: {
          fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
          h4: {
            fontWeight: 600,
          },
          h6: {
            fontWeight: 600,
          },
        },
        shape: {
          borderRadius: 12,
        },
        components: {
          MuiCard: {
            styleOverrides: {
              root: {
                boxShadow:
                  mode === "light"
                    ? "0 2px 8px rgba(0,0,0,0.1)"
                    : "0 2px 8px rgba(0,0,0,0.3)",
              },
            },
          },
          MuiButton: {
            styleOverrides: {
              root: {
                textTransform: "none",
                fontWeight: 600,
              },
            },
          },
        },
      }),
    [mode],
  );

  return (
    <ColorModeContext.Provider value={colorMode}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Router>
          <AppContent />
        </Router>
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
};

export default App;
