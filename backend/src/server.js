require("dotenv").config();
process.env.TZ = "Asia/Ho_Chi_Minh";
const express = require("express");
const cors = require("cors");
const apiRoutes = require("./routes/api");
const { initDb } = require("./config/initDb");

const app = express();
const port = Number(process.env.PORT || 4000);

app.use(cors());
app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || "5mb" }));
app.use("/api", apiRoutes);

app.use((error, _, res, __) => {
  console.error(error);
  if (error.type === "entity.too.large" || error.status === 413) {
    return res.status(413).json({ message: "Payload quá lớn (giới hạn body JSON). Giảm kích thước hoặc tăng JSON_BODY_LIMIT trên server." });
  }
  res.status(500).json({ message: "Internal server error" });
});

async function start() {
  await initDb();
  app.listen(port, () => {
    console.log(`Backend running on http://localhost:${port}`);
  });
}

start();
