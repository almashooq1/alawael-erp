<template>
  <teleport to="body">
    <transition name="modal">
      <div v-if="isOpen" class="modal-overlay" @click.self="close">
        <div class="modal-dialog" :style="{ maxWidth: width }">
          <!-- رأس النافذة -->
          <div class="modal-header">
            <h2 v-if="title" class="modal-title">{{ title }}</h2>
            <button class="modal-close" @click="close">✕</button>
          </div>

          <!-- محتوى النافذة -->
          <div class="modal-body">
            <slot />
          </div>

          <!-- تذييل النافذة -->
          <div v-if="$slots.footer" class="modal-footer">
            <slot name="footer" />
          </div>
        </div>
      </div>
    </transition>
  </teleport>
</template>

<script>
export default {
  name: 'Modal',
  props: {
    modelValue: {
      type: Boolean,
      default: false,
    },
    title: {
      type: String,
      default: '',
    },
    width: {
      type: String,
      default: '500px',
    },
    closeOnOverlay: {
      type: Boolean,
      default: true,
    },
  },
  emits: ['update:modelValue', 'close'],
  computed: {
    isOpen() {
      return this.modelValue
    },
  },
  methods: {
    close() {
      if (this.closeOnOverlay) {
        this.$emit('update:modelValue', false)
        this.$emit('close')
      }
    },
  },
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  direction: rtl;
}

.modal-dialog {
  background: var(--color-white);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-2xl);
  max-height: 90vh;
  overflow-y: auto;
  animation: modalShow 0.3s ease-out;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-lg);
  border-bottom: 1px solid var(--color-gray-200);
}

.modal-title {
  margin: 0;
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--color-gray-800);
}

.modal-close {
  background: none;
  border: none;
  font-size: var(--text-lg);
  cursor: pointer;
  color: var(--color-gray-500);
  transition: color var(--transition-base);
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-close:hover {
  color: var(--color-gray-700);
}

.modal-body {
  padding: var(--spacing-lg);
}

.modal-footer {
  padding: var(--spacing-lg);
  border-top: 1px solid var(--color-gray-200);
  display: flex;
  gap: var(--spacing-md);
  justify-content: flex-end;
}

/* الحركات */
@keyframes modalShow {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

@media (max-width: 640px) {
  .modal-dialog {
    max-width: calc(100% - 2 * var(--spacing-lg));
  }

  .modal-header {
    flex-wrap: wrap;
  }

  .modal-footer {
    flex-direction: column-reverse;
  }
}
</style>
