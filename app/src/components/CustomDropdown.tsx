import { Check, ChevronDown } from 'lucide-react';
import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

export interface DropdownOption<T extends string | number> {
  value: T;
  label: string;
  description?: string;
  icon?: ReactNode;
}

interface CustomDropdownProps<T extends string | number> {
  value: T;
  onChange: (value: T) => void;
  options: readonly DropdownOption<T>[] | DropdownOption<T>[];
  ariaLabel?: string;
  className?: string;
}

/**
 * Premium Apple Music / macOS styled custom dropdown.
 * - Glassmorphism frosted popover with smooth enter animation
 * - Custom styled trigger button with chevron indicator
 * - Checkmark for selected item
 * - Full keyboard navigation (Enter, Space, ArrowUp, ArrowDown, Escape, Home, End)
 * - Click-outside and window-resize / scroll auto-close
 */
export function CustomDropdown<T extends string | number>({
  value,
  onChange,
  options,
  ariaLabel,
  className = '',
}: CustomDropdownProps<T>) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<React.CSSProperties>({ visibility: 'hidden' });
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const id = useId();

  const selectedOption = options.find((opt) => opt.value === value) ?? options[0];

  // Calculate position with collision detection (above vs below)
  useLayoutEffect(() => {
    if (!open || !buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const gap = 6;
    const estimatedHeight = Math.min(320, options.length * 36 + 12);
    const spaceBelow = window.innerHeight - rect.bottom - gap;
    const openAbove = spaceBelow < estimatedHeight && rect.top > spaceBelow;

    const width = Math.max(rect.width, 170);
    // Align to the right edge of the button if close to viewport right edge
    const right = Math.max(8, window.innerWidth - rect.right);

    if (openAbove) {
      setPosition({
        right,
        minWidth: `${width}px`,
        bottom: `${window.innerHeight - rect.top + gap}px`,
        maxHeight: `${Math.max(120, rect.top - gap * 2)}px`,
      });
    } else {
      setPosition({
        right,
        minWidth: `${width}px`,
        top: `${rect.bottom + gap}px`,
        maxHeight: `${Math.max(120, spaceBelow)}px`,
      });
    }
  }, [open, options.length]);

  // Set initial highlighted index on open
  useEffect(() => {
    if (open) {
      const idx = options.findIndex((opt) => opt.value === value);
      setHighlightedIndex(idx >= 0 ? idx : 0);
    }
  }, [open, value, options]);

  // Keyboard navigation & dismissal
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        setOpen(false);
        buttonRef.current?.focus();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightedIndex((prev) => (prev + 1) % options.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightedIndex((prev) => (prev - 1 + options.length) % options.length);
      } else if (e.key === 'Home') {
        e.preventDefault();
        setHighlightedIndex(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        setHighlightedIndex(options.length - 1);
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const opt = options[highlightedIndex];
        if (opt) {
          onChange(opt.value);
          setOpen(false);
          buttonRef.current?.focus();
        }
      } else if (e.key === 'Tab') {
        setOpen(false);
      }
    };

    const handleScroll = (e: Event) => {
      if (!menuRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', () => setOpen(false));

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [open, highlightedIndex, options, onChange]);

  return (
    <div className={`relative inline-block ${className}`}>
      {/* Trigger Button */}
      <button
        ref={buttonRef}
        type="button"
        id={`${id}-button`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((prev) => !prev);
        }}
        className="group relative flex h-8 min-w-[120px] cursor-pointer items-center justify-between gap-2.5 rounded-[8px] bg-quaternary/80 px-3 py-1.5 text-start type-body text-primary shadow-[0_1px_2px_rgba(0,0,0,0.2)] transition-all duration-150 hover:bg-quaternary hover:text-white focus-visible:ring-2 focus-visible:ring-key active:scale-[0.98]"
      >
        <span className="truncate font-medium">{selectedOption ? selectedOption.label : ''}</span>
        <ChevronDown
          size={14}
          strokeWidth={2.4}
          className={`flex-none text-secondary transition-transform duration-200 group-hover:text-primary ${
            open ? 'rotate-180 text-primary' : ''
          }`}
        />
      </button>

      {/* Popover Portal */}
      {open &&
        createPortal(
          <>
            {/* Backdrop click interceptor */}
            <div
              className="fixed inset-0 z-[calc(var(--z-contextual-menus)-1)] cursor-default"
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setOpen(false);
              }}
              aria-hidden="true"
            />

            {/* Menu Panel */}
            <div
              ref={menuRef}
              role="listbox"
              id={`${id}-menu`}
              aria-labelledby={`${id}-button`}
              style={position}
              className="fixed z-(--z-contextual-menus) animate-menu-in overflow-y-auto rounded-[12px] bg-[#1c1c1e]/95 p-1.5 shadow-[0_0_0_0.5px_rgba(255,255,255,0.12),0_12px_44px_rgba(0,0,0,0.65)] backdrop-blur-2xl [scrollbar-width:none] border border-white/10 transition-all"
            >
              <div className="flex flex-col gap-0.5">
                {options.map((option, idx) => {
                  const isSelected = option.value === value;
                  const isHighlighted = idx === highlightedIndex;

                  return (
                    <div
                      key={String(option.value)}
                      role="option"
                      aria-selected={isSelected}
                      id={`${id}-option-${idx}`}
                      onMouseEnter={() => setHighlightedIndex(idx)}
                      onClick={(e) => {
                        e.stopPropagation();
                        onChange(option.value);
                        setOpen(false);
                        buttonRef.current?.focus();
                      }}
                      className={`group relative flex min-h-[34px] cursor-pointer items-center justify-between gap-3 rounded-[8px] px-2.5 py-1.5 type-body transition-colors duration-100 ${
                        isHighlighted || isSelected
                          ? 'bg-white/15 text-white font-medium'
                          : 'text-primary/90 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        {option.icon && <span className="flex-none text-secondary">{option.icon}</span>}
                        <span className="truncate">{option.label}</span>
                      </div>

                      {/* Selected checkmark indicator */}
                      <span className="flex size-4 flex-none items-center justify-center">
                        {isSelected && <Check size={14} strokeWidth={2.8} className="text-key" />}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </>,
          document.body,
        )}
    </div>
  );
}
