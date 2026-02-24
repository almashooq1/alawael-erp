<template>
  <div class="stat-card" :class="variant">
    <div class="stat-header">
      <div class="stat-icon" :style="{ backgroundColor: iconBgColor }">
        {{ icon }}
      </div>
      <div v-if="action" class="stat-action">
        <button
          class="btn-action"
          :title="action.label"
          :aria-label="action.label"
          @click="$emit('action')"
        >
          {{ action.icon || '→' }}
        </button>
      </div>
    </div>

    <div class="stat-body">
      <p class="stat-label">{{ label }}</p>
      <p class="stat-value">{{ formattedValue }}</p>

      <div v-if="trend" class="stat-trend" :class="trend.type">
        <span class="trend-icon">{{ trend.type === 'up' ? '↑' : '↓' }}</span>
        <span class="trend-text">{{ trend.value }}% {{ trend.period }}</span>
      </div>
    </div>

    <div v-if="description" class="stat-footer">
      <p class="description">{{ description }}</p>
    </div>

    <div v-if="$slots.default" class="stat-extra">
      <slot />
    </div>
  </div>
</template>

<script>
export default {
  name: 'StatCard',
  props: {
    label: {
      type: String,
      required: true,
    },
    value: {
      type: [Number, String],
      required: true,
    },
    icon: {
      type: String,
      default: '📊',
    },
    variant: {
      type: String,
      default: 'default',
      validator: (value) => ['default', 'primary', 'success', 'warning', 'error'].includes(value),
    },
    trend: {
      type: Object,
      default: null,
      validator: (value) => {
        if (!value) return true
        return (
          typeof value.type === 'string' &&
          typeof value.value === 'number' &&
          typeof value.period === 'string'
        )
      },
    },
    description: {
      type: String,
      default: null,
    },
    action: {
      type: Object,
      default: null,
    },
    format: {
      type: String,
      default: 'number',
      validator: (value) =>
        ['number', 'currency', 'percentage', 'decimal'].includes(value),
    },
    prefix: {
      type: String,
      default: '',
    },
    suffix: {
      type: String,
      default: '',
    },
  },
  emits: ['action'],
  computed: {
    formattedValue() {
      let formatted = this.value

      if (this.format === 'number') {
        formatted = new Intl.NumberFormat('ar-EG').format(this.value)
      } else if (this.format === 'currency') {
        formatted = new Intl.NumberFormat('ar-EG', {
          style: 'currency',
          currency: 'EGP',
        }).format(this.value)
      } else if (this.format === 'percentage') {
        formatted = `${this.value}%`
      } else if (this.format === 'decimal') {
        formatted = new Intl.NumberFormat('ar-EG', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(this.value)
      }

      return `${this.prefix}${formatted}${this.suffix}`
    },
    iconBgColor() {
      const colors = {
        default: 'var(--color-gray-100)',
        primary: 'var(--color-primary-100)',
        success: 'var(--color-success-100)',
        warning: 'var(--color-warning-100)',
        error: 'var(--color-error-100)',
      }
      return colors[this.variant] || colors.default
    },
  },
}
</script>

<style scoped>
.stat-card {
  background: var(--color-white);
  border: 1px solid var(--color-gray-200);
  border-radius: var(--radius-md);
  padding: var(--spacing-lg);
  transition: all var(--transition-base);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.stat-card:hover {
  box-shadow: var(--shadow-md);
  border-color: var(--color-gray-300);
}

.stat-card.primary {
  border-color: var(--color-primary-200);
}

.stat-card.success {
  border-color: var(--color-success-200);
}

.stat-card.warning {
  border-color: var(--color-warning-200);
}

.stat-card.error {
  border-color: var(--color-error-200);
}

.stat-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.stat-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-md);
  font-size: var(--text-xl);
  flex-shrink: 0;
}

.stat-action {
  padding-top: var(--spacing-xs);
}

.btn-action {
  background: transparent;
  border: none;
  font-size: var(--text-lg);
  cursor: pointer;
  color: var(--color-gray-400);
  transition: all var(--transition-base);
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-action:hover {
  color: var(--color-primary-600);
}

.stat-body {
  flex: 1;
}

.stat-label {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--color-gray-500);
  text-transform: capitalize;
  font-weight: 500;
}

.stat-value {
  margin: var(--spacing-xs) 0;
  font-size: var(--text-2xl);
  font-weight: 700;
  color: var(--color-gray-800);
}

.stat-trend {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  font-size: var(--text-sm);
  margin-top: var(--spacing-sm);
}

.stat-trend.up {
  color: var(--color-success-600);
}

.stat-trend.down {
  color: var(--color-error-600);
}

.trend-icon {
  font-weight: 700;
}

.stat-footer {
  border-top: 1px solid var(--color-gray-100);
  padding-top: var(--spacing-md);
}

.description {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--color-gray-600);
  line-height: 1.5;
}

.stat-extra {
  margin-top: auto;
}

/* حالات مختلفة */
.stat-card.primary .stat-value {
  color: var(--color-primary-600);
}

.stat-card.success .stat-value {
  color: var(--color-success-600);
}

.stat-card.warning .stat-value {
  color: var(--color-warning-600);
}

.stat-card.error .stat-value {
  color: var(--color-error-600);
}

/* الاستجابة */
@media (max-width: 768px) {
  .stat-card {
    padding: var(--spacing-md);
  }

  .stat-value {
    font-size: var(--text-xl);
  }
}
</style>
