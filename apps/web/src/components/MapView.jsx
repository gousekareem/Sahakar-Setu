import { MapContainer, TileLayer, Marker, Popup, Circle } from "react-leaflet";
import L from "leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

// Vite doesn't resolve Leaflet's default marker image URLs automatically.
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({ iconRetinaUrl: markerIcon2x, iconUrl: markerIcon, shadowUrl: markerShadow });

const workerIcon = new L.Icon({
  iconUrl: markerIcon, iconRetinaUrl: markerIcon2x, shadowUrl: markerShadow,
  iconSize: [22, 36], iconAnchor: [11, 36],
});

export default function MapView({ center, zoom = 12, customer, workers = [], radiusKm, height = "320px" }) {
  return (
    <div style={{ height }}>
      <MapContainer center={center} zoom={zoom} scrollWheelZoom={false} style={{ height: "100%", width: "100%", borderRadius: "0.75rem" }}>
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {customer && (
          <>
            <Marker position={customer}>
              <Popup>Your location</Popup>
            </Marker>
            {radiusKm && <Circle center={customer} radius={radiusKm * 1000} pathOptions={{ color: "#38885a", fillOpacity: 0.06 }} />}
          </>
        )}
        {workers.map((w) => (
          <Marker key={w.workerId || w.id} position={[w.latitude ?? w.homeLatitude, w.longitude ?? w.homeLongitude]} icon={workerIcon}>
            <Popup>
              <strong>{w.name}</strong>
              <br />
              {w.distanceKm ? `${w.distanceKm} km away` : ""} {w.rating ? `· ${w.rating}★` : ""}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
