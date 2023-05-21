---
tags: ['react-native', 'js']
title: Creating a cluster on a map in react native
description: In this post I will show you how to clusters on a map in react native.
pubDate: Monday, 22 May 2024
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/test.png
---

# What supercluster and how does it work? 

In cosmology, a supercluster is a large group of galaxy clusters or galaxy groups; they are among the largest known structures in the universe. The Milky Way is part of the Local Group galaxy group (which contains more than 54 galaxies), which in turn is part of the Virgo Supercluster, which is part of the Laniakea Supercluster. The large size and low density of superclusters means that they, unlike clusters, expand with the Hubble expansion. The number of superclusters in the observable universe is estimated to be 10 million.

Superclusters form massive structures of galaxies, called "filaments", "supercluster complexes", "walls" or "sheets", that may span between several hundred million light-years to 10 billion light-years, covering more than 5% of the observable universe. These are the largest structures known to date. Observations of superclusters can give information about the initial condition of the universe, when these superclusters were created.

Here is how a supercluster works:

1. Galaxies are attracted to each other by gravity.
2. As galaxies move towards each other, they collide and merge.
3. Over time, these collisions and mergers create larger and larger groups of galaxies.
4. These groups of galaxies eventually form superclusters.
5. Superclusters are held together by gravity.
6. The gravity of superclusters helps to shape the structure of the universe.

Superclusters are important because they can help us to understand the evolution of the universe. By studying superclusters, we can learn about how galaxies formed and evolved, and how the universe is structured.

Here are some interesting facts about superclusters:

* The largest supercluster known to date is the Hercules–Corona Borealis Great Wall, which is about 10 billion light-years across.
* The Milky Way is located in the Laniakea Supercluster, which is about 500 million light-years across.
* Superclusters are constantly moving and evolving.
* Superclusters are thought to be the largest structures in the universe that are held together by gravity.

Superclusters are a fascinating and important part of the universe. By studying them, we can learn more about the evolution of the universe and the structure of space.
# Why are clusters on maps useful 

Clusters on maps are useful because they can help us to visualize and understand large amounts of data. When you have a large number of markers on a map, it can be difficult to see the individual markers and the relationships between them. Clustering groups markers together based on their location, which makes it easier to see the big picture.

There are many different ways to use clusters on maps. For example, you can use clusters to visualize the distribution of population, businesses, or other types of data. You can also use clusters to identify areas of interest, such as areas with high crime rates or areas with a lot of traffic.

Here are some of the benefits of using clusters on maps:

* They can help you to visualize large amounts of data.
* They can help you to identify patterns and trends in the data.
* They can help you to make better decisions about the data.
* They can help you to communicate the data to others.

Here are some examples of how clusters on maps can be used:

* A city planner can use clusters to visualize the distribution of population and identify areas with high density.
* A business owner can use clusters to visualize the distribution of businesses and identify areas with high competition.
* A crime analyst can use clusters to visualize the distribution of crime and identify areas with high crime rates.
* A traffic engineer can use clusters to visualize the distribution of traffic and identify areas with high traffic congestion.

Clusters on maps are a powerful tool that can be used to visualize and understand large amounts of data. By using clusters, you can make better decisions, communicate the data to others, and gain a better understanding of the world around you.
```js 
 import { Text } from "react-native";
import { COLORS } from "@theme/colors";
import React, { FC, memo } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Marker } from "react-native-maps";

interface ClusterMarkerProps {
	geometry: any,
	properties: any,
	onPress: () => void,
	tracksViewChanges: boolean
}

const ClusterMarker: FC<ClusterMarkerProps> = ({ geometry, properties, onPress, tracksViewChanges }) => {
	const points = properties.point_count;

	return (
		<Marker
			key={`${geometry.coordinates[0]}_${geometry.coordinates[1]}`}
			coordinate={{
				longitude: geometry.coordinates[0],
				latitude: geometry.coordinates[1],
			}}
			style={{ zIndex: points + 1 }}
			onPress={onPress}
			tracksViewChanges={tracksViewChanges}
		>
			<TouchableOpacity activeOpacity={0.5} style={styles.container}>
				<View style={styles.cluster}>
					<Text style={styles.text}>{points}</Text>
				</View>
			</TouchableOpacity>
		</Marker>
	);
}; 
 ```

