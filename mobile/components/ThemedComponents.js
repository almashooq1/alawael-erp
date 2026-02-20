/**
 * Phase 34: Themed Components
 * Pre-styled components with dark/light theme support
 * Ready-to-use UI components with theme awareness
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { useTheme } from './ThemeService';

/**
 * Themed Card Component
 */
export const ThemedCard = ({
  children,
  style,
  onPress,
  disabled = false,
  variant = 'default',
}) => {
  const { colors, styles } = useTheme();
  const animatedValue = React.useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    if (onPress) {
      Animated.spring(animatedValue, {
        toValue: 0.98,
        useNativeDriver: false,
      }).start();
    }
  };

  const handlePressOut = () => {
    if (onPress) {
      Animated.spring(animatedValue, {
        toValue: 1,
        useNativeDriver: false,
      }).start();
    }
  };

  const scale = animatedValue.interpolate({
    inputRange: [0.98, 1],
    outputRange: [0.98, 1],
  });

  const cardStyle = [
    styles.card,
    variant === 'elevated' && {
      shadowOpacity: 0.3,
      elevation: 5,
    },
    variant === 'outlined' && {
      borderWidth: 1,
      borderColor: colors.primary,
      shadowOpacity: 0,
      elevation: 0,
    },
    style,
  ];

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || !onPress}
      >
        <View style={cardStyle}>{children}</View>
      </TouchableOpacity>
    </Animated.View>
  );
};

/**
 * Themed Button Component
 */
export const ThemedButton = ({
  label,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  icon: Icon,
  style,
  labelStyle,
  rightIcon: RightIcon,
}) => {
  const { colors, styles } = useTheme();

  const sizeStyles = {
    small: {
      paddingVertical: 8,
      paddingHorizontal: 16,
      fontSize: 12,
    },
    medium: {
      paddingVertical: 12,
      paddingHorizontal: 24,
      fontSize: 14,
    },
    large: {
      paddingVertical: 16,
      paddingHorizontal: 32,
      fontSize: 16,
    },
  };

  const buttonStyle = [
    styles.button[variant],
    sizeStyles[size],
    disabled && {
      opacity: 0.5,
    },
    style,
  ];

  return (
    <TouchableOpacity
      style={buttonStyle}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
        {loading ? (
          <ActivityIndicator color={colors.textInverse} size="small" style={{ marginRight: 8 }} />
        ) : Icon ? (
          <Icon size={16} color={colors.textInverse} style={{ marginRight: 8 }} />
        ) : null}

        <Text
          style={[
            {
              fontWeight: '600',
              fontSize: 14,
              color: variant === 'text' ? colors.primary : colors.textInverse,
            },
            labelStyle,
          ]}
        >
          {label}
        </Text>

        {RightIcon && (
          <RightIcon size={16} color={colors.textInverse} style={{ marginLeft: 8 }} />
        )}
      </View>
    </TouchableOpacity>
  );
};

/**
 * Themed TextInput Component
 */
