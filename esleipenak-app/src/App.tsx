import { Button, Layout, Popover, Select, Steps } from 'antd';
import 'leaflet/dist/leaflet.css';

import './App.css';
import ExcelProcessor from './ExcelProcessor';
import SchoolMap from './SchoolMap';
import CitiesMap from './CitiesMap';
import { cityOptions } from './utils';
import skippedSchools from './assets/skipped_schools.json';
import { useEffect, useState } from 'react';
import { Content, Footer, Header } from 'antd/es/layout/layout';
import { ArrowLeftOutlined, GithubOutlined } from '@ant-design/icons';
function App() {
  const [selected, setSelected] = useState(null as string | null);
  const [current, setCurrent] = useState(0);
  const [view, setView] = useState(() => window.location.hash);

  useEffect(() => {
    const onHashChange = () => setView(window.location.hash);
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [view]);

  const isMapView = view === '#/herriak' || view === '#/ikastetxeak';
  const closeView = () => {
    window.location.hash = '';
  };
  const steps = [
    {
      title: 'Azalpen laburra',
      content: (
        <>
          <div className="responsive-container">
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
            options={cityOptions}
            onSelect={(value) => setSelected(value)}
            size="large"
            className="responsive-select"
            style={{ margin: '0 0 25px 0' }}
          />
          <br />
          <Button
            type="primary"
            className="responsive-button"
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
    <Layout>
      <Header
        className="app-header"
        style={{
          color: '#fff',
          height: 64,
          lineHeight: '64px',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <h1 className="header-title">
          <button type="button" className="header-brand" onClick={closeView}>
            Esleipenak
          </button>
        </h1>
        <nav className="header-nav" aria-label="Mapak">
          <a
            href="#/herriak"
            className={view === '#/herriak' ? 'active' : undefined}
            aria-current={view === '#/herriak' ? 'page' : undefined}
          >
            Herriak
          </a>
          <a
            href="#/ikastetxeak"
            className={view === '#/ikastetxeak' ? 'active' : undefined}
            aria-current={view === '#/ikastetxeak' ? 'page' : undefined}
          >
            Ikastetxeak
          </a>
        </nav>
      </Header>
      {isMapView ? (
        <Content className="map-view">
          <div className="map-intro">
            {view === '#/herriak' ? (
              <>
                <h2>Herrien mapa</h2>
                <p>
                  Mapa honetan ikusgai daude esleipenerako aukeragai diren
                  herriak. Hauek lortzeko Overpass turbo erabili dugu, zehazki{' '}
                  <a href="https://overpass-turbo.eu/s/28z5">query hau</a>.
                </p>
              </>
            ) : (
              <>
                <h2>Ikastetxeen mapa</h2>
                <p>
                  Denboren kalkuluak egiteko erabili dugun ikastetxeen
                  informaziotik erauzitako mapa da hau. Hauek lortzeko Open Data
                  Euskadiko datuak erabili ditugu, zehazki{' '}
                  <a href="https://opendata.euskadi.eus/katalogoa/-/unibertsitatez-kanpoko-ikastetxeak/">
                    helbideko honetako datuak
                  </a>.
                </p>
                {skippedSchools.length > 0 && (
                  <Popover
                    trigger="click"
                    placement="bottomLeft"
                    title="Mapan kokatu ez diren ikastetxeak"
                    content={
                      <div className="skipped-schools">
                        <p>
                          Open Data Euskadiko datuetan ikastetxe hauek ez dute
                          koordinaturik, eta beraz ezin izan dira mapan kokatu.
                          Haiengana joateko distantzia eta denbora ez dira
                          kalkulatzen.
                        </p>
                        <ul>
                          {skippedSchools.map((school) => (
                            <li key={school.code}>
                              {school.name} · {school.city} ({school.code})
                            </li>
                          ))}
                        </ul>
                      </div>
                    }
                  >
                    <Button type="link" style={{ padding: 0, color: '#d46b08' }}>
                      {skippedSchools.length} ikastetxe ez dira mapan agertzen
                    </Button>
                  </Popover>
                )}
              </>
            )}
          </div>
          <Button
            className="map-back"
            icon={<ArrowLeftOutlined />}
            onClick={closeView}
          >
            Itzuli
          </Button>
          {view === '#/herriak' ? (
            <CitiesMap />
          ) : (
            <SchoolMap city={selected} onCityChange={setSelected} />
          )}
        </Content>
      ) : (
        <Content
          className="app-content"
          style={{ minHeight: '95vh', textAlign: 'center' }}
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
            className="responsive-container"
            style={{ margin: '0 auto' }}
            current={current}
            items={items}
          />
          <div>{steps[current].content}</div>
        </Content>
      )}
      {!isMapView && (
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
      )}
    </Layout>
  );
}

export default App;
