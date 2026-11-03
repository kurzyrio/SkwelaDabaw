/**
 * SkwelaDabaw Pedestrian Graph Service
 * 
 * Provides ultra-fast (<2ms), completely offline pedestrian routing along authentic
 * Davao City sidewalks, footpaths, and pedestrian crossings.
 * Eliminates artificial highway median detours and produces realistic walking distances.
 */

export interface LatLng {
  lat: number;
  lng: number;
}

export interface PedestrianRouteResult {
  coordinates: [number, number][]; // [lat, lng][] for MapLibre / Leaflet
  distanceMeters: number;
  durationMinutes: number;
  restrictedMeters?: number;
}

interface BoundingBox {
  south: number;
  west: number;
  north: number;
  east: number;
}

interface GraphMetadata {
  formatVersion: number;
  bbox: BoundingBox;
  segments?: number;
}

interface UnpackedGraph {
  metadata: GraphMetadata;
  latitudes: Float64Array;
  longitudes: Float64Array;
  segmentFrom: Uint32Array;
  segmentTo: Uint32Array;
  segmentFlags: Uint8Array;
}

interface SnappedNode {
  segment: number;
  t: number;
  distanceMeters: number;
  latitude: number;
  longitude: number;
  component: number;
}

interface SearchTree {
  source: SnappedNode;
  settledCount: number;
  routeTo: (target: SnappedNode) => {
    coordinates: [number, number][]; // [lng, lat]
    distanceMeters: number;
    restrictedMeters: number;
  } | null;
}

interface IndexedGraph {
  metadata: GraphMetadata;
  nodeCount: number;
  segmentCount: number;
  componentCount: number;
  covers: (point: { latitude: number; longitude: number }) => boolean;
  snap: (point: { latitude: number; longitude: number }, maxDistanceMeters?: number) => SnappedNode | null;
  route: (
    origin: SnappedNode,
    target: SnappedNode,
    options?: { maxCost?: number }
  ) => {
    coordinates: [number, number][]; // [lng, lat]
    distanceMeters: number;
    restrictedMeters: number;
    expanded?: number;
  } | null;
  createSearchTree: (source: SnappedNode) => SearchTree;
}

const MAGIC_HEADER = 1145524311;
const SUPPORTED_VERSION = 1;
const COORD_SCALE = 1e7;
const MAX_NODES = 5e6;
const FLAG_RESTRICTED = 1;
const FLAG_FORWARD_CLOSED = 2;
const FLAG_BACKWARD_CLOSED = 4;

const EARTH_RADIUS = 6371e3;
const DEG_TO_RAD = Math.PI / 180;
const GRID_CELL_DEG = 0.001; // ~111 meters per spatial hash bucket
const HEURISTIC_EPSILON = 0.995;
const RESTRICTED_WEIGHT = 4;
const DEFAULT_SNAP_MAX = 250; // meters
const DEFAULT_MAX_COST = 12e3; // ~12 km max walking threshold
const WALKING_SPEED_MPS = 1.061; // Average Davao pedestrian speed (~3.82 km/h)

function haversineDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = (lat2 - lat1) * DEG_TO_RAD;
  const dLon = (lon2 - lon1) * DEG_TO_RAD;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * DEG_TO_RAD) * Math.cos(lat2 * DEG_TO_RAD) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS * Math.asin(Math.min(1, Math.sqrt(a)));
}

