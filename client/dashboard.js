// Logout
document.getElementById('logout').addEventListener('click', () => {
  localStorage.removeItem('token');
  showToast("Logged out successfully", "success");
});

// Render file list
function renderFileList(files) {
  const search = document.getElementById('searchInput').value.toLowerCase();
  const date = document.getElementById('dateFilter').value;
  const list = document.getElementById('fileList');

  const filtered = files.filter(f =>
    f.name.toLowerCase().includes(search) &&
    (!date || f.createdAt?.startsWith(date))
  );

  list.innerHTML = filtered.length ? '' : `<p>No matching files.</p>`;

  filtered.forEach(file => {
    const div = document.createElement('div');
    div.className = 'file-item';
    div.innerHTML = `
      <div class="file-top">
        <span class="file-name">${file.name}</span>
        <div class="file-menu">
          <button class="dots" onclick="toggleMenu(this)">⋮</button>
          <div class="popup-menu hidden">
            <button onclick="renameFile('${file.docId}', '${file.name}')">✏️ Rename</button>
            <button onclick="deleteFile('${file.docId}')">❌ Delete</button>
          </div>
        </div>
      </div>
      <div class="date">${file.createdAt ? new Date(file.createdAt).toLocaleString() : '—'}</div>
    `;
    list.appendChild(div);
  });
}

// Toggle popup
function toggleMenu(btn) {
  closeAllMenus();
  const popup = btn.nextElementSibling;
  popup.classList.toggle('hidden');
}

function closeAllMenus() {
  document.querySelectorAll('.popup-menu').forEach(menu => menu.classList.add('hidden'));
}

document.addEventListener('click', (e) => {
  if (!e.target.matches('.dots')) {
    closeAllMenus();
  }
});

function renameFile(docId, oldName) {
  const newName = prompt("Rename to:", oldName);
  if (!newName || newName === oldName) return;
  fetch(`http://localhost:3000/files/${docId}/rename`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ newName })
  }).then(() => {
    showToast("Renamed", "success");
    showFilesAndQR();
  });
}

function deleteFile(docId) {
  if (!confirm("Delete this file?")) return;
  fetch(`http://localhost:3000/files/${docId}`, { method: 'DELETE' })
    .then(() => {
      showToast("Deleted", "success");
      showFilesAndQR();
    });
}

// Load everything
function showFilesAndQR() {
  fetch('http://localhost:3000/files')
    .then(res => res.json())
    .then(data => {
      renderFileList(data.files || []);
      renderQR();
    })
    .catch(err => {
      document.getElementById('fileList').innerHTML = `<p style="color:red;">Failed to load files</p>`;
    });
}

// QR code render
function renderQR() {
  const url = 'http://localhost:3000/shared.html';
  document.getElementById('qrPreview').innerHTML = `
    <img src="https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(url)}&size=200x200" />
    <div style="margin-top: 10px;">
      <button class="share-btn" onclick="window.open('${url}')">Open</button>
      <button class="pdf-btn" onclick="downloadQR('${url}')">Download PDF</button>
    </div>
  `;
}

function downloadQR(url) {
  const qr = document.createElement('div');
  qr.innerHTML = `<img src="https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(url)}&size=200x200" />`;
  html2pdf().from(qr).save("SharedQR.pdf");
}

// DOM loaded
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById("username").textContent = localStorage.getItem('token') ? "User" : "Guest";
  showFilesAndQR();

  document.getElementById('searchInput').addEventListener('input', showFilesAndQR);
  document.getElementById('dateFilter').addEventListener('input', showFilesAndQR);

  const toggle = document.getElementById("togglePassword");
  const input = document.getElementById("filePassword");
  toggle?.addEventListener("click", () => {
    input.type = input.type === "password" ? "text" : "password";
    toggle.classList.toggle("fa-eye");
    toggle.classList.toggle("fa-eye-slash");
  });
});

// Card toggle
function toggleCard(id) {
  const content = document.getElementById(`content-${id}`);
  const icon = document.getElementById(`icon-${id}`);
  content.classList.toggle('active');
  icon.style.transform = content.classList.contains('active') ? "rotate(180deg)" : "rotate(0deg)";
}

// Upload
document.getElementById('uploadForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const file = document.getElementById('fileInput').files[0];
  const password = document.getElementById('filePassword').value;

  if (!file || !password) return showToast("File and password required", "error");

  const formData = new FormData();
  formData.append('file', file);
  formData.append('password', password);

  const res = await fetch('http://localhost:3000/upload', {
    method: 'POST',
    body: formData
  });

  const data = await res.json();
  if (data.qr) {
    document.getElementById('qrPreviewUpload').innerHTML = `
      <h4>QR Updated</h4>
      <img src="${data.qr}" />
    `;
    showToast("Uploaded", "success");
    setTimeout(showFilesAndQR, 800);
  } else {
    showToast(data.error || "Upload failed", "error");
  }
});

// Drag-drop
const dropArea = document.getElementById('dropArea');
const fileInput = document.getElementById('fileInput');

dropArea.addEventListener('click', () => fileInput.click());
dropArea.addEventListener('dragover', e => {
  e.preventDefault(); dropArea.classList.add('drag-over');
});
dropArea.addEventListener('dragleave', () => dropArea.classList.remove('drag-over'));
dropArea.addEventListener('drop', e => {
  e.preventDefault();
  dropArea.classList.remove('drag-over');
  fileInput.files = e.dataTransfer.files;
});

// Contact
document.getElementById('contactForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const { name, email, message } = e.target;
  if (!name.value || !email.value || !message.value)
    return showToast("Please fill all fields", "error");

  const res = await fetch('http://localhost:3000/contact', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: name.value,
      email: email.value,
      message: message.value
    })
  });

  const data = await res.json();
  showToast(data.success ? "Message sent" : data.error, data.success ? "success" : "error");
});

// Toast
function showToast(msg, type = "success") {
  const toast = document.getElementById('toast');
  toast.className = `toast ${type}`;
  toast.textContent = msg;
  toast.style.display = "block";
  setTimeout(() => toast.style.display = "none", 3000);
}
