const express = require("express");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const crypto = require("crypto");

const path = require("path");

const app = express();
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));
// serve static files from /public
app.use("/static", express.static(path.join(__dirname, "public")));

// In-memory user store
let users = {};
let clicks = 0;
let lastDeletedAccount = null;
let lastHeaderLog = null; // store only the last log
let phishedCreds = [];

// Helper: generate random ID
function genId() {
  return crypto.randomBytes(8).toString("hex");
}

// Home page
app.get("/", (req, res) => {
  const session = req.cookies.SESSION;
  const user = session ? users[session] : null;

  // Build user list
  const userList = Object.values(users)
    .map((u) => `<li>${u.email}</li>`)
    .join("");

  // Last header log
  const headerBlock = lastHeaderLog
    ? `<div class="log"><pre>${JSON.stringify(
        lastHeaderLog,
        null,
        2
      )}</pre></div>`
    : "<p>No headers logged yet.</p>";

  res.send(`
    <html>
    <head>
      <title>Demo Hijack App</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          background: #f4f6f9;
          color: #333;
          margin: 0;
          padding: 0;
        }
        .container {
          max-width: 900px;
          margin: auto;
          padding: 20px;
        }
        h1 {
          text-align: center;
          color: #444;
        }
        .card {
          background: #fff;
          padding: 20px;
          margin: 20px 0;
          border-radius: 12px;
          box-shadow: 0 2px 6px rgba(0,0,0,0.1);
        }
        .card h2 {
          margin-top: 0;
          color: #555;
        }
        ul {
          padding-left: 20px;
        }
        a {
          display: inline-block;
          margin: 5px 0;
          color: #0077cc;
          text-decoration: none;
        }
        a:hover {
          text-decoration: underline;
        }
        .success {
          color: green;
        }
        .danger {
          color: red;
        }
        .log {
          background: #272822;
          color: #f8f8f2;
          padding: 10px;
          border-radius: 8px;
          margin-bottom: 15px;
          overflow-x: auto;
        }
        pre {
          margin: 0;
          font-family: monospace;
          font-size: 13px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🚀 Demo App</h1>
        <p>${
          user
            ? `<span class="success">✅ Logged in as: ${user.email}</span>`
            : `<span class="danger">❌ Not logged in</span>`
        }</p>

        <div class="card">
          <h2>Actions</h2>
          <a href="/register">📝 Register</a><br>
          <a href="/login">🔑 Login</a><br>
          <a href="/logout">🚪 Logout</a><br>
          <a href="/deleteAccount">🗑️ Delete Account</a><br>
          <a href="/adClick?id=123">💰 Ad Click</a><br>
          <a href="/logHeaders">📋 Log Headers</a>
        </div>

        <div class="card">
          <h2>System Info</h2>
          <p><b>Click Counter:</b> ${clicks}</p>
          <p><b>Registered Emails:</b></p>
          <ul>${userList || "<li>None</li>"}</ul>
          <p><b>Last Deleted Account:</b> ${
            lastDeletedAccount ? lastDeletedAccount : "None"
          }</p>
        </div>

        <div class="card">
          <h2>Last Logged Headers</h2>
          ${headerBlock}
        </div>
      </div>
    </body>
    </html>
  `);
});

// Registration form
app.get("/register", (req, res) => {
  res.send(`
    <h1>Register</h1>
    <form method="POST" action="/register">
      Email: <input type="text" name="email" /><br>
      Password: <input type="password" name="password" /><br>
      <button type="submit">Register</button>
    </form>
  `);
});

app.post("/register", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.send("❌ Missing fields");

  if (Object.values(users).some((u) => u.email === email)) {
    return res.send("❌ User already exists");
  }

  const id = genId();
  users[id] = { id, email, password };
  res.send(`✅ Registered as ${email}. <a href="/login">Login</a>`);
});

// Login form
app.get("/login", (req, res) => {
  res.send(`
    <h1>Login</h1>
    <form method="POST" action="/login">
      Email: <input type="text" name="email" /><br>
      Password: <input type="password" name="password" /><br>
      <button type="submit">Login</button>
    </form>
  `);
});

app.post("/login", (req, res) => {
  const { email, password } = req.body;
  const user = Object.values(users).find(
    (u) => u.email === email && u.password === password
  );
  if (!user) return res.send("❌ Invalid credentials");

  res.cookie("SESSION", user.id, { httpOnly: false });
  res.send(`✅ Logged in as ${email}. <a href="/">Home</a>`);
});

// Logout
app.get("/logout", (req, res) => {
  res.clearCookie("SESSION");
  res.send("✅ Logged out. <a href='/'>Home</a>");
});

// Delete account
app.get("/deleteAccount", (req, res) => {
  const session = req.cookies.SESSION;
  if (!session || !users[session]) {
    return res.send("❌ Not logged in");
  }
  console.log("⚠️ Account deleted for user:", users[session].email);
  lastDeletedAccount = users[session].email;
  delete users[session];
  res.clearCookie("SESSION");
  res.send("❌ Account deleted. <a href='/'>Home</a>");
});

// Ad click
app.get("/adClick", (req, res) => {
  clicks++;
  console.log("💰 Ad click recorded. Total:", clicks);
  res.send(`Ad click registered. Total: ${clicks}. <a href="/">Home</a>`);
});

// Log headers
app.get("/logHeaders", (req, res) => {
  console.log("📋 Headers from client:", req.headers);
  lastHeaderLog = req.headers; // overwrite with last request only
  res.send("Headers logged. <a href='/'>See Home</a>");
});

// Fake phishing page
app.get("/phish", (req, res) => {
  res.send(`
    <html>
    <head><title>🔒 Fake Login</title></head>
    <body style="font-family: Arial; background:#f9f9f9; text-align:center; padding:50px;">
      <h1>Login Required</h1>
      <form method="POST" action="/steal" style="display:inline-block; text-align:left; background:#fff; padding:20px; border-radius:8px; box-shadow:0 2px 6px rgba(0,0,0,0.1);">
        <label>Email:</label><br>
        <input type="text" name="email" /><br><br>
        <label>Password:</label><br>
        <input type="password" name="password" /><br><br>
        <button type="submit">Login</button>
      </form>
    </body>
    </html>
  `);
});

// Collect phished credentials
app.post("/steal", (req, res) => {
  const { email, password } = req.body;
  phishedCreds.push({ email, password, time: new Date().toISOString() });
  console.log("⚠️ Phished credentials:", email, password);
  res.send("❌ Invalid login. Try again. <a href='/'>Home</a>");
});

// Show stolen credentials (for demo only!)
app.get("/stolen", (req, res) => {
  const list = phishedCreds
    .map((c) => `<li>${c.email} / ${c.password} (${c.time})</li>`)
    .join("");
  res.send(`
    <h1>⚠️ Stolen Credentials</h1>
    <ul>${list || "<li>None yet</li>"}</ul>
    <a href="/">Home</a>
  `);
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("🚀 Demo app running on port", PORT);
});
