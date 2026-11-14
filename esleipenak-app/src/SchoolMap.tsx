import { useEffect, useMemo, useRef, useState } from 'react';
import { Segmented, Select } from 'antd';
import unidecode from 'unidecode';
import L from 'leaflet';
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import schools from './assets/schools.json';
import { SCHOOL_TYPE_LABELS } from './schoolTypes';
import { cityOptions, cityPoints, processCity, type CityData } from './utils';

// Precomputed once so searches never call unidecode per render.
const normalize = (value: string) => unidecode(value.toLowerCase());
const indexedSchools = schools.map((school) => ({
  ...school,
  displayName: school.name.trimEnd().endsWith(` ${school.type}`)
    ? school.name.trimEnd().slice(0, -school.type.length - 1)
    : school.name.trim(),
  search: normalize(`${school.name} ${school.city} ${school.code}`),
}));
const schoolsByCode = new Map(schools.map((school) => [school.code, school]));
const typeOptions = [...new Set(schools.map((school) => school.type))]
  .map((type) => {
    const spanish = schools.find((school) => school.type === type && school.typeEs)?.typeEs;
    const basqueLabel = SCHOOL_TYPE_LABELS[type] ?? type;
    return {
      // Code + Spanish code first so the filter can be searched by either.
      label: `${type}${spanish ? ` (${spanish})` : ''} · ${basqueLabel}`,
      value: type,
    };
  })
  .sort((a, b) => a.label.localeCompare(b.label));
const defaultIcon = L.icon({ iconUrl: icon });
const originIcon = L.divIcon({
  className: 'origin-marker',
  html: '<span></span>',
  iconSize: [24, 24],
  iconAnchor: [12, 24],
});

const webUrl = (web: string) => {
  const value = web.toLowerCase();
  if (value.startsWith('http://') || value.startsWith('https://')) return web;
  if (value.startsWith('www.')) return `https://${web}`;
  return null;
};

