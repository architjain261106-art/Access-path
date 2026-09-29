import { CampusNode, CampusEdge, Hazard } from '../types/navigation';

// Decoupled Campus Landmarks (Mock spatial data)
export const CAMPUS_NODES: CampusNode[] = [
  {
    id: 'main_gate',
    name: 'Main Campus Gate',
    shortName: 'Main Gate',
    category: 'transit',
    lat: 37.4272,
    lng: -122.1705,
    description: 'South campus entrance, public transit hub and shuttle stop.',
    hasAccessibleEntrance: true,
  },
  {
    id: 'clock_tower',
    name: 'Centennial Clock Tower & Arts Plaza',
    shortName: 'Clock Tower',
    category: 'student_life',
    lat: 37.4286,
    lng: -122.1695,
    description: 'Central campus plaza with outdoor amphitheater and meeting lawn.',
    hasAccessibleEntrance: true,
  },
  {
    id: 'library',
    name: 'Williamson Memorial Library',
    shortName: 'Central Library',
    category: 'academic',
    lat: 37.4298,
    lng: -122.1712,
    description: 'Main research library, quiet study halls, 24/7 access wing.',
    hasAccessibleEntrance: true,
    hasElevator: true,
  },
  {
    id: 'student_center',
    name: 'Koret Student Center & Union',
    shortName: 'Student Center',
    category: 'student_life',
    lat: 37.4305,
    lng: -122.1682,
    description: 'Student activities, bookstore, coffee lounge, and club spaces.',
    hasAccessibleEntrance: true,
    hasElevator: true,
  },
  {
    id: 'science_hall',
    name: 'Turing Science & Engineering Complex',
    shortName: 'Science Hall',
    category: 'academic',
    lat: 37.4322,
    lng: -122.1718,
    description: 'STEM labs, robotics workshops, and large lecture auditorium.',
    hasAccessibleEntrance: true,
    hasElevator: true,
  },
  {
    id: 'dining_commons',
    name: 'University Commons & Dining Hall',
    shortName: 'Dining Commons',
    category: 'dining',
    lat: 37.4318,
    lng: -122.1668,
    description: 'Main dining hall, all-day market, dietary accommodation station.',
    hasAccessibleEntrance: true,
  },
  {
    id: 'north_dorms',
    name: 'North Quadrangle Residence Halls',
    shortName: 'North Dorms',
    category: 'residential',
    lat: 37.4338,
    lng: -122.1685,
    description: 'Undergraduate student dormitories, quad lawns, and study hubs.',
    hasAccessibleEntrance: true,
    hasElevator: true,
  },
  {
    id: 'athletics_pavilion',
    name: 'Athletics & Recreation Pavilion',
    shortName: 'Athletics Pavilion',
    category: 'wellness',
    lat: 37.4292,
    lng: -122.1652,
    description: 'Fitness gym, indoor courts, pool, and student wellness programs.',
    hasAccessibleEntrance: true,
  },
  {
    id: 'health_center',
    name: 'Student Health & Counseling Center',
    shortName: 'Health Center',
    category: 'wellness',
    lat: 37.4268,
    lng: -122.1665,
    description: 'Urgent care, medical clinic, pharmacy, accessible pick-up zone.',
    hasAccessibleEntrance: true,
  },
  {
    id: 'tech_park',
    name: 'Innovation & Research Annex',
    shortName: 'Innovation Annex',
    category: 'academic',
    lat: 37.4342,
    lng: -122.1725,
    description: 'Incubator labs, fabrication studio, and graduate research center.',
    hasAccessibleEntrance: true,
    hasElevator: true,
  },
];

// Helper to generate a curved sidewalk between two coordinates
function interpolatePath(
  start: [number, number],
  end: [number, number],
  curvatures?: [number, number][]
): [number, number][] {
  if (curvatures && curvatures.length > 0) {
    return [start, ...curvatures, end];
  }
  return [start, end];
}