The code provided is a React Native component that renders a marker on a map. The component takes four props:

* `geometry`: The geometry of the marker, which is an object with the following properties:
    * `coordinates`: The coordinates of the marker, which is an array of two numbers: the longitude and the latitude.
* `properties`: The properties of the marker, which is an object with any additional information you want to associate with the marker.
* `onPress`: A function that is called when the marker is pressed.
* `tracksViewChanges`: A boolean that specifies whether the marker should be updated when the map view changes.

The component renders a `Marker` component with the following properties:

* `key`: A unique identifier for the marker.
* `coordinate`: The coordinates of the marker.
* `style`: The style of the marker.
* `onPress`: The function that is called when the marker is pressed.
* `tracksViewChanges`: A boolean that specifies whether the marker should be updated when the map view changes.

The component also renders a `TouchableOpacity` component with the following properties:

* `activeOpacity`: The opacity of the component when it is pressed.
* `style`: The style of the component.

The `TouchableOpacity` component renders a `View` component with the following properties:

* `style`: The style of the component.

The `View` component renders a `Text` component with the following properties:

* `style`: The style of the text.

The text in the `Text` component displays the number of markers that are in the cluster.

The `ClusterMarker` component is a useful tool for visualizing large amounts of data on a map. By using this component, you can easily create markers that represent groups of markers. This can help you to see the big picture and identify areas of interest.

We can add styles and a default export to the ClusterMarker.tsx file

```js 
 import React, { forwardRef, memo, useEffect, useMemo, useRef, useState } from "react";
import { Dimensions, LayoutAnimation, LayoutAnimationConfig, Platform } from "react-native";
import MapView, { Details, Region } from "react-native-maps";
import SuperCluster from "supercluster";
import ClusterMarker from "./ClusterMarker";
import {
	calculateBBox,
	markerToGeoJSONFeature,
	returnMapZoom,
	getSearchRadiusFromPresets,
	getRegionForCoordinates
} from "./helpers";

interface ClusteredMapViewProps {
	children: React.ReactNode,
	clusteringEnabled: boolean,
	animationEnabled: boolean,
	preserveClusterPressBehavior: boolean,
	layoutAnimationConf: LayoutAnimationConfig,
	tracksViewChanges: boolean,
	// SuperCluster parameters
	radius: number,
	maxZoom: number,
	minZoom: number,
	minPoints: number,
	extent: number,
	nodeSize: number,
	// Callbacks
	onRegionChangeComplete: (e: Region) => Promise<void>,
	onClusterPress: (cluster, children: React.ReactNode) => void,
	onMarkersChange: () => void,
	mapRef: () => void,
} 
 ```

The code  provided is an interface for a React Native component that renders a map with clustering capabilities. The interface takes the following props:

* `children`: The children of the component, which can be any React Native component.
* `clusteringEnabled`: A boolean that specifies whether clustering is enabled.
* `animationEnabled`: A boolean that specifies whether animation is enabled when markers are clustered or unclustered.
* `preserveClusterPressBehavior`: A boolean that specifies whether the press behavior of clusters should be preserved when they are unclustered.
* `layoutAnimationConf`: A `LayoutAnimationConfig` object that specifies the animation configuration for when markers are clustered or unclustered.
* `tracksViewChanges`: A boolean that specifies whether the component should be updated when the map view changes.
* `radius`: The radius of the clusters, in meters.
* `maxZoom`: The maximum zoom level at which clustering is enabled.
* `minZoom`: The minimum zoom level at which clustering is enabled.
* `minPoints`: The minimum number of markers required to form a cluster.
* `extent`: The extent of the map, in meters.
* `nodeSize`: The size of the nodes in the cluster tree, in pixels.
* `onRegionChangeComplete`: A function that is called when the region of the map changes.
* `onClusterPress`: A function that is called when a cluster is pressed.
* `onMarkersChange`: A function that is called when the markers change.
* `mapRef`: A reference to the `MapView` component.

