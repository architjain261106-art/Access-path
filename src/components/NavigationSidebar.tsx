import React, { useState } from 'react';
import { CampusNode, Hazard, RouteResult, TravelMode } from '../types/navigation';
import {
  ArrowUpDown,
  Navigation,
  Accessibility,
  Moon,
  Zap,
  AlertTriangle,
  ChevronRight,
  CornerUpLeft,
  CornerUpRight,
  MoveUp,
  MapPin,
  CheckCircle2,
  Code2,
  ShieldAlert,
  Info,
  Layers,
} from 'lucide-react';

interface NavigationSidebarProps {
  nodes: CampusNode[];
  hazards: Hazard[];
  routeResult: RouteResult | null;
  startNodeId: string;
  endNodeId: string;
  travelMode: TravelMode;
  onSelectStart: (id: string) => void;
  onSelectEnd: (id: string) => void;
  onSelectMode: (mode: TravelMode) => void;
  onSwapLocations: () => void;
  onOpenReportModal: () => void;
  onOpenCodeModal: () => void;
}

export const NavigationSidebar: React.FC<NavigationSidebarProps> = ({
  nodes,
  hazards,
  routeResult,
  startNodeId,
  endNodeId,
  travelMode,
  onSelectStart,
  onSelectEnd,
  onSelectMode,
  onSwapLocations,
  onOpenReportModal,
  onOpenCodeModal,
}) => {
  const [searchFilter, setSearchFilter] = useState('');
  const [activeTab, setActiveTab] = useState<'directions' | 'hazards' | 'landmarks'>('directions');

  const startNode = nodes.find((n) => n.id === startNodeId);
  const endNode = nodes.find((n) => n.id === endNodeId);

  // Group nodes by category
  const categories: { label: string; key: CampusNode['category'] }[] = [
    { label: 'Academic & Research', key: 'academic' },
    { label: 'Student Life & Union', key: 'student_life' },
    { label: 'Dining & Cafeterias', key: 'dining' },
    { label: 'Residential Quads', key: 'residential' },
    { label: 'Transit & Gates', key: 'transit' },
    { label: 'Wellness & Athletics', key: 'wellness' },
  ];

  const getStepIcon = (type: string) => {
    switch (type) {
      case 'turn_left':
        return <CornerUpLeft className="w-4 h-4 text-blue-600 shrink-0" />;
      case 'turn_right':
        return <CornerUpRight className="w-4 h-4 text-blue-600 shrink-0" />;
      case 'ramp':
        return <Accessibility className="w-4 h-4 text-teal-600 shrink-0" />;
      case 'arrive':
        return <MapPin className="w-4 h-4 text-red-600 shrink-0" />;
      case 'depart':
      default:
        return <MoveUp className="w-4 h-4 text-blue-600 shrink-0" />;
    }
  };

  return (
    <aside className="w-full md:w-[410px] lg:w-[440px] h-full flex flex-col bg-white border-r border-neutral-200 z-10 shadow-lg md:shadow-md shrink-0">
      {/* Top Bar / Brand Lockup (Top Bar Contract: Single text wordmark) */}
      <div className="px-5 py-3.5 border-b border-neutral-200 flex items-center justify-between bg-white">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm tracking-tight shadow-xs">
            AP
          </div>
          <div>
            <h1 className="text-base font-bold text-neutral-900 tracking-tight leading-none">
              AccessPath
            </h1>
            <p className="text-[11px] text-neutral-500 font-medium">Campus Navigation</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenCodeModal}
            title="View Python Streamlit app.py"
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-md transition-colors"
          >
            <Code2 className="w-3.5 h-3.5 text-neutral-600" />
            <span>Python Script</span>
          </button>
        </div>
      </div>

      {/* Origin / Destination Search Panel */}
      <div className="p-4 border-b border-neutral-200 bg-neutral-50/70">
        <div className="relative flex items-center gap-2">
          {/* Vertical indicator line connecting Origin to Destination */}
          <div className="flex flex-col items-center justify-between py-2 shrink-0 h-20 w-4">
            <div className="w-3 h-3 rounded-full bg-blue-600 ring-4 ring-blue-100" />
            <div className="w-0.5 h-7 border-l-2 border-dotted border-neutral-300" />
            <div className="w-3 h-3 rounded-sm bg-red-600 ring-4 ring-red-100" />
          </div>

          {/* Select Inputs */}
          <div className="flex-1 space-y-2">
            {/* Origin Select */}
            <div className="relative">
              <select
                value={startNodeId}
                onChange={(e) => onSelectStart(e.target.value)}
                className="w-full pl-3 pr-8 py-2 text-xs font-medium bg-white text-neutral-900 border border-neutral-300 rounded-lg shadow-2xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 truncate"
              >
                {nodes.map((node) => (
                  <option key={node.id} value={node.id}>
                    {node.shortName} · {node.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Destination Select */}
            <div className="relative">
              <select
                value={endNodeId}
                onChange={(e) => onSelectEnd(e.target.value)}
                className="w-full pl-3 pr-8 py-2 text-xs font-medium bg-white text-neutral-900 border border-neutral-300 rounded-lg shadow-2xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 truncate"
              >
                {nodes.map((node) => (
                  <option key={node.id} value={node.id}>
                    {node.shortName} · {node.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Swap Button */}
          <button
            onClick={onSwapLocations}
            title="Swap Origin and Destination"
            className="p-2.5 text-neutral-500 hover:text-neutral-900 hover:bg-white rounded-lg border border-neutral-200 shadow-2xs transition-colors shrink-0"
          >
            <ArrowUpDown className="w-4 h-4" />
          </button>
        </div>

        {/* Travel Mode Selector */}
        <div className="mt-3.5 pt-3 border-t border-neutral-200">
          <div className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-1.5">
            Travel Profile
          </div>
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-neutral-200/70 rounded-lg">
            {/* Standard */}
            <button
              onClick={() => onSelectMode('standard')}
              className={`flex flex-col items-center justify-center py-2 px-1 rounded-md text-xs font-medium transition-all ${
                travelMode === 'standard'
                  ? 'bg-white text-neutral-900 shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100/60'
              }`}
            >
              <Zap className="w-4 h-4 mb-0.5 text-blue-600" />
              <span className="text-[11px] font-semibold">Shortest</span>
              <span className="text-[9px] text-neutral-500 font-normal">Direct paths</span>
            </button>

            {/* Step-Free / Accessible */}
            <button
              onClick={() => onSelectMode('accessible')}
              className={`flex flex-col items-center justify-center py-2 px-1 rounded-md text-xs font-medium transition-all ${
                travelMode === 'accessible'
                  ? 'bg-white text-teal-900 shadow-xs ring-1 ring-teal-500/20'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100/60'
              }`}
            >
              <Accessibility className="w-4 h-4 mb-0.5 text-teal-600" />
              <span className="text-[11px] font-semibold text-teal-900">Step-Free</span>
              <span className="text-[9px] text-teal-700/80 font-normal">No stairs/ramps</span>
            </button>

            {/* Lit Night Route */}
            <button
              onClick={() => onSelectMode('lit_night')}
              className={`flex flex-col items-center justify-center py-2 px-1 rounded-md text-xs font-medium transition-all ${
                travelMode === 'lit_night'
                  ? 'bg-white text-indigo-950 shadow-xs ring-1 ring-indigo-500/20'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100/60'
              }`}
            >
              <Moon className="w-4 h-4 mb-0.5 text-indigo-600" />
              <span className="text-[11px] font-semibold text-indigo-950">Lit Night</span>
              <span className="text-[9px] text-indigo-700/80 font-normal">Illuminated</span>
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex border-b border-neutral-200 px-4 text-xs font-medium bg-white">
        <button
          onClick={() => setActiveTab('directions')}
          className={`py-2.5 px-3 border-b-2 transition-colors ${
            activeTab === 'directions'
              ? 'border-blue-600 text-blue-700 font-semibold'
              : 'border-transparent text-neutral-500 hover:text-neutral-800'
          }`}
        >
          Directions
        </button>
        <button
          onClick={() => setActiveTab('hazards')}
          className={`py-2.5 px-3 border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'hazards'
              ? 'border-amber-600 text-amber-800 font-semibold'
              : 'border-transparent text-neutral-500 hover:text-neutral-800'
          }`}
        >
          <span>Hazards</span>
          <span className="px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
            {hazards.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('landmarks')}
          className={`py-2.5 px-3 border-b-2 transition-colors ${
            activeTab === 'landmarks'
              ? 'border-blue-600 text-blue-700 font-semibold'
              : 'border-transparent text-neutral-500 hover:text-neutral-800'
          }`}
        >
          Campus Directory
        </button>
      </div>

      {/* Main Content Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {activeTab === 'directions' && (
          <>
            {routeResult ? (
              <div className="space-y-4">
                {/* Dynamic Summary Card */}
                <div className="bg-neutral-50 rounded-xl p-4 border border-neutral-200/80 space-y-3">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <div className="text-2xl font-bold text-neutral-900 tracking-tight tabular-nums">
                        {routeResult.estimatedMinutes} min
                      </div>
                      <div className="text-xs text-neutral-500 font-medium tabular-nums">
                        {routeResult.totalDistanceMeters} m ·{' '}
                        {Math.round(routeResult.totalDistanceMeters * 3.28084).toLocaleString()} ft
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[11px] font-semibold text-neutral-400 block uppercase">
                        Route Profile
                      </span>
                      <span className="text-xs font-semibold text-neutral-800">
                        {travelMode === 'accessible'
                          ? 'Step-Free Ramp'
                          : travelMode === 'lit_night'
                          ? 'Lit Night Corridor'
                          : 'Direct Walkway'}
                      </span>
                    </div>
                  </div>

                  {/* Profile Metrics */}
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-neutral-200">
                    <div
                      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium ${
                        routeResult.accessible
                          ? 'bg-teal-50 text-teal-800 border border-teal-200'
                          : 'bg-amber-50 text-amber-800 border border-amber-200'
                      }`}
                    >
                      <Accessibility className="w-3.5 h-3.5" />
                      <span>{routeResult.accessible ? '100% Step-Free' : 'Contains Steps'}</span>
                    </div>

                    <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium bg-indigo-50 text-indigo-800 border border-indigo-200">
                      <Moon className="w-3.5 h-3.5" />
                      <span className="tabular-nums">{routeResult.litRouteCoverage}% Illuminated</span>
                    </div>
                  </div>

                  {/* Active Hazard Warning on Route */}
                  {routeResult.hazardsEncountered.length > 0 && (
                    <div className="bg-rose-50 border border-rose-200 rounded-lg p-2.5 text-xs text-rose-800 flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-semibold">
                          Active Hazard on Route ({routeResult.hazardsEncountered.length})
                        </div>
                        <div className="text-rose-700 text-[11px] mt-0.5">
                          {routeResult.hazardsEncountered.map((h) => h.title).join('; ')}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Step-by-Step Turns */}
                <div>
                  <div className="text-xs font-semibold text-neutral-700 mb-2.5 flex items-center justify-between">
                    <span>Turn-by-Turn Guidance</span>
                    <span className="text-[11px] text-neutral-400 font-normal">
                      {routeResult.instructions.length} steps
                    </span>
                  </div>

                  <div className="space-y-2">
                    {routeResult.instructions.map((step) => (
                      <div
                        key={step.step}
                        className="p-3 rounded-lg border border-neutral-200 bg-white hover:border-neutral-300 transition-colors shadow-2xs"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-6 h-6 rounded-full bg-neutral-100 flex items-center justify-center shrink-0 mt-0.5">
                            {getStepIcon(step.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium text-neutral-900 leading-snug">
                              {step.instruction}
                            </div>
                            {step.distanceMeters > 0 && (
                              <div className="text-[11px] text-neutral-500 mt-0.5 tabular-nums">
                                {step.distanceMeters} meters
                              </div>
                            )}
                            {step.accessibleNote && (
                              <div className="text-[11px] text-teal-700 font-medium mt-1 bg-teal-50 px-2 py-0.5 rounded inline-block">
                                {step.accessibleNote}
                              </div>
                            )}
                            {step.hazardNote && (
                              <div className="text-[11px] text-rose-700 font-medium mt-1 bg-rose-50 px-2 py-0.5 rounded inline-block">
                                {step.hazardNote}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-neutral-500 text-xs">
                Select different start and destination locations above to view route directions.
              </div>
            )}
          </>
        )}

        {/* Hazards Tab */}
        {activeTab === 'hazards' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-700">Active Campus Hazards</span>
              <button
                onClick={onOpenReportModal}
                className="text-xs text-blue-600 font-semibold hover:underline"
              >
                + Report New
              </button>
            </div>

            {hazards.map((hazard) => (
              <div
                key={hazard.id}
                className={`p-3 rounded-lg border ${
                  hazard.severity === 'closure'
                    ? 'border-rose-200 bg-rose-50/50'
                    : 'border-amber-200 bg-amber-50/50'
                }`}
              >
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span
                    className={`font-bold px-1.5 py-0.2 rounded ${
                      hazard.severity === 'closure'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {hazard.severity === 'closure' ? 'FULL CLOSURE' : 'CAUTION'}
                  </span>
                  <span className="text-neutral-500">{hazard.reportedAt}</span>
                </div>
                <h4 className="text-xs font-bold text-neutral-900 mb-1">{hazard.title}</h4>
                <p className="text-[11px] text-neutral-600 leading-normal">{hazard.description}</p>
              </div>
            ))}
          </div>
        )}

        {/* Campus Directory Tab */}
        {activeTab === 'landmarks' && (
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Search campus buildings..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            <div className="space-y-2">
              {nodes
                .filter(
                  (n) =>
                    !searchFilter ||
                    n.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
                    n.shortName.toLowerCase().includes(searchFilter.toLowerCase())
                )
                .map((node) => (
                  <div
                    key={node.id}
                    className="p-3 rounded-lg border border-neutral-200 bg-white hover:border-blue-400 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-xs font-bold text-neutral-900">{node.name}</div>
                        <div className="text-[11px] text-neutral-500">{node.category}</div>
                      </div>
                      {node.hasAccessibleEntrance && (
                        <span className="text-[10px] bg-teal-50 text-teal-700 px-1.5 py-0.5 rounded font-medium">
                          ♿ Accessible
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-neutral-600 mt-1.5 leading-snug">
                      {node.description}
                    </p>
                    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-neutral-100">
                      <button
                        onClick={() => onSelectStart(node.id)}
                        className="text-[11px] text-blue-600 font-semibold hover:underline"
                      >
                        Set as Start
                      </button>
                      <span className="text-neutral-300">·</span>
                      <button
                        onClick={() => onSelectEnd(node.id)}
                        className="text-[11px] text-blue-600 font-semibold hover:underline"
                      >
                        Set as Destination
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer / Report Hazard Action Bar */}
      <div className="p-3.5 border-t border-neutral-200 bg-neutral-50 flex items-center justify-between gap-3">
        <button
          onClick={onOpenReportModal}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Report Hazard</span>
        </button>

        <button
          onClick={onOpenCodeModal}
          className="flex items-center justify-center gap-1.5 py-2 px-3 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
        >
          <Code2 className="w-3.5 h-3.5" />
          <span>Python app.py</span>
        </button>
      </div>
    </aside>
  );
};
