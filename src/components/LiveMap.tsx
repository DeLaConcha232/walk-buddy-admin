import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix for default marker icons in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

interface LiveMapProps {
  position: [number, number];
  walkerName?: string;
  dogName?: string;
  lastUpdate?: Date;
}

const LiveMap = ({ position, walkerName, dogName, lastUpdate }: LiveMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const marker = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    // Initialize map
    map.current = L.map(mapContainer.current).setView(position, 15);

    // Add OpenStreetMap tiles
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map.current);

    // Add marker
    marker.current = L.marker(position).addTo(map.current);
    
    if (walkerName) {
      marker.current.bindPopup(`
        <div style="text-align: center;">
          <p style="font-weight: 600;">${walkerName}</p>
          ${dogName ? `<p style="font-size: 0.75rem; color: #666;">${dogName}</p>` : ""}
          ${lastUpdate ? `<p style="font-size: 0.75rem; margin-top: 0.25rem;">${lastUpdate.toLocaleTimeString("es-ES")}</p>` : ""}
        </div>
      `);
    }
  }, []);

  useEffect(() => {
    if (!map.current || !marker.current) return;

    // Update marker position
    marker.current.setLatLng(position);
    map.current.setView(position, 15);

    // Update popup if walker name exists
    if (walkerName) {
      marker.current.setPopupContent(`
        <div style="text-align: center;">
          <p style="font-weight: 600;">${walkerName}</p>
          ${dogName ? `<p style="font-size: 0.75rem; color: #666;">${dogName}</p>` : ""}
          ${lastUpdate ? `<p style="font-size: 0.75rem; margin-top: 0.25rem;">${lastUpdate.toLocaleTimeString("es-ES")}</p>` : ""}
        </div>
      `);
    }
  }, [position, walkerName, dogName, lastUpdate]);

  return <div ref={mapContainer} className="w-full h-[500px]" />;
};

export default LiveMap;
