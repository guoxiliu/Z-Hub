<script setup></script>

<template>
  <div class="container mt-5">
    <div class="p-5 mb-4 bg-light rounded-3">
      <div class="container-fluid py-5">
        <h1 class="display-5 fw-bold">Z-Hub for Compression</h1>
        <p class="col-md-8 fs-4">
          Z-Hub is a central resource for developers and users to share new modules, compressor
          compositions, analysis, and data. The platform promotes collaboration among researchers
          and developers working on scientific data compression.
        </p>
      </div>
    </div>

    <div class="row g-4">
      <div class="col-md-4">
        <div class="card h-100 shadow-sm">
          <div class="card-body">
            <h5 class="card-title">Compression Modules</h5>
            <p class="card-text">
              Browse compression modules contributed by the community and upload your own.
            </p>
            <RouterLink to="/modules" class="btn btn-primary">Check Modules</RouterLink>
          </div>
        </div>
      </div>
      <div class="col-md-4">
        <div class="card h-100 shadow-sm">
          <div class="card-body">
            <h5 class="card-title">Compressor Compositions</h5>
            <p class="card-text">Discover and share specific compositions for lossy compressors.</p>
            <RouterLink to="/compositions" class="btn btn-success">View Compositions</RouterLink>
          </div>
        </div>
      </div>
      <div class="col-md-4">
        <div class="card h-100 shadow-sm">
          <div class="card-body">
            <h5 class="card-title">Datasets</h5>
            <p class="card-text">
              Explore datasets for testing, benchmarking, and experimentation.
            </p>
            <RouterLink to="/datasets" class="btn btn-secondary">Browse Datasets</RouterLink>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
