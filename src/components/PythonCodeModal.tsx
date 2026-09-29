import React, { useState } from 'react';
import { X, Copy, Check, Download, Terminal, Code2 } from 'lucide-react';

interface PythonCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PythonCodeModal: React.FC<PythonCodeModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const pythonCode = `"""
AccessPath - Module 1: Interactive Google Maps-Style Interface
Campus Navigation & Accessible Routing Prototype

Requirements:
    pip install streamlit folium streamlit-folium

Run command:
    streamlit run app.py
"""

import math
import heapq
import streamlit as st
import folium
from streamlit_folium import st_folium

# -----------------------------------------------------------------------------
# 1. PAGE CONFIGURATION & GOOGLE MAPS THEME
# -----------------------------------------------------------------------------
st.set_page_config(
    page_title="AccessPath - Campus Navigation",
    page_icon="📍",
    layout="wide",
    initial_sidebar_state="expanded"
)

st.markdown("""
<style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');
    html, body, [class*="css"] {
        font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
    }
    .block-container {
        padding-top: 1rem;
        padding-bottom: 1rem;
        padding-left: 2rem;
        padding-right: 2rem;
    }
    .turn-card {
        background-color: #f8fafc;
        border-left: 4px solid #1a73e8;
        padding: 10px 14px;
        margin-bottom: 8px;
        border-radius: 4px;
        font-size: 0.88rem;
    }
    .turn-card.accessible-ramp { border-left-color: #0d9488; }
    .turn-card.warning-step { border-left-color: #f59e0b; }
    .metric-chip {
        display: inline-block;
        padding: 4px 8px;
        border-radius: 6px;
        font-size: 0.78rem;
        font-weight: 600;
        margin-right: 6px;
    }
    .chip-blue { background: #e8f0fe; color: #1a73e8; }
    .chip-green { background: #e6f4ea; color: #137333; }
    .chip-amber { background: #fef7e0; color: #b06000; }
</style>
""", unsafe_allow_html=True)

# -----------------------------------------------------------------------------
# 2. DECOUPLED SPATIAL DATA (Mock Campus Network)
# -----------------------------------------------------------------------------
CAMPUS_NODES = {
    "main_gate": {"name": "Main Campus Gate", "short_name": "Main Gate", "lat": 37.4272, "lng": -122.1705, "accessible_entrance": True, "description": "South campus entrance & transit stops."},
    "clock_tower": {"name": "Centennial Clock Tower & Arts Plaza", "short_name": "Clock Tower", "lat": 37.4286, "lng": -122.1695, "accessible_entrance": True, "description": "Central amphitheater and courtyard."},
    "library": {"name": "Williamson Memorial Library", "short_name": "Central Library", "lat": 37.4298, "lng": -122.1712, "accessible_entrance": True, "description": "Main campus library with automated accessible entrance."},
    "student_center": {"name": "Koret Student Center & Union", "short_name": "Student Center", "lat": 37.4305, "lng": -122.1682, "accessible_entrance": True, "description": "Bookstore, dining lounge, and student hub."},
    "science_hall": {"name": "Turing Science & Engineering Complex", "short_name": "Science Complex", "lat": 37.4322, "lng": -122.1718, "accessible_entrance": True, "description": "STEM laboratories and lecture halls."},
    "dining_commons": {"name": "University Commons & Dining Hall", "short_name": "Dining Commons", "lat": 37.4318, "lng": -122.1668, "accessible_entrance": True, "description": "Primary cafeteria with dietary stations."},
    "north_dorms": {"name": "North Quadrangle Residence Halls", "short_name": "North Dorms", "lat": 37.4338, "lng": -122.1685, "accessible_entrance": True, "description": "Undergraduate residence quads."},
    "athletics_pavilion": {"name": "Athletics & Recreation Pavilion", "short_name": "Athletics Pavilion", "lat": 37.4292, "lng": -122.1652, "accessible_entrance": True, "description": "Campus gym, fitness studios, and pool."},
    "health_center": {"name": "Student Health & Wellness Clinic", "short_name": "Health Clinic", "lat": 37.4268, "lng": -122.1665, "accessible_entrance": True, "description": "Urgent care clinic & accessible pickup zone."},
    "tech_park": {"name": "Innovation & Research Annex", "short_name": "Tech Annex", "lat": 37.4342, "lng": -122.1725, "accessible_entrance": True, "description": "Engineering incubator labs and design studios."}
}

CAMPUS_EDGES = [
    {"id": "e_mg_ct", "u": "main_gate", "v": "clock_tower", "distance": 175, "has_stairs": False, "is_step_free": True, "is_lit": True, "slope_grade": 1.5, "coords": [[37.4272, -122.1705], [37.4279, -122.1700], [37.4286, -122.1695]]},
    {"id": "e_mg_hc", "u": "main_gate", "v": "health_center", "distance": 350, "has_stairs": False, "is_step_free": True, "is_lit": True, "slope_grade": 0.8, "coords": [[37.4272, -122.1705], [37.4269, -122.1685], [37.4268, -122.1665]]},
    {"id": "e_ct_lib_stairs", "u": "clock_tower", "v": "library", "distance": 195, "has_stairs": True, "is_step_free": False, "is_lit": True, "slope_grade": 8.0, "coords": [[37.4286, -122.1695], [37.4292, -122.1703], [37.4298, -122.1712]]},
    {"id": "e_ct_lib_ramp", "u": "clock_tower", "v": "library", "distance": 245, "has_stairs": False, "is_step_free": True, "is_lit": True, "slope_grade": 2.2, "coords": [[37.4286, -122.1695], [37.4284, -122.1708], [37.4291, -122.1715], [37.4298, -122.1712]]},
    {"id": "e_ct_sc", "u": "clock_tower", "v": "student_center", "distance": 230, "has_stairs": False, "is_step_free": True, "is_lit": True, "slope_grade": 1.0, "coords": [[37.4286, -122.1695], [37.4295, -122.1688], [37.4305, -122.1682]]},
    {"id": "e_ct_ath_unlit", "u": "clock_tower", "v": "athletics_pavilion", "distance": 380, "has_stairs": False, "is_step_free": False, "is_lit": False, "slope_grade": 3.0, "coords": [[37.4286, -122.1695], [37.4288, -122.1672], [37.4292, -122.1652]]},
    {"id": "e_hc_ath", "u": "health_center", "v": "athletics_pavilion", "distance": 290, "has_stairs": False, "is_step_free": True, "is_lit": True, "slope_grade": 1.2, "coords": [[37.4268, -122.1665], [37.4280, -122.1658], [37.4292, -122.1652]]},
    {"id": "e_lib_sci", "u": "library", "v": "science_hall", "distance": 275, "has_stairs": False, "is_step_free": True, "is_lit": True, "slope_grade": 1.8, "coords": [[37.4298, -122.1712], [37.4310, -122.1716], [37.4322, -122.1718]]},
    {"id": "e_sc_sci", "u": "student_center", "v": "science_hall", "distance": 360, "has_stairs": False, "is_step_free": True, "is_lit": True, "slope_grade": 1.4, "coords": [[37.4305, -122.1682], [37.4314, -122.1702], [37.4322, -122.1718]]},
    {"id": "e_sc_din", "u": "student_center", "v": "dining_commons", "distance": 190, "has_stairs": False, "is_step_free": True, "is_lit": True, "slope_grade": 0.5, "coords": [[37.4305, -122.1682], [37.4312, -122.1674], [37.4318, -122.1668]]},
    {"id": "e_ath_din", "u": "athletics_pavilion", "v": "dining_commons", "distance": 310, "has_stairs": False, "is_step_free": True, "is_lit": True, "slope_grade": 1.1, "coords": [[37.4292, -122.1652], [37.4306, -122.1659], [37.4318, -122.1668]]},
    {"id": "e_din_nd", "u": "dining_commons", "v": "north_dorms", "distance": 260, "has_stairs": False, "is_step_free": True, "is_lit": True, "slope_grade": 1.6, "coords": [[37.4318, -122.1668], [37.4328, -122.1676], [37.4338, -122.1685]]},
    {"id": "e_sci_nd_stairs", "u": "science_hall", "v": "north_dorms", "distance": 320, "has_stairs": True, "is_step_free": False, "is_lit": False, "slope_grade": 6.5, "coords": [[37.4322, -122.1718], [37.4330, -122.1702], [37.4338, -122.1685]]},
    {"id": "e_sci_tp", "u": "science_hall", "v": "tech_park", "distance": 240, "has_stairs": False, "is_step_free": True, "is_lit": True, "slope_grade": 1.0, "coords": [[37.4322, -122.1718], [37.4332, -122.1722], [37.4342, -122.1725]]},
    {"id": "e_tp_nd", "u": "tech_park", "v": "north_dorms", "distance": 370, "has_stairs": False, "is_step_free": True, "is_lit": True, "slope_grade": 1.2, "coords": [[37.4342, -122.1725], [37.4344, -122.1704], [37.4338, -122.1685]]}
]

INITIAL_HAZARDS = [
    {"id": "h_1", "title": "Pavement Resurfacing Work", "edge_id": "e_ct_lib_stairs", "lat": 37.4292, "lng": -122.1703, "severity": "closure", "description": "Trenching for conduit cable; passage barricaded."},
    {"id": "h_2", "title": "Damaged Lamppost", "edge_id": "e_sci_nd_stairs", "lat": 37.4330, "lng": -122.1702, "severity": "warning", "description": "Lighting out on garden stairs after dusk."}
]

# -----------------------------------------------------------------------------
# 3. GRAPH PATHFINDING & ROUTING ENGINE (Dijkstra)
# -----------------------------------------------------------------------------
def solve_dijkstra(start_node: str, end_node: str, mode: str, hazards: list):
    if start_node == end_node or start_node not in CAMPUS_NODES or end_node not in CAMPUS_NODES:
        return None

    closed_edges = {h["edge_id"] for h in hazards if h["severity"] == "closure" and "edge_id" in h}
    adj = {node_id: [] for node_id in CAMPUS_NODES}
    for edge in CAMPUS_EDGES:
        adj[edge["u"]].append((edge["v"], edge, False))
        adj[edge["v"]].append((edge["u"], edge, True))

    def get_edge_cost(edge):
        cost = edge["distance"]
        if edge["id"] in closed_edges:
            cost += 50000
        if mode == "Step-Free / Accessible":
            if edge["has_stairs"] or not edge["is_step_free"]:
                cost += 30000
            if edge["slope_grade"] > 4.0:
                cost += edge["distance"] * (edge["slope_grade"] * 2.0)
        elif mode == "Lit Night Route":
            if not edge["is_lit"]:
                cost += edge["distance"] * 4 + 800
        return cost

    pq = [(0, start_node, [start_node], [], [])]
    visited = set()

    while pq:
        curr_cost, u, p_nodes, p_edges, p_revs = heapq.heappop(pq)
        if u in visited:
            continue
        visited.add(u)

        if u == end_node:
            polyline = []
            total_dist = sum(e["distance"] for e in p_edges)
            is_step_free = all(e["is_step_free"] and not e["has_stairs"] for e in p_edges)
            lit_dist = sum(e["distance"] for e in p_edges if e["is_lit"])

            for i, edge in enumerate(p_edges):
                coords = list(edge["coords"])
                if p_revs[i]:
                    coords.reverse()
                for j, pt in enumerate(coords):
                    if not polyline or j > 0:
                        polyline.append(pt)

            pace = 65 if mode == "Step-Free / Accessible" else (72 if mode == "Lit Night Route" else 80)
            eta_mins = max(1, round(total_dist / pace))
            lit_pct = round((lit_dist / total_dist) * 100) if total_dist > 0 else 100

            steps = []
            for i in range(len(p_nodes) - 1):
                from_n = CAMPUS_NODES[p_nodes[i]]
                to_n = CAMPUS_NODES[p_nodes[i+1]]
                edge = p_edges[i]
                note = ""
                if edge["has_stairs"]:
                    instruction = f"Ascend terrace steps toward {to_n['short_name']}"
                    note = "⚠️ Caution: Flight of steps (not wheelchair accessible)"
                elif edge["slope_grade"] > 2.0:
                    instruction = f"Follow accessible ramp ({edge['slope_grade']}% grade) toward {to_n['short_name']}"
                    note = "♿ ADA compliant step-free ramp"
                else:
                    instruction = f"Walk along paved promenade toward {to_n['short_name']}"

                steps.append({"instruction": instruction, "distance": edge["distance"], "note": note})

            steps.append({
                "instruction": f"Arrive at {CAMPUS_NODES[end_node]['name']}",
                "distance": 0,
                "note": "Automatic entrance available" if CAMPUS_NODES[end_node]["accessible_entrance"] else "Standard entrance"
            })

            return {"polyline": polyline, "total_dist": total_dist, "eta_mins": eta_mins, "is_step_free": is_step_free, "lit_pct": lit_pct, "steps": steps}

        for neighbor, edge, is_rev in adj[u]:
            if neighbor not in visited:
                cost = get_edge_cost(edge)
                heapq.heappush(pq, (curr_cost + cost, neighbor, p_nodes + [neighbor], p_edges + [edge], p_revs + [is_rev]))

    return None

# -----------------------------------------------------------------------------
# 4. STREAMLIT APPLICATION & LAYOUT (Google Maps Style Split)
# -----------------------------------------------------------------------------
def main():
    if "hazards" not in st.session_state:
        st.session_state.hazards = list(INITIAL_HAZARDS)

    st.sidebar.markdown("""
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
            <div style="background-color: #1a73e8; color: white; width: 28px; height: 28px; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 16px;">A</div>
            <h2 style="margin: 0; padding: 0; font-size: 1.35rem; color: #1e293b;">AccessPath</h2>
        </div>
        <p style="font-size: 0.8rem; color: #64748b; margin-top: 0; margin-bottom: 1rem;">Campus Navigation & Accessible Routing</p>
    """, unsafe_allow_html=True)

    landmark_keys = list(CAMPUS_NODES.keys())
    col_orig, col_dest = st.sidebar.columns([1, 1])
    with col_orig:
        start_sel = st.selectbox("Origin (Start)", options=landmark_keys, format_func=lambda k: CAMPUS_NODES[k]["short_name"], index=0)
    with col_dest:
        dest_sel = st.selectbox("Destination", options=landmark_keys, format_func=lambda k: CAMPUS_NODES[k]["short_name"], index=2)

    travel_mode = st.sidebar.radio("Travel Profile", options=["Standard / Shortest", "Step-Free / Accessible", "Lit Night Route"], index=1)
    route_data = solve_dijkstra(start_sel, dest_sel, travel_mode, st.session_state.hazards)

    st.sidebar.markdown("---")
    if route_data:
        st.sidebar.markdown(f"""
            <div style="background-color: #f1f5f9; padding: 12px; border-radius: 8px; margin-bottom: 12px;">
                <div style="display: flex; justify-content: space-between; align-items: baseline;">
                    <span style="font-size: 1.5rem; font-weight: 700; color: #0f172a;">{route_data['eta_mins']} min</span>
                    <span style="font-size: 0.9rem; color: #475569; font-weight: 500;">{route_data['total_dist']} m ({round(route_data['total_dist'] * 3.28084)} ft)</span>
                </div>
                <div style="margin-top: 8px;">
                    <span class="metric-chip {'chip-green' if route_data['is_step_free'] else 'chip-amber'}">{'♿ 100% Step-Free' if route_data['is_step_free'] else '⚠️ Contains Stairs'}</span>
                    <span class="metric-chip chip-blue">💡 {route_data['lit_pct']}% Lit Route</span>
                </div>
            </div>
        """, unsafe_allow_html=True)

        st.sidebar.markdown("##### 📍 Turn-by-Turn Directions")
        for i, step in enumerate(route_data["steps"]):
            card_class = "turn-card"
            if "ramp" in step["note"].lower():
                card_class += " accessible-ramp"
            elif "step" in step["note"].lower() or "stairs" in step["note"].lower():
                card_class += " warning-step"
            dist_label = f" ({step['distance']}m)" if step['distance'] > 0 else ""
            note_html = f"<div style='font-size: 0.76rem; color: #64748b; margin-top: 3px;'>{step['note']}</div>" if step['note'] else ""
            st.sidebar.markdown(f"<div class='{card_class}'><strong>Step {i+1}:</strong> {step['instruction']}{dist_label}{note_html}</div>", unsafe_allow_html=True)

    # -------------------------------------------------------------------------
    # 5. FOLIUM MAP GENERATION (CartoDB Positron Canvas)
    # -------------------------------------------------------------------------
    campus_center = [37.4305, -122.1695]
    m = folium.Map(location=campus_center, zoom_start=16, tiles="CartoDB positron", control_scale=True)

    for edge in CAMPUS_EDGES:
        color = "#f59e0b" if edge["has_stairs"] else ("#94a3b8" if edge["is_lit"] else "#64748b")
        dash = "4, 4" if edge["has_stairs"] else None
        folium.PolyLine(locations=edge["coords"], color=color, weight=3, opacity=0.45, dash_array=dash).add_to(m)

    if route_data:
        folium.PolyLine(locations=route_data["polyline"], color="#ffffff", weight=8, opacity=0.9).add_to(m)
        route_color = "#0d9488" if travel_mode == "Step-Free / Accessible" else ("#4f46e5" if travel_mode == "Lit Night Route" else "#1a73e8")
        folium.PolyLine(locations=route_data["polyline"], color=route_color, weight=5, opacity=0.95).add_to(m)

    for node_id, node in CAMPUS_NODES.items():
        if node_id == start_sel:
            folium.Marker(location=[node["lat"], node["lng"]], tooltip=f"Start: {node['short_name']}", icon=folium.Icon(color="blue", icon="play", prefix="fa")).add_to(m)
        elif node_id == dest_sel:
            folium.Marker(location=[node["lat"], node["lng"]], tooltip=f"Destination: {node['short_name']}", icon=folium.Icon(color="red", icon="flag", prefix="fa")).add_to(m)
        else:
            folium.CircleMarker(location=[node["lat"], node["lng"]], radius=6, color="#475569", fill=True, fill_color="#ffffff", fill_opacity=0.9, weight=2, tooltip=node["short_name"]).add_to(m)

    for hazard in st.session_state.hazards:
        h_color = "red" if hazard["severity"] == "closure" else "orange"
        folium.Marker(location=[hazard["lat"], hazard["lng"]], tooltip=f"Hazard: {hazard['title']}", icon=folium.Icon(color=h_color, icon="ban" if hazard["severity"] == "closure" else "exclamation-triangle", prefix="fa")).add_to(m)

    st_folium(m, width="100%", height=720)

if __name__ == "__main__":
    main()
`;

  const handleCopy = () => {
    navigator.clipboard.writeText(pythonCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    // Fetch or create download link for app.py
    const element = document.createElement('a');
    const file = new Blob([pythonCode], { type: 'text/x-python' });
    element.href = URL.createObjectURL(file);
    element.download = 'app.py';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-neutral-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 bg-neutral-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
              <Code2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-neutral-900">Python Streamlit Prototype (`app.py`)</h3>
              <p className="text-xs text-neutral-500">Self-contained file using Streamlit, Folium, and Dijkstra</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-700 rounded-lg hover:bg-neutral-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs">
          {/* Quick Terminal Guide */}
          <div className="bg-neutral-900 text-neutral-200 rounded-lg p-3 font-mono">
            <div className="flex items-center gap-2 text-neutral-400 text-[11px] mb-1.5">
              <Terminal className="w-3.5 h-3.5" />
              <span>Shell Installation & Run</span>
            </div>
            <div className="text-emerald-400 select-all">$ pip install streamlit folium streamlit-folium</div>
            <div className="text-blue-400 select-all mt-1">$ streamlit run app.py</div>
          </div>

          <p className="text-neutral-600 leading-relaxed">
            The complete, production-ready <code className="bg-neutral-100 px-1.5 py-0.5 rounded font-mono text-neutral-800">app.py</code> script is saved directly in this applet&apos;s root directory. It provides:
          </p>

          <ul className="list-disc list-inside space-y-1 text-neutral-600 pl-1">
            <li><strong>Streamlit Wide Layout:</strong> Google Maps-style side panel paired with an edge-to-edge interactive Folium canvas.</li>
            <li><strong>Decoupled Spatial Model:</strong> 10 landmarks with coordinate pairs, step-free/stairs flags, lighting coverage, and slope grades.</li>
            <li><strong>Dijkstra Algorithm:</strong> Dynamic cost evaluation for Standard, Step-Free / Accessible, and Lit Night Route profiles.</li>
            <li><strong>CartoDB Positron:</strong> Clean minimalist tiles with custom start/destination pins and active hazard markers.</li>
          </ul>

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-medium rounded-lg transition-colors"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied Snippet' : 'Copy Preview'}</span>
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Download app.py</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
