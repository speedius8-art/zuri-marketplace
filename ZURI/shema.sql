-- schema.sql
-- Script de création de la base de données ZURI

CREATE DATABASE IF NOT EXISTS zuri_db;
USE zuri_db;

-- 1. Table des UTILISATEURS (Acheteurs, Vendeurs, Admins)
-- C'est ici que l'on gère la "sécurité excessive" conceptuelle.
CREATE TABLE IF NOT EXISTS utilisateurs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    google_id VARCHAR(255) NOT NULL UNIQUE, -- Identifiant unique de Google
    nom_complet VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    photo_url VARCHAR(255),
    role ENUM('user', 'seller', 'admin') DEFAULT 'user', -- Rôle par défaut
    
    -- "Sécurité Excessive" : Statut de vérification
    -- active: L'utilisateur peut se connecter.
    -- pending_verification: Le vendeur a soumis son dossier, en attente d'approbation admin.
    -- suspended: Le compte est bloqué par l'admin.
    status ENUM('active', 'pending_verification', 'suspended') DEFAULT 'active',
    verified TINYINT(1) DEFAULT 0, -- 0 = Non vérifié, 1 = Vérifié conceptuellement

    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_google_id (google_id)
);

-- 2. Table des CATÉGORIES (Filtre dynamique)
CREATE TABLE IF NOT EXISTS categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nom_categorie VARCHAR(100) NOT NULL UNIQUE
);

-- Insérer les catégories par défaut
INSERT IGNORE INTO categories (nom_categorie) VALUES ('Mode'), ('Chaussures'), ('Accessoires'), ('Électronique'), ('Beauté');

-- 3. Table des BOUTIQUES (Liée à un vendeur)
CREATE TABLE IF NOT EXISTS boutiques (
    id INT AUTO_INCREMENT PRIMARY KEY,
    vendeur_id INT NOT NULL, -- Clé étrangère vers utilisateurs.id
    nom_boutique VARCHAR(255) NOT NULL,
    contact_boutique VARCHAR(20),
    ville VARCHAR(100) DEFAULT 'Niamey',
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (vendeur_id) REFERENCES utilisateurs(id) ON DELETE CASCADE
);

-- 4. Table des PRODUITS (Cœur de la marketplace)
-- Intègre haute qualité conceptuelle (via validation upload) et descriptions.
CREATE TABLE IF NOT EXISTS produits (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nom_produit VARCHAR(255) NOT NULL,
    description TEXT, -- Description détaillée de l'article
    prix DECIMAL(10, 2) NOT NULL, -- Prix précis en FCFA
    categorie_id INT, -- Clé étrangère vers categories.id
    boutique_id INT NOT NULL, -- Clé étrangère vers boutiques.id
    
    -- Haute Qualité : URL de l'image (le serveur valide le type et la taille)
    image_url VARCHAR(255) NOT NULL, 
    
    status ENUM('en_vente', 'vendu', 'retire') DEFAULT 'en_vente',
    date_publication TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (categorie_id) REFERENCES categories(id) ON DELETE SET NULL,
    FOREIGN KEY (boutique_id) REFERENCES boutiques(id) ON DELETE CASCADE,
    INDEX idx_nom_produit (nom_produit) -- Index pour la recherche rapide
);

-- Insérer une boutique et un produit de test (pour le développement)
-- IMPORTANT: En production, cela se fera via l'interface Vendeur approuvé.
INSERT INTO utilisateurs (google_id, nom_complet, email, role, status, verified) 
VALUES ('test_google_id', 'Test Vendeur Speedius', 'speedius@test.com', 'seller', 'active', 1);

INSERT INTO boutiques (vendeur_id, nom_boutique) 
VALUES (1, 'Boutique Alpha Test');

INSERT INTO produits (nom_produit, description, prix, categorie_id, boutique_id, image_url) 
VALUES ('Sneakers Street Haut de Gamme', 'Paire de sneakers en cuir véritable, très confortable.', 25000.00, 2, 1, '/public/images/test_sneakers.jpg');