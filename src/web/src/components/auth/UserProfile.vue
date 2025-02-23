<template>
  <div class="user-profile">
    <q-card flat bordered>
      <q-card-section class="bg-primary text-white">
        <div class="row items-center justify-between">
          <div class="col-auto">
            <div class="text-h6">User Profile</div>
            <div v-if="userData" class="text-subtitle2">
              {{ userData.firstName }} {{ userData.lastName }}
            </div>
          </div>
          <div class="col-auto">
            <q-chip
              :color="securityContext.isValid ? 'positive' : 'negative'"
              text-color="white"
              icon="security"
            >
              {{ securityContext.isValid ? 'Secure' : 'Session Invalid' }}
            </q-chip>
          </div>
        </div>
      </q-card-section>

      <q-card-section class="bg-grey-2">
        <div class="text-caption">
          Last Login: {{ userData?.lastLoginAt ? new Date(userData.lastLoginAt).toLocaleString() : 'Never' }}
        </div>
      </q-card-section>

      <q-card-section>
        <q-form @submit.prevent="handleUpdateProfile" class="q-gutter-md">
          <q-input
            v-model="formData.firstName"
            label="First Name"
            outlined
            :disable="isLoading"
          />

          <q-input
            v-model="formData.lastName"
            label="Last Name"
            outlined
            :disable="isLoading"
          />

          <q-input
            v-model="formData.email"
            label="Email"
            type="email"
            outlined
            disable
          >
            <template #append>
              <q-icon name="verified" color="primary" />
            </template>
          </q-input>

          <q-input
            v-model="formData.phoneNumber"
            label="Phone Number"
            outlined
            :disable="isLoading"
            mask="(###) ###-####"
          />

          <div v-if="userData?.userRoles?.length" class="q-mb-md">
            <div class="text-subtitle2 q-mb-sm">Roles</div>
            <div class="q-pa-sm bg-grey-2 rounded-borders">
              <q-chip
                v-for="role in userData.userRoles"
                :key="role.id"
                color="primary"
                text-color="white"
                size="sm"
                class="q-ma-xs"
              >
                {{ role.name }}
              </q-chip>
            </div>
          </div>

          <div class="row justify-end q-gutter-sm">
            <q-btn
              label="Cancel"
              flat
              color="grey"
              :disable="isLoading"
              @click="resetForm"
            />
            <q-btn
              type="submit"
              label="Save"
              color="primary"
              :loading="isLoading"
            />
            <q-btn
              label="Logout"
              color="negative"
              flat
              :disable="isLoading"
              @click="handleLogout"
            />
          </div>
        </q-form>
      </q-card-section>

      <q-card-section v-if="error" class="bg-negative text-white">
        <div class="row items-center">
          <q-icon name="error" class="q-mr-sm" />
          <div>{{ error }}</div>
        </div>
      </q-card-section>
    </q-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import type { IUser } from '@/models/user.model';
import { useAuth } from '@/composables/useAuth';
import { useUser } from '@/composables/useUser';
import { useNotification } from '@/composables/useNotification';

interface SecurityContext {
  isValid: boolean;
  lastActivity?: Date;
  mfaEnabled?: boolean;
}

interface Props {
  userData?: IUser | null;
  securityContext: SecurityContext;
  isLoading?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  userData: null,
  securityContext: () => ({
    isValid: false
  }),
  isLoading: false
});

const emit = defineEmits<{
  (e: 'update:profile', value: IUser): void;
  (e: 'security-event', value: { type: string }): void;
}>();

const { isAuthenticated, logout } = useAuth();
const { getUserById, updateUser, validateUserData } = useUser();
const { showSuccess, showError } = useNotification();

const error = ref<string | null>(null);
const formData = ref({
  firstName: '',
  lastName: '',
  email: '',
  phoneNumber: ''
});

watch(() => props.userData, (newUserData) => {
  if (newUserData) {
    formData.value = {
      firstName: newUserData.firstName || '',
      lastName: newUserData.lastName || '',
      email: newUserData.email || '',
      phoneNumber: newUserData.phoneNumber || ''
    };
  }
}, { immediate: true });

const handleUpdateProfile = async () => {
  try {
    const isValid = await validateUserData(formData.value);
    if (!isValid) {
      throw new Error('Invalid form data');
    }

    if (!props.userData) {
      throw new Error('No user data available');
    }

    const updatedUser = await updateUser({
      ...props.userData,
      ...formData.value
    });

    emit('update:profile', updatedUser);
    showSuccess('Profile updated successfully');
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to update profile';
    showError(error.value);
  }
};

const resetForm = () => {
  if (props.userData) {
    formData.value = {
      firstName: props.userData.firstName || '',
      lastName: props.userData.lastName || '',
      email: props.userData.email || '',
      phoneNumber: props.userData.phoneNumber || ''
    };
  }
};

const handleLogout = async () => {
  try {
    await logout();
    emit('security-event', { type: 'USER_LOGOUT' });
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to logout';
    showError(error.value);
  }
};

onMounted(() => {
  if (!props.userData && isAuthenticated.value) {
    getUserById(isAuthenticated.value)
      .then(userData => {
        emit('update:profile', userData);
      })
      .catch(err => {
        error.value = err instanceof Error ? err.message : 'Failed to load profile';
        showError(error.value);
      });
  }
});
</script>

<style lang="scss" scoped>
.user-profile {
  max-width: 600px;
  margin: 0 auto;
  padding: 1rem;
}
</style>