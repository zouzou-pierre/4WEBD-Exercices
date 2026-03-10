const USER_API = "http://localhost:3001";
const ACCOUNT_API = "http://localhost:3003";
const TRANSFER_API = "http://localhost:3004";
const NOTIF_API = "http://localhost:3002";

let token = null;

function $(id) { return document.getElementById(id); }

async function register() {
  try {
    const body = {
      firstName: $("regFirst").value,
      lastName: $("regLast").value,
      email: $("regEmail").value,
      password: $("regPass").value
    };
    const res = await fetch(`${USER_API}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const text = await res.text();
    alert(text);
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
    const res = await fetch(`${USER_API}/auth/login`, {
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
    $("userInfo").classList.remove("hidden");
    $("userInfo").innerHTML = `<b>Connecté :</b> ${data.user.email}`;
  } catch (e) {
    console.error("Login error:", e);
    alert("Erreur login (voir console)");
  }
}

async function loadAccounts() {
  if (!token) return alert("Connecte-toi d'abord !");
  try {
    const res = await fetch(`${ACCOUNT_API}/accounts`, {
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
    const res = await fetch(`${TRANSFER_API}/transfers`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(body)
    });
    const text = await res.text();
    $("transferResult").innerHTML = `<pre>${text}</pre>`;
  } catch (e) {
    console.error("Transfer error:", e);
    alert("Erreur transfert (voir console)");
  }
}

async function loadNotifications() {
  try {
    const res = await fetch(`${NOTIF_API}/notifications`);
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