"use client";

import React, {
  useState,
  useMemo,
  useRef,
  useEffect,
  useLayoutEffect,
  useCallback,
} from "react";
import { createPortal } from "react-dom";
import { Search, X } from "lucide-react";
import {
  createHangulMatcher,
  CHOSUNG_FILTER_LIST,
  matchesChosungFilter,
} from "@/lib/hangulSearch";

export type SearchSelectBadgeColor =
  | "emerald"
  | "amber"
  | "blue"
  | "rose"
  | "slate"
  | (string & {});

export interface SearchSelectOption {
  value: string;
  label: string;
  subLabel?: string;
  badgeText?: string;
  badgeColor?: SearchSelectBadgeColor;
  searchKeywords?: string | Array<string | number | null | undefined>;
  disabled?: boolean;
}

export interface SearchSelectComboboxProps {
  options: SearchSelectOption[];
  value: string;
  onChange: (nextValue: string, option?: SearchSelectOption) => void;
  label?: React.ReactNode;
  required?: boolean;
  headerRight?: React.ReactNode;
  showSelectedIndicator?: boolean;
  selectedIndicatorText?: string;
  placeholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  clearable?: boolean;
  allowFreeText?: boolean;
  freeTextValue?: string;
  onFreeTextChange?: (nextText: string) => void;
  onFreeTextEnter?: (currentText: string) => void;
  showChosungBar?: boolean;
  size?: "xs" | "sm" | "md";
  maxRenderedOptions?: number;
  controlHeight?: string;
  fontSize?: string;
  className?: string;
  inputClassName?: string;
  id?: string;
  containerStyle?: React.CSSProperties;
  inputStyle?: React.CSSProperties;
}

const NON_SELECTION_SENTINELS = new Set(["", "ALL"]);

function resolveBadgeTextColor(
  badgeColor: SearchSelectBadgeColor | undefined,
  themeMode: "light" | "white" | "dark"
): string {
  switch (badgeColor) {
    case "emerald":
      return themeMode === "dark" ? "#34d399" : "#047857";
    case "amber":
      return themeMode === "dark" ? "#fbbf24" : "#b45309";
    case "blue":
      return themeMode === "dark" ? "#60a5fa" : "#1d4ed8";
    case "rose":
      return themeMode === "dark" ? "#fb7185" : "#dc2626";
    case "slate":
      return themeMode === "dark" ? "#94a3b8" : "#475569";
    default:
      if (badgeColor) return badgeColor;
      return themeMode === "dark" ? "#60a5fa" : "#1d4ed8";
  }
}

