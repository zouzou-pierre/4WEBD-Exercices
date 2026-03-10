const USER_API = "";
const ACCOUNT_API = "";
const TRANSFER_API = "";
const NOTIF_API = "";

let token = null;
let currentUser = null;

function $(id) { return document.getElementById(id); }

async function register() {
  try {
    const body = {
      firstName: $("regFirst").value,
      lastName: $("regLast").value,
      email: $("regEmail").value,
      password: $("regPass").value
    };
    const res = await fetch(`${USER_API}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (!res.ok) {
      return alert(data.error || "Erreur inscription");
    }
    alert("Inscription réussie ! Vous pouvez vous connecter.");
  } catch (e) {
    console.error("Register error:", e);
    alert("Erreur register (voir console)");
  }
}

async function login() {
  try {
    const body = {
      email: $("logEmail").value,
      password: $("logPass").value
    };
    const res = await fetch(`${USER_API}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (!res.ok || !data.token) {
      console.error("Login failed:", data);
      return alert(data.error || "Login failed");
    }
    token = data.token;
    currentUser = data.user;
    $("userInfo").classList.remove("hidden");
    $("userInfo").innerHTML = `<b>Connecté :</b> ${data.user.email} (${data.user.id})`;
  } catch (e) {
    console.error("Login error:", e);
    alert("Erreur login (voir console)");
  }
}

async function loadAccounts() {
  if (!token || !currentUser) return alert("Connecte-toi d'abord !");
  try {
    const res = await fetch(`${ACCOUNT_API}/api/accounts?ownerId=${encodeURIComponent(currentUser.id)}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    $("accounts").innerHTML = `<pre>${JSON.stringify(data, null, 2)}</pre>`;
  } catch (e) {
    console.error("Load accounts error:", e);
    alert("Erreur comptes (voir console)");
  }
}

async function transfer() {
  if (!token) return alert("Connecte-toi d'abord !");
  try {
    const body = {
      fromAccountId: $("fromAcc").value,
      toAccountId: $("toAcc").value,
      amount: Number($("amount").value)
    };
    const res = await fetch(`${TRANSFER_API}/api/transferts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    $("transferResult").innerHTML = `<pre>${JSON.stringify(data, null, 2)}</pre>`;
  } catch (e) {
    console.error("Transfer error:", e);
    alert("Erreur transfert (voir console)");
  }
}

async function loadNotifications() {
  try {
    const res = await fetch(`${NOTIF_API}/api/notifications`);
    const data = await res.json();
    $("notifications").innerHTML = `<pre>${JSON.stringify(data, null, 2)}</pre>`;
  } catch (e) {
    console.error("Notifications error:", e);
    alert("Erreur notifications (voir console)");
  }
}

// Bind après chargement du DOM
window.addEventListener("DOMContentLoaded", () => {
  $("btnRegister").addEventListener("click", register);
  $("btnLogin").addEventListener("click", login);
  $("btnLoadAccounts").addEventListener("click", loadAccounts);
  $("btnTransfer").addEventListener("click", transfer);
  $("btnLoadNotifications").addEventListener("click", loadNotifications);
});