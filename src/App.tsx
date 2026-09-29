/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { CAMPUS_NODES, CAMPUS_EDGES, INITIAL_HAZARDS } from './data/campusData';
import { CampusNode, CampusEdge, Hazard, TravelMode } from './types/navigation';
import { findRoute } from './utils/pathfinding';
import { NavigationSidebar } from './components/NavigationSidebar';
import { MapView } from './components/MapView';
import { ReportHazardModal } from './components/ReportHazardModal';
import { PythonCodeModal } from './components/PythonCodeModal';
import { Menu, X, MapPin } from 'lucide-react';

export default function App() {
  const [nodes] = useState<CampusNode[]>(CAMPUS_NODES);
  const [edges] = useState<CampusEdge[]>(CAMPUS_EDGES);
  const [hazards, setHazards] = useState<Hazard[]>(INITIAL_HAZARDS);

  const [startNodeId, setStartNodeId] = useState<string>('main_gate');
  const [endNodeId, setEndNodeId] = useState<string>('library');
  const [travelMode, setTravelMode] = useState<TravelMode>('accessible');

  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isCodeModalOpen, setIsCodeModalOpen] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  // Compute Route Dynamically
  const routeResult = useMemo(() => {
    return findRoute(startNodeId, endNodeId, nodes, edges, hazards, travelMode);
  }, [startNodeId, endNodeId, nodes, edges, hazards, travelMode]);

  // Handlers
  const handleSwapLocations = () => {
    const temp = startNodeId;
    setStartNodeId(endNodeId);
    setEndNodeId(temp);
  };

  const handleAddHazard = (newHazard: Hazard) => {
    setHazards((prev) => [newHazard, ...prev]);
  };

  return (
    <div className="relative w-screen h-screen flex flex-col md:flex-row overflow-hidden bg-neutral-100 font-sans">
      {/* Mobile Header Bar */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-neutral-200 z-30 shadow-xs">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
            AP
          </div>
          <span className="font-bold text-sm text-neutral-900">AccessPath</span>
          {routeResult && (
            <span className="text-xs text-neutral-500 font-medium">
              · {routeResult.estimatedMinutes}m ({routeResult.totalDistanceMeters}m)
            </span>
          )}
        </div>
        <button
          onClick={() => setMobileDrawerOpen(!mobileDrawerOpen)}
          className="p-1.5 rounded-lg border border-neutral-200 text-neutral-700 bg-neutral-50"
        >
          {mobileDrawerOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Navigation Sidebar Panel (Desktop: Left split, Mobile: Collapsible Drawer) */}
      <div
        className={`${
          mobileDrawerOpen ? 'translate-y-0' : 'translate-y-full md:translate-y-0'
        } fixed md:relative bottom-0 left-0 right-0 md:bottom-auto md:right-auto h-[80vh] md:h-full z-40 md:z-20 transition-transform duration-300 ease-in-out md:flex`}
      >
        <NavigationSidebar
          nodes={nodes}
          hazards={hazards}
          routeResult={routeResult}
          startNodeId={startNodeId}
          endNodeId={endNodeId}
          travelMode={travelMode}
          onSelectStart={(id) => {
            setStartNodeId(id);
            if (window.innerWidth < 768) setMobileDrawerOpen(false);
          }}
          onSelectEnd={(id) => {
            setEndNodeId(id);
            if (window.innerWidth < 768) setMobileDrawerOpen(false);
          }}
          onSelectMode={setTravelMode}
          onSwapLocations={handleSwapLocations}
          onOpenReportModal={() => setIsReportModalOpen(true)}
          onOpenCodeModal={() => setIsCodeModalOpen(true)}
        />
      </div>

      {/* Mobile Drawer Overlay Backdrop */}
      {mobileDrawerOpen && (
        <div
          onClick={() => setMobileDrawerOpen(false)}
          className="md:hidden fixed inset-0 bg-black/40 z-30 backdrop-blur-2xs"
        />
      )}

      {/* Main Full-Screen Map Canvas (Right Side) */}
      <main className="flex-1 relative h-[calc(100vh-53px)] md:h-full w-full overflow-hidden">
        <MapView
          nodes={nodes}
          edges={edges}
          hazards={hazards}
          routeResult={routeResult}
          startNodeId={startNodeId}
          endNodeId={endNodeId}
          travelMode={travelMode}
          onSelectStart={setStartNodeId}
          onSelectEnd={setEndNodeId}
        />
      </main>

      {/* Report Hazard Modal */}
      <ReportHazardModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        nodes={nodes}
        edges={edges}
        onAddHazard={handleAddHazard}
      />

      {/* Python app.py Code Modal */}
      <PythonCodeModal
        isOpen={isCodeModalOpen}
        onClose={() => setIsCodeModalOpen(false)}
      />
    </div>
  );
}
