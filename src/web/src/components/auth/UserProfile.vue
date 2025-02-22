<template>
  <q-card class="user-profile-card" flat bordered>
    <!-- Profile Header Section -->
    <q-card-section class="bg-primary text-white">
      <div class="row items-center justify-between">
        <div class="col-auto">
          <div class="text-h6">{{ $t('profile.title') }}</div>
          <div class="text-subtitle2">
            {{ userData?.firstName }} {{ userData?.lastName }}
          </div>
        </div>
        <div class="col-auto">
          <q-chip
            :color="securityContext.isValid ? 'positive' : 'negative'"
            text-color="white"
            icon="security"
          >
            {{ securityContext.isValid ? $t('profile.secure') : $t('profile.insecure') }}
          </q-chip>
        </div>
      </div>
    </q-card-section>

    <!-- Last Login Information -->
    <q-card-section class="bg-grey-2">
      <div class="text-caption">
        {{ $t('profile.lastLogin') }}: 
        {{ userData?.lastLoginAt ? new Date(userData.lastLoginAt).toLocaleString() : $t('profile.never') }}
      </div>
    </q-card-section>

    <!-- Profile Form -->
    <q-card-section>
      <q-form
        ref="profileForm"
        @submit="handleUpdateProfile"
        class="q-gutter-md"
      >
        <!-- First Name -->
        <q-input
          v-model="formData.firstName"
          :label="$t('profile.firstName')"
          :rules="[
            val => !!val || $t('validation.required'),
            val => val.length >= 2 || $t('validation.minLength', { length: 2 })
          ]"
          outlined
          :disable="isLoading"
          :error="!!error"
        />

        <!-- Last Name -->
        <q-input
          v-model="formData.lastName"
          :label="$t('profile.lastName')"
          :rules="[
            val => !!val || $t('validation.required'),
            val => val.length >= 2 || $t('validation.minLength', { length: 2 })
          ]"
          outlined
          :disable="isLoading"
          :error="!!error"
        />

        <!-- Email (Read-only) -->
        <q-input
          v-model="formData.email"
          :label="$t('profile.email')"
          type="email"
          outlined
          readonly
          :disable="true"
        >
          <template v-slot:append>
            <q-icon name="verified" color="primary" />
          </template>
        </q-input>

        <!-- Phone Number -->
        <q-input
          v-model="formData.phoneNumber"
          :label="$t('profile.phoneNumber')"
          :rules="[
            val => !val || /^\+?[\d\s-()]+$/.test(val) || $t('validation.phoneFormat')
          ]"
          outlined
          :disable="isLoading"
          :error="!!error"
          mask="(###) ###-####"
        />

        <!-- Role Information -->
        <div class="text-subtitle2 q-mb-sm">{{ $t('profile.roles') }}</div>
        <div class="q-pa-sm bg-grey-2 rounded-borders">
          <q-chip
            v-for="role in userData?.userRoles"
            :key="role.id"
            color="primary"
            text-color="white"
            size="sm"
            class="q-ma-xs"
          >
            {{ role.name }}
          </q-chip>
        </div>

        <!-- Security Preferences -->
        <q-expansion-item
          group="security"
          icon="security"
          :label="$t('profile.security.title')"
          header-class="text-primary"
        >
          <q-card>
            <q-card-section>
              <q-toggle
                v-model="securityPreferences.mfaEnabled"
                :label="$t('profile.security.mfa')"
                color="primary"
              />
              <q-toggle
                v-model="securityPreferences.emailNotifications"
                :label="$t('profile.security.emailNotifications')"
                color="primary"
              />
            </q-card-section>
          </q-card>
        </q-expansion-item>

        <!-- Action Buttons -->
        <div class="row justify-end q-gutter-sm q-mt-md">
          <q-btn
            :label="$t('common.cancel')"
            flat
            color="grey"
            :disable="isLoading"
            @click="resetForm"
          />
          <q-btn
            type="submit"
            :label="$t('common.save')"
            color="primary"
            :loading="isLoading"
          >
            <template v-slot:loading>
              <q-spinner-dots />
            </template>
          </q-btn>
          <q-btn
            :label="$t('common.logout')"
            color="negative"
            flat
            :disable="isLoading"
            @click="handleLogout"
          />
        </div>
      </q-form>
    </q-card-section>

    <!-- Error Display -->
    <q-card-section v-if="error" class="bg-negative text-white">
      <div class="row items-center">
        <q-icon name="error" class="q-mr-sm" />
        <div>{{ error }}</div>
      </div>
    </q-card-section>
  </q-card>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { QForm } from 'quasar';