The component renders a `MapView` component with the following properties:

* `children`: The children of the component.
* `clusteringEnabled`: A boolean that specifies whether clustering is enabled.
* `animationEnabled`: A boolean that specifies whether animation is enabled when markers are clustered or unclustered.
* `preserveClusterPressBehavior`: A boolean that specifies whether the press behavior of clusters should be preserved when they are unclustered.
* `layoutAnimationConf`: A `LayoutAnimationConfig` object that specifies the animation configuration for when markers are clustered or unclustered.
* `tracksViewChanges`: A boolean that specifies whether the component should be updated when the map view changes.
* `radius`: The radius of the clusters, in meters.
* `maxZoom`: The maximum zoom level at which clustering is enabled.
* `minZoom`: The minimum zoom level at which clustering is enabled.
* `minPoints`: The minimum number of markers required to form a cluster.
* `extent`: The extent of the map, in meters.
* `nodeSize`: The size of the nodes in the cluster tree, in pixels.
* `onRegionChangeComplete`: A function that is called when the region of the map changes.
* `onClusterPress`: A function that is called when a cluster is pressed.
* `onMarkersChange`: A function that is called when the markers change.

The component also renders a `SuperCluster` component with the following properties:

* `data`: The data for the clusters.
* `radius`: The radius of the clusters, in meters.
* `maxZoom`: The maximum zoom level at which clustering is enabled.
* `minZoom`: The minimum zoom level at which clustering is enabled.
* `minPoints`: The minimum number of markers required to form a cluster.
* `extent`: The extent of the map, in meters.
* `nodeSize`: The size of the nodes in the cluster tree, in pixels.

The `SuperCluster` component uses the `radius` prop to cluster markers that are within a certain distance of each other. The `maxZoom` and `minZoom` props specify the maximum and minimum zoom levels at which clustering is enabled. The `minPoints` prop specifies the minimum number of markers required to form a cluster. The `extent` prop specifies the extent of the map, in meters. The `nodeSize` prop specifies the size of the nodes in the cluster tree, in pixels.

The `ClusteredMapView` component is a useful tool for visualizing large amounts of data on a map. By using this component, you can easily create a map with clusters of markers. This can help you to see the big picture and identify areas of interest.

