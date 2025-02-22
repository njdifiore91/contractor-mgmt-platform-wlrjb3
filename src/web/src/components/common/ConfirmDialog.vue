<template>
  <q-dialog
    v-model="visible"
    :persistent="persistent"
    role="dialog"
    :aria-labelledby="dialogTitleId"
    :aria-describedby="dialogMessageId"
    @hide="handleCancel"
    @keyup.esc="handleCancel"
    @keyup.enter="handleConfirm"
  >
    <q-card class="confirm-dialog">
      <q-card-section>
        <div :id="dialogTitleId" class="text-h6" v-text="title"></div>
        <p :id="dialogMessageId" class="q-mt-sm" v-text="message"></p>
      </q-card-section>

      <q-card-actions class="justify-end q-pa-md">
        <q-btn
          flat
          :label="cancelLabel"
          :disable="loading"
          :aria-label="cancelAriaLabel"
          @click="handleCancel"
          ref="cancelButton"
        />
        <q-btn
          :color="confirmColor"
          :label="confirmLabel"
          :disable="loading"
          :aria-label="confirmAriaLabel"
          @click="handleConfirm"
          ref="confirmButton"
        >
          <loading-spinner
            v-if="loading"
            size="small"
            color="white"
          />
        </q-btn>
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script>
import { ref, computed } from 'vue' // ^3.3.0
import { QDialog, QCard, QCardSection, QCardActions, QBtn } from 'quasar' // ^2.0.0
import { useNotification } from '@/composables/useNotification'
import LoadingSpinner from './LoadingSpinner.vue'

export default {
  name: 'ConfirmDialog',

  components: {
    QDialog,
    QCard,
    QCardSection,
    QCardActions,
    QBtn,
    LoadingSpinner
  },

  props: {
    title: {
      type: String,
      required: true
    },
    message: {
      type: String,
      required: true
    },
    confirmLabel: {
      type: String,
      default: 'Confirm'
    },
    cancelLabel: {
      type: String,
      default: 'Cancel'
    },
    confirmColor: {
      type: String,
      default: 'primary'
    },
    persistent: {
      type: Boolean,
      default: true
    }
  },

  emits: ['confirm', 'cancel'],

  setup(props, { emit }) {
    const { showErrorNotification } = useNotification()
    const visible = ref(false)
    const loading = ref(false)
    const confirmButton = ref(null)
    const cancelButton = ref(null)
    const dialogTitleId = 'confirm-dialog-title'
    const dialogMessageId = 'confirm-dialog-message'

    const confirmAriaLabel = computed(() => `Confirm: ${props.title}`)
    const cancelAriaLabel = computed(() => `Cancel: ${props.title}`)

    const show = () => {
      visible.value = true
      loading.value = false
      // Focus confirm button after dialog is shown
      nextTick(() => {
        confirmButton.value?.$el.focus()
      })
    }

    const hide = () => {
      visible.value = false
      loading.value = false
    }

    const handleConfirm = async () => {
      try {
        loading.value = true
        await emit('confirm')
        hide()
      } catch (error) {
        showErrorNotification('An error occurred while processing your request')
        loading.value = false
      }
    }

    const handleCancel = () => {
      if (!loading.value) {
        emit('cancel')
        hide()
      }
    }

    const handleKeyboard = (event) => {
      if (visible.value) {
        if (event.key === 'Tab') {
          // Trap focus within dialog
          const focusableElements = [cancelButton.value.$el, confirmButton.value.$el]
          const firstElement = focusableElements[0]
          const lastElement = focusableElements[focusableElements.length - 1]

          if (event.shiftKey && document.activeElement === firstElement) {
            event.preventDefault()
            lastElement.focus()
          } else if (!event.shiftKey && document.activeElement === lastElement) {
            event.preventDefault()
            firstElement.focus()
          }
        }
      }
    }

    onMounted(() => {
      document.addEventListener('keydown', handleKeyboard)
    })

    onBeforeUnmount(() => {
      document.removeEventListener('keydown', handleKeyboard)
    })

    return {
      visible,
      loading,
      confirmButton,
      cancelButton,
      dialogTitleId,
      dialogMessageId,
      confirmAriaLabel,
      cancelAriaLabel,
      show,
      hide,
      handleConfirm,
      handleCancel
    }
  }
}
</script>

<style lang="scss" scoped>
.confirm-dialog {
  min-width: 300px;
  max-width: 400px;
  border-radius: $border-radius-base;
  box-shadow: $elevation-2;

  .text-h6 {
    font-size: $font-size-h6;
    font-weight: map-get($typography-font-weights, medium);
    color: var(--text-primary);
  }

  p {
    font-size: $font-size-body1;
    line-height: $line-height-body;
    color: var(--text-secondary);
  }

  .q-card-actions {
    border-top: $field-border-width $field-border-style rgba(0, 0, 0, 0.12);
  }
}
</style>