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

  // 2. 2-Opt Optimization to remove cross-overs
  let improvement = true;
  while (improvement) {
    improvement = false;
    for (let i = 0; i < route.length - 1; i++) {
      for (let k = i + 1; k < route.length; k++) {
        const newRoute = twoOptSwap(route, i, k);
        const currentDist = calculateTotalDistance(startLocation, route, returnToStart);
        const newDist = calculateTotalDistance(startLocation, newRoute, returnToStart);
        
        if (newDist < currentDist) {
          route = newRoute;
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

function calculateTotalDistance(startLocation: Coordinates, route: Place[], returnToStart: boolean): number {
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
