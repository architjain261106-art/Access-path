import React, { useState } from 'react';
import { CampusNode, CampusEdge, Hazard } from '../types/navigation';
import { AlertTriangle, X, Check, ShieldAlert, Construction, Sparkles } from 'lucide-react';

interface ReportHazardModalProps {
  isOpen: boolean;
  onClose: () => void;
  nodes: CampusNode[];
  edges: CampusEdge[];
  onAddHazard: (hazard: Hazard) => void;
}

export const ReportHazardModal: React.FC<ReportHazardModalProps> = ({
  isOpen,
  onClose,
  nodes,
  edges,
  onAddHazard,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<Hazard['category']>('construction');
  const [severity, setSeverity] = useState<'warning' | 'closure'>('closure');
  const [selectedEdgeId, setSelectedEdgeId] = useState(edges[0]?.id || '');
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const chosenEdge = edges.find((e) => e.id === selectedEdgeId);
    let lat = 37.4305;
    let lng = -122.1695;

    if (chosenEdge && chosenEdge.pathCoordinates.length > 0) {
      // Pick middle coordinate of the chosen edge
      const midIdx = Math.floor(chosenEdge.pathCoordinates.length / 2);
      lat = chosenEdge.pathCoordinates[midIdx][0];
      lng = chosenEdge.pathCoordinates[midIdx][1];
    }

    const newHazard: Hazard = {
      id: `hazard_${Date.now()}`,
      title: title.trim(),
      description: description.trim() || 'Reported by campus user via AccessPath mobile reporter.',
      edgeId: selectedEdgeId,
      lat,
      lng,
      severity,
      reportedAt: 'Just now',
      category,
    };

    onAddHazard(newHazard);
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setTitle('');
      setDescription('');
      onClose();
    }, 1200);
  };

  const getEdgeLabel = (edge: CampusEdge) => {
    const fromNode = nodes.find((n) => n.id === edge.from)?.shortName || edge.from;
    const toNode = nodes.find((n) => n.id === edge.to)?.shortName || edge.to;
    return `${fromNode} ↔ ${toNode} (${edge.distanceMeters}m, ${edge.surface})`;
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-neutral-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 bg-neutral-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-neutral-900">Report Campus Hazard</h3>
              <p className="text-xs text-neutral-500">Crowdsource path closures and accessibility alerts</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-700 rounded-lg hover:bg-neutral-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {submitted ? (
          <div className="p-8 text-center flex flex-col items-center justify-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <Check className="w-6 h-6" />
            </div>
            <h4 className="text-lg font-semibold text-neutral-900">Hazard Reported Successfully</h4>
            <p className="text-xs text-neutral-600 max-w-sm">
              The routing engine has updated immediately to steer pedestrians and wheelchair users around this section.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Title */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Hazard Title / Obstacle
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Scaffolding blocking ramp, Broken light, Icy walkway"
                className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Affected Segment */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Campus Pathway Segment
              </label>
              <select
                value={selectedEdgeId}
                onChange={(e) => setSelectedEdgeId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
              >
                {edges.map((edge) => (
                  <option key={edge.id} value={edge.id}>
                    {getEdgeLabel(edge)}
                  </option>
                ))}
              </select>
            </div>

            {/* Category & Severity Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as Hazard['category'])}
                  className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                >
                  <option value="construction">Construction / Repairs</option>
                  <option value="stairs_out_of_service">Stairs / Elevator Out</option>
                  <option value="surface_damage">Surface Crack / Uneven</option>
                  <option value="unlit_area">Broken Lamppost / Unlit</option>
                  <option value="weather">Weather / Puddle / Ice</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Impact / Severity
                </label>
                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value as 'warning' | 'closure')}
                  className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                >
                  <option value="closure">Full Closure (Impassable)</option>
                  <option value="warning">Warning (Passable with Care)</option>
                </select>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Detailed Note (Optional)
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add helpful details such as detour signs, width restrictions, or estimated clearance time."
                className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Submit / Cancel Buttons */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors"
              >
                Publish Hazard Alert
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
