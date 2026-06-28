import { Image, View, Text } from "react-native"

interface AvatarProps {
  initials: string
  size?: number
  variant?: "primary" | "secondary"
  online?: boolean
  imageUrl?: string | null
}

export function Avatar({ initials, size = 44, variant = "secondary", online, imageUrl }: AvatarProps) {
  const bg = variant === "primary" ? "bg-primary" : "bg-secondary"
  const fg = variant === "primary" ? "text-primary-foreground" : "text-secondary-foreground"

  return (
    <View style={{ width: size, height: size }} className="relative">
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          style={{ width: size, height: size, borderRadius: size / 2 }}
          resizeMode="cover"
        />
      ) : (
        <View
          style={{ width: size, height: size, borderRadius: size / 2 }}
          className={`items-center justify-center ${bg}`}
        >
          <Text className={`font-semibold ${fg}`} style={{ fontSize: size * 0.36 }}>
            {initials}
          </Text>
        </View>
      )}
      {online && (
        <View className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-card bg-primary" />
      )}
    </View>
  )
}
