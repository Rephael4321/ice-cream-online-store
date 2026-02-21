"use client";

import { useEffect, useRef, useState } from "react";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";

export interface SelectedPlace {
  lat: number;
  lng: number;
  formattedAddress: string;
}

interface GoogleMapsKeyResponse {
  key?: string;
  error?: string;
}

type AddressSearchProps = {
  /** When provided, parent can show Save instead of Waze; called when user selects a place */
  onPlaceSelect?: (place: SelectedPlace) => void;
  /** When false, hide the Waze button (e.g. for set-address page that shows Save in parent) */
  showWazeButton?: boolean;
};

export function AddressSearch({ onPlaceSelect, showWazeButton = true }: AddressSearchProps = {}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<SelectedPlace | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let listener: google.maps.MapsEventListener | null = null;
    let cancelled = false;

    async function init() {
      if (!inputRef.current) return;
      try {
        const res = await fetch("/api/google-maps-key");
        const data: GoogleMapsKeyResponse = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.error || "Failed to get maps key");
        }
        if (!data.key) throw new Error("No API key returned");

        setOptions({ key: data.key });
        await importLibrary("places");
        if (cancelled || !inputRef.current) return;

        const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
          componentRestrictions: { country: "il" },
          fields: ["geometry", "formatted_address"],
        });
        autocompleteRef.current = autocomplete;

        listener = window.google.maps.event.addListener(autocomplete, "place_changed", () => {
          const place = autocomplete.getPlace();
          const location = place.geometry?.location;
          if (location) {
            const lat = location.lat();
            const lng = location.lng();
            const placeData = {
              lat,
              lng,
              formattedAddress: place.formatted_address || "",
            };
            setSelectedPlace(placeData);
            onPlaceSelect?.(placeData);
          }
        });
      } catch (err) {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : "Failed to load Google Maps");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    init();
    return () => {
      cancelled = true;
      if (listener && typeof listener.remove === "function") {
        listener.remove();
      }
      if (autocompleteRef.current && window.google?.maps?.event) {
        window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
      autocompleteRef.current = null;
    };
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
    <div className="w-full max-w-md space-y-4">
      <label htmlFor="address-input" className="block text-sm font-medium text-[var(--waze-text,#111)]">
        חפש כתובת
      </label>
      <input
        id="address-input"
        ref={inputRef}
        type="text"
        placeholder="הקלד כתובת בישראל..."
        disabled={isLoading}
        className="w-full rounded-lg border border-[var(--waze-border,#e5e7eb)] bg-[var(--waze-bg,#fff)] px-4 py-3 text-[var(--waze-text,#111)] placeholder-[var(--waze-text-muted,#6b7280)] focus:border-[var(--waze-primary,#3b82f6)] focus:outline-none focus:ring-2 focus:ring-[var(--waze-primary,#3b82f6)]/20 disabled:opacity-50"
        aria-label="חפש כתובת"
      />
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
