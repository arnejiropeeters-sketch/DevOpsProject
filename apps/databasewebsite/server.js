const express = require('express');
const path = require('path');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const pool = new Pool({
  host: process.env.DB_HOST || 'service2_postgres',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB,
});

// Automatische database-initialisatie met retry-logica
async function initDatabase(retries = 10) {
  while (retries > 0) {
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS miniatures (
          id SERIAL PRIMARY KEY,
          name VARCHAR(120) NOT NULL,
          system_game VARCHAR(80) NOT NULL,
          faction VARCHAR(80) NOT NULL,
          quantity INTEGER NOT NULL DEFAULT 1,
          points INTEGER NOT NULL DEFAULT 0,
          paint_status VARCHAR(40) NOT NULL DEFAULT 'Unbuilt',
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      const { rows } = await pool.query('SELECT COUNT(*) FROM miniatures');
      if (parseInt(rows[0].count, 10) === 0) {
        await pool.query(`
          INSERT INTO miniatures (name, system_game, faction, quantity, points, paint_status, notes) VALUES
          ('Mortarion, Daemon Primarch', 'Warhammer 40,000', 'Death Guard', 1, 300, 'Parade Ready', 'Wings en base afgewerkt met Nurgle Rot'),
          ('Plague Marines Squad', 'Warhammer 40,000', 'Death Guard', 10, 180, 'Battle Ready', '2x Blight Launcher, 1x Plasma Gun'),
          ('Deathshroud Terminators', 'Warhammer 40,000', 'Death Guard', 3, 110, 'Primed', 'Death Guard Green primer'),
          ('Handloze Harry (Kobold Monk)', 'D&D 5e', 'Party NPC', 1, 0, 'Painted', 'Custom 28mm mini voor campagne');
        `);
        console.log('Voorbeeldminiaturen toegevoegd aan PostgreSQL.');
      }

      console.log('Verbonden met PostgreSQL en tabel miniatures is gereed.');
      return;
    } catch (err) {
      retries -= 1;
      console.log(`Wachten op PostgreSQL... (${retries} pogingen over)`);
      await new Promise((res) => setTimeout(res, 2500));
    }
  }
  console.error('Kon geen verbinding maken met PostgreSQL.');
  process.exit(1);
}

// REST API endpoints (relatief, dus werkt probleemloos achter elke Traefik StripPrefix)
app.get('/api/miniatures', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM miniatures ORDER BY id DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/miniatures', async (req, res) => {
  const { name, system_game, faction, quantity, points, paint_status, notes } = req.body;
  if (!name || !system_game || !faction) {
    return res.status(400).json({ error: 'Naam, spelsysteem en factie zijn verplicht.' });
  }
  try {
    const result = await pool.query(
      `INSERT INTO miniatures (name, system_game, faction, quantity, points, paint_status, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [
        name.trim(),
        system_game.trim(),
        faction.trim(),
        parseInt(quantity, 10) || 1,
        parseInt(points, 10) || 0,
        paint_status || 'Unbuilt',
        notes || ''
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/miniatures/:id/status', async (req, res) => {
  const { id } = req.params;
  const { paint_status } = req.body;
  try {
    const result = await pool.query(
      'UPDATE miniatures SET paint_status = $1 WHERE id = $2 RETURNING *',
      [paint_status, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Niet gevonden' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/miniatures/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM miniatures WHERE id = $1', [req.params.id]);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

initDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`Miniaturen webapplicatie draait op poort ${PORT}`);
  });
});