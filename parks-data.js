// parks-data.js — renderer-agnostic park data model for SF Parks Explorer.
//
// Everything here is pure geography + content. No rendering concepts.
//
// Shape of a park:
//   id          string slug
//   name        display name
//   description short blurb
//   size        human-readable size
//   latLng      [lat, lng] city position (approx centroid)
//   bbox        { lng0, lat0, lng1, lat1 } geographic bounding box of the park
//   boundary    polygon of [u, v] points relative to bbox (u: 0=west..1=east, v: 0=south..1=north)
//   features    optional filled areas: { id, type: 'lake'|'marsh'|'sand'|'meadow', points: [[u,v]..] }
//   paths       internal trails/roads: { id, name, points: [[u,v]..] }
//   pois        points of interest: { id, name, type, uv: [u,v], description }
//               type ∈ entrance | landmark | museum | viewpoint | nature | amenity | beach | playground

export const CITY = {
  name: 'San Francisco',
  // rough peninsula outline, [lng, lat], clockwise from Fort Point
  outline: [
    [-122.477, 37.8105], [-122.465, 37.806], [-122.45, 37.8065], [-122.43, 37.806],
    [-122.422, 37.8075], [-122.413, 37.8095], [-122.405, 37.8115], [-122.395, 37.807],
    [-122.388, 37.797], [-122.386, 37.788], [-122.388, 37.779], [-122.386, 37.77],
    [-122.382, 37.758], [-122.373, 37.748], [-122.36, 37.737], [-122.358, 37.728],
    [-122.37, 37.718], [-122.38, 37.711], [-122.39, 37.708], [-122.41, 37.708],
    [-122.45, 37.708], [-122.49, 37.708], [-122.502, 37.712], [-122.506, 37.72],
    [-122.507, 37.735], [-122.509, 37.755], [-122.51, 37.77], [-122.512, 37.781],
    [-122.506, 37.7875], [-122.492, 37.7885], [-122.486, 37.7905], [-122.483, 37.797],
    [-122.479, 37.8045],
  ],
  // Marin headlands blob, for context north of the Golden Gate
  marin: [
    [-122.49, 37.8235], [-122.468, 37.821], [-122.452, 37.824], [-122.44, 37.832],
    [-122.45, 37.845], [-122.48, 37.847], [-122.502, 37.84], [-122.507, 37.829],
  ],
  goldenGateBridge: { from: [-122.4775, 37.8095], to: [-122.4757, 37.8235] },
};