// Campus Edge Network
// Defined with realistic attributes: steps/stairs, lighting status, surface type, slope grade
export const CAMPUS_EDGES: CampusEdge[] = [
  // Main Gate to Clock Tower (Direct walk vs accessible wide promenade)
  {
    id: 'edge_mg_ct',
    from: 'main_gate',
    to: 'clock_tower',
    distanceMeters: 175,
    hasStairs: false,
    isStepFree: true,
    isLit: true,
    surface: 'paved',
    slopeGrade: 1.5,
    pathCoordinates: [
      [37.4272, -122.1705],
      [37.4279, -122.1700],
      [37.4286, -122.1695],
    ],
  },
  // Main Gate to Health Center (South perimeter walkway)
  {
    id: 'edge_mg_hc',
    from: 'main_gate',
    to: 'health_center',
    distanceMeters: 350,
    hasStairs: false,
    isStepFree: true,
    isLit: true,
    surface: 'paved',
    slopeGrade: 0.8,
    pathCoordinates: [
      [37.4272, -122.1705],
      [37.4269, -122.1685],
      [37.4268, -122.1665],
    ],
  },
  // Clock Tower to Library (STAIRWAY: Grand Terrace Steps - Shortest, but NOT step-free!)
  {
    id: 'edge_ct_lib_stairs',
    from: 'clock_tower',
    to: 'library',
    distanceMeters: 195,
    hasStairs: true,
    isStepFree: false,
    isLit: true,
    surface: 'brick',
    slopeGrade: 8.5,
    pathCoordinates: [
      [37.4286, -122.1695],
      [37.4292, -122.1703],
      [37.4298, -122.1712],
    ],
  },
  // Clock Tower to Library (ACCESSIBLE RAMP & Paved Walkway - longer by 40m, but 100% step-free)
  {
    id: 'edge_ct_lib_ramp',
    from: 'clock_tower',
    to: 'library',
    distanceMeters: 245,
    hasStairs: false,
    isStepFree: true,
    isLit: true,
    surface: 'paved',
    slopeGrade: 2.2,
    pathCoordinates: [
      [37.4286, -122.1695],
      [37.4284, -122.1708],
      [37.4291, -122.1715],
      [37.4298, -122.1712],
    ],
  },
  // Clock Tower to Student Center (Main Plaza walkway)
  {
    id: 'edge_ct_sc',
    from: 'clock_tower',
    to: 'student_center',
    distanceMeters: 230,
    hasStairs: false,
    isStepFree: true,
    isLit: true,
    surface: 'paved',
    slopeGrade: 1.0,
    pathCoordinates: [
      [37.4286, -122.1695],
      [37.4295, -122.1688],
      [37.4305, -122.1682],
    ],
  },
  // Clock Tower to Athletics Pavilion (East Pine Walk - UNLIT at night, gravel surface)
  {
    id: 'edge_ct_ath_unlit',
    from: 'clock_tower',
    to: 'athletics_pavilion',
    distanceMeters: 380,
    hasStairs: false,
    isStepFree: false, // uneven gravel
    isLit: false,
    surface: 'gravel',
    slopeGrade: 3.0,
    pathCoordinates: [
      [37.4286, -122.1695],
      [37.4288, -122.1672],
      [37.4292, -122.1652],
    ],
  },
  // Health Center to Athletics Pavilion (Paved East Ring Road - fully lit)
  {
    id: 'edge_hc_ath',
    from: 'health_center',
    to: 'athletics_pavilion',
    distanceMeters: 290,
    hasStairs: false,
    isStepFree: true,
    isLit: true,
    surface: 'paved',
    slopeGrade: 1.2,
    pathCoordinates: [
      [37.4268, -122.1665],
      [37.4280, -122.1658],
      [37.4292, -122.1652],
    ],
  },
  // Library to Science Hall (Academic Mall)
  {
    id: 'edge_lib_sci',
    from: 'library',
    to: 'science_hall',
    distanceMeters: 275,
    hasStairs: false,
    isStepFree: true,
    isLit: true,
    surface: 'paved',
    slopeGrade: 1.8,
    pathCoordinates: [
      [37.4298, -122.1712],
      [37.4310, -122.1716],
      [37.4322, -122.1718],
    ],
  },
  // Student Center to Science Hall (Cross-campus connector)
  {
    id: 'edge_sc_sci',
    from: 'student_center',
    to: 'science_hall',
    distanceMeters: 360,
    hasStairs: false,
    isStepFree: true,
    isLit: true,
    surface: 'paved',
    slopeGrade: 1.4,
    pathCoordinates: [
      [37.4305, -122.1682],
      [37.4314, -122.1702],
      [37.4322, -122.1718],
    ],
  },
  // Student Center to Dining Commons (Food Walk)
  {
    id: 'edge_sc_din',
    from: 'student_center',
    to: 'dining_commons',
    distanceMeters: 190,
    hasStairs: false,
    isStepFree: true,
    isLit: true,
    surface: 'paved',
    slopeGrade: 0.5,
    pathCoordinates: [
      [37.4305, -122.1682],
      [37.4312, -122.1674],
      [37.4318, -122.1668],
    ],
  },
  // Athletics Pavilion to Dining Commons (Recreation Path)
  {
    id: 'edge_ath_din',
    from: 'athletics_pavilion',
    to: 'dining_commons',
    distanceMeters: 310,
    hasStairs: false,
    isStepFree: true,
    isLit: true,
    surface: 'paved',
    slopeGrade: 1.1,
    pathCoordinates: [
      [37.4292, -122.1652],
      [37.4306, -122.1659],
      [37.4318, -122.1668],
    ],
  },
  // Dining Commons to North Dorms (Freshman Quad Path)
  {
    id: 'edge_din_nd',
    from: 'dining_commons',
    to: 'north_dorms',
    distanceMeters: 260,
    hasStairs: false,
    isStepFree: true,
    isLit: true,
    surface: 'paved',
    slopeGrade: 1.6,
    pathCoordinates: [
      [37.4318, -122.1668],
      [37.4328, -122.1676],
      [37.4338, -122.1685],
    ],
  },
  // Science Hall to North Dorms (Science Garden Walkway - Has Steps)
  {
    id: 'edge_sci_nd_stairs',
    from: 'science_hall',
    to: 'north_dorms',
    distanceMeters: 320,
    hasStairs: true,
    isStepFree: false,
    isLit: false, // Dimly lit garden route
    surface: 'brick',
    slopeGrade: 6.0,
    pathCoordinates: [
      [37.4322, -122.1718],
      [37.4330, -122.1702],
      [37.4338, -122.1685],
    ],
  },
  // Science Hall to Tech Park (Northwest Corridor)
  {
    id: 'edge_sci_tp',
    from: 'science_hall',
    to: 'tech_park',
    distanceMeters: 240,
    hasStairs: false,
    isStepFree: true,
    isLit: true,
    surface: 'paved',
    slopeGrade: 1.0,
    pathCoordinates: [
      [37.4322, -122.1718],
      [37.4332, -122.1722],
      [37.4342, -122.1725],
    ],
  },
  // Tech Park to North Dorms (North Perimeter Lit Parkway)
  {
    id: 'edge_tp_nd',
    from: 'tech_park',
    to: 'north_dorms',
    distanceMeters: 370,
    hasStairs: false,
    isStepFree: true,
    isLit: true,
    surface: 'paved',
    slopeGrade: 1.2,
    pathCoordinates: [
      [37.4342, -122.1725],
      [37.4344, -122.1704],
      [37.4338, -122.1685],
    ],
  },
];

// Initial mock hazard alerts
export const INITIAL_HAZARDS: Hazard[] = [
  {
    id: 'hzd_1',
    title: 'Pathway Resurfacing & Trenching',
    description: 'Sidewalk torn up for fiber optic installation. Narrow barricade, not wheelchair accessible.',
    edgeId: 'edge_ct_lib_stairs',
    lat: 37.4292,
    lng: -122.1703,
    severity: 'closure',
    reportedAt: '15 mins ago',
    category: 'construction',
  },
  {
    id: 'hzd_2',
    title: 'Broken Lighting Fixture',
    description: 'Two consecutive overhead lampposts out of order along the north connector.',
    edgeId: 'edge_sci_nd_stairs',
    lat: 37.4330,
    lng: -122.1702,
    severity: 'warning',
    reportedAt: '1 hour ago',
    category: 'unlit_area',
  },
];