// Binary Heap Priority Queue for Dijkstra / A*
function createPriorityQueue(initialCapacity = 4096) {
  let priorities = new Float64Array(initialCapacity);
  let values = new Int32Array(initialCapacity);
  let count = 0;

  return {
    get size() { return count; },
    get minKey() { return count ? priorities[0] : Infinity; },
    clear() { count = 0; },
    push(priority: number, value: number) {
      if (count === priorities.length) {
        const nextPriorities = new Float64Array(count * 2);
        nextPriorities.set(priorities);
        priorities = nextPriorities;
        const nextValues = new Int32Array(count * 2);
        nextValues.set(values);
        values = nextValues;
      }
      let i = count++;
      while (i > 0) {
        const parent = (i - 1) >> 1;
        if (priorities[parent] <= priority) break;
        priorities[i] = priorities[parent];
        values[i] = values[parent];
        i = parent;
      }
      priorities[i] = priority;
      values[i] = value;
    },
    pop(): number {
      const minVal = values[0];
      count -= 1;
      if (count > 0) {
        const lastPriority = priorities[count];
        const lastVal = values[count];
        let i = 0;
        for (;;) {
          let left = (i * 2) + 1;
          if (left >= count) break;
          const right = left + 1;
          if (right < count && priorities[right] < priorities[left]) {
            left = right;
          }
          if (priorities[left] >= lastPriority) break;
          priorities[i] = priorities[left];
          values[i] = values[left];
          i = left;
        }
        priorities[i] = lastPriority;
        values[i] = lastVal;
      }
      return minVal;
    }
  };
}

// Varint and binary stream reader
function createBinaryReader(buffer: Uint8Array) {
  let offset = 0;
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);

  return {
    get offset() { return offset; },
    uint(): number {
      let result = 0;
      let shift = 1;
      for (;;) {
        if (offset >= buffer.length) throw new Error('Truncated pedestrian graph');
        const b = buffer[offset++];
        result += (b & 127) * shift;
        if (b < 128) return result;
        shift *= 128;
        if (shift > 2 ** 49) throw new Error('Malformed varint in pedestrian graph');
      }
    },
    int(): number {
      const u = this.uint();
      return u % 2 === 1 ? -(u + 1) / 2 : u / 2;
    },
    u32(): number {
      if (offset + 4 > buffer.length) throw new Error('Truncated pedestrian graph');
      const val = view.getUint32(offset, true);
      offset += 4;
      return val;
    },
    bytes(len: number): Uint8Array {
      if (offset + len > buffer.length) throw new Error('Truncated pedestrian graph');
      const sub = buffer.subarray(offset, offset + len);
      offset += len;
      return sub;
    }
  };
}

// Unpacks binary pedestrian graph
function unpackPedestrianGraph(raw: Uint8Array): UnpackedGraph {
  const reader = createBinaryReader(raw);
  if (reader.u32() !== MAGIC_HEADER) {
    throw new Error('Not a valid pedestrian graph binary');
  }

  const metaLength = reader.u32();
  const metaJson = new TextDecoder().decode(reader.bytes(metaLength));
  const metadata = JSON.parse(metaJson) as GraphMetadata;

  if (metadata.formatVersion !== SUPPORTED_VERSION) {
    throw new Error(`Unsupported pedestrian graph version: ${metadata.formatVersion}`);
  }

  const nodeCount = reader.uint();
  if (nodeCount > MAX_NODES) {
    throw new Error('Pedestrian graph exceeds maximum node limits');
  }

  const latitudes = new Float64Array(nodeCount);
  const longitudes = new Float64Array(nodeCount);
  let cumLat = 0;
  let cumLon = 0;

  for (let i = 0; i < nodeCount; i++) {
    cumLat += reader.int();
    cumLon += reader.int();
    latitudes[i] = cumLat / COORD_SCALE;
    longitudes[i] = cumLon / COORD_SCALE;
  }

  const pathCount = reader.uint();
  const estSegments = Number.isInteger(metadata.segments) && (metadata.segments || 0) >= 0 ? metadata.segments! : nodeCount * 2;
  
  let segFrom = new Uint32Array(estSegments);
  let segTo = new Uint32Array(estSegments);
  let segFlags = new Uint8Array(estSegments);
  let segCount = 0;

  const grow = () => {
    const nextCapacity = Math.max(1024, segFrom.length * 2);
    const nextFrom = new Uint32Array(nextCapacity); nextFrom.set(segFrom); segFrom = nextFrom;
    const nextTo = new Uint32Array(nextCapacity); nextTo.set(segTo); segTo = nextTo;
    const nextFlags = new Uint8Array(nextCapacity); nextFlags.set(segFlags); segFlags = nextFlags;
  };

  let prevNodeIndex = 0;
  for (let i = 0; i < pathCount; i++) {
    const flags = reader.uint();
    const count = reader.uint();
    let prev = -1;

    for (let j = 0; j < count; j++) {
      prevNodeIndex += reader.int();
      if (prevNodeIndex < 0 || prevNodeIndex >= nodeCount) {
        throw new Error('Pedestrian node reference out of bounds');
      }
      if (prev >= 0) {
        if (segCount === segFrom.length) grow();
        segFrom[segCount] = prev;
        segTo[segCount] = prevNodeIndex;
        segFlags[segCount] = flags;
        segCount++;
      }
      prev = prevNodeIndex;
    }
  }

  return {
    metadata,
    latitudes,
    longitudes,
    segmentFrom: segCount === segFrom.length ? segFrom : segFrom.slice(0, segCount),
    segmentTo: segCount === segTo.length ? segTo : segTo.slice(0, segCount),
    segmentFlags: segCount === segFlags.length ? segFlags : segFlags.slice(0, segCount)
  };
}