```js 
 const ClusteredMapView = forwardRef(
	(
		{
			radius,
			maxZoom,
			minZoom,
			minPoints,
			extent,
			nodeSize,
			children,
			onClusterPress,
			onRegionChangeComplete,
			onMarkersChange,
			preserveClusterPressBehavior,
			clusteringEnabled,
			layoutAnimationConf,
			animationEnabled,
			tracksViewChanges,
			...restProps
		}: ClusteredMapViewProps,
		ref,
	) => {
		const [markers, updateMarkers] = useState([]);
		const [otherChildren, updateChildren] = useState<React.ReactNode>();
		const [superCluster, setSuperCluster] = useState(null);
		const [currentRegion, updateRegion] = useState<Region>(restProps.region || restProps.initialRegion);

		const mapRef = useRef();

		let propsChildren = [];

		if (children) {
			propsChildren = useMemo(() => React.Children.toArray(children), [children]);
		}

		useEffect(() => {
			const rawData = [];
			const otherChildren = [];

			if (!clusteringEnabled) {
				updateMarkers([]);
				updateChildren(propsChildren);
				setSuperCluster(null);
				return;
			}

			propsChildren.forEach((child, index) => {
				if (child.props.coordinates) { // child is a marker
					rawData.push(markerToGeoJSONFeature(child, index));
				} else {
					otherChildren.push(child);
				}
			});

			const superCluster = new SuperCluster({
				radius,
				maxZoom,
				minZoom,
				minPoints,
				extent,
				nodeSize,
			});

			superCluster.load(rawData);

			const bBox = calculateBBox(currentRegion);
			const zoom = returnMapZoom(currentRegion, bBox, minZoom);
			const markers = superCluster.getClusters(bBox, zoom);

			updateMarkers(markers);
			updateChildren(otherChildren);
			setSuperCluster(superCluster);
		}, [propsChildren, clusteringEnabled]);

		const _onRegionChangeComplete = (region: Region, details: Details) => {
			if (superCluster && region) {
				const bBox = calculateBBox(region);
				const zoom = returnMapZoom(region, bBox, minZoom);

				const markers = superCluster.getClusters(bBox, zoom);

				if (animationEnabled && Platform.OS === "ios") {
					LayoutAnimation.configureNext(layoutAnimationConf);
				}

				updateMarkers(markers);
				onMarkersChange(markers);
				onRegionChangeComplete(region, details, markers);
				updateRegion(region);
			} else {
				onRegionChangeComplete(region, details);
			}
		};

		const _onClusterPress = (cluster) => () => {
			const children = superCluster.getLeaves(cluster.id, Infinity);

			if (preserveClusterPressBehavior) {
				onClusterPress(cluster, children);
				return;
			}

			const coordinates = children.map(({ geometry }) => ({
				latitude: geometry.coordinates[1],
				longitude: geometry.coordinates[0],
			}));

			const newRegion = getRegionForCoordinates(coordinates);
			const zoomOutFactor = 1.25; // arbitrary value

			// increase delta so the map is a bit zoomed out
			// otherwise markers might appear at the edges of the screen
			newRegion.latitudeDelta = newRegion.latitudeDelta * zoomOutFactor;
			newRegion.longitudeDelta = newRegion.longitudeDelta * zoomOutFactor;

			mapRef.current.animateToRegion(newRegion);

			const radiusInMiles = newRegion.latitudeDelta * 69;
			const searchRadius = getSearchRadiusFromPresets(radiusInMiles);

			onClusterPress(newRegion, searchRadius)
		};

		return (
			<MapView
				{...restProps}
				ref={(map) => {
					mapRef.current = map;
					if (ref) ref.current = map;
					restProps.mapRef(map);
				}}
				onRegionChangeComplete={_onRegionChangeComplete}
			>
				{markers.map((marker) =>
					marker.properties.point_count === 0 ? (
						propsChildren[marker.properties.index]
					) : (
						<ClusterMarker
							key={`cluster-${marker.id}`}
							{...marker}
							onPress={_onClusterPress(marker)}
							tracksViewChanges={tracksViewChanges}
						/>
					)
				)}

				{otherChildren}

			</MapView>
		);
	},
); 
 ```

The code provided is a React Native component that renders a map with clustering capabilities. The component takes the following props:

* `radius`: The radius of the clusters, in meters.
* `maxZoom`: The maximum zoom level at which clustering is enabled.
* `minZoom`: The minimum zoom level at which clustering is enabled.
* `minPoints`: The minimum number of markers required to form a cluster.
* `extent`: The extent of the map, in meters.
* `nodeSize`: The size of the nodes in the cluster tree, in pixels.
* `children`: The children of the component, which can be any React Native component.
* `onClusterPress`: A function that is called when a cluster is pressed.
* `onRegionChangeComplete`: A function that is called when the region of the map changes.
* `onMarkersChange`: A function that is called when the markers change.
* `preserveClusterPressBehavior`: A boolean that specifies whether the press behavior of clusters should be preserved when they are unclustered.
* `clusteringEnabled`: A boolean that specifies whether clustering is enabled.
* `layoutAnimationConf`: A `LayoutAnimationConfig` object that specifies the animation configuration for when markers are clustered or unclustered.
* `animationEnabled`: A boolean that specifies whether animation is enabled when markers are clustered or unclustered.
* `tracksViewChanges`: A boolean that specifies whether the component should be updated when the map view changes.
* `mapRef`: A reference to the `MapView` component.

