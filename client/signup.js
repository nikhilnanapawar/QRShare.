document.getElementById('signupForm').onsubmit = async (e) => {
  e.preventDefault();

  const username = document.getElementById('username').value.trim();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value.trim();
  const confirmPassword = document.getElementById('confirmPassword').value.trim();

  if (!username || !email || !password || !confirmPassword) {
    showToast("Please fill all fields", "error");
    return;
  }

  if (password !== confirmPassword) {
    showToast("Passwords do not match", "error");
    return;
  }

  try {
    const res = await fetch('http://192.168.29.240:3000/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password })
    });

    const data = await res.json();
    if (data.success) {
      showToast("Account created!", "success");
      setTimeout(() => window.location.href = 'index.html', 1500);
    } else {
      showToast(data.error || "Signup failed", "error");
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

// Toggle password and confirm password visibility
document.getElementById('togglePassword').onclick = () => {
  const input = document.getElementById('password');
  toggleVisibility(input, 'togglePassword');
};

document.getElementById('toggleConfirmPassword').onclick = () => {
  const input = document.getElementById('confirmPassword');
  toggleVisibility(input, 'toggleConfirmPassword');
};

function toggleVisibility(input, iconId) {
  const icon = document.getElementById(iconId);
  const isHidden = input.type === 'password';
  input.type = isHidden ? 'text' : 'password';
  icon.classList.toggle("fa-eye");
  icon.classList.toggle("fa-eye-slash");
}
