import React, { useMemo } from 'react';
import { Map, CloudSun, Route, Milestone } from 'lucide-react';

// State facts related to roads, transportation, weather, and transport
const STATE_FACTS = {
  AL: { weather: 'Hot, humid summers with mild winters. Hurricane season June-Nov.', transport: 'I-65 is the main north-south artery. Port of Mobile is the 12th largest US port by tonnage.', road: 'Alabama has over 100,000 miles of public roads. The Talladega Superspeedway is the longest NASCAR oval.' },
  AK: { weather: 'Extreme cold in winter, midnight sun in summer. Snow possible year-round in mountains.', transport: 'Alaska Highway is the only road connection to the lower 48. Many areas accessible only by air or sea.', road: 'Alaska has the fewest miles of paved road per capita. The Dalton Highway runs 414 miles to the Arctic.' },
  AZ: { weather: 'Desert heat reaches 120°F in summer. Phoenix averages 299 sunny days per year.', transport: 'I-10 and I-40 are major east-west corridors. Extreme heat can cause tire blowouts on trailers.', road: 'Route 66 passes through northern Arizona. The state has some of the longest straightaways in the US.' },
  AR: { weather: 'Tornado Alley territory with severe spring storms. Hot, humid summers.', transport: 'The Arkansas River is a major commercial waterway. I-40 crosses the entire state east-west.', road: 'Arkansas was the first state to build a road specifically for automobiles — Dollarway Road in 1913.' },
  CA: { weather: 'Mediterranean climate in the south, rain in the north. Wildfire season extends from May to November.', transport: 'The Port of Los Angeles is the busiest container port in the Western Hemisphere. I-5 runs the entire coast.', road: 'California has more registered vehicles (30M+) than any other state. Pacific Coast Highway is iconic.' },
  CO: { weather: 'Mountain passes can close in winter. Denver gets 300 days of sunshine but sudden blizzards.', transport: 'Eisenhower Tunnel on I-70 is the highest vehicular tunnel in the world at 11,158 ft.', road: 'Colorado has 23 mountain passes above 10,000 ft. The Million Dollar Highway (US-550) is legendary.' },
  CT: { weather: 'Four distinct seasons with cold, snowy winters and humid summers.', transport: 'Located along the busy I-95 Northeast corridor. The Merritt Parkway is a National Scenic Byway.', road: 'Connecticut has one of the highest road densities per square mile in the US.' },
  DE: { weather: 'Moderate climate with occasional nor\'easters in winter.', transport: 'The Delaware Memorial Bridge carries I-295 over the Delaware River — one of the longest twin suspension bridges.', road: 'Delaware was the first state, and has one of the shortest highway systems — just 6,000 miles total.' },
  FL: { weather: 'Hurricane season is June 1 to November 30. Summer thunderstorms are almost daily.', transport: 'Florida has 4 of the top 20 busiest airports in the US. The Sunshine Skyway Bridge spans Tampa Bay.', road: 'Florida\'s Turnpike runs 312 miles. Alligator Alley (I-75) crosses the Everglades.' },
  GA: { weather: 'Humid subtropical. Atlanta occasionally gets ice storms that paralyze the city.', transport: 'Atlanta\'s Hartsfield-Jackson is the world\'s busiest airport. The Port of Savannah is the 3rd largest in the US.', road: 'I-285, Atlanta\'s perimeter, is one of the most congested interstates. The city is a major rail hub.' },
  HI: { weather: 'Tropical year-round with trade winds. Each island has distinct microclimates.', transport: 'No interstate highways connecting islands — vehicles must be shipped by barge. Inter-island shipping takes 2-5 days.', road: 'Hawaii has Interstate highways (H-1, H-2, H-3) despite being islands — they meet federal standards.' },
  ID: { weather: 'Cold winters with heavy mountain snow. Summer dry with wildfire risk.', transport: 'I-84 follows the historic Oregon Trail. Mountain passes can be treacherous in winter.', road: 'Idaho has some of the most remote stretches of highway in the lower 48 states.' },
  IL: { weather: 'Extreme temperature swings — -20°F winters to 100°F summers. Lake-effect snow near Chicago.', transport: 'Chicago is the rail capital of North America — 25% of all US freight passes through. O\'Hare is a major air hub.', road: 'I-90/I-94 through Chicago is one of the busiest highway corridors in the nation. Route 66 starts in Chicago.' },
  IN: { weather: 'Four seasons with cold winters and tornado risk in spring/summer.', transport: 'The Indianapolis Motor Speedway is the racing capital of the world. Indiana is the "Crossroads of America."', road: 'More interstates pass through Indiana than any other state — I-64, I-65, I-69, I-70, I-74, I-80, I-90, I-94.' },
  IA: { weather: 'Severe winters with blizzards. Tornado Alley extends into Iowa.', transport: 'Iowa is a major agricultural transport corridor. Grain elevators line every rail line.', road: 'Iowa has over 114,000 miles of roads — one of the highest road-per-capita ratios in the US.' },
  KS: { weather: 'Tornado Alley heartland. Extreme temperature range from -20°F to 115°F.', transport: 'Kansas City is a major intermodal freight hub. I-70 crosses the entire state east-west.', road: 'Kansas has some of the straightest, flattest highways in America — you can see for miles in every direction.' },
  KY: { weather: 'Moderate climate but ice storms can shut down highways. Ohio River flooding is common.', transport: 'Louisville is home to UPS\'s Worldport — the largest automated package handling facility.', road: 'The Bluegrass Parkway and Mountain Parkway showcase Kentucky\'s diverse terrain.' },
  LA: { weather: 'Subtropical with hurricane risk. New Orleans averages 62 inches of rain per year.', transport: 'The Port of South Louisiana is the largest tonnage port in the Western Hemisphere.', road: 'The Lake Pontchartrain Causeway is the longest bridge over water — 23.83 miles.' },
  ME: { weather: 'Cold, snowy winters. Nor\'easters can dump 2+ feet of snow overnight.', transport: 'Maine is the end of I-95. The state has limited interstate access — many areas require US routes.', road: 'Maine has the longest stretch of I-95 of any state — 303 miles from Kittery to Houlton.' },
  MD: { weather: 'Variable — coastal storms, snow in western mountains, humid summers in Baltimore.', transport: 'The Port of Baltimore is a top US port for vehicle imports. The Bay Bridge spans 4.3 miles.', road: 'The Baltimore-Washington corridor on I-95 is one of the most heavily traveled in the US.' },
  MA: { weather: 'Nor\'easters bring heavy snow. Boston winters are notoriously harsh for driving.', transport: 'The Big Dig (I-93) was the most expensive highway project in US history at $14.6 billion.', road: 'Massachusetts has the most rotaries (roundabouts) per mile of any US state. Boston driving is legendary.' },
  MI: { weather: 'Lake-effect snow belts can dump feet of snow. Winter road salt is a major expense.', transport: 'Detroit is the auto capital of the world. The Ambassador Bridge to Canada is the busiest border crossing.', road: 'Michigan was the first state to build a concrete highway (Woodward Ave, 1909) and the first with a centerline.' },
  MN: { weather: 'Some of the coldest winters in the US. International Falls is the "Icebox of the Nation."', transport: 'Minneapolis-St. Paul is a major trucking hub. The Mississippi River begins here.', road: 'Minnesota maintains over 12,000 miles of trunk highways despite extreme freeze-thaw cycles.' },
  MS: { weather: 'Hot, humid summers. The Gulf Coast is vulnerable to hurricanes.', transport: 'The Mississippi River is the nation\'s most important inland waterway for commerce.', road: 'The Natchez Trace Parkway runs 444 miles — one of the most scenic drives in the South.' },
  MO: { weather: 'Tornado risk in spring. Ice storms in winter can close highways for days.', transport: 'St. Louis is a major Mississippi River port and rail hub. Kansas City is a key intermodal center.', road: 'Missouri has the 7th largest highway system in the US. The Gateway Arch marks the gateway to the West.' },
  MT: { weather: 'Extreme cold — record -70°F at Rogers Pass. Chinook winds can raise temps 50°F in hours.', transport: 'Montana has the longest stretch of I-90 at 558 miles. Speed limits were unlimited until 1999.', road: 'Going-to-the-Sun Road in Glacier NP is one of the most spectacular mountain highways ever built.' },
  NE: { weather: 'Tornado Alley territory. Blizzards in winter, severe thunderstorms in summer.', transport: 'I-80 follows the historic Transcontinental Railroad route across Nebraska.', road: 'Nebraska has more miles of river than any other state — bridges are critical infrastructure.' },
  NV: { weather: 'Desert extremes — Death Valley adjacent. Las Vegas summers exceed 115°F.', transport: 'The "Extraterrestrial Highway" (SR-375) runs along Area 51. I-80 crosses northern Nevada.', road: 'The Loneliest Road in America (US-50) crosses 287 miles of Nevada with almost no services.' },
  NH: { weather: 'Mount Washington has the worst weather in the US — 231 mph wind recorded there.', transport: 'NH has no sales tax, making it a popular stop for cross-border shopping truckers.', road: 'The Kancamagus Highway is one of the best fall foliage drives in New England.' },
  NJ: { weather: 'Four seasons. Nor\'easters and occasional hurricanes affect the coast.', transport: 'The NJ Turnpike is one of the busiest toll roads in the world. The George Washington Bridge is the busiest.', road: 'New Jersey has more diners per capita than any other state — great for long-haul truckers.' },
  NM: { weather: 'High desert with extreme sun. Monsoon season July-September brings flash floods.', transport: 'I-25 and I-40 intersect in Albuquerque, making it a key Southwest transport hub.', road: 'Route 66 passes through NM, and the state has some of the most dramatic desert highway scenery.' },
  NY: { weather: 'Lake-effect snow in upstate. NYC has unpredictable weather patterns.', transport: 'NYC has the most extensive public transit in the US. The NY Thruway (I-90) is the longest toll highway.', road: 'The Brooklyn-Queens Expressway is one of the most congested roads in America.' },
  NC: { weather: 'Varies from mountain snow to coastal hurricanes. Ice storms affect the Piedmont.', transport: 'Charlotte is a major I-85/I-77 junction. The Outer Banks require ferry access in some areas.', road: 'The Blue Ridge Parkway runs 469 miles through NC — America\'s most visited National Park unit.' },
  ND: { weather: 'Brutal winters with wind chills below -40°F. Ground blizzards reduce visibility to zero.', transport: 'Oil boom made ND one of the busiest freight corridors. Rail traffic increased 200%+ since 2010.', road: 'North Dakota has more miles of road per person than any other state.' },
  OH: { weather: 'Lake-effect snow in the north. Tornado risk in spring and summer.', transport: 'Ohio\'s turnpike (I-80/90) is a vital east-west corridor. Columbus is within 600 miles of 60% of the US population.', road: 'Ohio has the 4th largest highway system. The state is a crossroads for I-70, I-71, I-75, I-77, and I-80.' },
  OK: { weather: 'Tornado Alley central. Oklahoma City has been hit by more tornadoes than any major city.', transport: 'I-35, I-40, and I-44 all intersect in Oklahoma City, making it a trucking hub.', road: 'Oklahoma has more miles of Route 66 than any other state — 400 miles of "The Mother Road."' },
  OR: { weather: 'Pacific Northwest rain on the west side, high desert on the east. Cascades get heavy snow.', transport: 'Portland is a major Pacific Northwest port. I-5 connects to Washington and California.', road: 'Oregon was the first state to institute a gas tax (1919) to fund road construction.' },
  PA: { weather: 'Lake-effect snow in the NW. The PA Turnpike can be treacherous in winter.', transport: 'Pennsylvania has the most structurally deficient bridges in the US. The PA Turnpike opened in 1940 as the first US superhighway.', road: 'The Lincoln Highway (US-30) — America\'s first coast-to-coast highway — crosses PA.' },
  RI: { weather: 'Coastal storms and nor\'easters. Small state but weather varies coast to inland.', transport: 'Despite being the smallest state, RI has the Claiborne Pell Newport Bridge spanning Narragansett Bay.', road: 'Rhode Island has the highest road density in the nation — lots of pavement in a tiny area.' },
  SC: { weather: 'Hot, humid summers. Hurricanes threaten the coast, especially Charleston.', transport: 'The Port of Charleston is one of the fastest-growing container ports in the US.', road: 'I-95 runs through SC\'s coastal plain — one of the most traveled north-south routes for snowbird transport.' },
  SD: { weather: 'Extreme temperature range — blizzards in winter, thunderstorms in summer.', transport: 'I-90 runs 413 miles across SD. Mount Rushmore drives significant tourism transport.', road: 'The Badlands Loop Road is one of the most unique geological driving experiences in America.' },
  TN: { weather: 'Moderate but tornado-prone. Nashville and Memphis get severe weather regularly.', transport: 'Memphis is the busiest air cargo hub in the world (FedEx HQ). Nashville is a growing logistics center.', road: 'I-40 crosses the entire state. Tennessee has some of the most scenic Appalachian drives.' },
  TX: { weather: 'Massive state with every climate — Gulf hurricanes, Panhandle blizzards, West Texas desert heat.', transport: 'Texas has the most highway miles of any state — over 80,000 miles. The Port of Houston is the busiest in the US.', road: 'The speed limit on TX-130 is 85 mph — the highest posted speed limit in the US.' },
  UT: { weather: 'Desert heat in the south, heavy mountain snow in the north. "Greatest Snow on Earth."', transport: 'The Golden Spike at Promontory Summit completed the Transcontinental Railroad in 1869.', road: 'Utah\'s scenic highways through Zion, Arches, and Bryce Canyon are world-famous.' },
  VT: { weather: 'Cold, snowy winters. Spring "mud season" can make dirt roads impassable.', transport: 'Vermont has no interstate billboards — banned since 1968. I-89 and I-91 are the main corridors.', road: 'Vermont has the fewest lane-miles of interstate highway in the contiguous US.' },
  VA: { weather: 'Moderate but ice storms in the Blue Ridge can close roads. Hurricane remnants hit the coast.', transport: 'Hampton Roads has the busiest military port in the world. The Chesapeake Bay Bridge-Tunnel is 17.6 miles.', road: 'Virginia built America\'s first toll road in 1785. I-81 through the Shenandoah Valley is heavily trucked.' },
  WA: { weather: 'Rain-soaked west side, dry east side. Mountain passes get heavy snow.', transport: 'The Port of Seattle/Tacoma is a major Pacific trade gateway. I-5 is the west coast\'s main artery.', road: 'Washington\'s floating bridges on Lake Washington are the longest in the world.' },
  WV: { weather: 'Mountain weather is unpredictable. Heavy snow in winter, fog year-round.', transport: 'WV\'s terrain makes it one of the most challenging states for auto transport — winding mountain roads.', road: 'The New River Gorge Bridge was the longest steel span in the Western Hemisphere for 26 years.' },
  WI: { weather: 'Harsh winters with heavy lake-effect snow. Road salt usage is among the highest in the US.', transport: 'Wisconsin\'s dairy industry drives massive refrigerated trucking volume.', road: 'Wisconsin has over 14,000 bridges — more than most states. The state invented the highway "rumble strip."' },
  WY: { weather: 'Wind is the defining weather feature — gusts over 100 mph close I-80 regularly.', transport: 'I-80 across southern Wyoming is one of the most wind-affected interstates. Closure gates are common.', road: 'Wyoming has the lowest population density — some highways have fewer than 100 cars per day.' },
};

