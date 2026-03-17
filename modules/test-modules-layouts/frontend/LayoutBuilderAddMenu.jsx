import { ButtonBase, Divider, Menu, MenuItem, Stack, Tooltip, Typography } from "@mui/material";
import { Fragment, useState } from "react";

function MenuSectionLabel({ children }) {
  return (
    <Typography
      variant="caption"
      sx={{
        px: 2,
        py: 0.75,
        display: "block",
        color: "text.secondary",
        fontWeight: 700,
        letterSpacing: "0.06em",
        textTransform: "uppercase"
      }}
    >
      {children}
    </Typography>
  );
}

function TriggerButton({ ariaLabel, title, tone, children, onClick }) {
  const backgroundColor = tone === "primary"
    ? "rgba(37,99,235,0.12)"
    : "rgba(255,255,255,0.96)";
  const color = tone === "primary" ? "primary.main" : "text.secondary";

  return (
    <Tooltip title={title}>
      <ButtonBase
        aria-label={ariaLabel}
        onClick={(event) => {
          event.stopPropagation();
          onClick(event);
        }}
        sx={{
          minWidth: 0,
          height: 30,
          px: 1.25,
          borderRadius: 999,
          border: "1px solid rgba(15,23,42,0.08)",
          backgroundColor,
          color,
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          whiteSpace: "nowrap"
        }}
      >
        {children}
      </ButtonBase>
    </Tooltip>
  );
}

export function LayoutBuilderAddMenu({
  ariaLabel = "Add section",
  title = "Add section",
  tone = "primary",
  triggerLabel = "+",
  layoutPresets = [],
  blockTypes = [],
  onAddLayoutPreset,
  onAddBlockType
}) {
  const [anchorElement, setAnchorElement] = useState(null);
  const menuOpen = Boolean(anchorElement);

  return (
    <Fragment>
      <TriggerButton
        ariaLabel={ariaLabel}
        title={title}
        tone={tone}
        onClick={(event) => setAnchorElement(event.currentTarget)}
      >
        {triggerLabel}
      </TriggerButton>
      <Menu
        anchorEl={anchorElement}
        open={menuOpen}
        onClose={() => setAnchorElement(null)}
      >
        <MenuSectionLabel>Layouts</MenuSectionLabel>
        {layoutPresets.map((preset) => (
          <MenuItem
            key={preset.id}
            onClick={() => {
              setAnchorElement(null);
              onAddLayoutPreset?.(preset.id);
            }}
          >
            <Stack spacing={0.1}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {preset.label}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {preset.description}
              </Typography>
            </Stack>
          </MenuItem>
        ))}
        <Divider />
        <MenuSectionLabel>Blocks</MenuSectionLabel>
        {blockTypes.map((blockType) => (
          <MenuItem
            key={blockType.id}
            onClick={() => {
              setAnchorElement(null);
              onAddBlockType?.(blockType.id);
            }}
          >
            <Stack spacing={0.1}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {blockType.label}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {blockType.description}
              </Typography>
            </Stack>
          </MenuItem>
        ))}
      </Menu>
    </Fragment>
  );
}
