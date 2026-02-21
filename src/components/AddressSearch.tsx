"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface SelectedPlace {
  lat: number;
  lng: number;
  formattedAddress: string;
}

type Prediction = { place_id: string; description: string };

type AddressSearchProps = {
  /** When provided, parent can show Save instead of Waze; called when user selects a place */
  onPlaceSelect?: (place: SelectedPlace) => void;
  /** When false, hide the Waze button (e.g. for set-address page that shows Save in parent) */
  showWazeButton?: boolean;
};

const DEBOUNCE_MS = 300;
const MIN_INPUT_LENGTH = 2;

export function AddressSearch({ onPlaceSelect, showWazeButton = true }: AddressSearchProps = {}) {
  const [inputValue, setInputValue] = useState("");
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [selectedPlace, setSelectedPlace] = useState<SelectedPlace | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dropdownRef = useRef<HTMLUListElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchPredictions = useCallback(async (input: string) => {
    const q = input.trim();
    if (q.length < MIN_INPUT_LENGTH) {
      setPredictions([]);
      setDropdownOpen(false);
      return;
    }
    setIsLoading(true);
    setLoadError(null);
    try {
      const res = await fetch(`/api/places/autocomplete?input=${encodeURIComponent(q)}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to load suggestions");
      }
      setPredictions(data.predictions ?? []);
      setHighlightedIndex(-1);
      setDropdownOpen((data.predictions?.length ?? 0) > 0);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load suggestions");
      setPredictions([]);
      setDropdownOpen(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = inputValue.trim();
    if (trimmed.length < MIN_INPUT_LENGTH) {
      setPredictions([]);
      setDropdownOpen(false);
      return;
    }
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      fetchPredictions(inputValue);
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [inputValue, fetchPredictions]);

  const selectPlace = useCallback(
    async (placeId: string) => {
      setDropdownOpen(false);
      setPredictions([]);
      setIsLoading(true);
      setLoadError(null);
      try {
        const res = await fetch(`/api/places/details?place_id=${encodeURIComponent(placeId)}`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.error ?? "Failed to load place details");
        }
        const place: SelectedPlace = {
          lat: data.lat,
          lng: data.lng,
          formattedAddress: data.formattedAddress ?? "",
        };
        setSelectedPlace(place);
        setInputValue(place.formattedAddress);
        onPlaceSelect?.(place);
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : "Failed to load place details");
      } finally {
        setIsLoading(false);
      }
    },
    [onPlaceSelect]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!dropdownOpen || predictions.length === 0) {
        if (e.key === "Escape") setDropdownOpen(false);
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlightedIndex((i) => (i < predictions.length - 1 ? i + 1 : 0));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightedIndex((i) => (i <= 0 ? predictions.length - 1 : i - 1));
        return;
      }
      if (e.key === "Enter" && highlightedIndex >= 0 && predictions[highlightedIndex]) {
        e.preventDefault();
        selectPlace(predictions[highlightedIndex].place_id);
        return;
      }
      if (e.key === "Escape") {
        setDropdownOpen(false);
        setHighlightedIndex(-1);
      }
    },
    [dropdownOpen, predictions, highlightedIndex, selectPlace]
  );

  useEffect(() => {
    const el = dropdownRef.current;
    if (!el || highlightedIndex < 0) return;
    const item = el.children[highlightedIndex] as HTMLElement;
    item?.scrollIntoView({ block: "nearest" });
  }, [highlightedIndex]);

  useEffect(() => {
    if (predictions.length > 0) inputRef.current?.focus();
  }, [predictions.length]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        dropdownRef.current?.contains(target) ||
        inputRef.current?.contains(target)
      ) {
        return;
      }
      setDropdownOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const openWaze = () => {
    if (!selectedPlace) return;
    const { lat, lng } = selectedPlace;
    window.open(`https://waze.com/ul?ll=${lat},${lng}&navigate=yes`, "_blank", "noopener,noreferrer");
  };

  if (loadError) {
    return (
      <div className="rounded-lg border border-[var(--waze-border,#e5e7eb)] bg-[var(--waze-bg,#fff)] p-4 text-[var(--waze-text,#111)]">
        <p className="text-[var(--waze-error,#ef4444)]">{loadError}</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md space-y-4 relative">
      <label htmlFor="address-input" className="block text-sm font-medium text-[var(--waze-text,#111)]">
        חפש כתובת
      </label>
      <input
        id="address-input"
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => predictions.length > 0 && setDropdownOpen(true)}
        placeholder="הקלד כתובת בישראל..."
        className="w-full rounded-lg border border-[var(--waze-border,#e5e7eb)] bg-[var(--waze-bg,#fff)] px-4 py-3 text-[var(--waze-text,#111)] placeholder-[var(--waze-text-muted,#6b7280)] focus:border-[var(--waze-primary,#3b82f6)] focus:outline-none focus:ring-2 focus:ring-[var(--waze-primary,#3b82f6)]/20 disabled:opacity-50"
        aria-label="חפש כתובת"
        aria-autocomplete="list"
        aria-expanded={dropdownOpen}
        aria-controls="address-suggestions"
        aria-activedescendant={
          highlightedIndex >= 0 && predictions[highlightedIndex]
            ? `suggestion-${highlightedIndex}`
            : undefined
        }
      />
      {dropdownOpen && predictions.length > 0 && (
        <ul
          id="address-suggestions"
          ref={dropdownRef}
          role="listbox"
          className="absolute z-10 w-full mt-1 py-1 bg-[var(--waze-bg,#fff)] border border-[var(--waze-border,#e5e7eb)] rounded-lg shadow-lg max-h-60 overflow-auto"
        >
          {predictions.map((p, i) => (
            <li
              key={p.place_id}
              id={`suggestion-${i}`}
              role="option"
              aria-selected={i === highlightedIndex}
              className={`px-4 py-2 cursor-pointer text-[var(--waze-text,#111)] ${
                i === highlightedIndex
                  ? "bg-[var(--waze-primary,#3b82f6)]/10"
                  : "hover:bg-gray-100"
              }`}
              onMouseEnter={() => setHighlightedIndex(i)}
              onClick={() => selectPlace(p.place_id)}
            >
              {p.description}
            </li>
          ))}
        </ul>
      )}
      {isLoading && (
        <p className="text-sm text-[var(--waze-text-muted,#6b7280)]">טוען...</p>
      )}
      {selectedPlace && (
        <div className="space-y-3">
          {selectedPlace.formattedAddress && (
            <p className="text-sm text-[var(--waze-text-muted,#6b7280)]">
              {selectedPlace.formattedAddress}
            </p>
          )}
          {showWazeButton && (
            <button
              type="button"
              onClick={openWaze}
              className="w-full rounded-lg bg-[var(--waze-primary,#3b82f6)] px-4 py-3 font-medium text-white transition-colors hover:bg-[var(--waze-primary-dark,#2563eb)] focus:outline-none focus:ring-2 focus:ring-[var(--waze-primary,#3b82f6)] focus:ring-offset-2 focus:ring-offset-[var(--waze-bg,#fff)]"
            >
              נסיעה עם Waze
            </button>
          )}
        </div>
      )}
    </div>
  );
}
