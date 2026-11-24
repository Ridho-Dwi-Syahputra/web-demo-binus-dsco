"use client";

import * as Select from "@radix-ui/react-select";

export default function FilterSelect({ name, label, initialValue, options }) {
  return (
    <div className="filter-select">
      <span id={`label-${name}`} className="filter-label">{label}</span>
      <Select.Root name={name} defaultValue={String(initialValue || "__all__")}>
        <Select.Trigger className="filter-select-trigger" aria-labelledby={`label-${name}`}>
          <Select.Value />
          <Select.Icon aria-hidden="true">⌄</Select.Icon>
        </Select.Trigger>
        <Select.Portal>
          <Select.Content className="filter-select-content" position="popper" sideOffset={5}>
            <Select.Viewport className="filter-select-viewport">
              {options.map(([value, text]) => (
                <Select.Item className="filter-select-item" key={value || "__all__"} value={String(value || "__all__")}>
                  <Select.ItemText>{text}</Select.ItemText>
                  <Select.ItemIndicator className="filter-select-check">✓</Select.ItemIndicator>
                </Select.Item>
              ))}
            </Select.Viewport>
          </Select.Content>
        </Select.Portal>
      </Select.Root>
    </div>
  );
}
