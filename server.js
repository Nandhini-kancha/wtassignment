import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import db from "./db.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(bodyParser.json());

/* ---------------------------------------------------
   POST — Add or Update Feedback (with averaging)
--------------------------------------------------- */
app.post("/api/feedback", (req, res) => {
  let { location, rating, message, lighting, police_presence, crowd_level } = req.body;

  // Convert all numeric values to numbers
  rating = Number(rating);
  lighting = Number(lighting);
  police_presence = Number(police_presence);
  crowd_level = Number(crowd_level);

  if (!location || !rating || !lighting || !police_presence || !crowd_level) {
    return res.status(400).json({ message: "All fields are required!" });
  }

  const checkSql = "SELECT * FROM feedbacks WHERE LOWER(location) = LOWER(?) LIMIT 1";

  db.query(checkSql, [location], (err, results) => {
    if (err) return res.status(500).json({ message: "Database error" });

    // If city exists → Average values and update
    if (results.length > 0) {
      const old = results[0];

      const avgRating = Math.round((Number(old.rating) + rating) / 2);
      const avgLighting = Math.round((Number(old.lighting) + lighting) / 2);
      const avgPolice = Math.round((Number(old.police_presence) + police_presence) / 2);
      const avgCrowd = Math.round((Number(old.crowd_level) + crowd_level) / 2);

      const updateSql = `
        UPDATE feedbacks 
        SET rating=?, message=?, lighting=?, police_presence=?, crowd_level=?
        WHERE LOWER(location) = LOWER(?)`;

      db.query(
        updateSql,
        [
          avgRating,
          message,
          avgLighting,
          avgPolice,
          avgCrowd,
          location
        ],
        (err2) => {
          if (err2) return res.status(500).json({ message: "Update failed" });

          return res.json({
            message: "Feedback updated (averaged rating applied)",
            updated: true,
          });
        }
      );
    }

    // If city does NOT exist → Insert new row
    else {
      const insertSql = `
        INSERT INTO feedbacks (location, rating, message, lighting, police_presence, crowd_level)
        VALUES (?, ?, ?, ?, ?, ?)
      `;

      db.query(
        insertSql,
        [
          location,
          rating,
          message,
          lighting,
          police_presence,
          crowd_level
        ],
        (err3, result) => {
          if (err3) return res.status(500).json({ message: "Insert failed" });

          res.json({
            message: "Feedback submitted successfully!",
            id: result.insertId,
          });
        }
      );
    }
  });
});

/* ---------------------------------------------------
   GET — Fetch All Feedback Data
--------------------------------------------------- */
app.get("/api/feedback", (req, res) => {
  const sql = "SELECT * FROM feedbacks";

  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ message: "Database error" });
    res.json(results);
  });
});

/* ---------------------------------------------------
   GET — Fetch Feedback of a Single City
--------------------------------------------------- */
app.get("/api/feedback/:city", (req, res) => {
  const city = req.params.city;

  const sql = "SELECT * FROM feedbacks WHERE LOWER(location) = LOWER(?)";

  db.query(sql, [city], (err, results) => {
    if (err) return res.status(500).json({ message: "Database error" });

    if (results.length === 0) {
      return res.status(404).json({ message: "City not found" });
    }

    res.json(results[0]);
  });
});

/* ---------------------------------------------------
   Start Server
--------------------------------------------------- */
app.listen(5000, () => {
  console.log("🚀 Server running on port 5000");
});
