import type { PaletteMode } from "@mui/material";
import {
  type Theme,
  type ThemeOptions,
  createTheme,
} from "@mui/material/styles";

declare module "@mui/material/styles" {
  interface Theme {
    customShadows: {
      card: string;
      dialog: string;
      dropdown: string;
    };
  }
  interface ThemeOptions {
    customShadows?: {
      card?: string;
      dialog?: string;
      dropdown?: string;
    };
  }
}

const baseTheme: ThemeOptions = {
  typography: {
    fontFamily: [
      "Inter",
      "-apple-system",
      "BlinkMacSystemFont",
      '"Segoe UI"',
      "Roboto",
      "Helvetica",
      "Arial",
      "sans-serif",
    ].join(","),
    h1: {
      fontSize: "2.5rem",
      fontWeight: 600,
      lineHeight: 1.2,
    },
    h2: {
      fontSize: "2rem",
      fontWeight: 600,
      lineHeight: 1.3,
    },
    h3: {
      fontSize: "1.75rem",
      fontWeight: 600,
      lineHeight: 1.3,
    },
    h4: {
      fontSize: "1.5rem",
      fontWeight: 600,
      lineHeight: 1.4,
    },
    h5: {
      fontSize: "1.25rem",
      fontWeight: 600,
      lineHeight: 1.4,
    },
    h6: {
      fontSize: "1rem",
      fontWeight: 600,
      lineHeight: 1.5,
    },
    button: {
      textTransform: "none",
      fontWeight: 500,
    },
  },
  shape: {
    borderRadius: 8,
  },
  spacing: 8,
  customShadows: {
    card: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
    dialog:
      "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
    dropdown:
      "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: "8px 16px",
          boxShadow: "none",
          "&:hover": {
            boxShadow: "none",
          },
        },
        contained: {
          "&:hover": {
            boxShadow: "none",
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow:
            "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 12,
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        variant: "outlined",
        fullWidth: true,
      },
      styleOverrides: {
        root: {
          "& .MuiOutlinedInput-root": {
            borderRadius: 8,
          },
        },
      },
    },
  },
};

export const lightTheme = createTheme({
  ...baseTheme,
  palette: {
    mode: "light",
    primary: {
      main: "#1976d2",
      light: "#42a5f5",
      dark: "#1565c0",
      contrastText: "#ffffff",
    },
    secondary: {
      main: "#9c27b0",
      light: "#ba68c8",
      dark: "#7b1fa2",
      contrastText: "#ffffff",
    },
    background: {
      default: "#f5f5f5",
      paper: "#ffffff",
    },
    text: {
      primary: "rgba(0, 0, 0, 0.87)",
      secondary: "rgba(0, 0, 0, 0.6)",
      disabled: "rgba(0, 0, 0, 0.38)",
    },
    divider: "rgba(0, 0, 0, 0.12)",
  },
});

export const darkTheme = createTheme({
  ...baseTheme,
  palette: {
    mode: "dark",
    primary: {
      main: "#90caf9",
      light: "#e3f2fd",
      dark: "#42a5f5",
      contrastText: "rgba(0, 0, 0, 0.87)",
    },
    secondary: {
      main: "#ce93d8",
      light: "#f3e5f5",
      dark: "#ab47bc",
      contrastText: "rgba(0, 0, 0, 0.87)",
    },
    background: {
      default: "#121212",
      paper: "#1e1e1e",
    },
    text: {
      primary: "#ffffff",
      secondary: "rgba(255, 255, 255, 0.7)",
      disabled: "rgba(255, 255, 255, 0.5)",
    },
    divider: "rgba(255, 255, 255, 0.12)",
  },
});

export const getTheme = (mode: PaletteMode): Theme => {
  return mode === "light" ? lightTheme : darkTheme;
};

export default getTheme;
