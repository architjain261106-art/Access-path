export type TravelMode = 'standard' | 'accessible' | 'lit_night';

export type LandmarkCategory = 'academic' | 'residential' | 'dining' | 'student_life' | 'wellness' | 'transit';

export interface CampusNode {
  id: string;
  name: string;
  shortName: string;
  category: LandmarkCategory;
  lat: number;
  lng: number;
  description: string;
  hasAccessibleEntrance: boolean;
  hasElevator?: boolean;
}

export interface Hazard {
  id: string;
  title: string;
  description: string;
  edgeId?: string;
  nodeId?: string;
  lat: number;
  lng: number;
  severity: 'warning' | 'closure';
  reportedAt: string;
  category: 'construction' | 'stairs_out_of_service' | 'surface_damage' | 'unlit_area' | 'weather';
}

export interface CampusEdge {
  id: string;
  from: string;
  to: string;
  distanceMeters: number;
  hasStairs: boolean;
  isStepFree: boolean;
  isLit: boolean;
  surface: 'paved' | 'brick' | 'gravel';
  slopeGrade: number; // percentage, e.g. 2 for 2%
  pathCoordinates: [number, number][]; // [lat, lng] array for curved realistic sidewalks
}

export interface TurnInstruction {
  step: number;
  instruction: string;
  distanceMeters: number;
  type: 'depart' | 'turn_left' | 'turn_right' | 'straight' | 'ramp' | 'arrive';
  accessibleNote?: string;
  hazardNote?: string;
}

export interface RouteResult {
  nodeIds: string[];
  edges: CampusEdge[];
  fullPolyline: [number, number][];
  totalDistanceMeters: number;
  estimatedMinutes: number;
  accessible: boolean;
  litRouteCoverage: number; // percentage 0-100
  hazardsEncountered: Hazard[];
  instructions: TurnInstruction[];
}
