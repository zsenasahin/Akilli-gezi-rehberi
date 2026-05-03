const BADGE_DEFINITIONS = [
    {
        key: 'first_completed',
        label: 'Ilk Adim',
        description: 'Ilk sehir planini tamamla',
        icon: 'flag',
        color: '#D97706',
        ring: '#FDE7C4',
        check: (stats) => stats.completedPlans >= 1,
    },
    {
        key: 'city_3',
        label: '3 Sehir',
        description: '3 farkli sehri tamamla',
        icon: 'location',
        color: '#0F766E',
        ring: '#D6F5F1',
        check: (stats) => stats.completedCities >= 3,
    },
    {
        key: 'city_5',
        label: '5 Sehir',
        description: '5 farkli sehri tamamla',
        icon: 'earth',
        color: '#2563EB',
        ring: '#DCEBFF',
        check: (stats) => stats.completedCities >= 5,
    },
    {
        key: 'city_10',
        label: '10 Sehir',
        description: '10 farkli sehri tamamla',
        icon: 'compass',
        color: '#7C3AED',
        ring: '#EBDDFF',
        check: (stats) => stats.completedCities >= 10,
    },
    {
        key: 'city_20',
        label: '20 Sehir',
        description: '20 farkli sehri tamamla',
        icon: 'trail-sign',
        color: '#DB2777',
        ring: '#FFDCEF',
        check: (stats) => stats.completedCities >= 20,
    },
    {
        key: 'city_50',
        label: '50 Sehir',
        description: '50 farkli sehri tamamla',
        icon: 'map',
        color: '#CA8A04',
        ring: '#FEF3C7',
        check: (stats) => stats.completedCities >= 50,
    },
    {
        key: 'city_81',
        label: '81 Sehir',
        description: 'Tum Turkiye hedefini tamamla',
        icon: 'trophy',
        color: '#B45309',
        ring: '#FDE68A',
        check: (stats) => stats.completedCities >= 81,
    },
    {
        key: 'km_100',
        label: '100 KM',
        description: 'Toplam 100 km rota tamamla',
        icon: 'speedometer',
        color: '#0891B2',
        ring: '#D5F5FF',
        check: (stats) => stats.totalCompletedDistance >= 100,
    },
    {
        key: 'km_1000',
        label: '1000 KM',
        description: 'Toplam 1000 km rota tamamla',
        icon: 'rocket',
        color: '#4F46E5',
        ring: '#E2E0FF',
        check: (stats) => stats.totalCompletedDistance >= 1000,
    },
    {
        key: 'km_10000',
        label: '10000 KM',
        description: 'Toplam 10000 km rota tamamla',
        icon: 'planet',
        color: '#BE185D',
        ring: '#FFD7EA',
        check: (stats) => stats.totalCompletedDistance >= 10000,
    },
];

const sumItineraryDistance = (itinerary) => {
    const plan = itinerary?.plan;
    if (!Array.isArray(plan)) return 0;
    return plan.reduce((sum, day) => sum + Number(day?.totalDistance || 0), 0);
};

export const buildTravelStats = (itineraries = []) => {
    const completedItineraries = itineraries.filter((item) => item.status === 'completed');
    const completedCities = new Set(
        completedItineraries
            .map((item) => item?.cities?.name)
            .filter(Boolean)
    );

    const totalCompletedDistance = completedItineraries.reduce(
        (sum, item) => sum + sumItineraryDistance(item),
        0
    );

    return {
        completedPlans: completedItineraries.length,
        completedCities: completedCities.size,
        totalCompletedDistance: Math.round(totalCompletedDistance),
    };
};

export const buildBadges = (itineraries = []) => {
    const stats = buildTravelStats(itineraries);
    const badges = BADGE_DEFINITIONS.map((badge) => ({
        ...badge,
        earned: badge.check(stats),
    }));
    return { badges, stats };
};
