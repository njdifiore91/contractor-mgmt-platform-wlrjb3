<script lang="ts">
import { defineComponent, h, ref } from 'vue'
import { QInput, QIcon } from 'quasar'

export default defineComponent({
  name: 'LoginFormInput',
  props: {
    modelValue: {
      type: String,
      required: true
    },
    type: {
      type: String,
      default: 'text'
    },
    label: {
      type: String,
      required: true
    }
  },
  emits: ['update:modelValue'],
  setup(props) {
    const isPwd = ref(true);
    return { isPwd };
  },
  render() {
    const slots = {
      prepend: () => h(QIcon, {
        name: this.type === 'email' ? 'mail' : 'lock',
        color: 'primary'
      })
    };

    if (this.type === 'password') {
      slots.append = () => h(QIcon, {
        name: this.isPwd ? 'visibility_off' : 'visibility',
        class: 'cursor-pointer',
        onClick: () => this.isPwd = !this.isPwd
      });
    }

    return h(QInput, {
      modelValue: this.modelValue,
      'onUpdate:modelValue': (value: string) => this.$emit('update:modelValue', value),
      type: this.type === 'password' ? (this.isPwd ? 'password' : 'text') : this.type,
      label: this.label,
      filled: true,
      class: 'login-input',
      standout: true,
      'lazy-rules': true,
      rules: [(val: string) => !!val || `${this.label} is required`]
    }, slots)
  }
})
</script>

<style lang="scss" scoped>
.login-input {
  :deep(.q-field__control) {
    height: 56px;
    border-radius: 8px;
    background: rgba(0, 0, 0, 0.03);

    &:hover {
      background: rgba(0, 0, 0, 0.05);
    }

    .q-field__prepend {
      padding: 0 12px;
    }
  }

  :deep(.q-field__native) {
    color: rgba(0, 0, 0, 0.87);
    &::placeholder {
      color: rgba(0, 0, 0, 0.6);
    }
  }

  :deep(.q-field__label) {
    top: 18px;
    font-size: 0.95rem;
    font-weight: 500;
    color: rgba(0, 0, 0, 0.6);
  }
}
</style> 