The component renders a `MapView` component with the following properties:

* `children`: The children of the component.
* `clusteringEnabled`: A boolean that specifies whether clustering is enabled.
* `animationEnabled`: A boolean that specifies whether animation is enabled when markers are clustered or unclustered.
* `preserveClusterPressBehavior`: A boolean that specifies whether the press behavior of clusters should be preserved when they are unclustered.
* `layoutAnimationConf`: A `LayoutAnimationConfig` object that specifies the animation configuration for when markers are clustered or unclustered.
* `tracksViewChanges`: A boolean that specifies whether the component should be updated when the map view changes.
* `radius`: The radius of the clusters, in meters.
* `maxZoom`: The maximum zoom level at which clustering is enabled.
* `minZoom`: The minimum zoom level at which clustering is enabled.
* `minPoints`: The minimum number of markers required to form a cluster.
* `extent`: The extent of the map, in meters.
* `nodeSize`: The size of the nodes in the cluster tree, in pixels.
* `onRegionChangeComplete`: A function that is called when the region of the map changes.
* `onClusterPress`: A function that is called when a cluster is pressed.
* `onMarkersChange`: A function that is called when the markers change.

The component also renders a `SuperCluster` component with the following properties:

* `data`: The data for the clusters.
* `radius`: The radius of the clusters, in meters.
* `maxZoom`: The maximum zoom level at which clustering is enabled.
* `minZoom`: The minimum zoom level at which clustering is enabled.
* `minPoints`: The minimum number of markers required to form a cluster.
* `extent`: The extent of the map, in meters.
* `nodeSize`: The size of the nodes in the cluster tree, in pixels.

The `SuperCluster` component uses the `radius` prop to cluster markers that are within a certain distance of each other. The `maxZoom` and `minZoom` props specify the maximum and minimum zoom levels at which clustering is enabled. The `minPoints` prop specifies the minimum number of markers required to form a cluster. The `extent` prop specifies the extent of the map, in meters. The `nodeSize` prop specifies the size of the nodes in the cluster tree, in pixels.

The `ClusteredMapView` component is a useful tool for visualizing large amounts of data on a map. By using this component, you can easily create a map with clusters of markers. This can help you to see the big picture and identify areas of interest.

```js 
 ClusteredMapView.defaultProps = {
	clusteringEnabled: true,
	animationEnabled: true,
	preserveClusterPressBehavior: false,
	layoutAnimationConf: LayoutAnimation.Presets.spring,
	tracksViewChanges: false,
	// SuperCluster parameters
	radius: Dimensions.get("window").width * 0.06,
	maxZoom: 20,
	minZoom: 1,
	minPoints: 2,
	extent: 512,
	nodeSize: 64,
	// Map parameters
	// Callbacks
	onRegionChangeComplete: () => { },
	onClusterPress: () => { },
	onMarkersChange: () => { },
	mapRef: () => { },
};
 
 ```

The code you provided is the default props for the `ClusteredMapView` component. The default props are used when the component is created without any props.

The following are the default props for the `ClusteredMapView` component:

* `clusteringEnabled`: A boolean that specifies whether clustering is enabled. The default value is `true`.
* `animationEnabled`: A boolean that specifies whether animation is enabled when markers are clustered or unclustered. The default value is `true`.
* `preserveClusterPressBehavior`: A boolean that specifies whether the press behavior of clusters should be preserved when they are unclustered. The default value is `false`.
* `layoutAnimationConf`: A `LayoutAnimationConfig` object that specifies the animation configuration for when markers are clustered or unclustered. The default value is `LayoutAnimation.Presets.spring`.
* `tracksViewChanges`: A boolean that specifies whether the component should be updated when the map view changes. The default value is `false`.
* `radius`: The radius of the clusters, in meters. The default value is `Dimensions.get("window").width * 0.06`.
* `maxZoom`: The maximum zoom level at which clustering is enabled. The default value is `20`.
* `minZoom`: The minimum zoom level at which clustering is enabled. The default value is `1`.
* `minPoints`: The minimum number of markers required to form a cluster. The default value is `2`.
* `extent`: The extent of the map, in meters. The default value is `512`.
* `nodeSize`: The size of the nodes in the cluster tree, in pixels. The default value is `64`.
* `onRegionChangeComplete`: A function that is called when the region of the map changes. The default value is an empty function.
* `onClusterPress`: A function that is called when a cluster is pressed. The default value is an empty function.
* `onMarkersChange`: A function that is called when the markers change. The default value is an empty function.
* `mapRef`: A reference to the `MapView` component. The default value is an empty function.