const formatDistance = (meters: number) =>
  meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toFixed(1)} km`;

const typeLabel = (type: string) => SCHOOL_TYPE_LABELS[type] ?? type;

interface Props {
  city: string | null;
  onCityChange: (city: string | null) => void;
}

function SchoolMap({ city, onCityChange }: Props) {
  const [query, setQuery] = useState('');
  const [types, setTypes] = useState<string[]>([]);
  const [maxMinutes, setMaxMinutes] = useState<number | null>(null);
  const [distances, setDistances] = useState<CityData[]>([]);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'map' | 'list'>('map');
  const mapRef = useRef<L.Map>(null);
  const markersRef = useRef<Record<string, L.Marker>>({});
  const pendingCodeRef = useRef<string | null>(null);

  useEffect(() => {
    setMaxMinutes(null);
    if (!city) {
      setDistances([]);
      setLoading(false);
      return;
    }
    const point = cityPoints.get(city);
    if (point) mapRef.current?.flyTo([point.lat, point.lon], 10);

    let active = true;
    setLoading(true);
    processCity(city).then((data) => {
      if (!active) return;
      setDistances(data);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [city]);

  const distancesByCode = useMemo(
    () => new Map(distances.map((item) => [item.code, item.distances])),
    [distances],
  );

  // 5-minute steps up to the longest drive from the selected town.
  const timeOptions = useMemo(() => {
    const longest = distances.reduce(
      (max, item) => Math.max(max, item.distances.duration ?? 0),
      0,
    );
    const limit = Math.ceil(longest / 5) * 5;
    const options = [];
    for (let minutes = 5; minutes <= limit; minutes += 5) {
      options.push({ label: `${minutes} min edo gutxiago`, value: minutes });
    }
    return options;
  }, [distances]);

  const visible = useMemo(() => {
    const q = normalize(query.trim());
    return indexedSchools.filter((school) => {
      if (types.length > 0 && !types.includes(school.type)) return false;
      if (q && !school.search.includes(q)) return false;
      if (maxMinutes !== null) {
        const minutes = distancesByCode.get(school.code)?.duration;
        if (minutes == null || minutes > maxMinutes) return false;
      }
      return true;
    });
  }, [query, types, maxMinutes, distancesByCode]);

  const cityPoint = city ? cityPoints.get(city) : undefined;

  // Sorted copy for the list view: quickest drive first, then name.
  const sortedVisible = useMemo(
    () =>
      [...visible].sort((a, b) => {
        const aMinutes = distancesByCode.get(a.code)?.duration;
        const bMinutes = distancesByCode.get(b.code)?.duration;
        if (aMinutes == null || bMinutes == null) {
          if (aMinutes == null && bMinutes == null) {
            return a.displayName.localeCompare(b.displayName);
          }
          return aMinutes == null ? 1 : -1;
        }
        return aMinutes - bMinutes || a.displayName.localeCompare(b.displayName);
      }),
    [visible, distancesByCode],
  );

  const selectSchool = (code: string) => {
    setQuery('');
    if (mode === 'list') {
      // The map is unmounted here, so fly to it after switching back.
      pendingCodeRef.current = code;
      setMode('map');
      return;
    }
    const school = schoolsByCode.get(code);
    if (!school) return;
    mapRef.current?.flyTo([school.lat, school.lon], 14);
    markersRef.current[code]?.openPopup();
  };

  useEffect(() => {
    const code = pendingCodeRef.current;
    if (mode !== 'map' || !code) return;
    pendingCodeRef.current = null;
    const school = schoolsByCode.get(code);
    if (!school) return;
    mapRef.current?.flyTo([school.lat, school.lon], 14);
    markersRef.current[code]?.openPopup();
  }, [mode]);

  return (
    <div className={mode === 'list' ? 'map-wrapper list-mode' : 'map-wrapper'}>
      <div className="map-search">
        <Select
          showSearch
          placeholder="Bilatu ikastetxea (izena, herria edo kodea)"
          searchValue={query}
          onSearch={setQuery}
          onSelect={selectSchool}
          options={visible.map((school) => ({
            label: `${school.displayName} · ${school.city}`,
            value: school.code,
            search: school.search,
          }))}
          filterOption={(input, option) =>
            (option?.search ?? '').includes(normalize(input))
          }
          style={{ flex: '1 1 220px' }}
        />
        <Select
          mode="multiple"
          allowClear
          showSearch
          optionFilterProp="label"
          placeholder="Maila"
          value={types}
          onChange={setTypes}
          options={typeOptions}
          maxTagCount="responsive"
          style={{ flex: '1 1 160px' }}
        />
        <Select
          showSearch
          allowClear
          optionFilterProp="label"
          placeholder="Herria"
          value={city}
          loading={loading}
          options={cityOptions}
          onChange={(value) => onCityChange(value ?? null)}
          style={{ flex: '1 1 140px' }}
        />
        <Select
          allowClear
          placeholder="Gehienezko denbora"
          value={maxMinutes}
          onChange={(value) => setMaxMinutes(value ?? null)}
          options={timeOptions}
          disabled={!city || loading || timeOptions.length === 0}
          style={{ flex: '1 1 150px' }}
        />
        <Segmented
          value={mode}
          onChange={(value) => setMode(value === 'list' ? 'list' : 'map')}
          options={[
            { label: 'Mapa', value: 'map' },
            { label: 'Zerrenda', value: 'list' },
          ]}
          style={{ flex: '0 0 auto' }}
        />
      </div>
      {mode === 'map' ? (
        <MapContainer
          ref={mapRef}
          center={[43.0985864, -2.3811024]}
          zoom={9}
          scrollWheelZoom={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {visible.map((school) => {
            const distance = distancesByCode.get(school.code);
            const url = webUrl(school.web);
            return (
              <Marker
                key={school.code}
                position={[school.lat, school.lon]}
                icon={defaultIcon}
                ref={(marker) => {
                  if (marker) markersRef.current[school.code] = marker;
                  else delete markersRef.current[school.code];
                }}
              >
                <Popup>
                  <strong>{school.displayName}</strong>
                  <br />
                  {school.typeEs
                    ? `${typeLabel(school.type)} · ${school.typeEs}`
                    : typeLabel(school.type)}
                  <br />
                  Helbidea: {school.address}
                  {school.zip ? `, ${school.zip}` : ''} {school.city}
                  <br />
                  Telefonoa: <a href={`tel:${school.tel}`}>{school.tel}</a>
                  <br />
                  Kodea: {school.code}
                  {school.email && (
                    <>
                      <br />
                      E-posta: <a href={`mailto:${school.email}`}>{school.email}</a>
                    </>
                  )}
                  {url && (
                    <>
                      <br />
                      Webgunea:{' '}
                      <a href={url} target="_blank" rel="noopener noreferrer">
                        {school.web}
                      </a>
                    </>
                  )}
                  {distance?.duration != null && distance?.distance != null && (
                    <>
                      <br />
                      Distantzia: {formatDistance(distance.distance)}
                      <br />
                      Denbora: {Math.round(distance.duration)} min
                    </>
                  )}
                </Popup>
              </Marker>
            );
          })}
          {cityPoint && (
            <Marker
              position={[cityPoint.lat, cityPoint.lon]}
              icon={originIcon}
              zIndexOffset={1000}
            >
              <Popup>{cityPoint.name}</Popup>
            </Marker>
          )}
        </MapContainer>
      ) : (
        <div className="school-list">
          <p className="school-list-count">{visible.length} ikastetxe</p>
          <ul>
            {sortedVisible.map((school) => {
              const distance = distancesByCode.get(school.code);
              const url = webUrl(school.web);
              return (
                <li key={school.code} className="school-list-item">
                  <strong>{school.displayName}</strong>
                  <div className="school-list-meta">
                    {typeLabel(school.type)}
                    {school.typeEs ? ` · ${school.typeEs}` : ''}
                  </div>
                  <div>
                    {school.address}
                    {school.zip ? `, ${school.zip}` : ''} {school.city}
                  </div>
                  <div className="school-list-meta">
                    {school.tel && <a href={`tel:${school.tel}`}>{school.tel}</a>}
                    {school.email && (
                      <>
                        {' · '}
                        <a href={`mailto:${school.email}`}>{school.email}</a>
                      </>
                    )}
                    {url && (
                      <>
                        {' · '}
                        <a href={url} target="_blank" rel="noopener noreferrer">
                          Webgunea
                        </a>
                      </>
                    )}
                    {distance?.duration != null && distance?.distance != null && (
                      <>
                        {' · '}
                        {formatDistance(distance.distance)} ·{' '}
                        {Math.round(distance.duration)} min
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
          {visible.length === 0 && <p className="school-list-empty">Ez dago emaitzarik.</p>}
        </div>
      )}
    </div>
  );
}

export default SchoolMap;
