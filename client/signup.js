document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("signupForm");
  const togglePass = document.getElementById("togglePassword");
  const toggleConfirm = document.getElementById("toggleConfirmPassword");
  const passwordInput = document.getElementById("password");
  const confirmInput = document.getElementById("confirmPassword");

  // Toggle password visibility
  togglePass.addEventListener("click", () => {
    const hidden = passwordInput.type === "password";
    passwordInput.type = hidden ? "text" : "password";
    togglePass.classList.toggle("fa-eye");
    togglePass.classList.toggle("fa-eye-slash");
  });

  toggleConfirm.addEventListener("click", () => {
    const hidden = confirmInput.type === "password";
    confirmInput.type = hidden ? "text" : "password";
    toggleConfirm.classList.toggle("fa-eye");
    toggleConfirm.classList.toggle("fa-eye-slash");
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = form.name.value.trim();
    const username = form.username.value.trim();
    const email = form.email.value.trim();
    const password = form.password.value;
    const confirm = form.confirmPassword.value;

    if (!name || !username || !email || !password || !confirm) {
      return showToast("All fields are required", "error");
    }

    if (password !== confirm) {
      return showToast("Passwords do not match", "error");
    }

    try {
      const res = await fetch("http://localhost:3000/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, username, email, password })
      });

      const data = await res.json();

      if (data.success) {
        localStorage.setItem("userId", username);
        localStorage.setItem("password", password);

        showToast("Signup successful! Redirecting...", "success");
        setTimeout(() => window.location.href = "dashboard.html", 1500);
      }else {
        showToast(data.error || "Signup failed", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Server error", "error");
    }
  });
});

// Toast
function showToast(msg, type = "success") {
  const toast = document.getElementById("toast");
  toast.textContent = msg;
  toast.className = `toast ${type}`;
  toast.style.display = "block";
  setTimeout(() => {
    toast.style.display = "none";
  }, 3000);
}
