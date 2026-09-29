import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { CampusNode, CampusEdge, Hazard, RouteResult, TravelMode } from '../types/navigation';
import { Layers, ZoomIn, ZoomOut, Compass, Navigation } from 'lucide-react';

interface MapViewProps {
  nodes: CampusNode[];
  edges: CampusEdge[];
  hazards: Hazard[];
  routeResult: RouteResult | null;
  startNodeId: string;
  endNodeId: string;
  travelMode: TravelMode;
  onSelectStart: (id: string) => void;
  onSelectEnd: (id: string) => void;
  onOpenReportModalWithCoords?: (lat: number, lng: number) => void;
}

export const MapView: React.FC<MapViewProps> = ({
  nodes,
  edges,
  hazards,
  routeResult,
  startNodeId,
  endNodeId,
  travelMode,
  onSelectStart,
  onSelectEnd,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const routeLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const networkLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const markersLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const hazardsLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const [mapStyle, setMapStyle] = React.useState<'positron' | 'dark' | 'voyager'>('positron');
  const [showNetwork, setShowNetwork] = React.useState(true);
  const [showHazards, setShowHazards] = React.useState(true);
  const [animatedRoute, setAnimatedRoute] = React.useState(true);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Center around campus center
    const campusCenter: [number, number] = [37.4305, -122.1695];

    const map = L.map(mapContainerRef.current, {
      center: campusCenter,
      zoom: 16,
      zoomControl: false,
      attributionControl: false,
    });

    // CartoDB Positron base tile layer
    const tileUrl =
      mapStyle === 'dark'
        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
        : mapStyle === 'voyager'
        ? 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
        : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

    const tileLayer = L.tileLayer(tileUrl, {
      maxZoom: 19,
      subdomains: 'abcd',
    }).addTo(map);

    tileLayerRef.current = tileLayer;

    // Attribution
    L.control
      .attribution({
        position: 'bottomright',
        prefix: '© CartoDB, OpenStreetMap contributors | AccessPath',
      })
      .addTo(map);

    // Layer groups for clean updates
    networkLayerGroupRef.current = L.layerGroup().addTo(map);
    routeLayerGroupRef.current = L.layerGroup().addTo(map);
    hazardsLayerGroupRef.current = L.layerGroup().addTo(map);
    markersLayerGroupRef.current = L.layerGroup().addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Tile Style
  useEffect(() => {
    if (!mapInstanceRef.current || !tileLayerRef.current) return;

    const tileUrl =
      mapStyle === 'dark'
        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
        : mapStyle === 'voyager'
        ? 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
        : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

    tileLayerRef.current.setUrl(tileUrl);
  }, [mapStyle]);

  // Render Background Campus Pathway Network
  useEffect(() => {
    if (!networkLayerGroupRef.current) return;
    networkLayerGroupRef.current.clearLayers();

    if (!showNetwork) return;

    edges.forEach((edge) => {
      // Style differently if stairs or unlit
      const isUnlit = !edge.isLit;
      const isStair = edge.hasStairs;

      let color = '#94A3B8'; // Slate 400
      let dashArray: string | undefined = undefined;

      if (isStair) {
        color = '#F59E0B'; // Amber for stairs
        dashArray = '3, 4';
      } else if (isUnlit) {
        color = '#64748B'; // Darker slate
        dashArray = '5, 5';
      }

      const poly = L.polyline(edge.pathCoordinates, {
        color,
        weight: 3,
        opacity: 0.5,
        dashArray,
        lineCap: 'round',
        lineJoin: 'round',
      });

      poly.bindTooltip(
        `<div class="text-xs font-sans">
          <strong>Pathway: ${edge.distanceMeters}m</strong><br/>
          Surface: ${edge.surface} · Grade: ${edge.slopeGrade}%<br/>
          ${edge.hasStairs ? '⚠️ Contains Stairs' : '✓ Step-Free Ramp'} · ${edge.isLit ? '💡 Lit' : '🌙 Unlit'}
        </div>`,
        { sticky: true }
      );

      networkLayerGroupRef.current?.addLayer(poly);
    });
  }, [edges, showNetwork]);

  // Render Active Route Polyline
  useEffect(() => {
    if (!routeLayerGroupRef.current || !mapInstanceRef.current) return;
    routeLayerGroupRef.current.clearLayers();

    if (routeResult && routeResult.fullPolyline.length > 1) {
      // Vibrant foreground color: Google blue or accessible teal or night violet
      let routeColor = '#1A73E8'; // Google Maps blue
      let flowColor = '#FFFFFF';
      let auraColor = '#3B82F6';

      if (travelMode === 'accessible') {
        routeColor = '#0D9488'; // Teal / accessible green-blue
        auraColor = '#14B8A6';
        flowColor = '#CCFBF1';
      } else if (travelMode === 'lit_night') {
        routeColor = '#4F46E5'; // Indigo / night violet
        auraColor = '#6366F1';
        flowColor = '#E0E7FF';
      }

      if (animatedRoute) {
        // Layer 1: Outer rhythmic pulsing glow / aura
        const auraLine = L.polyline(routeResult.fullPolyline, {
          color: auraColor,
          weight: 16,
          opacity: 0.55,
          className: 'route-pulsing-aura',
          lineCap: 'round',
          lineJoin: 'round',
        });
        routeLayerGroupRef.current.addLayer(auraLine);
      }

      // Layer 2: Background white casing for crisp contrast across all map tiles
      const casingLine = L.polyline(routeResult.fullPolyline, {
        color: '#FFFFFF',
        weight: 8.5,
        opacity: 0.95,
        className: 'route-casing',
        lineCap: 'round',
        lineJoin: 'round',
      });
      routeLayerGroupRef.current.addLayer(casingLine);

      // Layer 3: Solid vibrant core route polyline
      const foregroundLine = L.polyline(routeResult.fullPolyline, {
        color: routeColor,
        weight: 5.5,
        opacity: 0.95,
        className: 'route-main-line',
        lineCap: 'round',
        lineJoin: 'round',
      });
      routeLayerGroupRef.current.addLayer(foregroundLine);

      if (animatedRoute) {
        // Layer 4: Forward marching flow dash animation
        const flowLine = L.polyline(routeResult.fullPolyline, {
          color: flowColor,
          weight: 2.8,
          opacity: 0.9,
          dashArray: '10, 14',
          className: 'route-animated-flow',
          lineCap: 'round',
          lineJoin: 'round',
        });
        routeLayerGroupRef.current.addLayer(flowLine);
      }

      // Fit map view to route bounds
      const bounds = L.latLngBounds(routeResult.fullPolyline);
      mapInstanceRef.current.fitBounds(bounds, {
        padding: [60, 60],
        maxZoom: 17,
        animate: true,
      });
    }
  }, [routeResult, travelMode, animatedRoute]);

  // Render Landmark Markers
  useEffect(() => {
    if (!markersLayerGroupRef.current || !mapInstanceRef.current) return;
    markersLayerGroupRef.current.clearLayers();

    nodes.forEach((node) => {
      const isStart = node.id === startNodeId;
      const isEnd = node.id === endNodeId;

      let iconHtml = '';
      let iconSize: [number, number] = [28, 28];
      let iconAnchor: [number, number] = [14, 14];

      if (isStart) {
        // Google Maps style Blue Origin Marker with pulse
        iconSize = [34, 44];
        iconAnchor = [17, 42];
        iconHtml = `
          <div class="relative flex flex-col items-center group cursor-pointer">
            <div class="absolute -top-1 w-9 h-9 rounded-full bg-blue-500/25 animate-ping"></div>
            <div class="relative z-10 w-9 h-11 flex items-center justify-center">
              <svg width="34" height="44" viewBox="0 0 34 44" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M17 0C7.61116 0 0 7.61116 0 17C0 29.75 17 44 17 44C17 44 34 29.75 34 17C34 7.61116 26.3888 0 17 0Z" fill="#1A73E8"/>
                <circle cx="17" cy="17" r="8" fill="white"/>
                <circle cx="17" cy="17" r="4.5" fill="#1A73E8"/>
              </svg>
            </div>
            <div class="absolute top-11 whitespace-nowrap bg-neutral-900 text-white font-semibold text-[11px] px-2 py-0.5 rounded shadow-md pointer-events-none">
              Start: ${node.shortName}
            </div>
          </div>
        `;
      } else if (isEnd) {
        // Google Maps style Red Destination Pin
        iconSize = [34, 44];
        iconAnchor = [17, 42];
        iconHtml = `
          <div class="relative flex flex-col items-center group cursor-pointer">
            <div class="absolute -top-1 w-9 h-9 rounded-full bg-red-500/25 animate-ping"></div>
            <div class="relative z-10 w-9 h-11 flex items-center justify-center">
              <svg width="34" height="44" viewBox="0 0 34 44" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M17 0C7.61116 0 0 7.61116 0 17C0 29.75 17 44 17 44C17 44 34 29.75 34 17C34 7.61116 26.3888 0 17 0Z" fill="#EA4335"/>
                <circle cx="17" cy="17" r="7" fill="white"/>
                <path d="M14 13L20 17L14 21V13Z" fill="#EA4335"/>
              </svg>
            </div>
            <div class="absolute top-11 whitespace-nowrap bg-neutral-900 text-white font-semibold text-[11px] px-2 py-0.5 rounded shadow-md pointer-events-none">
              Destination: ${node.shortName}
            </div>
          </div>
        `;
      } else {
        // Standard Campus Landmark Pin
        iconSize = [28, 28];
        iconAnchor = [14, 14];
        iconHtml = `
          <div class="flex items-center justify-center w-7 h-7 bg-white text-slate-700 rounded-full border-2 border-slate-400 shadow-sm hover:border-blue-600 hover:scale-110 transition-all cursor-pointer">
            <span class="text-xs font-bold">${node.shortName.charAt(0)}</span>
          </div>
        `;
      }

      const customIcon = L.divIcon({
        html: iconHtml,
        className: 'custom-map-icon',
        iconSize,
        iconAnchor,
      });

      const marker = L.marker([node.lat, node.lng], { icon: customIcon });

      // Interactive Popup
      const popupContent = document.createElement('div');
      popupContent.className = 'p-2 font-sans text-xs max-w-xs';
      popupContent.innerHTML = `
        <div class="font-bold text-slate-900 text-sm mb-1">${node.name}</div>
        <p class="text-slate-600 mb-2 leading-relaxed">${node.description}</p>
        <div class="flex items-center gap-1.5 text-[11px] text-emerald-700 font-medium mb-3">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
          ${node.hasAccessibleEntrance ? 'Accessible step-free entrance' : 'Standard entrance'}
        </div>
        <div class="flex items-center gap-2 pt-1 border-t border-slate-200">
          <button id="btn-start-${node.id}" class="flex-1 py-1.5 px-2 bg-blue-600 text-white rounded text-[11px] font-medium hover:bg-blue-700 text-center">
            Set as Origin
          </button>
          <button id="btn-dest-${node.id}" class="flex-1 py-1.5 px-2 bg-slate-900 text-white rounded text-[11px] font-medium hover:bg-slate-800 text-center">
            Set as Destination
          </button>
        </div>
      `;

      marker.bindPopup(popupContent, { maxWidth: 280 });

      marker.on('popupopen', () => {
        const startBtn = document.getElementById(`btn-start-${node.id}`);
        const destBtn = document.getElementById(`btn-dest-${node.id}`);
        if (startBtn) {
          startBtn.onclick = () => {
            onSelectStart(node.id);
            marker.closePopup();
          };
        }
        if (destBtn) {
          destBtn.onclick = () => {
            onSelectEnd(node.id);
            marker.closePopup();
          };
        }
      });

      markersLayerGroupRef.current?.addLayer(marker);
    });
  }, [nodes, startNodeId, endNodeId, onSelectStart, onSelectEnd]);

  // Render Hazard Obstacles
  useEffect(() => {
    if (!hazardsLayerGroupRef.current) return;
    hazardsLayerGroupRef.current.clearLayers();

    if (!showHazards) return;

    hazards.forEach((hazard) => {
      const isClosure = hazard.severity === 'closure';
      const bgColor = isClosure ? 'bg-rose-500' : 'bg-amber-500';

      const hazardHtml = `
        <div class="relative flex items-center justify-center cursor-pointer group">
          <div class="w-7 h-7 ${bgColor} text-white rounded-md shadow-md flex items-center justify-center transform hover:scale-110 transition-transform">
            ${
              isClosure
                ? '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke-width="2"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" stroke-width="2"/></svg>'
                : '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>'
            }
          </div>
        </div>
      `;

      const hazardIcon = L.divIcon({
        html: hazardHtml,
        className: 'custom-hazard-icon',
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      const marker = L.marker([hazard.lat, hazard.lng], { icon: hazardIcon });
      marker.bindPopup(`
        <div class="p-2 font-sans text-xs">
          <div class="flex items-center gap-1.5 mb-1">
            <span class="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${isClosure ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'}">
              ${isClosure ? 'PATHWAY CLOSED' : 'HAZARD WARNING'}
            </span>
            <span class="text-slate-400 text-[10px]">${hazard.reportedAt}</span>
          </div>
          <div class="font-bold text-slate-900 text-sm mb-1">${hazard.title}</div>
          <p class="text-slate-600 leading-normal">${hazard.description}</p>
        </div>
      `);

      hazardsLayerGroupRef.current?.addLayer(marker);
    });
  }, [hazards, showHazards]);

  // Map Controls Handlers
  const handleZoomIn = () => mapInstanceRef.current?.zoomIn();
  const handleZoomOut = () => mapInstanceRef.current?.zoomOut();
  const handleResetView = () => {
    if (routeResult && routeResult.fullPolyline.length > 1) {
      mapInstanceRef.current?.fitBounds(L.latLngBounds(routeResult.fullPolyline), {
        padding: [60, 60],
        animate: true,
      });
    } else {
      mapInstanceRef.current?.setView([37.4305, -122.1695], 16, { animate: true });
    }
  };

  return (
    <div className="relative w-full h-full">
      {/* Map Canvas */}
      <div ref={mapContainerRef} className="w-full h-full bg-neutral-200" />

      {/* Floating Map Controls (Top Right) */}
      <div className="absolute top-4 right-4 z-[500] flex flex-col gap-2">
        {/* Map Style Selector */}
        <div className="bg-white/95 backdrop-blur-md rounded-lg shadow-sm border border-neutral-200 p-1 flex flex-col gap-1 text-xs">
          <button
            onClick={() => setMapStyle('positron')}
            title="CartoDB Positron (Clean Light)"
            className={`px-2.5 py-1.5 rounded font-medium text-left transition-colors ${
              mapStyle === 'positron' ? 'bg-neutral-900 text-white' : 'text-neutral-600 hover:bg-neutral-100'
            }`}
          >
            Positron Light
          </button>
          <button
            onClick={() => setMapStyle('voyager')}
            title="CartoDB Voyager (Streets & Parks)"
            className={`px-2.5 py-1.5 rounded font-medium text-left transition-colors ${
              mapStyle === 'voyager' ? 'bg-neutral-900 text-white' : 'text-neutral-600 hover:bg-neutral-100'
            }`}
          >
            Voyager
          </button>
          <button
            onClick={() => setMapStyle('dark')}
            title="Dark Cartography"
            className={`px-2.5 py-1.5 rounded font-medium text-left transition-colors ${
              mapStyle === 'dark' ? 'bg-neutral-900 text-white' : 'text-neutral-600 hover:bg-neutral-100'
            }`}
          >
            Night Dark
          </button>
        </div>

        {/* Layer Toggles */}
        <div className="bg-white/95 backdrop-blur-md rounded-lg shadow-sm border border-neutral-200 p-2 flex flex-col gap-2 text-xs">
          <label className="flex items-center gap-2 cursor-pointer text-neutral-700 font-medium">
            <input
              type="checkbox"
              checked={animatedRoute}
              onChange={(e) => setAnimatedRoute(e.target.checked)}
              className="rounded text-blue-600 focus:ring-blue-500"
            />
            <span className="flex items-center gap-1.5">
              <span>Pulsing Route</span>
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
            </span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-neutral-700 font-medium">
            <input
              type="checkbox"
              checked={showNetwork}
              onChange={(e) => setShowNetwork(e.target.checked)}
              className="rounded text-blue-600 focus:ring-blue-500"
            />
            <span>Campus Network</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-neutral-700 font-medium">
            <input
              type="checkbox"
              checked={showHazards}
              onChange={(e) => setShowHazards(e.target.checked)}
              className="rounded text-amber-600 focus:ring-amber-500"
            />
            <span>Active Hazards ({hazards.length})</span>
          </label>
        </div>

        {/* Zoom & Recenter Controls */}
        <div className="bg-white/95 backdrop-blur-md rounded-lg shadow-sm border border-neutral-200 p-1 flex flex-col">
          <button
            onClick={handleZoomIn}
            className="p-2 text-neutral-700 hover:bg-neutral-100 rounded transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={handleZoomOut}
            className="p-2 text-neutral-700 hover:bg-neutral-100 rounded transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <div className="h-px bg-neutral-200 my-1" />
          <button
            onClick={handleResetView}
            className="p-2 text-neutral-700 hover:bg-neutral-100 rounded transition-colors"
            title="Fit Route Bounds"
          >
            <Navigation className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Map Legend Overlay (Bottom Left) */}
      <div className="absolute bottom-4 left-4 z-[500] hidden md:flex items-center gap-4 bg-white/90 backdrop-blur-md px-3 py-2 rounded-lg border border-neutral-200 text-xs text-neutral-600 shadow-sm pointer-events-auto">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-1 bg-blue-600 rounded"></span>
          <span>Selected Route</span>
        </div>
        <span className="text-neutral-300">·</span>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-1 bg-slate-400 rounded"></span>
          <span>Paved Walkway</span>
        </div>
        <span className="text-neutral-300">·</span>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-1 border-t-2 border-dashed border-amber-500"></span>
          <span>Stairs (Outdoor)</span>
        </div>
        <span className="text-neutral-300">·</span>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-rose-500"></span>
          <span>Hazard/Closure</span>
        </div>
      </div>
    </div>
  );
};
