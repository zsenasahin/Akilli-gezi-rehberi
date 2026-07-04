import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { 
  Coordinates, 
  Place, 
  balancePlacesIntoDays, 
  optimizeRoute, 
  generateTimeline 
} from "./algorithms.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  // CORS Preflight Handler
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Safely parse JSON to avoid crashes if body is empty
    let body;
    try {
      body = await req.json();
    } catch (e) {
      throw new Error("Invalid or empty JSON body.");
    }

    const { startLocation, places, totalDays, preferences } = body;

    // Validation
    if (!startLocation || !places || !totalDays) {
      throw new Error('Missing required fields: startLocation, places, totalDays');
    }

    if (!Array.isArray(places) || places.length === 0) {
      throw new Error('Places must be a non-empty array.');
    }

    // Extract preferences with defaults
    const returnToStart = preferences?.returnToHotel ?? false;
    const startTime = preferences?.startTime ?? "09:00";
    const dayEndHour = preferences?.dayEndHour ?? 20;

    console.log(`Generating itinerary for ${places.length} places over ${totalDays} days.`);

    // 1. Cluster the places into days (duration-aware)
    const dayClusters = balancePlacesIntoDays(places, totalDays);

    // 2. Route and schedule each day
    const itinerary = dayClusters.map(cluster => {
      if (cluster.places.length === 0) {
        return { day: cluster.dayIndex, route: [], totalHours: 0, totalDistanceKm: 0, endTime: startTime };
      }

      // Optimize the route for the day (Nearest Neighbor + 2-Opt)
      const optimizedRoute = optimizeRoute(startLocation, cluster.places, returnToStart);
      
      // Generate the time schedule (with closing hour + daily limit)
      const timelineResult = generateTimeline(optimizedRoute, startTime, 15, dayEndHour);

      return {
        day: cluster.dayIndex,
        route: timelineResult.stops,
        overflowPlaces: timelineResult.overflowPlaces,
        totalHours: Math.round((timelineResult.totalDurationMinutes / 60) * 10) / 10,
        totalDistanceKm: Math.round(timelineResult.totalDistanceKm * 10) / 10,
        endTime: timelineResult.endTime,
      };
    });

    return new Response(
      JSON.stringify({ success: true, itinerary }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200 
      },
    );
  } catch (error: unknown) {
    // Professional error handling for strict TypeScript
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Itinerary Generation Error:", errorMessage);

    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400
      }
    );
  }
});
