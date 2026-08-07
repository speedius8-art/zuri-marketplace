// server.js - Le Cerveau de l'application ZURI
// Intègre authentification, upload sécurisé, et concept de vérification vendeur.

require('dotenv').config(); // Charge les variables d'environnement du fichier .env
const express = require('express');
const mysql = require('mysql');
const cors = require('cors');
const path = require('path');
const multer = require('multer'); // Pour la gestion d'uploads d'images
const { OAuth2Client } = require('google-auth-library'); // Pour la validation Google Auth côté serveur

const app = express();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// --- 1. CONFIGURATION ---
app.use(cors()); // Autorise les requêtes cross-origin
app.use(express.json()); // Permet de lire le JSON dans le corps des requêtes (POST)

// Rend accessibles les dossiers d'images et publics
app.use('/uploads', express.static('uploads')); 
app.use('/public', express.static('public'));

// Connexion à la base de données MySQL
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

db.connect((err) => {
    if (err) {
        console.error('Erreur de connexion MySQL :', err);
        return;
    }
    console.log('✅ Connecté à la base de données MySQL de ZURI');
});

// --- 2. CONFIGURATION DE MULTER (Upload Sécurisé) ---
// Cette partie valide conceptuellement la haute qualité des photos.
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/'); // Dossier pour stocker les images
    },
    filename: function (req, file, cb) {
        // Crée un nom de fichier unique pour éviter les conflits
        cb(null, Date.now() + path.extname(file.originalname)); 
    }
});

// Validation Conceptuelle "Haute Qualité" : Type et Taille (max 10MB)
const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // Max 10MB (Speedius doit gérer le redimensionnement ensuite)
    fileFilter: function (req, file, cb) {
        // Vérifie que le fichier est bien une image
        const filetypes = /jpeg|jpg|png|gif|webp/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error("Erreur: Le fichier doit être une image valide (jpeg, jpg, png, gif, webp)."));
    }
});

// --- 3. MIDDLEWARES DE SÉCURITÉ ---

// Middlewareconceptuel pour vérifier l'authentification Google
// En production, vous devez décoder et vérifier le token Google ici.
// Ce code montre la LOGIQUE, mais la vérification du token réel nécessite plus de code.
const verifierAuthentification = async (req, res, next) => {
    // Dans une API réelle, on récupère le token dans le header "Authorization"
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ message: "Utilisateur non connecté." });
    }
    const token = authHeader.split(' ')[1]; // Récupère le token

    try {
        // --- Vérification Conceptuelle du Token Google (nécessite une configuration complète) ---
        // Le code réel est : 
        // const ticket = await googleClient.verifyIdToken({ idToken: token, audience: process.env.GOOGLE_CLIENT_ID });
        // req.user = ticket.getPayload(); // req.user contient l'ID Google, le nom, etc.
        
        // Pour la démo, on simule un utilisateur test authentifié.
        req.user = { google_id: 'test_google_id', nom_complet: 'Test Vendeur Speedius', email: 'speedius@test.com' };
        next();
    } catch (error) {
        return res.status(401).json({ message: "Session expirée ou invalide. Reconnectez-vous." });
    }
};

// Middleware conceptuel pour la "Sécurité Excessive" : Vérifier le statut Vendeur
const verifierVendeurApprouve = (req, res, next) => {
    const { google_id } = req.user;
    
    db.query("SELECT * FROM utilisateurs WHERE google_id = ? LIMIT 1", [google_id], (err, result) => {
        if (err || result.length === 0) {
            return res.status(500).json({ message: "Erreur serveur lors de la vérification du vendeur" });
        }
        
        const utilisateur = result[0];
        // --- Cœur de la sécurité excessive : Le statut doit être active AND verified ---
        if (utilisateur.role !== 'seller' || utilisateur.status !== 'active' || utilisateur.verified !== 1) {
            return res.status(403).json({ message: "⚠️ Votre compte n'est pas encore approuvé par l'admin. Vous ne pouvez pas publier." });
        }
        next();
    });
};


// --- 4. LES ROUTES API (Marketplace Dynamique) ---

// A. OBTENIR ET RECHERCHER DES PRODUITS (GET)
// Gère tous les produits, le filtre catégorie, ET la recherche texte.
app.get('/api/produits', (req, res) => {
    // Récupère les paramètres de l'URL : ?categorie=...&search=...
    const { categorie, search } = req.query; 
    
    let sql = `
        SELECT p.*, b.nom_boutique, c.nom_categorie 
        FROM produits p
        JOIN boutiques b ON p.boutique_id = b.id
        LEFT JOIN categories c ON p.categorie_id = c.id
        WHERE p.status = 'en_vente'
    `;
    let params = []; 

    // 1. Gestion du filtre par catégorie
    if (categorie && categorie !== 'Tous') {
        sql += " AND c.nom_categorie = ?";
        params.push(categorie);
    }

    // 2. Gestion du moteur de recherche texte
    if (search) {
        // LIKE avec des % pour chercher une partie du nom ou de la description
        sql += " AND (p.nom_produit LIKE ? OR p.description LIKE ?)";
        params.push('%' + search + '%', '%' + search + '%');
    }

    // Exécution de la requête finale paramétrée (sécurisée)
    db.query(sql, params, (err, resultats) => {
        if (err) {
            console.error("Erreur SQL lors de la recherche :", err);
            return res.status(500).json({ message: "Erreur serveur lors de la récupération des produits" });
        }
        res.json(resultats); // Renvoie les résultats en JSON
    });
});


// B. AJOUTER UN PRODUIT (POST) - Authentification OBLIGATOIRE et Vérification Vendeur
// Gère l'upload d'image (haute qualitéconceptuelle).
// L'image doit être envoyée sous le nom de champ 'image'.
app.post('/api/produits', verifierAuthentification, verifierVendeurApprouve, upload.single('image'), (req, res) => {
    const { nom_produit, description, prix, categorie_id, boutique_id } = req.body;
    
    // Multer a sauvegardé l'image dans req.file
    if (!req.file) {
        return res.status(400).json({ message: "La photo réelle du produit est obligatoire." });
    }

    if (!nom_produit || !prix || !categorie_id) {
        return res.status(400).json({ message: "Le nom, le prix et la catégorie sont obligatoires." });
    }

    // L'image_url est l'adresse relative pour l'afficher sur le site
    const image_url = '/uploads/' + req.file.filename;

    const sql = "INSERT INTO produits (nom_produit, description, prix, categorie_id, boutique_id, image_url) VALUES (?, ?, ?, ?, ?, ?)";
    const valeurs = [nom_produit, description, prix, categorie_id, boutique_id || 1, image_url]; 

    db.query(sql, valeurs, (err, result) => {
        if (err) {
            console.error("Erreur SQL lors de l'ajout :", err);
            return res.status(500).json({ message: "Erreur serveur lors de l'ajout du produit" });
        }
        res.status(201).json({ message: "Produit ajouté avec succès ! Votre article est en ligne.", id: result.insertId });
    });
});


// --- 5. DÉMARRAGE DU SERVEUR ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Le serveur ZURI tourne sur http://localhost:${PORT}`);
});