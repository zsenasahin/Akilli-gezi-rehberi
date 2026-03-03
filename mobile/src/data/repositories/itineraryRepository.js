import { supabase } from '../../config/supabase';

/**
 * ItineraryRepository – `itineraries` ve `itinerary_items` CRUD işlemleri.
 * İş mantığı (plan üretimi) bu katmana ait değildir → domain/itineraryGenerator.js
 */

/**
 * Yeni bir itinerary ve item'larını oluşturur (2 adımlı transaction).
 */
export const createItinerary = async ({
    userId,
    cityId,
    days,
    hasAccommodation = false,
    hasTransport = false,
    startLocationLat = null,
    startLocationLng = null,
    items = [],
}) => {
    const { data: itinerary, error: itineraryError } = await supabase
        .from('itineraries')
        .insert([{
            user_id: userId,
            city_id: cityId,
            days,
            status: 'ongoing',
            has_accommodation: hasAccommodation,
            has_transport: hasTransport,
            start_location_lat: startLocationLat,
            start_location_lng: startLocationLng,
        }])
        .select()
        .single();

    if (itineraryError) return { data: null, error: itineraryError };

    if (items.length > 0) {
        const itemsToInsert = items.map((item) => ({
            itinerary_id: itinerary.id,
            place_id: item.place_id,
            day_number: item.day_number,
            order_index: item.order_index,
            is_completed: false,
        }));

        const { error: itemsError } = await supabase
            .from('itinerary_items')
            .insert(itemsToInsert);

        if (itemsError) return { data: itinerary, error: itemsError };
    }

    return { data: itinerary, error: null };
};

export const getItinerariesByUser = async (userId) => {
    const { data, error } = await supabase
        .from('itineraries')
        .select(`
            *,
            cities ( name ),
            itinerary_items ( id )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
    return { data, error };
};

export const getItineraryById = async (itineraryId) => {
    const { data, error } = await supabase
        .from('itineraries')
        .select(`
            id, user_id, city_id, days, status,
            has_accommodation, has_transport,
            start_location_lat, start_location_lng,
            total_budget, plan, created_at,
            cities ( name ),
            itinerary_items (
                id, place_id, day_number, order_index, is_completed,
                places (
                    id, name, short_description, category,
                    image_url, entry_fee, avg_duration,
                    lat, lng, popularity_score
                )
            )
        `)
        .eq('id', itineraryId)
        .single();
    return { data, error };
};

export const updateItineraryStatus = async (itineraryId, status) => {
    const { data, error } = await supabase
        .from('itineraries')
        .update({ status })
        .eq('id', itineraryId)
        .select()
        .single();
    return { data, error };
};

export const deleteItinerary = async (itineraryId) => {
    const { error } = await supabase
        .from('itineraries')
        .delete()
        .eq('id', itineraryId);
    return { error };
};

export const toggleItemCompletion = async (itemId, isCompleted) => {
    const { data, error } = await supabase
        .from('itinerary_items')
        .update({ is_completed: isCompleted })
        .eq('id', itemId)
        .select()
        .single();
    return { data, error };
};

export const addItineraryItem = async (itineraryId, placeId, dayNumber, orderIndex) => {
    const { data, error } = await supabase
        .from('itinerary_items')
        .insert([{
            itinerary_id: itineraryId,
            place_id: placeId,
            day_number: dayNumber,
            order_index: orderIndex,
            is_completed: false,
        }])
        .select()
        .single();
    return { data, error };
};

export const removeItineraryItem = async (itemId) => {
    const { error } = await supabase
        .from('itinerary_items')
        .delete()
        .eq('id', itemId);
    return { error };
};
