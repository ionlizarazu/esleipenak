import L from 'leaflet';
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import herriak from './assets/cities.json';

const defaultIcon = L.icon({
  iconUrl: icon,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

function CitiesMap() {
  return (
    <MapContainer
      center={[43.0985864, -2.3811024]}
      zoom={9}
      scrollWheelZoom={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {herriak.features.map((town, key) => (
        <Marker
          key={key}
          position={[town.geometry.coordinates[1], town.geometry.coordinates[0]]}
          icon={defaultIcon}
        >
          <Popup>{town.properties.name}</Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}

export default CitiesMap;
