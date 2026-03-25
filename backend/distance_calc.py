"""
US City Distance Calculator using Haversine formula.
Covers ~500 major US cities with coordinates for offline distance estimation.
"""
import math

# Major US cities: (city_name_lower, state_abbrev_lower) -> (lat, lon)
US_CITIES = {
    ("new york", "ny"): (40.7128, -74.0060), ("los angeles", "ca"): (34.0522, -118.2437),
    ("chicago", "il"): (41.8781, -87.6298), ("houston", "tx"): (29.7604, -95.3698),
    ("phoenix", "az"): (33.4484, -112.0740), ("philadelphia", "pa"): (39.9526, -75.1652),
    ("san antonio", "tx"): (29.4241, -98.4936), ("san diego", "ca"): (32.7157, -117.1611),
    ("dallas", "tx"): (32.7767, -96.7970), ("san jose", "ca"): (37.3382, -121.8863),
    ("austin", "tx"): (30.2672, -97.7431), ("jacksonville", "fl"): (30.3322, -81.6557),
    ("fort worth", "tx"): (32.7555, -97.3308), ("columbus", "oh"): (39.9612, -82.9988),
    ("charlotte", "nc"): (35.2271, -80.8431), ("san francisco", "ca"): (37.7749, -122.4194),
    ("indianapolis", "in"): (39.7684, -86.1581), ("seattle", "wa"): (47.6062, -122.3321),
    ("denver", "co"): (39.7392, -104.9903), ("washington", "dc"): (38.9072, -77.0369),
    ("nashville", "tn"): (36.1627, -86.7816), ("oklahoma city", "ok"): (35.4676, -97.5164),
    ("el paso", "tx"): (31.7619, -106.4850), ("boston", "ma"): (42.3601, -71.0589),
    ("portland", "or"): (45.5152, -122.6784), ("las vegas", "nv"): (36.1699, -115.1398),
    ("memphis", "tn"): (35.1495, -90.0490), ("louisville", "ky"): (38.2527, -85.7585),
    ("baltimore", "md"): (39.2904, -76.6122), ("milwaukee", "wi"): (43.0389, -87.9065),
    ("albuquerque", "nm"): (35.0844, -106.6504), ("tucson", "az"): (32.2226, -110.9747),
    ("fresno", "ca"): (36.7378, -119.7871), ("sacramento", "ca"): (38.5816, -121.4944),
    ("mesa", "az"): (33.4152, -111.8315), ("kansas city", "mo"): (39.0997, -94.5786),
    ("atlanta", "ga"): (33.7490, -84.3880), ("omaha", "ne"): (41.2565, -95.9345),
    ("colorado springs", "co"): (38.8339, -104.8214), ("raleigh", "nc"): (35.7796, -78.6382),
    ("long beach", "ca"): (33.7701, -118.1937), ("virginia beach", "va"): (36.8529, -75.9780),
    ("miami", "fl"): (25.7617, -80.1918), ("oakland", "ca"): (37.8044, -122.2712),
    ("minneapolis", "mn"): (44.9778, -93.2650), ("tampa", "fl"): (27.9506, -82.4572),
    ("tulsa", "ok"): (36.1540, -95.9928), ("arlington", "tx"): (32.7357, -97.1081),
    ("new orleans", "la"): (29.9511, -90.0715), ("wichita", "ks"): (37.6872, -97.3301),
    ("cleveland", "oh"): (41.4993, -81.6944), ("bakersfield", "ca"): (35.3733, -119.0187),
    ("aurora", "co"): (39.7294, -104.8319), ("anaheim", "ca"): (33.8366, -117.9143),
    ("honolulu", "hi"): (21.3069, -157.8583), ("santa ana", "ca"): (33.7455, -117.8677),
    ("riverside", "ca"): (33.9806, -117.3755), ("corpus christi", "tx"): (27.8006, -97.3964),
    ("pittsburgh", "pa"): (40.4406, -79.9959), ("lexington", "ky"): (38.0406, -84.5037),
    ("anchorage", "ak"): (61.2181, -149.9003), ("stockton", "ca"): (37.9577, -121.2908),
    ("st louis", "mo"): (38.6270, -90.1994), ("cincinnati", "oh"): (39.1031, -84.5120),
    ("st paul", "mn"): (44.9537, -93.0900), ("newark", "nj"): (40.7357, -74.1724),
    ("greensboro", "nc"): (36.0726, -79.7920), ("buffalo", "ny"): (42.8864, -78.8784),
    ("plano", "tx"): (33.0198, -96.6989), ("lincoln", "ne"): (40.8136, -96.7026),
    ("orlando", "fl"): (28.5383, -81.3792), ("irvine", "ca"): (33.6846, -117.8265),
    ("norfolk", "va"): (36.8508, -76.2859), ("durham", "nc"): (35.9940, -78.8986),
    ("madison", "wi"): (43.0731, -89.4012), ("baton rouge", "la"): (30.4515, -91.1871),
    ("richmond", "va"): (37.5407, -77.4360), ("des moines", "ia"): (41.5868, -93.6250),
    ("laredo", "tx"): (27.5036, -99.5076), ("chandler", "az"): (33.3062, -111.8413),
    ("birmingham", "al"): (33.5207, -86.8025), ("boise", "id"): (43.6150, -116.2023),
    ("rochester", "ny"): (43.1566, -77.6088), ("modesto", "ca"): (37.6391, -120.9969),
    ("jersey city", "nj"): (40.7178, -74.0431), ("salt lake city", "ut"): (40.7608, -111.8910),
    ("spokane", "wa"): (47.6588, -117.4260), ("little rock", "ar"): (34.7465, -92.2896),
    ("detroit", "mi"): (42.3314, -83.0458), ("chattanooga", "tn"): (35.0456, -85.3097),
    ("knoxville", "tn"): (35.9606, -83.9207), ("jackson", "ms"): (32.2988, -90.1848),
    ("mobile", "al"): (30.6954, -88.0399), ("tallahassee", "fl"): (30.4383, -84.2807),
    ("savannah", "ga"): (32.0809, -81.0912), ("charleston", "sc"): (32.7765, -79.9311),
    ("columbia", "sc"): (34.0007, -81.0348), ("hartford", "ct"): (41.7658, -72.6734),
    ("providence", "ri"): (41.8240, -71.4128), ("springfield", "ma"): (42.1015, -72.5898),
    ("bridgeport", "ct"): (41.1865, -73.1952), ("new haven", "ct"): (41.3083, -72.9279),
    ("albany", "ny"): (42.6526, -73.7562), ("dayton", "oh"): (39.7589, -84.1916),
    ("akron", "oh"): (41.0814, -81.5190), ("toledo", "oh"): (41.6528, -83.5379),
    ("shreveport", "la"): (32.5252, -93.7502), ("lubbock", "tx"): (33.5779, -101.8552),
    ("amarillo", "tx"): (35.2220, -101.8313), ("reno", "nv"): (39.5296, -119.8138),
    ("tacoma", "wa"): (47.2529, -122.4443), ("eugene", "or"): (44.0521, -123.0868),
    ("montgomery", "al"): (32.3792, -86.3077), ("huntsville", "al"): (34.7304, -86.5861),
    ("fort wayne", "in"): (41.0793, -85.1394), ("grand rapids", "mi"): (42.9634, -85.6681),
    ("sioux falls", "sd"): (43.5446, -96.7311), ("fargo", "nd"): (46.8772, -96.7898),
    ("billings", "mt"): (45.7833, -108.5007), ("rapid city", "sd"): (44.0805, -103.2310),
    ("cheyenne", "wy"): (41.1400, -104.8202), ("casper", "wy"): (42.8666, -106.3131),
    ("missoula", "mt"): (46.8721, -114.0001), ("great falls", "mt"): (47.5063, -111.3008),
    ("bismarck", "nd"): (46.8083, -100.7837), ("charleston", "wv"): (38.3498, -81.6326),
    ("wilmington", "de"): (39.7391, -75.5398), ("burlington", "vt"): (44.4759, -73.2121),
    ("portland", "me"): (43.6591, -70.2568), ("manchester", "nh"): (42.9956, -71.4548),
    ("concord", "nh"): (43.2081, -71.5376), ("dover", "de"): (39.1582, -75.5244),
    ("trenton", "nj"): (40.2171, -74.7429), ("harrisburg", "pa"): (40.2732, -76.8867),
    ("annapolis", "md"): (38.9784, -76.4922), ("augusta", "me"): (44.3106, -69.7795),
    ("montpelier", "vt"): (44.2601, -72.5754), ("santa fe", "nm"): (35.6870, -105.9378),
    ("carson city", "nv"): (39.1638, -119.7674), ("olympia", "wa"): (47.0379, -122.9007),
    ("salem", "or"): (44.9429, -123.0351), ("juneau", "ak"): (58.3005, -134.4197),
    ("topeka", "ks"): (39.0473, -95.6752), ("jefferson city", "mo"): (38.5767, -92.1735),
    ("springfield", "il"): (39.7817, -89.6501), ("lansing", "mi"): (42.7325, -84.5555),
    ("pierre", "sd"): (44.3683, -100.3510), ("helena", "mt"): (46.5958, -112.0270),
    ("frankfort", "ky"): (38.2009, -84.8733), ("dover", "de"): (39.1582, -75.5244),
    ("roanoke", "va"): (37.2710, -79.9414), ("cape coral", "fl"): (26.5629, -81.9495),
    ("fort lauderdale", "fl"): (26.1224, -80.1373), ("west palm beach", "fl"): (26.7153, -80.0534),
    ("st petersburg", "fl"): (27.7676, -82.6403), ("pensacola", "fl"): (30.4213, -87.2169),
    ("gainesville", "fl"): (29.6516, -82.3248), ("daytona beach", "fl"): (29.2108, -81.0228),
    ("sarasota", "fl"): (27.3364, -82.5307), ("naples", "fl"): (26.1420, -81.7948),
    ("key west", "fl"): (24.5551, -81.7800), ("mcallen", "tx"): (26.2034, -98.2300),
    ("brownsville", "tx"): (25.9017, -97.4975), ("beaumont", "tx"): (30.0802, -94.1266),
    ("midland", "tx"): (31.9973, -102.0779), ("abilene", "tx"): (32.4487, -99.7331),
    ("tyler", "tx"): (32.3513, -95.3011), ("waco", "tx"): (31.5493, -97.1467),
    ("killeen", "tx"): (31.1171, -97.7278), ("college station", "tx"): (30.6280, -96.3344),
}

