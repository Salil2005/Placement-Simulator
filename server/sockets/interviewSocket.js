const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("../config/env");
const interviewEngine = require("../services/interview/interviewEngine");

/**
 * Real-time layer for live interviews: lets the client join an interview
 * "room" and receive question/answer events without polling.
 */
function registerInterviewSocket(io) {
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(); // allow anonymous connection, gate actions instead
      const decoded = jwt.verify(token, JWT_SECRET);
      socket.userId = decoded.id;
      next();
    } catch (err) {
      next(new Error("Invalid socket token"));
    }
  });

  io.on("connection", (socket) => {
    socket.on("interview:join", async ({ interviewId }, callback) => {
      try {
        if (!socket.userId) throw new Error("Not authorized, no token");
        const { interview } = await interviewEngine.getSessionState(interviewId);
        if (!interview || String(interview.user) !== String(socket.userId)) {
          throw new Error("Interview not found");
        }
        socket.join(`interview:${interviewId}`);
        callback?.({ ok: true });
      } catch (err) {
        callback?.({ ok: false, error: err.message });
      }
    });

    socket.on("interview:typing", ({ interviewId, isTyping }) => {
      if (socket.userId && socket.rooms.has(`interview:${interviewId}`)) {
        socket.to(`interview:${interviewId}`).emit("interview:typing", { isTyping });
      }
    });

    socket.on("interview:answer", async ({ interviewId, questionId, answerText, code, language }, callback) => {
      try {
        if (!socket.userId) throw new Error("Not authorized, no token");

        const { interview } = await interviewEngine.getSessionState(interviewId);
        if (!interview) throw new Error("Interview not found");
        if (String(interview.user) !== String(socket.userId)) {
          throw new Error("Not authorized for this interview");
        }

        const result = await interviewEngine.submitAnswer(interview, {
          questionId,
          answerText,
          code,
          language,
        });

        io.to(`interview:${interviewId}`).emit("interview:response", result);
        callback?.({ ok: true, ...result });
      } catch (err) {
        callback?.({ ok: false, error: err.message });
      }
    });

    socket.on("disconnect", () => {
      // no-op: rooms are cleaned up automatically by socket.io
    });
  });
}

module.exports = { registerInterviewSocket };