export const SearchSelectCombobox: React.FC<SearchSelectComboboxProps> = ({
  options,
  value,
  onChange,
  label,
  required = false,
  headerRight,
  showSelectedIndicator = true,
  selectedIndicatorText = "선택됨",
  placeholder = "명칭 / 초성 입력",
  emptyMessage = "일치 항목 없음",
  disabled = false,
  clearable = true,
  allowFreeText = false,
  freeTextValue,
  onFreeTextChange,
  onFreeTextEnter,
  showChosungBar,
  size = "sm",
  maxRenderedOptions = 100,
  controlHeight,
  fontSize = "12px",
  className = "",
  inputClassName = "",
  id,
  containerStyle,
  inputStyle,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const inputWrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = useMemo(
    () => (value ? options.find((opt) => opt.value === value) : undefined),
    [options, value]
  );
  const selectedLabel = selectedOption?.label ?? "";

  const [query, setQuery] = useState<string>(() => {
    if (allowFreeText && freeTextValue !== undefined) return freeTextValue;
    if (selectedLabel) return selectedLabel;
    return "";
  });
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [chosungFilter, setChosungFilter] = useState<string>("전체");
  const [highlightedIdx, setHighlightedIdx] = useState<number>(() =>
    allowFreeText ? -1 : 0
  );
  const [portalStyle, setPortalStyle] = useState<React.CSSProperties>({});
  const [portalTheme, setPortalTheme] = useState<"light" | "white" | "dark">(
    "light"
  );

  const resolvedHeight =
    controlHeight || (size === "xs" ? "28px" : size === "md" ? "36px" : "32px");

  // Synchronize display query when external value / freeTextValue changes
  useEffect(() => {
    if (allowFreeText) {
      if (freeTextValue !== undefined) {
        setQuery(freeTextValue);
      } else if (selectedLabel) {
        setQuery(selectedLabel);
      } else if (!value) {
        setQuery("");
      }
      return;
    }

    if (selectedLabel) {
      setQuery(selectedLabel);
    } else if (!value) {
      setQuery("");
    }
  }, [value, selectedLabel, allowFreeText, freeTextValue]);

  const updateDropdownPosition = useCallback(() => {
    const anchor = inputWrapperRef.current;
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    const viewportH = window.innerHeight || document.documentElement.clientHeight;
    const viewportW = window.innerWidth || document.documentElement.clientWidth;
    const spaceBelow = viewportH - rect.bottom - 8;
    const spaceAbove = rect.top - 8;
    const openUpward = spaceBelow < 200 && spaceAbove > spaceBelow;
    const availableMaxH = Math.max(
      140,
      Math.min(280, openUpward ? spaceAbove - 4 : spaceBelow - 4)
    );
    const width = Math.max(rect.width, 220);
    const left = Math.max(8, Math.min(rect.left, viewportW - width - 8));

    const closestThemed = anchor.closest("[data-theme]") as HTMLElement | null;
    const themeAttr = closestThemed?.getAttribute("data-theme");
    const isRootDark = document.documentElement.classList.contains("dark");
    const resolvedTheme: "light" | "white" | "dark" =
      themeAttr === "white"
        ? "white"
        : themeAttr === "light"
        ? "light"
        : isRootDark
        ? "dark"
        : "light";
    setPortalTheme(resolvedTheme);

    if (openUpward) {
      setPortalStyle({
        position: "fixed",
        left: `${left}px`,
        width: `${width}px`,
        bottom: `${viewportH - rect.top + 4}px`,
        maxHeight: `${availableMaxH}px`,
      });
    } else {
      setPortalStyle({
        position: "fixed",
        left: `${left}px`,
        width: `${width}px`,
        top: `${rect.bottom + 4}px`,
        maxHeight: `${availableMaxH}px`,
      });
    }
  }, []);

  useLayoutEffect(() => {
    if (!isOpen || disabled) return;
    updateDropdownPosition();
    const handleScrollOrResize = (ev: Event) => {
      if (
        dropdownRef.current &&
        ev.target instanceof Node &&
        dropdownRef.current.contains(ev.target)
      ) {
        return;
      }
      updateDropdownPosition();
    };
    window.addEventListener("resize", handleScrollOrResize);
    window.addEventListener("scroll", handleScrollOrResize, true);
    return () => {
      window.removeEventListener("resize", handleScrollOrResize);
      window.removeEventListener("scroll", handleScrollOrResize, true);
    };
  }, [isOpen, disabled, updateDropdownPosition]);

  // Outside click closes dropdown & restores confirmed label in strict select mode
  useEffect(() => {
    if (!isOpen) return;
    const handleOutsideMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        (containerRef.current && containerRef.current.contains(target)) ||
        (dropdownRef.current && dropdownRef.current.contains(target))
      ) {
        return;
      }
      setIsOpen(false);
      setChosungFilter("전체");
      if (!allowFreeText) {
        setQuery(selectedLabel || "");
      }
    };
    document.addEventListener("mousedown", handleOutsideMouseDown);
    return () => document.removeEventListener("mousedown", handleOutsideMouseDown);
  }, [isOpen, allowFreeText, selectedLabel]);

  const filteredOptions = useMemo(() => {
    const trimmed = query.trim();
    const effectiveQuery =
      selectedOption && trimmed === selectedOption.label.trim() ? "" : trimmed;

    const byChosung =
      chosungFilter && chosungFilter !== "전체"
        ? options.filter((opt) => matchesChosungFilter(opt.label, chosungFilter))
        : options;

    if (!effectiveQuery) return byChosung;

    const matcher = createHangulMatcher(effectiveQuery);
    return byChosung.filter((opt) => {
      const extraKeywords = Array.isArray(opt.searchKeywords)
        ? opt.searchKeywords.filter(Boolean).map(String)
        : opt.searchKeywords
        ? [String(opt.searchKeywords)]
        : [];
      return matcher.testAny([
        opt.label,
        opt.subLabel,
        opt.badgeText,
        ...extraKeywords,
      ]);
    });
  }, [options, query, selectedOption, chosungFilter]);

  const visibleOptions = useMemo(
    () => filteredOptions.slice(0, maxRenderedOptions),
    [filteredOptions, maxRenderedOptions]
  );

  const shouldRenderChosungBar =
    showChosungBar !== undefined ? showChosungBar : options.length >= 8;

  const handleSelectOption = (opt: SearchSelectOption) => {
    if (opt.disabled) return;
    setQuery(opt.label);
    setIsOpen(false);
    setChosungFilter("전체");
    onChange(opt.value, opt);
    if (
      allowFreeText &&
      onFreeTextChange &&
      onFreeTextChange !== (onChange as unknown)
    ) {
      onFreeTextChange(opt.label);
    }
  };

  const handleClear = () => {
    if (disabled) return;
    setQuery("");
    setChosungFilter("전체");
    if (allowFreeText && onFreeTextChange) {
      onFreeTextChange("");
    }
    onChange("", undefined);
    setIsOpen(true);
    setHighlightedIdx(allowFreeText ? -1 : 0);
    inputRef.current?.focus();
  };

  const isMeaningfulSelection =
    Boolean(value && selectedOption && !NON_SELECTION_SENTINELS.has(value)) ||
    Boolean(allowFreeText && (freeTextValue || "").trim());

  const showClearBtn =
    clearable &&
    !disabled &&
    Boolean(query) &&
    !(
      selectedOption &&
      NON_SELECTION_SENTINELS.has(value) &&
      query === selectedOption.label
    );

  // Palette per theme: in 'light' Warm Cotton Paper, NEVER use #ffffff background
  const palette =
    portalTheme === "dark"
      ? {
          bg: "#0f172a",
          headerBg: "#1e293b",
          hoverBg: "#1e293b",
          selectedBg: "rgba(37, 99, 235, 0.25)",
          border: "#334155",
          rowBorder: "rgba(51, 65, 85, 0.7)",
          text: "#f8fafc",
          subText: "#94a3b8",
          chipBg: "#1e293b",
          chipActiveBg: "#2563eb",
          chipActiveText: "#ffffff",
          chipText: "#cbd5e1",
        }
      : portalTheme === "white"
      ? {
          bg: "#ffffff",
          headerBg: "#f8fafc",
          hoverBg: "#f1f5f9",
          selectedBg: "#dbeafe",
          border: "#cbd5e1",
          rowBorder: "#e2e8f0",
          text: "#0f172a",
          subText: "#475569",
          chipBg: "#f1f5f9",
          chipActiveBg: "#1d4ed8",
          chipActiveText: "#ffffff",
          chipText: "#334155",
        }
      : {
          bg: "#f4efe4",
          headerBg: "#e2dbcd",
          hoverBg: "#ebe5d8",
          selectedBg: "#dbeafe",
          border: "#b5a894",
          rowBorder: "#d0c6b4",
          text: "#0f172a",
          subText: "#475569",
          chipBg: "#ebe5d8",
          chipActiveBg: "#1d4ed8",
          chipActiveText: "#ffffff",
          chipText: "#334155",
        };

  const dropdownElement =
    isOpen && !disabled && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={dropdownRef}
            data-theme={portalTheme}
            style={{
              ...portalStyle,
              display: "flex",
              flexDirection: "column",
              backgroundColor: palette.bg,
              color: palette.text,
              border: `1.5px solid ${palette.border}`,
              borderRadius: "6px",
              boxShadow:
                portalTheme === "light"
                  ? "none"
                  : "0 10px 24px rgba(0, 0, 0, 0.22)",
              zIndex: 20000,
              overflow: "hidden",
            }}
          >
            {shouldRenderChosungBar && (
              <div
                onMouseDown={(e) => e.preventDefault()}
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "3px",
                  padding: "5px 6px",
                  backgroundColor: palette.headerBg,
                  borderBottom: `1px solid ${palette.border}`,
                  flexShrink: 0,
                }}
              >
                {CHOSUNG_FILTER_LIST.map((ch) => {
                  const active = chosungFilter === ch;
                  return (
                    <button
                      key={ch}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setChosungFilter(
                          active && ch !== "전체" ? "전체" : ch
                        );
                        setHighlightedIdx(0);
                      }}
                      style={{
                        padding: "2px 6px",
                        borderRadius: "4px",
                        fontSize: "10.5px",
                        fontWeight: active ? 700 : 600,
                        whiteSpace: "nowrap",
                        flexShrink: 0,
                        cursor: "pointer",
                        backgroundColor: active
                          ? palette.chipActiveBg
                          : palette.chipBg,
                        color: active
                          ? palette.chipActiveText
                          : palette.chipText,
                        border: `1px solid ${
                          active ? palette.chipActiveBg : palette.border
                        }`,
                        lineHeight: 1.2,
                      }}
                    >
                      {ch}
                    </button>
                  );
                })}
              </div>
            )}

            <div style={{ overflowY: "auto", flex: 1 }}>
              {visibleOptions.length === 0 ? (
                <div
                  style={{
                    padding: "10px 12px",
                    fontSize: "12px",
                    color: palette.subText,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "8px",
                  }}
                >
                  <span style={{ whiteSpace: "nowrap" }}>{emptyMessage}</span>
                  {allowFreeText && query.trim() && (
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setIsOpen(false);
                        if (onFreeTextEnter) {
                          onFreeTextEnter(query.trim());
                        }
                      }}
                      style={{
                        padding: "3px 8px",
                        borderRadius: "4px",
                        fontSize: "11px",
                        fontWeight: 700,
                        backgroundColor: palette.chipActiveBg,
                        color: palette.chipActiveText,
                        border: "none",
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                        flexShrink: 0,
                      }}
                    >
                      직접 입력 적용
                    </button>
                  )}
                </div>
              ) : (
                visibleOptions.map((opt, idx) => {
                  const isSelected = value === opt.value && Boolean(value);
                  const isHighlighted = idx === highlightedIdx;
                  return (
                    <div
                      key={`${opt.value}-${idx}`}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleSelectOption(opt);
                      }}
                      onMouseEnter={() => setHighlightedIdx(idx)}
                      style={{
                        padding: "6px 10px",
                        fontSize: "12px",
                        cursor: opt.disabled ? "not-allowed" : "pointer",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: "8px",
                        opacity: opt.disabled ? 0.5 : 1,
                        backgroundColor: isSelected
                          ? palette.selectedBg
                          : isHighlighted
                          ? palette.hoverBg
                          : "transparent",
                        borderBottom: `1px solid ${palette.rowBorder}`,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "1px",
                          minWidth: 0,
                          flex: 1,
                        }}
                      >
                        <span
                          style={{
                            fontWeight: isSelected ? 800 : 600,
                            color: palette.text,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {opt.label}
                        </span>
                        {opt.subLabel && (
                          <span
                            style={{
                              fontSize: "10.5px",
                              color: palette.subText,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {opt.subLabel}
                          </span>
                        )}
                      </div>

                      {opt.badgeText && (
                        <span
                          style={{
                            fontSize: "10.5px",
                            color: resolveBadgeTextColor(
                              opt.badgeColor,
                              portalTheme
                            ),
                            fontWeight: 700,
                            whiteSpace: "nowrap",
                            flexShrink: 0,
                          }}
                        >
                          {opt.badgeText}
                        </span>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "4px",
        position: "relative",
        minWidth: 0,
        ...containerStyle,
      }}
    >
      {(label !== undefined ||
        headerRight !== undefined ||
        (showSelectedIndicator && isMeaningfulSelection)) && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "6px",
            minHeight: "16px",
          }}
        >
          {label !== undefined ? (
            <label
              htmlFor={id}
              style={{
                margin: 0,
                fontSize: "11px",
                fontWeight: 700,
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
            >
              {label}
              {required && (
                <span style={{ color: "#dc2626", marginLeft: "2px" }}>*</span>
              )}
            </label>
          ) : (
            <span />
          )}

          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              flexShrink: 0,
            }}
          >
            {headerRight}
            {showSelectedIndicator &&
              Boolean(
                value && selectedOption && !NON_SELECTION_SENTINELS.has(value)
              ) && (
                <span
                  style={{
                    fontSize: "10.5px",
                    fontWeight: 700,
                    color: "#1d4ed8",
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                  }}
                >
                  {selectedIndicatorText}
                </span>
              )}
          </div>
        </div>
      )}

      <div ref={inputWrapperRef} style={{ position: "relative", width: "100%" }}>
        <Search
          size={13}
          style={{
            position: "absolute",
            left: "9px",
            top: "50%",
            transform: "translateY(-50%)",
            color: "#64748b",
            pointerEvents: "none",
            zIndex: 2,
          }}
        />
        <input
          ref={inputRef}
          id={id}
          type="text"
          value={query}
          disabled={disabled}
          required={required}
          placeholder={placeholder}
          className={`search-select-combobox-input rounded border px-2 font-medium focus:outline-none ${inputClassName}`}
          onFocus={() => {
            if (disabled) return;
            setIsOpen(true);
            if (allowFreeText) {
              const curIdx = value
                ? visibleOptions.findIndex((o) => o.value === value)
                : -1;
              setHighlightedIdx(curIdx);
            } else {
              const curIdx = visibleOptions.findIndex((o) => o.value === value);
              setHighlightedIdx(curIdx >= 0 ? curIdx : 0);
            }
          }}
          onChange={(e) => {
            const nextVal = e.target.value;
            setQuery(nextVal);
            if (allowFreeText && onFreeTextChange) {
              onFreeTextChange(nextVal);
              if (value) {
                onChange("", undefined);
              }
              setIsOpen(true);
              setHighlightedIdx(-1);
              return;
            }
            if (nextVal.trim() === "" && value && clearable) {
              onChange("", undefined);
            }
            setIsOpen(true);
            setHighlightedIdx(0);
          }}
          onKeyDown={(e) => {
            if (disabled) return;
            if (!isOpen && e.key === "ArrowDown") {
              e.preventDefault();
              setIsOpen(true);
              setHighlightedIdx(0);
              return;
            }
            if (!isOpen && e.key === "Enter") {
              if (allowFreeText && onFreeTextEnter) {
                e.preventDefault();
                onFreeTextEnter(query);
                return;
              }
              e.preventDefault();
              setIsOpen(true);
              return;
            }
            if (isOpen) {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setHighlightedIdx((prev) =>
                  visibleOptions.length === 0
                    ? -1
                    : Math.min(
                        prev < 0 ? 0 : prev + 1,
                        visibleOptions.length - 1
                      )
                );
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setHighlightedIdx((prev) =>
                  allowFreeText
                    ? Math.max(prev - 1, -1)
                    : Math.max(prev - 1, 0)
                );
              } else if (e.key === "Enter") {
                e.preventDefault();
                if (highlightedIdx >= 0 && visibleOptions[highlightedIdx]) {
                  handleSelectOption(visibleOptions[highlightedIdx]);
                } else if (allowFreeText) {
                  setIsOpen(false);
                  if (onFreeTextEnter) {
                    onFreeTextEnter(query);
                  }
                }
              } else if (e.key === "Escape") {
                e.preventDefault();
                setIsOpen(false);
                setChosungFilter("전체");
                if (!allowFreeText) {
                  setQuery(selectedLabel || "");
                }
              }
            }
          }}
          style={{
            width: "100%",
            height: resolvedHeight,
            padding: showClearBtn ? "0 26px 0 28px" : "0 10px 0 28px",
            fontSize,
            fontWeight: value && !NON_SELECTION_SENTINELS.has(value) ? 700 : 500,
            boxSizing: "border-box",
            opacity: disabled ? 0.72 : 1,
            cursor: disabled ? "not-allowed" : "text",
            ...inputStyle,
          }}
        />
        {showClearBtn && (
          <button
            type="button"
            onClick={handleClear}
            title="선택 초기화"
            style={{
              position: "absolute",
              right: "5px",
              top: "50%",
              transform: "translateY(-50%)",
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#64748b",
              padding: "2px",
              display: "inline-flex",
              alignItems: "center",
              zIndex: 2,
            }}
          >
            <X size={13} />
          </button>
        )}
      </div>

      {dropdownElement}
    </div>
  );
};

export default SearchSelectCombobox;
