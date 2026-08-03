// src/core/clock.ts
var defaultClock = {
  now: () => Date.now()
};
var activeClock = defaultClock;
var clock = {
  now: () => activeClock.now(),
  /** Override the clock for testing */
  setClock: (newClock) => {
    activeClock = newClock;
  },
  /** Restore the default clock */
  restore: () => {
    activeClock = defaultClock;
  }
};

// src/engine/waypoints.ts
var WAYPOINT_PARAMS = {
  similarityThreshold: 0.75,
  defaultWeight: 1,
  crossSectorWeight: 0.5,
  reinforcementBoost: 0.05,
  maxWeight: 1
};
async function createSingleWaypoint(newId, newVector, userId, storage, bestMatchId, bestMatchSimilarity) {
  const now = clock.now();
  let dstId = newId;
  let weight = WAYPOINT_PARAMS.defaultWeight;
  if (bestMatchId && bestMatchSimilarity && bestMatchSimilarity >= WAYPOINT_PARAMS.similarityThreshold) {
    dstId = bestMatchId;
    weight = bestMatchSimilarity;
  }
  const edge = {
    srcId: newId,
    dstId,
    userId,
    weight,
    createdAt: now,
    updatedAt: now
  };
  await storage.insertWaypoint(edge);
  return edge;
}
async function expandViaWaypoints(initialIds, userId, storage, maxExpansions = 10) {
  const expanded = [];
  const visited = /* @__PURE__ */ new Set();
  for (const id of initialIds) {
    expanded.push({ id, weight: 1, path: [id] });
    visited.add(id);
  }
  const queue = [...expanded];
  let expansions = 0;
  while (queue.length > 0 && expansions < maxExpansions) {
    const current = queue.shift();
    const neighbors = await storage.getNeighbors(current.id, userId);
    for (const neighbor of neighbors) {
      if (visited.has(neighbor.dstId)) continue;
      const neighborWeight = Math.min(1, Math.max(0, neighbor.weight || 0));
      const expansionWeight = current.weight * neighborWeight * 0.8;
      if (expansionWeight < 0.1) continue;
      const expandedItem = {
        id: neighbor.dstId,
        weight: expansionWeight,
        path: [...current.path, neighbor.dstId]
      };
      expanded.push(expandedItem);
      visited.add(neighbor.dstId);
      queue.push(expandedItem);
      expansions++;
    }
  }
  return expanded;
}
async function reinforcePath(path, storage, userId) {
  if (path.length < 2) return;
  for (let i = 0; i < path.length - 1; i++) {
    const srcId = path[i];
    const dstId = path[i + 1];
    const neighbors = await storage.getNeighbors(srcId, userId);
    const edge = neighbors.find((n) => n.dstId === dstId);
    if (edge) {
      edge.weight = Math.min(WAYPOINT_PARAMS.maxWeight, edge.weight + WAYPOINT_PARAMS.reinforcementBoost);
      await storage.insertWaypoint(edge);
    }
  }
}
async function reinforceNodeSalience(memory, storage, eta = 0.1) {
  const newSalience = Math.min(1, memory.salience + eta * (1 - memory.salience));
  memory.salience = newSalience;
  memory.lastSeenAt = clock.now();
  await storage.updateMemory(memory);
}

export {
  defaultClock,
  clock,
  WAYPOINT_PARAMS,
  createSingleWaypoint,
  expandViaWaypoints,
  reinforcePath,
  reinforceNodeSalience
};