import { IUser } from '@/models/user.model';
import { useAuth } from '@/composables/useAuth';
import { useUser } from '@/composables/useUser';
import { useNotification } from '@/composables/useNotification';

export default defineComponent({
  name: 'UserProfile',

  setup() {
    const { t } = useI18n();
    const { isAuthenticated, logout, validateSession } = useAuth();
    const { getUserById, updateUser, validateUserData } = useUser();
    const { showSuccess, showError } = useNotification();

    // Reactive state
    const profileForm = ref<QForm | null>(null);
    const userData = ref<IUser | null>(null);
    const isLoading = ref(false);
    const error = ref<string | null>(null);

    // Form data with security preferences
    const formData = ref({
      firstName: '',
      lastName: '',
      email: '',
      phoneNumber: ''
    });

    const securityPreferences = ref({
      mfaEnabled: false,
      emailNotifications: true
    });

    // Computed security context
    const securityContext = computed(() => ({
      isValid: isAuthenticated.value && !!userData.value,
      lastActivity: userData.value?.lastLoginAt,
      mfaEnabled: securityPreferences.value.mfaEnabled
    }));

    // Load user profile with security checks
    const loadUserProfile = async () => {
      try {
        isLoading.value = true;
        error.value = null;

        // Validate current session
        const sessionValid = await validateSession();
        if (!sessionValid) {
          throw new Error(t('errors.sessionExpired'));
        }

        // Fetch and validate user data
        const user = await getUserById(1); // Replace with actual user ID from auth context
        if (!user) {
          throw new Error(t('errors.userNotFound'));
        }

        userData.value = user;
        formData.value = {
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phoneNumber: user.phoneNumber || ''
        };

      } catch (err) {
        error.value = err instanceof Error ? err.message : t('errors.unknown');
        showError(error.value);
      } finally {
        isLoading.value = false;
      }
    };

    // Handle profile update with validation
    const handleUpdateProfile = async () => {
      try {
        if (!profileForm.value) return;
        
        isLoading.value = true;
        error.value = null;

        // Validate form
        const isValid = await profileForm.value.validate();
        if (!isValid) {
          throw new Error(t('errors.validation'));
        }

        // Validate data format
        if (!validateUserData(formData.value)) {
          throw new Error(t('errors.invalidData'));
        }

        // Update user profile
        await updateUser(userData.value!.id, {
          ...formData.value,
          securityPreferences: securityPreferences.value
        });

        showSuccess(t('profile.updateSuccess'));
        await loadUserProfile(); // Refresh data

      } catch (err) {
        error.value = err instanceof Error ? err.message : t('errors.unknown');
        showError(error.value);
      } finally {
        isLoading.value = false;
      }
    };

    // Handle secure logout
    const handleLogout = async () => {
      try {
        isLoading.value = true;
        await logout();
      } catch (err) {
        error.value = err instanceof Error ? err.message : t('errors.logoutFailed');
        showError(error.value);
      } finally {
        isLoading.value = false;
      }
    };

    // Reset form to last saved state
    const resetForm = () => {
      if (userData.value) {
        formData.value = {
          firstName: userData.value.firstName,
          lastName: userData.value.lastName,
          email: userData.value.email,
          phoneNumber: userData.value.phoneNumber || ''
        };
      }
      error.value = null;
    };

    // Initialize component
    onMounted(() => {
      loadUserProfile();
    });

    return {
      profileForm,
      userData,
      formData,
      isLoading,
      error,
      securityPreferences,
      securityContext,
      handleUpdateProfile,
      handleLogout,
      resetForm
    };
  }
});
</script>

<style lang="scss" scoped>
.user-profile-card {
  max-width: 600px;
  margin: 0 auto;
}

.security-status {
  border-radius: 4px;
  padding: 4px 8px;
}
</style>