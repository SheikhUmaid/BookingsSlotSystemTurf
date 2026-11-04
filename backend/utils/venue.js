// Public turf details derived from Settings. Used by GET /api/venue so the
// booking app can show the venue name, address and directions.

const hasCoords = (s) =>
    Number.isFinite(s.latitude) && Number.isFinite(s.longitude);

export function fullAddress(s) {
    const cityLine = [s.city, s.pincode].filter(Boolean).join(" ");
    return [s.address, s.landmark && `Near ${s.landmark}`, cityLine]
        .filter(Boolean)
        .join(", ");
}

// Priority: exact coordinates > admin-supplied Google Maps link > address search.
export function directionsUrl(s) {
    if (hasCoords(s)) {
        return `https://www.google.com/maps/dir/?api=1&destination=${s.latitude},${s.longitude}`;
    }
    if (s.maps_url) return s.maps_url;

    const address = fullAddress(s);
    return address
        ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`
        : null;
}

// Keyless Google Maps embed for an <iframe>.
export function mapEmbedUrl(s) {
    const query = hasCoords(s) ? `${s.latitude},${s.longitude}` : fullAddress(s);
    return query
        ? `https://maps.google.com/maps?q=${encodeURIComponent(query)}&z=15&output=embed`
        : null;
}

export function toPublicVenue(s) {
    return {
        name: s.business_name,
        tagline: s.tagline || "",
        phone: s.contact_phone || "",
        email: s.email || "",
        address: s.address || "",
        landmark: s.landmark || "",
        city: s.city || "",
        pincode: s.pincode || "",
        opening_hours: s.opening_hours || "",
        full_address: fullAddress(s),
        latitude: hasCoords(s) ? s.latitude : null,
        longitude: hasCoords(s) ? s.longitude : null,
        directions_url: directionsUrl(s),
        map_embed_url: mapEmbedUrl(s),
    };
}
