"use client";

import { useEffect, useRef } from "react";
import TomSelect from "tom-select";

type TomSelectOption = {
  value: string;
  label: string;
};

type TomSelectInputProps = {
  options: TomSelectOption[];
  value: string | string[];
  onChange: (value: string | string[]) => void;
  placeholder?: string;
  required?: boolean;
  isMulti?: boolean;
  appearance?: "default" | "bounded";
  allowCreate?: boolean;
};

export function TomSelectInput({
  options,
  value,
  onChange,
  placeholder = "Select option",
  required = false,
  isMulti = false,
  appearance = "default",
  allowCreate = false,
}: TomSelectInputProps) {
  const selectRef = useRef<HTMLSelectElement | null>(null);
  const instanceRef = useRef<TomSelect | null>(null);
  const onChangeRef = useRef(onChange);
  const valueRef = useRef(value);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useEffect(() => {
    if (!selectRef.current) {
      return;
    }

    const instance = new TomSelect(selectRef.current, {
      create: allowCreate,
      allowEmptyOption: true,
      maxOptions: 500,
      plugins: isMulti ? ["remove_button"] : [],
      maxItems: isMulti ? null : 1,
      placeholder,
      onChange: () => {
        const nextValue = instance.getValue();
        if (Array.isArray(nextValue)) {
          onChangeRef.current(nextValue.map((item) => String(item)));
          return;
        }

        onChangeRef.current(String(nextValue || ""));
      },
    });

    instanceRef.current = instance;
    instance.wrapper.classList.add("ts-wrapper-ready");
    instance.wrapper.classList.add(`ts-appearance-${appearance}`);
    instance.dropdown.classList.add(`ts-appearance-${appearance}`);

    if (Array.isArray(valueRef.current)) {
      if (valueRef.current.length > 0) {
        instance.setValue(valueRef.current, true);
      }
    } else if (valueRef.current) {
      instance.setValue(valueRef.current, true);
    }

    return () => {
      instance.destroy();
      instanceRef.current = null;
    };
  }, [allowCreate, appearance, isMulti, placeholder]);

  useEffect(() => {
    const instance = instanceRef.current;
    if (!instance) {
      return;
    }

    const current = instance.getValue();

    if (Array.isArray(value)) {
      const currentValues = Array.isArray(current) ? current.map((item) => String(item)).sort() : [];
      const nextValues = value.map((item) => String(item)).sort();
      if (currentValues.join("|") === nextValues.join("|")) {
        return;
      }

      instance.clear(true);
      if (nextValues.length > 0) {
        instance.setValue(nextValues, true);
      }
      return;
    }

    const normalizedCurrent = Array.isArray(current) ? current[0] ?? "" : String(current || "");
    if (normalizedCurrent === value) {
      return;
    }

    if (!value) {
      instance.clear(true);
      return;
    }

    instance.setValue(value, true);
  }, [value]);

  return (
    <select
      ref={selectRef}
      defaultValue={Array.isArray(value) ? value : value || ""}
      required={required}
      multiple={isMulti}
      className="tomselect-input h-11 w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text)]"
    >
      {!isMulti ? <option value="">{placeholder}</option> : null}
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
