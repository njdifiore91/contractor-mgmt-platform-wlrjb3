<template>
  <div class="admin-home">
    <div class="row q-pa-md">
      <div class="col-12">
        <h1 class="text-h4 q-mb-md">Admin Dashboard</h1>
        
        <div class="row q-col-gutter-md">
          <!-- Quick Stats -->
          <div class="col-12 col-md-3">
            <q-card class="stats-card">
              <q-card-section>
                <div class="text-h6">Total Users</div>
                <div class="text-h4">0</div>
              </q-card-section>
            </q-card>
          </div>
          
          <div class="col-12 col-md-3">
            <q-card class="stats-card">
              <q-card-section>
                <div class="text-h6">Active Contractors</div>
                <div class="text-h4">0</div>
              </q-card-section>
            </q-card>
          </div>
          
          <div class="col-12 col-md-3">
            <q-card class="stats-card">
              <q-card-section>
                <div class="text-h6">Pending Reviews</div>
                <div class="text-h4">0</div>
              </q-card-section>
            </q-card>
          </div>
          
          <div class="col-12 col-md-3">
            <q-card class="stats-card">
              <q-card-section>
                <div class="text-h6">System Health</div>
                <div class="text-h4">Good</div>
              </q-card-section>
            </q-card>
          </div>
        </div>

        <!-- Quick Actions -->
        <div class="row q-mt-md">
          <div class="col-12">
            <h2 class="text-h5 q-mb-md">Quick Actions</h2>
            <div class="row q-col-gutter-md">
              <div class="col-12 col-md-3">
                <q-btn
                  color="primary"
                  class="full-width"
                  to="/admin/users"
                  icon="people"
                  label="Manage Users"
                />
              </div>
              <div class="col-12 col-md-3">
                <q-btn
                  color="secondary"
                  class="full-width"
                  to="/admin/settings"
                  icon="settings"
                  label="System Settings"
                />
              </div>
              <div class="col-12 col-md-3">
                <q-btn
                  color="info"
                  class="full-width"
                  to="/admin/audit-logs"
                  icon="history"
                  label="View Audit Logs"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// Component logic will be added later
</script>

<style lang="scss" scoped>
.admin-home {
  .stats-card {
    height: 100%;
    transition: all 0.3s ease;

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
    }
  }
}
</style> 