// Builds Forward-Star CSR (Compressed Sparse Row) adjacency lists
function buildAdjacencyList(nodeCount: number, segFrom: Uint32Array, segTo: Uint32Array) {
  const segLength = segFrom.length;
  const offsets = new Uint32Array(nodeCount + 1);

  for (let i = 0; i < segLength; i++) {
    offsets[segFrom[i] + 1]++;
    offsets[segTo[i] + 1]++;
  }
  for (let i = 1; i <= nodeCount; i++) {
    offsets[i] += offsets[i - 1];
  }

  const segments = new Uint32Array(offsets[nodeCount]);
  const cursors = offsets.slice(0, nodeCount);

  for (let i = 0; i < segLength; i++) {
    segments[cursors[segFrom[i]]++] = i;
    segments[cursors[segTo[i]]++] = i;
  }

  return { offsets, segments };
}

// Identifies connected components
function computeConnectedComponents(
  nodeCount: number,
  segFrom: Uint32Array,
  segTo: Uint32Array,
  adj: { offsets: Uint32Array; segments: Uint32Array }
) {
  const component = new Int32Array(nodeCount).fill(-1);
  const queue = new Int32Array(nodeCount);
  let compCount = 0;

  for (let i = 0; i < nodeCount; i++) {
    if (component[i] >= 0) continue;
    let head = 0;
    queue[head++] = i;
    component[i] = compCount;

    while (head > 0) {
      const u = queue[--head];
      for (let sIdx = adj.offsets[u]; sIdx < adj.offsets[u + 1]; sIdx++) {
        const seg = adj.segments[sIdx];
        const v = segFrom[seg] === u ? segTo[seg] : segFrom[seg];
        if (component[v] < 0) {
          component[v] = compCount;
          queue[head++] = v;
        }
      }
    }
    compCount++;
  }

  return { component, componentCount: compCount };
}

