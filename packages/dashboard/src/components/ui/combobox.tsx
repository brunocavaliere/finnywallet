"use client";

import * as React from "react";
import { Check, ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from "@/components/ui/command";

type ComboboxContextValue<T> = {
  items: T[];
  value: string;
  setValue: (value: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
  query: string;
  setQuery: (value: string) => void;
  getItemValue: (item: T) => string;
  getItemLabel: (item: T) => string;
};

const ComboboxContext = React.createContext<ComboboxContextValue<any> | null>(null);

function useComboboxContext<T>() {
  const context = React.useContext(ComboboxContext) as ComboboxContextValue<T> | null;
  if (!context) {
    throw new Error("Combobox components must be used inside <Combobox>.");
  }
  return context;
}

type ComboboxProps<T> = {
  items: T[];
  value?: string;
  onValueChange?: (value: string) => void;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  getItemValue?: (item: T) => string;
  getItemLabel?: (item: T) => string;
  children: React.ReactNode;
};

export function Combobox<T>({
  items,
  value,
  onValueChange,
  defaultOpen = false,
  open: controlledOpen,
  onOpenChange,
  getItemValue,
  getItemLabel,
  children
}: ComboboxProps<T>) {
  const [internalOpen, setInternalOpen] = React.useState(defaultOpen);
  const [internalValue, setInternalValue] = React.useState("");
  const [query, setQuery] = React.useState("");

  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

  const currentValue = value ?? internalValue;

  const resolveItemValue = React.useCallback(
    (item: T) => {
      if (getItemValue) return getItemValue(item);
      if (typeof item === "string") return item;
      if (item && typeof item === "object") {
        if ("value" in item && typeof (item as any).value === "string") {
          return (item as any).value;
        }
        if ("ticker" in item && typeof (item as any).ticker === "string") {
          return (item as any).ticker;
        }
      }
      return String(item ?? "");
    },
    [getItemValue]
  );

  const resolveItemLabel = React.useCallback(
    (item: T) => {
      if (getItemLabel) return getItemLabel(item);
      return resolveItemValue(item);
    },
    [getItemLabel, resolveItemValue]
  );

  const setValue = React.useCallback(
    (next: string) => {
      if (!value) {
        setInternalValue(next);
      }
      onValueChange?.(next);
      setQuery(next);
    },
    [onValueChange, value]
  );

  React.useEffect(() => {
    if (value !== undefined && value !== query) {
      setQuery(value);
    }
  }, [value, query]);

  const contextValue = React.useMemo(
    () => ({
      items,
      value: currentValue,
      setValue,
      open,
      setOpen,
      query,
      setQuery,
      getItemValue: resolveItemValue,
      getItemLabel: resolveItemLabel
    }),
    [
      items,
      currentValue,
      setValue,
      open,
      query,
      resolveItemValue,
      resolveItemLabel
    ]
  );

  return (
    <ComboboxContext.Provider value={contextValue}>
      <Popover open={open} onOpenChange={setOpen} modal={false}>
        {children}
      </Popover>
    </ComboboxContext.Provider>
  );
}

type ComboboxInputProps = React.ComponentPropsWithoutRef<typeof Input> & {
  placeholder?: string;
};

export function ComboboxInput({ className, placeholder, ...props }: ComboboxInputProps) {
  const { query, setQuery, setOpen, setValue } = useComboboxContext<any>();

  return (
    <PopoverAnchor asChild>
      <div className={cn("relative", className)}>
        <Input
          {...props}
          value={query}
          placeholder={placeholder}
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            const next = event.target.value;
            setQuery(next);
            setValue(next);
            setOpen(true);
          }}
          className={cn("pr-8", props.className)}
        />
        <ChevronDown className="pointer-events-none absolute right-2 top-2.5 h-4 w-4 text-muted-foreground" />
      </div>
    </PopoverAnchor>
  );
}

export function ComboboxContent({ children }: { children: React.ReactNode }) {
  return (
    <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
      <Command>{children}</Command>
    </PopoverContent>
  );
}

export function ComboboxEmpty({ children }: { children: React.ReactNode }) {
  return <CommandEmpty>{children}</CommandEmpty>;
}

export function ComboboxList<T>({
  children
}: {
  children: (item: T) => React.ReactNode;
}) {
  const { items } = useComboboxContext<T>();

  return (
    <CommandList>
      <CommandGroup>{items.map((item) => children(item))}</CommandGroup>
    </CommandList>
  );
}

type ComboboxItemProps<T> = {
  item: T;
  children: React.ReactNode;
  onSelect?: (item: T) => void;
};

export function ComboboxItem<T>({ item, children, onSelect }: ComboboxItemProps<T>) {
  const { value, setValue, setOpen, getItemValue } = useComboboxContext<T>();
  const itemValue = getItemValue(item);
  const isSelected = value === itemValue;

  return (
    <CommandItem
      value={itemValue}
      onSelect={() => {
        setValue(itemValue);
        onSelect?.(item);
        setOpen(false);
      }}
    >
      <Check className={cn("mr-2 h-4 w-4", isSelected ? "opacity-100" : "opacity-0")} />
      {children}
    </CommandItem>
  );
}

export { CommandInput };
