/// <reference types="google.maps" />
/** @preserve OverlappingMarkerSpiderfier
 * https://github.com/jawj/OverlappingMarkerSpiderfier
 * Copyright (c) 2011 - 2017 George MacKerron
 * Released under the MIT licence: http://opensource.org/licenses/mit-license
 */
import { LegColorOptions, SpiderOptions } from './oms-types';
export declare class MarkerStatus {
    static readonly SPIDERFIED: string;
    static readonly SPIDERFIABLE: string;
    static readonly UNSPIDERFIABLE: string;
    static readonly UNSPIDERFIED: string;
}
export declare class OverlappingMarkerSpiderfier implements SpiderOptions {
    private map;
    private readonly spiderfiedZIndex;
    private readonly highlightedLegZIndex;
    private readonly usualLegZIndex;
    static readonly markerStatus: typeof MarkerStatus;
    private projectionHelper;
    private listeners;
    private markers;
    private markerListenerRefs;
    private formatTimeoutId;
    private formatIdleListener;
    private spiderfied;
    private spiderfying;
    private unspiderfying;
    legColors: LegColorOptions;
    markersWontHide: boolean;
    markersWontMove: boolean;
    basicFormatEvents: boolean;
    keepSpiderfied: boolean;
    ignoreMapClick: boolean;
    nearbyDistance: number;
    circleSpiralSwitchover: number;
    circleFootSeparation: number;
    circleStartAngle: number;
    spiralFootSeparation: number;
    spiralLengthStart: number;
    spiralLengthFactor: number;
    legWeight: number;
    readonly VERSION: string;
    private static optionAttributes;
    private doFormatMarkers();
    private formatMarkers();
    private generatePtsCircle(count, centerPt);
    private generatePtsSpiral(count, centerPt);
    private initMarkerArrays();
    private llToPt(ll);
    private makeHighlightListenerFuncs(marker);
    private markerChangeListener(marker, positionChanged);
    private markerProximityData();
    private static minExtract(set, callback);
    private static ptAverage(points);
    private static ptDistanceSq(pt1, pt2);
    private ptToLl(pt);
    private spiderfy(markerData, nonNearbyMarkers);
    private spiderListener(marker, event);
    private trigger(eventName, ...args);
    addMarker(marker: google.maps.Marker, spiderClickHandler: Function): OverlappingMarkerSpiderfier;
    trackMarker(marker: any, spiderClickHandler: Function): OverlappingMarkerSpiderfier;
    removeMarker(marker: any): this;
    forgetMarker(marker: any): this;
    removeAllMarkers(): this;
    forgetAllMarkers(): this;
    getMarkers(): google.maps.Marker[];
    addListener(eventName: 'click' | 'spiderfy' | 'unspiderfy' | 'format', listener: Function): this;
    removeListener(eventName: 'click' | 'spiderfy' | 'unspiderfy' | 'format', listener: Function): this;
    clearListeners(eventName: 'click' | 'spiderfy' | 'unspiderfy' | 'format'): this;
    markersNearMarker(marker: any, firstOnly?: boolean): google.maps.Marker[];
    markersNearAnyOtherMarker(): google.maps.Marker[];
    unspiderfy(markerNotToMove?: any): this;
    constructor(map: google.maps.Map, options?: SpiderOptions);
}
