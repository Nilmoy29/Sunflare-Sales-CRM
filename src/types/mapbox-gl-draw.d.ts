declare module "@mapbox/mapbox-gl-draw" {
  import type { IControl, Map } from "mapbox-gl";

  export default class MapboxDraw implements IControl {
    constructor(options?: {
      displayControlsDefault?: boolean;
      controls?: {
        polygon?: boolean;
        trash?: boolean;
        point?: boolean;
        line_string?: boolean;
        combine_features?: boolean;
        uncombine_features?: boolean;
      };
      defaultMode?: string;
    });
    onAdd(map: Map): HTMLElement;
    onRemove(map: Map): void;
    getAll(): GeoJSON.FeatureCollection;
    deleteAll(): void;
    changeMode(mode: string): void;
    add(geojson: GeoJSON.Feature): string[];
    delete(ids: string | string[]): void;
  }
}
