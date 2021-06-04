define(['exports'], function (exports) { 'use strict';

var __extends = (window && window.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var MarkerStatus = /** @class */ (function () {
    function MarkerStatus() {
    }
    // universal status
    MarkerStatus.SPIDERFIED = 'SPIDERFIED';
    // statuses reported under standard regine
    MarkerStatus.SPIDERFIABLE = 'SPIDERFIABLE';
    MarkerStatus.UNSPIDERFIABLE = 'UNSPIDERFIABLE';
    // status reported under simple status update regime only
    MarkerStatus.UNSPIDERFIED = 'UNSPIDERFIED';
    return MarkerStatus;
}());
var OverlappingMarkerSpiderfier = /** @class */ (function () {
    function OverlappingMarkerSpiderfier(map, options) {
        if (options === void 0) { options = {}; }
        var _this = this;
        this.map = map;
        this.spiderfiedZIndex = google.maps.Marker.MAX_ZINDEX + 20000;
        this.highlightedLegZIndex = google.maps.Marker.MAX_ZINDEX + 10000;
        this.usualLegZIndex = google.maps.Marker.MAX_ZINDEX + 1;
        this.markers = [];
        this.markerListenerRefs = [];
        this.spiderfied = false;
        this.spiderfying = false;
        this.unspiderfying = false;
        this.legColors = {
            highlighted: (_a = {}, _a[google.maps.MapTypeId.HYBRID] = '#f00', _a[google.maps.MapTypeId.ROADMAP] = '#f00', _a[google.maps.MapTypeId.SATELLITE] = '#f00', _a[google.maps.MapTypeId.TERRAIN] = '#f00', _a),
            usual: (_b = {}, _b[google.maps.MapTypeId.HYBRID] = '#fff', _b[google.maps.MapTypeId.ROADMAP] = '#444', _b[google.maps.MapTypeId.SATELLITE] = '#fff', _b[google.maps.MapTypeId.TERRAIN] = '#444', _b)
        };
        this.markersWontHide = false;
        this.markersWontMove = false;
        this.basicFormatEvents = false;
        this.keepSpiderfied = false;
        this.ignoreMapClick = false;
        this.nearbyDistance = 20;
        this.circleSpiralSwitchover = 9;
        this.circleFootSeparation = 23;
        this.circleStartAngle = Math.PI / 6;
        this.spiralFootSeparation = 26;
        this.spiralLengthStart = 11;
        this.spiralLengthFactor = 4;
        this.legWeight = 1.5;
        this.VERSION = '1.0.3';
        var keys = OverlappingMarkerSpiderfier.optionAttributes
            .filter(function (key) { return typeof options[key] !== 'undefined'; });
        keys.forEach(function (key) {
            _this[key] = options[key];
        });
        this.projectionHelper = new (/** @class */ (function (_super) {
            __extends(class_1, _super);
            function class_1(map) {
                var _this = _super.call(this) || this;
                _this.setMap(map);
                return _this;
            }
            class_1.prototype.draw = function () {
            };
            return class_1;
        }(google.maps.OverlayView)))(this.map);
        this.initMarkerArrays();
        this.listeners = {};
        this.formatIdleListener = this.formatTimeoutId = null;
        this.addListener('click', function (marker, event) { return google.maps.event.trigger(marker, 'spider_click', event); }); // new-style events, easier to integrate
        this.addListener('format', function (marker, status) { return google.maps.event.trigger(marker, 'spider_format', status); });
        if (!this.ignoreMapClick) {
            google.maps.event.addListener(this.map, 'click', function () { return _this.unspiderfy(); });
        }
        google.maps.event.addListener(this.map, 'maptypeid_changed', function () { return _this.unspiderfy(); });
        google.maps.event.addListener(this.map, 'zoom_changed', function () {
            _this.unspiderfy();
            if (!_this.basicFormatEvents) {
                return _this.formatMarkers();
            }
        });
        var _a, _b;
    }
    OverlappingMarkerSpiderfier.prototype.doFormatMarkers = function () {
        var result = [];
        var marker;
        var status;
        // only formatMarkers is allowed to call this directly
        if (this.basicFormatEvents) {
            for (var i = 0; i < this.markers.length; i++) {
                marker = this.markers[i];
                status = marker['_omsData'] ? OverlappingMarkerSpiderfier.markerStatus.SPIDERFIED :
                    OverlappingMarkerSpiderfier.markerStatus.UNSPIDERFIED;
                result.push(this.trigger('format', marker, status));
            }
            return result;
        }
        var proximities = this.markerProximityData(); // {pt, willSpiderfy}[]
        for (var i = 0; i < this.markers.length; i++) {
            marker = this.markers[i];
            status = marker['_omsData'] ?
                OverlappingMarkerSpiderfier.markerStatus.SPIDERFIED :
                proximities[i].willSpiderfy ?
                    OverlappingMarkerSpiderfier.markerStatus.SPIDERFIABLE :
                    OverlappingMarkerSpiderfier.markerStatus.UNSPIDERFIABLE;
            result.push(this.trigger('format', marker, status));
        }
        return result;
    };
    OverlappingMarkerSpiderfier.prototype.formatMarkers = function () {
        var _this = this;
        if (this.basicFormatEvents) {
            return;
        }
        if (this.formatTimeoutId) {
            return;
        } // only format markers once per run loop (in case e.g. being called repeatedly from addMarker)
        return this.formatTimeoutId = window.setTimeout(function () {
            _this.formatTimeoutId = null;
            if (_this.formatIdleListener) {
                return;
            }
            _this.formatIdleListener = google.maps.event.addListenerOnce(_this.map, 'idle', function () {
                _this.formatIdleListener = null;
                _this.doFormatMarkers();
            });
        });
    };
    OverlappingMarkerSpiderfier.prototype.generatePtsCircle = function (count, centerPt) {
        var circumference = this.circleFootSeparation * (2 + count);
        var legLength = circumference / (2 * Math.PI); // = radius from circumference
        var angleStep = 2 * Math.PI / count;
        var result = [];
        for (var i = 0, end = count, asc = 0 <= end; asc ? i < end : i > end; asc ? i++ : i--) {
            var angle = this.circleStartAngle + i * angleStep;
            result.push(new google.maps.Point(centerPt.x + legLength * Math.cos(angle), centerPt.y + legLength * Math.sin(angle)));
        }
        return result;
    };
    OverlappingMarkerSpiderfier.prototype.generatePtsSpiral = function (count, centerPt) {
        var legLength = this.spiralLengthStart;
        var angle = 0;
        var result = [];
        for (var i = 0, end = count, asc = 0 <= end; asc ? i < end : i > end; asc ? i++ : i--) {
            angle += this.spiralFootSeparation / legLength + i * 0.0005;
            var pt = new google.maps.Point(centerPt.x + legLength * Math.cos(angle), centerPt.y + legLength * Math.sin(angle));
            legLength += Math.PI * 2 * this.spiralLengthFactor / angle;
            result.push(pt);
        }
        return result;
    };
    OverlappingMarkerSpiderfier.prototype.initMarkerArrays = function () {
        this.markers = [];
        this.markerListenerRefs = [];
    };
    OverlappingMarkerSpiderfier.prototype.llToPt = function (ll) {
        return this.projectionHelper.getProjection().fromLatLngToDivPixel(ll);
    };
    OverlappingMarkerSpiderfier.prototype.makeHighlightListenerFuncs = function (marker) {
        var _this = this;
        var mapTypeId = this.map.getMapTypeId();
        return {
            highlight: function () { return marker['_omsData'].leg.setOptions({
                strokeColor: _this.legColors.highlighted[mapTypeId],
                zIndex: _this.highlightedLegZIndex
            }); },
            unhighlight: function () { return marker['_omsData'].leg.setOptions({
                strokeColor: _this.legColors.usual[mapTypeId],
                zIndex: _this.usualLegZIndex
            }); }
        };
    };
    OverlappingMarkerSpiderfier.prototype.markerChangeListener = function (marker, positionChanged) {
        if (this.spiderfying || this.unspiderfying) {
            return;
        }
        if (marker['_omsData'] && (positionChanged || !marker.getVisible())) {
            this.unspiderfy(positionChanged ? marker : null);
        }
        return this.formatMarkers();
    };
    OverlappingMarkerSpiderfier.prototype.markerProximityData = function () {
        var _this = this;
        if (this.projectionHelper.getProjection() == null) {
            throw 'Must wait for \'idle\' event on map before calling markersNearAnyOtherMarker';
        }
        var nDist = this.nearbyDistance;
        var pxSq = nDist * nDist;
        var mData = this.markers.map(function (marker) { return ({
            pt: _this.llToPt(marker['_omsData'] && marker['_omsData'].usualPosition || marker.position),
            willSpiderfy: false
        }); });
        for (var i1 = 0; i1 < this.markers.length; i1++) {
            var m1 = this.markers[i1];
            if (m1.getMap() == null || !m1.getVisible()) {
                continue;
            } // marker not visible: ignore
            var m1Data = mData[i1];
            if (m1Data.willSpiderfy) {
                continue;
            } // true in the case that we've assessed an earlier marker that was near this one
            for (var i2 = 0; i2 < this.markers.length; i2++) {
                var m2 = this.markers[i2];
                if (i2 === i1) {
                    continue;
                } // markers cannot be near themselves: ignore
                if (m2.getMap() == null || !m2.getVisible()) {
                    continue;
                } // marker not visible: ignore
                var m2Data = mData[i2];
                if (i2 < i1 && !m2Data.willSpiderfy) {
                    continue;
                } // if i2 < i1, m2 has already been checked for proximity to any other marker;
                // so if willSpiderfy is false, it cannot be near any other marker, including this one (m1)
                if (OverlappingMarkerSpiderfier.ptDistanceSq(m1Data.pt, m2Data.pt) < pxSq) {
                    m1Data.willSpiderfy = m2Data.willSpiderfy = true;
                    break;
                }
            }
        }
        return mData;
    };
    OverlappingMarkerSpiderfier.minExtract = function (set, callback) {
        // destructive! returns minimum, and also removes it from the set
        var bestIndex = null;
        var bestValue = null;
        for (var index = 0; index < set.length; index++) {
            var item = set[index];
            var value = callback(item);
            if (bestIndex === null || value < bestValue) {
                bestValue = value;
                bestIndex = index;
            }
        }
        return set.splice(bestIndex, 1)[0];
    };
    OverlappingMarkerSpiderfier.ptAverage = function (points) {
        var _a = points.reduce(function (result, current) {
            result.x += current.x;
            result.y += current.y;
            return result;
        }, { x: 0, y: 0 }), x = _a.x, y = _a.y;
        return new google.maps.Point(x / points.length, y / points.length);
    };
    OverlappingMarkerSpiderfier.ptDistanceSq = function (pt1, pt2) {
        var dx = pt1.x - pt2.x;
        var dy = pt1.y - pt2.y;
        return dx * dx + dy * dy;
    };
    OverlappingMarkerSpiderfier.prototype.ptToLl = function (pt) {
        return this.projectionHelper.getProjection().fromDivPixelToLatLng(pt);
    };
    OverlappingMarkerSpiderfier.prototype.spiderfy = function (markerData, nonNearbyMarkers) {
        var _this = this;
        var mapTypeId = this.map.getMapTypeId();
        var numFeet = markerData.length;
        this.spiderfying = true;
        var bodyPt = OverlappingMarkerSpiderfier.ptAverage(markerData.map(function (data) { return data.markerPt; }));
        var footPts = numFeet >= this.circleSpiralSwitchover ?
            this.generatePtsSpiral(numFeet, bodyPt).reverse() : // match from outside in => less criss-crossing
            this.generatePtsCircle(numFeet, bodyPt);
        var spiderfiedMarkers = footPts.map(function (footPt) {
            var footLl = _this.ptToLl(footPt);
            var nearestMarkerDatum = OverlappingMarkerSpiderfier.minExtract(markerData, function (data) { return OverlappingMarkerSpiderfier.ptDistanceSq(data.markerPt, footPt); });
            var marker = nearestMarkerDatum.marker;
            var leg = new google.maps.Polyline({
                map: _this.map,
                path: [marker.position, footLl],
                strokeColor: _this.legColors.usual[_this.map.getMapTypeId()],
                strokeWeight: _this.legWeight,
                zIndex: _this.usualLegZIndex
            });
            marker['_omsData'] = {
                usualPosition: marker.getPosition(),
                usualZIndex: marker.getZIndex(),
                leg: leg
            };
            if (_this.legColors.highlighted[mapTypeId] !== _this.legColors.usual[mapTypeId]) {
                var highlightListenerFuncs = _this.makeHighlightListenerFuncs(marker);
                marker['_omsData'].hightlightListeners = {
                    highlight: google.maps.event.addListener(marker, 'mouseover', highlightListenerFuncs.highlight),
                    unhighlight: google.maps.event.addListener(marker, 'mouseout', highlightListenerFuncs.unhighlight)
                };
            }
            _this.trigger('format', marker, OverlappingMarkerSpiderfier.markerStatus.SPIDERFIED);
            marker.setPosition(footLl);
            marker.setZIndex(Math.round(_this.spiderfiedZIndex + footPt.y)); // lower markers cover higher
            return marker;
        });
        this.spiderfying = false;
        this.spiderfied = true;
        return this.trigger('spiderfy', spiderfiedMarkers, nonNearbyMarkers);
    };
    OverlappingMarkerSpiderfier.prototype.spiderListener = function (marker, event) {
        var markerSpiderfied = !!marker['_omsData'];
        if (!markerSpiderfied || !this.keepSpiderfied) {
            this.unspiderfy();
        }
        if (markerSpiderfied || this.map.getStreetView().getVisible() || this.map.getMapTypeId() === 'GoogleEarthAPI') {
            // don't spiderfy in Street View or GE Plugin!
            return this.trigger('click', marker, event);
        }
        var nearbyMarkerData = [];
        var nonNearbyMarkers = [];
        var nDist = this.nearbyDistance;
        var pxSq = nDist * nDist;
        var markerPt = this.llToPt(marker.position);
        for (var i = 0; i < this.markers.length; i++) {
            var m = this.markers[i];
            if (m.map == null || !m.getVisible()) {
                continue;
            } // at 2011-08-12, property m.visible is undefined in API v3.5
            var mPt = this.llToPt(m.position);
            if (OverlappingMarkerSpiderfier.ptDistanceSq(mPt, markerPt) < pxSq) {
                nearbyMarkerData.push({ marker: m, markerPt: mPt });
            }
            else {
                nonNearbyMarkers.push(m);
            }
        }
        if (nearbyMarkerData.length === 1) {
            // 1 => the one clicked => none nearby
            return this.trigger('click', marker, event);
        }
        return this.spiderfy(nearbyMarkerData, nonNearbyMarkers);
    };
    OverlappingMarkerSpiderfier.prototype.trigger = function (eventName) {
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        if (this.listeners[eventName]) {
            return this.listeners[eventName].map(function (listener) { return listener.apply(void 0, args); });
        }
        return [];
    };
    OverlappingMarkerSpiderfier.prototype.addMarker = function (marker, spiderClickHandler) {
        marker.setMap(this.map);
        return this.trackMarker(marker, spiderClickHandler);
    };
    OverlappingMarkerSpiderfier.prototype.trackMarker = function (marker, spiderClickHandler) {
        var _this = this;
        if (marker['_oms']) {
            return this;
        }
        marker['_oms'] = true;
        // marker.setOptions optimized: no  # 'optimized' rendering is sometimes buggy, but seems mainly OK on current GMaps
        var listenerRefs = [
            google.maps.event.addListener(marker, 'click', function (event) { return _this.spiderListener(marker, event); })
        ];
        if (!this.markersWontHide) {
            listenerRefs.push(google.maps.event.addListener(marker, 'visible_changed', function () { return _this.markerChangeListener(marker, false); }));
        }
        if (!this.markersWontMove) {
            listenerRefs.push(google.maps.event.addListener(marker, 'position_changed', function () { return _this.markerChangeListener(marker, true); }));
        }
        if (spiderClickHandler) {
            listenerRefs.push(google.maps.event.addListener(marker, 'spider_click', spiderClickHandler));
        }
        this.markerListenerRefs.push(listenerRefs);
        this.markers.push(marker);
        if (this.basicFormatEvents) {
            // if using basic events, just format this marker as unspiderfied
            this.trigger('format', marker, OverlappingMarkerSpiderfier.markerStatus.UNSPIDERFIED);
        }
        else {
            // otherwise, format as unspiderfiable now, and recalculate all marker formatting at end of run loop
            this.trigger('format', marker, OverlappingMarkerSpiderfier.markerStatus.UNSPIDERFIABLE);
            this.formatMarkers();
        }
        return this; // return self, for chaining
    };
    OverlappingMarkerSpiderfier.prototype.removeMarker = function (marker) {
        this.forgetMarker(marker);
        marker.setMap(null);
        return this;
    };
    OverlappingMarkerSpiderfier.prototype.forgetMarker = function (marker) {
        if (marker['_omsData']) {
            this.unspiderfy();
        }
        var index = this.markers.indexOf(marker);
        if (index !== -1) {
            var listenerRefs = this.markerListenerRefs.splice(index, 1)[0];
            listenerRefs.forEach(function (listener) { return listener.remove(); });
            delete marker['_oms'];
            this.markers.splice(index, 1);
            this.formatMarkers();
        }
        return this;
    };
    OverlappingMarkerSpiderfier.prototype.removeAllMarkers = function () {
        var markers = this.getMarkers();
        this.forgetAllMarkers();
        markers.forEach(function (marker) { return marker.setMap(null); });
        return this;
    };
    OverlappingMarkerSpiderfier.prototype.forgetAllMarkers = function () {
        this.unspiderfy();
        this.markerListenerRefs.forEach(function (listeners) {
            listeners.forEach(function (listener) { return listener.remove(); });
        });
        this.markers.forEach(function (marker) {
            delete marker['_oms'];
        });
        this.initMarkerArrays();
        return this;
    };
    OverlappingMarkerSpiderfier.prototype.getMarkers = function () {
        return this.markers.slice();
    };
    OverlappingMarkerSpiderfier.prototype.addListener = function (eventName, listener) {
        this.listeners[eventName] = this.listeners[eventName] || [];
        this.listeners[eventName].push(listener);
        return this;
    };
    OverlappingMarkerSpiderfier.prototype.removeListener = function (eventName, listener) {
        if (this.listeners[eventName]) {
            var index = this.listeners[eventName].indexOf(listener);
            if (index !== -1) {
                this.listeners[eventName].splice(index, 1);
            }
        }
        return this;
    };
    OverlappingMarkerSpiderfier.prototype.clearListeners = function (eventName) {
        this.listeners[eventName] = [];
        return this;
    };
    OverlappingMarkerSpiderfier.prototype.markersNearMarker = function (marker, firstOnly) {
        if (firstOnly === void 0) { firstOnly = false; }
        if (this.projectionHelper.getProjection() == null) {
            throw 'Must wait for \'idle\' event on map before calling markersNearMarker';
        }
        var nDist = this.nearbyDistance;
        var pxSq = nDist * nDist;
        var markerPt = this.llToPt(marker.position);
        var markers = [];
        for (var i = 0; i < this.markers.length; i++) {
            var current = this.markers[i];
            if (current === marker || current.map == null || !current.getVisible()) {
                continue;
            }
            var mPt = this.llToPt(current['_omsData'] && current['_omsData'].usualPosition || current.position);
            if (OverlappingMarkerSpiderfier.ptDistanceSq(mPt, markerPt) < pxSq) {
                markers.push(current);
                if (firstOnly) {
                    break;
                }
            }
        }
        return markers;
    };
    OverlappingMarkerSpiderfier.prototype.markersNearAnyOtherMarker = function () {
        // *very* much quicker than calling markersNearMarker in a loop
        var mData = this.markerProximityData();
        var result = [];
        for (var i = 0; i < this.markers.length; i++) {
            var m = this.markers[i];
            if (mData[i].willSpiderfy) {
                result.push(m);
            }
        }
        return result;
    };
    OverlappingMarkerSpiderfier.prototype.unspiderfy = function (markerNotToMove) {
        if (markerNotToMove === void 0) { markerNotToMove = null; }
        if (!this.spiderfied) {
            return this;
        }
        this.unspiderfying = true;
        var unspiderfiedMarkers = [];
        var nonNearbyMarkers = [];
        for (var i = 0; i < this.markers.length; i++) {
            var marker = this.markers[i];
            if (marker['_omsData']) {
                marker['_omsData'].leg.setMap(null);
                if (marker !== markerNotToMove) {
                    marker.setPosition(marker['_omsData'].usualPosition);
                }
                marker.setZIndex(marker['_omsData'].usualZIndex);
                var listeners = marker['_omsData'].hightlightListeners;
                if (listeners) {
                    google.maps.event.removeListener(listeners.highlight);
                    google.maps.event.removeListener(listeners.unhighlight);
                }
                delete marker['_omsData'];
                if (marker !== markerNotToMove) {
                    // if marker is markerNotToMove, formatMarkers is about to be called anyway
                    var status_1 = this.basicFormatEvents ?
                        OverlappingMarkerSpiderfier.markerStatus.UNSPIDERFIED :
                        OverlappingMarkerSpiderfier.markerStatus.SPIDERFIABLE; // unspiderfying? must be spiderfiable
                    this.trigger('format', marker, status_1);
                }
                unspiderfiedMarkers.push(marker);
            }
            else {
                nonNearbyMarkers.push(marker);
            }
        }
        this.unspiderfying = false;
        this.spiderfied = false;
        this.trigger('unspiderfy', unspiderfiedMarkers, nonNearbyMarkers);
        return this; // return self, for chaining
    };
    OverlappingMarkerSpiderfier.markerStatus = MarkerStatus;
    OverlappingMarkerSpiderfier.optionAttributes = [
        'markersWontHide',
        'markersWontMove',
        'basicFormatEvents',
        'keepSpiderfied',
        'ignoreMapClick',
        'nearbyDistance',
        'circleSpiralSwitchover',
        'circleFootSeparation',
        'circleStartAngle',
        'spiralFootSeparation',
        'spiralLengthStart',
        'spiralLengthFactor',
        'legWeight',
    ];
    return OverlappingMarkerSpiderfier;
}());

exports.MarkerStatus = MarkerStatus;
exports.OverlappingMarkerSpiderfier = OverlappingMarkerSpiderfier;

Object.defineProperty(exports, '__esModule', { value: true });

});
//# sourceMappingURL=index.amd.js.map
