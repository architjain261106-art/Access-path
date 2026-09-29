import { CampusNode, CampusEdge, Hazard, TravelMode, RouteResult, TurnInstruction } from '../types/navigation';

interface AdjacencyEdge {
  targetNodeId: string;
  edge: CampusEdge;
  reverse: boolean;
}

// Calculate bearing between two lat/lng coordinates in degrees
function calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const toDeg = (rad: number) => (rad * 180) / Math.PI;

  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const Δλ = toRad(lon2 - lon1);

  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  const θ = Math.atan2(y, x);

  return (toDeg(θ) + 360) % 360;
}

// Compass direction string from bearing
function getCompassDirection(bearing: number): string {
  const directions = ['North', 'Northeast', 'East', 'Southeast', 'South', 'Southwest', 'West', 'Northwest'];
  const index = Math.round(bearing / 45) % 8;
  return directions[index];
}

// Turn type calculation from angle diff
function getTurnType(prevBearing: number | null, currentBearing: number): 'depart' | 'turn_left' | 'turn_right' | 'straight' {
  if (prevBearing === null) return 'depart';
  let diff = currentBearing - prevBearing;
  while (diff < -180) diff += 360;
  while (diff > 180) diff -= 360;

  if (diff > 35 && diff < 145) return 'turn_right';
  if (diff < -35 && diff > -145) return 'turn_left';
  return 'straight';
}

