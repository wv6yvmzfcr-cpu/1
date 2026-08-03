/**
 * معرض صور أفقي بنقاط ترقيم — يقرأ مصفوفة روابط عامة من Supabase Storage.
 * FlatList مع pagingEnabled = أداء أصلي بدون مكتبات خارجية.
 */
import React, { useState } from 'react';
import { View, FlatList, Image, useWindowDimensions } from 'react-native';

export function ImageCarousel({ images }: { images: string[] }) {
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const data = images.length ? images : [''];

  return (
    <View>
      <FlatList
        data={data}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(uri, i) => uri + i}
        onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
        renderItem={({ item }) =>
          item ? (
            <Image source={{ uri: item }} style={{ width, height: 260 }} resizeMode="cover" />
          ) : (
            <View style={{ width, height: 260 }} className="bg-primary-light" />
          )
        }
      />
      {data.length > 1 && (
        <View className="absolute bottom-3 w-full flex-row justify-center gap-1.5">
          {data.map((_, i) => (
            <View
              key={i}
              className={`h-2 rounded-full ${i === index ? 'w-5 bg-white' : 'w-2 bg-white/50'}`}
            />
          ))}
        </View>
      )}
    </View>
  );
}
