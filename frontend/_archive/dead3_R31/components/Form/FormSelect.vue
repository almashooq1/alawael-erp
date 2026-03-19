<template>
  <div class="form-group">
    <label v-if="label" :for="id" class="form-label" :class="{ required }">
      {{ label }}
    </label>
    <div class="form-select-wrapper">
      <select
        :id="id"
        v-model="selectedValue"
        :disabled="disabled"
        :required="required"
        class="form-select"
        :class="{ error: hasError, success: !hasError && touched && selectedValue }"
        @blur="onBlur"
        @change="onChange"
        @focus="onFocus"
        :aria-label="label || placeholder"
        :aria-invalid="hasError"
      >
        <option value="" disabled>{{ placeholder }}</option>
        <optgroup
          v-for="group in groupedOptions"
          :key="group.label"
          :label="group.label"
        >
          <option
            v-for="option in group.options"
            :key="option.value"
            :value="option.value"
          >
            {{ option.label }}
          </option>
        </optgroup>
        <template v-if="!grouped">
          <option
            v-for="option in options"
            :key="option.value"
            :value="option.value"
          >
            {{ option.label }}
          </option>
        </template>
      </select>
      <span class="form-select-icon">▼</span>
    </div>
    <p v-if="hasError && errorMessage" class="form-error">
      ⚠️ {{ errorMessage }}
    </p>
    <p v-else-if="helperText" class="form-helper">
      {{ helperText }}
    </p>
  </div>
</template>

<script>
export default {
  name: 'FormSelect',
  props: {
    modelValue: {
      type: [String, Number],
      default: '',
    },
    label: {
      type: String,
      default: null,
    },
    options: {
      type: Array,
      default: () => [],
    },
    placeholder: {
      type: String,
      default: 'اختر خياراً...',
    },
    disabled: {
      type: Boolean,
      default: false,
    },
    required: {
      type: Boolean,
      default: false,
    },
    grouped: {
      type: Boolean,
      default: false,
    },
    errorMessage: {
      type: String,
      default: null,
    },
    helperText: {
      type: String,
      default: null,
    },
  },
  emits: ['update:modelValue', 'blur', 'focus', 'change'],
  data() {
    return {
      touched: false,
      focused: false,
    }
  },
  computed: {
    selectedValue: {
      get() {
        return this.modelValue
      },
      set(value) {
        this.$emit('update:modelValue', value)
      },
    },
    hasError() {
      if (!this.touched && !this.focused) return false
      if (this.errorMessage) return true
      if (this.required && !this.selectedValue) return true
      return false
    },
    groupedOptions() {
      if (!this.grouped || !Array.isArray(this.options)) return []
      return this.options
    },
    id() {
      return `form-select-${Math.random().toString(36).substr(2, 9)}`
    },
  },
  methods: {
    onBlur() {
      this.touched = true
      this.focused = false
      this.$emit('blur', this.selectedValue)
    },
    onFocus() {
      this.focused = true
      this.$emit('focus', this.selectedValue)
    },
    onChange() {
      this.$emit('change', this.selectedValue)
    },
  },
}
</script>

<style scoped>
.form-group {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-lg);
}

.form-label {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--color-gray-700);
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.form-label.required::after {
  content: '*';
  color: var(--color-error-600);
  font-weight: 700;
}

.form-select-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.form-select {
  width: 100%;
  padding: var(--spacing-md) var(--spacing-lg);
  padding-right: 40px;
  border: 2px solid var(--color-gray-200);
  border-radius: var(--radius-md);
  font-size: var(--text-base);
  font-family: inherit;
  color: var(--color-gray-800);
  background: var(--color-white);
  appearance: none;
  cursor: pointer;
  transition: all var(--transition-base);
}

.form-select:focus {
  border-color: var(--color-primary-600);
  box-shadow: 0 0 0 3px var(--color-primary-50);
  outline: none;
}

.form-select:disabled {
  background: var(--color-gray-50);
  color: var(--color-gray-400);
  cursor: not-allowed;
}

.form-select.error {
  border-color: var(--color-error-500);
}

.form-select.error:focus {
  box-shadow: 0 0 0 3px var(--color-error-50);
}

.form-select.success {
  border-color: var(--color-success-500);
}

.form-select-icon {
  position: absolute;
  right: var(--spacing-lg);
  font-size: var(--text-sm);
  color: var(--color-gray-400);
  pointer-events: none;
}

.form-error {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--color-error-600);
}

.form-helper {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--color-gray-500);
}
</style>
