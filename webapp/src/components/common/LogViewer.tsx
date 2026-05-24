import {
  CheckCircle as CheckCircleIcon,
  Clear as ClearIcon,
  Close as CloseIcon,
  Download as DownloadIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  FiberManualRecord as LiveIcon,
  Refresh as RefreshIcon,
  KeyboardArrowDown as ScrollDownIcon,
  KeyboardArrowUp as ScrollUpIcon,
  Warning as WarningIcon,
} from "@mui/icons-material";
import {
  Alert,
  Badge,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Fab,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { useCallback, useEffect, useRef, useState } from "react";

interface LogEntry {
  id: string;
  timestamp: string;
  level: "INFO" | "WARNING" | "ERROR" | "DEBUG" | "CRITICAL";
  message: string;
  source: string;
  details?: string;
}

interface LogViewerProps {
  open: boolean;
  onClose: () => void;
}

const API_BASE_URL = "/api/v1";

export function LogViewer({ open, onClose }: LogViewerProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filterLevel, setFilterLevel] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [sourceFilter, setSourceFilter] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<{
    by_level: Record<string, number>;
  } | null>(null);
  const logsContainerRef = useRef<HTMLDivElement>(null);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Fetch logs from API
  const fetchLogs = useCallback(async () => {
    if (!open) return;

    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (filterLevel && filterLevel !== "ALL") {
        params.append("level", filterLevel);
      }
      if (searchTerm) {
        params.append("search", searchTerm);
      }
      if (sourceFilter) {
        params.append("source", sourceFilter);
      }
      params.append("limit", "200");

      const response = await fetch(`${API_BASE_URL}/logs?${params.toString()}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        setLogs(result.logs);
      } else {
        throw new Error(result.error || "Failed to fetch logs");
      }
    } catch (err) {
      console.error("Failed to fetch logs:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch logs");
    } finally {
      setIsLoading(false);
    }
  }, [open, filterLevel, searchTerm, sourceFilter]);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    if (!open) return;

    try {
      const response = await fetch(`${API_BASE_URL}/logs/stats`);
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setStats(result.stats);
        }
      }
    } catch (err) {
      console.error("Failed to fetch log stats:", err);
    }
  }, [open]);

  // Initialize WebSocket for real-time updates
  const initWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const clientId = `log-viewer-${Date.now()}`;
    const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${wsProtocol}//${window.location.host}/ws/logs/${clientId}`;

    try {
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log("Log WebSocket connected");
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === "log_entry") {
          setLogs((prev) => [data.data, ...prev].slice(0, 200));
        }
      };

      ws.onerror = (error) => {
        console.error("Log WebSocket error:", error);
      };

      ws.onclose = () => {
        console.log("Log WebSocket closed");
        wsRef.current = null;
      };

      wsRef.current = ws;
    } catch (err) {
      console.error("Failed to initialize WebSocket:", err);
    }
  }, []);

  // Initial fetch when dialog opens
  useEffect(() => {
    if (open) {
      fetchLogs();
      fetchStats();
      initWebSocket();
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [open, fetchLogs, fetchStats, initWebSocket]);

  // Auto-refresh interval
  useEffect(() => {
    if (open && autoRefresh) {
      refreshIntervalRef.current = setInterval(() => {
        fetchLogs();
        fetchStats();
      }, 5000); // Refresh every 5 seconds
    }

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
    };
  }, [open, autoRefresh, fetchLogs, fetchStats]);

  // Auto-scroll effect
  useEffect(() => {
    if (autoScroll && logsContainerRef.current) {
      logsContainerRef.current.scrollTop = 0; // Scroll to top since logs are newest first
    }
  }, [logs, autoScroll]);

  // Filter logs client-side for real-time filtering while typing
  const filteredLogs = logs.filter((log) => {
    const matchesLevel = filterLevel === "ALL" || log.level === filterLevel;
    const matchesSearch =
      searchTerm === "" ||
      log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.source.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.details &&
        log.details.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesSource =
      sourceFilter === "" ||
      log.source.toLowerCase().includes(sourceFilter.toLowerCase());
    return matchesLevel && matchesSearch && matchesSource;
  });

  const getLevelIcon = (level: string) => {
    switch (level) {
      case "ERROR":
      case "CRITICAL":
        return <ErrorIcon sx={{ color: "error.main" }} />;
      case "WARNING":
        return <WarningIcon sx={{ color: "warning.main" }} />;
      case "INFO":
        return <InfoIcon sx={{ color: "info.main" }} />;
      case "DEBUG":
        return <CheckCircleIcon sx={{ color: "success.main" }} />;
      default:
        return <InfoIcon sx={{ color: "grey.500" }} />;
    }
  };

  const getLevelColor = (
    level: string,
  ): "error" | "warning" | "info" | "success" | "default" => {
    switch (level) {
      case "ERROR":
      case "CRITICAL":
        return "error";
      case "WARNING":
        return "warning";
      case "INFO":
        return "info";
      case "DEBUG":
        return "success";
      default:
        return "default";
    }
  };

  const handleRefresh = async () => {
    await fetchLogs();
    await fetchStats();
  };

  const handleClearLogs = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/logs`, {
        method: "DELETE",
      });

      if (response.ok) {
        setLogs([]);
        await fetchStats();
      }
    } catch (err) {
      console.error("Failed to clear logs:", err);
      setError("Failed to clear logs");
    }
  };

  const handleExportLogs = () => {
    const logText = filteredLogs
      .map(
        (log) =>
          `[${log.timestamp}] ${log.level} [${log.source}] ${log.message}${log.details ? ` - ${log.details}` : ""}`,
      )
      .join("\n");

    const blob = new Blob([logText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gemini-tools-logs-${new Date().toISOString().split("T")[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const scrollToTop = () => {
    if (logsContainerRef.current) {
      logsContainerRef.current.scrollTop = 0;
    }
  };

  const scrollToBottom = () => {
    if (logsContainerRef.current) {
      logsContainerRef.current.scrollTop =
        logsContainerRef.current.scrollHeight;
    }
  };

  const handleScroll = () => {
    if (logsContainerRef.current) {
      const { scrollTop } = logsContainerRef.current;
      setAutoScroll(scrollTop < 50); // Auto-scroll when near top
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          height: "90vh",
          maxHeight: "90vh",
        },
      }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)",
          color: "white",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Typography variant="h6" component="div">
            🚀 Gemini Tools Log Viewer
          </Typography>
          {autoRefresh && (
            <Chip
              icon={
                <LiveIcon sx={{ fontSize: 12, color: "#4caf50 !important" }} />
              }
              label="Live"
              size="small"
              sx={{
                backgroundColor: "rgba(255,255,255,0.2)",
                color: "white",
                "& .MuiChip-icon": { color: "#4caf50" },
              }}
            />
          )}
        </Box>
        <IconButton onClick={onClose} sx={{ color: "white" }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        <Box sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
          {/* Stats */}
          {stats && (
            <Box sx={{ mb: 2, display: "flex", gap: 1, flexWrap: "wrap" }}>
              <Badge
                badgeContent={stats.by_level?.ERROR || 0}
                color="error"
                max={999}
              >
                <Chip
                  label="Errors"
                  size="small"
                  color="error"
                  variant="outlined"
                />
              </Badge>
              <Badge
                badgeContent={stats.by_level?.WARNING || 0}
                color="warning"
                max={999}
              >
                <Chip
                  label="Warnings"
                  size="small"
                  color="warning"
                  variant="outlined"
                />
              </Badge>
              <Badge
                badgeContent={stats.by_level?.INFO || 0}
                color="info"
                max={999}
              >
                <Chip
                  label="Info"
                  size="small"
                  color="info"
                  variant="outlined"
                />
              </Badge>
              <Badge
                badgeContent={stats.by_level?.DEBUG || 0}
                color="success"
                max={999}
              >
                <Chip
                  label="Debug"
                  size="small"
                  color="success"
                  variant="outlined"
                />
              </Badge>
            </Box>
          )}

          {/* Controls */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              mb: 2,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Level</InputLabel>
                <Select
                  value={filterLevel}
                  onChange={(e) => setFilterLevel(e.target.value)}
                  label="Level"
                >
                  <MenuItem value="ALL">All Levels</MenuItem>
                  <MenuItem value="ERROR">Error</MenuItem>
                  <MenuItem value="WARNING">Warning</MenuItem>
                  <MenuItem value="INFO">Info</MenuItem>
                  <MenuItem value="DEBUG">Debug</MenuItem>
                </Select>
              </FormControl>

              <TextField
                size="small"
                placeholder="Search logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                sx={{ width: 200 }}
              />

              <TextField
                size="small"
                placeholder="Source filter..."
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value)}
                sx={{ width: 150 }}
              />
            </Box>

            <Box sx={{ display: "flex", gap: 1 }}>
              <Tooltip
                title={
                  autoRefresh ? "Disable auto-refresh" : "Enable auto-refresh"
                }
              >
                <Chip
                  label={autoRefresh ? "Auto" : "Manual"}
                  onClick={() => setAutoRefresh(!autoRefresh)}
                  color={autoRefresh ? "primary" : "default"}
                  size="small"
                />
              </Tooltip>

              <Tooltip title="Refresh logs">
                <IconButton onClick={handleRefresh} disabled={isLoading}>
                  {isLoading ? <CircularProgress size={20} /> : <RefreshIcon />}
                </IconButton>
              </Tooltip>

              <Tooltip title="Export logs">
                <IconButton onClick={handleExportLogs}>
                  <DownloadIcon />
                </IconButton>
              </Tooltip>

              <Tooltip title="Clear logs">
                <IconButton onClick={handleClearLogs}>
                  <ClearIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 1 }}>
              {error}
            </Alert>
          )}

          {/* Auto-scroll indicator */}
          <Alert
            severity={autoScroll ? "info" : "warning"}
            sx={{ mb: 1 }}
            action={
              <Button
                color="inherit"
                size="small"
                onClick={() => setAutoScroll(!autoScroll)}
              >
                {autoScroll ? "Disable" : "Enable"}
              </Button>
            }
          >
            Auto-scroll is {autoScroll ? "enabled" : "disabled"}
          </Alert>
        </Box>

        {/* Logs Container */}
        <Box
          ref={logsContainerRef}
          onScroll={handleScroll}
          sx={{
            height: "calc(90vh - 280px)",
            overflowY: "auto",
            p: 2,
            backgroundColor: "grey.50",
          }}
        >
          {filteredLogs.length === 0 && !isLoading ? (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
                color: "text.secondary",
              }}
            >
              <Typography variant="h6">
                {logs.length === 0
                  ? "No logs available. Logs will appear as they are generated."
                  : "No logs found matching the current filters."}
              </Typography>
            </Box>
          ) : (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {filteredLogs.map((log) => (
                <Paper
                  key={log.id}
                  elevation={1}
                  sx={{
                    p: 2,
                    borderLeft: 4,
                    borderColor: `${getLevelColor(log.level)}.main`,
                    backgroundColor: "white",
                  }}
                >
                  <Box
                    sx={{ display: "flex", alignItems: "flex-start", gap: 2 }}
                  >
                    {getLevelIcon(log.level)}
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          mb: 1,
                        }}
                      >
                        <Box
                          sx={{ display: "flex", alignItems: "center", gap: 1 }}
                        >
                          <Chip
                            label={log.level}
                            size="small"
                            color={getLevelColor(log.level)}
                            variant="outlined"
                          />
                          <Typography variant="caption" color="text.secondary">
                            [{log.source}]
                          </Typography>
                        </Box>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(log.timestamp).toLocaleString()}
                        </Typography>
                      </Box>
                      <Typography
                        variant="body2"
                        sx={{ mb: 1, wordBreak: "break-word" }}
                      >
                        {log.message}
                      </Typography>
                      {log.details && (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{
                            fontFamily: "monospace",
                            whiteSpace: "pre-wrap",
                            display: "block",
                            backgroundColor: "grey.100",
                            p: 1,
                            borderRadius: 1,
                            maxHeight: 200,
                            overflow: "auto",
                          }}
                        >
                          {log.details}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                </Paper>
              ))}
            </Box>
          )}
        </Box>

        {/* Scroll buttons */}
        <Box
          sx={{
            position: "absolute",
            right: 16,
            bottom: 80,
            display: "flex",
            flexDirection: "column",
            gap: 1,
          }}
        >
          <Tooltip title="Scroll to top (newest)">
            <Fab size="small" onClick={scrollToTop} color="primary">
              <ScrollUpIcon />
            </Fab>
          </Tooltip>
          <Tooltip title="Scroll to bottom (oldest)">
            <Fab size="small" onClick={scrollToBottom} color="primary">
              <ScrollDownIcon />
            </Fab>
          </Tooltip>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2, borderTop: 1, borderColor: "divider" }}>
        <Typography variant="body2" color="text.secondary">
          Showing {filteredLogs.length} of {logs.length} log entries
        </Typography>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
