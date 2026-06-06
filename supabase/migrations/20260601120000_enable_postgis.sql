-- Story 1.2: Enable PostGIS for territory polygons and spatial knock queries (Epic 6+)
create extension if not exists postgis with schema extensions;