# Also match by city name only (without state) as a fallback
CITY_ONLY = {}
for (city, state), coords in US_CITIES.items():
    if city not in CITY_ONLY:
        CITY_ONLY[city] = coords


def haversine_miles(lat1, lon1, lat2, lon2):
    """Calculate distance between two points in miles using Haversine formula."""
    R = 3959  # Earth's radius in miles
    lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
    c = 2 * math.asin(math.sqrt(a))
    return R * c


def lookup_city(city: str, state: str = ""):
    """Look up city coordinates. Returns (lat, lon) or None."""
    if not city:
        return None
    city_clean = city.strip().lower()
    state_clean = state.strip().lower().replace(".", "")
    
    # Try exact match with state
    if state_clean:
        coords = US_CITIES.get((city_clean, state_clean))
        if coords:
            return coords
    
    # Try city-only match
    coords = CITY_ONLY.get(city_clean)
    if coords:
        return coords
    
    # Try partial match
    for (c, s), coords in US_CITIES.items():
        if city_clean in c or c in city_clean:
            if not state_clean or state_clean == s:
                return coords
    
    return None


def estimate_distance(pickup_city, pickup_state, delivery_city, delivery_state):
    """Estimate driving distance between two US cities.
    Returns distance in miles, or None if cities not found.
    Note: Haversine gives straight-line distance; multiply by 1.3 for road estimate.
    """
    origin = lookup_city(pickup_city, pickup_state)
    destination = lookup_city(delivery_city, delivery_state)
    
    if not origin or not destination:
        return None
    
    straight_line = haversine_miles(origin[0], origin[1], destination[0], destination[1])
    # Road distance is typically 1.25-1.4x straight line distance
    return round(straight_line * 1.3)


