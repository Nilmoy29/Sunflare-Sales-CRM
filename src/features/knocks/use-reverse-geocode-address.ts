"use client";

import { useEffect, useState } from "react";
import { fetchReverseGeocode } from "@/features/knocks/api";
import {
  ADDRESS_MAX_LENGTH,
  POSTCODE_MAX_LENGTH,
  SUBURB_MAX_LENGTH,
} from "@/lib/validators/knocks";

type UseReverseGeocodeAddressOptions = {
  lat: number;
  lng: number;
};

export function useReverseGeocodeAddress({
  lat,
  lng,
}: UseReverseGeocodeAddressOptions) {
  const [address, setAddress] = useState("");
  const [suburb, setSuburb] = useState("");
  const [postcode, setPostcode] = useState("");
  const [loading, setLoading] = useState(true);
  const [hint, setHint] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadAddress() {
      setLoading(true);
      setHint(null);

      try {
        const result = await fetchReverseGeocode(lat, lng, controller.signal);
        if (controller.signal.aborted) {
          return;
        }

        if (result.status === "ok") {
          setAddress(result.data.address ?? "");
          setSuburb(result.data.suburb ?? "");
          setPostcode(result.data.postcode ?? "");
          return;
        }

        if (result.status === "not_configured") {
          setHint(
            "Address lookup is not configured. Enter the address manually or add MAPBOX_SECRET_TOKEN — see docs/SETUP_KEYS.md",
          );
          return;
        }

        setHint("Could not look up the address. You can enter it manually.");
      } catch (e: unknown) {
        if (controller.signal.aborted) {
          return;
        }
        if (e instanceof Error && e.name === "AbortError") {
          return;
        }
        setHint("Could not look up the address. You can enter it manually.");
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void loadAddress();

    return () => {
      controller.abort();
    };
  }, [lat, lng]);

  return {
    address,
    suburb,
    postcode,
    setAddress,
    setSuburb,
    setPostcode,
    loading,
    hint,
    addressMaxLength: ADDRESS_MAX_LENGTH,
    suburbMaxLength: SUBURB_MAX_LENGTH,
    postcodeMaxLength: POSTCODE_MAX_LENGTH,
  };
}
