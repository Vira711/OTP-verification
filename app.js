import open from "open";
import express from "express";
import session from "express-session";
import bodyParser from "body-parser";
import twilio from "twilio";


const app = express();
const PORT = 5000;

// Twilio Credentials (WARNING: Exposed credentials; reset them ASAP)
const TWILIO_ACCOUNT_SID = "AC041e88adb91a1d03148eda0a042ec129";
const TWILIO_AUTH_TOKEN = "dd0de9562b133e036733c61d7cd44c5e";
const TWILIO_PHONE_NUMBER = "+12765313874";

// Initialize Twilio client
const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

// Middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(
  session({
    secret: "your_secret_key",
    resave: false,
    saveUninitialized: true,
  })
);

// Function to generate a 6-digit OTP
function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// ------------------------------------------------
// Home Route: Phone Number Input
// ------------------------------------------------
app.get("/", (req, res) => {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>VOTE FOR CHANGE WITH BLOCKCHAIN</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: Arial, sans-serif;
      background: url('https://miro.medium.com/max/1400/1*Hl-Ig1I5Xo-uGDaK1vVVVw.jpeg') no-repeat center center fixed;
      background-size: cover;
      color: #fff;
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
    }
    .container {
      max-width: 400px;
      background: rgba(0, 0, 0, 0.8);
      padding: 20px;
      border-radius: 10px;
      box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
      text-align: center;
    }
    h2 {
      color: #00ffcc;
      font-size: 24px;
      margin-bottom: 20px;
    }
    form {
      display: flex;
      flex-direction: column;
    }
    input, button {
      padding: 10px;
      margin: 10px 0;
      border: none;
      border-radius: 5px;
    }
    input {
      background: #f9f9f9;
      color: #000;
    }
    button {
      background: #00ffcc;
      color: #000;
      font-weight: bold;
      cursor: pointer;
    }
    button:hover {
      background: #009999;
    }
  </style>
</head>
<body>
  <div class="container">
    <h2>VOTE FOR CHANGE WITH BLOCKCHAIN</h2>
    <form method="POST" action="/">
      <input type="text" name="phone" placeholder="Enter your phone number" required>
      <button type="submit">Send OTP</button>
    </form>
  </div>
</body>
</html>
  `;
  res.send(html);
});

// ------------------------------------------------
// Handle Phone Submission & Send OTP
// ------------------------------------------------
app.post("/", (req, res) => {
  const phone = req.body.phone;
  const otp = generateOtp();

  // Store OTP and timestamp in session
  req.session.otp = otp;
  req.session.otpTime = Date.now();
  req.session.phone = phone;

  // Send OTP SMS via Twilio
  client.messages
    .create({
      body: "Your OTP for the voting system is: " + otp,
      from: TWILIO_PHONE_NUMBER,
      to: phone,
    })
    .then(() => {
      res.redirect("/verify");
    })
    .catch((error) => {
      console.error("Error sending OTP:", error);
      res.send("<h2>Error sending OTP: " + error.message + "</h2>");
    });
});

// ------------------------------------------------
// OTP Verification Page (GET)
// ------------------------------------------------
app.get("/verify", (req, res) => {
  // Calculate remaining time (in seconds)
  const timeElapsed = (Date.now() - (req.session.otpTime || 0)) / 1000;
  const remainingTime = Math.max(60 - Math.floor(timeElapsed), 0);
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Verify OTP</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: Arial, sans-serif;
      background: url('https://miro.medium.com/max/1400/1*Hl-Ig1I5Xo-uGDaK1vVVVw.jpeg') no-repeat center center fixed;
      background-size: cover;
      color: #fff;
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
    }
    .container {
      max-width: 400px;
      background: rgba(0, 0, 0, 0.8);
      padding: 20px;
      border-radius: 10px;
      box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
      text-align: center;
    }
    h2 {
      color: #dc3545;
      font-size: 24px;
      margin-bottom: 20px;
    }
    form {
      display: flex;
      flex-direction: column;
    }
    input, button {
      padding: 10px;
      margin: 10px 0;
      border: none;
      border-radius: 5px;
    }
    input {
      background: #f9f9f9;
      color: #000;
    }
    button {
      background: #007bff;
      color: #fff;
      font-weight: bold;
      cursor: pointer;
    }
    button:hover {
      background: #0056b3;
    }
    .timer {
      margin-top: 10px;
      font-size: 16px;
      color: #ddd;
    }
  </style>
</head>
<body>
  <div class="container">
    <h2>OTP Verification</h2>
    <form method="POST" action="/verify">
      <input type="text" name="otp" placeholder="Enter OTP" required>
      <button type="submit">Verify OTP</button>
    </form>
    <div class="timer">
      Time remaining: ${remainingTime} seconds
    </div>
    <form method="GET" action="/">
      <button type="submit">Resend OTP</button>
    </form>
  </div>
</body>
</html>
  `;
  res.send(html);
});