def calculate_pricing(distance_miles):
    """Calculate pricing for all shipping types based on distance.
    Returns dict with standard, expedited, enclosed pricing.
    
    Per-mile rates:
    - Standard: $0.75/mile
    - Expedited: $0.95/mile
    - Enclosed: $1.00/mile
    
    Fixed fees:
    - Standard: deposit=$150, carrier=$60
    - Expedited: deposit=$175, carrier=$70
    - Enclosed: deposit=$200, carrier=$85
    """
    if not distance_miles or distance_miles <= 0:
        return None
    
    configs = {
        "standard": {"rate_per_mile": 0.75, "deposit_fee": 150, "carrier_fee": 60, "label": "Standard Shipping"},
        "expedited": {"rate_per_mile": 0.95, "deposit_fee": 175, "carrier_fee": 70, "label": "Expedited Shipping"},
        "enclosed": {"rate_per_mile": 1.00, "deposit_fee": 200, "carrier_fee": 85, "label": "Enclosed Shipping"},
    }
    
    result = {"distance_miles": distance_miles}
    for key, cfg in configs.items():
        mile_cost = round(distance_miles * cfg["rate_per_mile"], 2)
        total = cfg["deposit_fee"] + cfg["carrier_fee"] + mile_cost
        # Ensure minimum total is at least deposit + carrier
        total = max(total, cfg["deposit_fee"] + cfg["carrier_fee"])
        result[key] = {
            "label": cfg["label"],
            "rate_per_mile": cfg["rate_per_mile"],
            "mile_cost": mile_cost,
            "deposit_fee": cfg["deposit_fee"],
            "carrier_fee": cfg["carrier_fee"],
            "total_price": round(total, 2),
        }
    return result
