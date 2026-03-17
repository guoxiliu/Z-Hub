<script setup>
import { ref, onMounted } from 'vue';

const sdrbenchDatasets = ref([]);
const loading = ref(false);
const sdrError = ref('');

// Helper function to linkify URLs in text
function linkifySource(text) {
  if (!text) return text;

  // Regular expression to detect URLs
  const urlRegex = /(https?:\/\/[^\s]+)/g;

  // Check if text contains a URL
  if (urlRegex.test(text)) {
    // If the entire text is just a URL, return it as a link
    const match = text.match(/^(https?:\/\/[^\s]+)$/);
    if (match) {
      return `<a href="${match[1]}" target="_blank" rel="noopener noreferrer">${match[1]}</a>`;
    }

    // Otherwise, replace URLs within the text
    return text.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
  }

  return text;
}

async function loadSdrbenchDatasets() {
  sdrError.value = '';
  try {
    const response = await fetch('/Z-Hub/sdrbench-datasets.json');
    if (!response.ok) {
      throw new Error(`Failed to load SDRBench datasets: ${response.statusText}`);
    }
    const data = await response.json();
    sdrbenchDatasets.value = data;
  } catch (err) {
    console.error('Error loading SDRBench datasets:', err);
    sdrError.value = `Failed to load SDRBench datasets: ${err.message}`;
    sdrbenchDatasets.value = [];
  }
}

async function loadAll() {
  loading.value = true;
  await loadSdrbenchDatasets();
  loading.value = false;
}

onMounted(loadAll);
</script>

