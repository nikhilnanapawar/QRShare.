document.getElementById('loginForm').onsubmit = async (e) => {
  e.preventDefault();

  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value.trim();

  if (!username || !password) {
    showToast("Please enter both fields", "error");
    return;
  }

  try {
    const res = await fetch('http://192.168.29.240:3000/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();
    if (data.success) {
      localStorage.setItem('token', data.token);
      showToast("Login successful!", "success");
      setTimeout(() => window.location.href = 'dashboard.html', 1500);
    } else {
      showToast(data.error || "Login failed", "error");
    }
  } catch (err) {
    showToast("Server error!", "error");
  }
};

function showToast(message, type) {
  const toast = document.getElementById("toast");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  toast.style.display = "block";
  setTimeout(() => {
    toast.style.display = "none";
    toast.className = "toast";
  }, 3000);
}

document.getElementById('togglePassword').onclick = () => {
  const input = document.getElementById('password');
  const icon = document.getElementById('togglePassword');
  const isHidden = input.type === 'password';

  input.type = isHidden ? 'text' : 'password';
  icon.classList.toggle("fa-eye");
  icon.classList.toggle("fa-eye-slash");
};
