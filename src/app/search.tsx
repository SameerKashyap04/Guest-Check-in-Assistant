import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Input } from '@/components/Input';
import { Search, ChevronLeft, User, Bed } from 'lucide-react-native';
import { useRouter } from 'expo-router';

export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const router = useRouter();

  const mockResults = query.length > 2 ? [
    { id: '1', type: 'guest', title: 'Rahul Sharma', subtitle: 'Room 101 • Checked in' },
    { id: '2', type: 'guest', title: 'Ramesh Singh', subtitle: 'Room 205 • Pending' },
    { id: '3', type: 'room', title: 'Room 101', subtitle: 'Occupied by Rahul Sharma' },
  ] : [];

  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-background">
      <View className="flex-row items-center px-4 pt-4 pb-2 border-b border-transparent dark:border-transparent">
        <TouchableOpacity 
          onPress={() => router.back()}
          className="mr-3 p-2 -ml-2 rounded-full active:bg-gray-100 dark:active:bg-gray-800"
        >
          <ChevronLeft size={28} color="#2563EB" />
        </TouchableOpacity>
        
        <View className="flex-1 mt-4">
          <Input 
            placeholder="Search guests, rooms, IDs..." 
            value={query}
            onChangeText={setQuery}
            autoFocus
            icon={<Search size={20} color="#9CA3AF" />}
          />
        </View>
      </View>

      <FlatList
        data={mockResults}
        keyExtractor={(item) => item.id + item.type}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center mt-20">
            <Search size={48} color="#E5E7EB" className="mb-4" />
            <Text className="text-gray-500 font-medium text-center">
              {query.length > 0 
                ? 'No results found. Try a different term.' 
                : 'Start typing to search across the property.'}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity className="flex-row items-center p-4 mb-3 bg-white dark:bg-black/20 rounded-2xl border border-transparent dark:border-transparent">
            <View className="w-12 h-12 rounded-full bg-primary/10 items-center justify-center mr-4">
              {item.type === 'guest' ? <User size={24} color="#2563EB" /> : <Bed size={24} color="#06B6D4" />}
            </View>
            <View>
              <Text className="text-base font-bold text-foreground">{item.title}</Text>
              <Text className="text-sm text-gray-500 mt-1">{item.subtitle}</Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}
