import type { ColumnsType } from 'antd/es/table';
import unidecode from 'unidecode';
import herriak from './assets/cities.json';
import type { EditableColumnType, TableFilter, TableRow } from './interfaces';

export function formatString(value: string): string {
  return unidecode(value.toLowerCase().replace(/ /g, '-').replace(/\//g, '-'));
}

// Duplicate city names share a slug: keep the last one, which is the
// occurrence whose distance file is generated last (and thus kept on disk).
export const cityPoints = new Map<string, { name: string; lat: number; lon: number }>(
  herriak.features.map((feature): [string, { name: string; lat: number; lon: number }] => [
    formatString(feature.properties.name),
    {
      name: feature.properties.name,
      lat: feature.geometry.coordinates[1],
      lon: feature.geometry.coordinates[0],
    },
  ]),
);

export const cityOptions = [...cityPoints.entries()]
  .map(([value, city]) => ({ label: city.name, value }))
  .sort((a, b) => a.label.localeCompare(b.label));

export interface CityData {
  code: string;
  distances: {
    duration: number;
    distance: number;
  };
}

async function loadCityData(city: string): Promise<CityData[]> {
  try {
    const module = await import(`./assets/cities_distances/${city}.json`);
    return module.default as CityData[];
  } catch (error) {
    console.error(`Error loading data for city: ${city}`, error);
    return [];
  }
}

async function processCity(cityName: string) {
  const data = await loadCityData(cityName);
  if (data) {
    return data;
  } else {
    console.log(`Failed to load data for ${cityName}.`);
  }
  return [];
}

function onlyUnique(
  value: string | number | undefined,
  index: number,
  array: (string | number | undefined)[],
): boolean {
  return array.findIndex((item) => String(item) === String(value)) === index;
}

const generateTableColumns = (
  data: TableRow[],
  tableFilters: TableFilter,
  isMobile: boolean = false,
): ColumnsType<TableRow> => {
  if (!data || data.length === 0) {
    return [];
  }
  console.log('tableFilters', tableFilters);

  const keys = Object.keys(data[0]).filter((key) => key !== 'key');
  const lefFixedColumns = [
    'Nº PLAZA',
    'MUNICIPIO',
    'CENTRO_1',
    'NOMBRE_CENTRO',
    'DESCRIPCION_ASIGNATURA',
    'DESCRIPCION',
    'ASIGNATURA',
  ];
  return [
    ...keys.map((key) => {
      const filters = tableFilters[key];
      const column: EditableColumnType = {
        title: key,
        dataIndex: key,
        key: key,
        filterSearch: true,
        filters:filters,
        onFilter: (value, record) => {
          return (
            record[key]
              ?.toString()
              .toLowerCase()
              .indexOf(String(value).toLowerCase()) === 0
          );
        },
        render:
          key === 'Denbora'
            ? (value) => {
                return value ? `${value?.toFixed()?.toString()} min` : '-';
              }
            : key === 'Distantzia'
            ? (value) =>
                value < 1000 && value
                  ? `${value.toFixed().toString()} m`
                  : value
                  ? `${(value / 1000).toFixed().toString()} km`
                  : '-'
            : undefined,
        fixed: isMobile 
          ? undefined 
          : (lefFixedColumns.includes(key)
            ? 'left'
            : key === 'Denbora' || key === 'Distantzia'
            ? 'right'
            : undefined),
        sorter:
          key === 'Denbora' || key === 'Distantzia'
            ? (a, b) => {
                const aDist = parseFloat(a[key]?.toString() ?? '9999');
                const bDist = parseFloat(b[key]?.toString() ?? '9999');
                return aDist - bDist;
              }
            : (a, b) => {
                const aVal = String(a[key] || '');
                const bVal = String(b[key] || '');
                return aVal.localeCompare(bVal); // Use localeCompare for string sorting
              },
      };
      return column;
    }),
  ];
};

export { processCity, onlyUnique, generateTableColumns };
