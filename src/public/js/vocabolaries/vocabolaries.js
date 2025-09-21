function dropFilesInit(options={}) {
  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('fileInput');
  const browseBtn = document.getElementById('browseBtn');
  const filesList = document.getElementById('filesList');

  // Configure your target upload API URL here:
  const UPLOAD_URL = '/backend/fuseki/upload/vocabularies'; 

  browseBtn.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', e => handleFiles(e.target.files));

  // Drag events
  ['dragenter','dragover'].forEach(ev => {
    dropzone.addEventListener(ev, (e) => {
      e.preventDefault();
      //e.stopPropagation();
      dropzone.classList.add('dragover');
    });
  });

  ['dragleave','drop','dragend'].forEach(ev => {
    dropzone.addEventListener(ev, (e) => {
      e.preventDefault();
      //e.stopPropagation();
      dropzone.classList.remove('dragover');
    });
  });

  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    //e.stopPropagation();
    const dt = e.dataTransfer;
    if (dt && dt.files && dt.files.length) handleFiles(dt.files);
  });

  // keyboard accessibility: space or enter triggers browse
  dropzone.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fileInput.click();
    }
  });

  function handleFiles(fileList) {
    const files = Array.from(fileList);
    files.forEach(uploadFile);
  }

  async function uploadFile(file) {
    // Create UI row
    const row = document.createElement('div');
    row.className = 'file-row';
    const info = document.createElement('div');
    info.textContent = `${file.name} (${Math.round(file.size / 1024)} KB)`;
    const controls = document.createElement('div');

    const progressBar = document.createElement('div');
    progressBar.className = 'progress';
    const progressFill = document.createElement('span');
    progressBar.appendChild(progressFill);

    const status = document.createElement('span');
    status.style.marginLeft = '8px';

    controls.appendChild(progressBar);
    controls.appendChild(status);
    row.appendChild(info);
    row.appendChild(controls);
    filesList.appendChild(row);

    // FormData
    var form = new FormData();
    form.append('files', file);

    try {
      const response = await axios.post(UPLOAD_URL, form, {
        onUploadProgress: (evt) => {
          if (evt.lengthComputable) {
            const pct = Math.round((evt.loaded / evt.total) * 100);
            progressFill.style.width = pct + '%';
          }
        },
      });
      // Success
      progressFill.style.width = '100%';
      status.textContent = '✔️ ' + options.labels.upload_ok;
      status.style.color = 'green';
    } catch (err) {
      // Error
      status.textContent = '❌ ' + options.labels.upload_error + ': ' + (err.response?.data?.message || err.message);
      status.style.color = 'red';
    }
  }
}


    