export const ThemedTextInput = ({
  placeholder,
  value,
  onChangeText,
  onFocus,
  onBlur,
  secureTextEntry = false,
  keyboardType = 'default',
  multiline = false,
  numberOfLines = 1,
  icon: Icon,
  rightIcon: RightIcon,
  onRightIconPress,
  error,
  disabled = false,
  style,
  editable = true,
}) => {
  const { colors, styles } = useTheme();
  const [isFocused, setIsFocused] = React.useState(false);

  const handleFocus = (e) => {
    setIsFocused(true);
    onFocus?.(e);
  };

  const handleBlur = (e) => {
    setIsFocused(false);
    onBlur?.(e);
  };

  const containerStyle = [
    {
      flexDirection: 'row',
      alignItems: multiline ? 'flex-start' : 'center',
      paddingHorizontal: 12,
      marginBottom: error ? 4 : 0,
    },
    styles.input,
    isFocused && styles.inputFocused,
    error && {
      borderColor: colors.danger,
      borderWidth: 2,
    },
    disabled && {
      opacity: 0.6,
    },
    style,
  ];

  return (
    <View>
      <View style={containerStyle}>
        {Icon && <Icon size={20} color={colors.textSecondary} style={{ marginRight: 8 }} />}

        <TextInput
          style={{
            flex: 1,
            fontSize: 14,
            color: colors.textPrimary,
            paddingVertical: multiline ? 12 : 0,
          }}
          placeholder={placeholder}
          placeholderTextColor={colors.textHint}
          value={value}
          onChangeText={onChangeText}
          onFocus={handleFocus}
          onBlur={handleBlur}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          multiline={multiline}
          numberOfLines={numberOfLines}
          editable={editable && !disabled}
          selectionColor={colors.primary}
        />

        {RightIcon && (
          <TouchableOpacity onPress={onRightIconPress} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <RightIcon size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {error && (
        <Text style={{ color: colors.danger, fontSize: 12, marginTop: 4, marginLeft: 12 }}>
          {error}
        </Text>
      )}
    </View>
  );
};

/**
 * Themed Text Component
 */
export const ThemedText = ({
  children,
  variant = 'body1',
  color = 'primary',
  weight = '400',
  align = 'left',
  numberOfLines,
  style,
}) => {
  const { colors, typography } = useTheme();

  const colorMap = {
    primary: colors.textPrimary,
    secondary: colors.textSecondary,
    hint: colors.textHint,
    accent: colors.primary,
    danger: colors.danger,
    success: colors.success,
    warning: colors.warning,
  };

  const fontWeightMap = {
    light: '300',
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  };

  const textStyle = [
    typography[variant] || typography.body1,
    {
      color: colorMap[color],
      fontWeight: fontWeightMap[weight],
      textAlign: align,
    },
    style,
  ];

  return (
    <Text style={textStyle} numberOfLines={numberOfLines}>
      {children}
    </Text>
  );
};

/**
 * Themed Badge Component
 */
export const ThemedBadge = ({ label, variant = 'default', count, style }) => {
  const { colors, styles } = useTheme();

  const badgeVariants = {
    default: {
      backgroundColor: colors.danger,
      color: colors.textInverse,
    },
    primary: {
      backgroundColor: colors.primary,
      color: colors.textInverse,
    },
    success: {
      backgroundColor: colors.success,
      color: colors.textInverse,
    },
    warning: {
      backgroundColor: colors.warning,
      color: colors.textInverse,
    },
  };

  return (
    <View
      style={[
        {
          ...badgeVariants[variant],
          borderRadius: 10,
          paddingHorizontal: 8,
          paddingVertical: 4,
          minWidth: 24,
          justifyContent: 'center',
          alignItems: 'center',
        },
        style,
      ]}
    >
      <Text style={{ color: badgeVariants[variant].color, fontSize: 12, fontWeight: '600' }}>
        {count || label}
      </Text>
    </View>
  );
};

/**
 * Themed Chip Component
 */
export const ThemedChip = ({
  label,
  onPress,
  onDelete,
  variant = 'default',
  icon: Icon,
  selected = false,
}) => {
  const { colors, styles } = useTheme();

  const chipStyle = [
    styles.chip,
    selected && {
      backgroundColor: colors.primary,
      color: colors.textInverse,
    },
  ];

  return (
    <TouchableOpacity
      style={[chipStyle, { flexDirection: 'row', alignItems: 'center' }]}
      onPress={onPress}
    >
      {Icon && (
        <Icon
          size={16}
          color={selected ? colors.textInverse : colors.textPrimary}
          style={{ marginRight: 6 }}
        />
      )}
      <Text
        style={{
          fontSize: 12,
          color: selected ? colors.textInverse : colors.textPrimary,
          marginRight: onDelete ? 4 : 0,
        }}
      >
        {label}
      </Text>
      {onDelete && (
        <TouchableOpacity onPress={onDelete} style={{ marginLeft: 4 }}>
          <Text style={{ fontSize: 16, color: selected ? colors.textInverse : colors.textSecondary }}>×</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
};

/**
 * Themed Divider Component
 */
export const ThemedDivider = ({ vertical = false, style }) => {
  const { styles } = useTheme();

  return (
    <View
      style={[
        styles.divider,
        vertical && { width: 1, height: '100%' },
        !vertical && { width: '100%', height: 1 },
        style,
      ]}
    />
  );
};

/**
 * Themed Container Component
 */
export const ThemedContainer = ({
  children,
  style,
  padding = 16,
  paddingTop = padding,
  paddingBottom = padding,
  paddingHorizontal = padding,
  backgroundColor = 'background',
}) => {
  const { colors } = useTheme();

  const bgColorMap = {
    background: colors.background,
    surface: colors.surface,
    surfaceVariant: colors.surfaceVariant,
  };

  return (
    <View
      style={[
        {
          flex: 1,
          backgroundColor: bgColorMap[backgroundColor],
          paddingTop,
          paddingBottom,
          paddingHorizontal,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
};

/**
 * Themed ScrollView Component
 */
export const ThemedScrollView = ({
  children,
  style,
  padding = 16,
  backgroundColor = 'background',
}) => {
  const { colors } = useTheme();

  const bgColorMap = {
    background: colors.background,
    surface: colors.surface,
    surfaceVariant: colors.surfaceVariant,
  };

  return (
    <ScrollView
      style={[
        {
          backgroundColor: bgColorMap[backgroundColor],
        },
        style,
      ]}
      contentContainerStyle={{ padding }}
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  );
};

/**
 * Themed Modal Overlay Component
 */
export const ThemedModalOverlay = ({ visible, onDismiss, children, style }) => {
  const { colors, styles } = useTheme();

  if (!visible) return null;

  return (
    <View
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: colors.overlay,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
      }}
    >
      <TouchableOpacity
        style={{ flex: 1, width: '100%' }}
        onPress={onDismiss}
        activeOpacity={1}
      >
        <View style={[styles.modal, style]}>
          <TouchableOpacity activeOpacity={1}>
            {children}
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </View>
  );
};

/**
 * Themed Skeleton Loader Component
 */
export const ThemedSkeleton = ({
  width = '100%',
  height = 16,
  borderRadius = 8,
  style,
}) => {
  const { colors, styles } = useTheme();
  const shimmerAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const shimmer = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: false,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: false,
        }),
      ]),
    );
    shimmer.start();
  }, [shimmerAnim]);

  const opacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: colors.surfaceVariant,
          opacity,
        },
        style,
      ]}
    />
  );
};

