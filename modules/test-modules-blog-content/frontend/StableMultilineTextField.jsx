import { TextField } from "@mui/material";
import { memo, useCallback } from "react";

function StableMultilineTextFieldComponent({
  label,
  value,
  fieldId,
  onChangeField,
  minRows = 3
}) {
  const handleChange = useCallback(
    (event) => {
      onChangeField(fieldId, event.target.value);
    },
    [fieldId, onChangeField]
  );

  return (
    <TextField
      label={label}
      value={value}
      onChange={handleChange}
      multiline
      minRows={minRows}
    />
  );
}

function areEqual(previousProps, nextProps) {
  return (
    previousProps.label === nextProps.label &&
    previousProps.value === nextProps.value &&
    previousProps.fieldId === nextProps.fieldId &&
    previousProps.onChangeField === nextProps.onChangeField &&
    previousProps.minRows === nextProps.minRows
  );
}

export const StableMultilineTextField = memo(StableMultilineTextFieldComponent, areEqual);