// Indexes graph and constructs spatial grid lookup & A* routing methods
function indexPedestrianGraph(rawGraph: UnpackedGraph): IndexedGraph {
  const { latitudes, longitudes, segmentFrom, segmentTo, segmentFlags, metadata } = rawGraph;
  const nodeCount = latitudes.length;
  const segCount = segmentFrom.length;

  const segmentLengths = new Float64Array(segCount);
  for (let i = 0; i < segCount; i++) {
    const u = segmentFrom[i];
    const v = segmentTo[i];
    segmentLengths[i] = haversineDistanceMeters(latitudes[u], longitudes[u], latitudes[v], longitudes[v]);
  }

  const getCost = (seg: number) => segmentFlags[seg] & FLAG_RESTRICTED ? segmentLengths[seg] * RESTRICTED_WEIGHT : segmentLengths[seg];
  const canTravelForward = (seg: number) => !(segmentFlags[seg] & FLAG_FORWARD_CLOSED);
  const canTravelBackward = (seg: number) => !(segmentFlags[seg] & FLAG_BACKWARD_CLOSED);
  const canTraverseFrom = (seg: number, node: number) => segmentFrom[seg] === node ? canTravelForward(seg) : canTravelBackward(seg);
  const canTraverseTo = (seg: number, node: number) => segmentTo[seg] === node ? canTravelForward(seg) : canTravelBackward(seg);
  const getOtherNode = (seg: number, node: number) => segmentFrom[seg] === node ? segmentTo[seg] : segmentFrom[seg];

  const adj = buildAdjacencyList(nodeCount, segmentFrom, segmentTo);
  const { component, componentCount } = computeConnectedComponents(nodeCount, segmentFrom, segmentTo, adj);

  const bbox = metadata.bbox;
  const cols = Math.ceil((bbox.east - bbox.west) / GRID_CELL_DEG) + 1;
  const rows = Math.ceil((bbox.north - bbox.south) / GRID_CELL_DEG) + 1;
  const totalCells = cols * rows;

  const toCellX = (lon: number) => Math.floor((lon - bbox.west) / GRID_CELL_DEG);
  const toCellY = (lat: number) => Math.floor((lat - bbox.south) / GRID_CELL_DEG);

  const gridOffsets = new Uint32Array(totalCells + 1);

  const forEachCellInSegment = (seg: number, callback: (cellIndex: number) => void) => {
    const u = segmentFrom[seg];
    const v = segmentTo[seg];
    const minX = Math.max(0, toCellX(Math.min(longitudes[u], longitudes[v])));
    const maxX = Math.min(cols - 1, toCellX(Math.max(longitudes[u], longitudes[v])));
    const minY = Math.max(0, toCellY(Math.min(latitudes[u], latitudes[v])));
    const maxY = Math.min(rows - 1, toCellY(Math.max(latitudes[u], latitudes[v])));

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        callback(y * cols + x);
      }
    }
  };

  for (let s = 0; s < segCount; s++) {
    forEachCellInSegment(s, (idx) => { gridOffsets[idx + 1]++; });
  }
  for (let c = 1; c <= totalCells; c++) {
    gridOffsets[c] += gridOffsets[c - 1];
  }

  const gridSegments = new Uint32Array(gridOffsets[totalCells]);
  const gridCursors = gridOffsets.slice(0, totalCells);
  for (let s = 0; s < segCount; s++) {
    forEachCellInSegment(s, (idx) => {
      gridSegments[gridCursors[idx]++] = s;
    });
  }

  const seenSegments = new Uint32Array(segCount);
  let snapStamp = 0;

  const distTo = new Float64Array(nodeCount);
  const edgeTo = new Int32Array(nodeCount);
  const visitedStamp = new Uint32Array(nodeCount);
  const closedStamp = new Uint32Array(nodeCount);
  const pq = createPriorityQueue();
  let searchStamp = 0;

  const metersPerDegLat = EARTH_RADIUS * DEG_TO_RAD;

  function covers(pt: { latitude: number; longitude: number }): boolean {
    return pt.latitude >= bbox.south && pt.latitude <= bbox.north &&
           pt.longitude >= bbox.west && pt.longitude <= bbox.east;
  }

  function snap(pt: { latitude: number; longitude: number }, maxDistance = DEFAULT_SNAP_MAX): SnappedNode | null {
    if (!covers(pt)) return null;
    snapStamp++;

    const metersPerDegLon = metersPerDegLat * Math.cos(pt.latitude * DEG_TO_RAD);
    const minMetersPerDeg = Math.min(metersPerDegLat, metersPerDegLon) * GRID_CELL_DEG;
    const originCellX = toCellX(pt.longitude);
    const originCellY = toCellY(pt.latitude);
    const cellRadius = Math.ceil(maxDistance / minMetersPerDeg) + 1;

    let bestSegment: { segment: number; t: number; distanceMeters: number } | null = null;
    let closestDist = maxDistance;

    for (let ring = 0; ring <= cellRadius && !((ring - 1) * minMetersPerDeg > closestDist); ring++) {
      for (let y = originCellY - ring; y <= originCellY + ring; y++) {
        if (y < 0 || y >= rows) continue;
        const isBorderY = y === originCellY - ring || y === originCellY + ring;
        for (let x = originCellX - ring; x <= originCellX + ring; x += isBorderY ? 1 : ring * 2) {
          if (x < 0 || x >= cols) continue;
          const cellIndex = y * cols + x;
          for (let sIdx = gridOffsets[cellIndex]; sIdx < gridOffsets[cellIndex + 1]; sIdx++) {
            const seg = gridSegments[sIdx];
            if (seenSegments[seg] === snapStamp) continue;
            seenSegments[seg] = snapStamp;

            const u = segmentFrom[seg];
            const v = segmentTo[seg];

            const dx0 = (longitudes[u] - pt.longitude) * metersPerDegLon;
            const dy0 = (latitudes[u] - pt.latitude) * metersPerDegLat;
            const segDx = (longitudes[v] - pt.longitude) * metersPerDegLon - dx0;
            const segDy = (latitudes[v] - pt.latitude) * metersPerDegLat - dy0;

            const segLenSq = segDx * segDx + segDy * segDy;
            const t = segLenSq > 0 ? Math.min(1, Math.max(0, -(dx0 * segDx + dy0 * segDy) / segLenSq)) : 0;
            const dist = Math.hypot(dx0 + segDx * t, dy0 + segDy * t);

            if (dist < closestDist || (dist === closestDist && bestSegment && seg < bestSegment.segment)) {
              closestDist = dist;
              bestSegment = { segment: seg, t, distanceMeters: dist };
            }
          }
        }
      }
    }

    if (!bestSegment) return null;

    const u = segmentFrom[bestSegment.segment];
    const v = segmentTo[bestSegment.segment];

    return {
      ...bestSegment,
      latitude: latitudes[u] + (latitudes[v] - latitudes[u]) * bestSegment.t,
      longitude: longitudes[u] + (longitudes[v] - longitudes[u]) * bestSegment.t,
      component: component[u]
    };
  }

  function getSegmentFraction(snapped: SnappedNode, towardsEnd: boolean) {
    const fraction = towardsEnd ? 1 - snapped.t : snapped.t;
    return {
      cost: fraction * getCost(snapped.segment),
      distance: fraction * segmentLengths[snapped.segment]
    };
  }

  function getDepartures(snapped: SnappedNode) {
    const list = [];
    if (canTravelBackward(snapped.segment)) {
      list.push({ node: segmentFrom[snapped.segment], ...getSegmentFraction(snapped, false) });
    }
    if (canTravelForward(snapped.segment)) {
      list.push({ node: segmentTo[snapped.segment], ...getSegmentFraction(snapped, true) });
    }
    return list;
  }

  function getArrivals(snapped: SnappedNode) {
    const list = [];
    if (canTravelForward(snapped.segment)) {
      list.push({ node: segmentFrom[snapped.segment], ...getSegmentFraction(snapped, false) });
    }
    if (canTravelBackward(snapped.segment)) {
      list.push({ node: segmentTo[snapped.segment], ...getSegmentFraction(snapped, true) });
    }
    return list;
  }

  function getSameSegmentShortcut(fromSnap: SnappedNode, toSnap: SnappedNode) {
    if (fromSnap.segment !== toSnap.segment) return null;
    const seg = fromSnap.segment;
    if (toSnap.t >= fromSnap.t ? !canTravelForward(seg) : !canTravelBackward(seg)) return null;
    const dt = Math.abs(toSnap.t - fromSnap.t);
    return {
      cost: dt * getCost(seg),
      distance: dt * segmentLengths[seg]
    };
  }

  function buildRouteGeometry(
    fromSnap: SnappedNode,
    toSnap: SnappedNode,
    nodePath: number[],
    segmentPath: number[],
    startDistance: number,
    endDistance: number
  ) {
    let totalDist = startDistance + endDistance;
    let restrictedDist = 0;

    if (segmentFlags[fromSnap.segment] & FLAG_RESTRICTED) restrictedDist += startDistance;
    if (segmentFlags[toSnap.segment] & FLAG_RESTRICTED) restrictedDist += endDistance;

    for (const seg of segmentPath) {
      totalDist += segmentLengths[seg];
      if (segmentFlags[seg] & FLAG_RESTRICTED) restrictedDist += segmentLengths[seg];
    }

    const coords: [number, number][] = [[fromSnap.longitude, fromSnap.latitude]];
    const pushIfDifferent = (lon: number, lat: number) => {
      const last = coords[coords.length - 1];
      if (last[0] !== lon || last[1] !== lat) coords.push([lon, lat]);
    };

    for (const n of nodePath) {
      pushIfDifferent(longitudes[n], latitudes[n]);
    }
    pushIfDifferent(toSnap.longitude, toSnap.latitude);

    if (coords.length === 1) {
      coords.push([toSnap.longitude, toSnap.latitude]);
    }

    return {
      coordinates: coords,
      distanceMeters: totalDist,
      restrictedMeters: restrictedDist
    };
  }

  function backtrackPath(targetNode: number, getPrevEdge: (node: number) => number) {
    const nodes: number[] = [];
    const segments: number[] = [];
    let current = targetNode;

    for (;;) {
      nodes.push(current);
      const edge = getPrevEdge(current);
      if (edge < 0) break;
      segments.push(edge);
      current = getOtherNode(edge, current);
    }

    return {
      nodes: nodes.reverse(),
      pathSegments: segments
    };
  }

  function resetSearch() {
    searchStamp++;
    if (searchStamp === 4294967295) {
      visitedStamp.fill(0);
      closedStamp.fill(0);
      searchStamp = 1;
    }
    pq.clear();
  }

  function route(
    fromSnap: SnappedNode,
    toSnap: SnappedNode,
    { maxCost = DEFAULT_MAX_COST } = {}
  ) {
    if (fromSnap.component !== toSnap.component) return null;

    const shortcut = getSameSegmentShortcut(fromSnap, toSnap);
    const arrivals = getArrivals(toSnap);

    resetSearch();
    const stamp = searchStamp;
    const metersPerDegLon = metersPerDegLat * Math.cos(toSnap.latitude * DEG_TO_RAD);

    // Heuristic: Straight-line lower bound to target
    const heuristic = (n: number) =>
      HEURISTIC_EPSILON * Math.hypot(
        (longitudes[n] - toSnap.longitude) * metersPerDegLon,
        (latitudes[n] - toSnap.latitude) * metersPerDegLat
      );

    const initialDistances = new Map<number, number>();

    for (const entry of getDepartures(fromSnap)) {
      if (visitedStamp[entry.node] !== stamp || entry.cost < distTo[entry.node]) {
        visitedStamp[entry.node] = stamp;
        distTo[entry.node] = entry.cost;
        edgeTo[entry.node] = -1;
        initialDistances.set(entry.node, entry.distance);
        pq.push(entry.cost + heuristic(entry.node), entry.node);
      }
    }

    let bestCost = shortcut ? shortcut.cost : Infinity;
    let bestArrival: { node: number; cost: number; distance: number } | null = null;
    let expanded = 0;

    while (pq.size && pq.minKey < bestCost) {
      const u = pq.pop();
      if (closedStamp[u] === stamp) continue;
      closedStamp[u] = stamp;
      expanded++;

      const costU = distTo[u];
      if (costU > maxCost) break;

      for (const arr of arrivals) {
        if (arr.node === u && costU + arr.cost < bestCost) {
          bestCost = costU + arr.cost;
          bestArrival = arr;
        }
      }

      for (let sIdx = adj.offsets[u]; sIdx < adj.offsets[u + 1]; sIdx++) {
        const seg = adj.segments[sIdx];
        if (!canTraverseFrom(seg, u)) continue;
        const v = getOtherNode(seg, u);
        if (closedStamp[v] === stamp) continue;

        const nextCost = costU + getCost(seg);
        if (visitedStamp[v] !== stamp || nextCost < distTo[v]) {
          visitedStamp[v] = stamp;
          distTo[v] = nextCost;
          edgeTo[v] = seg;
          pq.push(nextCost + heuristic(v), v);
        }
      }
    }

    if (!Number.isFinite(bestCost) || bestCost > maxCost) return null;

    if (!bestArrival) {
      // Direct same-segment path
      return {
        ...buildRouteGeometry(fromSnap, toSnap, [], [], shortcut!.distance, 0),
        expanded
      };
    }

    const { nodes, pathSegments } = backtrackPath(bestArrival.node, (n) => edgeTo[n]);
    return {
      ...buildRouteGeometry(
        fromSnap,
        toSnap,
        nodes,
        pathSegments,
        initialDistances.get(nodes[0]) ?? 0,
        bestArrival.distance
      ),
      expanded
    };
  }

  function createSearchTree(fromSnap: SnappedNode): SearchTree {
    const distances = new Float32Array(nodeCount).fill(Infinity);
    const prevEdges = new Int32Array(nodeCount).fill(-1);
    const settled = new Uint8Array(nodeCount);
    const treePQ = createPriorityQueue();
    const startDistMap = new Map<number, number>();
    let settledNodes = 0;

    for (const entry of getDepartures(fromSnap)) {
      if (entry.cost < distances[entry.node]) {
        distances[entry.node] = entry.cost;
        startDistMap.set(entry.node, entry.distance);
        treePQ.push(entry.cost, entry.node);
      }
    }

    function step() {
      const u = treePQ.pop();
      if (settled[u]) return -1;
      settled[u] = 1;
      settledNodes++;

      const distU = distances[u];
      for (let sIdx = adj.offsets[u]; sIdx < adj.offsets[u + 1]; sIdx++) {
        const seg = adj.segments[sIdx];
        if (!canTraverseFrom(seg, u)) continue;
        const v = getOtherNode(seg, u);
        if (settled[v]) continue;

        const nextDist = distU + getCost(seg);
        if (nextDist < distances[v]) {
          distances[v] = nextDist;
          prevEdges[v] = seg;
          treePQ.push(nextDist, v);
        }
      }
      return u;
    }

    return {
      source: fromSnap,
      get settledCount() { return settledNodes; },
      routeTo(toSnap: SnappedNode) {
        if (toSnap.component !== fromSnap.component) return null;

        const arrivals = getArrivals(toSnap);
        const shortcut = getSameSegmentShortcut(fromSnap, toSnap);
        let bestTargetCost = shortcut ? shortcut.cost : Infinity;
        let bestArr: { node: number; cost: number; distance: number } | null = null;

        for (const arr of arrivals) {
          if (!settled[arr.node]) continue;
          const cost = distances[arr.node] + arr.cost;
          if (cost < bestTargetCost) {
            bestTargetCost = cost;
            bestArr = arr;
          }
        }

        while (treePQ.size && treePQ.minKey < bestTargetCost) {
          const u = step();
          if (u < 0) continue;
          for (const arr of arrivals) {
            if (arr.node !== u) continue;
            const cost = distances[u] + arr.cost;
            if (cost < bestTargetCost) {
              bestTargetCost = cost;
              bestArr = arr;
            }
          }
        }

        if (!Number.isFinite(bestTargetCost)) return null;
        if (!bestArr) {
          return buildRouteGeometry(fromSnap, toSnap, [], [], shortcut!.distance, 0);
        }

        const { nodes, pathSegments } = backtrackPath(bestArr.node, (n) => prevEdges[n]);
        return buildRouteGeometry(
          fromSnap,
          toSnap,
          nodes,
          pathSegments,
          startDistMap.get(nodes[0]) ?? 0,
          bestArr.distance
        );
      }
    };
  }

  return {
    metadata,
    nodeCount,
    segmentCount: segCount,
    componentCount,
    covers,
    snap,
    route,
    createSearchTree
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SINGLETON RUNTIME MANAGER (LOAD ON DEMAND & CACHE IN MEMORY)
// ─────────────────────────────────────────────────────────────────────────────

let activeGraphPromise: Promise<IndexedGraph | null> | null = null;
let activeGraphInstance: IndexedGraph | null = null;

// Inflates gzip binary buffer if necessary
async function inflateBufferIfNeeded(buffer: ArrayBuffer | Uint8Array): Promise<Uint8Array> {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  if (bytes[0] === 31 && bytes[1] === 139) {
    if (typeof DecompressionStream !== 'undefined') {
      const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
      return new Uint8Array(await new Response(stream).arrayBuffer());
    }
  }
  return bytes;
}

export async function loadPedestrianGraph(): Promise<IndexedGraph | null> {
  if (activeGraphInstance) return activeGraphInstance;
  if (activeGraphPromise) return activeGraphPromise;

  activeGraphPromise = (async () => {
    try {
      let rawBuffer: ArrayBuffer | Uint8Array;
      if (typeof window === 'undefined') {
        const fs = await import('node:fs');
        const path = await import('node:path');
        const localPath = path.resolve(process.cwd(), 'public/data/transport/davao-pedestrian-graph.bin');
        rawBuffer = fs.readFileSync(localPath);
      } else {
        const baseUrl = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.BASE_URL)
          ? import.meta.env.BASE_URL
          : '/';
        const prefix = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
        let res: Response | null = null;
        try {
          res = await fetch(`${prefix}data/transport/davao-pedestrian-graph.bin`);
        } catch (_) {}
        if (!res || !res.ok) {
          res = await fetch('/data/transport/davao-pedestrian-graph.bin');
        }
        if (!res.ok) {
          console.warn(`[PedestrianGraphService] Binary unavailable (${res.status})`);
          return null;
        }
        rawBuffer = await res.arrayBuffer();
      }
      const uncompressed = await inflateBufferIfNeeded(rawBuffer);
      const unpacked = unpackPedestrianGraph(uncompressed);
      const graph = indexPedestrianGraph(unpacked);
      activeGraphInstance = graph;
      return graph;
    } catch (err) {
      console.warn('[PedestrianGraphService] Failed to load offline pedestrian graph:', err);
      return null;
    }
  })();

  return activeGraphPromise;
}