<template>
  <div class="container py-4">
    <h2 class="mb-3">Datasets</h2>
    <p class="text-muted mb-3">
      Explore datasets for testing, benchmarking, and experimentation.
    </p>

    <div class="d-flex justify-content mb-3">
      <button class="btn btn-outline-secondary" :disabled="loading" @click="loadAll">
        <span v-if="!loading"><i class="bi bi-arrow-clockwise me-1"></i>Reload lists</span>
        <span v-else class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
      </button>
    </div>

    <div class="accordion" id="datasetsAccordion">
      <!-- SDRBench datasets -->
      <div class="accordion-item">
        <h2 class="accordion-header" id="heading-sdr">
          <button
            class="accordion-button fs-5"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#collapse-sdr"
            aria-expanded="true"
            aria-controls="collapse-sdr"
          >
            SDRBench datasets
          </button>
        </h2>
        <div
          id="collapse-sdr"
          class="accordion-collapse collapse show"
          aria-labelledby="heading-sdr"
        >
          <div class="accordion-body">
            <div class="alert alert-info">
              <p class="fw-bold">Important: when publishing results from one or more datasets presented in this webpage, please:</p>
              <ul>
                <li><strong>Cite:</strong> SDRBench: <a href="https://sdrbench.github.io" target="_blank" rel="noopener">https://sdrbench.github.io</a></li>
                <li><strong>Please also cite:</strong> K. Zhao, S. Di, X. Liang, S. Li, D. Tao, J. Bessac, Z. Chen, and F. Cappello, “SDRBench: Scientific Data Reduction Benchmark for Lossy Compressors”, <em>International Workshop on Big Data Reduction (IWBDR2020)</em>, in conjunction with IEEE Bigdata20.</li>
                <li><strong>Acknowledge:</strong> the source of the dataset you used, the DOE NNSA ECP project, and the ECP CODAR project.</li>
                <li><strong>Check:</strong> the condition of publications (some dataset sources request prior check)</li>
                <li><strong>Contact:</strong> the compressor authors to get the correct compressor configuration according to each dataset and each comparison metrics.</li>
                <li><strong>Dimension:</strong> the order of the dimensions shown in the 'Format' column of the table is in <strong>row-major order</strong> (aka. C order), which is consistent with well-known I/O libraries such as HDF5. For example, for the CESM-ATM dataset (1800 &times; 3600), 1800 is higher dimension (changing slower) and 3600 is lower dimension (changing faster). For most compressors (such as SZ, ZFP and FPZIP), the dimensions should be given in the reverse order (such as -2 3600 1800) for their executables. If you are not sure about the order of dimension, one simple method is trying different dimension orders and selecting the results with highest compression ratios.</li>
              </ul>
            </div>
            <div v-if="sdrError" class="alert alert-warning" role="alert">{{ sdrError }}</div>

            <!-- Important Note about SDRBench Usage -->
            <div class="alert alert-info mb-4" role="alert">
              <h6 class="alert-heading fw-bold mb-3">Important: When publishing results from one or more datasets presented in this webpage, please:</h6>
              <ul class="mb-0">
                <li class="mb-2">
                  <strong>Cite:</strong> SDRBench: <a href="https://sdrbench.github.io" target="_blank" rel="noopener" class="alert-link">https://sdrbench.github.io</a>
                </li>
                <li class="mb-2">
                  <strong>Please also cite:</strong> K. Zhao, S. Di, X. Liang, S. Li, D. Tao, J. Bessac, Z. Chen, and F. Cappello, "SDRBench: Scientific Data Reduction Benchmark for Lossy Compressors", International Workshop on Big Data Reduction (IWBDR2020), in conjunction with IEEE Bigdata20.
                </li>
                <li class="mb-2">
                  <strong>Acknowledge:</strong> the source of the dataset you used, the DOE NNSA ECP project, and the ECP CODAR project.
                </li>
                <li class="mb-2">
                  <strong>Check:</strong> the condition of publications (some dataset sources request prior check)
                </li>
                <li class="mb-2">
                  <strong>Contact:</strong> the compressor authors to get the correct compressor configuration according to each dataset and each comparison metrics.
                </li>
                <li>
                  <strong>Dimension:</strong> the order of the dimensions shown in the 'Format' column of the table is in row-major order (aka. C order), which is consistent with well-known I/O libraries such as HDF5. For example, for the CESM-ATM dataset (1800 × 3600), 1800 is higher dimension (changing slower) and 3600 is lower dimension (changing faster). For most compressors (such as SZ, ZFP and FPZIP), the dimensions should be given in the reverse order (such as <code>-2 3600 1800</code>) for their executables. If you are not sure about the order of dimension, one simple method is trying different dimension orders and selecting the results with highest compression ratios.
                </li>
              </ul>
            </div>

            <!-- Original SDRBench table (sanitized) -->
            <div class="table-responsive mb-4">
              <table class="table table-bordered align-middle" style="min-width: 1000px;">
                <thead>
                  <tr>
                    <th class="text-center" style="width: 194px; color:#0070c0;">Name</th>
                    <th class="text-center" style="width: 121px; color:#0070c0;">Type</th>
                    <th class="text-center" style="width: 297px; color:#0070c0;">Format</th>
                    <th class="text-center" style="width: 116px; color:#0070c0;">Size (data)</th>
                    <th class="text-center" style="width: 260px; color:#0070c0;">Command Examples</th>
                    <th class="text-center" style="width: 89px; color:#0070c0;">Link</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="dataset in sdrbenchDatasets" :key="dataset.name">
                    <!-- Name column -->
                    <td>
                      <div class="fw-bold text-center">{{ dataset.name }}</div>
                      <div class="text-center small text-muted mt-2 break-url" v-if="dataset.source">
                        <em>Source: <br><span v-html="linkifySource(dataset.source)" style="white-space: pre-line;"></span></em>
                      </div>
                      <div class="text-center small text-muted mt-2" v-if="dataset.contact" style="white-space: pre-line;">
                        <em>Contact: {{ dataset.contact }}</em>
                      </div>
                      <div class="text-center small text-warning mt-2" v-if="dataset.disclaimer">
                        <em>{{ dataset.disclaimer }}</em>
                      </div>
                    </td>

                    <!-- Type column -->
                    <td class="text-center" style="white-space: pre-line;">{{ dataset.type }}</td>

                    <!-- Format column with entropy table -->
                    <td>
                      <div class="text-center small" style="white-space: pre-line;" v-html="dataset.format.replace(/ x /g, ' &times; ')"></div>

                      <!-- Single entropy table -->
                      <div v-if="dataset.entropy" class="my-3">
                        <div class="text-center fw-semibold small mb-1">Entropy</div>
                        <table class="table table-sm table-bordered mb-0 small">
                          <thead>
                            <tr>
                              <th style="width:60px"></th>
                              <th class="text-center">8 bit</th>
                              <th class="text-center">32 bit</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <th class="text-center">avg</th>
                              <td class="text-center">{{ dataset.entropy.avg8 }}</td>
                              <td class="text-center">{{ dataset.entropy.avg32 }}</td>
                            </tr>
                            <tr>
                              <th class="text-center">min</th>
                              <td class="text-center">{{ dataset.entropy.min8 }}</td>
                              <td class="text-center">{{ dataset.entropy.min32 }}</td>
                            </tr>
                            <tr>
                              <th class="text-center">max</th>
                              <td class="text-center">{{ dataset.entropy.max8 }}</td>
                              <td class="text-center">{{ dataset.entropy.max32 }}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      <!-- Multiple entropy tables for datasets with multiple parts -->
                      <div v-if="dataset.entropyMulti" class="my-3">
                        <div class="text-center fw-semibold small mb-1">Entropy</div>
                        <table class="table table-sm table-bordered mb-0 small">
                          <thead>
                            <tr>
                              <th style="width:60px"></th>
                              <th class="text-center">8 bit</th>
                              <th class="text-center">32 bit</th>
                            </tr>
                          </thead>
                          <tbody>
                            <template v-for="(ent, idx) in dataset.entropyMulti" :key="idx">
                              <tr v-if="ent.label">
                                <th colspan="3" class="text-center">{{ ent.label }}</th>
                              </tr>
                              <tr>
                                <th class="text-center">avg</th>
                                <td class="text-center">{{ ent.avg8 }}</td>
                                <td class="text-center">{{ ent.avg32 }}</td>
                              </tr>
                              <tr>
                                <th class="text-center">min</th>
                                <td class="text-center">{{ ent.min8 }}</td>
                                <td class="text-center">{{ ent.min32 }}</td>
                              </tr>
                              <tr>
                                <th class="text-center">max</th>
                                <td class="text-center">{{ ent.max8 }}</td>
                                <td class="text-center">{{ ent.max32 }}</td>
                              </tr>
                            </template>
                          </tbody>
                        </table>
                      </div>
                    </td>

                    <!-- Size column -->
                    <td>
                      <div v-for="(size, idx) in dataset.sizes" :key="idx" class="text-center small mb-2">
                        {{ size }}
                      </div>
                      <div v-if="dataset.sizeNote" class="text-center small text-muted">
                        {{ dataset.sizeNote }}
                      </div>
                    </td>

                    <!-- Commands column -->
                    <td class="small">
                      <div v-for="(cmd, idx) in dataset.commands" :key="idx" class="mb-2">
                        <div v-if="cmd.tool">
                          <div class="d-flex align-items-start gap-2">
                            <div class="flex-grow-1">
                              <strong>{{ cmd.tool }}</strong>: <code class="text-break">{{ cmd.cmd }}</code>
                            </div>
                          </div>
                          <div v-if="cmd.tool === 'LibPressio' && cmd.cmd !== 'N/A'" class="text-muted small mt-1">where $COMP can be sz, zfp, sz3, mgard, etc…</div>
                        </div>
                        <div v-else-if="cmd.note" class="text-muted mt-3">
                          {{ cmd.note }}
                        </div>
                      </div>
                    </td>

                    <!-- Links column -->
                    <td class="small">
                      <div v-for="(link, idx) in dataset.links" :key="idx" class="text-center mb-2">
                        <a :href="link.url" target="_blank" rel="noopener">{{ link.label }}</a>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="mt-4">
              <h5>File Extension Convention</h5>
              <p>In general, the extension of the data file is named in the following convention:</p>
              <ul>
                <li><code>.f32</code> means single-precision floating point data in little-endian type</li>
                <li><code>.F32</code> means single-precision floating point data in big-endian type</li>
                <li><code>.f64</code> means double-precision floating point data in little-endian type</li>
                <li><code>.F64</code> means double-precision floating point data in big-endian type</li>
              </ul>

              <h5>Dataset Submissions</h5>
              <p>
                To submit a proposal for a new dataset, please email
                <a href="mailto:codar-reduction@cels.anl.gov">codar-reduction@cels.anl.gov</a>.
                <strong>Requirements:</strong> Datasets must be open to public access and linked to a simulation application or a scientific instrument. Metadata should explain the source origin and how it was produced (what simulation, instrument, settings). Upon review by the SDRBenchmarks committee, the dataset may be added to the repository.
              </p>

              <h5>Lossy Compressors</h5>
              <ul>
                <li><strong>SZ:</strong> <a href="https://github.com/szcompressor/SZ" target="_blank" rel="noopener">https://github.com/szcompressor/SZ</a></li>
                <li><strong>ZFP:</strong> <a href="https://github.com/LLNL/zfp" target="_blank" rel="noopener">https://github.com/LLNL/zfp</a></li>
                <li><strong>TTHRESH:</strong> <a href="https://github.com/rballester/tthresh" target="_blank" rel="noopener">https://github.com/rballester/tthresh</a></li>
                <li><strong>MGARD:</strong> <a href="https://github.com/CODARcode/MGARD" target="_blank" rel="noopener">https://github.com/CODARcode/MGARD</a></li>
                <li><strong>SPERR:</strong> <a href="https://github.com/NCAR/SPERR" target="_blank" rel="noopener">https://github.com/NCAR/SPERR</a></li>
                <li><strong>ISABELA:</strong> <a href="http://freescience.org/cs/ISABELA/ISABELA.html" target="_blank" rel="noopener">http://freescience.org/cs/ISABELA/ISABELA.html</a></li>
                <li><strong>PFPL:</strong> <a href="https://github.com/burtscher/PFPL" target="_blank" rel="noopener">https://github.com/burtscher/PFPL</a></li>
                <li><strong>DCTZ:</strong> <a href="https://github.com/swson/DCTZ" target="_blank" rel="noopener">https://github.com/swson/DCTZ</a></li>
                <li><strong>Digit rounding:</strong> <a href="https://github.com/CNES/Digit_Rounding" target="_blank" rel="noopener">https://github.com/CNES/Digit_Rounding</a> (standalone: <a href="https://github.com/disheng222/digitroundingZ" target="_blank" rel="noopener">https://github.com/disheng222/digitroundingZ</a>)</li>
                <li><strong>Bit grooming:</strong> <a href="https://github.com/nco/nco" target="_blank" rel="noopener">https://github.com/nco/nco</a> (standalone: <a href="https://github.com/disheng222/BitGroomingZ.git" target="_blank" rel="noopener">https://github.com/disheng222/BitGroomingZ.git</a>)</li>
                <li><strong>Others:</strong> please submit your suggestion with a GitHub link to <a href="mailto:codar-reduction@cels.anl.gov">codar-reduction@cels.anl.gov</a>.</li>
              </ul>

              <h5>Lossless Compressors</h5>
              <ul>
                <li><strong>FPZIP:</strong> <a href="https://computation.llnl.gov/projects/floating-point-compression" target="_blank" rel="noopener">https://computation.llnl.gov/projects/floating-point-compression</a></li>
                <li><strong>ZFP:</strong> <a href="https://github.com/LLNL/zfp" target="_blank" rel="noopener">https://github.com/LLNL/zfp</a></li>
                <li><strong>FPC:</strong> <a href="http://cs.txstate.edu/~burtscher/research/FPC/" target="_blank" rel="noopener">http://cs.txstate.edu/~burtscher/research/FPC/</a></li>
                <li><strong>pFPC (parallel):</strong> <a href="http://cs.txstate.edu/~burtscher/research/pFPC/" target="_blank" rel="noopener">http://cs.txstate.edu/~burtscher/research/pFPC/</a></li>
                <li><strong>SPDP:</strong> <a href="http://cs.txstate.edu/~burtscher/research/SPDP/" target="_blank" rel="noopener">http://cs.txstate.edu/~burtscher/research/SPDP/</a></li>
                <li><strong>GFC (GPUs):</strong> <a href="http://cs.txstate.edu/~burtscher/research/GFC/" target="_blank" rel="noopener">http://cs.txstate.edu/~burtscher/research/GFC/</a></li>
                <li><strong>MPC (GPUs):</strong> <a href="http://cs.txstate.edu/~burtscher/research/MPC" target="_blank" rel="noopener">http://cs.txstate.edu/~burtscher/research/MPC</a></li>
                <li><strong>BLOSC:</strong> <a href="https://github.com/Blosc/c-blosc" target="_blank" rel="noopener">https://github.com/Blosc/c-blosc</a></li>
                <li><strong>Fpcompress:</strong> <a href="https://github.com/burtscher/FPcompress/" target="_blank" rel="noopener">https://github.com/burtscher/FPcompress/</a></li>
                <li><strong>Others:</strong> please submit your suggestion with a GitHub link to <a href="mailto:codar-reduction@cels.anl.gov">codar-reduction@cels.anl.gov</a>.</li>
              </ul>

              <h5>Unifying Generic Interface for Compression (Lossy and Lossless)</h5>
              <ul>
                <li><strong>LibPressio:</strong> <a href="https://robertu94.github.io/libpressio/" target="_blank" rel="noopener">https://robertu94.github.io/libpressio/</a></li>
              </ul>

              <h5>Commonly Used Metrics for Reduction Technique Assessment</h5>
              <ul>
                <li>Reduction/reconstruction rate in [G|M|K]B/s</li>
                <li>Reduction ratio (Initial size/compressed size)</li>
                <li>[Lossy] Rate distortion (PSNR at different bit rates)</li>
                <li>[Lossy] PSNR in dB, MSE, RMSE and NRMSE</li>
                <li>[Lossy] SSIM (structural similarity index)</li>
                <li>[Lossy] Pearson correlation of the initial and reconstructed dataset</li>
                <li>[Lossy] Autocorrelation of the compression error (1D, … nD)</li>
                <li>[Lossy] Spectral alteration (difference of power spectrum)</li>
                <li>[Lossy] Preservation of the n order derivatives</li>
                <li><strong>Others:</strong> please submit your suggestion to <a href="mailto:codar-reduction@cels.anl.gov">codar-reduction@cels.anl.gov</a>.</li>
              </ul>

              <h5>Error Controls</h5>
              <ul>
                <li>[Common] Point wise absolute error bound</li>
                <li>[Common] Point wise relative error bound</li>
                <li>[Variation] Value range point wise relative error bound</li>
                <li>[Other] Fixed PSNR</li>
              </ul>

              <h5>Assessment Tools, Metrics and Error Control</h5>
              <ul>
                <li><strong>Z-checker:</strong> <a href="https://github.com/CODARcode/Z-checker" target="_blank" rel="noopener">https://github.com/CODARcode/Z-checker</a></li>
                <li><strong>Foresight:</strong> <a href="https://github.com/lanl/VizAly-Foresight" target="_blank" rel="noopener">https://github.com/lanl/VizAly-Foresight</a></li>
                <li><strong>ldcpy:</strong> <a href="https://github.com/NCAR/ldcpy" target="_blank" rel="noopener">https://github.com/NCAR/ldcpy</a></li>
                <li><strong>SFS:</strong> <a href="https://github.com/JulianKunkel/statistical-file-scanner" target="_blank" rel="noopener">https://github.com/JulianKunkel/statistical-file-scanner</a></li>
                <li><strong>Others:</strong> please submit your suggestion with a GitHub link to <a href="mailto:codar-reduction@cels.anl.gov">codar-reduction@cels.anl.gov</a>.</li>
              </ul>

              <h5>Contributors/Maintainers</h5>
              <p>F. Cappello (ANL, lead), M. Ainsworth (Brown University), J. Bessac (ANL), Martin Burtscher (Texas State University), Jong Youl Choi (ORNL), E. Constantinescu (ANL), S. Di (ANL), H. Guo (ANL), Peter Lindstrom (LLNL), Ozan Tugluk (Brown University).</p>

              <h5>Acknowledgements</h5>
              <p>We sincerely acknowledge that the following contributors agreed on the release of their scientific datasets: Salman Habib (ANL), Katrin Heitmann (ANL), Zarija Lubik (LBNL), Rob Jacob (ANL), Danny Perez (LANL), Chun Hong Yoon (SLAC), Kristopher W. Keipert (ANL), Guo-Yuan Lien (Central Weather Bureau Taiwan), Ye Luo (ANL), Peter Lindstrom (LLNL), Hemanth Kolla (SNL), Jong Choi (ORNL), Michael Churchill (PPPL), Ozan Tugluk (Brown University).</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Community datasets -->
      <div class="accordion-item">
        <h2 class="accordion-header" id="heading-community">
          <button
            class="accordion-button collapsed fs-5"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#collapse-community"
            aria-expanded="false"
            aria-controls="collapse-community"
          >
            Community datasets
          </button>
        </h2>
        <div
          id="collapse-community"
          class="accordion-collapse collapse"
          aria-labelledby="heading-community"
        >
          <div class="accordion-body">
            <div class="alert alert-info mb-0" role="alert">
              No community datasets yet.
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.table-hover > tbody > tr:hover .table {
  background-color: transparent;
}

.table-hover > tbody > tr:hover .table th,
.table-hover > tbody > tr:hover .table td {
  background-color: transparent;
}

.break-url {
  word-break: break-word;
  overflow-wrap: break-word;
  hyphens: none;
}

.break-url a {
  word-break: break-all;
  overflow-wrap: anywhere;
  hyphens: none;
}

/* Force horizontal scrollbar to always be visible */
.table-responsive {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

/* Always show scrollbars (override macOS auto-hide) */
.table-responsive::-webkit-scrollbar {
  -webkit-appearance: none;
  height: 10px;
}

.table-responsive::-webkit-scrollbar-thumb {
  border-radius: 5px;
  background-color: rgba(0, 0, 0, 0.3);
  -webkit-box-shadow: 0 0 1px rgba(255, 255, 255, 0.5);
}

.table-responsive::-webkit-scrollbar-track {
  background-color: rgba(0, 0, 0, 0.05);
  border-radius: 5px;
}

</style>
