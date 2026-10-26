import { Coordinates, haversineDistance } from './haversine';
import { Place } from './clustering';

/**
 * Calculates the shortest path traversing all places starting from a specific start location.
 * Uses Nearest Neighbor initialization followed by 2-Opt optimization.
 */
export function optimizeRoute(startLocation: Coordinates, places: Place[], returnToStart: boolean = false): Place[] {
  if (places.length === 0) return [];
  if (places.length === 1) return places;

  // 1. Nearest Neighbor Initialization
  let unvisited = [...places];
  let currentLoc = startLocation;
  let route: Place[] = [];

  while (unvisited.length > 0) {
    let nearestIdx = -1;
    let minDistance = Infinity;

    for (let i = 0; i < unvisited.length; i++) {
      const dist = haversineDistance(currentLoc, unvisited[i]);
      if (dist < minDistance) {
        minDistance = dist;
        nearestIdx = i;
      }
    }

    const nextPlace = unvisited[nearestIdx];
    route.push(nextPlace);
    currentLoc = nextPlace;
    unvisited.splice(nearestIdx, 1);
  }

  // 2. 2-Opt Optimization to remove cross-overs.
  // Yalnızca ters çevrilen parçanın iki ucundaki kenarlar değiştiği için tüm
  // rotayı yeniden ölçmek yerine mesafe farkı (delta) hesaplanır.
  const EPSILON = 1e-9;
  let improvement = true;
  while (improvement) {
    improvement = false;
    for (let i = 0; i < route.length - 1; i++) {
      for (let k = i + 1; k < route.length; k++) {
        const before: Coordinates = i === 0 ? startLocation : route[i - 1];
        const after: Coordinates | null = k + 1 < route.length
          ? route[k + 1]
          : (returnToStart ? startLocation : null);

        const removed = haversineDistance(before, route[i]) + (after ? haversineDistance(route[k], after) : 0);
        const added = haversineDistance(before, route[k]) + (after ? haversineDistance(route[i], after) : 0);

        if (added + EPSILON < removed) {
          route = twoOptSwap(route, i, k);
          improvement = true;
        }
      }
    }
  }

  return route;
}

function twoOptSwap(route: Place[], i: number, k: number): Place[] {
  const newRoute = [...route.slice(0, i)];
  const reversedChunk = [...route.slice(i, k + 1)].reverse();
  newRoute.push(...reversedChunk);
  newRoute.push(...route.slice(k + 1));
  return newRoute;
}

export function calculateTotalDistance(startLocation: Coordinates, route: Place[], returnToStart: boolean): number {
  let total = 0;
  let currentLoc = startLocation;

  for (const place of route) {
    total += haversineDistance(currentLoc, place);
    currentLoc = place;
  }

  if (returnToStart) {
    total += haversineDistance(currentLoc, startLocation);
  }

  return total;
}