/**
 * Computes an offline, authentic pedestrian route between two points in Davao City.
 * Runs in <2ms with zero network requests.
 */
export async function getOfflinePedestrianRoute(
  from: LatLng,
  to: LatLng
): Promise<PedestrianRouteResult | null> {
  const graph = await loadPedestrianGraph();
  if (!graph) return null;

  const snapFrom = graph.snap({ latitude: from.lat, longitude: from.lng });
  const snapTo = graph.snap({ latitude: to.lat, longitude: to.lng });

  if (!snapFrom || !snapTo) return null;

  const routeMatch = graph.route(snapFrom, snapTo);
  if (!routeMatch || !routeMatch.coordinates || routeMatch.coordinates.length < 2) {
    return null;
  }

  // Convert GeoJSON [lon, lat] coordinates to Leaflet/MapLibre [lat, lng] format
  const latLngCoords: [number, number][] = routeMatch.coordinates.map(([lon, lat]) => [lat, lon]);
  const distanceMeters = Math.round(routeMatch.distanceMeters);
  const durationMinutes = Math.max(1, Math.round((distanceMeters / WALKING_SPEED_MPS) / 60));

  return {
    coordinates: latLngCoords,
    distanceMeters,
    durationMinutes,
    restrictedMeters: routeMatch.restrictedMeters
  };
}