const CITY_FACTS = {
  'los angeles': 'LA has the worst traffic congestion in the US — drivers spend 100+ hours per year in traffic jams.',
  'new york': 'NYC\'s road network covers over 6,300 miles. The city has 789 bridges and 14 tunnels.',
  'chicago': 'Chicago\'s "Spaghetti Bowl" interchange of I-90/94/290/55 handles 300,000+ vehicles daily.',
  'houston': 'Houston\'s Katy Freeway (I-10) is the widest highway in the world at 26 lanes.',
  'phoenix': 'Phoenix is the hottest major US city — asphalt temps can reach 180°F, affecting tire transport.',
  'miami': 'Miami\'s I-95 is one of the most congested corridors in the nation. The Overseas Highway runs 113 miles to Key West.',
  'dallas': 'The DFW area has one of the most extensive highway systems in the US with 5 major interstates.',
  'san francisco': 'The Golden Gate Bridge charges tolls only southbound. Bay Area traffic is among the worst in the US.',
  'atlanta': 'Atlanta\'s I-285 loop (known as "The Perimeter") is one of the most congested beltways in America.',
  'detroit': 'Detroit is where the modern auto industry was born. The city has more car-related landmarks than anywhere.',
  'seattle': 'Seattle\'s SR-99 tunnel (2 miles) replaced the Alaskan Way Viaduct. The city gets 152 rainy days per year.',
  'denver': 'Denver is exactly 1 mile above sea level. Mountain driving west on I-70 requires extra caution for transports.',
  'las vegas': 'The Las Vegas Strip is technically not in Las Vegas — it\'s in Paradise, NV. Desert heat is brutal for vehicles.',
  'nashville': 'Nashville is becoming a major logistics hub — "Hot Chicken Capital" sits at the crossroads of I-24, I-40, I-65.',
  'san antonio': 'The I-35/I-10 corridor through San Antonio handles massive NAFTA trade traffic from Mexico.',
  'orlando': 'Orlando\'s tourism drives one of the busiest rental car markets in the world.',
  'tampa': 'The Sunshine Skyway Bridge is one of the most stunning bridges in the US — 4.1 miles across Tampa Bay.',
  'portland': 'Portland has more bridges per capita than any US city. The "City of Bridges" spans the Willamette River.',
  'memphis': 'Memphis is the air cargo capital of the world thanks to FedEx. The I-40 bridge is a critical Mississippi crossing.',
  'salt lake city': 'SLC sits at 4,226 ft elevation. The nearby mountain passes can be treacherous in winter for car haulers.',
  'jacksonville': 'Jacksonville is the largest city by area in the contiguous US. The Dames Point Bridge is a cable-stayed landmark.',
  'charlotte': 'Charlotte is a major I-85 corridor city — one of the busiest auto transport routes on the East Coast.',
  'san diego': 'San Diego has the mildest climate of any major US city. The I-5 border crossing to Tijuana is the busiest in the world.',
  'austin': 'Austin\'s population growth makes it one of the most active auto transport destinations in Texas.',
  'columbus': 'Columbus is within a day\'s drive of 60% of the US population — a major transport advantage.',
  'indianapolis': 'The Indianapolis Motor Speedway can seat 250,000+ people. I-465 loops the entire city.',
  'fort worth': 'Fort Worth is the gateway to West Texas ranching country. The Chisholm Trail once ran through here.',
  'el paso': 'El Paso sits at the US-Mexico border. I-10 connects it to both coasts — 2,460 miles to Jacksonville.',
  'boston': 'Boston\'s Big Dig was the most complex highway project ever. The city has America\'s oldest subway.',
  'tucson': 'Tucson averages 286 sunny days per year. The "Tucson-Phoenix Sun Corridor" is one of the fastest-growing.',
  'milwaukee': 'Milwaukee\'s Hoan Bridge offers stunning Lake Michigan views along I-794.',
  'oklahoma city': 'OKC is one of the largest cities by land area. Three major interstates (I-35, I-40, I-44) converge here.',
  'raleigh': 'The Research Triangle (Raleigh-Durham-Chapel Hill) is one of the fastest-growing metro areas for relocations.',
  'kansas city': 'KC BBQ is famous, but so is its rail — it\'s the 2nd largest rail hub in the US after Chicago.',
  'omaha': 'Omaha is the headquarters of Union Pacific Railroad and Berkshire Hathaway. I-80 runs right through.',
  'minneapolis': 'The I-35W bridge collapse in 2007 reshaped US bridge inspection standards nationwide.',
  'new orleans': 'NOLA sits below sea level. The Lake Pontchartrain Causeway (23.8 mi) is the longest bridge over water.',
  'bakersfield': 'Bakersfield is a major trucking hub — the Grapevine climb on I-5 is one of the steepest interstate grades.',
  'boise': 'Boise is one of the fastest-growing cities in the US. I-84 connects it to Portland and Salt Lake City.',
};

