# Esleipenak

## osrm-backend

This folder contains the osrm-backend docker image and the data generation scripts.

### Contents

- data_generation: contains the data generation scripts
  - data: contains cities.geojson (from [this Overpass turbo query](https://overpass-turbo.eu/s/28z5) ) and dirgennouniv.csv (from [Open Data Euskadi](https://opendata.euskadi.eus/katalogoa/-/unibertsitatez-kanpoko-ikastetxeak/)) files
- osrm: contains the data for the osrm-backend

### Generation

It's mandatory to start the osrm-backend docker image before running the data generation script. You will need to have at least the pais-vasco-latest.osrm file in the osrm folder. You van download it from [here](https://download.geofabrik.de/europe/spain.html).

#### Docker

First run the docker image:

```bash
cd osrm-backend
docker-compose up
```

#### Data generation

then run the data generation script:

```bash
cd osrm-backend/data_generation
python3 generate_distances.py
```

This will generate the distances between all schools and all cities in the data folder.
