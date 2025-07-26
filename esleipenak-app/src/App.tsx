import { Button, Layout, Select, Steps } from 'antd';
import unidecode from 'unidecode';
import 'leaflet/dist/leaflet.css';

import './App.css';
import ExcelProcessor from './ExcelProcessor';
import herriak from './assets/cities.json';
import schools from './assets/schools.json';
import { useState } from 'react';
import { Marker, Popup, MapContainer, TileLayer } from 'react-leaflet';
import { Content, Footer, Header } from 'antd/es/layout/layout';
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import { ArrowLeftOutlined, GithubOutlined } from '@ant-design/icons';
function formatString(value: string): string {
  let formattedValue = value
    .toLowerCase()
    .replace(/ /g, '-')
    .replace(/\//g, '-');
  formattedValue = unidecode(formattedValue);

  return formattedValue;
}
function App() {
  const [selected, setSelected] = useState(null as string | null);
  const [current, setCurrent] = useState(0);

  let DefaultIcon = L.icon({
    iconUrl: icon,
  });
  const steps = [
    {
      title: 'Azalpen laburra',
      content: (
        <>
          <div
            style={{
              maxWidth: '50%',
              margin: '0 auto',
            }}
          >
            <h2>Azalpen laburra</h2>
            <p>
              Tresna hau ordezko lanetan aritzen diren irakasleei zuzenduta
              dago.
            </p>
            <p>
              Lehen urrats bezala zure egunerokoan zein herritatik irtengo zaren
              galdetzen zaizu. Datu hau ez da inon gordetzen, momentuan soilik
              erabiltzen da.
              <br />
              Zure herritik (barkatu zurea zerrendan ez badago) ikastetxe
              bakoitzerako distantzia eta autoz gidatzeko behar den denbora
              kalkulatuta ditugu, eta horretarako erabiltzen da datu hau.
            </p>
            <p>
              Hezkuntzak ematen duen excel ofiziala igo eta bertan iragazkiak
              aplikatu eta ordenatzeko aukerak eskaintzen dira. Zure gustuko
              plazak aukeratu eta zein ordenetan gordeko dituzun aldatu
              dezakezu. Aukeraketa egin ondoren, zerrenda hori deskargatzeko
              modua eskaintzen du tresnak.
            </p>
            <p>
              Kode irekiko tresna izanik, berau hobetzen laguntzeko, hemen
              helbidea{' '}
              <a href="https://www.github.com/ionlizarazu/esleipenak">
                Esleipenak github
              </a>
              .
            </p>
            <Button
              type="primary"
              style={{ margin: '0 0 25px 0' }}
              onClick={() => next()}
            >
              Probatu dezagun!
            </Button>
          </div>
          <div className="maps-container">
            <div className="map-container">
              <h2>Herrien zerrenda</h2>
              <p>
                Mapa honetan daude ikusgai hurrengo orrian aukeragai agertzen
                diren herriak. Hauek lortzeko Overpass turbo erabili dugu,
                zehazki <a href="https://overpass-turbo.eu/s/28z5">query hau</a>{' '}
                erabili dugu.
              </p>
              <MapContainer
                center={[43.0985864, -2.3811024]}
                zoom={9}
                scrollWheelZoom={false}
                style={{ height: '800px' }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {herriak.features.map((h, key) => {
                  return (
                    <Marker
                      key={key}
                      position={[
                        h.geometry.coordinates[1],
                        h.geometry.coordinates[0],
                      ]}
                      icon={DefaultIcon}
                    >
                      <Popup>{h.properties.name}</Popup>
                    </Marker>
                  );
                })}
              </MapContainer>
            </div>
            <div className="map-container">
              <h2>Ikastetxeen zerrenda</h2>
              <p>
                Denboren kalkuluak egiteko erabili dugun ikastetxeen
                informaziotik erauzitako mapa da hau. Hauek lortzeko Open Data
                Euskadiko datueak erabili dugu, zehazki{' '}
                <a href="https://opendata.euskadi.eus/katalogoa/-/unibertsitatez-kanpoko-ikastetxeak/">
                  helbideko datuak
                </a>{' '}
                erabili dugu.
              </p>
              <MapContainer
                center={[43.0985864, -2.3811024]}
                zoom={9}
                scrollWheelZoom={false}
                style={{ height: '800px' }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {schools.map((h, key) => {
                  return (
                    <Marker
                      key={key}
                      position={[h.lat, h.lon]}
                      icon={DefaultIcon}
                    >
                      <Popup>
                        {h.name}
                        <br />
                      </Popup>
                    </Marker>
                  );
                })}
              </MapContainer>
            </div>
          </div>
        </>
      ),
    },
    {
      title: 'Nondik irtengo zara?',
      content: (
        <div className="">
          <h2>Zein herritatik irtengo zara lanera joateko?</h2>
          <Select
            placeholder="Aukeratu herria"
            showSearch
            value={selected}
            options={herriak.features
              .map((h) => {
                return {
                  label: h.properties.name,
                  value: formatString(h.properties.name),
                };
              })
              .sort((a, b) => a.value.localeCompare(b.value))}
            onSelect={(value) => setSelected(value)}
            size="large"
            style={{ margin: '0 0 25px 0', minWidth: '200px' }}
          />
          <br />
          <Button
            type="primary"
            style={{ margin: '0 0 25px 0' }}
            disabled={!selected}
            onClick={() => next()}
          >
            Hurrengo pausura jo
          </Button>
        </div>
      ),
    },
    {
      title: 'Igo fitxategia',
      content: (
        <div className="">
          <h2>Igo fitxategia</h2>

          <ExcelProcessor city={selected}></ExcelProcessor>
        </div>
      ),
    },
  ];
  const items = steps.map((item) => ({ key: item.title, title: item.title }));

  const next = () => {
    setCurrent(current + 1);
  };

  const prev = () => {
    setCurrent(current - 1);
  };
  return (
    <>
      <Layout>
        <Header
          style={{
            color: '#fff',
            height: 64,
            paddingInline: 48,
            lineHeight: '64px',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <h1>Esleipenak</h1>
        </Header>
        <Content
          style={{ padding: '0 50px', minHeight: '95vh', textAlign: 'center' }}
        >
          <div style={{ margin: '2rem 0 2rem 0' }}>
            {current > 0 && (
              <Button
                style={{ margin: '0 8px' }}
                onClick={() => prev()}
                icon={<ArrowLeftOutlined />}
              >
                Aurreko pausura itzuli
              </Button>
            )}
          </div>
          <Steps
            style={{ maxWidth: '50%', margin: '0 auto' }}
            current={current}
            items={items}
          />
          <div>{steps[current].content}</div>
        </Content>
        <Footer
          style={{
            textAlign: 'center',
            backgroundColor: '#000',
            color: '#fff',
          }}
        >
          <GithubOutlined /> Garapenean:
          <a
            href="https://github.com/ionlizarazu"
            style={{ color: '#fff', textDecoration: 'underline' }}
          >
            @ionlizarazu
          </a>
          {' eta '}
          <a
            href="https://github.com/erral"
            style={{ color: '#fff', textDecoration: 'underline' }}
          >
            @erral
          </a>
          {' | '}
          <a
            href="https://github.com/ionlizarazu/esleipenak"
            style={{ color: '#fff', textDecoration: 'underline' }}
          >
            Github-eko repositorioa
          </a>
        </Footer>
      </Layout>
    </>
  );
}

export default App;
