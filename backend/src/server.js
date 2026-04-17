require("dotenv").config();
const express = require("express");
const cors = require("cors");
const apiRoutes = require("./routes/api");
const { initDb } = require("./config/initDb");

const app = express();
const port = Number(process.env.PORT || 4000);

app.use(cors());
app.use(express.json());
app.use("/api", apiRoutes);

app.use((error, _, res, __) => {
  console.error(error);
  res.status(500).json({ message: "Internal server error" });
});

async function start() {
  await initDb();
  app.listen(port, () => {
    console.log(`Backend running on http://localhost:${port}`);
  });
}

start();
