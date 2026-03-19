<template>
  <div class="form-group">
    <label v-if="label" :for="id" class="form-label" :class="{ required }">
      {{ label }}
    </label>
    <div class="form-input-wrapper">
      <input
        :id="id"
        v-model="inputValue"
        :type="type"
        :placeholder="placeholder"
        :disabled="disabled"
        :required="required"
        :pattern="pattern"
        :min="min"
        :max="max"
        :step="step"
        class="form-input"
        :class="{ error: hasError, success: !hasError && touched && inputValue }"
        @blur="onBlur"
        @input="onInput"
        @focus="onFocus"
        :aria-label="label || placeholder"
        :aria-invalid="hasError"
        :aria-describedby="hasError ? `${id}-error` : undefined"
      />
      <span v-if="icon" class="form-icon">{{ icon }}</span>
    </div>
    <p v-if="hasError && errorMessage" :id="`${id}-error`" class="form-error">
      ⚠️ {{ errorMessage }}
    </p>
    <p v-else-if="helperText" class="form-helper">
      {{ helperText }}
    </p>
  </div>
</template>

<script>
export default {
  name: 'FormInput',
  props: {
    modelValue: {
      type: [String, Number],
      default: '',
    },
    label: {
      type: String,
      default: null,
    },
    type: {
      type: String,
      default: 'text',
      validator: (value) => 
        ['text', 'email', 'password', 'number', 'tel', 'url', 'date', 'time'].includes(value),
    },
    placeholder: {
      type: String,
      default: '',
    },
    icon: {
      type: String,
      default: null,
    },
    disabled: {
      type: Boolean,
      default: false,
    },
    required: {
      type: Boolean,
      default: false,
    },
    pattern: {
      type: String,
      default: null,
    },
    min: {
      type: [String, Number],
      default: null,
    },
    max: {
      type: [String, Number],
      default: null,
    },
    step: {
      type: [String, Number],
      default: null,
    },
    validate: {
      type: Function,
      default: null,
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
  emits: ['update:modelValue', 'blur', 'focus', 'input'],
  data() {
    return {
      touched: false,
      focused: false,
      internalError: null,
    }
  },
  computed: {
    inputValue: {
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
      if (this.internalError) return true
      if (this.required && !this.inputValue) return true
      if (this.validate) {
        const error = this.validate(this.inputValue)
        this.internalError = error
        return !!error
      }
      return false
    },
    id() {
      return `form-input-${Math.random().toString(36).substr(2, 9)}`
    },
  },
  methods: {
    onBlur() {
      this.touched = true
      this.focused = false
      this.$emit('blur', this.inputValue)
    },
    onFocus() {
      this.focused = true
      this.$emit('focus', this.inputValue)
    },
    onInput() {
      this.$emit('input', this.inputValue)
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

.form-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.form-input {
  width: 100%;
  padding: var(--spacing-md) var(--spacing-lg);
  border: 2px solid var(--color-gray-200);
  border-radius: var(--radius-md);
  font-size: var(--text-base);
  font-family: inherit;
  color: var(--color-gray-800);
  background: var(--color-white);
  transition: all var(--transition-base);
}

.form-input::placeholder {
  color: var(--color-gray-400);
}

.form-input:focus {
  border-color: var(--color-primary-600);
  box-shadow: 0 0 0 3px var(--color-primary-50);
  outline: none;
}

.form-input:disabled {
  background: var(--color-gray-50);
  color: var(--color-gray-400);
  cursor: not-allowed;
}

.form-input.error {
  border-color: var(--color-error-500);
}

.form-input.error:focus {
  box-shadow: 0 0 0 3px var(--color-error-50);
}

.form-input.success {
  border-color: var(--color-success-500);
}

.form-icon {
  position: absolute;
  right: var(--spacing-lg);
  font-size: var(--text-lg);
  pointer-events: none;
}

.form-error {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--color-error-600);
  line-height: 1.4;
}

.form-helper {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--color-gray-500);
  line-height: 1.4;
}
</style>