const TransportFacts = ({ pickupState, deliveryState, pickupCity, deliveryCity }) => {
  const facts = useMemo(() => {
    const result = [];
    const pState = pickupState?.toUpperCase()?.trim()?.replace('.', '');
    const dState = deliveryState?.toUpperCase()?.trim()?.replace('.', '');
    const pCity = pickupCity?.toLowerCase()?.trim();
    const dCity = deliveryCity?.toLowerCase()?.trim();

    // Add pickup state facts
    if (pState && STATE_FACTS[pState]) {
      result.push({ location: `${pickupCity || ''}${pickupCity && pickupState ? ', ' : ''}${pickupState}`, type: 'pickup', ...STATE_FACTS[pState] });
    }
    // Add delivery state facts
    if (dState && STATE_FACTS[dState] && dState !== pState) {
      result.push({ location: `${deliveryCity || ''}${deliveryCity && deliveryState ? ', ' : ''}${deliveryState}`, type: 'delivery', ...STATE_FACTS[dState] });
    }

    // City-specific facts
    const cityFacts = [];
    if (pCity && CITY_FACTS[pCity]) {
      cityFacts.push({ city: pickupCity, fact: CITY_FACTS[pCity], type: 'pickup' });
    }
    if (dCity && CITY_FACTS[dCity] && dCity !== pCity) {
      cityFacts.push({ city: deliveryCity, fact: CITY_FACTS[dCity], type: 'delivery' });
    }

    return { states: result, cities: cityFacts };
  }, [pickupState, deliveryState, pickupCity, deliveryCity]);

  if (facts.states.length === 0 && facts.cities.length === 0) return null;

  return (
    <div data-testid="transport-facts">
      {/* City-specific facts */}
      {facts.cities.length > 0 && (
        <div className="space-y-2 mb-4">
          {facts.cities.map((cf, i) => (
            <div key={i} className={`rounded-lg px-4 py-3 text-sm ${cf.type === 'pickup' ? 'bg-blue-50 border border-blue-100' : 'bg-emerald-50 border border-emerald-100'}`}>
              <div className="flex items-start gap-2">
                <Milestone className={`w-4 h-4 mt-0.5 flex-shrink-0 ${cf.type === 'pickup' ? 'text-blue-600' : 'text-emerald-600'}`} />
                <div>
                  <span className={`font-semibold ${cf.type === 'pickup' ? 'text-blue-700' : 'text-emerald-700'}`}>{cf.city}</span>
                  <p className="text-slate-600 mt-0.5">{cf.fact}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* State facts grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {facts.states.map((sf, i) => (
          <div key={i} className="rounded-lg border border-slate-200 overflow-hidden" data-testid={`state-fact-${sf.type}`}>
            <div className={`px-4 py-2 text-xs font-semibold ${sf.type === 'pickup' ? 'bg-blue-600 text-white' : 'bg-emerald-600 text-white'}`}>
              {sf.type === 'pickup' ? 'Pickup' : 'Delivery'} — {sf.location}
            </div>
            <div className="p-4 space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <CloudSun className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                <div><span className="font-medium text-slate-800">Weather:</span> <span className="text-slate-600">{sf.weather}</span></div>
              </div>
              <div className="flex items-start gap-2">
                <Route className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <div><span className="font-medium text-slate-800">Transport:</span> <span className="text-slate-600">{sf.transport}</span></div>
              </div>
              <div className="flex items-start gap-2">
                <Map className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                <div><span className="font-medium text-slate-800">Roads:</span> <span className="text-slate-600">{sf.road}</span></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TransportFacts;
