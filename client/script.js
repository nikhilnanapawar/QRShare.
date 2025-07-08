console.log("✅ script.js loaded");

document.addEventListener("DOMContentLoaded", () => {
  console.log("✅ DOM loaded");

  const form = document.getElementById("loginForm");
  const passwordInput = document.getElementById("password");
  const toggle = document.getElementById("togglePassword");

  // ✅ Debug confirm
  console.log("📌 Form element:", form);

  // Password toggle
  toggle.addEventListener("click", () => {
    passwordInput.type = passwordInput.type === "password" ? "text" : "password";
    toggle.classList.toggle("fa-eye");
    toggle.classList.toggle("fa-eye-slash");
  });

  // Submit handler
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    console.log("🚀 SUBMIT button clicked");

    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value;

    console.log("📦 Payload:", { username, password });

    if (!username || !password) {
      return showToast("Please enter username and password", "error");
    }

    try {
      const res = await fetch("http://localhost:3000/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();

      if (data.success && data.token) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("userId", username);     // ✅ needed by dashboard.js
        localStorage.setItem("password", password);   // ✅ temporarily needed by upload/QR

        showToast("Login successful!", "success");
        setTimeout(() => {
          window.location.href = "dashboard.html";
        }, 1500);
      } else {
        showToast(data.error || "Login failed", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Server error", "error");
    }
  });
});

// ✅ Toast function
function showToast(message, type = "success") {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.className = `toast ${type}`;
  toast.style.display = "block";
  setTimeout(() => {
    toast.style.display = "none";
  }, 3000);
}
