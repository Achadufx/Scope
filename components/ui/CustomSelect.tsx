"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";

export interface Option {
  value: string;
  label: string;
  description?: string;
}

interface CustomSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export default function CustomSelect({
  options,
  value,
  onChange,
  placeholder = "Select an option",
  disabled = false,
  className = "",
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className={`relative inline-block w-full ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between rounded-md border border-border bg-surface px-3 py-2 text-xs text-primary shadow-subtle hover:bg-background focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-all ${
          disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
        }`}
      >
        <span className="truncate">
          {selectedOption ? selectedOption.label : <span className="text-secondary">{placeholder}</span>}
        </span>
        <ChevronDown className={`h-3.5 w-3.5 text-secondary transition-transform duration-150 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-surface p-1 shadow-popover animate-in fade-in-50 zoom-in-95 duration-100 max-h-60 overflow-y-auto">
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded text-xs text-left transition-colors ${
                  isSelected
                    ? "bg-accent-light text-accent font-medium"
                    : "text-primary hover:bg-background"
                }`}
              >
                <div className="flex flex-col truncate mr-2">
                  <span className="truncate">{option.label}</span>
                  {option.description && (
                    <span className="text-[10px] text-secondary truncate">{option.description}</span>
                  )}
                </div>
                {isSelected && <Check className="h-3.5 w-3.5 text-accent flex-shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
