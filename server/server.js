const dns = require("dns");

dns.setServers(["8.8.8.8", "1.1.1.1"]);

const http = require("http");
const { Server } = require("socket.io");

const app = require("./app");
const { connectDB } = require("./config/db");
const { PORT, CLIENT_URL } = require("./config/env");
const { registerInterviewSocket } = require("./sockets/interviewSocket");
const { ensureQuestionBankSeeded } = require("./services/interview/questionBankService");

async function start() {
  await connectDB();
  await ensureQuestionBankSeeded();
  console.log("[db] Question bank is ready");

  const server = http.createServer(app);

  const io = new Server(server, {
    cors: { origin: CLIENT_URL, credentials: true },
  });

  registerInterviewSocket(io);

  server.listen(PORT, () => {
    console.log(
      `Placement Simulator backend (MERN) listening on http://localhost:${PORT}`
    );
  });
}

start();