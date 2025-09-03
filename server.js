const express = require("express");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const crypto = require("crypto");

const app = express();
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));

// In-memory user store
let users = {};
let clicks = 0;

// Helper: generate random ID
function genId() {
  return crypto.randomBytes(8).toString("hex");
}

// Home page
app.get("/", (req, res) => {
  const session = req.cookies.SESSION;
  const user = session ? users[session] : null;

  res.send(`
    <h1>Demo Hijack App</h1>
    ${user ? `<p>Logged in as: ${user.email}</p>` : "<p>Not logged in</p>"}

    <h2>Actions</h2>
    <p><a href="/register">Register</a></p>
    <p><a href="/login">Login</a></p>
    <p><a href="/logout">Logout</a></p>
    <p><a href="/deleteAccount">Delete Account</a></p>
    <p><a href="/adClick?id=123">Ad Click</a></p>
    <p><a href="/logHeaders">Log Headers</a></p>
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

  // Simple unique check
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
  delete users[session];
  res.clearCookie("SESSION");
  res.send("❌ Account deleted. <a href='/'>Home</a>");
});

// Ad click
app.get("/adClick", (req, res) => {
  clicks++;
  console.log("💰 Ad click recorded. Total:", clicks);
  res.send(`Ad click registered. Total: ${clicks}`);
});

// Log headers
app.get("/logHeaders", (req, res) => {
  console.log("📋 Headers from client:", req.headers);
  res.send("Headers logged (check server logs).");
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("🚀 Demo app running on port", PORT);
});
