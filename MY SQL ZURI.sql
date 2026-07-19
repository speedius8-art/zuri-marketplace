CREATE DATABASE IF NOT EXISTS marketplace_locale;
USE marketplace_locale;
-- 1. Table des utilisateurs (Clients, Vendeurs, Administrateurs)
CREATE TABLE utilisateurs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nom VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    mot_de_passe VARCHAR(255) NOT NULL, -- Sera crypté plus tard par le Backend
    telephone VARCHAR(20),
    adresse_livraison TEXT,
    role ENUM('client', 'vendeur', 'admin') DEFAULT 'client',
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Table des boutiques (Liée à un utilisateur qui a le rôle 'vendeur')
CREATE TABLE boutiques (
    id INT AUTO_INCREMENT PRIMARY KEY,
    vendeur_id INT NOT NULL,
    nom_boutique VARCHAR(100) NOT NULL,
    description TEXT,
    adresse_boutique TEXT,
    telephone_boutique VARCHAR(20),
    FOREIGN KEY (vendeur_id) REFERENCES utilisateurs(id) ON DELETE CASCADE
);

-- 3. Table des produits (Vêtements, chaussures, accessoires)
CREATE TABLE produits (
    id INT AUTO_INCREMENT PRIMARY KEY,
    boutique_id INT NOT NULL,
    nom VARCHAR(150) NOT NULL,
    description TEXT,
    prix DECIMAL(10, 2) NOT NULL, -- Exemple : 15000.00
    categorie ENUM('vêtements', 'chaussures', 'accessoires') NOT NULL,
    taille VARCHAR(10), -- S, M, L, XL ou 42, 43 etc.
    couleur VARCHAR(30),
    stock INT DEFAULT 0,
    image_url VARCHAR(255),
    date_ajout TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (boutique_id) REFERENCES boutiques(id) ON DELETE CASCADE
);

-- 4. Table des commandes (Entête de la commande)
CREATE TABLE commandes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    client_id INT NOT NULL,
    date_commande TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    statut ENUM('en_attente', 'en_cours', 'en_cours_de_livraison', 'livré', 'annulé') DEFAULT 'en_attente',
    total_prix DECIMAL(10, 2) NOT NULL,
    adresse_livraison_specifique TEXT NOT NULL,
    FOREIGN KEY (client_id) REFERENCES utilisateurs(id)
);

-- 5. Table de liaison pour le détail des commandes (Un panier peut avoir plusieurs produits)
CREATE TABLE details_commande (
    id INT AUTO_INCREMENT PRIMARY KEY,
    commande_id INT NOT NULL,
    produit_id INT NOT NULL,
    quantite INT NOT NULL DEFAULT 1,
    prix_unitaire DECIMAL(10, 2) NOT NULL, -- Le prix au moment de l'achat
    FOREIGN KEY (commande_id) REFERENCES commandes(id) ON DELETE CASCADE,
    FOREIGN KEY (produit_id) REFERENCES produits(id)
);
