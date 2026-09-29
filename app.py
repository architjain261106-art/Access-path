"""
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

# Custom CSS for clean Google Maps style aesthetic
st.markdown("""
<style>
    /* Google Maps Clean Fonts & Styling */
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');
    
    html, body, [class*="css"] {
        font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
    }
    
    /* Remove redundant Streamlit header margin */
    .block-container {
        padding-top: 1rem;
        padding-bottom: 1rem;
        padding-left: 2rem;
        padding-right: 2rem;
    }
    
    /* Turn instruction cards */
    .turn-card {
        background-color: #f8fafc;
        border-left: 4px solid #1a73e8;
        padding: 10px 14px;
        margin-bottom: 8px;
        border-radius: 4px;
        font-size: 0.88rem;
    }
    .turn-card.accessible-ramp {
        border-left-color: #0d9488;
    }
    .turn-card.warning-step {
        border-left-color: #f59e0b;
    }
    
    /* Metric pill styles */
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
    .chip-red { background: #fce8e6; color: #c5221f; }
</style>
""", unsafe_allow_html=True)


# -----------------------------------------------------------------------------
# 2. DECOUPLED SPATIAL DATA (Mock Campus Network)
# -----------------------------------------------------------------------------
# Realistic coordinates centered on a university campus setting
CAMPUS_NODES = {
    "main_gate": {
        "name": "Main Campus Gate",
        "short_name": "Main Gate",
        "lat": 37.4272,
        "lng": -122.1705,
        "category": "Transit Entrance",
        "accessible_entrance": True,
        "description": "South campus entrance, shuttle stops & perimeter transit."
    },
    "clock_tower": {
        "name": "Centennial Clock Tower & Arts Plaza",
        "short_name": "Clock Tower",
        "lat": 37.4286,
        "lng": -122.1695,
        "category": "Central Landmark",
        "accessible_entrance": True,
        "description": "Central amphitheater and campus meeting courtyard."
    },
    "library": {
        "name": "Williamson Memorial Library",
        "short_name": "Central Library",
        "lat": 37.4298,
        "lng": -122.1712,
        "category": "Academic",
        "accessible_entrance": True,
        "description": "Main campus library with automated accessible west entrance."
    },
    "student_center": {
        "name": "Koret Student Center & Union",
        "short_name": "Student Center",
        "lat": 37.4305,
        "lng": -122.1682,
        "category": "Student Life",
        "accessible_entrance": True,
        "description": "Bookstore, dining lounge, and student activity offices."
    },
    "science_hall": {
        "name": "Turing Science & Engineering Complex",
        "short_name": "Science Complex",
        "lat": 37.4322,
        "lng": -122.1718,
        "category": "Academic",
        "accessible_entrance": True,
        "description": "STEM laboratories, lecture halls, and maker spaces."
    },
    "dining_commons": {
        "name": "University Commons & Dining Hall",
        "short_name": "Dining Commons",
        "lat": 37.4318,
        "lng": -122.1668,
        "category": "Dining",
        "accessible_entrance": True,
        "description": "Primary cafeteria with dietary and step-free access."
    },
    "north_dorms": {
        "name": "North Quadrangle Residence Halls",
        "short_name": "North Dorms",
        "lat": 37.4338,
        "lng": -122.1685,
        "category": "Residential",
        "accessible_entrance": True,
        "description": "Undergraduate residence quads and courtyard."
    },
    "athletics_pavilion": {
        "name": "Athletics & Recreation Pavilion",
        "short_name": "Athletics Pavilion",
        "lat": 37.4292,
        "lng": -122.1652,
        "category": "Athletics",
        "accessible_entrance": True,
        "description": "Campus gym, fitness studios, and pool."
    },
    "health_center": {
        "name": "Student Health & Wellness Clinic",
        "short_name": "Health Clinic",
        "lat": 37.4268,
        "lng": -122.1665,
        "category": "Health & Support",
        "accessible_entrance": True,
        "description": "Urgent care clinic and accessible mobility van station."
    },
    "tech_park": {
        "name": "Innovation & Research Annex",
        "short_name": "Tech Annex",
        "lat": 37.4342,
        "lng": -122.1725,
        "category": "Research",
        "accessible_entrance": True,
        "description": "Engineering incubator labs and design studios."
    }
}

# Campus Edge Network connecting landmark nodes
# Attributes: distance (m), has_stairs (bool), is_step_free (bool), is_lit (bool), slope_grade (%)
CAMPUS_EDGES = [
    {
        "id": "e_mg_ct", "u": "main_gate", "v": "clock_tower",
        "distance": 175, "has_stairs": False, "is_step_free": True, "is_lit": True, "slope_grade": 1.5,
        "coords": [[37.4272, -122.1705], [37.4279, -122.1700], [37.4286, -122.1695]]
    },
    {
        "id": "e_mg_hc", "u": "main_gate", "v": "health_center",
        "distance": 350, "has_stairs": False, "is_step_free": True, "is_lit": True, "slope_grade": 0.8,
        "coords": [[37.4272, -122.1705], [37.4269, -122.1685], [37.4268, -122.1665]]
    },
    {
        # Outdoor Terrace Stairs: short path, NOT accessible
        "id": "e_ct_lib_stairs", "u": "clock_tower", "v": "library",
        "distance": 195, "has_stairs": True, "is_step_free": False, "is_lit": True, "slope_grade": 8.0,
        "coords": [[37.4286, -122.1695], [37.4292, -122.1703], [37.4298, -122.1712]]
    },
    {
        # Accessible Switchback Ramp: step-free bypass for Clock Tower to Library
        "id": "e_ct_lib_ramp", "u": "clock_tower", "v": "library",
        "distance": 245, "has_stairs": False, "is_step_free": True, "is_lit": True, "slope_grade": 2.2,
        "coords": [[37.4286, -122.1695], [37.4284, -122.1708], [37.4291, -122.1715], [37.4298, -122.1712]]
    },
    {
        "id": "e_ct_sc", "u": "clock_tower", "v": "student_center",
        "distance": 230, "has_stairs": False, "is_step_free": True, "is_lit": True, "slope_grade": 1.0,
        "coords": [[37.4286, -122.1695], [37.4295, -122.1688], [37.4305, -122.1682]]
    },
    {
        # Unlit gravel path through grove
        "id": "e_ct_ath_unlit", "u": "clock_tower", "v": "athletics_pavilion",
        "distance": 380, "has_stairs": False, "is_step_free": False, "is_lit": False, "slope_grade": 3.0,
        "coords": [[37.4286, -122.1695], [37.4288, -122.1672], [37.4292, -122.1652]]
    },
    {
        "id": "e_hc_ath", "u": "health_center", "v": "athletics_pavilion",
        "distance": 290, "has_stairs": False, "is_step_free": True, "is_lit": True, "slope_grade": 1.2,
        "coords": [[37.4268, -122.1665], [37.4280, -122.1658], [37.4292, -122.1652]]
    },
    {
        "id": "e_lib_sci", "u": "library", "v": "science_hall",
        "distance": 275, "has_stairs": False, "is_step_free": True, "is_lit": True, "slope_grade": 1.8,
        "coords": [[37.4298, -122.1712], [37.4310, -122.1716], [37.4322, -122.1718]]
    },
    {
        "id": "e_sc_sci", "u": "student_center", "v": "science_hall",
        "distance": 360, "has_stairs": False, "is_step_free": True, "is_lit": True, "slope_grade": 1.4,
        "coords": [[37.4305, -122.1682], [37.4314, -122.1702], [37.4322, -122.1718]]
    },
    {
        "id": "e_sc_din", "u": "student_center", "v": "dining_commons",
        "distance": 190, "has_stairs": False, "is_step_free": True, "is_lit": True, "slope_grade": 0.5,
        "coords": [[37.4305, -122.1682], [37.4312, -122.1674], [37.4318, -122.1668]]
    },
    {
        "id": "e_ath_din", "u": "athletics_pavilion", "v": "dining_commons",
        "distance": 310, "has_stairs": False, "is_step_free": True, "is_lit": True, "slope_grade": 1.1,
        "coords": [[37.4292, -122.1652], [37.4306, -122.1659], [37.4318, -122.1668]]
    },
    {
        "id": "e_din_nd", "u": "dining_commons", "v": "north_dorms",
        "distance": 260, "has_stairs": False, "is_step_free": True, "is_lit": True, "slope_grade": 1.6,
        "coords": [[37.4318, -122.1668], [37.4328, -122.1676], [37.4338, -122.1685]]
    },
    {
        # Steps pathway with dim lighting
        "id": "e_sci_nd_stairs", "u": "science_hall", "v": "north_dorms",
        "distance": 320, "has_stairs": True, "is_step_free": False, "is_lit": False, "slope_grade": 6.5,
        "coords": [[37.4322, -122.1718], [37.4330, -122.1702], [37.4338, -122.1685]]
    },
    {
        "id": "e_sci_tp", "u": "science_hall", "v": "tech_park",
        "distance": 240, "has_stairs": False, "is_step_free": True, "is_lit": True, "slope_grade": 1.0,
        "coords": [[37.4322, -122.1718], [37.4332, -122.1722], [37.4342, -122.1725]]
    },
    {
        "id": "e_tp_nd", "u": "tech_park", "v": "north_dorms",
        "distance": 370, "has_stairs": False, "is_step_free": True, "is_lit": True, "slope_grade": 1.2,
        "coords": [[37.4342, -122.1725], [37.4344, -122.1704], [37.4338, -122.1685]]
    }
]

# Active mock hazards
INITIAL_HAZARDS = [
    {
        "id": "h_1",
        "title": "Pavement Resurfacing Work",
        "edge_id": "e_ct_lib_stairs",
        "lat": 37.4292,
        "lng": -122.1703,
        "severity": "closure",
        "description": "Trenching for conduit cable; passage barricaded."
    },
    {
        "id": "h_2",
        "title": "Damaged Lamppost",
        "edge_id": "e_sci_nd_stairs",
        "lat": 37.4330,
        "lng": -122.1702,
        "severity": "warning",
        "description": "Lighting out on garden stairs after dusk."
    }
]


# -----------------------------------------------------------------------------
# 3. GRAPH PATHFINDING & ROUTING ENGINE (Dijkstra)
# -----------------------------------------------------------------------------
def solve_dijkstra(start_node: str, end_node: str, mode: str, hazards: list):
    """
    Computes optimal path between start_node and end_node using Dijkstra's algorithm.
    Weights are customized according to travel profile:
      - 'standard': shortest physical distance
      - 'accessible': heavily penalizes stairs, steep slopes, and non-step-free edges
      - 'lit_night': prioritizes well-lit corridors and avoids dark stretches
    """
    if start_node == end_node or start_node not in CAMPUS_NODES or end_node not in CAMPUS_NODES:
        return None

    # Identify closure hazards
    closed_edges = {h["edge_id"] for h in hazards if h["severity"] == "closure" and "edge_id" in h}

    # Build adjacency list
    adj = {node_id: [] for node_id in CAMPUS_NODES}
    for edge in CAMPUS_EDGES:
        adj[edge["u"]].append((edge["v"], edge, False))
        adj[edge["v"]].append((edge["u"], edge, True))

    # Calculate mode cost
    def get_edge_cost(edge):
        cost = edge["distance"]
        if edge["id"] in closed_edges:
            cost += 50000  # Avoid closed pathways

        if mode == "Step-Free / Accessible":
            if edge["has_stairs"] or not edge["is_step_free"]:
                cost += 30000  # Strict barrier penalty
            if edge["slope_grade"] > 4.0:
                cost += edge["distance"] * (edge["slope_grade"] * 2.0)
        elif mode == "Lit Night Route":
            if not edge["is_lit"]:
                cost += edge["distance"] * 4 + 800

        return cost

    # Dijkstra queue: (accumulated_cost, current_node, path_nodes, path_edges, reverse_flags)
    pq = [(0, start_node, [start_node], [], [])]
    visited = set()

    while pq:
        curr_cost, u, p_nodes, p_edges, p_revs = heapq.heappop(pq)

        if u in visited:
            continue
        visited.add(u)

        if u == end_node:
            # Reconstruct polyline and metrics
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

            # ETA calculation
            pace = 65 if mode == "Step-Free / Accessible" else (72 if mode == "Lit Night Route" else 80)
            eta_mins = max(1, round(total_dist / pace))
            lit_pct = round((lit_dist / total_dist) * 100) if total_dist > 0 else 100

            # Step-by-step turn instructions
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

                steps.append({
                    "instruction": instruction,
                    "distance": edge["distance"],
                    "note": note
                })

            steps.append({
                "instruction": f"Arrive at {CAMPUS_NODES[end_node]['name']}",
                "distance": 0,
                "note": "Automatic entrance available" if CAMPUS_NODES[end_node]["accessible_entrance"] else "Standard entrance"
            })

            return {
                "polyline": polyline,
                "total_dist": total_dist,
                "eta_mins": eta_mins,
                "is_step_free": is_step_free,
                "lit_pct": lit_pct,
                "steps": steps,
                "path_nodes": p_nodes
            }

        for neighbor, edge, is_rev in adj[u]:
            if neighbor not in visited:
                cost = get_edge_cost(edge)
                heapq.heappush(pq, (
                    curr_cost + cost,
                    neighbor,
                    p_nodes + [neighbor],
                    p_edges + [edge],
                    p_revs + [is_rev]
                ))

    return None


# -----------------------------------------------------------------------------
# 4. STREAMLIT APPLICATION & LAYOUT (Google Maps Style Split)
# -----------------------------------------------------------------------------
def main():
    # Session state for hazards
    if "hazards" not in st.session_state:
        st.session_state.hazards = list(INITIAL_HAZARDS)

    # Sidebar Header
    st.sidebar.markdown("""
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
            <div style="background-color: #1a73e8; color: white; width: 28px; height: 28px; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 16px;">
                A
            </div>
            <h2 style="margin: 0; padding: 0; font-size: 1.35rem; color: #1e293b;">AccessPath</h2>
        </div>
        <p style="font-size: 0.8rem; color: #64748b; margin-top: 0; margin-bottom: 1rem;">
            Campus Navigation & Accessible Routing
        </p>
    """, unsafe_allow_html=True)

    # Origin & Destination Selection
    landmark_keys = list(CAMPUS_NODES.keys())
    landmark_names = {k: v["name"] for k, v in CAMPUS_NODES.items()}

    col_orig, col_dest = st.sidebar.columns([1, 1])
    with col_orig:
        start_sel = st.selectbox(
            "Origin (Start)",
            options=landmark_keys,
            format_func=lambda k: CAMPUS_NODES[k]["short_name"],
            index=0
        )
    with col_dest:
        dest_sel = st.selectbox(
            "Destination",
            options=landmark_keys,
            format_func=lambda k: CAMPUS_NODES[k]["short_name"],
            index=2  # Williamson Memorial Library
        )

    # Mode Selector
    travel_mode = st.sidebar.radio(
        "Travel Profile",
        options=["Standard / Shortest", "Step-Free / Accessible", "Lit Night Route"],
        index=1,
        help="Select route preference. Accessible avoids stairs; Lit Night prioritizes illuminated pathways."
    )

    # Compute Route
    route_data = solve_dijkstra(start_sel, dest_sel, travel_mode, st.session_state.hazards)

    # Directions Card in Sidebar
    st.sidebar.markdown("---")
    if route_data:
        # Summary Header
        st.sidebar.markdown(f"""
            <div style="background-color: #f1f5f9; padding: 12px; border-radius: 8px; margin-bottom: 12px;">
                <div style="display: flex; justify-content: space-between; align-items: baseline;">
                    <span style="font-size: 1.5rem; font-weight: 700; color: #0f172a;">{route_data['eta_mins']} min</span>
                    <span style="font-size: 0.9rem; color: #475569; font-weight: 500;">{route_data['total_dist']} m ({round(route_data['total_dist'] * 3.28084)} ft)</span>
                </div>
                <div style="margin-top: 8px;">
                    <span class="metric-chip {'chip-green' if route_data['is_step_free'] else 'chip-amber'}">
                        {'♿ 100% Step-Free' if route_data['is_step_free'] else '⚠️ Contains Stairs'}
                    </span>
                    <span class="metric-chip chip-blue">
                        💡 {route_data['lit_pct']}% Lit Route
                    </span>
                </div>
            </div>
        """, unsafe_allow_html=True)

        # Step by Step Instructions
        st.sidebar.markdown("##### 📍 Turn-by-Turn Directions")
        for i, step in enumerate(route_data["steps"]):
            card_class = "turn-card"
            if "ramp" in step["note"].lower():
                card_class += " accessible-ramp"
            elif "step" in step["note"].lower() or "stairs" in step["note"].lower():
                card_class += " warning-step"

            dist_label = f" ({step['distance']}m)" if step['distance'] > 0 else ""
            note_html = f"<div style='font-size: 0.76rem; color: #64748b; margin-top: 3px;'>{step['note']}</div>" if step['note'] else ""

            st.sidebar.markdown(f"""
                <div class="{card_class}">
                    <strong>Step {i+1}:</strong> {step['instruction']}{dist_label}
                    {note_html}
                </div>
            """, unsafe_allow_html=True)
    else:
        st.sidebar.info("Select different start and destination landmarks to calculate directions.")

    # Report Hazard Trigger (Sidebar)
    st.sidebar.markdown("---")
    with st.sidebar.expander("⚠️ Report Hazard / Path Closure"):
        with st.form("hazard_form"):
            h_title = st.text_input("Obstacle Title", placeholder="e.g. Broken pavement, elevator down")
            h_edge = st.selectbox(
                "Pathway Location",
                options=[e["id"] for e in CAMPUS_EDGES],
                format_func=lambda eid: f"{[e for e in CAMPUS_EDGES if e['id'] == eid][0]['u']} to {[e for e in CAMPUS_EDGES if e['id'] == eid][0]['v']}"
            )
            h_sev = st.selectbox("Severity", ["closure", "warning"], format_func=lambda s: "Full Closure (Impassable)" if s == "closure" else "Warning (Caution)")
            h_desc = st.text_area("Description", placeholder="Details for accessibility detour...")
            submit_h = st.form_submit_button("Submit Hazard Alert")

            if submit_h and h_title:
                edge_obj = [e for e in CAMPUS_EDGES if e["id"] == h_edge][0]
                mid_pt = edge_obj["coords"][len(edge_obj["coords"]) // 2]
                st.session_state.hazards.append({
                    "id": f"h_{len(st.session_state.hazards) + 1}",
                    "title": h_title,
                    "edge_id": h_edge,
                    "lat": mid_pt[0],
                    "lng": mid_pt[1],
                    "severity": h_sev,
                    "description": h_desc
                })
                st.success("Hazard posted! Route recalculating...")
                st.rerun()

    # -------------------------------------------------------------------------
    # 5. FOLIUM MAP GENERATION (CartoDB Positron Canvas)
    # -------------------------------------------------------------------------
    campus_center = [37.4305, -122.1695]
    m = folium.Map(
        location=campus_center,
        zoom_start=16,
        tiles="CartoDB positron",
        control_scale=True
    )

    # Draw Campus Pathway Network (Subtle background paths)
    for edge in CAMPUS_EDGES:
        color = "#f59e0b" if edge["has_stairs"] else ("#94a3b8" if edge["is_lit"] else "#64748b")
        dash = "4, 4" if edge["has_stairs"] else None
        folium.PolyLine(
            locations=edge["coords"],
            color=color,
            weight=3,
            opacity=0.45,
            dash_array=dash,
            tooltip=f"{edge['u']} ↔ {edge['v']} ({edge['distance']}m, {'Stairs' if edge['has_stairs'] else 'Step-Free'})"
        ).add_to(m)

    # Draw Active Route Polyline
    if route_data:
        # Casing for contrast
        folium.PolyLine(
            locations=route_data["polyline"],
            color="#ffffff",
            weight=8,
            opacity=0.9
        ).add_to(m)

        # Route Foreground line (Google Maps Blue)
        route_color = "#0d9488" if travel_mode == "Step-Free / Accessible" else ("#4f46e5" if travel_mode == "Lit Night Route" else "#1a73e8")
        folium.PolyLine(
            locations=route_data["polyline"],
            color=route_color,
            weight=5,
            opacity=0.95,
            tooltip=f"{travel_mode}: {route_data['total_dist']}m · {route_data['eta_mins']} mins"
        ).add_to(m)

    # Draw Landmark Markers
    for node_id, node in CAMPUS_NODES.items():
        is_start = node_id == start_sel
        is_end = node_id == dest_sel

        if is_start:
            # Blue Start Marker
            folium.Marker(
                location=[node["lat"], node["lng"]],
                popup=folium.Popup(f"<b>Origin: {node['name']}</b><br>{node['description']}", max_width=250),
                tooltip=f"Start: {node['short_name']}",
                icon=folium.Icon(color="blue", icon="play", prefix="fa")
            ).add_to(m)
        elif is_end:
            # Red Destination Marker
            folium.Marker(
                location=[node["lat"], node["lng"]],
                popup=folium.Popup(f"<b>Destination: {node['name']}</b><br>{node['description']}", max_width=250),
                tooltip=f"Destination: {node['short_name']}",
                icon=folium.Icon(color="red", icon="flag", prefix="fa")
            ).add_to(m)
        else:
            # Subtle Landmark Circle Marker
            folium.CircleMarker(
                location=[node["lat"], node["lng"]],
                radius=6,
                color="#475569",
                fill=True,
                fill_color="#ffffff",
                fill_opacity=0.9,
                weight=2,
                tooltip=node["short_name"],
                popup=folium.Popup(f"<b>{node['name']}</b><br>{node['category']}<br>{node['description']}", max_width=240)
            ).add_to(m)

    # Draw Active Hazards
    for hazard in st.session_state.hazards:
        h_color = "red" if hazard["severity"] == "closure" else "orange"
        h_icon = "ban" if hazard["severity"] == "closure" else "exclamation-triangle"
        folium.Marker(
            location=[hazard["lat"], hazard["lng"]],
            popup=folium.Popup(f"<b>{hazard['title']}</b><br>Severity: {hazard['severity'].upper()}<br>{hazard['description']}", max_width=250),
            tooltip=f"Hazard: {hazard['title']}",
            icon=folium.Icon(color=h_color, icon=h_icon, prefix="fa")
        ).add_to(m)

    # Render Map Full-Screen
    st_folium(m, width="100%", height=720)


if __name__ == "__main__":
    main()
