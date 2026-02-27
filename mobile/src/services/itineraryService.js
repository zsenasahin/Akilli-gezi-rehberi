import { supabase } from '../config/supabase';

/**
 * Itinerary service – CRUD for `itineraries` and `itinerary_items` tables.
 */

/**
 * Create a new itinerary with its items (places).
 *
 * @param {object} params
 * @param {string} params.userId
 * @param {number} params.cityId
 * @param {number} params.days
 * @param {boolean} params.hasAccommodation
 * @param {boolean} params.hasTransport
 * @param {number|null} params.startLocationLat
 * @param {number|null} params.startLocationLng
 * @param {Array<{ place_id: number, day_number: number, order_index: number }>} params.items
 * @returns {Promise<{ data: object, error: object|null }>}
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
    // Step 1: Insert itinerary header
    const { data: itinerary, error: itineraryError } = await supabase
        .from('itineraries')
        .insert([
            {
                user_id: userId,
                city_id: cityId,
                days,
                status: 'ongoing',
            },
        ])
        .select()
        .single();

    if (itineraryError) return { data: null, error: itineraryError };

    // Step 2: Insert itinerary items
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

/**
 * Fetch all itineraries for a user, with city info and item count.
 * @param {string} userId
 */
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

/**
 * Fetch a single itinerary with all items and place details.
 * @param {number} itineraryId
 */
export const getItineraryById = async (itineraryId) => {
    const { data, error } = await supabase
        .from('itineraries')
        .select(`
            *,
            cities ( name ),
            itinerary_items (
                id,
                place_id,
                day_number,
                order_index,
                is_completed,
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

/**
 * Update the completion status of a single itinerary item.
 * @param {number} itemId
 * @param {boolean} isCompleted
 */
export const toggleItemCompletion = async (itemId, isCompleted) => {
    const { data, error } = await supabase
        .from('itinerary_items')
        .update({ is_completed: isCompleted })
        .eq('id', itemId)
        .select()
        .single();

    return { data, error };
};

/**
 * Remove an item from an itinerary.
 * @param {number} itemId
 */
export const removeItineraryItem = async (itemId) => {
    const { error } = await supabase
        .from('itinerary_items')
        .delete()
        .eq('id', itemId);

    return { error };
};

/**
 * Add a new item to an existing itinerary.
 * @param {number} itineraryId
 * @param {number} placeId
 * @param {number} dayNumber
 * @param {number} orderIndex
 */
export const addItineraryItem = async (itineraryId, placeId, dayNumber, orderIndex) => {
    const { data, error } = await supabase
        .from('itinerary_items')
        .insert([
            {
                itinerary_id: itineraryId,
                place_id: placeId,
                day_number: dayNumber,
                order_index: orderIndex,
                is_completed: false,
            },
        ])
        .select()
        .single();

    return { data, error };
};

/**
 * Update itinerary status (e.g. ongoing → completed).
 * @param {number} itineraryId
 * @param {string} status – 'ongoing' | 'completed'
 */
export const updateItineraryStatus = async (itineraryId, status) => {
    const { data, error } = await supabase
        .from('itineraries')
        .update({ status })
        .eq('id', itineraryId)
        .select()
        .single();

    return { data, error };
};

/**
 * Delete an itinerary and all its items (cascade).
 * @param {number} itineraryId
 */
export const deleteItinerary = async (itineraryId) => {
    const { error } = await supabase
        .from('itineraries')
        .delete()
        .eq('id', itineraryId);

    return { error };
};