/**
 * Themed Alert Component
 */
export const ThemedAlert = ({ type = 'info', title, message, onClose, style }) => {
  const { colors } = useTheme();

  const typeStyles = {
    info: {
      backgroundColor: `${colors.info}20`,
      borderColor: colors.info,
      iconColor: colors.info,
    },
    success: {
      backgroundColor: `${colors.success}20`,
      borderColor: colors.success,
      iconColor: colors.success,
    },
    warning: {
      backgroundColor: `${colors.warning}20`,
      borderColor: colors.warning,
      iconColor: colors.warning,
    },
    danger: {
      backgroundColor: `${colors.danger}20`,
      borderColor: colors.danger,
      iconColor: colors.danger,
    },
  };

  const style_config = typeStyles[type];

  return (
    <View
      style={[
        {
          backgroundColor: style_config.backgroundColor,
          borderColor: style_config.borderColor,
          borderWidth: 1,
          borderRadius: 8,
          padding: 12,
          flexDirection: 'row',
          alignItems: 'flex-start',
          marginBottom: 8,
        },
        style,
      ]}
    >
      <View style={{ flex: 1 }}>
        {title && (
          <Text style={{ fontWeight: '600', color: colors.textPrimary, marginBottom: 4 }}>
            {title}
          </Text>
        )}
        {message && (
          <Text style={{ fontSize: 12, color: colors.textSecondary }}>
            {message}
          </Text>
        )}
      </View>

      {onClose && (
        <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
          <Text style={{ fontSize: 18, color: style_config.iconColor }}>×</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

/**
 * Themed Progress Bar Component
 */
export const ThemedProgressBar = ({
  progress = 0,
  height = 4,
  color = 'primary',
  backgroundColor = 'surfaceVariant',
  animated = true,
  style,
}) => {
  const { colors } = useTheme();
  const colorMap = {
    primary: colors.primary,
    success: colors.success,
    warning: colors.warning,
    danger: colors.danger,
  };
  const bgColorMap = {
    surfaceVariant: colors.surfaceVariant,
    surface: colors.surface,
  };

  const animatedWidth = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (animated) {
      Animated.timing(animatedWidth, {
        toValue: progress,
        duration: 500,
        useNativeDriver: false,
      }).start();
    }
  }, [progress, animated, animatedWidth]);

  const width = animated ? animatedWidth.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  }) : `${progress}%`;

  return (
    <View
      style={[
        {
          height,
          backgroundColor: bgColorMap[backgroundColor],
          borderRadius: height / 2,
          overflow: 'hidden',
          width: '100%',
        },
        style,
      ]}
    >
      <Animated.View
        style={{
          height: '100%',
          backgroundColor: colorMap[color],
          width,
          borderRadius: height / 2,
        }}
      />
    </View>
  );
};
