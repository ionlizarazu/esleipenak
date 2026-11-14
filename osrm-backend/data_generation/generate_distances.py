import json
import requests
import csv
import io
from pyproj import Transformer

OSMR_REQUEST = "http://localhost:5000/route/v1/driving/{orig_lon},{orig_lat};{dest_lon},{dest_lat}?overview=false&alternatives=false&steps=false"

def utm_to_latlon(easting, northing, utm_zone=30, hemisphere='N', datum='ETRS89'):
    """
    Converts UTM coordinates (Easting, Northing) to Latitude and Longitude (WGS84).

    Args:
        easting (float): The UTM Easting coordinate.
        northing (float): The UTM Northing coordinate.
        utm_zone (int): The UTM zone number (e.g., 30 for much of Spain).
        hemisphere (str): The hemisphere ('N' for Northern, 'S' for Southern).
                          Defaults to 'N' as Spain is in the Northern Hemisphere.
        datum (str): The geodetic datum of the UTM coordinates.
                     'ETRS89' (EPSG:258xx) is common for Europe and effectively
                     WGS84 compatible for practical purposes.
                     'WGS84' (EPSG:326xx for N, 327xx for S) is also common.

    Returns:
        tuple: A tuple containing (latitude, longitude) in decimal degrees (WGS84).
               Returns (None, None) if the datum is not supported.
    """
    if datum.upper() == 'ETRS89':
        # ETRS89 is EPSG:258xx where xx is the UTM zone
        source_epsg = f"epsg:258{utm_zone}"
    elif datum.upper() == 'WGS84':
        # WGS84 UTM zones are EPSG:326xx for Northern, 327xx for Southern
        if hemisphere.upper() == 'N':
            source_epsg = f"epsg:326{utm_zone}"
        elif hemisphere.upper() == 'S':
            source_epsg = f"epsg:327{utm_zone}"
        else:
            print("Error: Invalid hemisphere for WGS84 UTM datum. Use 'N' or 'S'.")
            return None, None
    else:
        print(f"Error: Datum '{datum}' not supported by this function. Use 'ETRS89' or 'WGS84'.")
        return None, None

    # Define the transformer from source CRS to WGS84 (EPSG:4326)
    try:
        transformer = Transformer.from_crs(source_epsg, "epsg:4326", always_xy=True)
    except Exception as e:
        print(f"Error creating transformer for EPSG:{source_epsg}: {e}")
        return None, None

    # Perform the transformation
    lon, lat = transformer.transform(easting, northing)
    return lat, lon

def read_school_rows(path):
    """Read the school CSV, supporting both the legacy (UTF-8, comma)
    and current (ISO-8859-1, semicolon) exports from Open Data Euskadi."""
    with open(path, "rb") as raw_file:
        raw = raw_file.read()

    for encoding in ("utf-8-sig", "latin-1"):
        try:
            text = raw.decode(encoding)
            break
        except UnicodeDecodeError:
            continue
    else:
        raise ValueError(f"Could not decode {path}")

    delimiter = ";" if ";" in text.splitlines()[0] else ","
    return list(csv.DictReader(io.StringIO(text), delimiter=delimiter))


def get_all_schools():
    """ open a CSV file  in folder data with schools data in there. Convert the COOR_X and COOR_Y to lat lon using the function in latlon.py and return a list of schools"""
    schools = []
    skipped = []
    for row in read_school_rows("data/dirgennouniv.csv"):
        try:
            easting = float(row['COOR_X'])
            northing = float(row['COOR_Y'])
        except (TypeError, ValueError):
            easting = northing = 0

        if easting == 0 and northing == 0:
            # Some schools have no coordinates in the Open Data Euskadi file.
            # They cannot be placed on the map nor routed to, so skip them and
            # report them to the app so end users know they are missing.
            skipped.append({
                "code": row['CCEN'],
                "name": f"{row['NOM']} {row['DGENRE']}".strip(),
                "city": row['DMUNIE']})
            continue

        lat, lon = utm_to_latlon(easting, northing)
        schools.append({
            "code": row['CCEN'],
            "name": f"{row['NOM']} {row['DGENRE']}",
            "type": row['DGENRE'].strip() or 'BESTE',
            "typeEs": row['DGENRC'].strip(),
            "city": row['DMUNIE'],
            "address": row['DOMI'],
            "zip": row['CPOS'].strip(),
            "tel": row['TEL1'],
            "email": row['EMAIL'].strip(),
            "web": row['PAGINA'].strip(),
            "lat": lat,
            "lon": lon})

    if skipped:
        print(
            f"WARNING: {len(skipped)} school(s) skipped because they have no "
            f"coordinates: {', '.join(s['code'] for s in skipped)}"
        )

    with open('../../esleipenak-app/src/assets/schools.json', 'w') as f:
        json.dump(schools, f)
    with open('../../esleipenak-app/src/assets/skipped_schools.json', 'w') as f:
        json.dump(skipped, f)
    return schools


def get_all_cities_in_geojson():
    """ get all cities from geojson formatted file"""
    with open('data/cities.geojson') as f:
        cities = json.load(f)
    return cities['features']


def calculate_distance(city, school):
    """ Calculate the distance between a city and a school"""

    lon1, lat1 = city['geometry']['coordinates']
    lat2, lon2 = school['lat'], school['lon']
    url = OSMR_REQUEST.format(orig_lon=lon1, orig_lat=lat1, dest_lon=lon2, dest_lat=lat2)
    response = requests.get(url)
    if response.status_code == 200:
        return {
            "distance": response.json()['routes'][0]['distance'],
            "duration": response.json()['routes'][0]['duration'] / 60.0,
        }

    return {}


def calculate_distances_from_city_to_all_schools(city, schools):
    """ Calculate the distances from a city to all schools in schools list"""
    distances = []
    for school in schools:
        distances.append({
            "code": school['code'],
            "distances": calculate_distance(city, school)
        })
    return distances

import unicodedata

def slugify(value):
    """
    lowercase, remove spaces, replace slash with hyphen, replace accented characters with their unaccented equivalents
    """
    value = value.lower().replace(' ', '-').replace('/', '-')
    value = unicodedata.normalize('NFKD', value).encode('ascii', 'ignore').decode('ascii')
    return value

def main():
    print("Getting all schools...")
    schools = get_all_schools()
    print("Done!")
    print("Getting all cities...")
    cities = get_all_cities_in_geojson()
    print("Done!")
    print("Calculating distances...")
    city_name=''
    for city in cities:
        distances = calculate_distances_from_city_to_all_schools(city, schools)
        city_name = slugify(city['properties']['name'])
        with open(f"../../esleipenak-app/src/assets/cities_distances/{city_name}.json", 'w') as f:
            json.dump(distances, f)
        print(f"  Done! {city_name}")

if __name__ == "__main__":
    main()