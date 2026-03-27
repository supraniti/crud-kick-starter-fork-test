import { createTheme } from "@mui/material/styles";

export const APP_SIDEBAR_STORAGE_KEY = "app-shell-sidebar-collapsed-v1";

export const appShellTheme = createTheme({
  shape: {
    borderRadius: 10
  },
  typography: {
    h6: {
      fontSize: "1rem",
      lineHeight: 1.25,
      fontWeight: 600
    },
    subtitle1: {
      fontSize: "0.95rem",
      lineHeight: 1.3,
      fontWeight: 600
    },
    subtitle2: {
      fontSize: "0.8rem",
      lineHeight: 1.3,
      fontWeight: 600
    },
    body2: {
      fontSize: "0.84rem",
      lineHeight: 1.45
    },
    caption: {
      fontSize: "0.74rem",
      lineHeight: 1.35
    },
    overline: {
      fontSize: "0.66rem",
      lineHeight: 1.25,
      letterSpacing: "0.08em"
    },
    button: {
      textTransform: "none",
      fontWeight: 600
    }
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          fontSize: "14px"
        }
      }
    },
    MuiButton: {
      defaultProps: {
        size: "small"
      },
      styleOverrides: {
        root: {
          minHeight: 32,
          paddingInline: 12
        }
      }
    },
    MuiIconButton: {
      defaultProps: {
        size: "small"
      }
    },
    MuiChip: {
      defaultProps: {
        size: "small"
      }
    },
    MuiTextField: {
      defaultProps: {
        size: "small",
        margin: "dense"
      }
    },
    MuiFormControl: {
      defaultProps: {
        size: "small",
        margin: "dense"
      }
    },
    MuiSelect: {
      defaultProps: {
        size: "small"
      }
    },
    MuiTable: {
      defaultProps: {
        size: "small"
      }
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          paddingTop: 8,
          paddingBottom: 8
        },
        head: {
          paddingTop: 8,
          paddingBottom: 8
        }
      }
    },
    MuiTab: {
      styleOverrides: {
        root: {
          minHeight: 38,
          paddingTop: 6,
          paddingBottom: 6
        }
      }
    },
    MuiTabs: {
      styleOverrides: {
        root: {
          minHeight: 38
        }
      }
    },
    MuiPaper: {
      styleOverrides: {
        rounded: {
          borderRadius: 10
        }
      }
    },
    MuiCardContent: {
      styleOverrides: {
        root: {
          padding: 14,
          "&:last-child": {
            paddingBottom: 14
          }
        }
      }
    },
    MuiDialogActions: {
      styleOverrides: {
        root: {
          paddingTop: 8,
          paddingBottom: 12,
          paddingInline: 16
        }
      }
    },
    MuiDialogContent: {
      styleOverrides: {
        root: {
          paddingTop: 12,
          paddingBottom: 12
        }
      }
    }
  }
});