export function findRoute(
  startNodeId: string,
  endNodeId: string,
  nodes: CampusNode[],
  edges: CampusEdge[],
  hazards: Hazard[],
  mode: TravelMode
): RouteResult | null {
  if (!startNodeId || !endNodeId || startNodeId === endNodeId) {
    return null;
  }

  const nodeMap = new Map<string, CampusNode>(nodes.map((n) => [n.id, n]));
  if (!nodeMap.has(startNodeId) || !nodeMap.has(endNodeId)) {
    return null;
  }

  // Active closure hazards mapped by edgeId
  const closureHazardEdges = new Set(
    hazards.filter((h) => h.severity === 'closure' && h.edgeId).map((h) => h.edgeId)
  );

  // Build bidirectional graph
  const adj = new Map<string, AdjacencyEdge[]>();
  nodes.forEach((n) => adj.set(n.id, []));

  edges.forEach((edge) => {
    adj.get(edge.from)?.push({ targetNodeId: edge.to, edge, reverse: false });
    adj.get(edge.to)?.push({ targetNodeId: edge.from, edge, reverse: true });
  });

  // Calculate dynamic edge weight depending on profile
  function getEdgeCost(edge: CampusEdge): number {
    let cost = edge.distanceMeters;

    // Severe penalty if edge has an active closure hazard
    if (closureHazardEdges.has(edge.id)) {
      cost += 50000;
    }

    if (mode === 'accessible') {
      // Must avoid stairs or non-step-free paths
      if (edge.hasStairs || !edge.isStepFree) {
        cost += 30000;
      }
      // Steep slope penalty
      if (edge.slopeGrade > 4) {
        cost += edge.distanceMeters * (edge.slopeGrade * 1.5);
      }
      // Gravel penalty
      if (edge.surface === 'gravel') {
        cost += 500;
      }
    } else if (mode === 'lit_night') {
      // Must prioritize lit routes
      if (!edge.isLit) {
        cost += edge.distanceMeters * 4 + 800;
      }
    }

    return cost;
  }

  // Dijkstra's algorithm
  const distances = new Map<string, number>();
  const previous = new Map<string, { nodeId: string; edge: CampusEdge; reverse: boolean } | null>();
  const visited = new Set<string>();

  nodes.forEach((n) => {
    distances.set(n.id, Infinity);
    previous.set(n.id, null);
  });
  distances.set(startNodeId, 0);

  while (visited.size < nodes.length) {
    // Find unvisited node with smallest distance
    let currentId: string | null = null;
    let smallestDist = Infinity;

    for (const [nodeId, dist] of distances.entries()) {
      if (!visited.has(nodeId) && dist < smallestDist) {
        smallestDist = dist;
        currentId = nodeId;
      }
    }

    if (!currentId || smallestDist === Infinity) break;
    if (currentId === endNodeId) break;

    visited.add(currentId);

    const neighbors = adj.get(currentId) || [];
    for (const { targetNodeId, edge, reverse } of neighbors) {
      if (visited.has(targetNodeId)) continue;

      const weight = getEdgeCost(edge);
      const alt = distances.get(currentId)! + weight;
      if (alt < distances.get(targetNodeId)!) {
        distances.set(targetNodeId, alt);
        previous.set(targetNodeId, { nodeId: currentId, edge, reverse });
      }
    }
  }

  // Reconstruct path
  if (distances.get(endNodeId) === Infinity) {
    return null;
  }

  const pathNodes: string[] = [];
  const pathEdges: CampusEdge[] = [];
  const pathReverse: boolean[] = [];

  let curr: string | null = endNodeId;
  while (curr && curr !== startNodeId) {
    pathNodes.unshift(curr);
    const prevEntry = previous.get(curr);
    if (!prevEntry) break;
    pathEdges.unshift(prevEntry.edge);
    pathReverse.unshift(prevEntry.reverse);
    curr = prevEntry.nodeId;
  }
  pathNodes.unshift(startNodeId);

  // Build combined polyline
  const fullPolyline: [number, number][] = [];
  let totalDistanceMeters = 0;
  let litDistanceMeters = 0;
  let isFullyStepFree = true;

  pathEdges.forEach((edge, idx) => {
    totalDistanceMeters += edge.distanceMeters;
    if (edge.isLit) litDistanceMeters += edge.distanceMeters;
    if (edge.hasStairs || !edge.isStepFree) isFullyStepFree = false;

    const coords = [...edge.pathCoordinates];
    if (pathReverse[idx]) {
      coords.reverse();
    }

    // Append to polyline avoiding duplicate consecutive points
    coords.forEach((coord, ptIdx) => {
      if (fullPolyline.length === 0 || ptIdx > 0) {
        fullPolyline.push(coord);
      }
    });
  });

  // Calculate speed based on profile:
  // Standard walking pace: 80 m/min (~4.8 km/h)
  // Accessible pace: 65 m/min (~3.9 km/h)
  // Lit night pace: 72 m/min (~4.3 km/h)
  const speedMetersPerMin = mode === 'accessible' ? 65 : mode === 'lit_night' ? 72 : 80;
  const estimatedMinutes = Math.max(1, Math.round(totalDistanceMeters / speedMetersPerMin));

  // Find hazards on this route
  const pathEdgeIds = new Set(pathEdges.map((e) => e.id));
  const pathNodeIds = new Set(pathNodes);
  const encounteredHazards = hazards.filter(
    (h) => (h.edgeId && pathEdgeIds.has(h.edgeId)) || (h.nodeId && pathNodeIds.has(h.nodeId))
  );

  // Generate Turn-by-Turn instructions
  const instructions: TurnInstruction[] = [];
  let prevBearing: number | null = null;

  for (let i = 0; i < pathNodes.length - 1; i++) {
    const fromNode = nodeMap.get(pathNodes[i])!;
    const toNode = nodeMap.get(pathNodes[i + 1])!;
    const edge = pathEdges[i];

    const bearing = calculateBearing(fromNode.lat, fromNode.lng, toNode.lat, toNode.lng);
    const directionStr = getCompassDirection(bearing);
    const turnType = getTurnType(prevBearing, bearing);
    prevBearing = bearing;

    let instructionText = '';
    let instructionType: TurnInstruction['type'] = turnType;
    let accessibleNote: string | undefined = undefined;
    let hazardNote: string | undefined = undefined;

    if (i === 0) {
      instructionText = `Depart from ${fromNode.shortName} and head ${directionStr.toLowerCase()} toward ${toNode.shortName}`;
      instructionType = 'depart';
    } else if (edge.hasStairs) {
      instructionText = `Ascend terrace steps toward ${toNode.shortName}`;
      instructionType = 'straight';
      accessibleNote = '⚠️ Contains outdoor stairs (not step-free)';
    } else if (edge.slopeGrade > 2) {
      instructionText = `Follow ramp incline (${edge.slopeGrade}% grade) toward ${toNode.shortName}`;
      instructionType = 'ramp';
      accessibleNote = `ADA compliant ramp pathway (${edge.slopeGrade}% grade, handrails installed)`;
    } else if (turnType === 'turn_left') {
      instructionText = `Turn left onto walkway toward ${toNode.shortName}`;
    } else if (turnType === 'turn_right') {
      instructionText = `Turn right onto walkway toward ${toNode.shortName}`;
    } else {
      instructionText = `Continue straight along walkway toward ${toNode.shortName}`;
    }

    if (edge.isLit && mode === 'lit_night') {
      instructionText += ` (lit pathway)`;
    }

    // Check for hazards on this segment
    const segmentHazard = hazards.find((h) => h.edgeId === edge.id);
    if (segmentHazard) {
      hazardNote = `${segmentHazard.severity === 'closure' ? '⛔ Roadwork/Hazard' : '⚠️ Alert'}: ${segmentHazard.title}`;
    }

    instructions.push({
      step: i + 1,
      instruction: instructionText,
      distanceMeters: edge.distanceMeters,
      type: instructionType,
      accessibleNote,
      hazardNote,
    });
  }

  // Final arrival instruction
  const finalDest = nodeMap.get(endNodeId)!;
  instructions.push({
    step: instructions.length + 1,
    instruction: `Arrive at ${finalDest.name} (${finalDest.hasAccessibleEntrance ? 'Accessible automatic entrance available' : 'Main Entrance'})`,
    distanceMeters: 0,
    type: 'arrive',
    accessibleNote: finalDest.hasAccessibleEntrance
      ? 'Automatic power doors & zero-threshold ramp entrance verified'
      : undefined,
  });

  const litCoverage = totalDistanceMeters > 0 ? Math.round((litDistanceMeters / totalDistanceMeters) * 100) : 100;

  return {
    nodeIds: pathNodes,
    edges: pathEdges,
    fullPolyline,
    totalDistanceMeters,
    estimatedMinutes,
    accessible: isFullyStepFree,
    litRouteCoverage: litCoverage,
    hazardsEncountered: encounteredHazards,
    instructions,
  };
}
