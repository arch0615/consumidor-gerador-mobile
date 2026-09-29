import { useController, type Control, type FieldPath, type FieldValues } from "react-hook-form";
import { View } from "react-native";
import { useTheme } from "@/theme";
import { ACVELCheckbox, type ACVELCheckboxProps } from "../common/ACVELCheckbox";
import { ACVELInput, type ACVELInputProps } from "../common/ACVELInput";
import { ACVELSelect, type ACVELSelectProps } from "../common/ACVELSelect";
import { AppText } from "../common/AppText";
import { SegmentedControl, type SegmentedControlProps } from "../common/SegmentedControl";
import { FormFieldAnchor } from "./FormScroll";

interface ControlledProps<T extends FieldValues, N extends FieldPath<T>> {
  // Any parsed output type: schemas may transform values (e.g. "240" → 240).
  control: Control<T, unknown, FieldValues>;
  name: N;
}

export interface FormInputProps<T extends FieldValues, N extends FieldPath<T>>
  extends ControlledProps<T, N>,
    Omit<ACVELInputProps, "value" | "onChangeText" | "error" | "ref"> {
  /** Display mask applied while typing (e.g. formatCpf). Schemas strip it. */
  mask?: (text: string) => string;
}

/** ACVELInput bound to React Hook Form, registered for scroll-to-error. */
export function FormInput<T extends FieldValues, N extends FieldPath<T>>({ control, name, mask, onBlur, ...inputProps }: FormInputProps<T, N>) {
  const {
    field: { ref: registerInput, value: fieldValue, onChange, onBlur: markTouched },
    fieldState
  } = useController({ control, name });
  const value = typeof fieldValue === "string" ? fieldValue : fieldValue == null ? "" : String(fieldValue);
  return (
    <FormFieldAnchor name={name}>
      <ACVELInput
        {...inputProps}
        ref={registerInput}
        value={value}
        onChangeText={(text) => onChange(mask ? mask(text) : text)}
        onBlur={(event) => {
          markTouched();
          onBlur?.(event);
        }}
        error={fieldState.error?.message}
      />
    </FormFieldAnchor>
  );
}

export interface FormSelectProps<T extends FieldValues, N extends FieldPath<T>, V extends string>
  extends ControlledProps<T, N>,
    Omit<ACVELSelectProps<V>, "value" | "onChange" | "error"> {}

export function FormSelect<T extends FieldValues, N extends FieldPath<T>, V extends string>({ control, name, options, ...selectProps }: FormSelectProps<T, N, V>) {
  const { field, fieldState } = useController({ control, name });
  const selected = options.find((option) => option.value === field.value)?.value ?? null;
  return (
    <FormFieldAnchor name={name}>
      <ACVELSelect
        {...selectProps}
        options={options}
        value={selected}
        onChange={(next) => {
          field.onChange(next);
          field.onBlur();
        }}
        error={fieldState.error?.message}
      />
    </FormFieldAnchor>
  );
}

export interface FormCheckboxProps<T extends FieldValues, N extends FieldPath<T>> extends ControlledProps<T, N>, Omit<ACVELCheckboxProps, "checked" | "onChange" | "error"> {}

export function FormCheckbox<T extends FieldValues, N extends FieldPath<T>>({ control, name, ...checkboxProps }: FormCheckboxProps<T, N>) {
  const { field, fieldState } = useController({ control, name });
  return (
    <FormFieldAnchor name={name}>
      <ACVELCheckbox {...checkboxProps} checked={field.value === true} onChange={field.onChange} error={fieldState.error?.message} />
    </FormFieldAnchor>
  );
}

export interface FormSegmentedProps<T extends FieldValues, N extends FieldPath<T>, V extends string> extends ControlledProps<T, N>, Omit<SegmentedControlProps<V>, "value" | "onChange"> {
  label: string;
}

export function FormSegmented<T extends FieldValues, N extends FieldPath<T>, V extends string>({ control, name, label, segments, accessibilityLabel }: FormSegmentedProps<T, N, V>) {
  const { field } = useController({ control, name });
  const theme = useTheme();
  const value = segments.find((segment) => segment.value === field.value)?.value ?? segments[0]?.value;
  if (value === undefined) return null;
  return (
    <FormFieldAnchor name={name}>
      <View style={{ gap: theme.spacing.xxs }}>
        <AppText variant="subheadStrong">{label}</AppText>
        <SegmentedControl segments={segments} value={value} onChange={field.onChange} accessibilityLabel={accessibilityLabel} />
      </View>
    </FormFieldAnchor>
  );
}
