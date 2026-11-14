---
tags: ['react-native', 'js', 'typescript']
title: Clustering map markers in React Native with supercluster
description: "Build a clustered MapView for react-native-maps with supercluster: group nearby markers, show a count bubble, and zoom in when a cluster is tapped."
pubDate: Monday, 22 May 2024
lastUpdated: 2026-11-14
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/3793215953.webp
---

When a map has hundreds of markers, they overlap into an unreadable blob and every custom marker view costs render time. Clustering replaces nearby markers with a single bubble showing how many points it holds, and splits the bubble apart as the user zooms in.

[supercluster](https://github.com/mapbox/supercluster) does the clustering. You load it with GeoJSON points once, then ask it for the clusters inside a bounding box at a given zoom level. It builds a KD-tree index per zoom level, so those queries are cheap enough to run on every region change. This post wraps it in a `ClusteredMapView` component for [react-native-maps](https://github.com/react-native-maps/react-native-maps).

The structure follows [react-native-map-clustering](https://github.com/tomekvenits/react-native-map-clustering), which ships the same approach as a ready-made package. Use that if you don't need to customise the component.

## Install

```bash
npm install react-native-maps supercluster @mapbox/geo-viewport
npm install --save-dev @types/mapbox__geo-viewport
```

supercluster (9.1.0 at the time of writing) ships its own TypeScript types. `@mapbox/geo-viewport` (0.5.0) converts a bounding box and screen size into a map zoom level.

## The cluster marker

Each cluster is drawn as a `Marker` with a custom view showing the point count.

```tsx
// ClusterMarker.tsx
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { LatLng, Marker } from "react-native-maps";

type ClusterMarkerProps = {
  coordinate: LatLng;
  count: number;
  onPress: () => void;
  tracksViewChanges: boolean;
};

export default function ClusterMarker({
  coordinate,
  count,
  onPress,
  tracksViewChanges,
}: ClusterMarkerProps) {
  return (
    <Marker
      coordinate={coordinate}
      onPress={onPress}
      tracksViewChanges={tracksViewChanges}
      style={{ zIndex: count + 1 }}
    >
      <View style={styles.cluster}>
        <Text style={styles.text}>{count}</Text>
      </View>
    </Marker>
  );
}

const styles = StyleSheet.create({
  cluster: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "white",
    backgroundColor: "#1e88e5",
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    color: "white",
    fontWeight: "600",
  },
});
```

Handle presses with the `Marker`'s `onPress` rather than wrapping the view in a `TouchableOpacity`: touchables inside a custom marker view don't reliably receive presses, especially on Android.

## Helpers

These convert between react-native-maps regions and what supercluster expects.

```ts
// helpers.ts
import geoViewport from "@mapbox/geo-viewport";
import { Dimensions } from "react-native";
import type { LatLng, Region } from "react-native-maps";
import type { PointFeature } from "supercluster";

export type PointProps = { index: number };

const { width, height } = Dimensions.get("window");

// [westLng, southLat, eastLng, northLat], the order supercluster uses.
// latitudeDelta/longitudeDelta are the full span of the visible region.
export const calculateBBox = (region: Region): [number, number, number, number] => [
  region.longitude - region.longitudeDelta / 2,
  region.latitude - region.latitudeDelta / 2,
  region.longitude + region.longitudeDelta / 2,
  region.latitude + region.latitudeDelta / 2,
];

export const returnMapZoom = (
  region: Region,
  bBox: [number, number, number, number],
  minZoom: number,
): number => {
  // Zoomed far out, geo-viewport's answer isn't useful, so fall back to minZoom.
  if (region.longitudeDelta >= 40) return minZoom;
  return geoViewport.viewport(bBox, [width, height]).zoom;
};

// The index lets us map a point back to the child <Marker> it came from.
export const markerToGeoJSONFeature = (
  coordinate: LatLng,
  index: number,
): PointFeature<PointProps> => ({
  type: "Feature",
  geometry: {
    type: "Point",
    coordinates: [coordinate.longitude, coordinate.latitude],
  },
  properties: { index },
});

export const getRegionForCoordinates = (points: LatLng[]): Region => {
  const lats = points.map((p) => p.latitude);
  const lngs = points.map((p) => p.longitude);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: maxLat - minLat,
    longitudeDelta: maxLng - minLng,
  };
};
```

`viewport()` returns `{ center, zoom }` and rounds the zoom to an integer by default, which is what `getClusters` expects.

## The clustered map view

`ClusteredMapView` takes ordinary `<Marker>` children. Any child with a `coordinate` prop is fed to supercluster; everything else (polylines, overlays) is rendered as-is. On each region change it asks supercluster for the clusters in view and renders either the original marker or a `ClusterMarker`.

```tsx
// ClusteredMapView.tsx
import React, { forwardRef, useEffect, useMemo, useRef, useState } from "react";
import {
  Dimensions,
  LayoutAnimation,
  LayoutAnimationConfig,
  Platform,
} from "react-native";
import MapView, { Details, LatLng, MapViewProps, Region } from "react-native-maps";
import Supercluster, { type PointFeature } from "supercluster";
import ClusterMarker from "./ClusterMarker";
import {
  PointProps,
  calculateBBox,
  getRegionForCoordinates,
  markerToGeoJSONFeature,
  returnMapZoom,
} from "./helpers";

type MapItem = ReturnType<Supercluster<PointProps>["getClusters"]>[number];

type ClusteredMapViewProps = MapViewProps & {
  children?: React.ReactNode;
  clusteringEnabled?: boolean;
  animationEnabled?: boolean;
  // If true, tapping a cluster only calls onClusterPress and doesn't zoom.
  preserveClusterPressBehavior?: boolean;
  layoutAnimationConf?: LayoutAnimationConfig;
  tracksViewChanges?: boolean;
  // supercluster options
  radius?: number;
  maxZoom?: number;
  minZoom?: number;
  minPoints?: number;
  extent?: number;
  nodeSize?: number;
  onClusterPress?: (clusterId: number, leaves: PointFeature<PointProps>[]) => void;
  onMarkersChange?: (markers: MapItem[]) => void;
};

const noop = () => {};

const ClusteredMapView = forwardRef<MapView, ClusteredMapViewProps>(
  (
    {
      clusteringEnabled = true,
      animationEnabled = true,
      preserveClusterPressBehavior = false,
      layoutAnimationConf = LayoutAnimation.Presets.spring,
      tracksViewChanges = false,
      radius = Dimensions.get("window").width * 0.06,
      maxZoom = 20,
      minZoom = 1,
      minPoints = 2,
      extent = 512,
      nodeSize = 64,
      onClusterPress = noop,
      onMarkersChange = noop,
      onRegionChangeComplete = noop,
      children,
      ...restProps
    },
    ref,
  ) => {
    const mapRef = useRef<MapView | null>(null);
    const [markers, setMarkers] = useState<MapItem[]>([]);
    const [otherChildren, setOtherChildren] = useState<React.ReactNode[]>([]);
    const [superCluster, setSuperCluster] = useState<Supercluster<PointProps> | null>(null);
    const [currentRegion, setCurrentRegion] = useState<Region | undefined>(
      restProps.region ?? restProps.initialRegion,
    );

    const propsChildren = useMemo(() => React.Children.toArray(children), [children]);

    // Rebuild the index when the markers or clustering options change.
    useEffect(() => {
      if (!clusteringEnabled) {
        setMarkers([]);
        setOtherChildren(propsChildren);
        setSuperCluster(null);
        return;
      }

      const rawData: PointFeature<PointProps>[] = [];
      const nonMarkers: React.ReactNode[] = [];

      propsChildren.forEach((child, index) => {
        if (React.isValidElement<{ coordinate?: LatLng }>(child) && child.props.coordinate) {
          rawData.push(markerToGeoJSONFeature(child.props.coordinate, index));
        } else {
          nonMarkers.push(child);
        }
      });

      const index = new Supercluster<PointProps>({
        radius,
        maxZoom,
        minZoom,
        minPoints,
        extent,
        nodeSize,
      });
      index.load(rawData);

      if (currentRegion) {
        const bBox = calculateBBox(currentRegion);
        setMarkers(index.getClusters(bBox, returnMapZoom(currentRegion, bBox, minZoom)));
      }
      setOtherChildren(nonMarkers);
      setSuperCluster(index);
      // currentRegion is deliberately left out: region changes are handled below.
    }, [propsChildren, clusteringEnabled, radius, maxZoom, minZoom, minPoints, extent, nodeSize]);

    const handleRegionChangeComplete = (region: Region, details: Details) => {
      if (superCluster) {
        const bBox = calculateBBox(region);
        const next = superCluster.getClusters(bBox, returnMapZoom(region, bBox, minZoom));

        if (animationEnabled && Platform.OS === "ios") {
          LayoutAnimation.configureNext(layoutAnimationConf);
        }

        setMarkers(next);
        setCurrentRegion(region);
        onMarkersChange(next);
      }
      onRegionChangeComplete(region, details);
    };

    const handleClusterPress = (clusterId: number) => () => {
      if (!superCluster) return;
      const leaves = superCluster.getLeaves(clusterId, Infinity);

      if (!preserveClusterPressBehavior) {
        const region = getRegionForCoordinates(
          leaves.map(({ geometry }) => ({
            latitude: geometry.coordinates[1],
            longitude: geometry.coordinates[0],
          })),
        );
        // Zoom out a little so markers don't sit on the screen edge, and keep a
        // minimum span in case every point in the cluster has the same coordinate.
        const zoomOutFactor = 1.25;
        mapRef.current?.animateToRegion({
          ...region,
          latitudeDelta: Math.max(region.latitudeDelta * zoomOutFactor, 0.005),
          longitudeDelta: Math.max(region.longitudeDelta * zoomOutFactor, 0.005),
        });
      }

      onClusterPress(clusterId, leaves);
    };

    return (
      <MapView
        {...restProps}
        ref={(map) => {
          mapRef.current = map;
          if (typeof ref === "function") ref(map);
          else if (ref) ref.current = map;
        }}
        onRegionChangeComplete={handleRegionChangeComplete}
      >
        {markers.map((marker) => {
          const props = marker.properties;

          if (!("cluster_id" in props)) {
            // A single point: render the original <Marker> child.
            return propsChildren[props.index];
          }

          return (
            <ClusterMarker
              key={`cluster-${props.cluster_id}`}
              coordinate={{
                latitude: marker.geometry.coordinates[1],
                longitude: marker.geometry.coordinates[0],
              }}
              count={props.point_count}
              onPress={handleClusterPress(props.cluster_id)}
              tracksViewChanges={tracksViewChanges}
            />
          );
        })}

        {otherChildren}
      </MapView>
    );
  },
);

export default ClusteredMapView;
```

Defaults are set with destructuring rather than `ClusteredMapView.defaultProps`, because React 19 no longer supports `defaultProps` on function components.

What the supercluster options mean (from its README):

- `radius`: cluster radius in **pixels** (supercluster's own default is 40). The default above scales it to 6% of the screen width.
- `minZoom` / `maxZoom`: the zoom range in which clusters are generated. Beyond `maxZoom` every point is shown individually.
- `minPoints`: how many points it takes to form a cluster.
- `extent`: tile extent; `radius` is calculated relative to it. Leave it at 512.
- `nodeSize`: KD-tree leaf size. It only affects indexing performance.

## Using it

```tsx
import React from "react";
import { Marker } from "react-native-maps";
import ClusteredMapView from "./ClusteredMapView";

type Store = { id: string; lat: number; lng: number };

const INITIAL_REGION = {
  latitude: 43.65,
  longitude: -79.38,
  latitudeDelta: 0.5,
  longitudeDelta: 0.5,
};

export default function StoresMap({ stores }: { stores: Store[] }) {
  return (
    <ClusteredMapView style={{ flex: 1 }} initialRegion={INITIAL_REGION}>
      {stores.map((store) => (
        <Marker
          key={store.id}
          coordinate={{ latitude: store.lat, longitude: store.lng }}
        />
      ))}
    </ClusteredMapView>
  );
}
```

## Gotchas

- Pass `region` or `initialRegion`. Without one, the component has no bounding box to query, and no markers appear until the first `onRegionChangeComplete`.
- Markers are identified by their `coordinate` prop (singular, as in react-native-maps). A wrapper component that takes `lat`/`lng` instead won't be clustered.
- supercluster's index is immutable once loaded, so any change to the children rebuilds it. Memoise the marker list if the parent re-renders often.
- Keep `tracksViewChanges` off where you can. The react-native-maps docs recommend it for custom marker performance.
- The bounding box is exactly the visible region, so markers just off-screen appear only after the pan finishes. Pad `calculateBBox` if that bothers you.

## Further reading

- [supercluster README](https://github.com/mapbox/supercluster)
- [react-native-maps MapView and Marker docs](https://github.com/react-native-maps/react-native-maps/tree/master/docs)
- [react-native-map-clustering](https://github.com/tomekvenits/react-native-map-clustering)