export const PARKS = [
  {
    id: 'golden-gate-park',
    name: 'Golden Gate Park',
    description:
      'A 3-mile ribbon of meadows, lakes, gardens and museums stretching from the Haight to the Pacific. Bigger than Central Park, with bison to prove it.',
    size: '1,017 acres',
    area: 'Richmond / Sunset',
    mustSee: true,
    tags: ['museums', 'gardens', 'picnic', 'family', 'nature'],
    latLng: [37.7694, -122.4862],
    bbox: { lng0: -122.511, lat0: 37.7647, lng1: -122.445, lat1: 37.7749 },
    boundary: [
      [0, 0], [0.86, 0], [0.86, 0.44], [1, 0.44], [1, 0.62], [0.86, 0.62], [0.86, 1], [0, 1],
    ],
    features: [
      { id: 'stow-lake', type: 'lake', points: [[0.46, 0.38], [0.52, 0.34], [0.57, 0.4], [0.56, 0.52], [0.5, 0.56], [0.45, 0.5]] },
      { id: 'spreckels-lake', type: 'lake', points: [[0.24, 0.74], [0.3, 0.72], [0.31, 0.8], [0.25, 0.82]] },
      { id: 'big-rec', type: 'meadow', points: [[0.68, 0.12], [0.78, 0.12], [0.78, 0.26], [0.68, 0.26]] },
    ],
    paths: [
      { id: 'jfk-drive', name: 'JFK Promenade', points: [[0.01, 0.55], [0.12, 0.7], [0.28, 0.66], [0.42, 0.72], [0.56, 0.62], [0.7, 0.68], [0.84, 0.58]] },
      { id: 'mlk-drive', name: 'MLK Jr. Drive', points: [[0.01, 0.4], [0.16, 0.28], [0.34, 0.32], [0.5, 0.24], [0.66, 0.3], [0.84, 0.36]] },
      { id: 'cross-over', name: 'Transverse Path', points: [[0.6, 0.66], [0.62, 0.48], [0.63, 0.3]] },
    ],
    pois: [
      { id: 'mclaren-lodge', name: 'McLaren Lodge (Main Entrance)', type: 'entrance', uv: [0.97, 0.52], description: 'Historic 1896 lodge at the Stanyan Street gateway — park headquarters and the east entrance.' },
      { id: 'conservatory', name: 'Conservatory of Flowers', type: 'landmark', uv: [0.77, 0.66], description: 'Gleaming white Victorian greenhouse from 1879 — the oldest building in the park, full of rare tropicals.' },
      { id: 'de-young', name: 'de Young Museum', type: 'museum', uv: [0.63, 0.56], description: 'Copper-clad fine-arts museum with a twisting observation tower over the Music Concourse.' },
      { id: 'cal-academy', name: 'California Academy of Sciences', type: 'museum', uv: [0.64, 0.42], description: 'Aquarium, planetarium and rainforest dome under a living roof of native wildflowers.' },
      { id: 'tea-garden', name: 'Japanese Tea Garden', type: 'landmark', uv: [0.57, 0.55], description: 'The oldest public Japanese garden in the US — drum bridge, pagoda, and tea house since 1894.' },
      { id: 'stow-lake-boathouse', name: 'Stow Lake & Strawberry Hill', type: 'nature', uv: [0.51, 0.46], description: 'Paddle-boat lake circling a 430-ft island hill with a waterfall and city views.' },
      { id: 'bison-paddock', name: 'Bison Paddock', type: 'nature', uv: [0.26, 0.6], description: 'A small herd of American bison has grazed here since 1891. Yes, real bison.' },
      { id: 'dutch-windmill', name: 'Dutch Windmill', type: 'landmark', uv: [0.025, 0.85], description: '1903 windmill that once pumped irrigation water, ringed by the Queen Wilhelmina tulip garden.' },
      { id: 'panhandle', name: 'The Panhandle', type: 'nature', uv: [0.94, 0.53], description: 'The narrow eastern arm of the park — eucalyptus shade and a beloved bike path.' },
    ],
  },
  {
    id: 'dolores-park',
    name: 'Mission Dolores Park',
    description:
      'The Mission’s sun-soaked living room — sloped lawns, skyline views, tennis courts and a world-class people-watching scene.',
    size: '16 acres',
    area: 'Mission',
    mustSee: true,
    tags: ['views', 'picnic', 'family'],
    latLng: [37.7596, -122.427],
    bbox: { lng0: -122.4287, lat0: 37.7583, lng1: -122.4256, lat1: 37.7616 },
    boundary: [[0, 0], [1, 0], [1, 1], [0, 1]],
    features: [],
    paths: [
      { id: 'diag-1', name: 'Crossing Path', points: [[0.02, 0.98], [0.5, 0.55], [0.98, 0.02]] },
      { id: 'diag-2', name: 'Crossing Path', points: [[0.02, 0.02], [0.5, 0.55], [0.98, 0.98]] },
    ],
    pois: [
      { id: 'entrance-18th', name: '18th & Dolores Entrance', type: 'entrance', uv: [0.05, 0.95], description: 'Main northwest corner entrance, steps from the Mission Dolores basilica.' },
      { id: 'tennis-courts', name: 'Tennis & Pickleball Courts', type: 'amenity', uv: [0.3, 0.82], description: 'Six lighted courts on the flat northern terrace of the park.' },
      { id: 'hipster-hill', name: 'Dolores Hill (the view)', type: 'viewpoint', uv: [0.22, 0.12], description: 'The famous southwest slope — full skyline panorama and maximum picnic-blanket density.' },
      { id: 'playground', name: 'Helen Diller Playground', type: 'playground', uv: [0.55, 0.15], description: 'Award-winning playground with the giant silver superslide.' },
      { id: 'clubhouse', name: 'Clubhouse & Restrooms', type: 'amenity', uv: [0.6, 0.55], description: 'Mid-park clubhouse along the old streetcar right-of-way.' },
    ],
  },
  {
    id: 'presidio',
    name: 'The Presidio',
    description:
      'A 218-year-old army post turned national park — eucalyptus forests, coastal batteries, beaches and trails at the Golden Gate.',
    size: '1,500 acres',
    area: 'Golden Gate',
    mustSee: true,
    tags: ['hike', 'views', 'beach', 'history', 'family'],
    latLng: [37.7989, -122.4662],
    bbox: { lng0: -122.489, lat0: 37.7875, lng1: -122.446, lat1: 37.8105 },
    boundary: [
      [0.04, 0.12], [0.18, 0.02], [0.55, 0], [1, 0.06], [1, 0.62], [0.82, 0.78],
      [0.55, 0.93], [0.34, 1], [0.24, 0.92], [0.1, 0.6], [0, 0.35],
    ],
    features: [
      { id: 'baker-beach-sand', type: 'sand', points: [[0.02, 0.12], [0.1, 0.1], [0.07, 0.32], [0.0, 0.34]] },
      { id: 'parade-ground', type: 'meadow', points: [[0.58, 0.56], [0.7, 0.56], [0.7, 0.7], [0.58, 0.7]] },
    ],
    paths: [
      { id: 'lovers-lane', name: 'Lovers’ Lane', points: [[0.88, 0.12], [0.8, 0.3], [0.72, 0.5], [0.66, 0.62]] },
      { id: 'batteries-bluffs', name: 'Batteries to Bluffs Trail', points: [[0.06, 0.2], [0.12, 0.45], [0.2, 0.68], [0.3, 0.88]] },
      { id: 'ecology-trail', name: 'Ecology Trail', points: [[0.62, 0.6], [0.56, 0.45], [0.6, 0.3], [0.7, 0.22]] },
    ],
    pois: [
      { id: 'lombard-gate', name: 'Lombard Gate', type: 'entrance', uv: [0.97, 0.45], description: 'The grand eastern gateway into the post from Lombard Street.' },
      { id: 'tunnel-tops', name: 'Presidio Tunnel Tops', type: 'landmark', uv: [0.64, 0.78], description: '14 acres of new parkland built over the highway tunnels, with knockout bridge views.' },
      { id: 'main-post', name: 'Main Post & Parade Ground', type: 'landmark', uv: [0.64, 0.63], description: 'The historic heart of the post — barracks, museums and a huge lawn.' },
      { id: 'fort-point', name: 'Fort Point', type: 'landmark', uv: [0.3, 0.97], description: 'Civil-War brick fortress crouched directly beneath the Golden Gate Bridge.' },
      { id: 'baker-beach', name: 'Baker Beach', type: 'beach', uv: [0.05, 0.22], description: 'Mile-long sandy beach with the classic postcard angle on the bridge.' },
      { id: 'inspiration-point', name: 'Inspiration Point', type: 'viewpoint', uv: [0.6, 0.42], description: 'Overlook above the forest with views across Crissy Field to Alcatraz.' },
    ],
  },
  {
    id: 'crissy-field',
    name: 'Crissy Field',
    description:
      'A former army airfield reborn as bayfront parkland — beach, restored marsh, and the city’s favorite flat run with bridge views.',
    size: '130 acres',
    area: 'Golden Gate',
    mustSee: true,
    tags: ['views', 'beach', 'picnic', 'family'],
    latLng: [37.8039, -122.455],
    bbox: { lng0: -122.466, lat0: 37.802, lng1: -122.4285, lat1: 37.8078 },
    boundary: [
      [0, 0.55], [0.08, 0.3], [0.3, 0.15], [0.6, 0.1], [1, 0.2], [1, 0.75], [0.7, 0.95], [0.35, 1], [0.1, 0.85],
    ],
    features: [
      { id: 'marsh', type: 'marsh', points: [[0.6, 0.3], [0.74, 0.28], [0.78, 0.5], [0.68, 0.58], [0.58, 0.5]] },
      { id: 'east-beach-sand', type: 'sand', points: [[0.74, 0.6], [1, 0.55], [1, 0.78], [0.72, 0.8]] },
      { id: 'airfield-lawn', type: 'meadow', points: [[0.28, 0.35], [0.55, 0.3], [0.56, 0.6], [0.3, 0.65]] },
    ],
    paths: [
      { id: 'gg-promenade', name: 'Golden Gate Promenade', points: [[0.02, 0.72], [0.2, 0.78], [0.45, 0.78], [0.7, 0.72], [0.95, 0.62]] },
    ],
    pois: [
      { id: 'east-beach', name: 'East Beach Entrance', type: 'entrance', uv: [0.93, 0.68], description: 'Main parking and beach access at the Marina end of the promenade.' },
      { id: 'airfield', name: 'Historic Airfield Lawn', type: 'nature', uv: [0.42, 0.48], description: 'The 1921 grass airstrip, now a giant lawn for kites, picnics and fog.' },
      { id: 'crissy-marsh', name: 'Crissy Marsh', type: 'nature', uv: [0.68, 0.44], description: 'Restored tidal marsh — herons, egrets and shorebirds minutes from downtown.' },
      { id: 'warming-hut', name: 'Warming Hut', type: 'amenity', uv: [0.1, 0.78], description: 'Snacks, books and hot chocolate at the west end, near Fort Point.' },
      { id: 'torpedo-wharf', name: 'Torpedo Wharf', type: 'viewpoint', uv: [0.07, 0.92], description: 'Fishing pier aimed straight at the Golden Gate Bridge.' },
    ],
  },
  {
    id: 'alamo-square',
    name: 'Alamo Square',
    description:
      'Four hilltop blocks of lawn with the most photographed view in the city — the Painted Ladies against the downtown skyline.',
    size: '12.7 acres',
    area: 'Alamo Square / NoPa',
    mustSee: true,
    tags: ['views', 'picnic', 'history'],
    latLng: [37.7764, -122.4346],
    bbox: { lng0: -122.4358, lat0: 37.7755, lng1: -122.4327, lat1: 37.7775 },
    boundary: [[0, 0], [1, 0], [1, 1], [0, 1]],
    features: [],
    paths: [
      { id: 'perimeter', name: 'Perimeter Path', points: [[0.06, 0.08], [0.94, 0.08], [0.94, 0.92], [0.06, 0.92], [0.06, 0.08]] },
      { id: 'diag', name: 'Crossing Path', points: [[0.06, 0.08], [0.5, 0.5], [0.94, 0.92]] },
    ],
    pois: [
      { id: 'hayes-steiner', name: 'Hayes & Steiner Entrance', type: 'entrance', uv: [0.93, 0.1], description: 'Southeast corner entrance — the classic approach to the postcard view.' },
      { id: 'painted-ladies-view', name: 'Painted Ladies Viewpoint', type: 'viewpoint', uv: [0.88, 0.45], description: 'The east-slope lawn facing the row of Victorian “Seven Sisters” and the skyline.' },
      { id: 'alamo-playground', name: 'Playground', type: 'playground', uv: [0.3, 0.2], description: 'Renovated playground on the southwest slope.' },
      { id: 'dog-run', name: 'Dog Play Area', type: 'amenity', uv: [0.25, 0.75], description: 'Unofficial-turned-official off-leash hangout on the northwest lawn.' },
    ],
  },
  {
    id: 'lands-end',
    name: 'Lands End',
    description:
      'Wild cliffs, shipwreck tides and windswept cypress at the city’s rugged northwest corner — the closest thing SF has to the end of the world.',
    size: '120 acres',
    area: 'Outer Richmond',
    mustSee: true,
    tags: ['hike', 'views', 'history', 'nature'],
    latLng: [37.7825, -122.5056],
    bbox: { lng0: -122.5125, lat0: 37.778, lng1: -122.489, lat1: 37.789 },
    boundary: [
      [0, 0.05], [0.18, 0.0], [0.45, 0.2], [0.7, 0.45], [1, 0.62], [1, 0.95], [0.7, 1], [0.4, 0.85], [0.15, 0.6], [0.0, 0.35],
    ],
    features: [
      { id: 'sutro-baths-pool', type: 'lake', points: [[0.04, 0.22], [0.1, 0.2], [0.12, 0.34], [0.05, 0.36]] },
    ],
    paths: [
      { id: 'coastal-trail', name: 'Coastal Trail', points: [[0.07, 0.3], [0.2, 0.55], [0.38, 0.72], [0.6, 0.8], [0.82, 0.82], [0.96, 0.78]] },
    ],
    pois: [
      { id: 'lands-end-lookout', name: 'Lands End Lookout (Entrance)', type: 'entrance', uv: [0.1, 0.14], description: 'Visitor center, café and main trailhead above the Sutro Baths.' },
      { id: 'sutro-baths', name: 'Sutro Baths Ruins', type: 'landmark', uv: [0.06, 0.28], description: 'Concrete ruins of the 1896 glass-roofed swimming palace, slowly returning to the sea.' },
      { id: 'uss-sf-memorial', name: 'USS San Francisco Memorial', type: 'landmark', uv: [0.27, 0.52], description: 'The shell-torn bridge of a WWII cruiser, facing the open Pacific.' },
      { id: 'mile-rock-overlook', name: 'Mile Rock Overlook', type: 'viewpoint', uv: [0.42, 0.78], description: 'Cliff-edge overlook above Mile Rock Beach and its tiny lighthouse.' },
      { id: 'eagles-point', name: 'Eagle’s Point', type: 'viewpoint', uv: [0.93, 0.85], description: 'Eastern trailhead overlook — the Golden Gate framed by cypress.' },
      { id: 'legion-of-honor', name: 'Legion of Honor', type: 'museum', uv: [0.6, 0.45], description: 'Neoclassical fine-arts museum on the bluff, with Rodin’s Thinker out front.' },
    ],
  },
  {
    id: 'twin-peaks',
    name: 'Twin Peaks',
    description:
      'Two grassy 920-ft summits dead-center in the city — THE 360° panorama of San Francisco. Bring a windbreaker; the fog has opinions.',
    size: '64 acres',
    area: 'Central SF',
    mustSee: true,
    tags: ['views', 'hike', 'nature'],
    latLng: [37.7544, -122.4477],
    bbox: { lng0: -122.4525, lat0: 37.749, lng1: -122.4425, lat1: 37.759 },
    boundary: [
      [0.25, 0], [0.7, 0.04], [0.95, 0.25], [1, 0.55], [0.85, 0.85], [0.55, 1], [0.25, 0.95], [0.05, 0.7], [0, 0.35],
    ],
    features: [],
    paths: [
      { id: 'figure-eight', name: 'Twin Peaks Blvd (figure 8)', points: [[0.5, 0.05], [0.25, 0.2], [0.45, 0.4], [0.7, 0.55], [0.5, 0.72], [0.3, 0.85], [0.55, 0.95]] },
      { id: 'summit-trail', name: 'Summit Trail', points: [[0.48, 0.9], [0.5, 0.68], [0.52, 0.45], [0.5, 0.22]] },
    ],
    pois: [
      { id: 'christmas-tree-point', name: 'Christmas Tree Point', type: 'viewpoint', uv: [0.72, 0.78], description: 'The famous curved overlook facing Market Street — the postcard panorama of downtown and the bay.' },
      { id: 'north-peak', name: 'North Peak (Eureka)', type: 'viewpoint', uv: [0.5, 0.62], description: 'The 922-ft northern summit, a short stair climb above the parking loop.' },
      { id: 'south-peak', name: 'South Peak (Noe)', type: 'viewpoint', uv: [0.48, 0.32], description: 'The quieter twin — same view, fewer people, occasional coyote.' },
      { id: 'mission-blue-habitat', name: 'Mission Blue Butterfly Habitat', type: 'nature', uv: [0.25, 0.5], description: 'Restored grassland slopes that shelter the endangered Mission blue butterfly each spring.' },
    ],
  },
  {
    id: 'ocean-beach',
    name: 'Ocean Beach',
    description:
      'Three and a half miles of wild Pacific strand along the city’s entire western edge — sunsets, surfers in serious wetsuits, and evening bonfires.',
    size: '3.5 miles',
    area: 'Outer Sunset',
    mustSee: true,
    tags: ['beach', 'views', 'nature', 'dogs'],
    latLng: [37.7515, -122.5105],
    bbox: { lng0: -122.516, lat0: 37.726, lng1: -122.505, lat1: 37.778 },
    boundary: [
      [0.45, 0], [0.95, 0.02], [0.85, 0.25], [0.8, 0.5], [0.78, 0.75], [0.85, 0.92], [0.75, 1], [0.3, 1], [0.35, 0.85], [0.3, 0.6], [0.25, 0.35], [0.3, 0.12],
    ],
    features: [
      { id: 'strand', type: 'sand', points: [[0.42, 0.02], [0.88, 0.03], [0.8, 0.3], [0.75, 0.6], [0.74, 0.88], [0.4, 0.86], [0.32, 0.55], [0.32, 0.2]] },
    ],
    paths: [
      { id: 'great-highway', name: 'Great Highway Park promenade', points: [[0.85, 0.08], [0.78, 0.3], [0.72, 0.55], [0.7, 0.8]] },
    ],
    pois: [
      { id: 'cliff-house', name: 'Cliff House overlook', type: 'viewpoint', uv: [0.72, 0.96], description: 'The northern tip below the old Cliff House — seals on Seal Rocks and the start of the strand.' },
      { id: 'beach-chalet', name: 'Beach Chalet', type: 'amenity', uv: [0.78, 0.78], description: '1925 lodge with WPA frescoes downstairs and a brewpub view of the surf upstairs.' },
      { id: 'bonfire-pits', name: 'Bonfire pits', type: 'amenity', uv: [0.62, 0.55], description: 'The only legal beach bonfires in SF — first-come fire rings between Fulton and Lincoln.' },
      { id: 'sloat-entrance', name: 'Sloat Blvd access', type: 'entrance', uv: [0.6, 0.06], description: 'Southern parking and beach access near the zoo.' },
      { id: 'surfer-watch', name: 'Surfer watching (Kelly’s Cove)', type: 'viewpoint', uv: [0.6, 0.9], description: 'The classic cove for watching cold-water surfers take on serious Pacific swell.' },
    ],
  },
  {
    id: 'fort-funston',
    name: 'Fort Funston',
    description:
      '200-ft sand bluffs over the Pacific where hang gliders launch into the sea breeze — also the unofficial happiest dog park in America.',
    size: '230 acres',
    area: 'Lakeshore',
    tags: ['beach', 'dogs', 'hike', 'views'],
    latLng: [37.7136, -122.5025],
    bbox: { lng0: -122.5085, lat0: 37.705, lng1: -122.493, lat1: 37.7215 },
    boundary: [
      [0.3, 0], [0.85, 0.05], [1, 0.3], [0.9, 0.6], [0.75, 0.95], [0.35, 1], [0.2, 0.75], [0.1, 0.45], [0.15, 0.15],
    ],
    features: [
      { id: 'dunes', type: 'sand', points: [[0.16, 0.18], [0.35, 0.1], [0.3, 0.5], [0.32, 0.85], [0.22, 0.72], [0.13, 0.45]] },
    ],
    paths: [
      { id: 'sunset-trail', name: 'Sunset Trail (loop)', points: [[0.6, 0.9], [0.45, 0.7], [0.4, 0.45], [0.5, 0.2], [0.7, 0.15]] },
      { id: 'sand-ladder', name: 'Sand Ladder to beach', points: [[0.42, 0.6], [0.3, 0.62], [0.18, 0.6]] },
    ],
    pois: [
      { id: 'hang-glider-deck', name: 'Hang Glider Viewing Deck', type: 'viewpoint', uv: [0.5, 0.75], description: 'Wooden deck on the bluff edge where gliders step off into the updraft — best free show in town.' },
      { id: 'funston-beach', name: 'Fort Funston Beach', type: 'beach', uv: [0.12, 0.4], description: 'Wide, wild off-leash beach at the bottom of the sand ladder.' },
      { id: 'battery-davis', name: 'Battery Davis', type: 'landmark', uv: [0.62, 0.35], description: '1938 coastal gun battery buried in the dunes — now a sandy tunnel to wander through.' },
      { id: 'funston-lot', name: 'Main parking lot', type: 'entrance', uv: [0.72, 0.6], description: 'Trailhead lot off Skyline Blvd — gliders rig up right beside the cars.' },
    ],
  },
  {
    id: 'lake-merced',
    name: 'Lake Merced Park',
    description:
      'A freshwater lake at the city’s southwest corner ringed by a 4.5-mile path — rowers, pedal boats, and herons hiding in the tules.',
    size: '614 acres',
    area: 'Lakeshore',
    tags: ['nature', 'hike', 'family'],
    latLng: [37.718, -122.4835],
    bbox: { lng0: -122.4955, lat0: 37.7045, lng1: -122.4715, lat1: 37.7305 },
    boundary: [
      [0.15, 0.1], [0.5, 0], [0.75, 0.08], [0.85, 0.3], [0.95, 0.55], [0.85, 0.85], [0.55, 1], [0.3, 0.92], [0.1, 0.7], [0.05, 0.4],
    ],
    features: [
      { id: 'north-lake', type: 'lake', points: [[0.35, 0.55], [0.6, 0.5], [0.8, 0.6], [0.75, 0.82], [0.5, 0.9], [0.32, 0.78]] },
      { id: 'south-lake', type: 'lake', points: [[0.3, 0.15], [0.55, 0.1], [0.65, 0.28], [0.55, 0.45], [0.35, 0.45], [0.22, 0.32]] },
    ],
    paths: [
      { id: 'lake-loop', name: 'Lake Merced Loop', points: [[0.5, 0.05], [0.75, 0.2], [0.85, 0.5], [0.7, 0.8], [0.45, 0.92], [0.2, 0.75], [0.12, 0.45], [0.25, 0.15]] },
    ],
    pois: [
      { id: 'boathouse', name: 'Boathouse & dock', type: 'amenity', uv: [0.68, 0.7], description: 'Rowing clubs, pedal-boat rentals and a lakeside restaurant on the north shore.' },
      { id: 'sunset-circle', name: 'Sunset Circle', type: 'entrance', uv: [0.42, 0.95], description: 'Main parking circle at the north end, start of the loop path.' },
      { id: 'mesa-overlook', name: 'Lake mesa overlook', type: 'viewpoint', uv: [0.15, 0.55], description: 'Western bluff between lake and ocean — watch hawks hunt over the tules.' },
      { id: 'impossible-bridge', name: 'South Lake bridge', type: 'landmark', uv: [0.45, 0.4], description: 'The footbridge between the lake’s two arms, a favorite of anglers.' },
    ],
  },
  {
    id: 'stern-grove',
    name: 'Stern Grove',
    description:
      'A eucalyptus-walled canyon hiding a natural amphitheater — home of the beloved free summer concert series since 1938.',
    size: '33 acres',
    area: 'Sunset',
    tags: ['events', 'picnic', 'nature', 'dogs'],
    latLng: [37.7363, -122.477],
    bbox: { lng0: -122.4835, lat0: 37.7335, lng1: -122.466, lat1: 37.7395 },
    boundary: [
      [0, 0.3], [0.2, 0.15], [0.5, 0.1], [0.8, 0.2], [1, 0.35], [1, 0.7], [0.75, 0.85], [0.45, 0.9], [0.15, 0.8], [0, 0.6],
    ],
    features: [
      { id: 'pine-lake', type: 'lake', points: [[0.06, 0.4], [0.18, 0.35], [0.22, 0.5], [0.12, 0.58]] },
      { id: 'concert-meadow', type: 'meadow', points: [[0.55, 0.35], [0.75, 0.35], [0.75, 0.6], [0.55, 0.6]] },
    ],
    paths: [
      { id: 'grove-trail', name: 'Grove Trail', points: [[0.05, 0.5], [0.3, 0.55], [0.55, 0.5], [0.8, 0.5], [0.95, 0.55]] },
    ],
    pois: [
      { id: 'amphitheater', name: 'Concert Meadow', type: 'landmark', uv: [0.65, 0.48], description: 'The natural bowl where 10,000 people picnic through free Sunday concerts every summer.' },
      { id: 'trocadero', name: 'Trocadero Clubhouse', type: 'landmark', uv: [0.52, 0.62], description: '1892 roadhouse-turned-clubhouse tucked among the redwoods — bullet hole in the door and all.' },
      { id: 'pine-lake-poi', name: 'Pine Lake', type: 'nature', uv: [0.13, 0.47], description: 'One of SF’s three natural lakes, with a quiet dog-friendly meadow at the west end.' },
      { id: 'grove-entrance', name: '19th Ave entrance', type: 'entrance', uv: [0.92, 0.45], description: 'Main stairs down into the grove from Sloat & 19th Avenue.' },
    ],
  },
  {
    id: 'grand-view-park',
    name: 'Grand View Park',
    description:
      'A lone dune-grass summit poking out of the Sunset grid — locals call it Turtle Hill. Climb the mosaic-tiled 16th Avenue steps on the way up.',
    size: '1.1 acres',
    area: 'Inner Sunset',
    tags: ['views', 'hike'],
    latLng: [37.7565, -122.4715],
    bbox: { lng0: -122.4738, lat0: 37.755, lng1: -122.4694, lat1: 37.758 },
    boundary: [
      [0.2, 0.05], [0.7, 0], [1, 0.3], [0.9, 0.75], [0.55, 1], [0.15, 0.85], [0, 0.45],
    ],
    features: [],
    paths: [
      { id: 'summit-stairs', name: 'Summit stairs', points: [[0.85, 0.15], [0.6, 0.4], [0.5, 0.6]] },
    ],
    pois: [
      { id: 'turtle-hill-summit', name: 'Turtle Hill summit', type: 'viewpoint', uv: [0.5, 0.55], description: '666 ft of sand dune with a full sweep from the Golden Gate to the ocean — sunset central.' },
      { id: 'moraga-steps', name: '16th Ave Tiled Steps (below)', type: 'landmark', uv: [0.85, 0.1], description: 'The famous 163-step sea-to-stars mosaic staircase begins a block downhill on Moraga.' },
    ],
  },
  {
    id: 'mclaren-park',
    name: 'John McLaren Park',
    description:
      'The city’s second-largest park and its best-kept secret — rolling grasslands, a philosopher’s loop trail, and the sky-blue water tower you see from 101.',
    size: '312 acres',
    area: 'Excelsior',
    tags: ['hike', 'nature', 'views', 'dogs'],
    latLng: [37.7195, -122.4185],
    bbox: { lng0: -122.4315, lat0: 37.7115, lng1: -122.4035, lat1: 37.7265 },
    boundary: [
      [0, 0.45], [0.15, 0.25], [0.35, 0.3], [0.45, 0.1], [0.7, 0], [0.9, 0.15], [1, 0.45], [0.85, 0.7], [0.65, 0.65], [0.5, 0.9], [0.3, 1], [0.12, 0.85], [0.05, 0.65],
    ],
    features: [
      { id: 'mclaren-meadow', type: 'meadow', points: [[0.3, 0.5], [0.45, 0.45], [0.5, 0.6], [0.35, 0.68]] },
      { id: 'yosemite-marsh', type: 'marsh', points: [[0.72, 0.3], [0.8, 0.28], [0.82, 0.4], [0.73, 0.42]] },
    ],
    paths: [
      { id: 'philosophers-way', name: 'Philosopher’s Way', points: [[0.2, 0.4], [0.35, 0.25], [0.6, 0.18], [0.8, 0.3], [0.78, 0.55], [0.55, 0.75], [0.3, 0.8], [0.15, 0.6], [0.2, 0.4]] },
    ],
    pois: [
      { id: 'blue-tower', name: 'Blue Water Tower', type: 'landmark', uv: [0.42, 0.62], description: 'The cheerful baby-blue tank on the ridgeline — an accidental city icon visible for miles.' },
      { id: 'jerry-garcia', name: 'Jerry Garcia Amphitheater', type: 'landmark', uv: [0.55, 0.45], description: 'Outdoor amphitheater named for the Excelsior’s most famous son — free shows in summer.' },
      { id: 'mclaren-overlook', name: 'McNab Lake & overlook', type: 'viewpoint', uv: [0.75, 0.5], description: 'East-side knoll with views over the bay, Candlestick Point and San Bruno Mountain.' },
      { id: 'mansell-entry', name: 'Mansell St entrance', type: 'entrance', uv: [0.2, 0.7], description: 'Main road through the park’s western meadows.' },
    ],
  },
  {
    id: 'glen-canyon',
    name: 'Glen Canyon Park',
    description:
      'A genuine rocky canyon hidden mid-city — chert cliffs, a year-round creek, and red-tailed hawks ten minutes from a BART station.',
    size: '70 acres',
    area: 'Glen Park',
    tags: ['hike', 'nature', 'family'],
    latLng: [37.7399, -122.4405],
    bbox: { lng0: -122.4455, lat0: 37.7335, lng1: -122.4345, lat1: 37.746 },
    boundary: [
      [0.35, 0], [0.75, 0.05], [0.85, 0.3], [0.7, 0.6], [0.75, 0.9], [0.5, 1], [0.25, 0.92], [0.2, 0.6], [0.3, 0.3],
    ],
    features: [],
    paths: [
      { id: 'creek-trail', name: 'Islais Creek Trail', points: [[0.55, 0.08], [0.5, 0.3], [0.45, 0.55], [0.5, 0.8], [0.45, 0.95]] },
      { id: 'gum-tree-girls', name: 'Gum Tree Girls Trail', points: [[0.3, 0.35], [0.4, 0.5], [0.6, 0.65], [0.68, 0.85]] },
    ],
    pois: [
      { id: 'chert-cliffs', name: 'Chert outcrops', type: 'nature', uv: [0.62, 0.55], description: 'Red ribbon-rock cliffs where local kids learn to climb — 100-million-year-old seafloor.' },
      { id: 'islais-creek', name: 'Islais Creek', type: 'nature', uv: [0.48, 0.45], description: 'One of the last free-flowing creeks in SF, alive with willows and dragonflies.' },
      { id: 'silvertree', name: 'Rec center & playground', type: 'playground', uv: [0.45, 0.12], description: 'Ballfields, climbing playground and the Silver Tree day camp at the canyon mouth.' },
    ],
  },
  {
    id: 'bernal-heights',
    name: 'Bernal Heights Park',
    description:
      'A bald grassy hilltop ringed by a dirt loop — dogs everywhere, a tiny rope swing if you can find it, and a knockout skyline view.',
    size: '26 acres',
    area: 'Bernal Heights',
    tags: ['views', 'dogs', 'hike'],
    latLng: [37.7432, -122.4145],
    bbox: { lng0: -122.42, lat0: 37.7405, lng1: -122.4075, lat1: 37.7455 },
    boundary: [
      [0.05, 0.4], [0.25, 0.15], [0.55, 0.05], [0.85, 0.2], [1, 0.55], [0.8, 0.85], [0.5, 1], [0.2, 0.85],
    ],
    features: [],
    paths: [
      { id: 'hill-loop', name: 'Bernal Hill Loop', points: [[0.5, 0.15], [0.8, 0.35], [0.85, 0.65], [0.55, 0.85], [0.25, 0.7], [0.2, 0.4], [0.5, 0.15]] },
    ],
    pois: [
      { id: 'bernal-summit', name: 'Summit viewpoint', type: 'viewpoint', uv: [0.5, 0.5], description: 'Radio tower summit with the full downtown-to-twin-peaks panorama over the Mission.' },
      { id: 'rope-swing', name: 'The swing tree', type: 'landmark', uv: [0.68, 0.6], description: 'A rotating cast of guerrilla rope swings hangs from the eucalyptus on the east slope.' },
      { id: 'esmeralda-entry', name: 'Bernal Heights Blvd gate', type: 'entrance', uv: [0.15, 0.55], description: 'Western gate where the car-free boulevard loop begins.' },
    ],
  },
  {
    id: 'buena-vista',
    name: 'Buena Vista Park',
    description:
      'San Francisco’s oldest park (1867) — a steep cone of coast live oaks above the Haight with stairways winding to a quiet wooded summit.',
    size: '36 acres',
    area: 'Haight-Ashbury',
    tags: ['hike', 'views', 'nature'],
    latLng: [37.7681, -122.4407],
    bbox: { lng0: -122.4445, lat0: 37.7655, lng1: -122.4375, lat1: 37.7705 },
    boundary: [
      [0.15, 0.1], [0.6, 0], [0.95, 0.2], [1, 0.55], [0.75, 0.9], [0.4, 1], [0.1, 0.8], [0, 0.4],
    ],
    features: [],
    paths: [
      { id: 'bv-spiral', name: 'Summit loop', points: [[0.15, 0.3], [0.4, 0.2], [0.7, 0.35], [0.65, 0.65], [0.4, 0.7], [0.45, 0.45]] },
    ],
    pois: [
      { id: 'bv-summit', name: 'Wooded summit', type: 'viewpoint', uv: [0.47, 0.48], description: '575-ft summit in the oaks — peekaboo views of downtown, the bridge and Marin through the canopy.' },
      { id: 'gutter-headstones', name: 'Marble gutter fragments', type: 'landmark', uv: [0.3, 0.6], description: 'The rain gutters are lined with broken Gold-Rush-era headstones from relocated cemeteries. Look down.' },
      { id: 'haight-entry', name: 'Haight St entrance', type: 'entrance', uv: [0.5, 0.92], description: 'North entrance right off the famous Haight Street strip.' },
    ],
  },
  {
    id: 'corona-heights',
    name: 'Corona Heights Park',
    description:
      'A bare red-rock crag above the Castro with a jagged 360° summit — plus the hands-on Randall Museum tucked into its flank.',
    size: '13 acres',
    area: 'Castro',
    tags: ['views', 'hike', 'family', 'dogs'],
    latLng: [37.7651, -122.4382],
    bbox: { lng0: -122.441, lat0: 37.763, lng1: -122.435, lat1: 37.767 },
    boundary: [
      [0.1, 0.2], [0.45, 0.05], [0.85, 0.15], [1, 0.5], [0.8, 0.85], [0.45, 1], [0.1, 0.8], [0, 0.5],
    ],
    features: [],
    paths: [
      { id: 'corona-trail', name: 'Summit trail', points: [[0.2, 0.7], [0.4, 0.55], [0.55, 0.4], [0.6, 0.25]] },
    ],
    pois: [
      { id: 'corona-summit', name: 'Red-rock summit', type: 'viewpoint', uv: [0.58, 0.35], description: 'Scramble the last few feet of bare chert for an unobstructed sweep from downtown to Diablo.' },
      { id: 'randall-museum', name: 'Randall Museum', type: 'museum', uv: [0.3, 0.75], description: 'Free kids’ science and nature museum with live animals and a model railroad.' },
      { id: 'dog-run-ch', name: 'Dog run', type: 'amenity', uv: [0.75, 0.7], description: 'Fenced run on the east slope with skyline backdrop.' },
    ],
  },
  {
    id: 'mount-davidson',
    name: 'Mount Davidson Park',
    description:
      'The highest point in San Francisco (928 ft) — a foggy eucalyptus forest opening suddenly onto a giant 103-ft concrete cross and east-facing views.',
    size: '40 acres',
    area: 'Miraloma',
    tags: ['hike', 'views', 'nature'],
    latLng: [37.7383, -122.4543],
    bbox: { lng0: -122.459, lat0: 37.7335, lng1: -122.4495, lat1: 37.7425 },
    boundary: [
      [0.2, 0.1], [0.6, 0], [0.9, 0.2], [1, 0.5], [0.85, 0.8], [0.5, 1], [0.15, 0.85], [0, 0.45],
    ],
    features: [],
    paths: [
      { id: 'davidson-east', name: 'East Ridge Trail', points: [[0.85, 0.55], [0.65, 0.5], [0.5, 0.45]] },
      { id: 'davidson-north', name: 'Juanita Way Trail', points: [[0.35, 0.85], [0.42, 0.6], [0.5, 0.45]] },
    ],
    pois: [
      { id: 'davidson-cross', name: 'Mount Davidson Cross', type: 'landmark', uv: [0.52, 0.42], description: 'The 103-ft cross from the closing scene of “Dirty Harry,” looming out of the fog since 1934.' },
      { id: 'davidson-summit', name: 'Summit clearing', type: 'viewpoint', uv: [0.6, 0.5], description: 'The city’s rooftop — a grassy east-facing shoulder above the eucalyptus, looking to the bay.' },
      { id: 'davidson-entry', name: 'Juanita Way entrance', type: 'entrance', uv: [0.3, 0.88], description: 'Main forest trailhead on the north side.' },
    ],
  },
  {
    id: 'palace-of-fine-arts',
    name: 'Palace of Fine Arts',
    description:
      'A dreamlike Roman rotunda and colonnade reflected in a swan lagoon — the last survivor of the 1915 world’s fair, and everyone’s favorite photo stop.',
    size: '17 acres',
    area: 'Marina',
    mustSee: true,
    tags: ['history', 'picnic', 'family', 'views'],
    latLng: [37.8029, -122.4484],
    bbox: { lng0: -122.4508, lat0: 37.8012, lng1: -122.446, lat1: 37.8047 },
    boundary: [
      [0.05, 0.1], [0.9, 0.05], [1, 0.4], [0.9, 0.9], [0.3, 1], [0.05, 0.75], [0, 0.4],
    ],
    features: [
      { id: 'lagoon', type: 'lake', points: [[0.35, 0.3], [0.7, 0.25], [0.85, 0.45], [0.7, 0.7], [0.45, 0.72], [0.3, 0.5]] },
    ],
    paths: [
      { id: 'lagoon-walk', name: 'Lagoon walk', points: [[0.2, 0.2], [0.5, 0.15], [0.85, 0.3], [0.8, 0.75], [0.5, 0.85], [0.2, 0.7]] },
    ],
    pois: [
      { id: 'rotunda', name: 'The Rotunda', type: 'landmark', uv: [0.22, 0.45], description: 'Bernard Maybeck’s 162-ft open dome — built as a temporary ruin in 1915 and too loved to demolish.' },
      { id: 'colonnade', name: 'Colonnade & weeping ladies', type: 'landmark', uv: [0.3, 0.72], description: 'Curving rows of Corinthian columns topped by sculpted women turned mournfully away.' },
      { id: 'swan-lagoon', name: 'Swan lagoon', type: 'nature', uv: [0.6, 0.48], description: 'The mirror-still lagoon — swans, herons and the classic reflection shot at golden hour.' },
    ],
  },
  {
    id: 'fort-mason',
    name: 'Fort Mason & Great Meadow',
    description:
      'A grassy headland between Aquatic Park and the Marina — Civil-War-era piers below, food trucks and bay panoramas on the lawn above.',
    size: '47 acres',
    area: 'Marina',
    tags: ['views', 'picnic', 'events', 'history', 'food'],
    latLng: [37.8055, -122.4265],
    bbox: { lng0: -122.4315, lat0: 37.8025, lng1: -122.4235, lat1: 37.8085 },
    boundary: [
      [0.1, 0.05], [0.85, 0], [1, 0.3], [0.9, 0.65], [0.7, 0.95], [0.3, 1], [0.05, 0.7], [0, 0.35],
    ],
    features: [
      { id: 'great-meadow', type: 'meadow', points: [[0.25, 0.25], [0.65, 0.2], [0.7, 0.55], [0.3, 0.6]] },
    ],
    paths: [
      { id: 'bay-trail-fm', name: 'Bay Trail link', points: [[0.05, 0.45], [0.3, 0.75], [0.6, 0.85], [0.9, 0.7]] },
    ],
    pois: [
      { id: 'great-meadow-poi', name: 'Great Meadow', type: 'viewpoint', uv: [0.45, 0.4], description: 'The sloping lawn with Alcatraz dead ahead — Off the Grid food trucks gather here on Fridays.' },
      { id: 'fort-mason-center', name: 'Fort Mason Center (piers)', type: 'landmark', uv: [0.55, 0.85], description: 'WWII embarkation piers reborn as arts buildings, theaters and a famous vegetarian restaurant.' },
      { id: 'black-point', name: 'Black Point Battery', type: 'landmark', uv: [0.85, 0.55], description: 'Hidden gun battery and gardens on the eastern bluff above Aquatic Park.' },
      { id: 'community-garden', name: 'Community garden', type: 'nature', uv: [0.25, 0.65], description: 'One of the city’s oldest community gardens, tucked behind the hostel.' },
    ],
  },
  {
    id: 'lafayette-park',
    name: 'Lafayette Park',
    description:
      'Pacific Heights’ manicured hilltop square — eucalyptus lawns, a stellar playground, and mansion-framed views down to the bay.',
    size: '11.5 acres',
    area: 'Pacific Heights',
    tags: ['views', 'picnic', 'family', 'dogs'],
    latLng: [37.7916, -122.4271],
    bbox: { lng0: -122.4297, lat0: 37.7897, lng1: -122.4245, lat1: 37.7934 },
    boundary: [[0, 0], [1, 0], [1, 1], [0, 1]],
    features: [],
    paths: [
      { id: 'laf-perimeter', name: 'Perimeter path', points: [[0.08, 0.1], [0.92, 0.1], [0.92, 0.9], [0.08, 0.9], [0.08, 0.1]] },
      { id: 'laf-cross', name: 'Summit path', points: [[0.08, 0.5], [0.5, 0.55], [0.92, 0.5]] },
    ],
    pois: [
      { id: 'laf-summit', name: 'Hilltop lawn', type: 'viewpoint', uv: [0.5, 0.55], description: 'The 378-ft crown of Pacific Heights — picnic with the bay glittering between mansions.' },
      { id: 'laf-playground', name: 'Playground', type: 'playground', uv: [0.7, 0.3], description: 'One of the city’s best playgrounds, rebuilt in 2013 with a long hillside slide.' },
      { id: 'laf-dogs', name: 'Off-leash area', type: 'amenity', uv: [0.25, 0.7], description: 'The unofficial society dog park of Pacific Heights.' },
    ],
  },
  {
    id: 'washington-square',
    name: 'Washington Square',
    description:
      'North Beach’s front lawn — morning tai chi, church bells from Saints Peter & Paul, and focaccia picnics in the heart of old Little Italy.',
    size: '2.6 acres',
    area: 'North Beach',
    tags: ['picnic', 'history', 'food'],
    latLng: [37.8005, -122.4097],
    bbox: { lng0: -122.4113, lat0: 37.7995, lng1: -122.4082, lat1: 37.8015 },
    boundary: [[0, 0], [1, 0], [1, 1], [0, 1]],
    features: [],
    paths: [
      { id: 'ws-diag', name: 'Crossing paths', points: [[0.05, 0.05], [0.5, 0.5], [0.95, 0.95]] },
      { id: 'ws-diag2', name: 'Crossing paths', points: [[0.05, 0.95], [0.5, 0.5], [0.95, 0.05]] },
    ],
    pois: [
      { id: 'ws-lawn', name: 'Central lawn', type: 'nature', uv: [0.5, 0.55], description: 'The sunbathing lawn framed by the twin spires of Saints Peter & Paul church.' },
      { id: 'franklin-statue', name: 'Ben Franklin statue', type: 'landmark', uv: [0.5, 0.3], description: '1879 statue with a time capsule beneath — and a history of mysteriously dry drinking taps.' },
      { id: 'tai-chi', name: 'Morning tai chi corner', type: 'amenity', uv: [0.2, 0.75], description: 'Dawn tai chi and sword practice, a North Beach–Chinatown tradition.' },
    ],
  },
  {
    id: 'portsmouth-square',
    name: 'Portsmouth Square',
    description:
      'Chinatown’s living room and the city’s birthplace — the plaza where the flag was raised in 1846, now alive with cards, chess and morning exercise.',
    size: '1.3 acres',
    area: 'Chinatown',
    tags: ['history', 'family'],
    latLng: [37.7946, -122.4054],
    bbox: { lng0: -122.4063, lat0: 37.7938, lng1: -122.4044, lat1: 37.7953 },
    boundary: [[0, 0], [1, 0], [1, 1], [0, 1]],
    features: [],
    paths: [
      { id: 'ps-terrace', name: 'Terrace walk', points: [[0.1, 0.3], [0.5, 0.4], [0.9, 0.3]] },
    ],
    pois: [
      { id: 'flag-monument', name: 'First flag monument', type: 'landmark', uv: [0.65, 0.6], description: 'Marks where Captain Montgomery raised the US flag over Yerba Buena village in 1846.' },
      { id: 'goddess-democracy', name: 'Goddess of Democracy', type: 'landmark', uv: [0.35, 0.7], description: 'Bronze replica of the statue raised in Tiananmen Square in 1989.' },
      { id: 'game-tables', name: 'Card & chess tables', type: 'amenity', uv: [0.5, 0.25], description: 'The liveliest game tables in the city, going strong from dawn.' },
    ],
  },
  {
    id: 'yerba-buena-gardens',
    name: 'Yerba Buena Gardens',
    description:
      'Downtown’s rooftop oasis — sculpture gardens and a waterfall memorial to Dr. King, ringed by SFMOMA, the Metreon and the convention center.',
    size: '5.5 acres',
    area: 'SoMa',
    tags: ['gardens', 'museums', 'family', 'events'],
    latLng: [37.785, -122.4025],
    bbox: { lng0: -122.4046, lat0: 37.7839, lng1: -122.4004, lat1: 37.786 },
    boundary: [[0, 0], [1, 0], [1, 1], [0, 1]],
    features: [
      { id: 'esplanade-lawn', type: 'meadow', points: [[0.15, 0.45], [0.6, 0.45], [0.6, 0.85], [0.15, 0.85]] },
    ],
    paths: [
      { id: 'yb-walk', name: 'Garden walk', points: [[0.05, 0.5], [0.35, 0.65], [0.7, 0.6], [0.95, 0.5]] },
    ],
    pois: [
      { id: 'mlk-waterfall', name: 'MLK Memorial Waterfall', type: 'landmark', uv: [0.4, 0.25], description: 'A 50-ft sheet of falling water you can walk behind, etched with Dr. King’s words.' },
      { id: 'esplanade', name: 'Esplanade lawn', type: 'nature', uv: [0.35, 0.65], description: 'Downtown’s lunch lawn, with free summer festival performances.' },
      { id: 'carousel', name: 'LeRoy King Carousel', type: 'playground', uv: [0.8, 0.3], description: 'A hand-carved 1906 carousel spinning in a glass pavilion by the children’s museum.' },
    ],
  },
  {
    id: 'salesforce-park',
    name: 'Salesforce Park',
    description:
      'A 4-block botanical garden floating 70 feet above downtown on the transit center roof — 600 trees, a gondola up, and free fitness classes.',
    size: '5.4 acres',
    area: 'SoMa / Downtown',
    tags: ['gardens', 'views', 'food'],
    latLng: [37.7898, -122.3962],
    bbox: { lng0: -122.3996, lat0: 37.7891, lng1: -122.3927, lat1: 37.7906 },
    boundary: [[0, 0.1], [1, 0], [1, 0.9], [0, 1]],
    features: [],
    paths: [
      { id: 'sp-loop', name: 'Rooftop loop', points: [[0.05, 0.5], [0.3, 0.3], [0.6, 0.5], [0.9, 0.4], [0.95, 0.6], [0.5, 0.75], [0.1, 0.65]] },
    ],
    pois: [
      { id: 'gondola', name: 'Salesforce gondola', type: 'entrance', uv: [0.12, 0.4], description: 'A tiny free funicular-gondola lifts you from Mission Street up into the gardens.' },
      { id: 'bus-fountain', name: 'Bus Jet Fountain', type: 'landmark', uv: [0.55, 0.5], description: 'A block-long fountain that fires jets in real time as buses pass in the deck below.' },
      { id: 'amphitheater-sp', name: 'Main plaza & amphitheater', type: 'amenity', uv: [0.8, 0.5], description: 'Free yoga, concerts and a view straight up the glassy flank of Salesforce Tower.' },
    ],
  },
  {
    id: 'sutro-heights',
    name: 'Sutro Heights Park',
    description:
      'The clifftop garden estate of Adolph Sutro, scattered with statue replicas and a parapet hanging directly over Ocean Beach — quietly spectacular.',
    size: '18 acres',
    area: 'Outer Richmond',
    tags: ['views', 'history', 'picnic'],
    latLng: [37.7787, -122.5117],
    bbox: { lng0: -122.5147, lat0: 37.7765, lng1: -122.5082, lat1: 37.7805 },
    boundary: [
      [0.1, 0.15], [0.5, 0.05], [0.9, 0.1], [1, 0.45], [0.85, 0.85], [0.45, 1], [0.1, 0.85], [0, 0.5],
    ],
    features: [],
    paths: [
      { id: 'sh-carriage', name: 'Carriage loop', points: [[0.25, 0.3], [0.6, 0.25], [0.8, 0.45], [0.6, 0.7], [0.3, 0.65], [0.25, 0.3]] },
    ],
    pois: [
      { id: 'sh-parapet', name: 'The Parapet', type: 'viewpoint', uv: [0.3, 0.8], description: 'The rampart of Sutro’s old observatory — Ocean Beach stretches 3 miles beneath your feet.' },
      { id: 'lion-gate', name: 'Lion gates', type: 'landmark', uv: [0.85, 0.3], description: 'Stone lions still guard the entrance to the vanished mansion’s grounds.' },
      { id: 'well-keeper', name: 'Statuary & gardens', type: 'nature', uv: [0.55, 0.5], description: 'Surviving statue replicas and cypress lawns from the 1880s estate gardens.' },
    ],
  },
];