The default props can be overridden when the component is created by passing in props with the desired values.

```js 
 import GeoViewport from "@mapbox/geo-viewport";
import { Dimensions } from "react-native";
import { distancePresets } from "@screens/book/SearchResults";

const { width, height } = Dimensions.get("window");

export const calculateBBox = (region) => {
	let lngD;
	if (region.longitudeDelta < 0) lngD = region.longitudeDelta + 360;
	else lngD = region.longitudeDelta;

	return [
		region.longitude - lngD, // westLng - min lng
		region.latitude - region.latitudeDelta, // southLat - min lat
		region.longitude + lngD, // eastLng - max lng
		region.latitude + region.latitudeDelta, // northLat - max lat
	];
};

export const returnMapZoom = (region, bBox, minZoom) => {
	const viewport =
		region.longitudeDelta >= 40
			? { zoom: minZoom }
			: GeoViewport.viewport(bBox, [width, height]);

	return viewport.zoom;
};

export const markerToGeoJSONFeature = (marker, index) => {
	return {
		type: "Feature",
		geometry: {
			coordinates: [
				marker.props.coordinates.longitude,
				marker.props.coordinates.latitude,
			],
			type: "Point",
		},
		properties: {
			point_count: 0,
			index,
		},
	};
};

const _removeChildrenFromProps = (props) => {
	const newProps = {};
	Object.keys(props).forEach((key) => {
		if (key !== "children") {
			newProps[key] = props[key];
		}
	});
	return newProps;
};

export const getSearchRadiusFromPresets = (radiusInMiles) => {
	let radius = distancePresets[distancePresets.length - 1];

	for (const distancePreset of distancePresets) {
		if (distancePreset >= radiusInMiles) {
			radius = distancePreset;
			break;
		}
	}

	return radius;
}

export function getRegionForCoordinates(points) {
	// points should be an array of { latitude: X, longitude: Y }
	let minX, maxX, minY, maxY;

	// init first point
	((point) => {
		minX = point.latitude;
		maxX = point.latitude;
		minY = point.longitude;
		maxY = point.longitude;
	})(points[0]);

	// calculate rect
	points.map((point) => {
		minX = Math.min(minX, point.latitude);
		maxX = Math.max(maxX, point.latitude);
		minY = Math.min(minY, point.longitude);
		maxY = Math.max(maxY, point.longitude);
	});

	const midX = (minX + maxX) / 2;
	const midY = (minY + maxY) / 2;
	const deltaX = (maxX - minX);
	const deltaY = (maxY - minY);

	return {
		latitude: midX,
		longitude: midY,
		latitudeDelta: deltaX,
		longitudeDelta: deltaY
	};
} 
 ```

The code provided is a set of functions that are useful for working with maps. The functions include:

* `calculateBBox()`: Calculates the bounding box of a region.
* `returnMapZoom()`: Returns the zoom level for a region.
* `markerToGeoJSONFeature()`: Converts a marker to a GeoJSON feature.
* `_removeChildrenFromProps()`: Removes the `children` prop from an object.
* `getSearchRadiusFromPresets()`: Gets the search radius from a preset.
* `getRegionForCoordinates()`: Gets the region for a set of coordinates.

These functions can be used to create maps, cluster markers, and get information about maps.

