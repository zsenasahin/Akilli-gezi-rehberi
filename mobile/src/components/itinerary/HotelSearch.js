import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { searchLocation, GeocodeResult } from '../../services/geocoding';
import { COLORS } from '../../constants/colors';

export default function HotelSearch({ onSelectLocation }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (query.trim().length < 3) return;
    setLoading(true);
    const data = await searchLocation(query);
    setResults(data);
    setLoading(false);
  };

  const handleSelect = (item) => {
    setQuery(item.name);
    setResults([]);
    if (onSelectLocation) {
      onSelectLocation(item);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Kendi Otelinizi veya Konumunuzu Arayın</Text>
      
      <View style={styles.searchBox}>
        <Ionicons name="search" size={20} color={COLORS.textLight} style={styles.icon} />
        <TextInput
          style={styles.input}
          placeholder="Örn: Hilton Taksim, İstanbul"
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
        {loading && <ActivityIndicator size="small" color={COLORS.primary} style={styles.icon} />}
      </View>

      {results.length > 0 && (
        <View style={styles.resultsContainer}>
          <FlatList
            data={results}
            keyExtractor={(_, index) => index.toString()}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.resultItem} onPress={() => handleSelect(item)}>
                <Ionicons name="location-outline" size={20} color={COLORS.primary} />
                <View style={styles.resultTextContainer}>
                  <Text style={styles.resultName}>{item.name}</Text>
                  <Text style={styles.resultAddress} numberOfLines={1}>{item.address}</Text>
                </View>
              </TouchableOpacity>
            )}
            nestedScrollEnabled={true}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 15,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 50,
  },
  icon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  resultsContainer: {
    marginTop: 8,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    maxHeight: 200,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  resultTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  resultName: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  resultAddress: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 2,
  },
});