// ------------------------------------------------
// Handle OTP Verification (POST)
// ------------------------------------------------
app.post("/verify", (req, res) => {
  const inputOtp = req.body.otp;
  const storedOtp = req.session.otp;
  const otpTime = req.session.otpTime;
  const timeElapsed = (Date.now() - otpTime) / 1000;
  let message = "";
  let success = false;

  if (timeElapsed > 60) {
    message = "OTP expired. Please request a new one.";
  } else if (inputOtp === storedOtp) {
    message = "OTP verified successfully! You can proceed to vote.";
    success = true;
    req.session.otp_verified = true;
  } else {
    message = "Invalid OTP. Please try again.";
  }

  // If verification is successful, redirect to voting page
  if (success) {
    return res.redirect("/vote");
  }

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Verify OTP</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: Arial, sans-serif;
      background: url('https://miro.medium.com/max/1400/1*Hl-Ig1I5Xo-uGDaK1vVVVw.jpeg') no-repeat center center fixed;
      background-size: cover;
      color: #fff;
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
    }
    .container {
      max-width: 400px;
      background: rgba(0, 0, 0, 0.8);
      padding: 20px;
      border-radius: 10px;
      box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
      text-align: center;
    }
    h2 {
      color: ${success ? "#28a745" : "#dc3545"};
      font-size: 24px;
      margin-bottom: 20px;
    }
    .message {
      padding: 15px;
      font-weight: bold;
      border-radius: 5px;
      margin-bottom: 20px;
      color: #fff;
      background: ${success ? "#28a745" : "#dc3545"};
    }
    form {
      display: flex;
      flex-direction: column;
    }
    input, button {
      padding: 10px;
      margin: 10px 0;
      border: none;
      border-radius: 5px;
    }
    input {
      background: #f9f9f9;
      color: #000;
    }
    button {
      background: #007bff;
      color: #fff;
      font-weight: bold;
      cursor: pointer;
    }
    button:hover {
      background: #0056b3;
    }
    .timer {
      margin-top: 10px;
      font-size: 16px;
      color: #ddd;
    }
  </style>
</head>
<body>
  <div class="container">
    <h2>${success ? "Success" : "OTP Verification"}</h2>
    <div class="message">${message}</div>
    <form method="POST" action="/verify">
      <input type="text" name="otp" placeholder="Enter OTP" required>
      <button type="submit">Verify OTP</button>
    </form>
    <div class="timer">
      Time remaining: ${Math.max(60 - Math.floor((Date.now() - otpTime) / 1000), 0)} seconds
    </div>
    ${!req.session.otp_verified ? '<form method="GET" action="/"><button type="submit">Resend OTP</button></form>' : ''}
  </div>
</body>
</html>
  `;
  res.send(html);
});

// ------------------------------------------------
// Voting Page (GET)
// ------------------------------------------------
app.get("/vote", (req, res) => {
  if (!req.session.otp_verified) {
    return res.redirect("/");
  }
  
  const html = `
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sign In</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css">
    <link rel="stylesheet" href="styles.css">
    <script src="https://kit.fontawesome.com/9e5ba2e3f5.js" crossorigin="anonymous"></script>
    <style>
        body {
            background: linear-gradient(to right, #74ebd5, #acb6e5);
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
        }

        .form-container {
            background: white;
            padding: 2rem;
            border-radius: 15px;
            box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
            width: 350px;
            text-align: center;
        }

        .form-group {
            position: relative;
            margin-bottom: 1.5rem;
        }

        .form-group input {
            width: 100%;
            padding: 10px 15px;
            border-radius: 25px;
            border: 1px solid #ccc;
            outline: none;
            transition: 0.3s;
        }

        .form-group input:focus {
            border-color: #74ebd5;
            box-shadow: 0 0 5px rgba(116, 235, 213, 0.5);
        }

        .btn {
            width: 100%;
            background: #74ebd5;
            border: none;
            padding: 10px;
            border-radius: 25px;
            font-size: 1rem;
            color: white;
            transition: 0.3s;
        }

        .btn:hover {
            background: #57c3b8;
        }

        .forgot-pass a {
            color: #57c3b8;
            text-decoration: none;
            font-weight: bold;
        }

        .link a {
            color: #57c3b8;
            text-decoration: none;
            font-weight: bold;
        }
    </style>
</head>

<body>
    <div class="form-container">
        <form id="loginForm">
            <h2 class="mb-4">Log In</h2>
            <div class="form-group">
                <input type="text" id="loginUsername" placeholder="Username" required>
            </div>
            <div class="form-group">
                <input type="password" id="loginPassword" placeholder="Password" required>
            </div>
            <div class="forgot-pass mb-3">
                <a href="#">Forgot password?</a>
            </div>
            <button type="submit" class="btn">Sign In</button>
            <div class="link mt-3">
                <p>Don't have an account? <a href="signup.html">Sign Up</a></p>
            </div>
        </form>
    </div>

    <script>
        document.getElementById("loginForm").addEventListener("submit", function (e) {
            e.preventDefault();
            const username = document.getElementById("loginUsername").value;
            const password = document.getElementById("loginPassword").value;

            const storedUsername = localStorage.getItem("username");
            const storedPassword = localStorage.getItem("password");

            if (username === storedUsername && password === storedPassword) {
                alert("Logged in successfully!");
                window.location.href = "dashboard.html";
            } else {
                alert("Invalid username or password!");
            }
        });
    </script>
</body>

</html>

  `;
  res.send(html);
});

// ------------------------------------------------
// Start the Server
// ------------------------------------------------
app.listen(PORT, async () => {
  const url = `http://localhost:${PORT}`;
  console.log(`Server running at ${url}`);

  try {
      await open(url); // Open the default browser with the server URL
  } catch (err) {
      console.error("Failed to open the browser:", err);
  }
}); 