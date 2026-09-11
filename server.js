const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const axios = require('axios'); // Pour communiquer avec Google
const path = require('path');

const app = express();
const PORT = 3000;

// CONFIGURATION GOOGLE OAUTH
const GOOGLE_CLIENT_ID = '110055616214-cth0j8nnr7ikjp0dkqenkejknmcks0v6.apps.googleusercontent.com';
const GOOGLE_CLIENT_SECRET = 'SOPHIE@1989'; 
const GOOGLE_REDIRECT_URI = 'http://localhost:3000/auth/google/callback';

// Middleware
app.use(bodyParser.json());
// --> CHANGEMENT ICI : Pointe directement vers le dossier 'public' pour index.html, variables.css et globals.css
app.use(express.static(path.join(__dirname, 'public')));

// 1. Initialisation de la Base de Données SQLite
const db = new sqlite3.Database('./excellent_unit.db', (err) => {
    if (err) console.error("Erreur d'ouverture de la BD", err.message);
    else console.log("Connecté à la base de données SQLite.");
});

// Création de la table users si elle n'existe pas
db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    email TEXT UNIQUE,
    password TEXT,
    google_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

// 2. ROUTE : Compteur de membres
app.get('/api/users/count', (req, res) => {
    db.get(`SELECT COUNT(*) as count FROM users`, (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ count: row.count });
    });
});

// 3. ROUTE : Inscription Classique
app.post('/api/register', async (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
        return res.status(400).json({ error: "Tous les champs sont obligatoires." });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        db.run(`INSERT INTO users (name, email, password) VALUES (?, ?, ?)`, [name, email, hashedPassword], function(err) {
            if (err) {
                return res.status(400).json({ error: "Cet e-mail est déjà utilisé." });
            }
            res.json({ message: "Inscription réussie !" });
        });
    } catch (e) {
        res.status(500).json({ error: "Erreur serveur interne." });
    }
});

// 4. ROUTE : Connexion Classique
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    
    db.get(`SELECT * FROM users WHERE email = ?`, [email], async (err, user) => {
        if (err || !user || !user.password) {
            return res.status(400).json({ error: "Email ou mot de passe incorrect." });
        }

        const match = await bcrypt.compare(password, user.password);
        if (!match) {
            return res.status(400).json({ error: "Email ou mot de passe incorrect." });
        }

        res.json({ message: "Connexion réussie !" });
    });
});

// 5. ROUTE GOOGLE : Étape 1 - Redirection vers Google
app.get('/auth/google', (req, res) => {
    const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${GOOGLE_REDIRECT_URI}&response_type=code&scope=email%20profile`;
    res.redirect(url);
});

// 6. ROUTE GOOGLE : Étape 2 - Callback (Le retour de Google)
app.get('/auth/google/callback', async (req, res) => {
    const code = req.query.code;
    if (!code) return res.redirect('/index.html?error=google_denied');

    try {
        const tokenRes = await axios.post('https://oauth2.googleapis.com/token', {
            code,
            client_id: GOOGLE_CLIENT_ID,
            client_secret: GOOGLE_CLIENT_SECRET,
            redirect_uri: GOOGLE_REDIRECT_URI,
            grant_type: 'authorization_code'
        });

        const accessToken = tokenRes.data.access_token;

        const profileRes = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { Authorization: `Bearer ${accessToken}` }
        });

        const { id: googleId, email, name } = profileRes.data;

        db.get(`SELECT * FROM users WHERE email = ?`, [email], (err, user) => {
            if (!user) {
                // Nouvel utilisateur via Google -> On l'ajoute (le compteur va augmenter)
                db.run(`INSERT INTO users (name, email, google_id) VALUES (?, ?, ?)`, [name, email, googleId], () => {
                    res.redirect(`/index.html?login=success&name=${encodeURIComponent(name)}&new=true`);
                });
            } else {
                // Utilisateur existant
                res.redirect(`/index.html?login=success&name=${encodeURIComponent(name)}&new=false`);
            }
        });

    } catch (error) {
        console.error("Erreur Google Auth:", error.response?.data || error.message);
        res.redirect('/index.html?error=google_failed');
    }
});

// Lancement du serveur
app.listen(PORT, () => {
    console.log(`Serveur démarré sur http://localhost:${PORT}`);
});